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

  const ICON_PATHS = {
    case: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><circle cx="12" cy="9.5" r="3"/><path d="M9 17h6"/>',
    board: '<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7.5" y="7" width="6" height="6" rx="1"/><path d="M7 17h10M17 7v4"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx=".5"/><path d="M9 2.5v3M15 2.5v3M9 18.5v3M15 18.5v3M2.5 9h3M2.5 15h3M18.5 9h3M18.5 15h3"/>',
    fan: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.6"/><path d="M12 10.4c0-2.4.9-4.4 2.6-4.4 1.8 0 1.6 2.9-.3 4.8M13.6 12c2.4 0 4.4.9 4.4 2.6 0 1.8-2.9 1.6-4.8-.3M12 13.6c0 2.4-.9 4.4-2.6 4.4-1.8 0-1.6-2.9.3-4.8M10.4 12c-2.4 0-4.4-.9-4.4-2.6 0-1.8 2.9-1.6 4.8.3"/>',
    gpu: '<rect x="2" y="6" width="20" height="11" rx="2"/><circle cx="8" cy="11.5" r="2.6"/><circle cx="16" cy="11.5" r="2.6"/><path d="M5 17v2.5M9 17v2.5"/>',
    sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    download: '<path d="M12 3.5v11M7.5 10.5 12 15l4.5-4.5M5 20h14"/>',
    upload: '<path d="M12 20V9M7.5 13 12 8.5l4.5 4.5M5 4h14"/>',
    reset: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5M3.5 3.5v5h5"/>',
    restart: '<path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1l2.6 2.6M20.5 3.5v5h-5"/>',
    pause: '<path d="M8.5 5v14M15.5 5v14"/>',
    play: '<path d="M7.5 5v14l11-7z"/>',
    sparkle: '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 16v4M17 18h4"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>',
    chart: '<path d="M4 4v16h16"/><path d="m8 14 3.5-3.5 3 3L19 9"/>',
    bulb: '<path d="M9.5 18h5M10.5 21h3M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.1v.1h5v-.1c0-.8.4-1.6 1.1-2.1A6 6 0 0 0 12 3z"/>',
    alert: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5.5M12 16.4v.1"/>',
    warn: '<path d="M10.3 4.2 2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4M12 16.9v.1"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.1"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    thermo: '<path d="M14 14.6V5a2 2 0 0 0-4 0v9.6a4 4 0 1 0 4 0z"/><path d="M12 15v-4"/>',
    wind: '<path d="M3 8h10.5a2.75 2.75 0 1 0-2.75-2.75M3 12h15.5a2.75 2.75 0 1 1-2.75 2.75M3 16h7"/>',
    gauge: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="m12 18 3.5-5.5"/>',
    left: '<path d="m15 6-6 6 6 6"/>',
    right: '<path d="m9 6 6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    bolt: '<path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    up: '<path d="m6 15 6-6 6 6"/>',
    waves: '<path d="M3 7.5c2.5-2.6 5.5-2.6 8 0s5.5 2.6 8 0M3 12.5c2.5-2.6 5.5-2.6 8 0s5.5 2.6 8 0M3 17.5c2.5-2.6 5.5-2.6 8 0s5.5 2.6 8 0"/>',
    layers: '<path d="m12 3.5 8.5 4.5-8.5 4.5L3.5 8z"/><path d="m3.5 12 8.5 4.5 8.5-4.5"/><path d="m3.5 16 8.5 4.5 8.5-4.5"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    rotate: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    vent: '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M7 8h10M7 12h10M7 16h10"/>',
  };

  function iconSvg(name) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name] || ''}</svg>`;
  }

  function icon(name) {
    const span = document.createElement('span');
    span.style.display = 'contents';
    span.innerHTML = iconSvg(name);
    return span;
  }

  function hydrateIcons(rootEl) {
    for (const el of rootEl.querySelectorAll('[data-icon]')) {
      const svg = iconSvg(el.dataset.icon);
      const existing = el.querySelector('svg');
      if (existing) existing.outerHTML = svg; else el.insertAdjacentHTML('afterbegin', svg);
    }
  }

  const SECTIONS = [
    { title: 'Quick setup', id: 'quick', icon: 'bolt', short: 'Quick' },
    { title: 'Case', id: 'case', icon: 'case', short: 'Case' },
    { title: 'Motherboard', id: 'board', icon: 'board', short: 'Board' },
    { title: 'Processor', id: 'cpu', icon: 'cpu', short: 'CPU' },
    { title: 'CPU cooler', id: 'cooler', icon: 'fan', short: 'Cooler' },
    { title: 'Graphics card', id: 'gpu', icon: 'gpu', short: 'GPU' },
    { title: 'Workload, environment & units', id: 'env', icon: 'sliders', short: 'Setup' },
  ];

  const ISSUE_SECTIONS = [
    [/socket|motherboard/i, 'board'],
    [/GPU/, 'gpu'],
    [/cooler|radiator/i, 'cooler'],
    [/panel|slot/i, 'case'],
  ];

  function sectionSubtitle(id, config) {
    const C = AF.catalog;
    const name = (list, key) => { const e = C.byId(list, key); return e ? e.name : null; };
    if (id === 'quick') return 'Pick your parts in one place';
    if (id === 'case') return config.case.name;
    if (id === 'board') return name(C.BOARDS, (config.case.motherboard || {}).product) || 'Generic board';
    if (id === 'cpu') return name(C.CPUS, config.cpu.model) || 'Custom CPU';
    if (id === 'cooler') return AF.catalog.cpuCooler(config).name;
    if (id === 'gpu') return name(C.GPUS, config.gpu.model) || 'Custom GPU';
    return `${config.ambient} °C room · ${config.workload === 'gaming' ? 'gaming' : 'full load'}`;
  }

  function renderSidebar(rootEl, app, sections) {
    const st = app.state;
    const rail = document.getElementById('rail');
    const active = SECTIONS.find((s) => s.id === st.panel) ? st.panel : 'quick';
    if (active !== 'quick') st.showAdvanced = true;
    const issueFor = new Set();
    for (const issue of st.layout.issues) {
      if (issue.level !== 'error') continue;
      const hit = ISSUE_SECTIONS.find(([re]) => re.test(issue.text));
      issueFor.add(hit ? hit[1] : 'case');
    }
    if (rail) {
      const item = (meta) => h('button', {
        class: `rail-item ${meta.id === active ? 'active' : ''}`,
        title: `${meta.title}: ${sectionSubtitle(meta.id, st.config)}`,
        onclick: () => { st.panel = meta.id; buildConfigPanel(rootEl, app); },
      }, icon(meta.icon), meta.short, issueFor.has(meta.id) ? h('span', { class: 'dot' }) : null);
      const advancedIssues = SECTIONS.slice(1).some((m) => issueFor.has(m.id));
      const toggle = h('button', {
        class: `rail-toggle ${st.showAdvanced ? 'open' : ''}`,
        'data-tip': st.showAdvanced ? 'Hide advanced' : 'Advanced',
        onclick: () => {
          st.showAdvanced = !st.showAdvanced;
          if (!st.showAdvanced) st.panel = 'quick';
          buildConfigPanel(rootEl, app);
        },
      }, icon(st.showAdvanced ? 'up' : 'down'), !st.showAdvanced && advancedIssues ? h('span', { class: 'dot' }) : null);
      rail.replaceChildren(item(SECTIONS[0]), toggle, ...(st.showAdvanced ? SECTIONS.slice(1).map(item) : []));
    }
    const index = SECTIONS.findIndex((s) => s.id === active);
    const meta = SECTIONS[index];
    const sec = sections.find((s) => s.title === meta.title);
    const go = (k) => { st.panel = SECTIONS[k].id; buildConfigPanel(rootEl, app); };
    rootEl.replaceChildren(
      h('div', { class: 'sidebar-head' },
        h('div', { class: 'sidebar-title' }, meta.title),
        h('div', { class: 'sidebar-sub' }, sectionSubtitle(meta.id, st.config))),
      h('div', { class: 'sidebar-body' },
        ...(sec ? sec.children : []),
        h('div', { class: 'step-nav' },
          index > 0 ? h('button', { class: 'btn', onclick: () => go(index - 1) }, icon('left'), SECTIONS[index - 1].short) : null,
          index > 0 && index < SECTIONS.length - 1 ? h('button', { class: 'btn primary', onclick: () => go(index + 1) }, `Next: ${SECTIONS[index + 1].short}`, icon('right')) : null)));
  }

  function section(title, open, ...children) {
    return { title, children: children.flat().filter((c) => c != null && c !== false) };
  }

  function fanOptions(size) {
    return AF.catalog.fanGroups(size).concat([{ label: 'Custom', options: [{ value: 'custom', label: 'Custom fan…' }] }]);
  }

  function groupedSelect(groups, value, onChange) {
    const el = h('select', { onchange: (e) => onChange(e.target.value) });
    for (const g of groups) {
      const og = h('optgroup', { label: g.label });
      for (const o of g.options) {
        const opt = h('option', { value: o.value }, o.label);
        if (String(o.value) === String(value)) opt.selected = true;
        og.append(opt);
      }
      el.append(og);
    }
    return el;
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
  const CUSTOM = '__custom';

  function picker(groups, value, onChange, customLabel) {
    const sel = h('select', { onchange: (e) => { if (e.target.value) onChange(e.target.value); } });
    const search = h('input', { type: 'search', class: 'picker-search', placeholder: 'Search…' });
    const known = groups.some((g) => g.options.some((o) => o.value === value));
    const brandCounts = new Map();
    for (const g of groups) for (const o of g.options) if (o.brand) brandCounts.set(o.brand, (brandCounts.get(o.brand) || 0) + 1);
    const brands = Array.from(brandCounts.keys()).sort((x, y) => (x === 'Generic') - (y === 'Generic') || x.localeCompare(y));
    const brandSel = brands.length > 1 ? h('select', { class: 'picker-brand', title: 'Filter by manufacturer' },
      h('option', { value: '' }, 'All brands'),
      brands.map((b) => h('option', { value: b }, `${b} (${brandCounts.get(b)})`))) : null;
    const fill = () => {
      sel.replaceChildren();
      const needle = search.value.trim().toLowerCase();
      const brand = brandSel ? brandSel.value : '';
      const filtering = needle || brand;
      const matches = groups.map((g) => ({
        label: g.label,
        options: g.options.filter((o) => (!brand || o.brand === brand) && (!needle || `${g.label} ${o.brand || ''} ${o.label}`.toLowerCase().includes(needle))),
      })).filter((g) => g.options.length);
      if (filtering) {
        const count = matches.reduce((n, g) => n + g.options.length, 0);
        const current = matches.some((g) => g.options.some((o) => o.value === value));
        const hintOpt = h('option', { value: '', disabled: true }, count ? `${count} match${count > 1 ? 'es' : ''}, choose one…` : 'No matches');
        if (!current) hintOpt.selected = true;
        sel.append(hintOpt);
      }
      if (customLabel && !filtering) {
        const opt = h('option', { value: CUSTOM }, customLabel);
        if (!known) opt.selected = true;
        sel.append(opt);
      }
      for (const g of matches) {
        const og = h('optgroup', { label: g.label });
        for (const o of g.options) {
          const opt = h('option', { value: o.value }, o.label);
          if (o.value === value) opt.selected = true;
          og.append(opt);
        }
        sel.append(og);
      }
    };
    search.addEventListener('input', fill);
    if (brandSel) brandSel.addEventListener('change', fill);
    fill();
    return h('div', { class: 'picker' }, h('div', { class: `picker-filters ${brandSel ? 'with-brand' : ''}` }, search, brandSel), sel);
  }

  function details(title, open, ...children) {
    return h('details', { class: 'sub', open }, h('summary', {}, title), ...children);
  }

  function summary(text) {
    const parts = String(text).split(' · ').filter(Boolean);
    return h('div', { class: 'summary' }, parts.map((p) => h('span', { class: `pill ${p.startsWith('≈') || p.includes('approximate') ? 'warn' : ''}` }, p)));
  }

  function quickSetup(config, app) {
    const C = AF.catalog;
    const update = (fn) => app.update(fn);
    const advanced = (id) => {
      app.state.panel = id;
      app.state.showAdvanced = true;
      buildConfigPanel(document.getElementById('configPanel'), app);
    };
    const pickerSelect = (groups, value, customLabel, onChange) => {
      const known = groups.some((g) => g.options.some((o) => o.value === value));
      const sel = h('select', { onchange: (e) => onChange(e.target.value) });
      if (customLabel) {
        const opt = h('option', { value: CUSTOM }, customLabel);
        if (!known) opt.selected = true;
        sel.append(opt);
      }
      for (const g of groups) {
        const og = h('optgroup', { label: g.label });
        for (const o of g.options) {
          const opt = h('option', { value: o.value }, o.label);
          if (o.value === value) opt.selected = true;
          og.append(opt);
        }
        sel.append(og);
      }
      return sel;
    };
    const row = (iconName, label, sectionId, control, sub) => h('div', { class: 'quick-row' },
      h('div', { class: 'quick-head' },
        h('span', { class: 'quick-icon' }, icon(iconName)),
        h('span', { class: 'quick-label' }, label),
        sectionId ? h('button', { class: 'quick-adv', 'data-tip': 'Advanced', onclick: () => advanced(sectionId) }, icon('right')) : null),
      control,
      sub ? h('div', { class: 'quick-sub' }, sub) : null);

    const c = config.case;
    const board = AF.geometry.motherboardOf(config);
    const boardEntry = C.boardOf(config);
    const cpuEntry = C.byId(C.CPUS, config.cpu.model);
    const cooler = C.cpuCooler(config);
    const gpu = config.gpu;
    const gpuEntry = C.byId(C.GPUS, gpu.model);
    return [
      row('case', 'Case', 'case', pickerSelect(C.categorize('case', C.CASES), c.model, 'Custom / generic case', (v) => {
        if (v !== CUSTOM) update((cfg) => C.applyCase(cfg, v));
      }), `${c.depth} × ${c.width} × ${c.height} mm`),
      row('board', 'Motherboard', 'board', pickerSelect(C.categorize('board', C.BOARDS), board.product, 'Generic board', (v) => update((cfg) => {
        if (v === CUSTOM) cfg.case.motherboard = Object.assign({}, AF.geometry.motherboardOf(cfg), { product: null, socket: null });
        else C.applyBoard(cfg, v);
      })), boardEntry ? `${boardEntry.socket} · GPU in slot ${board.x16Slot}` : `${board.width} × ${board.height} mm`),
      row('cpu', 'Processor', 'cpu', pickerSelect(C.categorize('cpu', C.CPUS), config.cpu.model, 'Custom CPU', (v) => update((cfg) => {
        if (v === CUSTOM) { cfg.cpu.model = 'custom'; cfg.cpu.socket = null; } else C.applyCpu(cfg, v);
      })), `${cpuEntry ? `${cpuEntry.socket} · ` : ''}${config.cpu.power} W`),
      row('fan', 'CPU cooler', 'cooler', pickerSelect(C.categorize('cooler', C.COOLERS), config.cpu.coolerModel || `generic-${config.cpu.cooler}`, null, (v) => update((cfg) => C.applyCooler(cfg, v))),
        cooler.type === 'aio' ? `${config.cpu.aio.fans * c.panels[config.cpu.aio.panel].fanSize} mm radiator · ${config.cpu.aio.panel}` : `${cooler.height} mm tall`),
      row('gpu', 'Graphics card', 'gpu', pickerSelect(C.categorize('gpu', C.GPUS), gpu.model, 'Custom GPU', (v) => update((cfg) => {
        if (v === CUSTOM) cfg.gpu.model = 'custom'; else C.applyGpu(cfg, v);
      })), `${gpu.length} mm · ${gpu.slots} slot · ${gpu.power} W${gpuEntry ? '' : ' · custom'}`),
      row('sliders', 'Workload & room', 'env', h('div', { class: 'grid2' },
        select([{ value: 'stress', label: 'Full load' }, { value: 'gaming', label: 'Gaming' }], config.workload || 'stress', (v) => update((cfg) => {
          cfg.workload = v;
          if (C.byId(C.CPUS, cfg.cpu.model)) C.applyCpu(cfg, cfg.cpu.model);
          const g = C.byId(C.GPUS, cfg.gpu.model);
          if (g) cfg.gpu.power = C.gpuPower(g, v);
        })),
        h('div', { class: 'quick-temp' }, number(config.ambient, 5, 45, 0.5, (v) => update((cfg) => { cfg.ambient = v; })), h('span', {}, '°C')))),
      h('div', { class: 'hint' }, 'Use the arrows for the advanced settings of each part: dimensions, fans, panels, layout and thermal details.'),
    ];
  }

  function buildConfigPanel(rootEl, app) {
    const config = app.state.config;
    const D = AF.data;
    const C = AF.catalog;
    const update = (fn) => app.update(fn);
    const live = (fn) => app.update(fn, { live: true });
    const sections = [];
    sections.push(section('Quick setup', true, ...quickSetup(config, app)));

    const c = config.case;
    const caseEntry = C.byId(C.CASES, c.model);
    const editDims = (fn) => update((cfg) => {
      fn(cfg);
      cfg.case.model = null;
      cfg.case.maxGpu = null;
      cfg.case.maxCooler = null;
      cfg.case.support = null;
      cfg.case.grille = null;
    });
    const panelRows = Object.keys(D.PANELS).map((key) => h('tr', {},
      h('td', {}, D.PANELS[key].name),
      h('td', {}, select(Object.entries(D.PANEL_TYPES).map(([v, t]) => ({ value: v, label: t.name })), c.panels[key].type,
        (v) => update((cfg) => { cfg.case.panels[key].type = v; }))),
      h('td', { class: 'size-cell' }, select(C.supportedSizes(config, key).map((s) => ({ value: s, label: `${s}` })), c.panels[key].fanSize,
        (v) => update((cfg) => {
          const size = +v;
          cfg.case.panels[key].fanSize = size;
          for (const [id, sc] of Object.entries(cfg.slots)) {
            if (!id.startsWith(`${key}-`) || sc.fan === 'custom') continue;
            const spec = D.FANS.find((f) => f.id === sc.fan);
            if (!spec || spec.size !== size) sc.fan = (D.FANS.find((f) => f.size === size) || D.FANS[0]).id;
          }
        })))));
    const frontCap = AF.geometry.frontSlotCapacity(config);
    sections.push(section('Case', true,
      field('Case model', picker(C.categorize('case', C.CASES), c.model, (v) => {
        if (v === CUSTOM) editDims(() => {}); else update((cfg) => C.applyCase(cfg, v));
      }, 'Custom / generic case')),
      caseEntry ? summary(`${c.depth} × ${c.width} × ${c.height} mm · GPU up to ${c.maxGpu} mm · cooler up to ${c.maxCooler} mm · bundled fans installed${caseEntry.approx ? ' · ≈ approximate specs, check your case' : caseEntry.stockApprox ? ' (bundled fan set is approximate, check your case)' : ''}`) : null,
      details('Dimensions & panels', !caseEntry,
        field('Name', text(c.name, (v) => update((cfg) => { cfg.case.name = v; }))),
        h('div', { class: 'grid3' },
          field('Height (mm)', number(c.height, 280, 700, 1, (v) => editDims((cfg) => { cfg.case.height = v; }))),
          field('Depth (mm)', number(c.depth, 280, 650, 1, (v) => editDims((cfg) => { cfg.case.depth = v; }))),
          field('Width (mm)', number(c.width, 150, 350, 1, (v) => editDims((cfg) => { cfg.case.width = v; })))),
        field('Motherboard top clearance (mm)', number(AF.geometry.boardTop(config), 15, 150, 1, (v) => update((cfg) => { cfg.case.boardTop = v; })),
          'Gap between the roof and the top edge of the motherboard. Top fans, radiators and tall coolers share this space.'),
        h('div', { class: 'row' },
          checkbox(c.shroud, (v) => update((cfg) => { cfg.case.shroud = v; }), 'PSU shroud'),
          checkbox(c.pcieVented, (v) => update((cfg) => { cfg.case.pcieVented = v; }), 'Vented PCIe slot covers')),
        frontCap > 0 ? field('Front fan mounts', select(
          Array.from({ length: frontCap }, (_, k) => ({ value: k + 1, label: `${k + 1} × ${c.panels.front.fanSize} mm` })),
          Math.max(1, Math.min(c.frontSlots == null ? 3 : c.frontSlots, frontCap)),
          (v) => update((cfg) => { cfg.case.frontSlots = +v; })),
          `Up to ${frontCap} fit at this fan size.`) : null,
        h('table', { class: 'panel-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Panel'), h('th', {}, 'Type'), h('th', {}, 'Fan mm'))), h('tbody', {}, panelRows))),
      frontCap > 0 ? h('button', { class: 'btn small', onclick: () => app.fillFront() }, 'Fill all front mounts with intake fans') : null,
      h('div', { class: 'hint' }, 'Click a fan slot in the view to change its fan. Empty slots on open panels work as passive vents.')));

    const board = AF.geometry.motherboardOf(config);
    const boardEntry = C.boardOf(config);
    const setBoard = (patch) => update((cfg) => { cfg.case.motherboard = Object.assign({}, AF.geometry.motherboardOf(cfg), patch); });
    const layoutEntry = D.MOTHERBOARDS.find((m) => m.id === board.model);
    sections.push(section('Motherboard', true,
      field('Motherboard', picker(C.categorize('board', C.BOARDS), board.product, (v) => update((cfg) => {
        if (v === CUSTOM) cfg.case.motherboard = Object.assign({}, AF.geometry.motherboardOf(cfg), { product: null, socket: null });
        else C.applyBoard(cfg, v);
      }), 'Generic board (choose layout)')),
      summary(`${boardEntry ? `${boardEntry.socket} · ` : ''}${layoutEntry ? layoutEntry.form : ''} ${board.width} × ${board.height} mm · GPU in slot ${board.x16Slot}`),
      details('Layout details', !boardEntry,
        field('Layout', select(D.MOTHERBOARDS.map((m) => ({ value: m.id, label: m.name })), board.model,
          (v) => update((cfg) => { cfg.case.motherboard = Object.assign(D.motherboardConfig(v), { product: board.product, socket: board.socket }); }))),
        h('div', { class: 'grid2' },
          field('Board width (mm)', number(board.width, 150, 360, 1, (v) => setBoard({ width: v }))),
          field('Board height (mm)', number(board.height, 150, 360, 1, (v) => setBoard({ height: v })))),
        h('div', { class: 'grid2' },
          field('Socket from rear edge (mm)', number(board.socketX, 40, board.width - 30, 1, (v) => setBoard({ socketX: v }))),
          field('Socket from top edge (mm)', number(board.socketY, 35, board.height - 40, 1, (v) => setBoard({ socketY: v })))),
        h('div', { class: 'grid2' },
          field('GPU in PCIe slot', select(Array.from({ length: board.slotCount }, (_, k) => ({ value: k + 1, label: `Slot ${k + 1}${k === 0 ? ' (top)' : ''}` })), board.x16Slot,
            (v) => setBoard({ x16Slot: +v }))),
          field('Slot 1 from top edge (mm)', number(board.slot1Y, 90, Math.max(91, board.height - 20), 1, (v) => setBoard({ slot1Y: v })))),
        h('div', { class: 'hint' }, 'Board layouts are typical for the form factor. If your manual shows a different x16 slot or socket position, adjust it here.'))));

    const cpu = config.cpu;
    const cpuEntry = C.byId(C.CPUS, cpu.model);
    sections.push(section('Processor', true,
      field('CPU', picker(C.categorize('cpu', C.CPUS), cpu.model, (v) => update((cfg) => {
        if (v === CUSTOM) { cfg.cpu.model = 'custom'; cfg.cpu.socket = null; } else C.applyCpu(cfg, v);
      }), 'Custom CPU')),
      summary(`${cpuEntry ? `${cpuEntry.socket} · ` : ''}${cpu.power} W (${config.workload === 'gaming' ? 'gaming' : 'full load'}) · Tjmax ${cpu.tjmax} °C`),
      details('Power & thermal details', !cpuEntry,
        h('div', { class: 'grid3' },
          field('Load power (W)', number(cpu.power, 5, 500, 1, (v) => update((cfg) => { cfg.cpu.power = v; }))),
          field('Tjmax (°C)', number(cpu.tjmax, 60, 115, 1, (v) => update((cfg) => { cfg.cpu.tjmax = v; }))),
          field('Die→IHS (°C/W)', number(cpu.rjc, 0.05, 1, 0.01, (v) => update((cfg) => { cfg.cpu.rjc = v; })))))));

    const cooler = C.cpuCooler(config);
    const coolerChildren = [
      field('Cooler', picker(C.categorize('cooler', C.COOLERS), cpu.coolerModel || `generic-${cpu.cooler}`, (v) => update((cfg) => C.applyCooler(cfg, v)))),
      cooler.type !== 'aio' ? summary(`${cooler.height} mm tall${cooler.type === 'tower' ? ` · ${cpu.coolerFanCount || cooler.defaultFanCount} × ${cooler.fanSize} mm fan` : ''}`) : null,
    ];
    if (cooler.type === 'tower') {
      coolerChildren.push(
        field(`Cooler fan (${cooler.fanSize} mm)`, groupedSelect(fanOptions(cooler.fanSize), cpu.coolerFan, (v) => update((cfg) => { cfg.cpu.coolerFan = v; }))),
        cpu.coolerFan === 'custom' ? customFanFields(cpu.coolerCustom, (v) => update((cfg) => { cfg.cpu.coolerCustom = Object.assign(v, { size: cooler.fanSize }); })) : null,
        field('Fans on cooler', select(Array.from({ length: cooler.maxFanCount }, (_, k) => ({ value: k + 1, label: k === 0 ? '1 fan' : `${k + 1} fans (series)` })), cpu.coolerFanCount,
          (v) => update((cfg) => { cfg.cpu.coolerFanCount = +v; }))));
    }
    if (cooler.type !== 'aio') {
      coolerChildren.push(field('Cooler fan speed', slider(cpu.coolerFanSpeed, 0, 1, 0.01, pct, (v) => live((cfg) => { cfg.cpu.coolerFanSpeed = v; }))));
    } else {
      const aio = cpu.aio;
      const radPanels = ['front', 'top', 'rear', 'bottom'].filter((p) => app.state.layout.slots.some((s) => s.panel === p && s.available) || p === aio.panel);
      const maxFans = aio.panel === 'rear' ? 1 : 3;
      const sizeLabel = (n) => `${n * c.panels[aio.panel].fanSize} mm (${n} × ${c.panels[aio.panel].fanSize})`;
      coolerChildren.push(
        h('div', { class: 'grid2' },
          field('Radiator location', select(radPanels.map((p) => ({ value: p, label: D.PANELS[p].name })), aio.panel,
            (v) => update((cfg) => { cfg.cpu.aio.panel = v; if (v === 'rear') cfg.cpu.aio.fans = 1; }))),
          field('Radiator size', select(Array.from({ length: maxFans }, (_, k) => ({ value: k + 1, label: sizeLabel(k + 1) })), Math.min(aio.fans, maxFans),
            (v) => update((cfg) => { cfg.cpu.aio.fans = +v; })))),
        h('div', { class: 'grid2' },
          field('Thickness', select(D.RADIATOR_THICKNESS.map((t) => ({ value: t, label: `${t} mm` })), aio.thickness, (v) => update((cfg) => { cfg.cpu.aio.thickness = +v; }))),
          field('Fans', checkbox(aio.pushPull, (v) => update((cfg) => { cfg.cpu.aio.pushPull = v; }), 'Push-pull'))),
        h('button', { class: 'btn small', onclick: () => app.fillRadiatorFans() }, 'Put fans on empty radiator slots'),
        h('div', { class: 'hint' }, 'Choosing an AIO model mounts its radiator with its bundled fans. Radiator fans are the slot fans of that panel; click them in the view to edit.'));
    }
    sections.push(section('CPU cooler', true, ...coolerChildren));

    const gpu = config.gpu;
    const gpuEntry = C.byId(C.GPUS, gpu.model);
    const gpuCooler = C.gpuCooler(config);
    const thicknessOptions = Array.from(new Set([1, 2, 2.5, 3, 3.5, 4, gpu.slots])).sort((a, b) => a - b);
    sections.push(section('Graphics card', true,
      field('GPU', picker(C.categorize('gpu', C.GPUS), gpu.model, (v) => update((cfg) => {
        if (v === CUSTOM) cfg.gpu.model = 'custom'; else C.applyGpu(cfg, v);
      }), 'Custom GPU')),
      summary(`${gpu.length} mm · ${gpu.slots} slot · ${gpu.power} W · ${gpuCooler.type === 'blower' ? 'blower' : `${gpu.fanCount || gpuCooler.fanCount} fans${gpuCooler.flowThrough ? ', flow-through' : ''}`}${gpuEntry && gpuEntry.approx ? ' · ≈ approximate dimensions' : ''}`),
      field('GPU fan speed', slider(gpu.fanSpeed, 0, 1, 0.01, pct, (v) => live((cfg) => { cfg.gpu.fanSpeed = v; }))),
      details('Card details', !gpuEntry,
        h('div', { class: 'grid3' },
          field('Board power (W)', number(gpu.power, 10, 700, 1, (v) => update((cfg) => { cfg.gpu.power = v; }))),
          field('Length (mm)', number(gpu.length, 150, 420, 1, (v) => update((cfg) => { cfg.gpu.length = v; }))),
          field('Thickness', select(thicknessOptions.map((s) => ({ value: s, label: `${s} slot` })), gpu.slots, (v) => update((cfg) => { cfg.gpu.slots = +v; })))),
        h('div', { class: 'grid2' },
          field('Cooler', select(Object.entries(D.GPU_COOLERS).map(([v, k]) => ({ value: v, label: k.name })), gpu.cooler,
            (v) => update((cfg) => { cfg.gpu.cooler = v; cfg.gpu.fanCount = D.GPU_COOLERS[v].fanCount; cfg.gpu.flowThrough = D.GPU_COOLERS[v].flowThrough; }))),
          gpuCooler.type === 'open'
            ? field('GPU fans', select([1, 2, 3, 4].map((n) => ({ value: n, label: `${n} fan${n > 1 ? 's' : ''}` })), gpu.fanCount || gpuCooler.fanCount, (v) => update((cfg) => { cfg.gpu.fanCount = +v; })))
            : h('div')),
        gpuCooler.type === 'open' ? checkbox(gpuCooler.flowThrough, (v) => update((cfg) => { cfg.gpu.flowThrough = v; }), 'Flow-through cooler (short PCB)') : null,
        h('div', { class: 'grid2' },
          field('Temp limit (°C)', number(gpu.tmax, 60, 110, 1, (v) => update((cfg) => { cfg.gpu.tmax = v; }))),
          field('Die resistance (°C/W)', number(gpu.rjc, 0.01, 0.5, 0.005, (v) => update((cfg) => { cfg.gpu.rjc = v; })))))));

    sections.push(section('Workload, environment & units', true,
      field('Workload', select([{ value: 'stress', label: 'Full load (stress test / rendering)' }, { value: 'gaming', label: 'Gaming (typical power)' }], config.workload || 'stress',
        (v) => update((cfg) => {
          cfg.workload = v;
          if (C.byId(C.CPUS, cfg.cpu.model)) C.applyCpu(cfg, cfg.cpu.model);
          const g = C.byId(C.GPUS, cfg.gpu.model);
          if (g) cfg.gpu.power = C.gpuPower(g, v);
        })), 'Sets CPU and GPU power from the selected parts.'),
      h('div', { class: 'grid2' },
        field('Room temperature (°C)', number(config.ambient, 5, 45, 0.5, (v) => update((cfg) => { cfg.ambient = v; }))),
        field('Other heat (W)', number(config.otherHeat, 0, 300, 1, (v) => update((cfg) => { cfg.otherHeat = v; })), 'VRM, RAM, SSDs, chipset')),
      h('div', { class: 'grid2' },
        field('Airflow unit', select([{ value: 'cfm', label: 'CFM' }, { value: 'm3h', label: 'm³/h' }], config.units.flow, (v) => update((cfg) => { cfg.units.flow = v; }))),
        field('Pressure unit', select([{ value: 'pa', label: 'Pa' }, { value: 'mmh2o', label: 'mmH₂O' }], config.units.pressure, (v) => update((cfg) => { cfg.units.pressure = v; }))))));
    renderSidebar(rootEl, app, sections);
  }

  function selectionElement(app) {
    const st = app.state;
    const id = st.selection;
    if (id === 'cpu-cooler') return st.air.coolers.cpu || null;
    if (id && id.startsWith('cf-')) return st.air.elements.find((e) => e.id === id) || (st.air.internal || []).find((e) => e.id === id) || null;
    if (id === 'gpu-cooler') return st.air.coolers.gpu || st.air.blower || null;
    return st.air.elements.find((e) => e.id === id) || null;
  }

  function editorHead(iconName, tone, title, sub, badge) {
    return h('div', { class: 'editor-head' },
      h('div', { class: `editor-icon ${tone || ''}` }, icon(iconName)),
      h('div', {}, h('h3', {}, title, badge || null), sub ? h('div', { class: 'editor-sub' }, sub) : null));
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
      const cooler = AF.catalog.cpuCooler(config);
      body.append(editorHead('fan', '', cooler.name, `CPU cooler · ${cooler.type === 'aio' ? 'liquid' : cooler.type === 'tower' ? 'tower air cooler' : 'top-down air cooler'}`));
      if (cooler.type === 'aio') {
        body.append(h('p', { class: 'hint' }, 'AIO radiator fans are the case fans on the radiator slots. Select them in the view to edit.'));
      } else {
        if (cooler.type === 'tower') {
          body.append(field('Fan model', groupedSelect(fanOptions(cooler.fanSize), config.cpu.coolerFan, (v) => update((cfg) => { cfg.cpu.coolerFan = v; }))));
        }
        body.append(field('Fan speed', slider(config.cpu.coolerFanSpeed, 0, 1, 0.01, pct, (v) => live((cfg) => { cfg.cpu.coolerFanSpeed = v; }))));
      }
    } else if (id && id.startsWith('cf-')) {
      const cf = st.layout.customFans.find((f) => f.id === id);
      if (!cf) {
        rootEl.append(h('div', { class: 'editor-empty' }, h('div', { class: 'editor-icon' }, icon('target')), 'Click a fan slot, the CPU cooler or the GPU in the view to configure it.'));
        return;
      }
      const setCf = (patch, isLive) => (isLive ? live : update)((cfg) => {
        Object.assign(cfg.customFans.find((f) => f.id === id), patch);
      });
      const G = AF.geometry;
      body.append(editorHead('fan', cf.mode === 'internal' ? '' : cf.mode, cf.label, `${cf.where} · ${cf.size} mm`));
      if (cf.mount.type === 'wall') {
        const inward = G.INWARD[cf.mount.panel];
        body.append(h('div', { class: 'segmented' }, ...['intake', 'exhaust'].map((m) => h('button', {
          class: `seg ${cf.mode === m ? 'active' : ''} ${m}`,
          onclick: () => setCf({ dir: m === 'intake' ? inward : G.OPPOSITE[inward] }),
        }, m[0].toUpperCase() + m.slice(1)))));
      } else {
        const dirs = [['up', 'Up'], ['down', 'Down'], ['left', 'To rear'], ['right', 'To front']];
        body.append(field('Blowing direction', h('div', { class: 'segmented' }, ...dirs.map(([d, label]) => h('button', {
          class: `seg ${cf.dir === d ? 'active' : ''}`,
          onclick: () => setCf({ dir: d, mount: Object.assign({}, cf.mount, { anchor: d === cf.dir ? cf.mount.anchor : null }) }),
        }, label)))));
      }
      const spots = G.customFanSpots(config, st.layout, cf.size, cf);
      const currentSpot = spots.find((sp) => !sp.snap.blocked && Math.abs(sp.snap.x - cf.x) < 1 && Math.abs(sp.snap.y - cf.y) < 1 && sp.snap.dir === cf.dir);
      const posSelect = h('select', { onchange: (e) => app.placeCustomFan(id, e.target.value) });
      if (!currentSpot) {
        const opt = h('option', { value: '' }, `Current position (${cf.where.toLowerCase()})`);
        opt.selected = true;
        opt.disabled = true;
        posSelect.append(opt);
      }
      for (const sp of spots) {
        const opt = h('option', { value: sp.id }, sp.reason ? `${sp.label} (${sp.reason})` : sp.label);
        if (sp.snap.blocked) opt.disabled = true;
        if (currentSpot && currentSpot.id === sp.id) opt.selected = true;
        posSelect.append(opt);
      }
      body.append(field('Position', posSelect));
      const sizes = Array.from(new Set(D.FANS.map((f) => f.size))).sort((a, b) => a - b);
      body.append(field('Fan size (mm)', h('div', { class: 'segmented size-seg' }, ...sizes.map((v) => h('button', {
        class: `seg ${cf.size === v ? 'active' : ''}`,
        onclick: () => app.resizeCustomFan(id, v),
      }, `${v}`)))));
      body.append(field('Speed', slider(cf.speed, 0, 1, 0.01, pct, (v) => setCf({ speed: v }, true))));
      body.append(field('Fan model', groupedSelect(fanOptions(cf.size), cf.fan, (v) => setCf({ fan: v }))));
      if (cf.fan === 'custom') body.append(customFanFields(cf.custom, (v) => setCf({ custom: v })));
      if (cf.mode === 'intake') body.append(field('Dust filter', select(Object.entries(D.FILTERS).map(([v, f]) => ({ value: v, label: f.name })), cf.filter, (v) => setCf({ filter: v }))));
      body.append(h('div', { class: 'row' },
        h('button', { class: 'btn', onclick: () => app.rotateCustomFan(id) }, icon('rotate'), cf.mount.type === 'wall' ? 'Flip' : 'Rotate'),
        h('button', { class: 'btn danger', onclick: () => app.removeCustomFan(id) }, icon('trash'), 'Remove')));
      body.append(h('div', { class: 'hint' }, 'Pick a position and size above. Positions where the selected size does not fit are disabled. Shortcuts: R rotates or flips, Delete removes.'));
    } else if (id === 'gpu-cooler') {
      const cooler = AF.catalog.gpuCooler(config);
      const gpuEntry = AF.catalog.byId(AF.catalog.GPUS, config.gpu.model);
      body.append(editorHead('gpu', '', gpuEntry ? gpuEntry.name : 'Graphics card', `GPU cooler · ${cooler.name}`));
      body.append(field('Fan speed', slider(config.gpu.fanSpeed, 0, 1, 0.01, pct, (v) => live((cfg) => { cfg.gpu.fanSpeed = v; }))));
    } else {
      const slot = st.layout.slots.find((s) => s.id === id);
      if (!slot) {
        rootEl.append(h('div', { class: 'editor-empty' }, h('div', { class: 'editor-icon' }, icon('target')), 'Click a fan slot, the CPU cooler or the GPU in the view to configure it.'));
        return;
      }
      const sc = AF.geometry.slotConfig(config, id);
      const panelName = D.PANELS[slot.panel].name;
      body.append(editorHead(sc.mode === 'empty' ? 'vent' : 'fan', sc.mode === 'empty' ? '' : sc.mode, `${panelName} slot ${slot.index + 1}`,
        `${slot.size} mm · ${slot.panelType.name} panel`, slot.radiator ? h('span', { class: 'badge' }, `radiator ${config.cpu.aio.thickness} mm`) : null));
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
      const panelSizes = AF.catalog.supportedSizes(config, slot.panel);
      body.append(field('Fan size (mm)', h('div', { class: 'segmented size-seg' }, ...panelSizes.map((v) => h('button', {
        class: `seg ${slot.size === v ? 'active' : ''}`,
        onclick: () => app.setPanelFanSize(slot.panel, v),
      }, `${v}`))), panelSizes.length > 1 ? `Applies to every ${panelName.toLowerCase()} slot. Sizes this panel supports.` : `This panel only takes ${panelSizes[0]} mm fans.`));
      if (sc.mode !== 'empty') {
        const fanValue = sc.fan === 'custom' || D.FANS.some((f) => f.id === sc.fan && f.size === slot.size) ? sc.fan : (D.FANS.find((f) => f.size === slot.size) || {}).id;
        body.append(field('Fan model', groupedSelect(fanOptions(slot.size), fanValue, (v) => setSlot({ fan: v }))));
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
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#7d899b';
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
    line(full.pts, 'fan', 'rgba(109,141,255,0.35)', [8, 6], 2);
    line(cur.pts, 'fan', '#6d8dff', [], 3);
    const sys = [];
    for (let k = 0; k <= 80; k++) {
      const q = maxQ * k / 80;
      sys.push({ q, system: AF.physics.totalLoss(el, q) + (el.required || 0) });
    }
    line(sys, 'system', '#22d3ee', [], 2.5);
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(X(el.q), Y(el.developed), 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '19px Inter, Segoe UI, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#6d8dff';
    ctx.fillText('fan @ speed', W - m.r - 6, m.t + 22);
    ctx.fillStyle = 'rgba(109,141,255,0.6)';
    ctx.fillText('fan @ 100%', W - m.r - 6, m.t + 46);
    ctx.fillStyle = '#22d3ee';
    ctx.fillText('system (losses + case)', W - m.r - 6, m.t + 70);
  }

  function splitValue(text) {
    const i = text.lastIndexOf(' ');
    return i < 0 ? [text, ''] : [text.slice(0, i), text.slice(i + 1)];
  }

  function kpi(opts) {
    const [value, unit] = Array.isArray(opts.value) ? opts.value : [opts.value, ''];
    return h('div', { class: `kpi ${opts.tone || ''} ${opts.onclick ? 'clickable' : ''}`, onclick: opts.onclick, title: opts.title },
      h('div', { class: 'kpi-label' }, icon(opts.icon), opts.label),
      h('div', { class: 'kpi-value' }, value, unit ? h('small', {}, unit) : null),
      h('div', { class: 'kpi-sub' }, opts.sub),
      opts.bar != null ? h('div', { class: 'kpi-bar' }, h('div', { style: `width:${Math.max(2, Math.min(100, opts.bar * 100))}%` })) : null);
  }

  function tempTone(temp, limit) {
    if (temp >= limit - 0.5) return 'bad';
    if (temp >= limit - 12) return 'warn';
    return 'good';
  }

  function renderKpis(rootEl, app) {
    const st = app.state;
    const fmt = app.fmt;
    const air = st.air;
    const th = st.displayThermal || st.mixed;
    const P = AF.data.PHYSICS;
    const pressure = air.pressure;
    const pState = pressure > P.neutralPressurePa ? 'positive' : pressure < -P.neutralPressurePa ? 'negative' : 'neutral';
    const [pv, pu] = splitValue(fmt.pressure(pressure));
    const [fv, fu] = splitValue(fmt.flow(air.throughFlow));
    const source = st.simStats && st.simStats.ready && st.simThermal ? 'CFD' : 'estimate';
    const rise = st.simStats && st.simStats.ready ? st.simStats.meanT - st.config.ambient : th.caseRise;
    rootEl.replaceChildren(
      kpi({ icon: 'gauge', label: 'Pressure', value: [`${pressure >= 0 ? '+' : ''}${pv}`, pu], sub: `${pState[0].toUpperCase()}${pState.slice(1)} pressure`, tone: pState === 'positive' ? 'good' : pState === 'negative' ? 'warn' : 'info', onclick: () => app.showTab('results') }),
      kpi({ icon: 'wind', label: 'Airflow', value: [fv, fu], sub: `${air.airChangesPerMinute.toFixed(0)} air changes / min`, tone: air.airChangesPerMinute < 30 ? 'warn' : 'info', onclick: () => app.showTab('results') }),
      kpi({ icon: 'cpu', label: 'CPU', value: [th.cpu.temp.toFixed(0), '°C'], sub: `${th.cpu.power.toFixed(0)} W${th.cpu.throttled ? ' · throttling' : ''} · ${source}`, tone: tempTone(th.cpu.temp, st.config.cpu.tjmax), bar: th.cpu.temp / st.config.cpu.tjmax, onclick: () => app.select('cpu-cooler'), title: `Limit ${st.config.cpu.tjmax} °C` }),
      kpi({ icon: 'gpu', label: 'GPU', value: [th.gpu.temp.toFixed(0), '°C'], sub: `${th.gpu.power.toFixed(0)} W${th.gpu.throttled ? ' · throttling' : ''} · ${source}`, tone: tempTone(th.gpu.temp, st.config.gpu.tmax), bar: th.gpu.temp / st.config.gpu.tmax, onclick: () => app.select('gpu-cooler'), title: `Limit ${st.config.gpu.tmax} °C` }),
      kpi({ icon: 'thermo', label: 'Case air', value: [`+${rise.toFixed(1)}`, '°C'], sub: `above ${st.config.ambient} °C room`, tone: rise > 12 ? 'bad' : rise > 7 ? 'warn' : 'good' }));
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
    const gaugePos = 50 + Math.max(-47, Math.min(47, Math.sign(pressure) * Math.log10(1 + Math.abs(pressure)) * 30));
    rootEl.append(h('div', { class: 'card' },
      h('div', { class: 'card-title' }, 'Case pressure', h('span', { class: 'muted' }, 'inside vs. room')),
      h('div', { class: 'pressure-value' }, `${pressure >= 0 ? '+' : ''}${fmt.pressure(pressure)}`, h('span', { class: `tag ${state.toLowerCase()}` }, state)),
      h('div', { class: 'gauge' }, h('div', { class: 'gauge-mark', style: `left:${gaugePos}%` })),
      h('div', { class: 'gauge-labels' }, h('span', {}, 'negative'), h('span', {}, 'neutral'), h('span', {}, 'positive'))));

    const stat = (label, value) => h('div', { class: 'stat' }, h('div', { class: 'stat-label' }, label), h('div', { class: 'stat-value' }, value));
    rootEl.append(h('div', { class: 'card' }, h('div', { class: 'card-title' }, 'Airflow balance'),
      h('div', { class: 'stat-grid' },
        stat('Intake fans', fmt.flow(air.fanIn)),
        stat('Exhaust fans', fmt.flow(air.fanOut)),
        stat('Passive in', fmt.flow(air.passiveIn)),
        stat('Passive out', fmt.flow(air.passiveOut)),
        stat('Throughput', fmt.flow(air.throughFlow)),
        stat('Air changes', `${air.airChangesPerMinute.toFixed(0)} / min`))));

    const ready = stats && stats.ready;
    const progress = stats ? Math.round(stats.progress * 100) : 0;
    const simCol = (fn) => (sim && stats && stats.time > 0.5 ? fn(sim) : '…');
    const tRow = (label, a, b, hot) => h('tr', { class: hot ? 'hot' : '' }, h('td', {}, label), h('td', {}, a), h('td', {}, b));
    const cpuT = (t) => `${t.cpu.temp.toFixed(1)} °C${t.cpu.throttled ? ' ⚠' : ''}`;
    const gpuT = (t) => `${t.gpu.temp.toFixed(1)} °C${t.gpu.throttled ? ' ⚠' : ''}`;
    const cooler = AF.catalog.cpuCooler(st.config);
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
      h('div', { class: 'hint' }, 'Well-mixed assumes uniform case air (conservative). CFD uses the local air temperature at each cooler inlet.')));

    const modePill = (mode) => h('span', { class: `mode-pill ${mode}` }, mode);
    const fanRows = air.elements.filter((e) => e.kind !== 'vent' || Math.abs(e.q) > 1e-6).map((e) => {
      const mode = e.kind === 'vent' ? (e.inflow > 0 ? 'passive in' : 'passive out') : e.dir > 0 ? 'intake' : 'exhaust';
      const eff = e.fans.length ? `${Math.round(e.q / Math.max(e.free, 1e-9) * 100)}%` : '';
      return h('tr', { class: `clickable ${st.selection === e.id ? 'sel' : ''} ${e.stalled ? 'hot' : ''}`, onclick: () => app.select(e.id) },
        h('td', {}, e.label), h('td', {}, modePill(mode)), h('td', {}, fmt.flow(Math.abs(e.q))), h('td', {}, eff));
    });
    const coolerRows = [];
    if (air.coolers.cpu) coolerRows.push(h('tr', { class: 'clickable', onclick: () => app.select('cpu-cooler') }, h('td', {}, 'CPU cooler'), h('td', {}, modePill('internal')), h('td', {}, fmt.flow(air.coolers.cpu.q)), h('td', {}, `${Math.round(air.coolers.cpu.q / air.coolers.cpu.free * 100)}%`)));
    for (const el of air.internal || []) coolerRows.push(h('tr', { class: `clickable ${st.selection === el.id ? 'sel' : ''}`, onclick: () => app.select(el.id) }, h('td', {}, el.label), h('td', {}, modePill('internal')), h('td', {}, fmt.flow(el.q)), h('td', {}, `${Math.round(el.q / Math.max(el.free, 1e-9) * 100)}%`)));
    if (air.coolers.gpu) coolerRows.push(h('tr', { class: 'clickable', onclick: () => app.select('gpu-cooler') }, h('td', {}, 'GPU fans'), h('td', {}, modePill('internal')), h('td', {}, fmt.flow(air.coolers.gpu.total)), h('td', {}, `${Math.round(air.coolers.gpu.q / air.coolers.gpu.free * 100)}%`)));
    rootEl.append(h('div', { class: 'card' }, h('div', { class: 'card-title' }, 'Fans & openings', h('span', { class: 'muted' }, 'click a row to edit')),
      h('table', { class: 'fans' }, h('thead', {}, h('tr', {}, h('th', {}, 'Where'), h('th', {}, 'Mode'), h('th', {}, 'Flow'), h('th', { title: 'Percentage of free-air flow' }, 'Eff.'))),
        h('tbody', {}, fanRows, coolerRows))));
  }

  const NOTE_ICONS = { error: 'alert', warn: 'warn', info: 'info', good: 'check' };

  function renderInsights(rootEl, badgeEl, app) {
    const order = { error: 0, warn: 1, info: 2, good: 3 };
    const notes = (app.state.notes || []).slice().sort((a, b) => order[a.level] - order[b.level]);
    const count = (level) => notes.filter((n) => n.level === level).length;
    const errors = count('error');
    const warns = count('warn');
    if (badgeEl) {
      badgeEl.textContent = errors || warns || '';
      badgeEl.className = `tab-badge ${errors || warns ? 'show' : ''} ${!errors && warns ? 'warn' : ''}`;
    }
    rootEl.replaceChildren(
      h('div', { class: 'insight-summary' },
        h('div', { class: 'insight-count error' }, h('b', {}, errors), h('span', {}, 'problems')),
        h('div', { class: 'insight-count warn' }, h('b', {}, warns), h('span', {}, 'warnings')),
        h('div', { class: 'insight-count good' }, h('b', {}, count('good') + count('info')), h('span', {}, 'notes'))),
      h('ul', { class: 'notes' }, notes.map((n) => h('li', { class: `note ${n.level}` },
        h('span', { class: 'note-icon' }, icon(NOTE_ICONS[n.level])),
        h('div', { class: 'note-body' },
          h('div', { class: 'note-text' }, n.text),
          n.fix ? h('div', { class: 'note-fix' }, h('span', { class: 'note-fix-label' }, 'Fix'), n.fix) : null)))));
  }

  AF.ui = { h, icon, hydrateIcons, createFormatter, buildConfigPanel, buildEditor, updateEditorDynamic, renderResults, renderKpis, renderInsights };
})(typeof window !== 'undefined' ? window : globalThis);
