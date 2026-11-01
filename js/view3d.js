(function (root) {
  const AF = root.AF;

  const LAYERS = [
    ['shell', 'Case panels'],
    ['glass', 'Glass side panel'],
    ['board', 'Motherboard'],
    ['cooler', 'CPU cooler & radiator'],
    ['gpu', 'Graphics card'],
    ['shroud', 'PSU shroud'],
    ['fans', 'Fans & flow arrows'],
    ['heatmap', 'Heat map slice'],
    ['particles', 'Airflow particles'],
    ['spin', 'Spinning fans'],
  ];
  const FADED_OPACITY = 0.1;
  const SEE_THROUGH = 0.3;
  const BOARD_Z = 6;
  const CARD_HEIGHT = 126;
  const FT = 25;
  const COLORS = {
    intake: 0x38bdf8,
    exhaust: 0xfb7185,
    internal: 0xa78bfa,
    cooler: 0x6d8dff,
    vent: 0x64748b,
    edge: 0x94a3b8,
  };
  const PANEL_OPACITY = { mesh: 0.22, perforated: 0.4, restricted: 0.7, solid: 0.82 };

  class View3D {
    constructor(host, app) {
      this.host = host;
      this.app = app;
      this.options = Object.fromEntries(LAYERS.map(([k]) => [k, true]));
      this.transparent = new Set();
      this.active = false;
      this.supported = typeof THREE !== 'undefined' && typeof THREE.OrbitControls !== 'undefined';
      if (!this.supported) return;
      try {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch (err) {
        this.supported = false;
        return;
      }
      this.renderer.setPixelRatio(Math.min(2, root.devicePixelRatio || 1));
      this.canvas = this.renderer.domElement;
      this.canvas.className = 'view3d';
      host.insertBefore(this.canvas, host.firstChild);
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(32, 1, 5, 20000);
      this.controls = new THREE.OrbitControls(this.camera, this.canvas);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.09;
      this.scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x0b0f16, 0.85));
      this.scene.add(new THREE.AmbientLight(0xffffff, 0.18));
      const sun = new THREE.DirectionalLight(0xffffff, 0.75);
      sun.position.set(700, 1100, 900);
      this.scene.add(sun);
      this.root = new THREE.Group();
      this.scene.add(this.root);
      this.raycaster = new THREE.Raycaster();
      this.pointer = new THREE.Vector2();
      this.frame = 0;
      this.bindPointer();
    }

    bindPointer() {
      let down = null;
      this.canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
      this.canvas.addEventListener('pointerup', (e) => {
        if (!down) return;
        const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
        const quick = performance.now() - down.t < 450;
        down = null;
        if (moved > 4 || !quick) return;
        const hit = this.pick(e);
        if (!hit) return;
        const key = hit.userData.key;
        if (this.transparent.has(key)) this.transparent.delete(key); else this.transparent.add(key);
        this.applyTransparency();
        this.showTip(e, hit);
      });
      this.canvas.addEventListener('pointermove', (e) => {
        if (e.buttons) { this.hideTip(); return; }
        const hit = this.pick(e);
        if (hit) this.showTip(e, hit); else this.hideTip();
        this.canvas.style.cursor = hit ? 'pointer' : 'grab';
      });
      this.canvas.addEventListener('pointerleave', () => this.hideTip());
    }

    pick(e) {
      const r = this.canvas.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const visible = this.pickables.filter((m) => this.isVisible(m));
      const hits = this.raycaster.intersectObjects(visible, false);
      if (!hits.length) return null;
      const opaque = (hh) => (hh.object.material.userData.baseOpacity || 1) >= SEE_THROUGH;
      const solid = hits.find((hh) => opaque(hh) && !this.transparent.has(hh.object.userData.key));
      const faded = hits.find((hh) => opaque(hh));
      return (solid || faded || hits[0]).object;
    }

    isVisible(obj) {
      for (let o = obj; o; o = o.parent) if (!o.visible) return false;
      return true;
    }

    showTip(e, mesh) {
      const tip = this.app.dom.tooltip;
      const r = this.host.getBoundingClientRect();
      const faded = this.transparent.has(mesh.userData.key);
      tip.innerHTML = `<b>${mesh.userData.label}</b><br>${faded ? 'Click to make solid' : 'Click to make transparent'}`;
      tip.style.display = 'block';
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      tip.style.left = `${Math.min(x + 14, r.width - tip.offsetWidth - 4)}px`;
      tip.style.top = `${Math.min(y + 14, r.height - tip.offsetHeight - 4)}px`;
    }

    hideTip() {
      this.app.dom.tooltip.style.display = 'none';
    }

    setActive(on, state) {
      if (!this.supported) return false;
      this.active = on;
      this.canvas.style.display = on ? 'block' : 'none';
      if (on) this.build(state);
      return true;
    }

    clear() {
      this.root.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          for (const m of [].concat(o.material)) {
            if (m.map) m.map.dispose();
            m.dispose();
          }
        }
      });
      this.root.clear();
    }

    P(x, y, z) {
      return new THREE.Vector3(x - this.D / 2, this.H / 2 - y, z - this.W / 2);
    }

    material(color, opacity, extra) {
      const m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.55, metalness: 0.25, transparent: true, opacity, side: THREE.DoubleSide }, extra || {}));
      m.userData.baseOpacity = opacity;
      return m;
    }

    register(mesh, key, label) {
      mesh.userData.key = key;
      mesh.userData.label = label;
      this.pickables.push(mesh);
      return mesh;
    }

    box(parent, key, label, x0, y0, z0, x1, y1, z1, mat) {
      const geo = new THREE.BoxGeometry(Math.max(0.5, Math.abs(x1 - x0)), Math.max(0.5, Math.abs(y1 - y0)), Math.max(0.5, Math.abs(z1 - z0)));
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(this.P((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
      parent.add(mesh);
      if (key) this.register(mesh, key, label);
      return mesh;
    }

    layer(name) {
      const g = new THREE.Group();
      g.userData.layer = name;
      g.visible = this.options[name] !== false;
      this.layers[name] = g;
      this.root.add(g);
      return g;
    }

    fan(parent, key, label, o) {
      const color = COLORS[o.mode] || COLORS.vent;
      const group = new THREE.Group();
      group.position.copy(this.P(o.x, o.y, o.z));
      if (o.axis === 'x') group.rotation.z = Math.PI / 2;
      if (o.axis === 'z') group.rotation.x = Math.PI / 2;
      parent.add(group);
      const r = o.size / 2;
      const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(o.size, FT, o.size)), new THREE.LineBasicMaterial({ color, transparent: true, opacity: o.mode === 'vent' ? 0.45 : 0.9 }));
      group.add(frame);
      if (o.mode === 'vent') return group;
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(r - 2, r - 2, FT, 40, 1, true), this.material(color, 0.35, { emissive: color, emissiveIntensity: 0.15 }));
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.28, r * 0.28, FT - 4, 24), this.material(0x1e293b, 0.95));
      group.add(ring, hub);
      this.register(ring, key, label);
      this.register(hub, key, label);
      const blades = new THREE.Group();
      const bladeMat = this.material(color, 0.85, { emissive: color, emissiveIntensity: 0.25 });
      const count = 7;
      for (let k = 0; k < count; k++) {
        const pivot = new THREE.Group();
        pivot.rotation.y = (k / count) * Math.PI * 2;
        const blade = new THREE.Mesh(new THREE.BoxGeometry(r * 0.66, 1.6, r * 0.32), bladeMat);
        blade.position.x = r * 0.58;
        blade.rotation.x = 0.55;
        pivot.add(blade);
        blades.add(pivot);
        this.register(blade, key, label);
      }
      group.add(blades);
      this.spinners.push({ group: blades, rate: (o.speed || 0.7) * 16 * (o.reverse ? -1 : 1) });
      if (o.flow) {
        const dir = new THREE.Vector3(o.flow[0], -o.flow[1], o.flow[2] || 0).normalize();
        const origin = this.P(o.x, o.y, o.z).sub(dir.clone().multiplyScalar(40));
        const arrow = new THREE.ArrowHelper(dir, origin, 95, color, 24, 15);
        parent.add(arrow);
      }
      return group;
    }

    build(state) {
      if (!this.supported) return;
      this.clear();
      this.pickables = [];
      this.layers = {};
      this.spinners = [];
      const config = state.config;
      const layout = state.layout;
      const comps = layout.components;
      const c = config.case;
      this.D = c.depth;
      this.H = c.height;
      this.W = c.width;
      const D = this.D;
      const H = this.H;
      const W = this.W;

      const shell = this.layer('shell');
      const glass = this.layer('glass');
      const board = this.layer('board');
      const cooler = this.layer('cooler');
      const gpuLayer = this.layer('gpu');
      const shroudLayer = this.layer('shroud');
      this.layer('fans');
      const heat = this.layer('heatmap');
      const parts = this.layer('particles');

      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(D, H, W)), new THREE.LineBasicMaterial({ color: COLORS.edge, transparent: true, opacity: 0.8 }));
      shell.add(edges);
      const panelMat = (type) => this.material(0x1c2534, PANEL_OPACITY[type] != null ? PANEL_OPACITY[type] : 0.6, { metalness: 0.4 });
      const P = c.panels;
      this.box(shell, 'panel:tray', 'Motherboard tray', 0, 0, -2, D, H, 0, this.material(0x0b111b, 0.96));
      this.box(shell, 'panel:top', `Top panel (${AF.data.PANEL_TYPES[P.top.type].name})`, 0, -2, 0, D, 0, W, panelMat(P.top.type));
      this.box(shell, 'panel:front', `Front panel (${AF.data.PANEL_TYPES[P.front.type].name})`, D, 0, 0, D + 2, H, W, panelMat(P.front.type));
      this.box(shell, 'panel:rear', `Rear panel (${AF.data.PANEL_TYPES[P.rear.type].name})`, -2, 0, 0, 0, H, W, panelMat(P.rear.type));
      this.box(shell, 'panel:bottom', `Bottom panel (${AF.data.PANEL_TYPES[P.bottom.type].name})`, 0, H, 0, D, H + 2, W, panelMat(c.shroud ? 'solid' : P.bottom.type));
      const sideType = P.side.type;
      this.box(glass, 'panel:side', sideType === 'solid' ? 'Glass side panel' : `Side panel (${AF.data.PANEL_TYPES[sideType].name})`, 0, 0, W, D, H, W + 2,
        this.material(sideType === 'solid' ? 0x93c5fd : 0x1c2534, sideType === 'solid' ? 0.07 : PANEL_OPACITY[sideType] || 0.3, { roughness: 0.05, metalness: 0.1 }));

      const m = comps.mobo;
      const boardLabel = AF.catalog.boardOf(config) ? AF.catalog.boardOf(config).name : 'Motherboard';
      this.box(board, 'board', boardLabel, m.x, m.y, 0, m.x + m.w, m.y + m.h, BOARD_Z, this.material(0x16213a, 0.97));
      this.box(board, 'board', boardLabel, comps.socket.x - 22, comps.socket.y - 22, BOARD_Z, comps.socket.x + 22, comps.socket.y + 22, BOARD_Z + 4, this.material(0x94a3b8, 0.97, { metalness: 0.7 }));
      for (const slot of comps.pcieSlots) {
        this.box(board, 'board', boardLabel, m.x + 15, slot.y - 3, BOARD_Z, m.x + 104, slot.y + 3, BOARD_Z + 11, this.material(slot.primary ? 0x475569 : 0x0f172a, 0.97));
      }
      for (let k = 0; k < 4; k++) {
        const rx = comps.socket.x + 52 + k * 9;
        if (rx + 6 > m.x + m.w) break;
        this.box(board, 'board', boardLabel, rx, comps.socket.y - 62, BOARD_Z, rx + 6, comps.socket.y + 62, BOARD_Z + 32, this.material(0x1f2937, 0.97));
      }

      this.buildCooler(cooler, state);
      this.buildGpu(gpuLayer, state);

      if (comps.shroud) {
        this.box(shroudLayer, 'shroud', 'PSU shroud', 0, comps.shroud.y, 0, comps.shroud.x1, H, W, this.material(0x1a2230, 0.93, { metalness: 0.35 }));
      }

      this.buildCaseFans(state);
      this.buildHeatmap(heat, state);
      this.buildParticles(parts, state);
      this.applyTransparency();

      const dims = `${D}x${H}x${W}`;
      if (dims !== this.dims) {
        this.dims = dims;
        this.resize();
        this.resetView();
      }
    }

    buildCooler(group, state) {
      const config = state.config;
      const comps = state.layout.components;
      const cooler = AF.catalog.cpuCooler(config);
      const cc = comps.cpuCooler;
      const label = cooler.name;
      const metal = this.material(0xc0c8d4, 0.95, { metalness: 0.75, roughness: 0.35 });
      const s = comps.socket;
      if (cooler.type === 'tower') {
        const zTop = BOARD_Z + cooler.height;
        const zFin = BOARD_Z + 34;
        this.box(group, 'cooler', label, s.x - 22, s.y - 22, BOARD_Z + 4, s.x + 22, s.y + 22, zFin, this.material(0xb87333, 0.97, { metalness: 0.8, roughness: 0.3 }));
        for (const t of cc.towers) {
          for (let y = cc.y; y < cc.y + cc.h; y += 4.5) this.box(group, 'cooler', label, t.x, y, zFin, t.x + t.w, y + 0.8, zTop, metal);
        }
        const zMid = (zFin + zTop) / 2;
        for (const f of cc.fans) {
          this.fan(group, 'cooler', `${label} fan`, { x: f.x + f.w / 2, y: f.y + f.h / 2, z: zMid, size: Math.min(f.h, zTop - zFin + 10), axis: 'x', mode: 'cooler', speed: config.cpu.coolerFanSpeed, flow: [-1, 0, 0] });
        }
      } else if (cooler.type === 'aio') {
        this.box(group, 'cooler', `${label} pump`, s.x - 30, s.y - 30, BOARD_Z + 4, s.x + 30, s.y + 30, BOARD_Z + 48, this.material(0x111827, 0.97, { metalness: 0.5 }));
        const rad = comps.radiator;
        if (rad) {
          const thick = rad.thickness;
          for (const slot of rad.slots) {
            const half = slot.size / 2;
            const zc = this.W / 2;
            let b;
            if (slot.panel === 'front') b = [this.D - FT - thick, slot.cy - half, this.D - FT, slot.cy + half];
            else if (slot.panel === 'rear') b = [FT, slot.cy - half, FT + thick, slot.cy + half];
            else if (slot.panel === 'top') b = [slot.cx - half, FT, slot.cx + half, FT + thick];
            else b = [slot.cx - half, this.H - FT - thick, slot.cx + half, this.H - FT];
            this.box(group, 'cooler', `${label} radiator`, b[0], b[1], zc - 62, b[2], b[3], zc + 62, this.material(0x334155, 0.95, { metalness: 0.6 }));
          }
          const mid = rad.slots[Math.floor(rad.slots.length / 2)];
          const target = mid.panel === 'front' ? [this.D - FT - thick, mid.cy] : mid.panel === 'rear' ? [FT + thick, mid.cy] : mid.panel === 'top' ? [mid.cx, FT + thick] : [mid.cx, this.H - FT - thick];
          for (const dz of [-12, 12]) {
            const curve = new THREE.CatmullRomCurve3([
              this.P(s.x, s.y, BOARD_Z + 40 + dz),
              this.P((s.x + target[0]) / 2, Math.min(s.y, target[1]) - 25, this.W / 2 + dz),
              this.P(target[0], target[1], this.W / 2 + dz),
            ]);
            const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 5, 10, false), this.material(0x0f172a, 0.97, { roughness: 0.8 }));
            group.add(tube);
            this.register(tube, 'cooler', `${label} tubes`);
          }
        }
      } else {
        const f = cooler.footprint || 100;
        const zTop = BOARD_Z + cooler.height;
        this.box(group, 'cooler', label, s.x - f / 2, s.y - f / 2, BOARD_Z + 4, s.x + f / 2, s.y + f / 2, zTop - FT, metal);
        this.fan(group, 'cooler', `${label} fan`, { x: s.x, y: s.y, z: zTop - FT / 2, size: Math.min(f, (cooler.fan && cooler.fan.size) || 92), axis: 'z', mode: 'cooler', speed: config.cpu.coolerFanSpeed, flow: [0, 0, -1] });
      }
    }

    buildGpu(group, state) {
      const config = state.config;
      const g = state.layout.components.gpu;
      const entry = AF.catalog.byId(AF.catalog.GPUS, config.gpu.model);
      const label = entry ? entry.name : 'Graphics card';
      const gpuCooler = AF.catalog.gpuCooler(config);
      const z0 = BOARD_Z + 2;
      const z1 = z0 + CARD_HEIGHT;
      this.box(group, 'gpu', label, 0, g.pcbTop, z0, g.pcbLength, g.pcbBottom, z1, this.material(0x14532d, 0.97));
      this.box(group, 'gpu', label, 0, g.sinkTop, z0, g.length, g.sinkBottom, z1, this.material(0x334155, 0.95, { metalness: 0.55 }));
      this.box(group, 'gpu', label, -1, g.pcbTop - 4, z0 - 4, 1.5, g.sinkBottom, z1 + 6, this.material(0xa3aab5, 0.97, { metalness: 0.8 }));
      const zc = (z0 + z1) / 2;
      const speed = config.gpu.fanSpeed;
      if (gpuCooler.type === 'blower') {
        this.fan(group, 'gpu', `${label} blower`, { x: g.length - 50, y: g.sinkBottom - FT / 2, z: zc, size: 70, axis: 'y', mode: 'cooler', speed, flow: [0, -1, 0] });
        return;
      }
      const n = Math.max(1, config.gpu.fanCount || gpuCooler.fanCount);
      const span = g.length * 0.88;
      const size = Math.min(CARD_HEIGHT - 16, span / n - 8);
      for (let k = 0; k < n; k++) {
        const cx = g.length * 0.06 + span * (k + 0.5) / n;
        this.fan(group, 'gpu', `${label} fan ${k + 1}`, { x: cx, y: g.sinkBottom - FT / 2 + 4, z: zc, size, axis: 'y', mode: 'cooler', speed, flow: [0, -1, 0], reverse: k % 2 === 1 });
      }
    }

    buildCaseFans(state) {
      const config = state.config;
      const layer = this.layers.fans;
      const elements = new Map(state.air.elements.map((e) => [e.id, e]));
      const W = this.W;
      const inwardOf = { front: [-1, 0, 0], rear: [1, 0, 0], top: [0, 1, 0], bottom: [0, -1, 0] };
      for (const s of state.layout.slots) {
        if (!s.available) continue;
        const el = elements.get(s.id);
        const sc = AF.geometry.slotConfig(config, s.id);
        const name = `${AF.data.PANELS[s.panel].name} slot ${s.index + 1}`;
        let pos;
        let axis;
        let inward;
        if (s.axis === 'z') {
          pos = [s.cx, s.cy, W - FT / 2];
          axis = 'z';
          inward = [0, 0, -1];
        } else {
          const iw = inwardOf[s.panel];
          pos = [s.cx + iw[0] * FT / 2, s.cy + iw[1] * FT / 2, W / 2];
          axis = s.axis === 'x' ? 'x' : 'y';
          inward = iw;
        }
        const isFan = el && el.kind === 'fan';
        const mode = isFan ? (sc.mode === 'intake' ? 'intake' : 'exhaust') : 'vent';
        const flowsIn = el ? el.inflow > 0 : true;
        const flow = isFan ? (flowsIn ? inward : inward.map((v) => -v)) : null;
        this.fan(layer, `fan:${s.id}`, isFan ? `${name} · ${sc.mode} fan` : `${name} · open`, { x: pos[0], y: pos[1], z: pos[2], size: s.size, axis, mode, speed: sc.speed, flow });
      }
      const flows = { up: [0, -1, 0], down: [0, 1, 0], left: [-1, 0, 0], right: [1, 0, 0] };
      for (const cf of state.layout.customFans || []) {
        const axis = cf.dir === 'left' || cf.dir === 'right' ? 'x' : 'y';
        let z = W / 2;
        if (cf.mount.anchor === 'gpu') z = BOARD_Z + 2 + CARD_HEIGHT / 2;
        this.fan(layer, `fan:${cf.id}`, `${cf.label} · ${cf.where}`, { x: cf.x, y: cf.y, z, size: cf.size, axis, mode: cf.mode, speed: cf.speed, flow: flows[cf.dir] });
      }
    }

    buildHeatmap(group, state) {
      const sim = state.sim;
      if (!sim) return;
      this.heatCanvas = document.createElement('canvas');
      this.heatCanvas.width = sim.nx - 2;
      this.heatCanvas.height = sim.ny - 2;
      this.heatCtx = this.heatCanvas.getContext('2d');
      this.heatImage = this.heatCtx.createImageData(this.heatCanvas.width, this.heatCanvas.height);
      this.heatTexture = new THREE.CanvasTexture(this.heatCanvas);
      this.heatTexture.magFilter = THREE.LinearFilter;
      const w = this.heatCanvas.width * sim.dxMm;
      const h = this.heatCanvas.height * sim.dxMm;
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: this.heatTexture, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
      plane.position.copy(this.P(w / 2, h / 2, this.W / 2));
      group.add(plane);
      this.heatSim = sim;
      this.updateHeatmap(state);
    }

    updateHeatmap(state) {
      const sim = state.sim;
      if (!sim || sim !== this.heatSim || !this.heatImage) return;
      const img = this.heatImage.data;
      const LUT = AF.render.LUT;
      const range = this.app.renderer.range;
      const iw = this.heatCanvas.width;
      const ih = this.heatCanvas.height;
      const speed = state.view === 'speed';
      for (let j = 0; j < ih; j++) for (let i = 0; i < iw; i++) {
        const c = (i + 1) + (j + 1) * sim.nx;
        const o = (i + j * iw) * 4;
        if (sim.type[c] !== 0) { img[o + 3] = 0; continue; }
        const v = speed ? sim.speedAvg[c] / range.vMax : (sim.T[c] - range.tMin) / (range.tMax - range.tMin);
        const k = Math.max(0, Math.min(255, Math.round(v * 255))) * 3;
        img[o] = LUT[k];
        img[o + 1] = LUT[k + 1];
        img[o + 2] = LUT[k + 2];
        img[o + 3] = 150;
      }
      this.heatCtx.putImageData(this.heatImage, 0, 0);
      this.heatTexture.needsUpdate = true;
    }

    buildParticles(group, state) {
      const sim = state.sim;
      if (!sim) return;
      const n = sim.particleCount;
      this.particleZ = new Float32Array(n);
      for (let k = 0; k < n; k++) this.particleZ[k] = 18 + Math.random() * Math.max(10, this.W - 36);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 6), 3));
      this.particleLines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 }));
      this.particleLines.frustumCulled = false;
      group.add(this.particleLines);
      this.particleSim = sim;
    }

    updateParticles(state) {
      const sim = state.sim;
      if (!this.particleLines || sim !== this.particleSim) return;
      const pos = this.particleLines.geometry.attributes.position.array;
      const col = this.particleLines.geometry.attributes.color.array;
      const L = sim.trailLength;
      const k = sim.dxMm;
      const LUT = AF.render.LUT;
      const range = this.app.renderer.range;
      const D2 = this.D / 2;
      const H2 = this.H / 2;
      const W2 = this.W / 2;
      for (let n = 0; n < sim.particleCount; n++) {
        const base = n * L * 2;
        const hx = sim.trail[base];
        const hy = sim.trail[base + 1];
        const tx = sim.trail[base + 2 * (L - 3)];
        const ty = sim.trail[base + 2 * (L - 3) + 1];
        const jump = Math.abs(hx - tx) + Math.abs(hy - ty) > 8;
        const z = this.particleZ[n] - W2;
        const o = n * 6;
        pos[o] = (hx - 1) * k - D2;
        pos[o + 1] = H2 - (hy - 1) * k;
        pos[o + 2] = z;
        pos[o + 3] = jump ? pos[o] : (tx - 1) * k - D2;
        pos[o + 4] = jump ? pos[o + 1] : H2 - (ty - 1) * k;
        pos[o + 5] = z;
        const i = Math.min(sim.nx - 1, Math.max(0, hx | 0));
        const j = Math.min(sim.ny - 1, Math.max(0, hy | 0));
        const t = (sim.T[i + j * sim.nx] - range.tMin) / (range.tMax - range.tMin);
        const li = Math.max(0, Math.min(255, Math.round(t * 255))) * 3;
        const r = LUT[li] / 255;
        const g = LUT[li + 1] / 255;
        const b = LUT[li + 2] / 255;
        col[o] = r; col[o + 1] = g; col[o + 2] = b;
        col[o + 3] = r * 0.3; col[o + 4] = g * 0.3; col[o + 5] = b * 0.3;
      }
      this.particleLines.geometry.attributes.position.needsUpdate = true;
      this.particleLines.geometry.attributes.color.needsUpdate = true;
    }

    applyTransparency() {
      for (const mesh of this.pickables || []) {
        const mat = mesh.material;
        const base = mat.userData.baseOpacity != null ? mat.userData.baseOpacity : 1;
        const faded = this.transparent.has(mesh.userData.key);
        mat.opacity = faded ? Math.min(base, FADED_OPACITY) : base;
        mat.depthWrite = !faded && base > 0.6;
      }
    }

    setOption(key, value) {
      this.options[key] = value;
      if (this.layers && this.layers[key]) this.layers[key].visible = value;
    }

    resetTransparency() {
      this.transparent.clear();
      this.applyTransparency();
    }

    resetView() {
      const S = Math.max(this.D, this.H, this.W) * Math.max(1, 1.15 / (this.camera.aspect || 1));
      this.camera.position.set(S * 0.7, S * 0.48, S * 2.25);
      this.controls.target.set(0, 0, 0);
      this.controls.update();
    }

    resize() {
      const r = this.host.getBoundingClientRect();
      const w = Math.max(100, Math.round(r.width));
      const h = Math.max(100, Math.round(r.height));
      if (this.size !== `${w}x${h}`) {
        this.size = `${w}x${h}`;
        this.renderer.setSize(w, h, false);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
      }
    }

    update(state, dt) {
      if (!this.active || !this.supported) return;
      this.resize();
      this.controls.update();
      if (this.options.spin) for (const s of this.spinners) s.group.rotation.y += s.rate * dt;
      if (this.layers.particles) this.layers.particles.visible = this.options.particles && state.particles;
      if (this.options.particles && state.particles) this.updateParticles(state);
      if (this.options.heatmap && this.frame++ % 4 === 0) this.updateHeatmap(state);
      if (this.layers.heatmap) this.layers.heatmap.visible = this.options.heatmap && state.view !== 'none';
      this.renderer.render(this.scene, this.camera);
    }
  }

  AF.View3D = View3D;
  AF.View3D.LAYERS = LAYERS;
})(window);
