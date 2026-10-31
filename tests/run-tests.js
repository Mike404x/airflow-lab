const path = require('path');
const AF = require(path.join(__dirname, '..', 'js', 'data.js'));
require(path.join(__dirname, '..', 'js', 'catalog.js'));
require(path.join(__dirname, '..', 'js', 'catalog-more.js'));
require(path.join(__dirname, '..', 'js', 'geometry.js'));
require(path.join(__dirname, '..', 'js', 'physics.js'));
require(path.join(__dirname, '..', 'js', 'cfd.js'));

const CFM = AF.data.UNITS.CFM_TO_M3S;
let failures = 0;
let passes = 0;

function check(name, condition, detail) {
  if (condition) { passes++; return; }
  failures++;
  console.log(`FAIL ${name}${detail ? ` -> ${detail}` : ''}`);
}

function clone(o) { return JSON.parse(JSON.stringify(o)); }

function solve(config) {
  const layout = AF.geometry.layout(config);
  const air = AF.physics.solveAirflow(config, layout);
  const thermal = AF.physics.solveThermal(config, layout, air, null);
  return { layout, air, thermal };
}

function fanCurveTests() {
  const rho = AF.physics.airDensity(25);
  const fan = AF.physics.makeFan({ cfm: 60, mmh2o: 2, size: 120 }, rho);
  const el = { fans: [{ fan, speed: 1 }], losses: [] };
  check('free air flow equals spec', Math.abs(AF.physics.solveFlow(el, 0) - 60 * CFM) < 1e-6);
  check('zero flow at max static pressure', Math.abs(AF.physics.solveFlow(el, 2 * 9.80665)) < 1e-6);
  check('backflow above max pressure', AF.physics.solveFlow(el, 40) < 0);
  const half = { fans: [{ fan, speed: 0.5 }], losses: [] };
  check('affinity law flow ~ speed', Math.abs(AF.physics.solveFlow(half, 0) - 30 * CFM) < 1e-6);
  check('affinity law pressure ~ speed^2', Math.abs(AF.physics.fanPressure(fan, 0.5, 0) - 0.25 * 2 * 9.80665) < 1e-9);
  const series = { fans: [{ fan, speed: 1 }, { fan, speed: 1 }], losses: [] };
  check('series fans double pressure', Math.abs(AF.physics.developed(series, 0) - 4 * 9.80665) < 1e-9);
}

function balanceTests() {
  for (const p of AF.data.PRESETS) {
    const { air } = solve(p.config);
    const scale = Math.max(air.throughFlow, 1e-3);
    check(`${p.id}: mass balance closes`, Math.abs(air.imbalance) / scale < 1e-6, air.imbalance);
    const out = air.fanOut + air.passiveOut;
    check(`${p.id}: inflow equals outflow`, Math.abs(air.throughFlow - out) / scale < 1e-6);
  }
  const base = clone(AF.data.PRESETS[0].config);
  const more = clone(base);
  more.slots['rear-0'].speed = 1;
  more.slots['top-0'] = { mode: 'exhaust', fan: 'arctic-p14', speed: 1 };
  check('adding exhaust lowers case pressure', solve(more).air.pressure < solve(base).air.pressure);
  const filtered = clone(base);
  filtered.slots['front-0'].filter = 'fine';
  const f0 = solve(base).air.elements.find((e) => e.id === 'front-0').q;
  const f1 = solve(filtered).air.elements.find((e) => e.id === 'front-0').q;
  check('finer filter reduces fan flow', f1 < f0);
}

