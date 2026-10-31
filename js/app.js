(function (root) {
  const AF = root.AF;
  const STORAGE_KEY = 'airflow-lab-config-v1';
  const THERMAL_REFRESH_MS = 500;
  const STEP_BUDGET_MS = 14;
  const PARTICLE_PLAYBACK = 0.6;

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function mergeDefaults(base, loaded) {
    if (Array.isArray(base) || typeof base !== 'object' || base === null) return loaded === undefined ? base : loaded;
    const out = {};
    for (const key of Object.keys(base)) out[key] = mergeDefaults(base[key], loaded ? loaded[key] : undefined);
    if (loaded && typeof loaded === 'object') {
      for (const key of Object.keys(loaded)) if (!(key in out)) out[key] = loaded[key];
    }
    return out;
  }

  function migrate(parsed) {
    if (parsed && parsed.case && parsed.case.motherboard && (parsed.version || 1) < 2) {
      const m = parsed.case.motherboard;
      const fresh = AF.data.motherboardConfig(m.model);
      m.slot1Y = fresh.slot1Y;
      m.socketY = fresh.socketY;
      parsed.version = 2;
    }
    if (parsed && parsed.case && !parsed.case.motherboard) {
      parsed.case.motherboard = AF.data.motherboardConfig(AF.data.LEGACY_FORM_FACTORS[parsed.case.formFactor] || 'atx-slot2');
      delete parsed.case.formFactor;
    }
    return parsed;
  }

  function loadConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = migrate(JSON.parse(raw));
        const merged = mergeDefaults(AF.data.baseConfig(), parsed);
        merged.slots = parsed.slots || {};
        return merged;
      }
    } catch (e) {
      console.warn('Could not load saved configuration', e);
    }
    return clone(AF.data.PRESETS[0].config);
  }

  const app = {
    state: {
      config: null,
      layout: null,
      air: null,
      mixed: null,
      simThermal: null,
      simStats: null,
      sim: null,
      notes: [],
      selection: 'front-0',
      panel: 'case',
      tab: 'inspect',
      view: 'temperature',
      particles: true,
      running: true,
      speed: 'max',
      displayThermal: null,
    },

    init() {
      this.dom = {
        config: document.getElementById('configPanel'),
        editor: document.getElementById('editor'),
        results: document.getElementById('results'),
        canvas: document.getElementById('caseCanvas'),
        tooltip: document.getElementById('tooltip'),
        status: document.getElementById('simStatus'),
        legend: document.getElementById('legend'),
        presets: document.getElementById('presetSelect'),
        kpis: document.getElementById('kpis'),
        insights: document.getElementById('insights'),
        insightsBadge: document.getElementById('insightsBadge'),
        toast: document.getElementById('toast'),
      };
      AF.ui.hydrateIcons(document);
      this.renderer = new AF.render.CaseRenderer(this.dom.canvas);
      this.state.config = loadConfig();
      for (const p of AF.data.PRESETS) this.dom.presets.append(AF.ui.h('option', { value: p.id }, p.name));
      this.bindToolbar();
      this.bindCanvas();
      this.recompute(true);
      this.lastFrame = performance.now();
      this.lastThermal = 0;
      this.stepCarry = 0;
      requestAnimationFrame((t) => this.frame(t));
    },

    bindToolbar() {
      document.getElementById('btnLoadPreset').addEventListener('click', () => {
        const p = AF.data.PRESETS.find((x) => x.id === this.dom.presets.value);
        if (!p) return;
        const units = this.state.config.units;
        this.state.config = clone(p.config);
        this.state.config.units = units;
        this.state.sim = null;
        this.state.selection = Object.keys(this.state.config.slots).find((id) => this.state.config.slots[id].mode !== 'empty') || 'cpu-cooler';
        this.recompute(true);
      });
      document.getElementById('btnReset').addEventListener('click', () => {
        if (!confirm('Reset to the default build?')) return;
        this.state.config = clone(AF.data.PRESETS[0].config);
        this.state.sim = null;
        this.recompute(true);
      });
      document.getElementById('btnExport').addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(this.state.config, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${(this.state.config.case.name || 'build').replace(/[^\w-]+/g, '_')}.airflow.json`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
      document.getElementById('fileImport').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const parsed = migrate(JSON.parse(await file.text()));
          const merged = mergeDefaults(AF.data.baseConfig(), parsed);
          merged.slots = parsed.slots || {};
          this.state.config = merged;
          this.state.sim = null;
          this.recompute(true);
        } catch (err) {
          alert(`Could not import file: ${err.message}`);
        }
        e.target.value = '';
      });
      document.querySelectorAll('[data-view]').forEach((btn) => btn.addEventListener('click', () => {
        this.state.view = btn.dataset.view;
        document.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('active', b === btn));
        this.updateLegend();
      }));
      const particles = document.getElementById('chkParticles');
      particles.addEventListener('click', () => {
        this.state.particles = !this.state.particles;
        particles.classList.toggle('active', this.state.particles);
      });
      const playBtn = document.getElementById('btnPlay');
      playBtn.addEventListener('click', () => {
        this.state.running = !this.state.running;
        playBtn.dataset.icon = this.state.running ? 'pause' : 'play';
        playBtn.title = this.state.running ? 'Pause simulation' : 'Resume simulation';
        AF.ui.hydrateIcons(playBtn.parentElement);
      });
      document.querySelectorAll('#rightTabs .tab').forEach((tab) => tab.addEventListener('click', () => this.showTab(tab.dataset.tab)));
      document.getElementById('btnAddFan').addEventListener('click', () => this.addCustomFan());
      document.getElementById('btnRestart').addEventListener('click', () => {
        this.state.sim = null;
        this.recompute(false);
      });
      document.getElementById('speedSelect').addEventListener('change', (e) => { this.state.speed = e.target.value; });
      window.addEventListener('resize', () => this.draw());
    },

    bindCanvas() {
      const canvas = this.dom.canvas;
      const local = (e) => {
        const r = canvas.getBoundingClientRect();
        return { px: e.clientX - r.left, py: e.clientY - r.top };
      };
      canvas.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        const { px, py } = local(e);
        const id = this.renderer.hitTest(px, py);
        this.pointer = { id, px, py, source: this.dragSourceFor(id) };
      });
      window.addEventListener('mousemove', (e) => {
        const ptr = this.pointer;
        if (!ptr || !ptr.source) return;
        const { px, py } = local(e);
        if (!this.state.drag && Math.hypot(px - ptr.px, py - ptr.py) < 5) return;
        const p = this.renderer.toMm(px, py);
        const snap = AF.geometry.snapCustomFan(this.state.config, this.state.layout, p.x, p.y, ptr.source.size, ptr.source.cf);
        this.state.drag = { sourceId: ptr.source.id, moved: true, snap, size: ptr.source.size };
        this.dom.tooltip.style.display = 'none';
        canvas.style.cursor = 'grabbing';
      });
      window.addEventListener('mouseup', () => {
        const ptr = this.pointer;
        this.pointer = null;
        if (!ptr) return;
        const drag = this.state.drag;
        this.state.drag = null;
        if (drag && drag.moved) {
          this.dropFan(ptr.source, drag.snap);
          return;
        }
        if (ptr.id) this.select(ptr.id);
      });
      window.addEventListener('keydown', (e) => {
        if (/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement && document.activeElement.tagName)) return;
        const id = this.state.selection;
        if (!id || !id.startsWith('cf-')) return;
        if (e.key === 'r' || e.key === 'R') { this.rotateCustomFan(id); e.preventDefault(); }
        if (e.key === 'Delete' || e.key === 'Backspace') { this.removeCustomFan(id); e.preventDefault(); }
      });
      canvas.addEventListener('mousemove', (e) => {
        if (this.state.drag) return;
        const { px, py } = local(e);
        const r = canvas.getBoundingClientRect();
        const html = this.tooltipFor(px, py);
        const tip = this.dom.tooltip;
        if (!html) { tip.style.display = 'none'; canvas.style.cursor = 'default'; return; }
        tip.innerHTML = html;
        tip.style.display = 'block';
        tip.style.left = `${Math.min(px + 14, r.width - tip.offsetWidth - 4)}px`;
        tip.style.top = `${Math.min(py + 14, r.height - tip.offsetHeight - 4)}px`;
        const hoverId = this.renderer.hitTest(px, py);
        canvas.style.cursor = this.dragSourceFor(hoverId) ? 'grab' : hoverId ? 'pointer' : 'crosshair';
      });
      canvas.addEventListener('mouseleave', () => { this.dom.tooltip.style.display = 'none'; });
    },

    tooltipFor(px, py) {
      const st = this.state;
      const fmt = this.fmt;
      const id = this.renderer.hitTest(px, py);
      if (id) {
        if (id === 'cpu-cooler') return `<b>CPU cooler</b><br>${AF.catalog.cpuCooler(st.config).name}<br>Click to edit`;
        if (id === 'gpu-cooler') {
          const g = AF.catalog.byId(AF.catalog.GPUS, st.config.gpu.model);
          return `<b>${g ? g.name : 'GPU'}</b><br>${AF.catalog.gpuCooler(st.config).name}<br>Click to edit`;
        }
        if (id.startsWith('cf-')) {
          const cf = st.layout.customFans.find((f) => f.id === id);
          const el = st.air.elements.find((e) => e.id === id) || (st.air.internal || []).find((e) => e.id === id);
          if (!cf) return null;
          return `<b>${cf.label}</b> · ${cf.size} mm<br>${cf.where} · ${cf.mode}${el ? `: ${fmt.flow(Math.abs(el.q))}` : ''}<br>Drag to move · R rotate · Del remove`;
        }
        const el = st.air.elements.find((e) => e.id === id);
        const slot = st.layout.slots.find((s) => s.id === id);
        if (!slot) return null;
        const sc = AF.geometry.slotConfig(st.config, id);
        const head = `<b>${AF.data.PANELS[slot.panel].name} ${slot.index + 1}</b> · ${slot.size} mm`;
        if (!el) return `${head}<br>${slot.available ? 'Sealed slot' : 'Panel is sealed'}<br>Click to edit`;
        if (el.kind === 'vent') return `${head}<br>Open vent: ${fmt.flow(Math.abs(el.q))} ${el.inflow > 0 ? 'in' : 'out'}<br>Click to add a fan`;
        return `${head}<br>${sc.mode}: ${fmt.flow(Math.abs(el.q))} (${Math.round(el.q / el.free * 100)}% of free air)<br>Click to edit · drag to move`;
      }
      const sim = st.sim;
      if (!sim) return null;
      const p = this.renderer.toMm(px, py);
      if (p.x < 0 || p.y < 0 || p.x > st.config.case.depth || p.y > st.config.case.height) return null;
      const i = Math.min(sim.nx - 2, Math.max(1, 1 + Math.floor(p.x / sim.dxMm)));
      const j = Math.min(sim.ny - 2, Math.max(1, 1 + Math.floor(p.y / sim.dxMm)));
      const c = i + j * sim.nx;
      if (sim.type[c] !== 0) return null;
      const [u, v] = sim.velocityAt(i + 0.5, j + 0.5);
      return `Air ${sim.T[c].toFixed(1)} °C<br>Speed ${Math.hypot(u, v).toFixed(2)} m/s (avg ${sim.speedAvg[c].toFixed(2)})`;
    },

    select(id) {
      this.state.selection = id;
      AF.ui.buildEditor(this.dom.editor, this);
      this.renderPanels();
      this.showTab('inspect');
    },

    showTab(name) {
      this.state.tab = name;
      document.querySelectorAll('#rightTabs .tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
      document.querySelectorAll('.inspector .tab-body').forEach((b) => b.classList.toggle('active', b.dataset.panel === name));
    },

    renderPanels() {
      AF.ui.renderKpis(this.dom.kpis, this);
      AF.ui.renderResults(this.dom.results, this);
      AF.ui.renderInsights(this.dom.insights, this.dom.insightsBadge, this);
    },

    update(mutator, opts) {
      mutator(this.state.config);
      this.recompute(!(opts && opts.live));
    },

    dragSourceFor(id) {
      if (!id) return null;
      const cfg = this.state.config;
      if (id.startsWith('cf-')) {
        const cf = (cfg.customFans || []).find((f) => f.id === id);
        return cf ? { kind: 'custom', id, size: cf.size, cf } : null;
      }
      const slot = this.state.layout.slots.find((s) => s.id === id);
      if (!slot || slot.axis === 'z' || !slot.available) return null;
      const sc = AF.geometry.slotConfig(cfg, id);
      return sc.mode === 'empty' ? null : { kind: 'slot', id, size: slot.size, slotCfg: sc };
    },

    nextCustomFanId() {
      const ids = (this.state.config.customFans || []).map((f) => +String(f.id).slice(3) || 0);
      return `cf-${Math.max(0, ...ids) + 1}`;
    },

    toast(text, tone) {
      const el = this.dom.toast;
      el.textContent = text;
      el.className = `toast glass show ${tone || ''}`;
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => { el.className = 'toast glass'; }, 3200);
    },

    dropFan(source, snap) {
      if (snap.blocked) {
        this.toast(snap.label.split(' · ').slice(-1)[0].replace(/^./, (c) => c.toUpperCase()), 'bad');
        return;
      }
      const cfg = this.state.config;
      cfg.customFans = cfg.customFans || [];
      const G = AF.geometry;
      const fanOf = (src) => (src.kind === 'slot'
        ? { fan: src.slotCfg.fan, speed: src.slotCfg.speed, filter: src.slotCfg.filter, custom: src.slotCfg.custom, mode: src.slotCfg.mode }
        : { fan: src.cf.fan, speed: src.cf.speed, filter: src.cf.filter, custom: src.cf.custom, mode: null });
      const moving = fanOf(source);
      if (snap.kind === 'slot') {
        if (source.kind === 'slot' && source.id === snap.slotId) return;
        const slot = this.state.layout.slots.find((s) => s.id === snap.slotId);
        const target = G.slotConfig(cfg, snap.slotId);
        const defaultMode = slot.panel === 'front' || slot.panel === 'bottom' ? 'intake' : 'exhaust';
        const samePanel = source.kind === 'slot' && source.id.split('-')[0] === slot.panel;
        cfg.slots[snap.slotId] = { mode: samePanel ? moving.mode : defaultMode, fan: moving.fan, speed: moving.speed, filter: moving.filter || 'none', custom: moving.custom };
        if (source.kind === 'slot') {
          cfg.slots[source.id] = target.mode !== 'empty' ? target : { mode: 'empty' };
        } else {
          const idx = cfg.customFans.findIndex((f) => f.id === source.id);
          if (target.mode !== 'empty') Object.assign(cfg.customFans[idx], { fan: target.fan, speed: target.speed, filter: target.filter, custom: target.custom });
          else cfg.customFans.splice(idx, 1);
        }
        this.state.selection = snap.slotId;
      } else {
        let dir = snap.dir;
        const sourcePanel = source.kind === 'slot' ? source.id.split('-')[0] : null;
        if (snap.mount.type === 'wall' && moving.mode && sourcePanel === snap.mount.panel) dir = moving.mode === 'intake' ? G.INWARD[snap.mount.panel] : G.OPPOSITE[G.INWARD[snap.mount.panel]];
        const placed = { x: snap.x, y: snap.y, dir, mount: snap.mount };
        if (source.kind === 'custom') {
          Object.assign(cfg.customFans.find((f) => f.id === source.id), placed);
          this.state.selection = source.id;
        } else {
          const id = this.nextCustomFanId();
          cfg.customFans.push(Object.assign({ id, size: source.size, fan: moving.fan, speed: moving.speed, filter: moving.filter || 'none', custom: moving.custom }, placed));
          cfg.slots[source.id] = { mode: 'empty' };
          this.state.selection = id;
        }
      }
      this.recompute(true);
      this.showTab('inspect');
    },

    addCustomFan() {
      const cfg = this.state.config;
      cfg.customFans = cfg.customFans || [];
      const g = this.state.layout.components.gpu;
      const snap = AF.geometry.snapCustomFan(cfg, this.state.layout, Math.min(g.length, cfg.case.depth) * 0.6, g.sinkBottom + 50, 120, null);
      const id = this.nextCustomFanId();
      cfg.customFans.push({ id, size: 120, fan: 'arctic-p12', speed: 0.7, filter: 'none', x: snap.x, y: snap.y, dir: snap.dir, mount: snap.mount });
      this.state.selection = id;
      this.recompute(true);
      this.showTab('inspect');
    },

    rotateCustomFan(id) {
      const cf = (this.state.config.customFans || []).find((f) => f.id === id);
      if (!cf) return;
      if (cf.mount && cf.mount.type === 'wall') cf.dir = AF.geometry.OPPOSITE[cf.dir];
      else {
        const order = ['up', 'right', 'down', 'left'];
        cf.dir = order[(order.indexOf(cf.dir) + 1) % 4];
        cf.mount = { type: 'internal' };
      }
      this.recompute(true);
    },

    removeCustomFan(id) {
      const cfg = this.state.config;
      cfg.customFans = (cfg.customFans || []).filter((f) => f.id !== id);
      this.state.selection = null;
      this.recompute(true);
    },

    applyToPanel(id) {
      const slot = this.state.layout.slots.find((s) => s.id === id);
      if (!slot) return;
      const source = AF.geometry.slotConfig(this.state.config, id);
      for (const s of this.state.layout.slots) {
        if (s.panel === slot.panel && s.available) this.state.config.slots[s.id] = clone(source);
      }
      this.recompute(true);
    },

    fillFront() {
      const cfg = this.state.config;
      const front = this.state.layout.slots.filter((s) => s.panel === 'front' && s.available);
      if (!front.length) return;
      const existing = front.map((s) => AF.geometry.slotConfig(cfg, s.id)).find((sc) => sc.mode !== 'empty');
      const size = cfg.case.panels.front.fanSize;
      const template = existing
        ? Object.assign({}, existing, { mode: 'intake' })
        : { mode: 'intake', fan: (AF.data.FANS.find((f) => f.size === size) || AF.data.FANS[0]).id, speed: 0.7, filter: 'nylon' };
      for (const s of front) {
        if (AF.geometry.slotConfig(cfg, s.id).mode === 'empty') cfg.slots[s.id] = clone(template);
      }
      this.recompute(true);
    },

    fillRadiatorFans() {
      const comps = this.state.layout.components;
      if (!comps.radiator) return;
      const panel = this.state.config.cpu.aio.panel;
      const size = this.state.config.case.panels[panel].fanSize;
      const fan = (AF.data.FANS.find((f) => f.size === size && f.mmh2o >= 2.2) || AF.data.FANS.find((f) => f.size === size)).id;
      const mode = panel === 'front' || panel === 'bottom' ? 'intake' : 'exhaust';
      for (const s of comps.radiator.slots) {
        const sc = AF.geometry.slotConfig(this.state.config, s.id);
        if (sc.mode === 'empty') this.state.config.slots[s.id] = { mode, fan, speed: 0.7, filter: mode === 'intake' ? 'nylon' : 'none' };
      }
      this.recompute(true);
    },

    recompute(rebuildPanels) {
      const st = this.state;
      st.layout = AF.geometry.layout(st.config);
      st.air = AF.physics.solveAirflow(st.config, st.layout);
      st.mixed = AF.physics.solveThermal(st.config, st.layout, st.air, null);
      const heatSource = st.simThermal && st.sim ? st.simThermal : st.mixed;
      st.sim = new AF.CaseSim(st.config, st.layout, st.air, heatSource, st.sim);
      if (st.sim.time < 0.5) st.simThermal = null;
      st.simStats = st.sim.stats();
      this.fmt = AF.ui.createFormatter(st.config);
      this.refreshThermal();
      const customSelected = st.selection && st.selection.startsWith('cf-') && st.layout.customFans.some((f) => f.id === st.selection);
      if (!customSelected && !st.layout.slots.some((s) => s.id === st.selection) && st.selection !== 'cpu-cooler' && st.selection !== 'gpu-cooler') {
        st.selection = st.layout.slots.length ? st.layout.slots[0].id : null;
      }
      if (rebuildPanels) {
        AF.ui.buildConfigPanel(this.dom.config, this);
        AF.ui.buildEditor(this.dom.editor, this);
      } else {
        AF.ui.updateEditorDynamic(this);
      }
      this.renderPanels();
      this.updateLegend();
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(st.config)); } catch (e) { console.warn(e); }
    },

    refreshThermal() {
      const st = this.state;
      const sim = st.sim;
      st.simStats = sim.stats();
      if (st.simStats.time > 0.5) {
        st.simThermal = AF.physics.solveThermal(st.config, st.layout, st.air, st.simStats.inlets);
        sim.setHeat(st.simThermal);
      }
      st.displayThermal = st.simStats.ready && st.simThermal ? st.simThermal : st.mixed;
      st.notes = AF.physics.analyze(st.config, st.layout, st.air, st.displayThermal, st.simStats);
      this.renderer.updateRange(sim);
    },

    updateLegend() {
      const st = this.state;
      const r = this.renderer.range;
      const legend = this.dom.legend;
      const bar = `<div class="legend-bar" style="background:${AF.render.gradientCss()}"></div>`;
      const intake = '<span class="key intake"></span>intake <span class="key exhaust"></span>exhaust <span class="key vent"></span>open vent / empty';
      if (st.view === 'speed') {
        legend.innerHTML = `<div class="legend-scale"><span>0 m/s</span>${bar}<span>${r.vMax.toFixed(1)} m/s</span></div><div class="legend-keys">${intake}</div>`;
      } else {
        legend.innerHTML = `<div class="legend-scale"><span>${r.tMin.toFixed(0)} °C</span>${bar}<span>${r.tMax.toFixed(0)} °C</span></div><div class="legend-keys">${intake}</div>`;
      }
    },

    draw() {
      this.renderer.draw(this.state, this.fmt.flow);
    },

    frame(now) {
      const st = this.state;
      const realDt = Math.min(0.05, (now - this.lastFrame) / 1000);
      this.lastFrame = now;
      const sim = st.sim;
      if (st.running && sim) {
        const start = performance.now();
        if (st.speed === 'max') {
          do sim.step(); while (performance.now() - start < STEP_BUDGET_MS);
        } else {
          this.stepCarry += (parseFloat(st.speed) * realDt) / sim.dt;
          while (this.stepCarry >= 1 && performance.now() - start < STEP_BUDGET_MS) { sim.step(); this.stepCarry -= 1; }
          this.stepCarry = Math.min(this.stepCarry, 4);
        }
        sim.advectParticles(realDt, PARTICLE_PLAYBACK);
        if (now - this.lastThermal > THERMAL_REFRESH_MS) {
          this.lastThermal = now;
          if (sim.spawnAge === undefined || sim.time - sim.spawnAge > 1) { sim.rebuildSpawns(); sim.spawnAge = sim.time; }
          this.refreshThermal();
          this.renderPanels();
          AF.ui.updateEditorDynamic(this);
          this.updateLegend();
        }
      }
      const stats = st.simStats;
      if (sim && stats) {
        const statusKey = `${st.running}|${stats.ready}|${Math.round(stats.progress * 100)}|${sim.time.toFixed(1)}`;
        if (statusKey !== this.lastStatus) {
          this.lastStatus = statusKey;
          const state = !st.running ? 'paused' : stats.ready ? 'ok' : '';
          const label = !st.running ? 'Paused' : stats.ready ? 'Steady state' : `Converging ${Math.round(stats.progress * 100)}%`;
          this.dom.status.innerHTML = `<span class="live ${state}"></span>${label} · t = ${sim.time.toFixed(1)} s · ${sim.nx - 2}×${sim.ny - 2} grid`;
        }
      }
      this.draw();
      requestAnimationFrame((t) => this.frame(t));
    },
  };

  root.airflowApp = app;
  window.addEventListener('DOMContentLoaded', () => app.init());
})(window);
