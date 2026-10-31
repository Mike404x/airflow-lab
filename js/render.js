(function (root) {
  const AF = root.AF || (root.AF = {});

  const COLORS = {
    background: '#0d1117',
    caseFill: '#121a24',
    wall: '#8b9bb0',
    intake: '#3fa7ff',
    exhaust: '#ff6a55',
    empty: '#56657a',
    selected: '#ffd54a',
    component: '#c9d4e3',
    text: '#d8e1ee',
    dim: '#7d8ba0',
  };

  const TURBO_STOPS = [
    [0.0, [48, 18, 59]], [0.1, [65, 69, 171]], [0.2, [70, 117, 237]], [0.3, [57, 162, 252]],
    [0.4, [27, 207, 212]], [0.5, [36, 236, 166]], [0.6, [97, 252, 108]], [0.7, [164, 252, 59]],
    [0.8, [229, 216, 47]], [0.9, [254, 155, 45]], [1.0, [203, 42, 4]],
  ];

  const LUT = (() => {
    const lut = new Uint8ClampedArray(256 * 3);
    for (let k = 0; k < 256; k++) {
      const t = k / 255;
      let s = 0;
      while (s < TURBO_STOPS.length - 2 && t > TURBO_STOPS[s + 1][0]) s++;
      const [t0, c0] = TURBO_STOPS[s];
      const [t1, c1] = TURBO_STOPS[s + 1];
      const f = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
      for (let ch = 0; ch < 3; ch++) lut[k * 3 + ch] = c0[ch] + (c1[ch] - c0[ch]) * f;
    }
    return lut;
  })();

  function colorAt(t, alpha) {
    const k = Math.max(0, Math.min(255, Math.round(t * 255))) * 3;
    return `rgba(${LUT[k]},${LUT[k + 1]},${LUT[k + 2]},${alpha == null ? 1 : alpha})`;
  }

  function gradientCss() {
    const parts = [];
    for (let k = 0; k <= 10; k++) parts.push(`${colorAt(k / 10)} ${k * 10}%`);
    return `linear-gradient(90deg, ${parts.join(', ')})`;
  }

  class CaseRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.field = document.createElement('canvas');
      this.fieldCtx = this.field.getContext('2d');
      this.hitAreas = [];
      this.range = { tMin: 20, tMax: 50, vMax: 1 };
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(200, Math.round(rect.width * dpr));
      const h = Math.max(200, Math.round(rect.height * dpr));
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
      this.dpr = dpr;
    }

    computeTransform(config) {
      const W = this.canvas.width / this.dpr;
      const H = this.canvas.height / this.dpr;
      const m = { l: 86, r: 86, t: 74, b: 64 };
      const scale = Math.min((W - m.l - m.r) / config.case.depth, (H - m.t - m.b) / config.case.height);
      const ox = m.l + ((W - m.l - m.r) - config.case.depth * scale) / 2;
      const oy = m.t + ((H - m.t - m.b) - config.case.height * scale) / 2;
      this.t = { scale, ox, oy, W, H };
    }

    X(x) { return this.t.ox + x * this.t.scale; }
    Y(y) { return this.t.oy + y * this.t.scale; }
    S(v) { return v * this.t.scale; }

    toMm(px, py) {
      return { x: (px - this.t.ox) / this.t.scale, y: (py - this.t.oy) / this.t.scale };
    }

    updateRange(sim) {
      if (!sim) return;
      const temps = [];
      const speeds = [];
      const step = Math.max(1, Math.floor(sim.fluidCells.length / 2500));
      for (let n = 0; n < sim.fluidCells.length; n += step) {
        const c = sim.fluidCells[n];
        temps.push(sim.T[c]);
        speeds.push(sim.speedAvg[c]);
      }
      temps.sort((a, b) => a - b);
      speeds.sort((a, b) => a - b);
      const p98 = temps[Math.floor(temps.length * 0.98)] || sim.Tamb;
      const v98 = speeds[Math.floor(speeds.length * 0.98)] || 0.5;
      const span = Math.max(8, Math.ceil((p98 - sim.Tamb) / 5) * 5);
      this.range = { tMin: sim.Tamb, tMax: sim.Tamb + span, vMax: Math.max(0.3, Math.ceil(v98 * 10) / 10) };
    }

    drawField(state) {
      const sim = state.sim;
      if (!sim || state.view === 'none') return;
      const iw = sim.nx - 2;
      const ih = sim.ny - 2;
      if (this.field.width !== iw || this.field.height !== ih) {
        this.field.width = iw;
        this.field.height = ih;
        this.image = this.fieldCtx.createImageData(iw, ih);
      }
      const img = this.image.data;
      const { tMin, tMax, vMax } = this.range;
      const nx = sim.nx;
      for (let j = 0; j < ih; j++) for (let i = 0; i < iw; i++) {
        const c = (i + 1) + (j + 1) * nx;
        const o = (i + j * iw) * 4;
        if (sim.type[c] !== 0) { img[o + 3] = 0; continue; }
        const value = state.view === 'speed' ? sim.speedAvg[c] / vMax : (sim.T[c] - tMin) / (tMax - tMin);
        const k = Math.max(0, Math.min(255, Math.round(value * 255))) * 3;
        img[o] = LUT[k];
        img[o + 1] = LUT[k + 1];
        img[o + 2] = LUT[k + 2];
        img[o + 3] = 175;
      }
      this.fieldCtx.putImageData(this.image, 0, 0);
      const ctx = this.ctx;
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.field, this.X(0), this.Y(0), this.S(iw * sim.dxMm), this.S(ih * sim.dxMm));
      ctx.restore();
    }

    drawParticles(state) {
      const sim = state.sim;
      if (!sim || !state.particles) return;
      const ctx = this.ctx;
      const L = sim.trailLength;
      const k = sim.dxMm;
      const { tMin, tMax } = this.range;
      ctx.save();
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      for (let n = 0; n < sim.particleCount; n++) {
        const base = n * L * 2;
        const x0 = sim.trail[base];
        const y0 = sim.trail[base + 1];
        const x1 = sim.trail[base + (L - 1) * 2];
        const y1 = sim.trail[base + (L - 1) * 2 + 1];
        if (Math.abs(x0 - x1) + Math.abs(y0 - y1) > 12) continue;
        if (state.view === 'none') {
          const i = Math.min(sim.nx - 1, Math.max(0, x0 | 0));
          const j = Math.min(sim.ny - 1, Math.max(0, y0 | 0));
          ctx.strokeStyle = colorAt((sim.T[i + j * sim.nx] - tMin) / (tMax - tMin), 0.85);
        } else {
          ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        }
        ctx.beginPath();
        ctx.moveTo(this.X((x0 - 1) * k), this.Y((y0 - 1) * k));
        for (let s = 1; s < L; s++) ctx.lineTo(this.X((sim.trail[base + 2 * s] - 1) * k), this.Y((sim.trail[base + 2 * s + 1] - 1) * k));
        ctx.stroke();
      }
      ctx.restore();
    }

    drawCaseShell(state) {
      const ctx = this.ctx;
      const c = state.config.case;
      ctx.fillStyle = COLORS.caseFill;
      ctx.fillRect(this.X(0), this.Y(0), this.S(c.depth), this.S(c.height));
      ctx.font = '600 11px Inter, Segoe UI, sans-serif';
      ctx.fillStyle = COLORS.dim;
      ctx.textAlign = 'center';
      ctx.fillText('REAR', this.X(0) - 52, this.Y(c.height) + 30);
      ctx.fillText('FRONT', this.X(c.depth) + 52, this.Y(c.height) + 30);
    }

    panelStroke(type) {
      const ctx = this.ctx;
      ctx.lineWidth = 4;
      ctx.strokeStyle = COLORS.wall;
      if (type === 'mesh') ctx.setLineDash([2, 3]);
      else if (type === 'perforated') ctx.setLineDash([6, 4]);
      else if (type === 'restricted') ctx.setLineDash([22, 5]);
      else ctx.setLineDash([]);
    }

    drawWalls(state, fmtFlow) {
      const fmtFlowForWalls = (el) => (fmtFlow ? fmtFlow(Math.abs(el.q)) : '');
      const ctx = this.ctx;
      const c = state.config.case;
      const P = c.panels;
      const seg = (type, x0, y0, x1, y1) => {
        this.panelStroke(type);
        ctx.beginPath();
        ctx.moveTo(this.X(x0), this.Y(y0));
        ctx.lineTo(this.X(x1), this.Y(y1));
        ctx.stroke();
      };
      seg(P.top.type, 0, 0, c.depth, 0);
      const g = state.layout.grille;
      if (g) {
        const top = g.panel === 'top';
        const line = () => {
          ctx.beginPath();
          if (top) { ctx.moveTo(this.X(g.from), this.Y(0)); ctx.lineTo(this.X(g.to), this.Y(0)); } else { ctx.moveTo(this.X(0), this.Y(g.from)); ctx.lineTo(this.X(0), this.Y(g.to)); }
          ctx.stroke();
        };
        ctx.save();
        ctx.lineWidth = 6;
        ctx.strokeStyle = COLORS.background;
        line();
        ctx.strokeStyle = 'rgba(160,175,195,0.95)';
        ctx.setLineDash([2, 3]);
        line();
        ctx.restore();
        const el = state.air.elements.find((e) => e.id === 'grille');
        if (el && Math.abs(el.q) > 1e-5) {
          const mid = (g.from + g.to) / 2;
          const ix = top ? this.X(mid) : this.X(0) + 18;
          const iy = top ? this.Y(0) + 18 : this.Y(mid);
          const ox = top ? this.X(mid) : this.X(0) - 44;
          const oy = top ? this.Y(0) - 44 : this.Y(mid);
          if (el.inflow > 0) this.drawArrow(ox, oy, ix, iy, 'rgba(160,175,195,0.85)', 1.5);
          else this.drawArrow(ix, iy, ox, oy, 'rgba(160,175,195,0.85)', 1.5);
          ctx.font = '11px Inter, Segoe UI, sans-serif';
          ctx.fillStyle = COLORS.dim;
          ctx.textAlign = top ? 'center' : 'right';
          ctx.fillText(`grille ${fmtFlowForWalls(el)}`, top ? ox : ox - 4, top ? oy - 6 : oy + 16);
        }
      }
      seg(P.front.type, c.depth, 0, c.depth, c.height);
      seg(P.rear.type, 0, 0, 0, c.height);
      seg(c.shroud ? 'solid' : P.bottom.type, 0, c.height, c.depth, c.height);
      ctx.setLineDash([]);
    }

    drawComponents(state) {
      const ctx = this.ctx;
      const comps = state.layout.components;
      const config = state.config;
      const P = AF.data.PHYSICS;

      const m = comps.mobo;
      ctx.strokeStyle = 'rgba(120,150,190,0.45)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(this.X(m.x), this.Y(m.y), this.S(m.w), this.S(m.h));
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(120,150,190,0.6)';
      ctx.font = '10px Inter, Segoe UI, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`motherboard (${comps.board.width}×${comps.board.height})`, this.X(m.x) + 4, this.Y(m.y + m.h) - 4);
      for (const s of comps.pcieSlots) {
        ctx.fillStyle = s.primary ? 'rgba(255,213,74,0.75)' : 'rgba(120,150,190,0.45)';
        ctx.fillRect(this.X(m.x + 15), this.Y(s.y - 1), this.S(89), Math.max(2, this.S(2)));
        ctx.fillStyle = 'rgba(120,150,190,0.7)';
        ctx.textAlign = 'right';
        ctx.fillText(`${s.index}`, this.X(m.x + 12), this.Y(s.y) + 3);
        ctx.textAlign = 'left';
      }
      ctx.strokeStyle = 'rgba(255,213,74,0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.X(comps.socket.x - 20), this.Y(comps.socket.y - 20), this.S(40), this.S(40));

      if (comps.shroud) {
        const y = comps.shroud.y;
        const sw = comps.shroud.x1;
        ctx.fillStyle = '#1a222d';
        ctx.fillRect(this.X(0), this.Y(y), this.S(sw), this.S(config.case.height - y));
        const h = config.case.height - y;
        ctx.save();
        ctx.beginPath();
        ctx.rect(this.X(0), this.Y(y), this.S(sw), this.S(h));
        ctx.clip();
        ctx.strokeStyle = '#2a3442';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = -h; x < config.case.depth; x += 18) {
          ctx.moveTo(this.X(x), this.Y(config.case.height));
          ctx.lineTo(this.X(x + h), this.Y(y));
        }
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = COLORS.dim;
        ctx.textAlign = 'center';
        ctx.fillText('PSU shroud (isolated)', this.X(sw / 2), this.Y(y + (config.case.height - y) / 2) + 4);
      }

      const g = comps.gpu;
      const sel = state.selection === 'gpu-cooler';
      ctx.fillStyle = 'rgba(170,180,195,0.18)';
      ctx.fillRect(this.X(0), this.Y(g.sinkTop), this.S(g.length), this.S(g.sinkBottom - g.sinkTop));
      ctx.strokeStyle = sel ? COLORS.selected : 'rgba(200,210,225,0.7)';
      ctx.lineWidth = sel ? 2 : 1;
      ctx.strokeRect(this.X(0), this.Y(g.sinkTop), this.S(g.length), this.S(g.sinkBottom - g.sinkTop));
      ctx.strokeStyle = 'rgba(200,210,225,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 6; x < g.length; x += 6) {
        ctx.moveTo(this.X(x), this.Y(g.sinkTop + 2));
        ctx.lineTo(this.X(x), this.Y(g.sinkBottom - 6));
      }
      ctx.stroke();
      ctx.fillStyle = '#245c3a';
      ctx.fillRect(this.X(0), this.Y(g.pcbTop), this.S(g.pcbLength), this.S(g.pcbBottom - g.pcbTop));
      const gpuCooler = AF.catalog.gpuCooler(config);
      ctx.fillStyle = 'rgba(120,200,255,0.55)';
      if (gpuCooler.type === 'blower') {
        ctx.beginPath();
        ctx.ellipse(this.X(g.length - 50), this.Y(g.sinkBottom), this.S(32), this.S(5), 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const n = Math.max(1, config.gpu.fanCount || gpuCooler.fanCount);
        const span = g.length * 0.88;
        for (let k = 0; k < n; k++) {
          const cx = g.length * 0.06 + span * (k + 0.5) / n;
          ctx.beginPath();
          ctx.ellipse(this.X(cx), this.Y(g.sinkBottom), this.S(Math.min(46, span / n / 2 - 3)), this.S(5), 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      this.hitAreas.push({ id: 'gpu-cooler', kind: 'rect', x: 0, y: g.pcbTop, w: g.length, h: g.sinkBottom - g.pcbTop });

      const cc = comps.cpuCooler;
      const cooler = AF.catalog.cpuCooler(config);
      const cpuSel = state.selection === 'cpu-cooler';
      if (cooler.type === 'aio') {
        const s = comps.socket;
        ctx.fillStyle = 'rgba(170,180,195,0.35)';
        ctx.fillRect(this.X(s.x - 30), this.Y(s.y - 30), this.S(60), this.S(60));
        ctx.strokeStyle = cpuSel ? COLORS.selected : 'rgba(200,210,225,0.8)';
        ctx.lineWidth = cpuSel ? 2 : 1;
        ctx.strokeRect(this.X(s.x - 30), this.Y(s.y - 30), this.S(60), this.S(60));
        if (comps.radiator && comps.radiator.slots.length) {
          const r = comps.radiator.slots[Math.floor(comps.radiator.slots.length / 2)];
          ctx.strokeStyle = 'rgba(80,200,255,0.5)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(this.X(s.x), this.Y(s.y - 30));
          const tx = r.axis === 'x' ? r.cx + (r.panel === 'front' ? -60 : 60) : r.cx;
          const ty = r.axis === 'y' ? r.cy + (r.panel === 'top' ? 60 : -60) : r.cy;
          ctx.quadraticCurveTo(this.X((s.x + tx) / 2), this.Y(Math.min(s.y, ty) - 20), this.X(tx), this.Y(ty));
          ctx.stroke();
        }
        this.hitAreas.push({ id: 'cpu-cooler', kind: 'rect', x: s.x - 30, y: s.y - 30, w: 60, h: 60 });
      } else {
        ctx.fillStyle = 'rgba(170,180,195,0.22)';
        ctx.fillRect(this.X(cc.x), this.Y(cc.y), this.S(cc.w), this.S(cc.h));
        ctx.strokeStyle = cpuSel ? COLORS.selected : 'rgba(200,210,225,0.8)';
        ctx.lineWidth = cpuSel ? 2 : 1;
        ctx.strokeRect(this.X(cc.x), this.Y(cc.y), this.S(cc.w), this.S(cc.h));
        if (cooler.type === 'tower') {
          ctx.strokeStyle = 'rgba(200,210,225,0.25)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let y = cc.y + 4; y < cc.y + cc.h; y += 4) {
            ctx.moveTo(this.X(cc.x + 1), this.Y(y));
            ctx.lineTo(this.X(cc.x + cc.w - 1), this.Y(y));
          }
          ctx.stroke();
          const fans = Math.max(1, state.config.cpu.coolerFanCount || cooler.defaultFanCount);
          const positions = [cc.x + cc.w];
          if (fans >= 2) positions.push(cooler.depth > 80 ? cc.x + cc.w / 2 + 12 : cc.x);
          if (fans >= 3) positions.push(cc.x);
          ctx.fillStyle = 'rgba(120,200,255,0.55)';
          for (const fx of positions) ctx.fillRect(this.X(fx - 12), this.Y(cc.y + cc.h / 2 - cooler.fanSize / 2), this.S(24), this.S(cooler.fanSize));
        } else {
          ctx.fillStyle = 'rgba(120,200,255,0.55)';
          ctx.fillRect(this.X(cc.x + 6), this.Y(cc.y + cc.h / 2 - 3), this.S(cc.w - 12), this.S(6));
        }
        this.hitAreas.push({ id: 'cpu-cooler', kind: 'rect', x: cc.x - 14, y: cc.y, w: cc.w + 28, h: cc.h });
      }

      if (comps.radiator) {
        const thick = comps.radiator.thickness;
        ctx.fillStyle = 'rgba(80,200,255,0.18)';
        ctx.strokeStyle = 'rgba(80,200,255,0.65)';
        ctx.lineWidth = 1;
        for (const s of comps.radiator.slots) {
          const r = this.radiatorRect(s, thick, state.config);
          ctx.fillRect(this.X(r.x), this.Y(r.y), this.S(r.w), this.S(r.h));
          ctx.strokeRect(this.X(r.x), this.Y(r.y), this.S(r.w), this.S(r.h));
        }
      }
      ctx.lineWidth = 1;
    }

    radiatorRect(s, thick, config) {
      const ft = AF.data.PHYSICS.fanThickness;
      const half = s.size / 2;
      if (s.panel === 'front') return { x: config.case.depth - ft - thick, y: s.cy - half, w: thick, h: s.size };
      if (s.panel === 'rear') return { x: ft, y: s.cy - half, w: thick, h: s.size };
      if (s.panel === 'top') return { x: s.cx - half, y: ft, w: s.size, h: thick };
      return { x: s.cx - half, y: config.case.height - ft - thick, w: s.size, h: thick };
    }

    slotRect(s, config) {
      const ft = AF.data.PHYSICS.fanThickness;
      const half = s.size / 2;
      if (s.panel === 'front') return { x: config.case.depth - ft, y: s.cy - half, w: ft, h: s.size };
      if (s.panel === 'rear') return { x: 0, y: s.cy - half, w: ft, h: s.size };
      if (s.panel === 'top') return { x: s.cx - half, y: 0, w: s.size, h: ft };
      return { x: s.cx - half, y: config.case.height - ft, w: s.size, h: ft };
    }

    drawArrow(x0, y0, x1, y1, color, width) {
      const ctx = this.ctx;
      const a = Math.atan2(y1 - y0, x1 - x0);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1 - Math.cos(a) * 6, y1 - Math.sin(a) * 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - Math.cos(a - 0.45) * 11, y1 - Math.sin(a - 0.45) * 11);
      ctx.lineTo(x1 - Math.cos(a + 0.45) * 11, y1 - Math.sin(a + 0.45) * 11);
      ctx.closePath();
      ctx.fill();
    }

    drawSlots(state, fmtFlow) {
      const ctx = this.ctx;
      const config = state.config;
      const elements = new Map(state.air.elements.map((e) => [e.id, e]));
      for (const s of state.layout.slots) {
        const sc = AF.geometry.slotConfig(config, s.id);
        const el = elements.get(s.id);
        const selected = state.selection === s.id;
        const isFan = el && el.kind === 'fan';
        const flowsIn = el ? el.inflow > 0 : false;
        const color = !s.available ? '#333b47' : isFan ? (sc.mode === 'intake' ? COLORS.intake : COLORS.exhaust) : COLORS.empty;

        if (s.axis === 'z') {
          const cx = this.X(s.cx);
          const cy = this.Y(s.cy);
          const r = this.S(s.size / 2);
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fillStyle = isFan ? (sc.mode === 'intake' ? 'rgba(63,167,255,0.14)' : 'rgba(255,106,85,0.14)') : 'rgba(0,0,0,0)';
          ctx.fill();
          ctx.setLineDash(isFan ? [] : [4, 4]);
          ctx.strokeStyle = selected ? COLORS.selected : color;
          ctx.lineWidth = selected ? 2.5 : 1.5;
          ctx.stroke();
          ctx.setLineDash([]);
          if (el) {
            ctx.lineWidth = 2;
            ctx.strokeStyle = color;
            const k = r * 0.22;
            if (flowsIn) {
              ctx.beginPath();
              ctx.moveTo(cx - k, cy - k); ctx.lineTo(cx + k, cy + k);
              ctx.moveTo(cx + k, cy - k); ctx.lineTo(cx - k, cy + k);
              ctx.stroke();
            } else {
              ctx.beginPath();
              ctx.arc(cx, cy, k * 0.5, 0, Math.PI * 2);
              ctx.fillStyle = color;
              ctx.fill();
            }
            ctx.font = '600 11px Inter, Segoe UI, sans-serif';
            ctx.fillStyle = COLORS.text;
            ctx.textAlign = 'center';
            ctx.fillText(fmtFlow(Math.abs(el.q)), cx, cy + r * 0.62);
          }
          this.hitAreas.push({ id: s.id, kind: 'circle', x: s.cx, y: s.cy, r: s.size / 2 });
          continue;
        }

        const r = this.slotRect(s, config);
        ctx.fillStyle = isFan ? (sc.mode === 'intake' ? 'rgba(63,167,255,0.35)' : 'rgba(255,106,85,0.35)') : 'rgba(86,101,122,0.12)';
        ctx.fillRect(this.X(r.x), this.Y(r.y), this.S(r.w), this.S(r.h));
        ctx.setLineDash(isFan ? [] : [4, 3]);
        ctx.strokeStyle = selected ? COLORS.selected : color;
        ctx.lineWidth = selected ? 2.5 : 1.2;
        ctx.strokeRect(this.X(r.x), this.Y(r.y), this.S(r.w), this.S(r.h));
        ctx.setLineDash([]);
        if (isFan) {
          ctx.strokeStyle = 'rgba(255,255,255,0.25)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          const vertical = s.axis === 'x';
          for (let k = 1; k < 6; k++) {
            if (vertical) {
              const y = r.y + r.h * k / 6;
              ctx.moveTo(this.X(r.x + 3), this.Y(y - 6));
              ctx.lineTo(this.X(r.x + r.w - 3), this.Y(y + 6));
            } else {
              const x = r.x + r.w * k / 6;
              ctx.moveTo(this.X(x - 6), this.Y(r.y + 3));
              ctx.lineTo(this.X(x + 6), this.Y(r.y + r.h - 3));
            }
          }
          ctx.stroke();
        }

        if (el && Math.abs(el.q) > 1e-5) {
          const inward = { front: [-1, 0], rear: [1, 0], top: [0, 1], bottom: [0, -1] }[s.panel];
          const sign = el.inflow > 0 ? 1 : -1;
          const ox = this.X(s.cx) - inward[0] * 44;
          const oy = this.Y(s.cy) - inward[1] * 44;
          const ix = this.X(s.cx) + inward[0] * 18;
          const iy = this.Y(s.cy) + inward[1] * 18;
          const arrowColor = el.kind === 'vent' ? 'rgba(160,175,195,0.8)' : color;
          if (sign > 0) this.drawArrow(ox, oy, ix, iy, arrowColor, el.kind === 'vent' ? 1.5 : 3);
          else this.drawArrow(ix, iy, ox, oy, arrowColor, el.kind === 'vent' ? 1.5 : 3);
          ctx.font = `${el.kind === 'vent' ? '' : '600 '}11px Inter, Segoe UI, sans-serif`;
          ctx.fillStyle = el.kind === 'vent' ? COLORS.dim : COLORS.text;
          ctx.textAlign = s.panel === 'front' ? 'left' : s.panel === 'rear' ? 'right' : 'center';
          const lx = this.X(s.cx) - inward[0] * 50;
          const ly = this.Y(s.cy) - inward[1] * 50 + (s.axis === 'x' ? 16 : (s.panel === 'top' ? -4 : 12));
          ctx.fillText(fmtFlow(Math.abs(el.q)), lx, ly);
        }
        this.hitAreas.push({ id: s.id, kind: 'rect', x: r.x - 12, y: r.y, w: r.w + 24, h: r.h, panelRect: true, s });
      }
    }

    drawTags(state) {
      const ctx = this.ctx;
      const th = state.displayThermal;
      if (!th) return;
      const comps = state.layout.components;
      const tag = (x, y, text, hot) => {
        ctx.font = '600 11px Inter, Segoe UI, sans-serif';
        const w = ctx.measureText(text).width + 12;
        ctx.fillStyle = hot ? 'rgba(160,30,20,0.9)' : 'rgba(10,14,20,0.85)';
        ctx.strokeStyle = hot ? '#ff6a55' : 'rgba(200,210,225,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x - w / 2, y - 10, w, 20, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = COLORS.text;
        ctx.textAlign = 'center';
        ctx.fillText(text, x, y + 4);
      };
      const cc = comps.cpuCooler;
      tag(this.X(comps.socket.x), this.Y(cc.y) - 14, `CPU ${th.cpu.temp.toFixed(0)}°C · ${th.cpu.power.toFixed(0)} W`, th.cpu.throttled);
      const g = comps.gpu;
      tag(this.X(Math.min(g.length, state.config.case.depth) / 2), this.Y(g.sinkBottom) + 18, `GPU ${th.gpu.temp.toFixed(0)}°C · ${th.gpu.power.toFixed(0)} W`, th.gpu.throttled);
    }

    draw(state, fmtFlow) {
      this.resize();
      const ctx = this.ctx;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.computeTransform(state.config);
      this.hitAreas = [];
      ctx.fillStyle = COLORS.background;
      ctx.fillRect(0, 0, this.t.W, this.t.H);
      this.drawCaseShell(state);
      this.drawField(state);
      this.drawComponents(state);
      this.drawParticles(state);
      this.drawWalls(state, fmtFlow);
      this.drawSlots(state, fmtFlow);
      this.drawTags(state);
    }

    hitTest(px, py) {
      const p = this.toMm(px, py);
      for (let k = this.hitAreas.length - 1; k >= 0; k--) {
        const h = this.hitAreas[k];
        if (h.kind === 'circle' && (p.x - h.x) ** 2 + (p.y - h.y) ** 2 <= h.r * h.r) return h.id;
        if (h.kind === 'rect' && p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) return h.id;
      }
      return null;
    }
  }

  AF.render = { CaseRenderer, colorAt, gradientCss };

  if (typeof module === 'object' && module.exports) module.exports = AF;
})(typeof window !== 'undefined' ? window : globalThis);
