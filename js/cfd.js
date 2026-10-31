(function (root) {
  const AF = root.AF || (root.AF = {});

  const FLUID = 0;
  const SOLID = 1;
  const OPEN = 2;
  const REGION_CPU = 1;
  const REGION_GPU = 2;
  const REGION_RAD = 3;
  const RESOLUTION = 96;
  const PRESSURE_ITERATIONS = 300;
  const DIVERGENCE_TOLERANCE = 0.05;
  const PARTICLE_COUNT = 1400;
  const TRAIL = 7;
  const READING_TAU = 1.0;

  class CaseSim {
    constructor(config, layout, air, thermal, previous) {
      const c = config.case;
      this.config = config;
      this.layout = layout;
      this.air = air;
      this.dxMm = Math.max(c.height, c.depth) / RESOLUTION;
      this.dx = this.dxMm / 1000;
      this.nx = Math.round(c.depth / this.dxMm) + 2;
      this.ny = Math.round(c.height / this.dxMm) + 2;
      this.width = c.width / 1000;
      this.Tamb = config.ambient;
      this.rhoCp = air.rho * AF.data.PHYSICS.airCp;
      this.alpha = AF.data.PHYSICS.turbulentDiffusivity;
      this.beta = 1 / (config.ambient + 273.15);
      this.gravity = AF.data.PHYSICS.gravity;
      this.damping = AF.data.PHYSICS.velocityDamping;
      this.allocate();
      this.build(layout, air);
      this.setHeat(thermal);
      this.time = 0;
      this.readings = { cpu: this.Tamb, gpu: this.Tamb, radiator: this.Tamb, exhaust: {} };
      const sameGrid = previous && previous.nx === this.nx && previous.ny === this.ny;
      if (sameGrid) this.inherit(previous); else this.T.fill(this.Tamb);
      this.flushTime = air.volume / Math.max(air.throughFlow, 1e-4);
      this.initParticles();
      this.rebuildSpawns();
    }

    allocate() {
      const { nx, ny } = this;
      const n = nx * ny;
      this.type = new Uint8Array(n);
      this.region = new Uint8Array(n);
      this.ambientWall = new Uint8Array(n);
      this.T = new Float32Array(n);
      this.Tnew = new Float32Array(n);
      this.p = new Float64Array(n);
      this.src = new Float32Array(n);
      this.heat = new Float32Array(n);
      this.speedAvg = new Float32Array(n);
      this.u = new Float32Array((nx + 1) * ny);
      this.uTmp = new Float32Array((nx + 1) * ny);
      this.uFix = new Uint8Array((nx + 1) * ny);
      this.uFixVal = new Float32Array((nx + 1) * ny);
      this.v = new Float32Array(nx * (ny + 1));
      this.vTmp = new Float32Array(nx * (ny + 1));
      this.vFix = new Uint8Array(nx * (ny + 1));
      this.vFixVal = new Float32Array(nx * (ny + 1));
    }

    inherit(prev) {
      this.T.set(prev.T);
      this.speedAvg.set(prev.speedAvg);
      this.p.set(prev.p);
      for (let k = 0; k < this.u.length; k++) this.u[k] = this.uFix[k] ? this.uFixVal[k] : prev.u[k];
      for (let k = 0; k < this.v.length; k++) this.v[k] = this.vFix[k] ? this.vFixVal[k] : prev.v[k];
      this.time = prev.time;
      this.readings = prev.readings;
      for (let c = 0; c < this.T.length; c++) if (this.type[c] === OPEN || this.ambientWall[c]) this.T[c] = this.Tamb;
    }

    id(i, j) { return i + j * this.nx; }
    uId(i, j) { return i + j * (this.nx + 1); }
    vId(i, j) { return i + j * this.nx; }

    cellX(xMm) { return Math.max(1, Math.min(this.nx - 2, 1 + Math.floor(xMm / this.dxMm))); }
    cellY(yMm) { return Math.max(1, Math.min(this.ny - 2, 1 + Math.floor(yMm / this.dxMm))); }
    spanX(a, b) { return [this.cellX(a), this.cellX(Math.max(a, b - 1e-6))]; }
    spanY(a, b) { return [this.cellY(a), this.cellY(Math.max(a, b - 1e-6))]; }

    rect(x0, y0, x1, y1, fn) {
      const [i0, i1] = this.spanX(x0, x1);
      const [j0, j1] = this.spanY(y0, y1);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) fn(i, j, this.id(i, j));
      return { i0, i1, j0, j1 };
    }

    build(layout, air) {
      const { nx, ny } = this;
      const config = this.config;
      const comps = layout.components;
      const P = AF.data.PHYSICS;
      const type = this.type;
      type.fill(FLUID);
      for (let i = 0; i < nx; i++) { type[this.id(i, 0)] = SOLID; type[this.id(i, ny - 1)] = SOLID; }
      for (let j = 0; j < ny; j++) { type[this.id(0, j)] = SOLID; type[this.id(nx - 1, j)] = SOLID; }

      if (comps.shroud) {
        const js = this.cellY(comps.shroud.y);
        for (let j = js; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) type[this.id(i, j)] = SOLID;
      }

      const gpu = comps.gpu;
      const gpuCooler = AF.data.GPU_COOLERS[config.gpu.cooler];
      const pcbRows = this.spanY(gpu.pcbTop, gpu.pcbBottom);
      const sinkJ0 = pcbRows[1] + 1;
      const sinkJ1 = Math.max(sinkJ0 + 1, this.cellY(gpu.sinkBottom - 1e-6));
      const sinkI1 = this.cellX(gpu.length - 1e-6);
      this.gpuBox = { i0: 1, i1: sinkI1, j0: sinkJ0, j1: sinkJ1 };
      const pcbI1 = this.cellX(gpu.pcbLength - 1e-6);
      for (let j = pcbRows[0]; j <= pcbRows[1]; j++) for (let i = 1; i <= pcbI1; i++) type[this.id(i, j)] = SOLID;
      for (let j = sinkJ0; j <= sinkJ1; j++) for (let i = 1; i <= sinkI1; i++) {
        const c = this.id(i, j);
        if (type[c] === FLUID) this.region[c] = REGION_GPU;
      }

      const cool = comps.cpuCooler;
      const cpuCooler = AF.data.CPU_COOLERS[config.cpu.cooler];
      if (cpuCooler.type !== 'aio') {
        this.cpuBox = this.rect(cool.x, cool.y, cool.x + cool.w, cool.y + cool.h, (i, j, c) => {
          if (type[c] === FLUID) this.region[c] = REGION_CPU;
        });
      } else {
        this.cpuBox = this.rect(cool.x, cool.y, cool.x + cool.w, cool.y + cool.h, () => {});
      }

      this.radCells = {};
      this.radInner = {};
      if (comps.radiator) {
        const thick = comps.radiator.thickness + (config.cpu.aio.pushPull ? P.fanThickness : 0);
        const H = config.case.height;
        const D = config.case.depth;
        for (const s of comps.radiator.slots) {
          const half = s.size / 2;
          const cells = [];
          const inner = [];
          let box;
          const mark = (i, j, c) => { if (type[c] === FLUID) { this.region[c] = REGION_RAD; cells.push(c); } };
          if (s.panel === 'front') {
            box = this.rect(D - thick, s.cy - half, D, s.cy + half, mark);
            for (let j = box.j0; j <= box.j1; j++) inner.push(this.id(box.i0 - 1, j));
          } else if (s.panel === 'rear') {
            box = this.rect(0, s.cy - half, thick, s.cy + half, mark);
            for (let j = box.j0; j <= box.j1; j++) inner.push(this.id(box.i1 + 1, j));
          } else if (s.panel === 'top') {
            box = this.rect(s.cx - half, 0, s.cx + half, thick, mark);
            for (let i = box.i0; i <= box.i1; i++) inner.push(this.id(i, box.j1 + 1));
          } else {
            box = this.rect(s.cx - half, H - thick, s.cx + half, H, mark);
            for (let i = box.i0; i <= box.i1; i++) inner.push(this.id(i, box.j0 - 1));
          }
          this.radCells[s.id] = { cells, box, panel: s.panel };
          this.radInner[s.id] = inner.filter((c) => type[c] === FLUID && this.region[c] === 0);
        }
      }

      const elements = new Map(air.elements.map((e) => [e.id, e]));
      for (const s of layout.slots) {
        if (s.axis === 'z') continue;
        const el = elements.get(s.id);
        if (el && el.kind === 'vent') this.wallCells(s).forEach((w) => { type[w.wall] = OPEN; });
      }

      const rearOpen = [];
      const pcieRows = this.spanY(comps.pcie.top, comps.pcie.bottom);
      if (config.case.pcieVented) for (let j = pcieRows[0]; j <= pcieRows[1]; j++) rearOpen.push(j);
      if (gpuCooler.type !== 'blower' || !config.case.pcieVented) for (let j = sinkJ0; j <= sinkJ1; j++) rearOpen.push(j);
      const leakRow = this.cellY(layout.shroudTop - 12);
      rearOpen.push(leakRow, leakRow - 1);
      for (const j of rearOpen) {
        const c = this.id(0, j);
        if (type[this.id(1, j)] === FLUID) type[c] = OPEN;
      }
      if (gpuCooler.type === 'blower') for (let j = sinkJ0; j <= sinkJ1; j++) type[this.id(0, j)] = OPEN;

      this.defaultFixed();

      this.fanFaces = {};
      for (const s of layout.slots) {
        const el = elements.get(s.id);
        if (!el || el.kind === 'vent') continue;
        if (s.axis === 'z') this.sideSource(s, el); else this.wallFan(s, el);
      }

      if (cpuCooler.type === 'tower' && air.coolers.cpu) this.towerForcing(air.coolers.cpu.q);
      if (gpuCooler.type === 'open' && air.coolers.gpu) this.openGpuForcing(gpu, air.coolers.gpu.total);
      if (gpuCooler.type === 'blower') this.blowerForcing(gpu, air.blower ? Math.max(0, air.blower.q) : 0);
      if (comps.radiator) this.radiatorChannels();

      this.collectReadingCells(layout, cpuCooler, gpuCooler);
      this.collectBoundary();
      this.computeTimeStep();
    }

    wallCells(slot) {
      const half = slot.size / 2;
      const out = [];
      if (slot.panel === 'front' || slot.panel === 'rear') {
        const wallI = slot.panel === 'front' ? this.nx - 1 : 0;
        const inI = slot.panel === 'front' ? this.nx - 2 : 1;
        const faceI = slot.panel === 'front' ? this.nx - 1 : 1;
        const [j0, j1] = this.spanY(slot.cy - half, slot.cy + half);
        for (let j = j0; j <= j1; j++) out.push({ wall: this.id(wallI, j), inner: this.id(inI, j), face: this.uId(faceI, j), axis: 'u' });
      } else {
        const wallJ = slot.panel === 'top' ? 0 : this.ny - 1;
        const inJ = slot.panel === 'top' ? 1 : this.ny - 2;
        const faceJ = slot.panel === 'top' ? 1 : this.ny - 1;
        const [i0, i1] = this.spanX(slot.cx - half, slot.cx + half);
        for (let i = i0; i <= i1; i++) out.push({ wall: this.id(i, wallJ), inner: this.id(i, inJ), face: this.vId(i, faceJ), axis: 'v' });
      }
      return out;
    }

    defaultFixed() {
      const { nx, ny, type } = this;
      const at = (i, j) => (i < 0 || j < 0 || i >= nx || j >= ny ? SOLID : type[this.id(i, j)]);
      for (let j = 0; j < ny; j++) for (let i = 0; i <= nx; i++) {
        const a = at(i - 1, j);
        const b = at(i, j);
        const fixed = a === SOLID || b === SOLID || (a !== FLUID && b !== FLUID);
        const k = this.uId(i, j);
        this.uFix[k] = fixed ? 1 : 0;
        this.uFixVal[k] = 0;
      }
      for (let j = 0; j <= ny; j++) for (let i = 0; i < nx; i++) {
        const a = at(i, j - 1);
        const b = at(i, j);
        const fixed = a === SOLID || b === SOLID || (a !== FLUID && b !== FLUID);
        const k = this.vId(i, j);
        this.vFix[k] = fixed ? 1 : 0;
        this.vFixVal[k] = 0;
      }
    }

    setFixed(axis, k, value) {
      if (axis === 'u') { this.uFix[k] = 1; this.uFixVal[k] = value; this.u[k] = value; } else { this.vFix[k] = 1; this.vFixVal[k] = value; this.v[k] = value; }
    }

    wallFan(slot, el) {
      const faces = this.wallCells(slot).filter((w) => this.type[w.inner] === FLUID);
      if (!faces.length) return;
      const inwardSign = slot.panel === 'front' || slot.panel === 'bottom' ? -1 : 1;
      const speed = el.dir * el.q / (this.width * faces.length * this.dx);
      const velocity = inwardSign * speed;
      for (const w of faces) {
        this.setFixed(w.axis, w.face, velocity);
        if (speed > 0) this.ambientWall[w.wall] = 1;
      }
      this.fanFaces[slot.id] = { faces, speed, inflow: speed > 0 };
    }

    sideSource(slot, el) {
      const r = slot.size / 2;
      const cells = [];
      this.rect(slot.cx - r, slot.cy - r, slot.cx + r, slot.cy + r, (i, j, c) => {
        const x = (i - 0.5) * this.dxMm;
        const y = (j - 0.5) * this.dxMm;
        if (this.type[c] === FLUID && (x - slot.cx) ** 2 + (y - slot.cy) ** 2 <= r * r) cells.push(c);
      });
      if (!cells.length) return;
      const rate = el.dir * el.q / (this.width * cells.length * this.dx * this.dx);
      for (const c of cells) this.src[c] += rate;
      this.fanFaces[slot.id] = { cells, rate, inflow: rate > 0 };
    }

    towerForcing(q) {
      const b = this.cpuBox;
      const face = b.i1 + 1;
      const rows = [];
      for (let j = b.j0; j <= b.j1; j++) if (this.type[this.id(b.i1, j)] === FLUID && this.type[this.id(face, j)] === FLUID) rows.push(j);
      const velocity = rows.length ? -q / (this.width * rows.length * this.dx) : 0;
      for (const j of rows) this.setFixed('u', this.uId(face, j), velocity);
      for (let j = b.j0 + 1; j <= b.j1; j++) for (let i = b.i0; i <= b.i1; i++) {
        if (this.region[this.id(i, j)] === REGION_CPU && this.region[this.id(i, j - 1)] === REGION_CPU) this.setFixed('v', this.vId(i, j), 0);
      }
      this.cpuFanRows = rows.map((j) => this.id(face, j));
    }

    openGpuForcing(gpu, q) {
      const b = this.gpuBox;
      const [i0, i1] = this.spanX(gpu.length * 0.06, gpu.length * 0.94);
      const faceJ = b.j1 + 1;
      const cols = [];
      for (let i = i0; i <= i1; i++) if (this.type[this.id(i, faceJ)] === FLUID) cols.push(i);
      const velocity = cols.length ? -q / (this.width * cols.length * this.dx) : 0;
      for (const i of cols) this.setFixed('v', this.vId(i, faceJ), velocity);
      this.gpuFanCells = cols.map((i) => this.id(i, faceJ));
    }

    blowerForcing(gpu, q) {
      const b = this.gpuBox;
      const faceJ = b.j1 + 1;
      const [f0, f1] = this.spanX(gpu.length - 85, gpu.length - 15);
      const cols = [];
      for (let i = b.i0; i <= b.i1; i++) {
        if (i >= f0 && i <= f1 && this.type[this.id(i, faceJ)] === FLUID) cols.push(i);
        else this.setFixed('v', this.vId(i, faceJ), 0);
      }
      const velocity = cols.length ? -q / (this.width * cols.length * this.dx) : 0;
      for (const i of cols) this.setFixed('v', this.vId(i, faceJ), velocity);
      for (let j = b.j0; j <= b.j1; j++) this.setFixed('u', this.uId(b.i1 + 1, j), 0);
      for (let j = b.j0 + 1; j <= b.j1; j++) for (let i = b.i0; i <= b.i1; i++) {
        if (!(i >= f0 && i <= f1)) this.setFixed('v', this.vId(i, j), 0);
      }
      this.gpuFanCells = cols.map((i) => this.id(i, faceJ));
    }

    radiatorChannels() {
      for (const id of Object.keys(this.radCells)) {
        const { box, panel } = this.radCells[id];
        const horizontal = panel === 'front' || panel === 'rear';
        for (let j = box.j0; j <= box.j1; j++) for (let i = box.i0; i <= box.i1; i++) {
          const c = this.id(i, j);
          if (this.region[c] !== REGION_RAD) continue;
          if (horizontal && j > box.j0 && this.region[this.id(i, j - 1)] === REGION_RAD) this.setFixed('v', this.vId(i, j), 0);
          if (!horizontal && i > box.i0 && this.region[this.id(i - 1, j)] === REGION_RAD) this.setFixed('u', this.uId(i, j), 0);
        }
      }
    }

    collectReadingCells(layout, cpuCooler, gpuCooler) {
      const fluid = (c) => this.type[c] === FLUID && this.region[c] === 0;
      if (cpuCooler.type === 'tower' && this.cpuFanRows) {
        this.cpuInletCells = this.cpuFanRows.filter(fluid);
      } else {
        const b = this.cpuBox;
        const ring = [];
        for (let j = b.j0 - 1; j <= b.j1 + 1; j++) for (let i = b.i0 - 1; i <= b.i1 + 1; i++) {
          if (i < 1 || j < 1 || i > this.nx - 2 || j > this.ny - 2) continue;
          const edge = j === b.j0 - 1 || j === b.j1 + 1 || i === b.i0 - 1 || i === b.i1 + 1;
          if (edge && fluid(this.id(i, j))) ring.push(this.id(i, j));
        }
        this.cpuInletCells = ring;
      }
      this.gpuInletCells = (this.gpuFanCells || []).filter(fluid);
      this.radInletCells = [];
      for (const el of this.air.elements) {
        if (el.radiator && el.inflow <= 0 && this.radInner[el.id]) this.radInletCells.push(...this.radInner[el.id]);
      }
      this.exhaustCells = {};
      for (const [id, ff] of Object.entries(this.fanFaces)) {
        if (ff.inflow) continue;
        const cells = ff.faces ? ff.faces.map((w) => w.inner) : ff.cells;
        this.exhaustCells[id] = cells.filter((c) => this.type[c] === FLUID);
      }
      const mobo = layout.components.mobo;
      this.moboCells = [];
      this.rect(mobo.x, mobo.y, mobo.x + mobo.w, mobo.y + mobo.h, (i, j, c) => { if (fluid(c)) this.moboCells.push(c); });
    }

    collectBoundary() {
      const { nx, ny, type } = this;
      const list = [];
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const c = this.id(i, j);
        if (type[c] === FLUID) continue;
        const nb = [];
        if (i > 0 && type[c - 1] === FLUID) nb.push(c - 1);
        if (i < nx - 1 && type[c + 1] === FLUID) nb.push(c + 1);
        if (j > 0 && type[c - nx] === FLUID) nb.push(c - nx);
        if (j < ny - 1 && type[c + nx] === FLUID) nb.push(c + nx);
        if (nb.length) list.push({ c, nb, ambient: type[c] === OPEN || this.ambientWall[c] === 1 });
      }
      this.boundary = list;
      this.ambientCell = new Uint8Array(type.length);
      for (let c = 0; c < type.length; c++) this.ambientCell[c] = type[c] === OPEN || this.ambientWall[c] ? 1 : 0;
      this.fluidCells = [];
      for (let c = 0; c < type.length; c++) if (type[c] === FLUID) this.fluidCells.push(c);
      this.srcCells = [];
      for (let c = 0; c < type.length; c++) if (this.src[c] !== 0) this.srcCells.push(c);
      this.buildPressureSystem();
    }

    computeTimeStep() {
      let vmax = 0.3;
      for (let k = 0; k < this.uFixVal.length; k++) vmax = Math.max(vmax, Math.abs(this.uFixVal[k]));
      for (let k = 0; k < this.vFixVal.length; k++) vmax = Math.max(vmax, Math.abs(this.vFixVal[k]));
      this.vmax = vmax;
      this.dt = Math.min(0.008, 1.2 * this.dx / vmax, 0.2 * this.dx * this.dx / this.alpha);
    }

    setHeat(thermal) {
      this.thermal = thermal;
      this.heat.fill(0);
      const W = this.width;
      const area = this.dx * this.dx;
      const spread = (cells, power) => {
        if (!cells.length || !(power > 0)) return;
        const rate = power / (this.rhoCp * W * cells.length * area);
        for (const c of cells) this.heat[c] += rate;
      };
      const cpuCells = [];
      const gpuCells = [];
      for (let c = 0; c < this.region.length; c++) {
        if (this.region[c] === REGION_CPU) cpuCells.push(c);
        else if (this.region[c] === REGION_GPU) gpuCells.push(c);
      }
      const cooler = AF.data.CPU_COOLERS[this.config.cpu.cooler];
      if (cooler.type === 'aio') {
        for (const s of thermal.sections) {
          const rad = this.radCells[s.element.id];
          if (rad) spread(rad.cells, s.heat);
        }
      } else {
        spread(cpuCells, thermal.cpu.power);
      }
      spread(gpuCells, thermal.gpu.power);
      spread(this.moboCells, this.config.otherHeat);
      this.heatCells = [];
      for (let c = 0; c < this.heat.length; c++) if (this.heat[c] > 0) this.heatCells.push(c);
    }

    sampleU(x, y) {
      const nx1 = this.nx + 1;
      const fx = Math.min(Math.max(x, 0), this.nx - 1e-4);
      const fy = Math.min(Math.max(y - 0.5, 0), this.ny - 1 - 1e-4);
      const i = fx | 0;
      const j = fy | 0;
      const sx = fx - i;
      const sy = fy - j;
      const k = i + j * nx1;
      const u = this.u;
      return (u[k] * (1 - sx) + u[k + 1] * sx) * (1 - sy) + (u[k + nx1] * (1 - sx) + u[k + nx1 + 1] * sx) * sy;
    }

    sampleV(x, y) {
      const nx = this.nx;
      const fx = Math.min(Math.max(x - 0.5, 0), nx - 1 - 1e-4);
      const fy = Math.min(Math.max(y, 0), this.ny - 1e-4);
      const i = fx | 0;
      const j = fy | 0;
      const sx = fx - i;
      const sy = fy - j;
      const k = i + j * nx;
      const v = this.v;
      return (v[k] * (1 - sx) + v[k + 1] * sx) * (1 - sy) + (v[k + nx] * (1 - sx) + v[k + nx + 1] * sx) * sy;
    }

    advectVelocity(dt) {
      const { nx, ny, u, v, uTmp, vTmp, uFix, vFix } = this;
      const s = dt / this.dx;
      for (let j = 0; j < ny; j++) for (let i = 0; i <= nx; i++) {
        const k = i + j * (nx + 1);
        if (uFix[k]) { uTmp[k] = this.uFixVal[k]; continue; }
        const x = i;
        const y = j + 0.5;
        const mx = x - 0.5 * s * u[k];
        const my = y - 0.5 * s * this.sampleV(x, y);
        uTmp[k] = this.sampleU(x - s * this.sampleU(mx, my), y - s * this.sampleV(mx, my));
      }
      for (let j = 0; j <= ny; j++) for (let i = 0; i < nx; i++) {
        const k = i + j * nx;
        if (vFix[k]) { vTmp[k] = this.vFixVal[k]; continue; }
        const x = i + 0.5;
        const y = j;
        const mx = x - 0.5 * s * this.sampleU(x, y);
        const my = y - 0.5 * s * v[k];
        vTmp[k] = this.sampleV(x - s * this.sampleU(mx, my), y - s * this.sampleV(mx, my));
      }
      this.uTmp = u;
      this.u = uTmp;
      this.vTmp = v;
      this.v = vTmp;
    }

    bodyForces(dt) {
      const { nx, ny, T, v, vFix, u, uFix } = this;
      const damp = 1 / (1 + dt * this.damping);
      const g = dt * this.gravity * this.beta;
      for (let j = 1; j < ny; j++) for (let i = 0; i < nx; i++) {
        const k = i + j * nx;
        if (vFix[k]) continue;
        const tf = 0.5 * (T[i + (j - 1) * nx] + T[i + j * nx]);
        v[k] = (v[k] - g * (tf - this.Tamb)) * damp;
      }
      for (let k = 0; k < u.length; k++) if (!uFix[k]) u[k] *= damp;
    }

    buildPressureSystem() {
      const { nx, type, uFix, vFix } = this;
      const nx1 = nx + 1;
      const cells = this.fluidCells;
      const m = cells.length;
      const compact = new Int32Array(type.length).fill(-1);
      for (let k = 0; k < m; k++) compact[cells[k]] = k;
      const diag = new Float64Array(m);
      const nbr = new Int32Array(m * 4).fill(-1);
      for (let k = 0; k < m; k++) {
        const c = cells[k];
        const i = c % nx;
        const j = (c - i) / nx;
        const faces = [[uFix[i + 1 + j * nx1], c + 1], [uFix[i + j * nx1], c - 1], [vFix[i + (j + 1) * nx], c + nx], [vFix[i + j * nx], c - nx]];
        let cnt = 0;
        faces.forEach(([fixed, n], f) => {
          if (fixed) return;
          cnt++;
          if (type[n] === FLUID) nbr[k * 4 + f] = compact[n];
        });
        diag[k] = cnt;
      }
      const precon = new Float64Array(m);
      const tau = 0.97;
      const sigma = 0.25;
      for (let k = 0; k < m; k++) {
        if (diag[k] <= 0) continue;
        const L = nbr[k * 4 + 1];
        const U = nbr[k * 4 + 3];
        let e = diag[k];
        if (L >= 0) {
          const pl = precon[L] * precon[L];
          e -= pl;
          if (nbr[L * 4 + 2] >= 0) e -= tau * pl;
        }
        if (U >= 0) {
          const pu = precon[U] * precon[U];
          e -= pu;
          if (nbr[U * 4] >= 0) e -= tau * pu;
        }
        if (e < sigma * diag[k]) e = diag[k];
        precon[k] = 1 / Math.sqrt(e);
      }
      this.ps = {
        m, diag, nbr, precon,
        x: new Float64Array(m), b: new Float64Array(m), r: new Float64Array(m),
        z: new Float64Array(m), d: new Float64Array(m), q: new Float64Array(m), w: new Float64Array(m),
      };
    }

    applyA(src, dst) {
      const { m, diag, nbr } = this.ps;
      for (let k = 0; k < m; k++) {
        let s = diag[k] * src[k];
        const o = k * 4;
        if (nbr[o] >= 0) s -= src[nbr[o]];
        if (nbr[o + 1] >= 0) s -= src[nbr[o + 1]];
        if (nbr[o + 2] >= 0) s -= src[nbr[o + 2]];
        if (nbr[o + 3] >= 0) s -= src[nbr[o + 3]];
        dst[k] = s;
      }
    }

    applyPreconditioner(r, z) {
      const { m, nbr, precon, w } = this.ps;
      for (let k = 0; k < m; k++) {
        let t = r[k];
        const L = nbr[k * 4 + 1];
        const U = nbr[k * 4 + 3];
        if (L >= 0) t += precon[L] * w[L];
        if (U >= 0) t += precon[U] * w[U];
        w[k] = t * precon[k];
      }
      for (let k = m - 1; k >= 0; k--) {
        let t = w[k];
        const R = nbr[k * 4];
        const D = nbr[k * 4 + 2];
        if (R >= 0) t += precon[k] * z[R];
        if (D >= 0) t += precon[k] * z[D];
        z[k] = t * precon[k];
      }
    }

    solvePressure() {
      const { m, diag, x, b, r, z, d, q } = this.ps;
      const cells = this.fluidCells;
      const p = this.p;
      for (let k = 0; k < m; k++) x[k] = p[cells[k]];
      const dx2 = this.dx * this.dx;
      this.applyA(x, q);
      for (let k = 0; k < m; k++) r[k] = b[k] - q[k];
      this.applyPreconditioner(r, z);
      let rz = 0;
      for (let k = 0; k < m; k++) { d[k] = z[k]; rz += r[k] * z[k]; }
      const tol = (DIVERGENCE_TOLERANCE * dx2) ** 2 * m;
      let iter = 0;
      for (; iter < PRESSURE_ITERATIONS; iter++) {
        let rr = 0;
        for (let k = 0; k < m; k++) rr += r[k] * r[k];
        if (rr < tol) break;
        this.applyA(d, q);
        let dq = 0;
        for (let k = 0; k < m; k++) dq += d[k] * q[k];
        if (dq <= 0) break;
        const alpha = rz / dq;
        for (let k = 0; k < m; k++) {
          x[k] += alpha * d[k];
          r[k] -= alpha * q[k];
        }
        this.applyPreconditioner(r, z);
        let rzNew = 0;
        for (let k = 0; k < m; k++) rzNew += r[k] * z[k];
        const beta = rzNew / rz;
        rz = rzNew;
        for (let k = 0; k < m; k++) d[k] = z[k] + beta * d[k];
      }
      for (let k = 0; k < m; k++) p[cells[k]] = x[k];
      this.lastIterations = iter;
    }

    project() {
      const { nx, ny, type, p, src, uFix, vFix } = this;
      const u = this.u;
      const v = this.v;
      const nx1 = nx + 1;
      const dx = this.dx;
      const dx2 = dx * dx;
      const cells = this.fluidCells;
      const b = this.ps.b;
      for (let k = 0; k < cells.length; k++) {
        const c = cells[k];
        const i = c % nx;
        const j = (c - i) / nx;
        const div = (u[i + 1 + j * nx1] - u[i + j * nx1] + v[i + (j + 1) * nx] - v[i + j * nx]) / dx;
        b[k] = (src[c] - div) * dx2;
      }
      this.solvePressure();
      const pv = (c) => (type[c] === FLUID ? p[c] : 0);
      for (let j = 0; j < ny; j++) for (let i = 1; i < nx; i++) {
        const k = i + j * nx1;
        if (uFix[k]) continue;
        u[k] -= (pv(i + j * nx) - pv(i - 1 + j * nx)) / dx;
      }
      for (let j = 1; j < ny; j++) for (let i = 0; i < nx; i++) {
        const k = i + j * nx;
        if (vFix[k]) continue;
        v[k] -= (pv(i + j * nx) - pv(i + (j - 1) * nx)) / dx;
      }
    }

    advectTemperature(dt) {
      const { nx, type, fluidCells, src } = this;
      const u = this.u;
      const v = this.v;
      const nx1 = nx + 1;
      const inv = 1 / this.dx;
      let maxOut = 0;
      for (let n = 0; n < fluidCells.length; n++) {
        const c = fluidCells[n];
        const i = c % nx;
        const j = (c - i) / nx;
        const out = Math.max(0, u[i + 1 + j * nx1]) - Math.min(0, u[i + j * nx1]) + Math.max(0, v[c + nx]) - Math.min(0, v[c]);
        if (out > maxOut) maxOut = out;
      }
      const substeps = Math.max(1, Math.ceil(dt * maxOut * inv / 0.9));
      const h = dt / substeps;
      const k = h * inv;
      const Tamb = this.Tamb;
      const ambient = this.ambientCell;
      for (let sstep = 0; sstep < substeps; sstep++) {
        const T = this.T;
        const out = this.Tnew;
        out.set(T);
        const nb = (c, self) => (type[c] === FLUID ? T[c] : ambient[c] ? Tamb : self);
        for (let n = 0; n < fluidCells.length; n++) {
          const c = fluidCells[n];
          const i = c % nx;
          const j = (c - i) / nx;
          const t = T[c];
          const ur = u[i + 1 + j * nx1];
          const ul = u[i + j * nx1];
          const vd = v[c + nx];
          const vu = v[c];
          let acc = 0;
          acc -= ur * (ur > 0 ? t : nb(c + 1, t));
          acc += ul * (ul > 0 ? nb(c - 1, t) : t);
          acc -= vd * (vd > 0 ? t : nb(c + nx, t));
          acc += vu * (vu > 0 ? nb(c - nx, t) : t);
          const s = src[c];
          out[c] = t + k * acc + h * s * (s > 0 ? Tamb : t);
        }
        this.Tnew = T;
        this.T = out;
      }
    }

    sources(dt) {
      const T = this.T;
      for (const c of this.heatCells) T[c] += dt * this.heat[c];
    }

    diffuse(dt) {
      const { nx, type, fluidCells } = this;
      const T = this.T;
      const out = this.Tnew;
      const f = this.alpha * dt / (this.dx * this.dx);
      out.set(T);
      for (let n = 0; n < fluidCells.length; n++) {
        const c = fluidCells[n];
        const t = T[c];
        let acc = 0;
        if (type[c + 1] === FLUID) acc += T[c + 1] - t;
        if (type[c - 1] === FLUID) acc += T[c - 1] - t;
        if (type[c + nx] === FLUID) acc += T[c + nx] - t;
        if (type[c - nx] === FLUID) acc += T[c - nx] - t;
        out[c] = t + f * acc;
      }
      this.Tnew = T;
      this.T = out;
    }

    boundaryTemps() {
      const T = this.T;
      for (const b of this.boundary) {
        if (b.ambient) { T[b.c] = this.Tamb; continue; }
        let s = 0;
        for (const n of b.nb) s += T[n];
        T[b.c] = s / b.nb.length;
      }
    }

    average(cells) {
      if (!cells || !cells.length) return null;
      let s = 0;
      for (const c of cells) s += this.T[c];
      return s / cells.length;
    }

    updateReadings(dt) {
      const a = dt / (READING_TAU + dt);
      const r = this.readings;
      const blend = (key, value) => { if (value != null) r[key] = r[key] + a * (value - r[key]); };
      blend('cpu', this.average(this.cpuInletCells));
      blend('gpu', this.average(this.gpuInletCells));
      blend('radiator', this.average(this.radInletCells));
      for (const [id, cells] of Object.entries(this.exhaustCells)) {
        const value = this.average(cells);
        if (value == null) continue;
        r.exhaust[id] = r.exhaust[id] == null ? value : r.exhaust[id] + a * (value - r.exhaust[id]);
      }
      const { nx, u, v, speedAvg, fluidCells } = this;
      const nx1 = nx + 1;
      for (let n = 0; n < fluidCells.length; n++) {
        const c = fluidCells[n];
        const i = c % nx;
        const j = (c - i) / nx;
        const uc = 0.5 * (u[i + j * nx1] + u[i + 1 + j * nx1]);
        const vc = 0.5 * (v[c] + v[c + nx]);
        speedAvg[c] += a * (Math.sqrt(uc * uc + vc * vc) - speedAvg[c]);
      }
    }

    step() {
      const dt = this.dt;
      this.advectVelocity(dt);
      this.bodyForces(dt);
      this.project();
      this.advectTemperature(dt);
      this.sources(dt);
      this.diffuse(dt);
      this.boundaryTemps();
      this.updateReadings(dt);
      this.time += dt;
    }

    advance(steps) {
      for (let k = 0; k < steps; k++) this.step();
    }

    get ready() {
      return this.time > Math.max(4, 5 * this.flushTime);
    }

    stats() {
      let stagnant = 0;
      let total = 0;
      let maxT = this.Tamb;
      let sumT = 0;
      const threshold = AF.data.PHYSICS.stagnantSpeed;
      for (const c of this.fluidCells) {
        sumT += this.T[c];
        if (this.T[c] > maxT) maxT = this.T[c];
        if (this.region[c]) continue;
        total++;
        if (this.speedAvg[c] < threshold) stagnant++;
      }
      const r = this.readings;
      return {
        ready: this.ready,
        progress: Math.min(1, this.time / Math.max(4, 5 * this.flushTime)),
        time: this.time,
        stagnant: total ? stagnant / total : 0,
        meanT: sumT / Math.max(1, this.fluidCells.length),
        maxT,
        inlets: {
          cpu: r.cpu,
          gpu: r.gpu,
          radiator: this.radInletCells.length ? r.radiator : null,
        },
        cpuRecirculation: r.cpu - this.Tamb,
        gpuRecirculation: r.gpu - this.Tamb,
        exhaust: r.exhaust,
      };
    }

    velocityAt(x, y) {
      return [this.sampleU(x, y), this.sampleV(x, y)];
    }

    initParticles() {
      this.px = new Float32Array(PARTICLE_COUNT);
      this.py = new Float32Array(PARTICLE_COUNT);
      this.age = new Float32Array(PARTICLE_COUNT);
      this.trail = new Float32Array(PARTICLE_COUNT * TRAIL * 2);
      this.trailLength = TRAIL;
      this.particleCount = PARTICLE_COUNT;
      this.spawns = [];
    }

    rebuildSpawns() {
      const { nx, ny, type } = this;
      const nx1 = nx + 1;
      const spawns = [];
      let total = 0;
      const add = (x, y, w) => { if (w > 1e-4) { total += w; spawns.push({ x, y, cum: total }); } };
      for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx; i++) {
        const a = type[i - 1 + j * nx];
        const b = type[i + j * nx];
        const vel = this.u[i + j * nx1];
        if (a !== FLUID && b === FLUID && vel > 0) add(i + 0.05, j + 0.5, vel);
        if (a === FLUID && b !== FLUID && vel < 0) add(i - 0.05, j + 0.5, -vel);
      }
      for (let j = 1; j < ny; j++) for (let i = 1; i < nx - 1; i++) {
        const a = type[i + (j - 1) * nx];
        const b = type[i + j * nx];
        const vel = this.v[i + j * nx];
        if (a !== FLUID && b === FLUID && vel > 0) add(i + 0.5, j + 0.05, vel);
        if (a === FLUID && b !== FLUID && vel < 0) add(i + 0.5, j - 0.05, -vel);
      }
      for (const c of this.srcCells) {
        if (this.src[c] <= 0) continue;
        const i = c % nx;
        const j = (c - i) / nx;
        add(i + Math.random(), j + Math.random(), this.src[c] * this.dx);
      }
      this.spawns = spawns;
      this.spawnTotal = total;
    }

    respawn(n) {
      let x;
      let y;
      if (this.spawns.length && Math.random() < 0.85) {
        const r = Math.random() * this.spawnTotal;
        let lo = 0;
        let hi = this.spawns.length - 1;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (this.spawns[mid].cum < r) lo = mid + 1; else hi = mid;
        }
        const s = this.spawns[lo];
        x = s.x + (Math.random() - 0.5) * 0.9;
        y = s.y + (Math.random() - 0.5) * 0.9;
      } else {
        const c = this.fluidCells[(Math.random() * this.fluidCells.length) | 0];
        const i = c % this.nx;
        x = i + Math.random();
        y = (c - i) / this.nx + Math.random();
      }
      this.px[n] = x;
      this.py[n] = y;
      this.age[n] = Math.random() * 2;
      const base = n * TRAIL * 2;
      for (let k = 0; k < TRAIL; k++) { this.trail[base + 2 * k] = x; this.trail[base + 2 * k + 1] = y; }
    }

    advectParticles(realDt, playback) {
      const dtv = realDt * playback;
      const maxAge = 10;
      const inv = 1 / this.dx;
      for (let n = 0; n < this.particleCount; n++) {
        let x = this.px[n];
        let y = this.py[n];
        const i = x | 0;
        const j = y | 0;
        const inside = i > 0 && j > 0 && i < this.nx - 1 && j < this.ny - 1 && this.type[i + j * this.nx] === FLUID;
        if (!inside || this.age[n] > maxAge) { this.respawn(n); continue; }
        const ux = this.sampleU(x, y) * inv;
        const vy = this.sampleV(x, y) * inv;
        const mx = x + 0.5 * dtv * ux;
        const my = y + 0.5 * dtv * vy;
        x += dtv * this.sampleU(mx, my) * inv;
        y += dtv * this.sampleV(mx, my) * inv;
        const base = n * TRAIL * 2;
        this.trail.copyWithin(base + 2, base, base + (TRAIL - 1) * 2);
        this.trail[base] = x;
        this.trail[base + 1] = y;
        this.px[n] = x;
        this.py[n] = y;
        this.age[n] += realDt;
      }
    }
  }

  AF.CaseSim = CaseSim;
  AF.CFD_TYPES = { FLUID, SOLID, OPEN, REGION_CPU, REGION_GPU, REGION_RAD };

  if (typeof module === 'object' && module.exports) module.exports = AF;
})(typeof window !== 'undefined' ? window : globalThis);