function thermalTests() {
  const base = clone(AF.data.PRESETS[0].config);
  const { air, thermal } = solve(base);
  const expectedRise = thermal.caseHeat / (air.rho * AF.data.PHYSICS.airCp * air.throughFlow);
  check('well-mixed energy balance', Math.abs(thermal.caseRise - expectedRise) < 1e-6);
  const hot = clone(base);
  hot.ambient = 34;
  check('ambient raises CPU temperature', solve(hot).thermal.cpu.temp > thermal.cpu.temp);
  const slow = clone(base);
  slow.cpu.coolerFanSpeed = 0.3;
  check('slower cooler fan raises CPU temperature', solve(slow).thermal.cpu.temp > thermal.cpu.temp);
  const throttle = clone(base);
  throttle.cpu.power = 400;
  const t = solve(throttle).thermal;
  check('throttling caps CPU at Tjmax', t.cpu.throttled && Math.abs(t.cpu.temp - throttle.cpu.tjmax) < 0.05, t.cpu.temp);
  const aio = clone(AF.data.PRESETS.find((p) => p.id === 'aio-top').config);
  aio.cpu.power = 150;
  const exhaustRad = solve(aio).thermal;
  aio.cpu.aio.panel = 'front';
  const intakeRad = solve(aio).thermal;
  check('intake radiator cools CPU better', intakeRad.cpu.temp < exhaustRad.cpu.temp || intakeRad.cpu.power > exhaustRad.cpu.power);
  check('intake radiator heats GPU', intakeRad.gpu.temp > exhaustRad.gpu.temp);
}

function cfdTests() {
  for (const p of AF.data.PRESETS) {
    const { layout, air, thermal } = solve(p.config);
    const sim = new AF.CaseSim(p.config, layout, air, thermal, null);
    const start = Date.now();
    const steps = Math.ceil(Math.max(4, 5 * sim.flushTime) / sim.dt);
    sim.advance(steps);
    const ms = (Date.now() - start) / steps;
    let finite = true;
    for (const t of sim.T) if (!Number.isFinite(t)) finite = false;
    check(`${p.id}: CFD stays finite`, finite);

    const { nx, ny, type, u, v } = sim;
    let maxDiv = 0;
    let sumSrc = 0;
    for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
      const c = i + j * nx;
      if (type[c] !== 0) continue;
      const d = (u[i + 1 + j * (nx + 1)] - u[i + j * (nx + 1)] + v[i + (j + 1) * nx] - v[i + j * nx]) / sim.dx - sim.src[c];
      maxDiv = Math.max(maxDiv, Math.abs(d));
      sumSrc += sim.src[c];
    }
    check(`${p.id}: CFD divergence small`, maxDiv < 5, maxDiv.toFixed(3));

    let heatOut = 0;
    let flowOut = 0;
    let flowIn = 0;
    const rhoCpW = sim.rhoCp * sim.width * sim.dx;
    const T = sim.T;
    for (let j = 0; j < ny; j++) for (let i = 0; i <= nx; i++) {
      const k = i + j * (nx + 1);
      const a = i > 0 ? type[i - 1 + j * nx] : 1;
      const b = i < nx ? type[i + j * nx] : 1;
      if ((a === 0) === (b === 0)) continue;
      const vel = u[k];
      const outward = a === 0 ? vel : -vel;
      const fluidCell = a === 0 ? i - 1 + j * nx : i + j * nx;
      if (outward > 0) { heatOut += rhoCpW * outward * (T[fluidCell] - sim.Tamb); flowOut += outward * sim.width * sim.dx; } else flowIn -= outward * sim.width * sim.dx;
    }
    for (let j = 0; j <= ny; j++) for (let i = 0; i < nx; i++) {
      const k = i + j * nx;
      const a = j > 0 ? type[i + (j - 1) * nx] : 1;
      const b = j < ny ? type[i + j * nx] : 1;
      if ((a === 0) === (b === 0)) continue;
      const vel = v[k];
      const outward = a === 0 ? vel : -vel;
      const fluidCell = a === 0 ? i + (j - 1) * nx : i + j * nx;
      if (outward > 0) { heatOut += rhoCpW * outward * (T[fluidCell] - sim.Tamb); flowOut += outward * sim.width * sim.dx; } else flowIn -= outward * sim.width * sim.dx;
    }
    for (const c of sim.srcCells) {
      const q = sim.src[c] * sim.width * sim.dx * sim.dx;
      if (q < 0) { heatOut += sim.rhoCp * -q * (T[c] - sim.Tamb); flowOut -= q; } else flowIn += q;
    }
    let heatIn = 0;
    for (const c of sim.heatCells) heatIn += sim.heat[c] * sim.rhoCp * sim.width * sim.dx * sim.dx;
    const flowErr = Math.abs(flowOut - flowIn) / flowIn;
    const heatErr = Math.abs(heatOut - heatIn) / heatIn;
    check(`${p.id}: CFD conserves mass (${(flowErr * 100).toFixed(2)}%)`, flowErr < 0.01);
    check(`${p.id}: CFD throughput >= network`, flowIn >= air.throughFlow * 0.97);
    check(`${p.id}: CFD heat balance (${(heatErr * 100).toFixed(1)}%)`, heatErr < 0.15);
    const stats = sim.stats();
    const simThermal = AF.physics.solveThermal(p.config, layout, air, stats.inlets);
    console.log(`  ${p.id.padEnd(14)} ${ms.toFixed(2)} ms/step, ${steps} steps, dt ${(sim.dt * 1000).toFixed(1)} ms | net flow ${(air.throughFlow / CFM).toFixed(0)} CFM, CFD out ${(flowOut / CFM).toFixed(0)} | heat in ${heatIn.toFixed(0)} W out ${heatOut.toFixed(0)} W | inlet CPU ${stats.inlets.cpu.toFixed(1)} GPU ${stats.inlets.gpu.toFixed(1)} (mixed ${thermal.caseTemp.toFixed(1)}) | CPU ${simThermal.cpu.temp.toFixed(1)} GPU ${simThermal.gpu.temp.toFixed(1)} | stagnant ${(stats.stagnant * 100).toFixed(0)}%`);
  }
}

