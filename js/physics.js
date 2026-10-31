(function (root) {
  const AF = root.AF || (root.AF = {});

  const data = () => AF.data;
  const PHYS = () => AF.data.PHYSICS;
  const CFM = () => AF.data.UNITS.CFM_TO_M3S;
  const MMH2O = () => AF.data.UNITS.MMH2O_TO_PA;

  function airDensity(tempC) {
    const P = PHYS();
    return P.atmosphericPressure / (P.airGasConstant * (tempC + 273.15));
  }

  function circleArea(sizeMm) {
    const d = sizeMm / 1000;
    return Math.PI / 4 * d * d;
  }

  function squareArea(sizeMm) {
    const d = sizeMm / 1000;
    return d * d;
  }

  function makeFan(spec, rho, name) {
    const P = PHYS();
    const cdA = P.dischargeCoefficient * P.stalledOpenAreaRatio * circleArea(spec.size);
    return {
      name: name || spec.name || 'Fan',
      size: spec.size,
      rpm: spec.rpm || 0,
      qmax: spec.cfm * CFM(),
      pmax: spec.mmh2o * MMH2O(),
      backK: rho / (2 * cdA * cdA),
    };
  }

  function fanSpecForSlot(slotCfg, size) {
    if (slotCfg.fan === 'custom') {
      const c = slotCfg.custom || {};
      return { name: 'Custom fan', size, cfm: +c.cfm || 50, mmh2o: +c.mmh2o || 2, rpm: +c.rpm || 1500 };
    }
    const spec = data().FANS.find((f) => f.id === slotCfg.fan);
    if (spec && spec.size === size) return spec;
    return data().FANS.find((f) => f.size === size) || data().FANS[0];
  }

  function fanPressure(fan, speed, q) {
    if (speed <= 0.001) return -fan.backK * q * Math.abs(q);
    const qm = fan.qmax * speed;
    const pm = fan.pmax * speed * speed;
    if (q >= 0) return pm * (1 - Math.pow(q / qm, PHYS().fanCurveExponent));
    return pm + fan.backK * q * q;
  }

  function impedance(label, coef, area, exponent) {
    return { label, coef, area, exponent };
  }

  function quadratic(label, zeta, area, rho) {
    return impedance(label, zeta * rho / 2, area, 2);
  }

  function orifice(label, openArea, rho) {
    const cd = PHYS().dischargeCoefficient;
    return impedance(label, rho / (2 * cd * cd), Math.max(openArea, 1e-7), 2);
  }

  function lossAt(imp, q) {
    const v = q / imp.area;
    return imp.coef * Math.sign(v) * Math.pow(Math.abs(v), imp.exponent);
  }

  function developed(el, q) {
    let p = 0;
    for (const f of el.fans) p += fanPressure(f.fan, f.speed, q);
    return p;
  }

  function totalLoss(el, q) {
    let p = 0;
    for (const imp of el.losses) p += lossAt(imp, q);
    return p;
  }

  function solveFlow(el, required) {
    const g = (q) => developed(el, q) - totalLoss(el, q) - required;
    let lo = -0.02;
    let hi = 0.02;
    for (let k = 0; k < 40 && g(lo) < 0; k++) lo *= 2;
    for (let k = 0; k < 40 && g(hi) > 0; k++) hi *= 2;
    for (let k = 0; k < 80; k++) {
      const mid = 0.5 * (lo + hi);
      if (g(mid) > 0) lo = mid; else hi = mid;
    }
    return 0.5 * (lo + hi);
  }

  function radiatorLoss(sizeMm, thickness) {
    const P = PHYS();
    const coef = P.radiatorCoefficient * thickness / P.radiatorReferenceThickness;
    return impedance(`Radiator ${thickness} mm`, coef, squareArea(sizeMm), P.radiatorExponent);
  }

  function buildElements(config, layout, rho) {
    const P = PHYS();
    const elements = [];
    const aio = config.cpu.aio;
    for (const slot of layout.slots) {
      if (!slot.available) continue;
      const sc = AF.geometry.slotConfig(config, slot.id);
      const panelType = slot.panelType;
      const area = circleArea(slot.size);
      const losses = [];
      if (panelType.zeta > 0) losses.push(quadratic(panelType.name, panelType.zeta, area, rho));
      if (slot.radiator) losses.push(radiatorLoss(slot.size, aio.thickness));
      const label = `${data().PANELS[slot.panel].name} ${slot.index + 1}`;
      if (sc.mode === 'intake' || sc.mode === 'exhaust') {
        const filter = data().FILTERS[sc.filter] || data().FILTERS.none;
        if (filter.zeta > 0) losses.push(quadratic(filter.name, filter.zeta, area, rho));
        const spec = fanSpecForSlot(sc, slot.size);
        const fan = makeFan(spec, rho);
        const count = slot.radiator && aio.pushPull ? 2 : 1;
        const fans = Array.from({ length: count }, () => ({ fan, speed: sc.speed }));
        elements.push({
          id: slot.id, label, kind: 'fan', dir: sc.mode === 'intake' ? 1 : -1,
          fans, losses, slot, radiator: slot.radiator, filtered: filter.zeta > 0, spec,
        });
      } else if (panelType.openRatio > 0) {
        const openArea = squareArea(slot.size) * panelType.openRatio;
        losses.unshift(orifice('Open vent', openArea, rho));
        elements.push({
          id: slot.id, label: `${label} (open)`, kind: 'vent', dir: 1, fans: [], losses, slot,
          radiator: slot.radiator, filtered: false,
        });
      }
    }

    const gpuSlots = Math.ceil(config.gpu.slots);
    const gpuCooler = AF.catalog.gpuCooler(config);
    let pcieArea = 0;
    if (config.case.pcieVented) pcieArea += Math.max(0, P.pcieSlotCount - gpuSlots) * P.pcieSlotOpenAreaMm2;
    if (gpuCooler.type === 'open') pcieArea += gpuSlots * P.gpuBracketOpenAreaMm2 * 0.5;
    if (pcieArea > 0) {
      elements.push({
        id: 'pcie', label: 'PCIe slot vents', kind: 'vent', dir: 1, fans: [],
        losses: [orifice('PCIe vents', pcieArea * 1e-6, rho)], filtered: false,
      });
    }
    elements.push({
      id: 'leak', label: 'Panel gaps / leakage', kind: 'vent', dir: 1, fans: [],
      losses: [orifice('Gaps', P.leakageAreaMm2 * 1e-6, rho)], filtered: false,
    });

    if (gpuCooler.type === 'blower') {
      const fan = makeFan(gpuCooler.fan, rho, 'GPU blower');
      elements.push({
        id: 'gpu-blower', label: 'GPU blower', kind: 'blower', dir: -1,
        fans: [{ fan, speed: config.gpu.fanSpeed }],
        losses: [impedance('GPU fins + bracket', gpuCooler.sinkCoef, gpuCooler.sinkAreaM2, gpuCooler.sinkExp)],
        filtered: false,
      });
    }
    return elements;
  }

  function netInflow(elements, pressure) {
    let sum = 0;
    for (const el of elements) sum += el.dir * solveFlow(el, el.dir * pressure);
    return sum;
  }

  function solveCasePressure(elements) {
    let lo = -5000;
    let hi = 5000;
    for (let k = 0; k < 90; k++) {
      const mid = 0.5 * (lo + hi);
      if (netInflow(elements, mid) > 0) lo = mid; else hi = mid;
    }
    return 0.5 * (lo + hi);
  }

  function cpuCoolerAssembly(config, rho) {
    const cooler = AF.catalog.cpuCooler(config);
    if (cooler.type === 'aio') return null;
    let fanSpec;
    let count;
    let size;
    if (cooler.type === 'tower') {
      size = cooler.fanSize;
      fanSpec = config.cpu.coolerFan === 'custom'
        ? Object.assign({ name: 'Custom fan', size }, config.cpu.coolerCustom || { cfm: 50, mmh2o: 2, rpm: 1500 })
        : (data().FANS.find((f) => f.id === config.cpu.coolerFan && f.size === size) || data().FANS.find((f) => f.id === cooler.defaultFan));
      count = Math.max(1, Math.min(cooler.maxFanCount, config.cpu.coolerFanCount || cooler.defaultFanCount));
    } else {
      size = cooler.fan.size;
      fanSpec = Object.assign({ name: 'Cooler fan' }, cooler.fan);
      count = 1;
    }
    const fan = makeFan(fanSpec, rho);
    return {
      id: 'cpu-cooler', label: 'CPU cooler', kind: 'cooler', dir: 0,
      fans: Array.from({ length: count }, () => ({ fan, speed: config.cpu.coolerFanSpeed })),
      losses: [impedance('Heatsink fins', cooler.sinkCoef, squareArea(size), cooler.sinkExp)],
      spec: fanSpec,
    };
  }

  function gpuCoolerAssembly(config, rho) {
    const cooler = AF.catalog.gpuCooler(config);
    if (cooler.type !== 'open') return null;
    const fanSpec = Object.assign({ name: 'GPU fan' }, cooler.fan, config.gpu.fanSpec || {});
    const fan = makeFan(fanSpec, rho);
    return {
      id: 'gpu-cooler', label: 'GPU fans (each)', kind: 'cooler', dir: 0,
      fans: [{ fan, speed: config.gpu.fanSpeed }],
      losses: [impedance('GPU fin stack', cooler.sinkCoef, squareArea(fanSpec.size), cooler.sinkExp)],
      count: Math.max(1, config.gpu.fanCount || cooler.fanCount),
      spec: fanSpec,
    };
  }

  function freeFlow(el) {
    return solveFlow({ fans: el.fans, losses: [] }, 0);
  }

  function solveAirflow(config, layout) {
    const rho = airDensity(config.ambient);
    const elements = buildElements(config, layout, rho);
    const pressure = solveCasePressure(elements);
    let fanIn = 0;
    let fanOut = 0;
    let passiveIn = 0;
    let passiveOut = 0;
    for (const el of elements) {
      el.required = el.dir * pressure;
      el.q = solveFlow(el, el.required);
      el.inflow = el.dir * el.q;
      el.developed = developed(el, el.q);
      el.loss = totalLoss(el, el.q);
      el.free = el.fans.length ? freeFlow(el) : 0;
      el.stalled = el.fans.length > 0 && el.q < 0;
      const isFan = el.kind === 'fan' || el.kind === 'blower';
      if (el.inflow >= 0) {
        if (isFan) fanIn += el.inflow; else passiveIn += el.inflow;
      } else if (isFan) fanOut -= el.inflow; else passiveOut -= el.inflow;
    }

    const coolers = {};
    const cpuAsm = cpuCoolerAssembly(config, rho);
    if (cpuAsm) {
      cpuAsm.required = 0;
      cpuAsm.q = solveFlow(cpuAsm, 0);
      cpuAsm.developed = developed(cpuAsm, cpuAsm.q);
      cpuAsm.loss = totalLoss(cpuAsm, cpuAsm.q);
      cpuAsm.free = freeFlow(cpuAsm);
      coolers.cpu = cpuAsm;
    }
    const gpuAsm = gpuCoolerAssembly(config, rho);
    if (gpuAsm) {
      gpuAsm.required = 0;
      gpuAsm.q = solveFlow(gpuAsm, 0);
      gpuAsm.developed = developed(gpuAsm, gpuAsm.q);
      gpuAsm.loss = totalLoss(gpuAsm, gpuAsm.q);
      gpuAsm.free = freeFlow(gpuAsm);
      gpuAsm.total = gpuAsm.q * gpuAsm.count;
      coolers.gpu = gpuAsm;
    }
    const blower = elements.find((e) => e.kind === 'blower') || null;

    const c = config.case;
    const volume = (c.height * c.depth * c.width) * 1e-9;
    const throughFlow = fanIn + passiveIn;
    return {
      rho, pressure, elements, coolers, blower,
      fanIn, fanOut, passiveIn, passiveOut, throughFlow,
      volume, airChangesPerMinute: throughFlow / volume * 60,
      imbalance: netInflow(elements, pressure),
    };
  }

  function convectiveR(rRef, qRefCfm, q) {
    const P = PHYS();
    const qMin = P.minimumCoolerFlowCfm * CFM();
    return rRef * Math.pow((qRefCfm * CFM()) / Math.max(Math.abs(q), qMin), P.thermalFlowExponent);
  }

  function radiatorSections(config, air) {
    const P = PHYS();
    const aio = config.cpu.aio;
    const cooler = AF.catalog.cpuCooler(config);
    const thicknessFactor = Math.pow(P.radiatorReferenceThickness / aio.thickness, P.radiatorThicknessThermalExponent);
    return air.elements.filter((e) => e.radiator).map((e) => {
      const size = e.slot.size >= 140 ? 140 : 120;
      const r = cooler.sectionResistance[size] * thicknessFactor;
      const R = convectiveR(r, cooler.sectionRefCfm[size], e.q);
      return { element: e, R, ua: 1 / R, intake: e.inflow > 0 };
    });
  }

  function limitPower(power, tmax, inletT, R) {
    const allowed = (tmax - inletT) / R;
    return Math.max(0, Math.min(power, allowed));
  }

  function solveThermal(config, layout, air, inlets) {
    const P = PHYS();
    const Tamb = config.ambient;
    const rhoCp = air.rho * P.airCp;
    const through = Math.max(air.throughFlow, 1e-5);
    const cpu = config.cpu;
    const cooler = AF.catalog.cpuCooler(config);
    const gpu = config.gpu;
    const gpuCooler = AF.catalog.gpuCooler(config);
    const sim = inlets || {};

    const gpuFlow = gpuCooler.type === 'blower' ? Math.max(0, air.blower ? air.blower.q : 0) : (air.coolers.gpu ? air.coolers.gpu.total : 0);
    const gpuR = gpu.rjc + gpuCooler.rBase + convectiveR(gpuCooler.rRef, gpuCooler.qRefCfm, gpuFlow);
    const sections = cooler.type === 'aio' ? radiatorSections(config, air) : [];

    let caseT = Tamb;
    let out = null;
    for (let iter = 0; iter < 60; iter++) {
      const cpuOut = { requested: cpu.power, tmax: cpu.tjmax };
      let cpuCaseHeat = 0;
      if (cooler.type === 'aio') {
        const chain = cpu.rjc + P.pasteResistance + P.aioBlockResistance;
        let sumUA = 0;
        let sumUAT = 0;
        for (const s of sections) {
          s.inletT = s.intake ? Tamb : (sim.radiator != null ? sim.radiator : caseT);
          sumUA += s.ua;
          sumUAT += s.ua * s.inletT;
        }
        if (sumUA <= 0) { sumUA = 0.2; sumUAT = 0.2 * caseT; }
        const airIn = sumUAT / sumUA;
        const power = Math.max(0, Math.min(cpu.power, (cpu.tjmax - airIn) / (1 / sumUA + chain)));
        const coolant = airIn + power / sumUA;
        for (const s of sections) {
          s.heat = s.ua * (coolant - s.inletT);
          if (s.intake) cpuCaseHeat += Math.max(0, s.heat);
        }
        if (!sections.length) cpuCaseHeat = power;
        Object.assign(cpuOut, {
          power, inlet: airIn, coolant, temp: coolant + power * chain,
          resistance: 1 / sumUA + chain, flow: sections.reduce((a, s) => a + Math.max(0, Math.abs(s.element.q)), 0),
        });
      } else {
        const flow = air.coolers.cpu ? air.coolers.cpu.q : 0;
        const R = cpu.rjc + P.pasteResistance + cooler.rBase + convectiveR(cooler.rRef, cooler.qRefCfm, flow);
        const inlet = sim.cpu != null ? sim.cpu : caseT;
        const power = limitPower(cpu.power, cpu.tjmax, inlet, R);
        cpuCaseHeat = power;
        Object.assign(cpuOut, { power, inlet, temp: inlet + power * R, resistance: R, flow });
      }
      cpuOut.throttled = cpuOut.power < cpu.power - 0.5;

      const gpuInlet = sim.gpu != null ? sim.gpu : caseT;
      const gpuPower = limitPower(gpu.power, gpu.tmax, gpuInlet, gpuR);
      const gpuCaseHeat = gpuCooler.type === 'blower' ? gpuPower * 0.1 : gpuPower;
      const gpuOut = {
        requested: gpu.power, tmax: gpu.tmax, power: gpuPower, inlet: gpuInlet,
        temp: gpuInlet + gpuPower * gpuR, resistance: gpuR, flow: gpuFlow,
        throttled: gpuPower < gpu.power - 0.5,
      };

      const caseHeat = cpuCaseHeat + gpuCaseHeat + config.otherHeat;
      const target = Tamb + caseHeat / (rhoCp * through);
      const nextCaseT = iter === 0 ? target : 0.5 * caseT + 0.5 * target;
      out = {
        caseTemp: target, caseRise: target - Tamb, caseHeat, cpuCaseHeat, gpuCaseHeat,
        cpu: cpuOut, gpu: gpuOut, sections, through,
      };
      if (Math.abs(nextCaseT - caseT) < 1e-4 && iter > 2) break;
      caseT = nextCaseT;
    }
    out.totalHeat = out.cpu.power + out.gpu.power + config.otherHeat;
    return out;
  }

  function nearFrontIntake(layout, config, slot) {
    return layout.slots.some((s) => s.panel === 'front' && AF.geometry.slotConfig(config, s.id).mode === 'intake'
      && s.index === 0 && slot.cx > config.case.depth - slot.size * 1.2);
  }

  function analyze(config, layout, air, thermal, simStats) {
    const P = PHYS();
    const notes = [];
    const add = (level, text) => notes.push({ level, text });
    for (const issue of layout.issues) notes.push(issue);
    const cfm = (q) => (q / CFM()).toFixed(1);

    if (air.pressure > P.neutralPressurePa) {
      add('good', `Positive pressure (+${air.pressure.toFixed(2)} Pa): ${cfm(air.passiveOut)} CFM leaves through gaps and vents, so dust only enters through the intakes.`);
    } else if (air.pressure < -P.neutralPressurePa) {
      const unfiltered = air.elements.filter((e) => !e.filtered && e.inflow > 0 && e.kind === 'vent').reduce((a, e) => a + e.inflow, 0);
      add('warn', `Negative pressure (${air.pressure.toFixed(2)} Pa): ${cfm(unfiltered)} CFM is pulled in through unfiltered gaps and vents. Expect dust buildup.`);
    } else {
      add('info', 'Pressure is close to neutral. Gaps will let in a little air in some places and leak it out in others.');
    }

    for (const el of air.elements) {
      if (el.kind === 'vent') continue;
      if (el.stalled) {
        add('error', `${el.label}: the case pressure overpowers this fan and air flows backward through it (${cfm(el.q)} CFM).`);
      } else if (el.free > 0 && el.q / el.free < 0.5) {
        add('warn', `${el.label}: only ${Math.round(el.q / el.free * 100)}% of its free-air flow. The panel, filter or radiator is very restrictive for this fan. A static-pressure fan or higher speed would help.`);
      }
      if (el.kind === 'fan' && el.dir > 0 && !el.filtered) add('info', `${el.label} is an intake without a dust filter.`);
    }

    const intakes = air.elements.filter((e) => e.kind === 'fan' && e.dir > 0);
    const exhausts = air.elements.filter((e) => e.kind !== 'vent' && e.dir < 0);
    if (!intakes.length) add('warn', 'No intake fans: all fresh air enters passively through vents and gaps.');
    if (!exhausts.length) add('info', 'No exhaust fans: hot air leaves only through vents and gaps.');

    for (const el of exhausts) {
      if (el.slot && el.slot.panel === 'top' && nearFrontIntake(layout, config, el.slot)) {
        add('warn', `${el.label} is an exhaust right behind the top front intake. It will pull out fresh air before it reaches the components.`);
      }
    }
    const frontExhaust = air.elements.some((e) => e.kind === 'fan' && e.dir < 0 && e.slot && e.slot.panel === 'front');
    const rearIntake = air.elements.some((e) => e.kind === 'fan' && e.dir > 0 && e.slot && e.slot.panel === 'rear');
    if (frontExhaust && rearIntake) add('warn', 'Rear intake with front exhaust works against the CPU cooler direction and the rising heat. Reverse it.');
    const topIntake = air.elements.some((e) => e.kind === 'fan' && e.dir > 0 && e.slot && e.slot.panel === 'top');
    if (topIntake) add('info', 'Top intake works against natural convection. Top fans usually work better as exhaust.');

    const cooler = AF.catalog.cpuCooler(config);
    if (cooler.type === 'aio') {
      const sections = thermal.sections;
      if (sections.some((s) => s.element.kind === 'vent')) add('warn', 'Some radiator sections have no fans.');
      if (sections.some((s) => s.intake)) add('info', `The radiator is an intake: the CPU runs cooler, but ${Math.round(thermal.cpuCaseHeat)} W of CPU heat is blown into the case and warms the GPU.`);
      else if (sections.length) add('info', 'The radiator is an exhaust: it is cooled by warm case air, but no CPU heat stays in the case.');
    }

    if (air.airChangesPerMinute < 30) add('warn', `Low throughput: ${air.airChangesPerMinute.toFixed(0)} case air changes/min. The case air heats up by ${thermal.caseRise.toFixed(1)} °C.`);
    if (thermal.cpu.throttled) add('error', `CPU reaches Tjmax (${config.cpu.tjmax} °C) and throttles from ${config.cpu.power} W to ${thermal.cpu.power.toFixed(0)} W.`);
    if (thermal.gpu.throttled) add('error', `GPU reaches its ${config.gpu.tmax} °C limit and throttles from ${config.gpu.power} W to ${thermal.gpu.power.toFixed(0)} W.`);
    if (air.coolers.gpu && air.coolers.gpu.q < 0.25 * air.coolers.gpu.free) add('warn', 'GPU fans are heavily restricted.');

    if (simStats && simStats.ready) {
      if (simStats.stagnant > 0.35) add('warn', `CFD: ${Math.round(simStats.stagnant * 100)}% of the case cross-section has almost no air movement (dead zones).`);
      if (simStats.gpuRecirculation > 6) add('warn', `CFD: the GPU takes in air ${simStats.gpuRecirculation.toFixed(1)} °C above room temperature. Warm air is recirculating into it. Add or strengthen intake below or in front of the GPU.`);
      if (simStats.cpuRecirculation > 8) add('warn', `CFD: the CPU cooler takes in air ${simStats.cpuRecirculation.toFixed(1)} °C above room temperature, mostly GPU exhaust. More exhaust near the CPU (rear or top) would help.`);
    }
    return notes;
  }

  function fanCurvePoints(el, steps) {
    const fans = el.fans;
    const maxQ = Math.max(...fans.map((f) => f.fan.qmax * Math.max(f.speed, 0.05))) * 1.05;
    const pts = [];
    for (let k = 0; k <= steps; k++) {
      const q = maxQ * k / steps;
      pts.push({ q, fan: developed(el, q), system: totalLoss(el, q) + (el.required || 0) });
    }
    return { pts, maxQ };
  }

  AF.physics = {
    airDensity, makeFan, fanPressure, solveFlow, solveAirflow, solveThermal, analyze,
    developed, totalLoss, fanCurvePoints, fanSpecForSlot, circleArea, squareArea,
  };

  if (typeof module === 'object' && module.exports) module.exports = AF;
})(typeof window !== 'undefined' ? window : globalThis);
