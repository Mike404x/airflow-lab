(function (root) {
  const AF = root.AF || (root.AF = {});

  function maxSlotsFor(size) {
    return size >= 200 ? 2 : 3;
  }

  function fitCount(length, size, gap, limit) {
    return Math.max(0, Math.min(limit, Math.floor((length + gap) / (size + gap))));
  }

  function cap(config, panel, size) {
    return AF.catalog ? AF.catalog.supportCap(config, panel, size) : Infinity;
  }

  function boardTop(config) {
    const P = AF.data.PHYSICS;
    const v = config.case.boardTop;
    return Number.isFinite(v) ? Math.max(15, Math.min(150, v)) : P.motherboardTopOffset;
  }

  function shroudTop(config) {
    const P = AF.data.PHYSICS;
    return config.case.shroud ? config.case.height - P.shroudHeight : config.case.height;
  }

  function frontSlotCapacity(config) {
    const P = AF.data.PHYSICS;
    const size = config.case.panels.front.fanSize;
    return Math.min(cap(config, 'front', size), fitCount(config.case.height - 2 * P.panelEdge, size, P.slotGap, size >= 160 ? 2 : P.maxFrontSlots));
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
    const topCount = Math.min(cap(config, 'top', topSize), fitCount(D - P.topRearOffset - edge, topSize, gap, maxSlotsFor(topSize)));
    for (let k = 0; k < topCount; k++) {
      slots.push({
        id: `top-${k}`, panel: 'top', index: k, size: topSize,
        cx: P.topRearOffset + topSize / 2 + k * (topSize + gap), cy: 0, axis: 'y', inward: 1,
      });
    }

    const rearSize = panels.rear.fanSize;
    if (cap(config, 'rear', rearSize) >= 1) {
      slots.push({
        id: 'rear-0', panel: 'rear', index: 0, size: rearSize,
        cx: 0, cy: Math.max(edge + rearSize / 2, boardTop(config) - 20 + rearSize / 2), axis: 'x', inward: 1,
      });
    }

    if (!c.shroud) {
      const bottomSize = panels.bottom.fanSize;
      const bottomCount = Math.min(cap(config, 'bottom', bottomSize), fitCount(D - 2 * edge - 30, bottomSize, gap, maxSlotsFor(bottomSize)));
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
      const sideCap = cap(config, 'side', sideSize);
      for (const cx of cols) {
        for (const cy of rows) {
          if (k >= sideCap) break;
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
    const cooler = AF.catalog.cpuCooler(config);
    if (!cooler || cooler.type !== 'aio') return [];
    const aio = config.cpu.aio;
    return slots.filter((s) => s.panel === aio.panel && s.index < aio.fans);
  }

  function motherboardOf(config) {
    const c = config.case;
    if (c.motherboard && c.motherboard.width) return c.motherboard;
    return AF.data.motherboardConfig(AF.data.LEGACY_FORM_FACTORS[c.formFactor] || 'atx-slot2');
  }

  function towerFans(config, cooler, cc) {
    const ft = AF.data.PHYSICS.fanThickness;
    const dual = config.cpu.cooler === 'tower-dual';
    const count = Math.max(1, Math.min(cooler.maxFanCount || 1, config.cpu.coolerFanCount || cooler.defaultFanCount || 1));
    const order = dual ? ['front', 'middle', 'rear'] : ['front', 'rear'];
    const x = { front: cc.x + cc.w, middle: cc.x + cc.w / 2 - ft / 2, rear: cc.x - ft };
    const fy = cc.y + cc.h / 2 - cooler.fanSize / 2;
    const fans = order.slice(0, count).map((role) => ({ role, x: x[role], y: fy, w: ft, h: cooler.fanSize }));
    const towers = dual
      ? [{ x: cc.x, w: cc.w / 2 - ft / 2 }, { x: cc.x + cc.w / 2 + ft / 2, w: cc.w / 2 - ft / 2 }]
      : [{ x: cc.x, w: cc.w }];
    const left = Math.min(cc.x, ...fans.map((f) => f.x));
    const right = Math.max(cc.x + cc.w, ...fans.map((f) => f.x + f.w));
    const top = Math.min(cc.y, fy);
    const bottom = Math.max(cc.y + cc.h, fy + cooler.fanSize);
    return { fans, towers, bounds: { x: left, y: top, w: right - left, h: bottom - top } };
  }

  function buildComponents(config, slots) {
    const P = AF.data.PHYSICS;
    const c = config.case;
    const board = motherboardOf(config);
    const mobo = { x: P.motherboardRearOffset, y: boardTop(config), w: board.width, h: board.height };
    const socket = { x: mobo.x + board.socketX, y: mobo.y + board.socketY };
    const x16 = Math.max(1, Math.min(board.slotCount, board.x16Slot));
    const pcieSlots = Array.from({ length: board.slotCount }, (_, k) => ({
      index: k + 1, y: mobo.y + board.slot1Y + k * P.pcieSlotPitchMm, primary: k + 1 === x16,
    }));
    const cooler = AF.catalog.cpuCooler(config);

    let cpuCooler;
    if (cooler.type === 'tower') {
      cpuCooler = { type: 'tower', x: socket.x - cooler.depth / 2, y: socket.y - 5 - cooler.finHeight / 2, w: cooler.depth, h: cooler.finHeight };
      Object.assign(cpuCooler, towerFans(config, cooler, cpuCooler));
    } else {
      const f = cooler.footprint;
      cpuCooler = { type: cooler.type, x: socket.x - f / 2, y: socket.y - f / 2, w: f, h: f };
      cpuCooler.bounds = { x: cpuCooler.x, y: cpuCooler.y, w: f, h: f };
    }

    const g = config.gpu;
    const slotsThickness = g.slots * P.pcieSlotPitchMm;
    const pcbTop = mobo.y + board.slot1Y + (x16 - 1) * P.pcieSlotPitchMm;
    const gpuCooler = AF.catalog.gpuCooler(config);
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

    return { mobo, socket, cpuCooler, gpu, shroud, pcie: { top: pcieTop, bottom: pcieBottom }, radiator, pcieSlots, board };
  }

  function clearanceIssues(config, slots, comps) {
    const P = AF.data.PHYSICS;
    const issues = [];
    const c = config.case;
    const frontUsed = slots.some((s) => s.panel === 'front' && slotConfig(config, s.id).mode !== 'empty');
    const frontRad = comps.radiator && config.cpu.aio.panel === 'front' ? comps.radiator.thickness : 0;
    const frontDepth = (frontUsed ? P.fanThickness : 0) + frontRad + (frontRad && config.cpu.aio.pushPull ? P.fanThickness : 0);
    const radExtra = frontRad + (frontRad && config.cpu.aio.pushPull ? P.fanThickness : 0);
    const gpuSpace = c.maxGpu ? Math.min(c.maxGpu - radExtra, c.depth - frontDepth) : c.depth - frontDepth;
    if (config.gpu.length > gpuSpace) {
      issues.push({ level: 'error', text: `GPU (${config.gpu.length} mm) does not fit: the case allows ${Math.round(gpuSpace)} mm${radExtra ? ' with the front radiator' : ''}.` });
    }
    if (comps.gpu.sinkBottom > shroudTop(config)) {
      issues.push({ level: 'error', text: 'GPU cooler collides with the PSU shroud. Reduce slot thickness or remove the shroud.' });
    }
    const cooler = AF.catalog.cpuCooler(config);
    const coolerClearance = c.maxCooler || c.width - 55;
    if (cooler.type !== 'aio' && cooler.height > coolerClearance) {
      issues.push({ level: 'error', text: `CPU cooler (${cooler.height} mm tall) exceeds the case's ${c.maxCooler ? '' : '~'}${coolerClearance} mm cooler clearance.` });
    }
    const boardSocket = c.motherboard && c.motherboard.socket;
    if (boardSocket && config.cpu.socket && boardSocket !== config.cpu.socket) {
      issues.push({ level: 'error', text: `Incompatible: the CPU uses ${config.cpu.socket} but the motherboard has an ${boardSocket} socket.` });
    }
    const m = comps.mobo;
    if (m.x + m.w > c.depth - (frontUsed ? P.fanThickness : 0)) {
      issues.push({ level: 'error', text: `The ${m.w} mm wide motherboard does not fit: only ${Math.round(c.depth - m.x - (frontUsed ? P.fanThickness : 0))} mm of depth before the front fans.` });
    }
    if (m.y + m.h > c.height) {
      issues.push({ level: 'error', text: `The ${m.h} mm tall motherboard does not fit in a ${c.height} mm tall case.` });
    }
    if (m.y + m.h > shroudTop(config) + 20 && c.shroud && m.h > 250) {
      issues.push({ level: 'info', text: 'The bottom of the motherboard sits behind the PSU shroud. Its lowest PCIe slots are unusable for cards.' });
    }
    if (cooler.type === 'tower' && comps.cpuCooler.bounds.y + comps.cpuCooler.bounds.h > comps.gpu.pcbTop - 3) {
      issues.push({ level: 'warn', text: 'The tower cooler hangs over the GPU slot. Check clearance against the GPU backplate, or use a board with the x16 slot lower.' });
    }
    if (cooler.type !== 'aio') {
      const cc = comps.cpuCooler.bounds;
      const pushPull = comps.radiator && config.cpu.aio.pushPull;
      let worst = null;
      for (const s of slots) {
        if (s.panel !== 'top') continue;
        const hasFan = slotConfig(config, s.id).mode !== 'empty';
        const stack = (hasFan ? P.fanThickness : 0) + (s.radiator ? comps.radiator.thickness + (pushPull ? P.fanThickness : 0) : 0);
        const overlapsX = Math.abs(s.cx - (cc.x + cc.w / 2)) < (s.size + cc.w) / 2;
        if (stack > 0 && overlapsX && cc.y < stack && (!worst || stack > worst.stack)) worst = { stack, rad: s.radiator };
      }
      if (worst) {
        issues.push({ level: 'error', text: `The CPU cooler reaches ${Math.round(cc.y)} mm from the roof and hits the top ${worst.rad ? 'radiator' : 'fans'} (${worst.stack} mm deep). Move those fans back, use a lower cooler, or a case with more top clearance.` });
      } else if (cc.y < P.fanThickness + 3) {
        issues.push({ level: 'warn', text: `The CPU cooler reaches ${Math.round(cc.y)} mm from the roof. Fans above it will not fit.` });
      }
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
        if (stack > comps.mobo.y + 10) {
          issues.push({ level: 'warn', text: `Top radiator stack is ${stack} mm thick and may hit the motherboard VRM heatsinks or RAM.` });
        }
      }
    }
    return issues;
  }

  function grilleOf(config) {
    const g = config.case.grille;
    if (!g || !(g.areaMm2 > 0)) return null;
    const c = config.case;
    if (g.panel === 'rear') return { panel: 'rear', from: c.height * 0.05, to: c.height * 0.4, areaMm2: g.areaMm2 };
    return { panel: 'top', from: c.depth * 0.12, to: c.depth * 0.72, areaMm2: g.areaMm2 };
  }

  function layout(config) {
    const slots = buildSlots(config);
    const components = buildComponents(config, slots);
    const issues = clearanceIssues(config, slots, components);
    const radIds = new Set(components.radiator ? components.radiator.slots.map((s) => s.id) : []);
    for (const s of slots) s.radiator = radIds.has(s.id);
    return { slots, components, issues, shroudTop: shroudTop(config), grille: grilleOf(config) };
  }

  AF.geometry = { layout, slotConfig, frontSlotCapacity, motherboardOf, boardTop, towerFans };

  if (typeof module === 'object' && module.exports) module.exports = AF;
})(typeof window !== 'undefined' ? window : globalThis);