function edgeCaseTests() {
  const scenarios = {
    'no fans': (c) => { c.slots = {}; },
    'stopped fan': (c) => { c.slots['front-0'].speed = 0; },
    'huge imbalance': (c) => {
      c.case.panels.top.fanSize = 120;
      for (const id of ['top-0', 'top-1', 'top-2']) c.slots[id] = { mode: 'exhaust', fan: 'arctic-p12-max', speed: 1 };
      c.slots['rear-0'] = { mode: 'exhaust', fan: 'arctic-p12-max', speed: 1 };
      c.case.pcieVented = false;
    },
    'custom fan': (c) => { c.slots['front-0'] = { mode: 'intake', fan: 'custom', custom: { cfm: 120, mmh2o: 6, rpm: 3000 }, speed: 1 }; },
    'empty radiator': (c) => { c.cpu.cooler = 'aio'; c.cpu.aio = { panel: 'top', fans: 2, thickness: 45, pushPull: true }; },
    'tiny case': (c) => { c.case.height = 280; c.case.depth = 280; c.case.width = 150; c.case.motherboard = AF.data.motherboardConfig('itx'); },
    'giant case': (c) => { c.case.height = 700; c.case.depth = 650; c.case.width = 350; c.case.shroud = false; },
  };
  for (const [name, mutate] of Object.entries(scenarios)) {
    const config = clone(AF.data.PRESETS[0].config);
    mutate(config);
    try {
      const { layout, air, thermal } = solve(config);
      check(`${name}: pressure finite`, Number.isFinite(air.pressure), air.pressure);
      check(`${name}: temps finite`, Number.isFinite(thermal.cpu.temp) && Number.isFinite(thermal.gpu.temp));
      const sim = new AF.CaseSim(config, layout, air, thermal, null);
      sim.advance(150);
      check(`${name}: CFD finite`, sim.T.every(Number.isFinite) && sim.u.every(Number.isFinite));
      AF.physics.analyze(config, layout, air, thermal, sim.stats());
      if (name === 'stopped fan') check('stopped fan passes air backwards or acts as a vent', air.elements.find((e) => e.id === 'front-0').q <= 0.0001);
      if (name === 'huge imbalance') check('huge imbalance gives strong negative pressure', air.pressure < -5, air.pressure);
    } catch (err) {
      check(`${name}: no exception`, false, err.stack);
    }
  }
}

