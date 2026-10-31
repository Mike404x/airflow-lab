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
      issues.push({ level: 'error', text: `GPU too long: ${config.gpu.length} mm, the case fits ${Math.round(gpuSpace)} mm.`, fix: radExtra ? 'Move the radiator to the top or pick a shorter GPU.' : 'Pick a shorter GPU or a bigger case.' });
    }
    if (comps.gpu.sinkBottom > shroudTop(config)) {
      issues.push({ level: 'error', text: 'The GPU hits the PSU shroud.', fix: 'Pick a thinner GPU or a case without a shroud.' });
    }
    const cooler = AF.catalog.cpuCooler(config);
    const coolerClearance = c.maxCooler || c.width - 55;
    if (cooler.type !== 'aio' && cooler.height > coolerClearance) {
      issues.push({ level: 'error', text: `CPU cooler too tall: ${cooler.height} mm, the case fits ${coolerClearance} mm.`, fix: `Pick a cooler under ${coolerClearance} mm or an AIO.` });
    }
    const boardSocket = c.motherboard && c.motherboard.socket;
    if (boardSocket && config.cpu.socket && boardSocket !== config.cpu.socket) {
      issues.push({ level: 'error', text: `CPU and motherboard socket don't match (${config.cpu.socket} vs ${boardSocket}).`, fix: `Pick a ${config.cpu.socket} motherboard or a ${boardSocket} CPU.` });
    }
    const m = comps.mobo;
    if (m.x + m.w > c.depth - (frontUsed ? P.fanThickness : 0)) {
      issues.push({ level: 'error', text: 'The motherboard is too wide for this case.', fix: 'Pick a smaller board or a deeper case.' });
    }
    if (m.y + m.h > c.height) {
      issues.push({ level: 'error', text: 'The motherboard is too tall for this case.', fix: 'Pick a smaller board or a taller case.' });
    }
    if (m.y + m.h > shroudTop(config) + 20 && c.shroud && m.h > 250) {
      issues.push({ level: 'info', text: 'The lowest motherboard slots are hidden behind the shroud.' });
    }
    if (cooler.type === 'tower' && comps.cpuCooler.bounds.y + comps.cpuCooler.bounds.h > comps.gpu.pcbTop - 3) {
      issues.push({ level: 'warn', text: 'The CPU cooler sits very close to the GPU.', fix: 'Check the clearance, or put the GPU in a lower slot.' });
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
        issues.push({ level: 'error', text: `The CPU cooler hits the top ${worst.rad ? 'radiator' : 'fans'}.`, fix: 'Move the top fans toward the front, use a lower cooler, or a case with more top clearance.' });
      } else if (cc.y < P.fanThickness + 3) {
        issues.push({ level: 'warn', text: 'The CPU cooler leaves no room for top fans.', fix: 'Use a lower cooler or keep the top fans away from it.' });
      }
    }
    if (comps.radiator) {
      const needed = config.cpu.aio.fans;
      if (comps.radiator.slots.length < needed) {
        issues.push({ level: 'error', text: `The radiator doesn't fit on the ${config.cpu.aio.panel}.`, fix: 'Pick a smaller radiator or another location.' });
      }
      if (!comps.radiator.slots.every((s) => s.available)) {
        issues.push({ level: 'error', text: 'The radiator is on a panel without fan mounts.', fix: 'Choose another radiator location.' });
      }
      if (config.cpu.aio.panel === 'top') {
        const stack = comps.radiator.thickness + P.fanThickness * (config.cpu.aio.pushPull ? 2 : 1);
        if (stack > comps.mobo.y + 10) {
          issues.push({ level: 'warn', text: `The top radiator (${stack} mm thick) may hit the RAM.`, fix: 'Use a slimmer radiator or mount it at the front.' });
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

  const INWARD = { rear: 'right', front: 'left', top: 'down', bottom: 'up' };
  const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
  const WALL_SNAP_MM = 40;
  const SLOT_SNAP_MM = 26;
  const GRID_MM = 5;

  function customFanRect(cf) {
    const ft = AF.data.PHYSICS.fanThickness;
    const horizontal = cf.dir === 'left' || cf.dir === 'right';
    return horizontal
      ? { x: cf.x - ft / 2, y: cf.y - cf.size / 2, w: ft, h: cf.size }
      : { x: cf.x - cf.size / 2, y: cf.y - ft / 2, w: cf.size, h: ft };
  }

  function customFanMode(cf) {
    if (!cf.mount || cf.mount.type !== 'wall') return 'internal';
    return cf.dir === INWARD[cf.mount.panel] ? 'intake' : 'exhaust';
  }

  function wallPosition(config, panel, along, size) {
    const ft = AF.data.PHYSICS.fanThickness;
    const c = config.case;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    if (panel === 'rear') return { x: ft / 2, y: clamp(along, size / 2, Math.max(size / 2, shroudTop(config) - size / 2)) };
    if (panel === 'front') return { x: c.depth - ft / 2, y: clamp(along, size / 2, c.height - size / 2) };
    if (panel === 'top') return { x: clamp(along, size / 2, c.depth - size / 2), y: ft / 2 };
    return { x: clamp(along, size / 2, c.depth - size / 2), y: c.height - ft / 2 };
  }

  function wallLabel(panel, along, comps) {
    const names = { rear: 'Rear wall', front: 'Front wall', top: 'Roof', bottom: 'Floor' };
    if (panel === 'rear' && along >= comps.pcie.top - 10 && along <= comps.pcie.bottom + 10) return 'Rear wall · PCIe slot area';
    return names[panel];
  }

  function customFans(config, comps) {
    const list = Array.isArray(config.customFans) ? config.customFans : [];
    return list.map((raw, index) => {
      const cf = Object.assign({ size: 120, fan: 'arctic-p12', speed: 0.7, filter: 'none', dir: 'up', mount: { type: 'internal' } }, raw);
      if (cf.mount.type === 'wall') {
        const along = cf.mount.panel === 'rear' || cf.mount.panel === 'front' ? cf.y : cf.x;
        Object.assign(cf, wallPosition(config, cf.mount.panel, along, cf.size));
        if (cf.dir !== INWARD[cf.mount.panel] && cf.dir !== OPPOSITE[INWARD[cf.mount.panel]]) cf.dir = OPPOSITE[INWARD[cf.mount.panel]];
      }
      cf.index = index;
      cf.label = `Custom fan ${index + 1}`;
      cf.rect = customFanRect(cf);
      cf.mode = customFanMode(cf);
      cf.where = cf.mount.type === 'wall' ? wallLabel(cf.mount.panel, cf.mount.panel === 'rear' || cf.mount.panel === 'front' ? cf.y : cf.x, comps)
        : cf.mount.anchor === 'gpu' ? 'Under the GPU' : cf.mount.anchor === 'cooler' ? 'In front of the CPU cooler' : 'Inside the case';
      return cf;
    });
  }

  function snapCustomFan(config, layoutResult, x, y, size, current) {
    const P = AF.data.PHYSICS;
    const c = config.case;
    const ft = P.fanThickness;
    const comps = layoutResult.components;
    const grid = (v) => Math.round(v / GRID_MM) * GRID_MM;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const prev = current || {};

    for (const s of layoutResult.slots) {
      if (!s.available || s.axis === 'z' || s.size !== size) continue;
      const inward = { front: [-1, 0], rear: [1, 0], top: [0, 1], bottom: [0, -1] }[s.panel];
      const cx = s.cx + inward[0] * ft / 2;
      const cy = s.cy + inward[1] * ft / 2;
      if (Math.hypot(x - cx, y - cy) < SLOT_SNAP_MM) {
        return { kind: 'slot', slotId: s.id, x: cx, y: cy, dir: INWARD[s.panel], label: `${AF.data.PANELS[s.panel].name} slot ${s.index + 1}` };
      }
    }

    const walls = [
      { panel: 'rear', d: x, along: y },
      { panel: 'front', d: c.depth - x, along: y },
      { panel: 'top', d: y, along: x },
    ];
    if (!comps.shroud) walls.push({ panel: 'bottom', d: c.height - y, along: x });
    const wall = walls.filter((w) => w.d < WALL_SNAP_MM).sort((a, b) => a.d - b.d)[0];
    if (wall) {
      const pos = wallPosition(config, wall.panel, grid(wall.along), size);
      let fitNote = '';
      if (wall.panel === 'rear') {
        const g0 = comps.gpu;
        const top = g0.pcbTop - 6;
        const bottom = g0.sinkBottom + 4;
        if (pos.y + size / 2 > top && pos.y - size / 2 < bottom) {
          const below = bottom + size / 2;
          const above = top - size / 2;
          const belowFits = below + size / 2 <= shroudTop(config);
          const aboveFits = above - size / 2 >= 0;
          const preferBelow = Math.abs(pos.y - below) <= Math.abs(pos.y - above);
          if (belowFits && (preferBelow || !aboveFits)) pos.y = below;
          else if (aboveFits) pos.y = above;
          else fitNote = ` · ${size} mm does not fit here, try a smaller fan`;
          if (!belowFits && preferBelow && aboveFits) fitNote = ` · no room for ${size} mm below the GPU (${Math.round(shroudTop(config) - bottom)} mm free), try a smaller fan`;
        }
      }
      const prevMode = prev.mount && prev.mount.type === 'wall' ? (prev.dir === INWARD[prev.mount.panel] ? 'intake' : 'exhaust') : null;
      const mode = prevMode || (wall.panel === 'front' || wall.panel === 'bottom' ? 'intake' : 'exhaust');
      const dir = mode === 'intake' ? INWARD[wall.panel] : OPPOSITE[INWARD[wall.panel]];
      const along = wall.panel === 'rear' || wall.panel === 'front' ? pos.y : pos.x;
      return { kind: 'custom', x: pos.x, y: pos.y, dir, mount: { type: 'wall', panel: wall.panel }, label: `${wallLabel(wall.panel, along, comps)} · ${mode}${fitNote}`, blocked: !!fitNote };
    }

    const g = comps.gpu;
    if (x > 5 && x < g.length + 10 && y > g.sinkBottom - 15 && y < g.sinkBottom + 95) {
      return {
        kind: 'custom', x: clamp(grid(x), size / 2 + 5, Math.max(size / 2 + 5, g.length - size / 2)), y: g.sinkBottom + 8 + ft / 2,
        dir: 'up', mount: { type: 'internal', anchor: 'gpu' }, label: 'Under the GPU · blowing up into it',
      };
    }

    const b = comps.cpuCooler.bounds;
    if (b && y > b.y && y < b.y + b.h && x > b.x + b.w - 5 && x < b.x + b.w + 80) {
      return {
        kind: 'custom', x: b.x + b.w + 6 + ft / 2, y: b.y + b.h / 2,
        dir: 'left', mount: { type: 'internal', anchor: 'cooler' }, label: 'In front of the CPU cooler · blowing into it',
      };
    }

    const half = size / 2;
    const dir = prev.mount && prev.mount.type === 'internal' && prev.dir ? prev.dir : 'up';
    return {
      kind: 'custom', x: clamp(grid(x), half, c.depth - half), y: clamp(grid(y), half, c.height - half),
      dir, mount: { type: 'internal' }, label: `Inside the case · blowing ${dir}`,
    };
  }

  function customFanSpots(config, layoutResult, size, current) {
    const comps = layoutResult.components;
    const c = config.case;
    const g = comps.gpu;
    const snapAt = (x, y, prev) => snapCustomFan(config, layoutResult, x, y, size, prev);
    const spots = [
      { id: 'gpu', label: 'Under the GPU, blowing up into it', snap: snapAt(Math.min(g.length, c.depth) * 0.55, g.sinkBottom + 40, null) },
      { id: 'pcie', label: 'Rear PCIe slot area, below the GPU', snap: snapAt(8, g.sinkBottom + size / 2 + 6, current && current.spot === 'pcie' ? current : null) },
    ];
    const b = comps.cpuCooler.bounds;
    if (b && comps.cpuCooler.type === 'tower') spots.push({ id: 'cooler', label: 'In front of the CPU cooler', snap: snapAt(b.x + b.w + 30, b.y + b.h / 2, null) });
    const floor = comps.shroud ? comps.shroud.y : c.height;
    spots.push({ id: 'floor', label: comps.shroud ? 'On the PSU shroud, blowing up' : 'Near the floor, blowing up', snap: snapAt(c.depth * 0.68, floor - 60, { mount: { type: 'internal' }, dir: 'up' }) });
    spots.push({ id: 'center', label: 'Middle of the case, blowing to the rear', snap: snapAt(c.depth * 0.55, c.height * 0.42, { mount: { type: 'internal' }, dir: 'left' }) });
    for (const s of spots) {
      if (s.snap.kind === 'slot') s.snap.blocked = true;
      if (s.snap.blocked) s.reason = s.snap.kind === 'slot' ? 'a fan slot is there' : `no room for ${size} mm`;
    }
    return spots;
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  }

  function customFanIssues(config, slots, comps, fans) {
    const issues = [];
    const g = comps.gpu;
    const gpuBox = { x: 0, y: g.pcbTop, w: g.length, h: g.sinkBottom - g.pcbTop };
    for (const cf of fans) {
      const r = cf.rect;
      if (rectsOverlap(r, gpuBox)) issues.push({ level: 'error', text: `${cf.label} overlaps the graphics card.`, fix: 'Pick another position for it.' });
      if (comps.cpuCooler.bounds && rectsOverlap(r, comps.cpuCooler.bounds)) issues.push({ level: 'error', text: `${cf.label} overlaps the CPU cooler.`, fix: 'Pick another position for it.' });
      if (comps.shroud && rectsOverlap(r, { x: 0, y: comps.shroud.y, w: comps.shroud.x1, h: config.case.height - comps.shroud.y })) {
        issues.push({ level: 'error', text: `${cf.label} sits inside the PSU shroud.`, fix: 'Pick another position for it.' });
      }
      for (const other of fans) {
        if (other.index > cf.index && rectsOverlap(r, other.rect)) issues.push({ level: 'error', text: `${cf.label} overlaps ${other.label}.`, fix: 'Move one of them.' });
      }
      if (cf.mount.type === 'wall') {
        for (const s of slots) {
          if (s.panel !== cf.mount.panel || slotConfig(config, s.id).mode === 'empty') continue;
          const along = s.panel === 'rear' || s.panel === 'front' ? [s.cy, cf.y] : [s.cx, cf.x];
          if (Math.abs(along[0] - along[1]) < (s.size + cf.size) / 2) issues.push({ level: 'error', text: `${cf.label} overlaps the ${AF.data.PANELS[s.panel].name.toLowerCase()} slot ${s.index + 1} fan.`, fix: 'Pick another position or a smaller size.' });
        }
        const type = AF.data.PANEL_TYPES[config.case.panels[cf.mount.panel].type];
        if (!type.allowsFans || type.zeta === 0) issues.push({ level: 'info', text: `${cf.label} needs a cut-out or bracket in the ${cf.mount.panel} panel.` });
      }
    }
    return issues;
  }

  function layout(config) {
    const slots = buildSlots(config);
    const components = buildComponents(config, slots);
    const fans = customFans(config, components);
    const issues = clearanceIssues(config, slots, components).concat(customFanIssues(config, slots, components, fans));
    const radIds = new Set(components.radiator ? components.radiator.slots.map((s) => s.id) : []);
    for (const s of slots) s.radiator = radIds.has(s.id);
    return { slots, components, issues, shroudTop: shroudTop(config), grille: grilleOf(config), customFans: fans };
  }

  AF.geometry = { layout, slotConfig, frontSlotCapacity, motherboardOf, boardTop, towerFans, snapCustomFan, customFanSpots, customFanRect, INWARD, OPPOSITE };

  if (typeof module === 'object' && module.exports) module.exports = AF;
})(typeof window !== 'undefined' ? window : globalThis);
