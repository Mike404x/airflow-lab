(function (root) {
  const AF = root.AF || (root.AF = {});

  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
    for (const child of children.flat()) {
      if (child == null || child === false) continue;
      el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return el;
  }

  function createFormatter(config) {
    const CFM = AF.data.UNITS.CFM_TO_M3S;
    const MM = AF.data.UNITS.MMH2O_TO_PA;
    const flowM3h = config.units.flow === 'm3h';
    const pressureMm = config.units.pressure === 'mmh2o';
    return {
      flowUnit: flowM3h ? 'm³/h' : 'CFM',
      pressureUnit: pressureMm ? 'mmH₂O' : 'Pa',
      flowValue: (q) => (flowM3h ? q * 3600 : q / CFM),
      pressureValue: (p) => (pressureMm ? p / MM : p),
      flow: (q) => (flowM3h ? `${(q * 3600).toFixed(0)} m³/h` : `${(q / CFM).toFixed(1)} CFM`),
      pressure: (p) => (pressureMm ? `${(p / MM).toFixed(3)} mmH₂O` : `${p.toFixed(2)} Pa`),
      temp: (t) => `${t.toFixed(1)} °C`,
    };
  }

  function select(options, value, onChange) {
    const el = h('select', { onchange: (e) => onChange(e.target.value) });
    for (const o of options) {
      const opt = h('option', { value: o.value }, o.label);
      if (String(o.value) === String(value)) opt.selected = true;
      el.append(opt);
    }
    return el;
  }

  function number(value, min, max, step, onChange) {
    return h('input', {
      type: 'number', value, min, max, step,
      onchange: (e) => {
        const v = parseFloat(e.target.value);
        if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
      },
    });
  }

  function text(value, onChange) {
    return h('input', { type: 'text', value, onchange: (e) => onChange(e.target.value) });
  }

  function checkbox(value, onChange, label) {
    const input = h('input', { type: 'checkbox', onchange: (e) => onChange(e.target.checked) });
    input.checked = !!value;
    return h('label', { class: 'check' }, input, label);
  }

  function slider(value, min, max, step, format, onInput) {
    const out = h('span', { class: 'slider-value' }, format(value));
    const input = h('input', {
      type: 'range', min, max, step, value,
      oninput: (e) => {
        const v = parseFloat(e.target.value);
        out.textContent = format(v);
        onInput(v);
      },
    });
    return h('div', { class: 'slider' }, input, out);
  }

  function field(label, control, hint) {
    return h('div', { class: 'field' }, h('label', { class: 'field-label' }, label), control, hint ? h('div', { class: 'hint' }, hint) : null);
  }

  function section(title, open, ...children) {
    const d = h('details', { class: 'section', open }, h('summary', {}, title), h('div', { class: 'section-body' }, ...children));
    return d;
  }

  function fanOptions(size) {
    return AF.data.FANS.filter((f) => f.size === size)
      .map((f) => ({ value: f.id, label: `${f.name} (${f.cfm} CFM, ${f.mmh2o} mmH₂O)` }))
      .concat([{ value: 'custom', label: 'Custom fan…' }]);
  }

  function customFanFields(custom, onChange) {
    const c = Object.assign({ cfm: 50, mmh2o: 2, rpm: 1500 }, custom || {});
    const set = (key) => (v) => onChange(Object.assign({}, c, { [key]: v }));
    return h('div', { class: 'grid3' },
      field('Max airflow (CFM)', number(c.cfm, 5, 300, 0.1, set('cfm'))),
      field('Static pressure (mmH₂O)', number(c.mmh2o, 0.2, 20, 0.01, set('mmh2o'))),
      field('Max RPM', number(c.rpm, 300, 6000, 10, set('rpm'))));
  }

  const pct = (v) => `${Math.round(v * 100)}%`;

  function buildConfigPanel(rootEl, app) {
    const config = app.state.config;
    const D = AF.data;
    const update = (fn) => app.update(fn);
    const live = (fn) => app.update(fn, { live: true });
    rootEl.replaceChildren();

    const c = config.case;
    const panelRows = Object.keys(D.PANELS).map((key) => h('tr', {},
      h('td', {}, D.PANELS[key].name),
      h('td', {}, select(Object.entries(D.PANEL_TYPES).map(([v, t]) => ({ value: v, label: t.name })), c.panels[key].type,
        (v) => update((cfg) => { cfg.case.panels[key].type = v; }))),
      h('td', {}, select(D.PANELS[key].sizes.map((s) => ({ value: s, label: `${s} mm` })), c.panels[key].fanSize,
        (v) => update((cfg) => {
          const size = +v;
          cfg.case.panels[key].fanSize = size;
          for (const [id, sc] of Object.entries(cfg.slots)) {
            if (!id.startsWith(`${key}-`) || sc.fan === 'custom') continue;
            const spec = D.FANS.find((f) => f.id === sc.fan);
            if (!spec || spec.size !== size) sc.fan = (D.FANS.find((f) => f.size === size) || D.FANS[0]).id;
          }
        })))));

    rootEl.append(section('Case', true,
      field('Name', text(c.name, (v) => update((cfg) => { cfg.case.name = v; }))),
      h('div', { class: 'grid3' },
        field('Height (mm)', number(c.height, 280, 700, 1, (v) => update((cfg) => { cfg.case.height = v; }))),
        field('Depth (mm)', number(c.depth, 280, 650, 1, (v) => update((cfg) => { cfg.case.depth = v; }))),
        field('Width (mm)', number(c.width, 150, 350, 1, (v) => update((cfg) => { cfg.case.width = v; })))),
      field('Motherboard', select(Object.entries(D.FORM_FACTORS).map(([v, f]) => ({ value: v, label: f.name })), c.formFactor,
        (v) => update((cfg) => { cfg.case.formFactor = v; }))),
      h('div', { class: 'row' },
        checkbox(c.shroud, (v) => update((cfg) => { cfg.case.shroud = v; }), 'PSU shroud'),
        checkbox(c.pcieVented, (v) => update((cfg) => { cfg.case.pcieVented = v; }), 'Vented PCIe slot covers')),
      field('Front fan mounts', select(
        Array.from({ length: AF.geometry.frontSlotCapacity(config) }, (_, k) => ({ value: k + 1, label: `${k + 1} × ${c.panels.front.fanSize} mm` })),
        Math.min(c.frontSlots == null ? 3 : c.frontSlots, AF.geometry.frontSlotCapacity(config)),
        (v) => update((cfg) => { cfg.case.frontSlots = +v; })),
        `Up to ${AF.geometry.frontSlotCapacity(config)} fit in a ${c.height} mm tall case. The shroud stops short of the front fans so the bottom fan feeds the main chamber.`),
      h('button', { class: 'btn small', onclick: () => app.fillFront() }, 'Fill all front mounts with intake fans'),
      h('table', { class: 'panel-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Panel'), h('th', {}, 'Type'), h('th', {}, 'Fan size'))), h('tbody', {}, panelRows)),
      h('div', { class: 'hint' }, 'Click a fan slot in the view to set its fan. Empty slots on open panels work as passive vents.')));

    const cpu = config.cpu;
    const cooler = D.CPU_COOLERS[cpu.cooler];
    const cpuChildren = [
      field('Processor', select(D.CPUS.map((p) => ({ value: p.id, label: p.name })), cpu.model, (v) => update((cfg) => {
        const p = D.CPUS.find((x) => x.id === v);
        Object.assign(cfg.cpu, { model: v, power: p.power, rjc: p.rjc, tjmax: p.tjmax });
      }))),
      h('div', { class: 'grid3' },
        field('Load power (W)', number(cpu.power, 5, 500, 1, (v) => update((cfg) => { cfg.cpu.power = v; }))),
        field('Tjmax (°C)', number(cpu.tjmax, 60, 115, 1, (v) => update((cfg) => { cfg.cpu.tjmax = v; }))),
        field('Die→IHS (°C/W)', number(cpu.rjc, 0.05, 1, 0.01, (v) => update((cfg) => { cfg.cpu.rjc = v; })))),
      field('Cooler', select(Object.entries(D.CPU_COOLERS).map(([v, k]) => ({ value: v, label: k.name })), cpu.cooler, (v) => update((cfg) => {
        cfg.cpu.cooler = v;
        const k = D.CPU_COOLERS[v];
        if (k.type === 'tower') {
          cfg.cpu.coolerFan = k.defaultFan;
          cfg.cpu.coolerFanCount = k.defaultFanCount;
        }
      }))),
    ];
    if (cooler.type === 'tower') {
      cpuChildren.push(
        field(`Cooler fan (${cooler.fanSize} mm)`, select(fanOptions(cooler.fanSize), cpu.coolerFan, (v) => update((cfg) => { cfg.cpu.coolerFan = v; }))),
        cpu.coolerFan === 'custom' ? customFanFields(cpu.coolerCustom, (v) => update((cfg) => { cfg.cpu.coolerCustom = Object.assign(v, { size: cooler.fanSize }); })) : null,
        field('Fans on cooler', select(Array.from({ length: cooler.maxFanCount }, (_, k) => ({ value: k + 1, label: k === 0 ? '1 fan' : `${k + 1} fans (series)` })), cpu.coolerFanCount,
          (v) => update((cfg) => { cfg.cpu.coolerFanCount = +v; }))));
    }
    if (cooler.type !== 'aio') {
      cpuChildren.push(field('Cooler fan speed', slider(cpu.coolerFanSpeed, 0, 1, 0.01, pct, (v) => live((cfg) => { cfg.cpu.coolerFanSpeed = v; }))));
    } else {
      const aio = cpu.aio;
      const radPanels = ['front', 'top', 'rear', 'bottom'].filter((p) => app.state.layout.slots.some((s) => s.panel === p && s.available) || p === aio.panel);
      const maxFans = aio.panel === 'rear' ? 1 : 3;
      const sizeLabel = (n) => `${n * c.panels[aio.panel].fanSize} mm (${n} × ${c.panels[aio.panel].fanSize})`;
      cpuChildren.push(
        h('div', { class: 'grid2' },
          field('Radiator location', select(radPanels.map((p) => ({ value: p, label: D.PANELS[p].name })), aio.panel,
            (v) => update((cfg) => { cfg.cpu.aio.panel = v; if (v === 'rear') cfg.cpu.aio.fans = 1; }))),
          field('Radiator size', select(Array.from({ length: maxFans }, (_, k) => ({ value: k + 1, label: sizeLabel(k + 1) })), Math.min(aio.fans, maxFans),
            (v) => update((cfg) => { cfg.cpu.aio.fans = +v; })))),
        h('div', { class: 'grid2' },
          field('Thickness', select(D.RADIATOR_THICKNESS.map((t) => ({ value: t, label: `${t} mm` })), aio.thickness, (v) => update((cfg) => { cfg.cpu.aio.thickness = +v; }))),
          field('Fans', checkbox(aio.pushPull, (v) => update((cfg) => { cfg.cpu.aio.pushPull = v; }), 'Push-pull'))),
        h('button', { class: 'btn small', onclick: () => app.fillRadiatorFans() }, 'Put fans on empty radiator slots'),
        h('div', { class: 'hint' }, 'Radiator fans are the slot fans of that panel. Set them to intake or exhaust in the view.'));
    }
    rootEl.append(section('CPU & cooler', true, ...cpuChildren));

    const gpu = config.gpu;
    const gpuCooler = D.GPU_COOLERS[gpu.cooler];
    rootEl.append(section('Graphics card', true,
      field('GPU', select(D.GPUS.map((g) => ({ value: g.id, label: g.name })), gpu.model, (v) => update((cfg) => {
        const g = D.GPUS.find((x) => x.id === v);
        Object.assign(cfg.gpu, { model: v, power: g.power, length: g.length, slots: g.slots, cooler: g.cooler, rjc: g.rjc, tmax: g.tmax, fanCount: D.GPU_COOLERS[g.cooler].fanCount });
      }))),
      h('div', { class: 'grid3' },
        field('Board power (W)', number(gpu.power, 10, 700, 1, (v) => update((cfg) => { cfg.gpu.power = v; }))),
        field('Length (mm)', number(gpu.length, 150, 420, 1, (v) => update((cfg) => { cfg.gpu.length = v; }))),
        field('Thickness', select([1, 2, 2.5, 3, 3.5, 4].map((s) => ({ value: s, label: `${s} slot` })), gpu.slots, (v) => update((cfg) => { cfg.gpu.slots = +v; })))),
      h('div', { class: 'grid2' },
        field('Cooler', select(Object.entries(D.GPU_COOLERS).map(([v, k]) => ({ value: v, label: k.name })), gpu.cooler,
          (v) => update((cfg) => { cfg.gpu.cooler = v; cfg.gpu.fanCount = D.GPU_COOLERS[v].fanCount; }))),
        gpuCooler.type === 'open'
          ? field('GPU fans', select([1, 2, 3].map((n) => ({ value: n, label: `${n} fan${n > 1 ? 's' : ''}` })), gpu.fanCount || gpuCooler.fanCount, (v) => update((cfg) => { cfg.gpu.fanCount = +v; })))
          : h('div')),
      field('GPU fan speed', slider(gpu.fanSpeed, 0, 1, 0.01, pct, (v) => live((cfg) => { cfg.gpu.fanSpeed = v; }))),
      h('div', { class: 'grid2' },
        field('Temp limit (°C)', number(gpu.tmax, 60, 110, 1, (v) => update((cfg) => { cfg.gpu.tmax = v; }))),
        field('Die resistance (°C/W)', number(gpu.rjc, 0.01, 0.5, 0.005, (v) => update((cfg) => { cfg.gpu.rjc = v; }))))));

    rootEl.append(section('Environment & units', true,
      h('div', { class: 'grid2' },
        field('Room temperature (°C)', number(config.ambient, 5, 45, 0.5, (v) => update((cfg) => { cfg.ambient = v; }))),
        field('Other heat (W)', number(config.otherHeat, 0, 300, 1, (v) => update((cfg) => { cfg.otherHeat = v; })), 'VRM, RAM, SSDs, chipset')),
      h('div', { class: 'grid2' },
        field('Airflow unit', select([{ value: 'cfm', label: 'CFM' }, { value: 'm3h', label: 'm³/h' }], config.units.flow, (v) => update((cfg) => { cfg.units.flow = v; }))),
        field('Pressure unit', select([{ value: 'pa', label: 'Pa' }, { value: 'mmh2o', label: 'mmH₂O' }], config.units.pressure, (v) => update((cfg) => { cfg.units.pressure = v; }))))));
  }

  function selectionElement(app) {
    const st = app.state;
    const id = st.selection;
    if (id === 'cpu-cooler') return st.air.coolers.cpu || null;
    if (id === 'gpu-cooler') return st.air.coolers.gpu || st.air.blower || null;
    return st.air.elements.find((e) => e.id === id) || null;
  }

  function buildEditor(rootEl, app) {
    const st = app.state;
    const D = AF.data;
    const config = st.config;
    const update = (fn) => app.update(fn);
    const live = (fn) => app.update(fn, { live: true });
    rootEl.replaceChildren();
    const id = st.selection;
    const body = h('div', { class: 'editor-body' });
    const dynamic = h('div', { class: 'editor-dynamic' });

    if (id === 'cpu-cooler') {
      const cooler = D.CPU_COOLERS[config.cpu.cooler];
      body.append(h('h3', {}, `CPU cooler · ${cooler.name}`));
      if (cooler.type === 'aio') {
        body.append(h('p', { class: 'hint' }, 'AIO radiator fans are the case fans on the radiator slots. Select them in the view to edit.'));
      } else {
        if (cooler.type === 'tower') {
          body.append(field('Fan model', select(fanOptions(cooler.fanSize), config.cpu.coolerFan, (v) => update((cfg) => { cfg.cpu.coolerFan = v; }))));
        }
        body.append(field('Fan speed', slider(config.cpu.coolerFanSpeed, 0, 1, 0.01, pct, (v) => live((cfg) => { cfg.cpu.coolerFanSpeed = v; }))));
      }
    } else if (id === 'gpu-cooler') {
      const cooler = D.GPU_COOLERS[config.gpu.cooler];
      body.append(h('h3', {}, `GPU cooler · ${cooler.name}`));
      body.append(field('Fan speed', slider(config.gpu.fanSpeed, 0, 1, 0.01, pct, (v) => live((cfg) => { cfg.gpu.fanSpeed = v; }))));
    } else {
      const slot = st.layout.slots.find((s) => s.id === id);
      if (!slot) {
        rootEl.append(h('div', { class: 'editor-empty' }, 'Click a fan slot, the CPU cooler or the GPU in the view to configure it.'));
        return;
      }
      const sc = AF.geometry.slotConfig(config, id);
      const panelName = D.PANELS[slot.panel].name;
      body.append(h('h3', {}, `${panelName} slot ${slot.index + 1} · ${slot.size} mm`, slot.radiator ? h('span', { class: 'badge' }, `radiator ${config.cpu.aio.thickness} mm`) : null));
      body.append(h('div', { class: 'hint' }, `${slot.panelType.name} panel`));
      if (!slot.available) {
        body.append(h('p', { class: 'warn-text' }, 'This panel is sealed. Change the panel type in Case settings to mount fans here.'));
        rootEl.append(body);
        return;
      }
      const setSlot = (patch, isLive) => (isLive ? live : update)((cfg) => {
        cfg.slots[id] = Object.assign(AF.geometry.slotConfig(cfg, id), patch);
      });
      const modes = h('div', { class: 'segmented' }, ...['empty', 'intake', 'exhaust'].map((m) => h('button', {
        class: `seg ${sc.mode === m ? 'active' : ''} ${m}`,
        onclick: () => setSlot({ mode: m }),
      }, m === 'empty' ? (slot.panelType.openRatio > 0 ? 'Open vent' : 'Empty') : m[0].toUpperCase() + m.slice(1))));
      body.append(modes);
      if (sc.mode !== 'empty') {
        const fanValue = sc.fan === 'custom' || D.FANS.some((f) => f.id === sc.fan && f.size === slot.size) ? sc.fan : (D.FANS.find((f) => f.size === slot.size) || {}).id;
        body.append(field('Fan model', select(fanOptions(slot.size), fanValue, (v) => setSlot({ fan: v }))));
        if (sc.fan === 'custom') body.append(customFanFields(sc.custom, (v) => setSlot({ custom: v })));
        const spec = AF.physics.fanSpecForSlot(sc, slot.size);
        body.append(field('Speed', slider(sc.speed, 0, 1, 0.01, (v) => `${pct(v)} · ${Math.round(spec.rpm * v)} rpm`, (v) => setSlot({ speed: v }, true))));
        body.append(field('Dust filter', select(Object.entries(D.FILTERS).map(([v, f]) => ({ value: v, label: f.name })), sc.filter, (v) => setSlot({ filter: v }))));
      }
      body.append(h('div', { class: 'row' },
        h('button', { class: 'btn small', onclick: () => app.applyToPanel(id) }, `Copy to all ${panelName.toLowerCase()} slots`)));
    }
    rootEl.append(body, dynamic);
    updateEditorDynamic(app);
  }

  function updateEditorDynamic(app) {
    const dynamic = document.querySelector('.editor-dynamic');
    if (!dynamic) return;
    dynamic.replaceChildren();
    const el = selectionElement(app);
    if (!el) return;
    const fmt = app.fmt;
    const rows = [];
    const isCooler = el.kind === 'cooler';
    const flow = el.kind === 'cooler' && el.count ? `${fmt.flow(el.q)} × ${el.count} = ${fmt.flow(el.q * el.count)}` : fmt.flow(Math.abs(el.q));
    rows.push(['Airflow', flow + (el.q < 0 ? ' (reversed)' : '')]);
    if (el.fans.length) {
      rows.push(['Free-air flow at this speed', fmt.flow(el.free)]);
      rows.push(['Efficiency vs free air', `${Math.round(el.q / Math.max(el.free, 1e-9) * 100)}%`]);
      rows.push(['Fan static pressure', fmt.pressure(el.developed)]);
    }
    if (!isCooler) rows.push(['Pressure from case', fmt.pressure(el.required)]);
    for (const imp of el.losses) rows.push([`Loss: ${imp.label}`, fmt.pressure(AF.physics.totalLoss({ losses: [imp] }, el.q))]);
    const exhaustT = app.state.simStats && app.state.simStats.exhaust[el.id];
    if (exhaustT != null) rows.push(['Exhaust air temperature (CFD)', fmt.temp(exhaustT)]);
    dynamic.append(h('table', { class: 'kv' }, h('tbody', {}, rows.map(([k, v]) => h('tr', {}, h('td', {}, k), h('td', {}, v))))));
    if (el.fans.length) {
      const canvas = h('canvas', { class: 'chart', width: 600, height: 340 });
      dynamic.append(h('div', { class: 'chart-title' }, 'Fan curve vs. system resistance'), canvas);
      drawChart(canvas, el, fmt);
    }
  }

  function drawChart(canvas, el, fmt) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const m = { l: 62, r: 16, t: 14, b: 44 };
    ctx.clearRect(0, 0, W, H);
    const fullEl = { fans: el.fans.map((f) => ({ fan: f.fan, speed: 1 })), losses: el.losses, required: el.required };
    const full = AF.physics.fanCurvePoints(fullEl, 80);
    const cur = AF.physics.fanCurvePoints(el, 80);
    const maxQ = Math.max(full.maxQ, Math.abs(el.q) * 1.1);
    const maxP = Math.max(full.pts[0].fan, el.developed, 1) * 1.15;
    const minP = Math.min(0, el.required || 0) * 1.15;
    const X = (q) => m.l + (q / maxQ) * (W - m.l - m.r);
    const Y = (p) => m.t + (1 - (p - minP) / (maxP - minP)) * (H - m.t - m.b);
    ctx.font = '20px Inter, Segoe UI, sans-serif';
    ctx.strokeStyle = '#263241';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#7d8ba0';
    for (let k = 0; k <= 4; k++) {
      const q = maxQ * k / 4;
      const p = minP + (maxP - minP) * k / 4;
      ctx.beginPath(); ctx.moveTo(X(q), m.t); ctx.lineTo(X(q), H - m.b); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(m.l, Y(p)); ctx.lineTo(W - m.r, Y(p)); ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillText(fmt.flowValue(q).toFixed(0), X(q), H - m.b + 22);
      ctx.textAlign = 'right';
      ctx.fillText(fmt.pressureValue(p).toFixed(fmt.pressureUnit === 'Pa' ? 0 : 2), m.l - 8, Y(p) + 6);
    }
    ctx.textAlign = 'center';
    ctx.fillText(`Airflow (${fmt.flowUnit})`, (W + m.l) / 2, H - 4);
    ctx.save();
    ctx.translate(16, (H - m.b + m.t) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`Pressure (${fmt.pressureUnit})`, 0, 0);
    ctx.restore();
    if (minP < 0) {
      ctx.strokeStyle = '#3d4b5d';
      ctx.beginPath(); ctx.moveTo(m.l, Y(0)); ctx.lineTo(W - m.r, Y(0)); ctx.stroke();
    }
    const line = (pts, key, color, dash, width) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(m.l, m.t, W - m.l - m.r, H - m.t - m.b);
      ctx.clip();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash(dash);
      ctx.beginPath();
      pts.forEach((p, k) => (k ? ctx.lineTo(X(p.q), Y(p[key])) : ctx.moveTo(X(p.q), Y(p[key]))));
      ctx.stroke();
      ctx.restore();
    };
    line(full.pts, 'fan', 'rgba(63,167,255,0.35)', [8, 6], 2);
    line(cur.pts, 'fan', '#3fa7ff', [], 3);
    const sys = [];
    for (let k = 0; k <= 80; k++) {
      const q = maxQ * k / 80;
      sys.push({ q, system: AF.physics.totalLoss(el, q) + (el.required || 0) });
    }
    line(sys, 'system', '#ffb547', [], 2.5);
    ctx.fillStyle = '#ffd54a';
    ctx.beginPath();
    ctx.arc(X(el.q), Y(el.developed), 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '19px Inter, Segoe UI, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#3fa7ff';
    ctx.fillText('fan @ speed', W - m.r - 6, m.t + 22);
    ctx.fillStyle = 'rgba(63,167,255,0.6)';
    ctx.fillText('fan @ 100%', W - m.r - 6, m.t + 46);
    ctx.fillStyle = '#ffb547';
    ctx.fillText('system (losses + case)', W - m.r - 6, m.t + 70);
  }

  function renderResults(rootEl, app) {
    const st = app.state;
    const fmt = app.fmt;
    const air = st.air;
    const mixed = st.mixed;
    const sim = st.simThermal;
    const stats = st.simStats;
    const P = AF.data.PHYSICS;
    rootEl.replaceChildren();

    const pressure = air.pressure;
    const state = pressure > P.neutralPressurePa ? 'Positive' : pressure < -P.neutralPressurePa ? 'Negative' : 'Neutral';
    const gaugePos = 50 + Math.max(-48, Math.min(48, Math.sign(pressure) * Math.log10(1 + Math.abs(pressure)) * 30));
    rootEl.append(h('div', { class: `card pressure ${state.toLowerCase()}` },
      h('div', { class: 'card-title' }, 'Case pressure'),
      h('div', { class: 'big' }, `${pressure >= 0 ? '+' : ''}${fmt.pressure(pressure)}`, h('span', { class: 'tag' }, state)),
      h('div', { class: 'gauge' }, h('div', { class: 'gauge-mark', style: `left:${gaugePos}%` })),
      h('div', { class: 'gauge-labels' }, h('span', {}, 'negative'), h('span', {}, 'neutral'), h('span', {}, 'positive'))));

    const flowRows = [
      ['Intake fans', fmt.flow(air.fanIn)],
      ['Exhaust fans', fmt.flow(air.fanOut)],
      ['Passive in (gaps/vents)', fmt.flow(air.passiveIn)],
      ['Passive out (gaps/vents)', fmt.flow(air.passiveOut)],
      ['Total throughput', fmt.flow(air.throughFlow)],
      ['Air changes', `${air.airChangesPerMinute.toFixed(0)} / min`],
    ];
    rootEl.append(h('div', { class: 'card' }, h('div', { class: 'card-title' }, 'Airflow balance'),
      h('table', { class: 'kv' }, h('tbody', {}, flowRows.map(([k, v]) => h('tr', {}, h('td', {}, k), h('td', {}, v)))))));

    const ready = stats && stats.ready;
    const progress = stats ? Math.round(stats.progress * 100) : 0;
    const simCol = (fn) => (sim && stats && stats.time > 0.5 ? fn(sim) : '…');
    const tRow = (label, a, b, hot) => h('tr', { class: hot ? 'hot' : '' }, h('td', {}, label), h('td', {}, a), h('td', {}, b));
    const cpuT = (t) => `${t.cpu.temp.toFixed(1)} °C${t.cpu.throttled ? ' ⚠' : ''}`;
    const gpuT = (t) => `${t.gpu.temp.toFixed(1)} °C${t.gpu.throttled ? ' ⚠' : ''}`;
    const cooler = AF.data.CPU_COOLERS[st.config.cpu.cooler];
    rootEl.append(h('div', { class: 'card' },
      h('div', { class: 'card-title' }, 'Temperatures', h('span', { class: `status ${ready ? 'ok' : ''}` }, ready ? 'CFD converged' : `CFD ${progress}%`)),
      h('table', { class: 'temps' },
        h('thead', {}, h('tr', {}, h('th', {}), h('th', {}, 'Well-mixed'), h('th', {}, 'CFD'))),
        h('tbody', {},
          tRow('Case air rise', `+${mixed.caseRise.toFixed(1)} °C`, simCol(() => `+${(stats.meanT - st.config.ambient).toFixed(1)} °C`)),
          tRow(cooler.type === 'aio' ? 'Radiator air in' : 'CPU cooler air in', fmt.temp(mixed.cpu.inlet), simCol((t) => fmt.temp(t.cpu.inlet))),
          tRow('CPU', cpuT(mixed), simCol(cpuT), (sim || mixed).cpu.throttled),
          tRow('CPU power', `${mixed.cpu.power.toFixed(0)} W`, simCol((t) => `${t.cpu.power.toFixed(0)} W`)),
          tRow('GPU air in', fmt.temp(mixed.gpu.inlet), simCol((t) => fmt.temp(t.gpu.inlet))),
          tRow('GPU', gpuT(mixed), simCol(gpuT), (sim || mixed).gpu.throttled),
          tRow('GPU power', `${mixed.gpu.power.toFixed(0)} W`, simCol((t) => `${t.gpu.power.toFixed(0)} W`)))),
      h('div', { class: 'hint' }, 'Well-mixed assumes uniform case air (conservative). The CFD column uses the local air temperature at each cooler inlet from the flow simulation.')));

    const fanRows = air.elements.filter((e) => e.kind !== 'vent' || Math.abs(e.q) > 1e-6).map((e) => {
      const mode = e.kind === 'vent' ? (e.inflow > 0 ? 'passive in' : 'passive out') : e.dir > 0 ? 'intake' : 'exhaust';
      const eff = e.fans.length ? `${Math.round(e.q / Math.max(e.free, 1e-9) * 100)}%` : '';
      return h('tr', { class: `clickable ${st.selection === e.id ? 'sel' : ''} ${e.stalled ? 'hot' : ''}`, onclick: () => app.select(e.id) },
        h('td', {}, e.label), h('td', { class: `mode ${mode.replace(' ', '-')}` }, mode), h('td', {}, fmt.flow(Math.abs(e.q))), h('td', {}, eff));
    });
    const coolerRows = [];
    if (air.coolers.cpu) coolerRows.push(h('tr', { class: 'clickable', onclick: () => app.select('cpu-cooler') }, h('td', {}, 'CPU cooler'), h('td', { class: 'mode internal' }, 'internal'), h('td', {}, fmt.flow(air.coolers.cpu.q)), h('td', {}, `${Math.round(air.coolers.cpu.q / air.coolers.cpu.free * 100)}%`)));
    if (air.coolers.gpu) coolerRows.push(h('tr', { class: 'clickable', onclick: () => app.select('gpu-cooler') }, h('td', {}, 'GPU fans'), h('td', { class: 'mode internal' }, 'internal'), h('td', {}, fmt.flow(air.coolers.gpu.total)), h('td', {}, `${Math.round(air.coolers.gpu.q / air.coolers.gpu.free * 100)}%`)));
    rootEl.append(h('div', { class: 'card' }, h('div', { class: 'card-title' }, 'Fans & openings'),
      h('table', { class: 'fans' }, h('thead', {}, h('tr', {}, h('th', {}, 'Where'), h('th', {}, 'Mode'), h('th', {}, 'Flow'), h('th', { title: 'Percentage of free-air flow' }, 'Eff.'))),
        h('tbody', {}, fanRows, coolerRows))));

    const order = { error: 0, warn: 1, info: 2, good: 3 };
    const notes = (st.notes || []).slice().sort((a, b) => order[a.level] - order[b.level]);
    rootEl.append(h('div', { class: 'card' }, h('div', { class: 'card-title' }, 'Analysis'),
      h('ul', { class: 'notes' }, notes.map((n) => h('li', { class: n.level }, n.text)))));
  }

  AF.ui = { h, createFormatter, buildConfigPanel, buildEditor, updateEditorDynamic, renderResults };
})(typeof window !== 'undefined' ? window : globalThis);