function motherboardTests() {
  const base = clone(AF.data.PRESETS[0].config);
  const gpuTop = (id) => {
    const c = clone(base);
    c.case.motherboard = AF.data.motherboardConfig(id);
    return AF.geometry.layout(c).components.gpu.pcbTop;
  };
  check('slot 1 GPU sits higher than slot 2', gpuTop('atx-slot1') < gpuTop('atx-slot2'));
  check('slot 3 GPU sits lower than slot 2', gpuTop('atx-slot3') > gpuTop('atx-slot2'));
  const low = clone(base);
  low.case.motherboard = AF.data.motherboardConfig('atx-low-socket');
  check('low socket moves CPU cooler down', AF.geometry.layout(low).components.cpuCooler.y > AF.geometry.layout(base).components.cpuCooler.y);
  const eatx = clone(base);
  eatx.case.motherboard = AF.data.motherboardConfig('eatx');
  eatx.case.depth = 330;
  check('E-ATX in a shallow case is flagged', AF.geometry.layout(eatx).issues.some((i) => i.level === 'error' && /motherboard/i.test(i.text)));
  const legacy = clone(base);
  delete legacy.case.motherboard;
  legacy.case.formFactor = 'itx';
  check('legacy formFactor still resolves', AF.geometry.motherboardOf(legacy).model === 'itx');
  for (const m of AF.data.MOTHERBOARDS) {
    const c = clone(base);
    c.case.motherboard = AF.data.motherboardConfig(m.id);
    const { layout, air, thermal } = solve(c);
    const sim = new AF.CaseSim(c, layout, air, thermal, null);
    sim.advance(120);
    check(`${m.id}: CFD finite`, sim.T.every(Number.isFinite));
    check(`${m.id}: temps finite`, Number.isFinite(thermal.cpu.temp) && Number.isFinite(thermal.gpu.temp));
  }
}

