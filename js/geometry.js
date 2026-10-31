(function (root) {
  const AF = root.AF || (root.AF = {});

  function maxSlotsFor(size) {
    return size >= 200 ? 2 : 3;
  }

  function fitCount(length, size, gap, limit) {
    return Math.max(0, Math.min(limit, Math.floor((length + gap) / (size + gap))));
  }

  function shroudTop(config) {
    const P = AF.data.PHYSICS;
    return config.case.shroud ? config.case.height - P.shroudHeight : config.case.height;
  }

  function frontSlotCapacity(config) {
    const P = AF.data.PHYSICS;
    const size = config.case.panels.front.fanSize;
    return fitCount(config.case.height - 2 * P.panelEdge, size, P.slotGap, size >= 200 ? 2 : P.maxFrontSlots);
  }

  function frontSlotCount(config) {
    const requested = config.case.frontSlots == null ? AF.data.PHYSICS.maxFrontSlots : config.case.frontSlots;
    return Math.max(0, Math.min(requested, frontSlotCapacity(config)));
  }

  function buildSlots(config) {
    const P = AF.data.PHYSICS;
    const c = config.case;
    const panels = c.panels;
    const H = c.height;
    const D = c.depth;
    const gap = P.slotGap;
    const edge = P.panelEdge;
    const usableBottom = shroudTop(config);
    const slots = [];

    const frontSize = panels.front.fanSize;
    const frontCount = frontSlotCount(config);
    for (let k = 0; k < frontCount; k++) {
      slots.push({
        id: `front-${k}`, panel: 'front', index: k, size: frontSize,
        cx: D, cy: edge + frontSize / 2 + k * (frontSize + gap), axis: 'x', inward: -1,
      });
    }

    const topSize = panels.top.fanSize;
    const topCount = fitCount(D - P.topRearOffset - edge, topSize, gap, maxSlotsFor(topSize));
    for (let k = 0; k < topCount; k++) {
      slots.push({
        id: `top-${k}`, panel: 'top', index: k, size: topSize,
        cx: P.topRearOffset + topSize / 2 + k * (topSize + gap), cy: 0, axis: 'y', inward: 1,
      });
    }

    const rearSize = panels.rear.fanSize;
    slots.push({
      id: 'rear-0', panel: 'rear', index: 0, size: rearSize,
      cx: 0, cy: edge + 10 + rearSize / 2, axis: 'x', inward: 1,
    });

    if (!c.shroud) {
      const bottomSize = panels.bottom.fanSize;
      const bottomCount = fitCount(D - 2 * edge - 30, bottomSize, gap, maxSlotsFor(bottomSize));
      for (let k = 0; k < bottomCount; k++) {
        slots.push({
          id: `bottom-${k}`, panel: 'bottom', index: k, size: bottomSize,
          cx: D - edge - bottomSize / 2 - k * (bottomSize + gap), cy: H, axis: 'y', inward: -1,
        });
      }
    }

    if (AF.data.PANEL_TYPES[panels.side.type].allowsFans) {
      const sideSize = panels.side.fanSize;
      const rowBottom = usableBottom - 12 - sideSize / 2;
      const rows = [rowBottom - (sideSize + gap), rowBottom].filter((y) => y - sideSize / 2 > edge);
      const cols = [D - 30 - sideSize / 2, D - 30 - sideSize / 2 - (sideSize + gap)].filter((x) => x - sideSize / 2 > edge);
      let k = 0;
      for (const cx of cols) {
        for (const cy of rows) {
          slots.push({ id: `side-${k}`, panel: 'side', index: k, size: sideSize, cx, cy, axis: 'z', inward: 0 });
          k++;
        }
      }
    }

    for (const s of slots) {
      const panelType = AF.data.PANEL_TYPES[panels[s.panel].type];
      s.panelType = panelType;
      s.available = panelType.allowsFans;
    }
    return slots;
  }

  function slotConfig(config, id) {
    const s = config.slots[id];
    return Object.assign({ mode: 'empty', fan: 'arctic-p12', speed: 0.7, filter: 'none', custom: { cfm: 50, mmh2o: 2, rpm: 1500 } }, s || {});
  }

  function radiatorSlots(config, slots) {
    const cooler = AF.data.CPU_COOLERS[config.cpu.cooler];
    if (!cooler || cooler.type !== 'aio') return [];
    const aio = config.cpu.aio;
    return slots.filter((s) => s.panel === aio.panel && s.index < aio.fans);
  }

  function buildComponents(config, slots) {
    const P = AF.data.PHYSICS;
    const c = config.case;
    const form = AF.data.FORM_FACTORS[c.formFactor] || AF.data.FORM_FACTORS.atx;
    const mobo = { x: P.motherboardRearOffset, y: P.motherboardTopOffset, w: form.width, h: form.height };
    const socket = { x: mobo.x + form.width * form.socketX, y: mobo.y + form.socketY };
    const cooler = AF.data.CPU_COOLERS[config.cpu.cooler];

    let cpuCooler;
    if (cooler.type === 'tower') {
      cpuCooler = { type: 'tower', x: socket.x - cooler.depth / 2, y: socket.y - 5 - cooler.finHeight / 2, w: cooler.depth, h: cooler.finHeight };
    } else {
      const f = cooler.footprint;
      cpuCooler = { type: cooler.type, x: socket.x - f / 2, y: socket.y - f / 2, w: f, h: f };
    }

    const g = config.gpu;
    const slotsThickness = g.slots * P.pcieSlotPitchMm;
    const pcbTop = mobo.y + P.gpuSlotTopOffset - (c.formFactor === 'itx' ? 20 : 0);
    const gpuCooler = AF.data.GPU_COOLERS[g.cooler];
    const gpu = {
      x: 0, length: g.length, pcbTop,
      pcbBottom: pcbTop + P.gpuPcbThickness,
      sinkTop: pcbTop + P.gpuPcbThickness,
      sinkBottom: pcbTop + slotsThickness - 4,
      pcbLength: gpuCooler.flowThrough ? g.length * 0.7 : g.length,
      type: gpuCooler.type,
    };

    const frontBottom = Math.max(0, ...slots.filter((s) => s.panel === 'front').map((s) => s.cy + s.size / 2));
    const frontReach = frontBottom > c.height - P.shroudHeight
      ? P.fanThickness + P.shroudFrontGap + (config.cpu.cooler === 'aio' && config.cpu.aio.panel === 'front' ? config.cpu.aio.thickness : 0)
      : 0;
    const shroud = c.shroud ? { y: c.height - P.shroudHeight, x1: c.depth - frontReach } : null;
    const pcieTop = pcbTop - 4;
    const pcieBottom = Math.min(pcbTop + P.pcieSlotCount * P.pcieSlotPitchMm, shroudTop(config));
    const radSlots = radiatorSlots(config, slots);
    const radiator = radSlots.length ? { slots: radSlots, thickness: config.cpu.aio.thickness } : null;

    return { mobo, socket, cpuCooler, gpu, shroud, pcie: { top: pcieTop, bottom: pcieBottom }, radiator };
  }

  function clearanceIssues(config, slots, comps) {
    const P = AF.data.PHYSICS;
    const issues = [];
    const c = config.case;
    const frontUsed = slots.some((s) => s.panel === 'front' && slotConfig(config, s.id).mode !== 'empty');
    const frontRad = comps.radiator && config.cpu.aio.panel === 'front' ? comps.radiator.thickness : 0;
    const frontDepth = (frontUsed ? P.fanThickness : 0) + frontRad + (frontRad && config.cpu.aio.pushPull ? P.fanThickness : 0);
    const gpuSpace = c.depth - frontDepth;
    if (config.gpu.length > gpuSpace) {
      issues.push({ level: 'error', text: `GPU (${config.gpu.length} mm) does not fit: only ${Math.round(gpuSpace)} mm before the front fans/radiator.` });
    }
    if (comps.gpu.sinkBottom > shroudTop(config)) {
      issues.push({ level: 'error', text: 'GPU cooler collides with the PSU shroud. Reduce slot thickness or remove the shroud.' });
    }
    const cooler = AF.data.CPU_COOLERS[config.cpu.cooler];
    const coolerClearance = c.width - 55;
    if (cooler.type !== 'aio' && cooler.height > coolerClearance) {
      issues.push({ level: 'error', text: `CPU cooler (${cooler.height} mm tall) exceeds the ~${coolerClearance} mm side clearance.` });
    }
    if (comps.radiator) {
      const needed = config.cpu.aio.fans;
      if (comps.radiator.slots.length < needed) {
        issues.push({ level: 'error', text: `The ${config.cpu.aio.panel} panel only has ${comps.radiator.slots.length} slot(s) for a ${needed}-fan radiator.` });
      }
      if (!comps.radiator.slots.every((s) => s.available)) {
        issues.push({ level: 'error', text: 'The radiator is mounted on a panel that does not allow fans.' });
      }
      if (config.cpu.aio.panel === 'top') {
        const stack = comps.radiator.thickness + P.fanThickness * (config.cpu.aio.pushPull ? 2 : 1);
        if (stack > comps.mobo.y + 30) {
          issues.push({ level: 'warn', text: `Top radiator stack is ${stack} mm thick and may hit the motherboard VRM heatsinks or RAM.` });
        }
      }
    }
    return issues;
  }

  function layout(config) {
    const slots = buildSlots(config);
    const components = buildComponents(config, slots);
    const issues = clearanceIssues(config, slots, components);
    const radIds = new Set(components.radiator ? components.radiator.slots.map((s) => s.id) : []);
    for (const s of slots) s.radiator = radIds.has(s.id);
    return { slots, components, issues, shroudTop: shroudTop(config) };
  }

  AF.geometry = { layout, slotConfig, frontSlotCapacity };

  if (typeof module === 'object' && module.exports) module.exports = AF;
})(typeof window !== 'undefined' ? window : globalThis);
