(function (root) {
  const AF = root.AF || (root.AF = {});

  const UNITS = {
    CFM_TO_M3S: 0.00047194745,
    M3H_TO_M3S: 1 / 3600,
    MMH2O_TO_PA: 9.80665,
  };

  const PHYSICS = {
    gravity: 9.81,
    airGasConstant: 287.05,
    airCp: 1006,
    atmosphericPressure: 101325,
    fanCurveExponent: 1.5,
    stalledOpenAreaRatio: 0.45,
    dischargeCoefficient: 0.62,
    leakageAreaMm2: 900,
    pcieSlotPitchMm: 20.32,
    pcieSlotCount: 7,
    pcieSlotOpenAreaMm2: 420,
    gpuBracketOpenAreaMm2: 700,
    radiatorCoefficient: 9,
    radiatorExponent: 1.75,
    radiatorReferenceThickness: 27,
    radiatorThicknessThermalExponent: 0.35,
    thermalFlowExponent: 0.8,
    minimumCoolerFlowCfm: 2,
    pasteResistance: 0.03,
    aioBlockResistance: 0.035,
    turbulentDiffusivity: 0.0006,
    velocityDamping: 0.8,
    neutralPressurePa: 0.5,
    stagnantSpeed: 0.08,
    shroudHeight: 85,
    shroudFrontGap: 40,
    maxFrontSlots: 3,
    motherboardTopOffset: 45,
    motherboardRearOffset: 10,
    fanThickness: 25,
    slotGap: 8,
    panelEdge: 15,
    topRearOffset: 45,
    gpuPcbThickness: 6,
  };

  const FANS = [
    { id: 'noctua-a12x25', name: 'Noctua NF-A12x25 PWM', size: 120, rpm: 2000, cfm: 60.1, mmh2o: 2.34 },
    { id: 'noctua-f12', name: 'Noctua NF-F12 PWM', size: 120, rpm: 1500, cfm: 55.0, mmh2o: 2.61 },
    { id: 'arctic-p12', name: 'Arctic P12 PWM PST', size: 120, rpm: 1800, cfm: 56.3, mmh2o: 2.2 },
    { id: 'arctic-p12-max', name: 'Arctic P12 Max', size: 120, rpm: 3300, cfm: 81.0, mmh2o: 4.6 },
    { id: 'lianli-sl120', name: 'Lian Li UNI FAN SL120', size: 120, rpm: 1900, cfm: 58.5, mmh2o: 2.6 },
    { id: 'generic-120', name: 'Generic bundled 120 mm', size: 120, rpm: 1200, cfm: 42, mmh2o: 1.2 },
    { id: 'noctua-a14', name: 'Noctua NF-A14 PWM', size: 140, rpm: 1500, cfm: 82.5, mmh2o: 2.08 },
    { id: 'arctic-p14', name: 'Arctic P14 PWM PST', size: 140, rpm: 1700, cfm: 72.8, mmh2o: 2.4 },
    { id: 'generic-140', name: 'Generic bundled 140 mm', size: 140, rpm: 1000, cfm: 62, mmh2o: 1.0 },
    { id: 'noctua-a20', name: 'Noctua NF-A20 PWM', size: 200, rpm: 800, cfm: 85.1, mmh2o: 1.08 },
    { id: 'generic-200', name: 'Generic 200 mm', size: 200, rpm: 700, cfm: 90, mmh2o: 0.85 },
  ];

  const PANEL_TYPES = {
    mesh: { name: 'High-airflow mesh', zeta: 0.9, openRatio: 0.7, allowsFans: true },
    perforated: { name: 'Perforated steel', zeta: 3.0, openRatio: 0.45, allowsFans: true },
    restricted: { name: 'Glass/solid with side gaps', zeta: 7.5, openRatio: 0.18, allowsFans: true },
    solid: { name: 'Solid / glass (sealed)', zeta: 0, openRatio: 0, allowsFans: false },
  };

  const FILTERS = {
    none: { name: 'No filter', zeta: 0 },
    nylon: { name: 'Nylon dust filter', zeta: 1.3 },
    fine: { name: 'Fine mesh filter', zeta: 2.6 },
  };

  const PANELS = {
    front: { name: 'Front', sizes: [120, 140, 200] },
    top: { name: 'Top', sizes: [120, 140] },
    rear: { name: 'Rear', sizes: [92, 120, 140] },
    bottom: { name: 'Bottom', sizes: [120, 140] },
    side: { name: 'Side panel', sizes: [120, 140] },
  };

  const MOTHERBOARDS = [
    { id: 'atx-slot2', name: 'ATX · GPU in slot 2 (most common)', form: 'ATX', width: 244, height: 305, socketX: 141, socketY: 78, slot1Y: 160, slotCount: 7, x16Slot: 2 },
    { id: 'atx-slot1', name: 'ATX · GPU in slot 1 (GPU close to CPU)', form: 'ATX', width: 244, height: 305, socketX: 141, socketY: 72, slot1Y: 160, slotCount: 7, x16Slot: 1 },
    { id: 'atx-slot3', name: 'ATX · GPU in slot 3 (M.2 above GPU)', form: 'ATX', width: 244, height: 305, socketX: 141, socketY: 80, slot1Y: 160, slotCount: 7, x16Slot: 3 },
    { id: 'atx-low-socket', name: 'ATX · low socket, large VRM area', form: 'ATX', width: 244, height: 305, socketX: 135, socketY: 92, slot1Y: 160, slotCount: 7, x16Slot: 2 },
    { id: 'eatx', name: 'E-ATX (305 × 330 mm)', form: 'E-ATX', width: 330, height: 305, socketX: 165, socketY: 80, slot1Y: 160, slotCount: 7, x16Slot: 1 },
    { id: 'matx', name: 'Micro-ATX', form: 'mATX', width: 244, height: 244, socketX: 141, socketY: 76, slot1Y: 160, slotCount: 4, x16Slot: 1 },
    { id: 'itx', name: 'Mini-ITX', form: 'ITX', width: 170, height: 170, socketX: 102, socketY: 65, slot1Y: 157, slotCount: 1, x16Slot: 1 },
  ];

  function motherboardConfig(id) {
    const m = MOTHERBOARDS.find((x) => x.id === id) || MOTHERBOARDS[0];
    return { model: m.id, width: m.width, height: m.height, socketX: m.socketX, socketY: m.socketY, slot1Y: m.slot1Y, slotCount: m.slotCount, x16Slot: m.x16Slot };
  }

  const LEGACY_FORM_FACTORS = { atx: 'atx-slot2', matx: 'matx', itx: 'itx' };



  const CPU_COOLERS = {
    stock: {
      name: 'Stock top-down cooler', type: 'topdown', height: 70, footprint: 105,
      fan: { cfm: 38, mmh2o: 2.0, rpm: 2800, size: 92 }, fanCount: 1,
      sinkCoef: 7, sinkExp: 1.75, rBase: 0.08, rRef: 0.34, qRefCfm: 22,
    },
    lowprofile: {
      name: 'Low-profile top-down cooler', type: 'topdown', height: 47, footprint: 95,
      fan: { cfm: 40, mmh2o: 2.2, rpm: 2500, size: 92 }, fanCount: 1,
      sinkCoef: 6, sinkExp: 1.75, rBase: 0.06, rRef: 0.24, qRefCfm: 24,
    },
    'tower-single': {
      name: 'Single-tower air cooler', type: 'tower', height: 155, fanSize: 120, defaultFanCount: 1, maxFanCount: 2,
      depth: 52, finHeight: 125, sinkCoef: 6.5, sinkExp: 1.75, rBase: 0.05, rRef: 0.105, qRefCfm: 40,
      defaultFan: 'arctic-p12',
    },
    'tower-dual': {
      name: 'Dual-tower air cooler', type: 'tower', height: 165, fanSize: 140, defaultFanCount: 2, maxFanCount: 3,
      depth: 130, finHeight: 145, sinkCoef: 13, sinkExp: 1.75, rBase: 0.04, rRef: 0.065, qRefCfm: 55,
      defaultFan: 'noctua-a14',
    },
    aio: {
      name: 'AIO liquid cooler', type: 'aio', height: 60, footprint: 70,
      sectionResistance: { 120: 0.17, 140: 0.14 }, sectionRefCfm: { 120: 40, 140: 50 },
    },
  };

  const RADIATOR_THICKNESS = [27, 30, 38, 45, 54, 60];


  const GPU_COOLERS = {
    'open-dual': {
      name: 'Open-air, 2 fans', type: 'open', fanCount: 2, flowThrough: false,
      fan: { cfm: 38, mmh2o: 3.0, rpm: 3000, size: 95 },
      sinkCoef: 8, sinkExp: 1.75, rBase: 0.02, rRef: 0.075, qRefCfm: 32,
    },
    'open-triple': {
      name: 'Open-air, 3 fans (flow-through)', type: 'open', fanCount: 3, flowThrough: true,
      fan: { cfm: 38, mmh2o: 3.0, rpm: 3000, size: 95 },
      sinkCoef: 8, sinkExp: 1.75, rBase: 0.02, rRef: 0.045, qRefCfm: 50,
    },
    blower: {
      name: 'Blower (exhausts through bracket)', type: 'blower', fanCount: 1, flowThrough: false,
      fan: { cfm: 24, mmh2o: 18, rpm: 4000, size: 65 },
      sinkCoef: 6, sinkExp: 2, sinkAreaM2: 0.0018, rBase: 0.03, rRef: 0.11, qRefCfm: 16,
    },
  };

  function slot(mode, fan, speed, filter) {
    return { mode, fan, speed, filter: filter || 'none' };
  }

  function baseConfig() {
    return {
      version: 2,
      ambient: 24,
      otherHeat: 40,
      workload: 'stress',
      units: { flow: 'cfm', pressure: 'pa' },
      case: {
        name: 'Mesh mid-tower',
        height: 470, depth: 450, width: 230,
        motherboard: motherboardConfig('atx-slot2'), shroud: true, pcieVented: true, frontSlots: 3,
        panels: {
          front: { type: 'mesh', fanSize: 140 },
          top: { type: 'mesh', fanSize: 140 },
          rear: { type: 'perforated', fanSize: 120 },
          bottom: { type: 'mesh', fanSize: 120 },
          side: { type: 'solid', fanSize: 120 },
        },
      },
      customFans: [],
      slots: {
        'front-0': slot('intake', 'arctic-p14', 0.7, 'nylon'),
        'front-1': slot('intake', 'arctic-p14', 0.7, 'nylon'),
        'rear-0': slot('exhaust', 'arctic-p12', 0.7),
      },
      cpu: {
        model: 'r7-7800x3d', socket: 'AM5', power: 88, rjc: 0.36, tjmax: 89,
        cooler: 'tower-single', coolerModel: 'generic-tower-single', coolerFan: 'arctic-p12', coolerFanCount: 1, coolerFanSpeed: 0.7,
        aio: { panel: 'top', fans: 3, thickness: 27, pushPull: false },
      },
      gpu: {
        model: 'rtx4070tis-ventus', power: 285, length: 308, slots: 2.5, cooler: 'open-triple', flowThrough: true,
        rjc: 0.05, tmax: 88, fanSpeed: 0.6, fanCount: 3,
      },
    };
  }

  function preset(id, name, mutate) {
    const config = baseConfig();
    mutate(config);
    return { id, name, config };
  }

  const PRESETS = [
    preset('mesh-mid', 'Mesh mid-tower: 2 front intake, 1 rear exhaust', () => {}),
    preset('mesh-mid-3front', 'Mesh mid-tower: 3 front intake, 1 rear exhaust', (c) => {
      c.slots['front-2'] = slot('intake', 'arctic-p14', 0.7, 'nylon');
    }),
    preset('mesh-mid-full', 'Mesh mid-tower: 3 front intake, rear + top exhaust', (c) => {
      c.slots['front-2'] = slot('intake', 'arctic-p14', 0.7, 'nylon');
      c.slots['top-1'] = slot('exhaust', 'arctic-p14', 0.6);
    }),
    preset('glass-front', 'Glass-front mid-tower (restricted intake)', (c) => {
      c.case.name = 'Glass-front mid-tower';
      c.case.panels.front = { type: 'restricted', fanSize: 120 };
      c.case.panels.top = { type: 'perforated', fanSize: 120 };
      c.slots = {
        'front-0': slot('intake', 'generic-120', 0.8, 'nylon'),
        'front-1': slot('intake', 'generic-120', 0.8, 'nylon'),
        'front-2': slot('intake', 'generic-120', 0.8, 'nylon'),
        'rear-0': slot('exhaust', 'generic-120', 0.8),
        'top-0': slot('exhaust', 'generic-120', 0.8),
        'top-1': slot('exhaust', 'generic-120', 0.8),
      };
    }),
    preset('aio-top', 'Front intake + 360 AIO top exhaust, i9 + RTX 4090', (c) => {
      c.case.panels.front.fanSize = 120;
      c.case.panels.top.fanSize = 120;
      c.slots = {
        'front-0': slot('intake', 'arctic-p12', 0.8, 'nylon'),
        'front-1': slot('intake', 'arctic-p12', 0.8, 'nylon'),
        'front-2': slot('intake', 'arctic-p12', 0.8, 'nylon'),
        'top-0': slot('exhaust', 'arctic-p12', 0.75),
        'top-1': slot('exhaust', 'arctic-p12', 0.75),
        'top-2': slot('exhaust', 'arctic-p12', 0.75),
        'rear-0': slot('exhaust', 'arctic-p12', 0.7),
      };
      Object.assign(c.cpu, { model: 'i9-14900k', socket: 'LGA1700', power: 253, rjc: 0.17, tjmax: 100, cooler: 'aio', coolerModel: 'generic-aio' });
      c.cpu.aio = { panel: 'top', fans: 3, thickness: 27, pushPull: false };
      Object.assign(c.gpu, { model: 'rtx4090-suprim', power: 450, length: 336, slots: 3.8, cooler: 'open-triple', flowThrough: true, rjc: 0.03, fanSpeed: 0.65 });
    }),
    preset('dual-chamber', 'Dual-chamber showcase: bottom + side intake, top exhaust', (c) => {
      c.case.name = 'Dual-chamber showcase';
      c.case.height = 460; c.case.depth = 470; c.case.width = 285;
      c.case.shroud = false;
      c.case.panels = {
        front: { type: 'solid', fanSize: 120 },
        top: { type: 'mesh', fanSize: 120 },
        rear: { type: 'perforated', fanSize: 120 },
        bottom: { type: 'mesh', fanSize: 120 },
        side: { type: 'mesh', fanSize: 120 },
      };
      c.slots = {
        'bottom-0': slot('intake', 'lianli-sl120', 0.7, 'nylon'),
        'bottom-1': slot('intake', 'lianli-sl120', 0.7, 'nylon'),
        'bottom-2': slot('intake', 'lianli-sl120', 0.7, 'nylon'),
        'side-0': slot('intake', 'lianli-sl120', 0.7, 'nylon'),
        'side-1': slot('intake', 'lianli-sl120', 0.7, 'nylon'),
        'top-0': slot('exhaust', 'lianli-sl120', 0.7),
        'top-1': slot('exhaust', 'lianli-sl120', 0.7),
        'top-2': slot('exhaust', 'lianli-sl120', 0.7),
        'rear-0': slot('exhaust', 'lianli-sl120', 0.7),
      };
    }),
    preset('itx', 'Compact Mini-ITX', (c) => {
      c.case.name = 'Compact Mini-ITX';
      c.case.height = 380; c.case.depth = 370; c.case.width = 200;
      c.case.motherboard = motherboardConfig('itx');
      c.case.shroud = false;
      c.case.panels.front = { type: 'mesh', fanSize: 120 };
      c.case.panels.top = { type: 'mesh', fanSize: 120 };
      c.case.panels.bottom = { type: 'perforated', fanSize: 120 };
      c.slots = {
        'front-0': slot('intake', 'noctua-a12x25', 0.7, 'nylon'),
        'front-1': slot('intake', 'noctua-a12x25', 0.7, 'nylon'),
        'rear-0': slot('exhaust', 'noctua-a12x25', 0.7),
      };
      Object.assign(c.cpu, { model: 'r7-9700x', socket: 'AM5', power: 88, rjc: 0.3, tjmax: 95, cooler: 'lowprofile', coolerModel: 'generic-lowprofile' });
      Object.assign(c.gpu, { model: 'rtx4060ti-dual', power: 160, length: 227, slots: 2.5, cooler: 'open-dual', flowThrough: false, rjc: 0.08, fanCount: 2 });
    }),
    preset('negative', 'Exhaust-heavy (negative pressure) example', (c) => {
      c.case.panels.top.fanSize = 120;
      c.slots = {
        'front-0': slot('intake', 'arctic-p14', 0.5, 'nylon'),
        'rear-0': slot('exhaust', 'arctic-p12', 1.0),
        'top-0': slot('exhaust', 'arctic-p12', 1.0),
        'top-1': slot('exhaust', 'arctic-p12', 1.0),
        'top-2': slot('exhaust', 'arctic-p12', 1.0),
      };
    }),
  ];

  AF.data = {
    UNITS, PHYSICS, FANS, PANEL_TYPES, FILTERS, PANELS, MOTHERBOARDS, motherboardConfig, LEGACY_FORM_FACTORS,
    CPU_COOLERS, RADIATOR_THICKNESS, GPU_COOLERS, PRESETS, baseConfig,
  };

  if (typeof module === 'object' && module.exports) module.exports = AF;
})(typeof window !== 'undefined' ? window : globalThis);