function catalogTests() {
  const C = AF.catalog;
  const fanIds = new Set(AF.data.FANS.map((f) => f.id));
  for (const k of C.CASES) for (const [, , fan] of k.stock) check(`case ${k.id}: bundled fan ${fan} exists`, fanIds.has(fan));
  for (const k of C.COOLERS) if (k.fan) {
    const fan = AF.data.FANS.find((f) => f.id === k.fan);
    check(`cooler ${k.id}: fan exists`, !!fan);
    const size = k.aio ? k.aio.size : k.fanSize;
    if (fan && size) check(`cooler ${k.id}: fan size matches`, fan.size === size, `${fan.size} vs ${size}`);
  }
  const ids = (list) => new Set(list.map((x) => x.id)).size === list.length;
  check('unique ids', [C.CPUS, C.GPUS, C.COOLERS, C.BOARDS, C.CASES, AF.data.FANS].every(ids));

  const run = (config, label) => {
    try {
      const { layout, air, thermal } = solve(config);
      const ok = Number.isFinite(air.pressure) && Number.isFinite(thermal.cpu.temp) && Number.isFinite(thermal.gpu.temp);
      check(`${label}: solves`, ok);
      return { layout, air, thermal };
    } catch (err) {
      check(`${label}: no exception`, false, err.stack);
      return null;
    }
  };
  const base = () => clone(AF.data.PRESETS[0].config);
  for (const k of C.CASES) {
    const cfg = base();
    C.applyCase(cfg, k.id);
    const r = run(cfg, `case ${k.id}`);
    if (!r) continue;
    const installed = k.stock.filter(([id]) => r.layout.slots.some((s) => s.id === id && s.available)).length;
    check(`case ${k.id}: all bundled fans land in slots`, installed === k.stock.length, `${installed}/${k.stock.length}`);
    const sim = new AF.CaseSim(cfg, r.layout, r.air, r.thermal, null);
    sim.advance(60);
    check(`case ${k.id}: CFD finite`, sim.T.every(Number.isFinite));
  }
  for (const k of C.COOLERS) { const cfg = base(); C.applyCooler(cfg, k.id); run(cfg, `cooler ${k.id}`); }
  for (const k of C.GPUS) { const cfg = base(); C.applyGpu(cfg, k.id); run(cfg, `gpu ${k.id}`); }
  for (const k of C.CPUS) { const cfg = base(); C.applyCpu(cfg, k.id); run(cfg, `cpu ${k.id}`); }
  for (const k of C.BOARDS) { const cfg = base(); C.applyBoard(cfg, k.id); run(cfg, `board ${k.id}`); }

  const d4000 = base();
  C.applyCase(d4000, 'corsair-4000d');
  d4000.case.panels.front.fanSize = 140;
  check('4000D supports only 2 × 140 mm in front', AF.geometry.layout(d4000).slots.filter((s) => s.panel === 'front').length === 2);
  const mismatch = base();
  C.applyCpu(mismatch, 'i9-14900k');
  C.applyBoard(mismatch, 'x870e-hero');
  check('CPU/board socket mismatch is flagged', AF.geometry.layout(mismatch).issues.some((i) => /socket don't match/.test(i.text)));
  const longGpu = base();
  C.applyCase(longGpu, 'corsair-4000d');
  C.applyGpu(longGpu, 'rtx5090-astral');
  check('358 mm GPU flagged in 4000D (360 mm max with no front radiator is ok)', !AF.geometry.layout(longGpu).issues.some((i) => /GPU too long: 358/.test(i.text)));
  C.applyCooler(longGpu, 'lf3-360');
  longGpu.cpu.aio.panel = 'front';
  check('front 38 mm radiator + 358 mm GPU flagged in 4000D', AF.geometry.layout(longGpu).issues.some((i) => /GPU too long: 358/.test(i.text)));
  const tall = base();
  C.applyCase(tall, 'nr200p');
  C.applyCooler(tall, 'nh-d15');
  check('NH-D15 too tall for NR200P', AF.geometry.layout(tall).issues.some((i) => /cooler too tall/i.test(i.text)));
  const gaming = base();
  gaming.workload = 'gaming';
  C.applyCpu(gaming, 'r7-9800x3d');
  check('gaming workload uses gaming power', gaming.cpu.power === 70);
  const better = base();
  C.applyCooler(better, 'nh-d15');
  const worse = base();
  C.applyCooler(worse, 'wraith-stealth');
  check('NH-D15 cools better than Wraith Stealth', solve(better).thermal.cpu.temp < solve(worse).thermal.cpu.temp);
}

function placementTests() {
  const C = AF.catalog;
  const base = () => clone(AF.data.PRESETS[0].config);
  const towers = C.COOLERS.filter((k) => k.type.startsWith('tower'));
  for (const k of C.CASES) {
    for (const cool of towers) {
      const cfg = base();
      C.applyCase(cfg, k.id);
      C.applyBoard(cfg, k.id === 'nr200p' ? 'b650e-i' : 'b650-tuf');
      C.applyCooler(cfg, cool.id);
      const placed = AF.geometry.layout(cfg);
      const comps = placed.components;
      const tooTall = placed.issues.some((i) => /cooler too tall/i.test(i.text));
      if (!tooTall && comps.cpuCooler.bounds.y < AF.data.PHYSICS.fanThickness) {
        check(`${k.id} + ${cool.id}: cooler stays out of the top fan zone`, false, comps.cpuCooler.bounds.y);
      }
    }
  }
  check('all fitting tower coolers clear the roof in every catalog case', true);
  const low = base();
  low.case.boardTop = 15;
  C.applyCooler(low, 'nh-d15');
  low.slots['top-0'] = { mode: 'exhaust', fan: 'arctic-p14', speed: 0.7 };
  check('cooler hitting top fans is flagged', AF.geometry.layout(low).issues.some((i) => /hits the top fans/.test(i.text)));
  const ok = base();
  C.applyCooler(ok, 'nh-d15');
  ok.slots['top-0'] = { mode: 'exhaust', fan: 'arctic-p14', speed: 0.7 };
  check('NH-D15 with top fans fits in a normal mid-tower', !AF.geometry.layout(ok).issues.some((i) => /hits the top/.test(i.text)));
  const atx = AF.geometry.layout(base()).components;
  check('ATX slot 2 sits 180 mm below the board top', Math.abs(atx.gpu.pcbTop - atx.mobo.y - 180.32) < 0.01);
  check('GPU slot is below the cooler', atx.gpu.pcbTop > atx.cpuCooler.bounds.y + atx.cpuCooler.bounds.h);
  const ft = AF.data.PHYSICS.fanThickness;
  const overlap = (a, b) => a.x < b.x + b.w - 1e-6 && b.x < a.x + a.w - 1e-6;
  for (const cool of towers) {
    const cfg = base();
    C.applyCooler(cfg, cool.id);
    const spec = C.cpuCooler(cfg);
    for (let n = 1; n <= spec.maxFanCount; n++) {
      cfg.cpu.coolerFanCount = n;
      const cc = AF.geometry.layout(cfg).components.cpuCooler;
      const label = `${cool.id} with ${n} fan(s)`;
      check(`${label}: fan count drawn`, cc.fans.length === n);
      check(`${label}: no fan inside a fin stack`, cc.fans.every((f) => cc.towers.every((t) => !overlap(f, t))));
      const front = cc.fans.find((f) => f.role === 'front');
      check(`${label}: front fan clips onto the front face`, front && Math.abs(front.x - (cc.x + cc.w)) < 1e-6);
      const middle = cc.fans.find((f) => f.role === 'middle');
      if (middle) check(`${label}: middle fan centred between the towers`, Math.abs(middle.x + ft / 2 - (cc.x + cc.w / 2)) < 1e-6 && cc.towers.length === 2);
      const rear = cc.fans.find((f) => f.role === 'rear');
      if (rear) check(`${label}: rear fan clips onto the rear face`, Math.abs(rear.x + ft - cc.x) < 1e-6);
      check(`${label}: fans stay inside the case`, cc.bounds.x > 0);
      check(`${label}: fans centred on the fin stack`, cc.fans.every((f) => Math.abs(f.y + f.h / 2 - (cc.y + cc.h / 2)) < 1e-6));
    }
    if (cool.type === 'tower-dual') check(`${cool.id}: ships with front + middle fans`, (() => { const c = base(); C.applyCooler(c, cool.id); return AF.geometry.layout(c).components.cpuCooler.fans.map((f) => f.role).join() === 'front,middle'; })());
    if (cool.id === 'nh-u12a' || cool.id === 'freezer36') check(`${cool.id}: ships in push-pull`, (() => { const c = base(); C.applyCooler(c, cool.id); return AF.geometry.layout(c).components.cpuCooler.fans.map((f) => f.role).join() === 'front,rear'; })());
  }
}

function customFanTests() {
  const base = () => clone(AF.data.PRESETS[0].config);
  const cfg = base();
  const L = AF.geometry.layout(cfg);
  const g = L.components.gpu;
  const ft = AF.data.PHYSICS.fanThickness;
  const under = AF.geometry.snapCustomFan(cfg, L, 150, g.sinkBottom + 40, 120, null);
  check('snap under GPU blows up into it', under.mount.type === 'internal' && under.mount.anchor === 'gpu' && under.dir === 'up' && Math.abs(under.y - (g.sinkBottom + 8 + ft / 2)) < 1e-6);
  const rear92 = AF.geometry.snapCustomFan(cfg, L, 10, g.sinkBottom + 45, 92, null);
  check('92 mm snaps to the rear PCIe area below the GPU', rear92.mount.type === 'wall' && rear92.mount.panel === 'rear' && !rear92.blocked && rear92.y - 46 >= g.sinkBottom && /PCIe/.test(rear92.label));
  const rear120 = AF.geometry.snapCustomFan(cfg, L, 10, g.sinkBottom + 45, 120, null);
  check('120 mm below a 2.5-slot GPU is blocked (no room above the shroud)', rear120.blocked === true);
  const slot = L.slots.find((s) => s.id === 'top-1');
  const toSlot = AF.geometry.snapCustomFan(cfg, L, slot.cx, slot.cy + 10, slot.size, null);
  check('dropping near an empty slot snaps into that slot', toSlot.kind === 'slot' && toSlot.slotId === 'top-1');
  const free = AF.geometry.snapCustomFan(cfg, L, 333, 222, 120, null);
  check('free placement snaps to the 5 mm grid', free.mount.type === 'internal' && free.x % 5 === 0 && free.y % 5 === 0);
  const cooler = L.components.cpuCooler.bounds;
  const assist = AF.geometry.snapCustomFan(cfg, L, cooler.x + cooler.w + 30, cooler.y + cooler.h / 2, 120, null);
  check('snap in front of the CPU cooler blows into it', assist.mount.anchor === 'cooler' && assist.dir === 'left');

  const withRear = base();
  withRear.customFans = [{ id: 'cf-1', size: 92, fan: 'noctua-a9x14', speed: 1, x: rear92.x, y: rear92.y, dir: rear92.dir, mount: rear92.mount }];
  const a0 = solve(base()).air;
  const a1 = solve(withRear);
  check('extra rear exhaust lowers case pressure', a1.air.pressure < a0.pressure);
  check('custom wall fan closes the mass balance', Math.abs(a1.air.imbalance) / a1.air.throughFlow < 1e-6);
  check('custom wall fan is an exhaust element', a1.air.elements.some((e) => e.id === 'cf-1' && e.dir === -1 && e.q > 0));
  check('no placement issues for the PCIe fan', a1.layout.issues.length === 0, a1.layout.issues.map((i) => i.text).join('; '));

  const withInternal = base();
  withInternal.customFans = [
    { id: 'cf-1', size: 120, fan: 'arctic-p12', speed: 0.8, x: under.x, y: under.y, dir: under.dir, mount: under.mount },
    { id: 'cf-2', size: 120, fan: 'arctic-p12', speed: 0.8, x: assist.x, y: assist.y, dir: assist.dir, mount: assist.mount },
  ];
  const r = solve(withInternal);
  check('internal fans move air', r.air.internal.length === 2 && r.air.internal.every((e) => e.q > 0));
  check('internal fans do not change case pressure', Math.abs(r.air.pressure - a0.pressure) < 1e-9);
  for (const [label, conf] of [['PCIe exhaust', withRear], ['internal fans', withInternal]]) {
    const { layout, air, thermal } = solve(conf);
    const sim = new AF.CaseSim(conf, layout, air, thermal, null);
    sim.advance(Math.ceil(4 / sim.dt));
    check(`CFD with ${label} stays finite`, sim.T.every(Number.isFinite) && sim.u.every(Number.isFinite));
  }
  const clash = base();
  clash.customFans = [{ id: 'cf-1', size: 120, x: 150, y: g.pcbTop + 20, dir: 'up', mount: { type: 'internal' } }];
  check('fan placed inside the GPU is flagged', AF.geometry.layout(clash).issues.some((i) => /overlaps the graphics card/.test(i.text)));
}

fanCurveTests();
customFanTests();
placementTests();
catalogTests();
motherboardTests();
edgeCaseTests();
balanceTests();
thermalTests();
cfdTests();
console.log(`${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
