(function (root) {
  const AF = root.AF;

  const LAYERS = [
    ['shell', 'Case & frame'],
    ['glass', 'Show exterior (side panels)'],
    ['board', 'Motherboard & RAM'],
    ['cooler', 'CPU cooler & radiator'],
    ['gpu', 'Graphics card'],
    ['shroud', 'PSU & shroud'],
    ['cables', 'Cables'],
    ['fans', 'Fans'],
    ['arrows', 'Flow arrows'],
    ['particles', 'Airflow particles'],
    ['heatmap', 'Heat map slice'],
    ['labels', 'Labels'],
    ['spin', 'Spinning fans'],
  ];
  const DEFAULT_OFF = new Set(['glass', 'arrows', 'heatmap']);
  const FADED_OPACITY = 0.1;
  const SEE_THROUGH = 0.3;
  const BOARD_Z = 6;
  const CARD_HEIGHT = 126;
  const FT = 25;
  const FEET = 14;
  const PALETTE = {
    chassis: 0x0d0e10,
    edge: 0x141518,
    panel: 0x0b0c0e,
    tray: 0x08090b,
    pcb: 0x15191f,
    silver: 0xb9bec6,
    aluminium: 0xb8bec6,
    darkMetal: 0x3b4048,
    copper: 0xc07a45,
    shroud: 0x0e0f12,
    ram: 0x24272d,
    cable: 0x202328,
    psu: 0x111316,
    gpuShroud: 0x15171b,
  };
  const MODE_RING = { intake: 0x38bdf8, exhaust: 0xfb923c, internal: 0xa78bfa };
  const CAMERA_PRESETS = {
    '3d': [0.95, 0.62, 2.7],
    side: [0, 0.08, 3.1],
    top: [0.001, 3.3, 0.15],
    front: [3.1, 0.12, 0.45],
    rear: [-3.1, 0.12, 0.45],
  };

  function fanStyle(fanId) {
    const id = String(fanId || '');
    if (/^noctua-/.test(id) && /redux/.test(id)) return { frame: 0x5d6168, blade: 0x8d9299, hub: 0x5d6168 };
    if (/^noctua-/.test(id) && !/ippc|chromax|-g2/.test(id)) return { frame: 0xd7c7a7, blade: 0x7b4024, hub: 0xd7c7a7 };
    if (/(ll1|ql1|sl1|sl-inf|al1|tl1|sp120-rgb|sp120-elite|sp140|af120-elite|af140-elite|rx1|qx1|ml1.*elite|light-wings|aer-|f120-rgb|lianli-bundled|montech|phanteks-d30|hyte)/.test(id)) {
      return { frame: 0x17181b, blade: 0xe8ecf1, hub: 0x17181b, glow: true };
    }
    return { frame: 0x16181b, blade: 0x24272c, hub: 0x16181b };
  }

  class View3D {
    constructor(host, app) {
      this.host = host;
      this.app = app;
      this.options = Object.fromEntries(LAYERS.map(([k]) => [k, !DEFAULT_OFF.has(k)]));
      this.transparent = new Set();
      this.active = false;
      this.supported = typeof THREE !== 'undefined' && typeof THREE.OrbitControls !== 'undefined';
      if (!this.supported) return;
      try {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch (err) {
        this.supported = false;
        return;
      }
      if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;
      const r = this.renderer;
      r.setPixelRatio(Math.min(2, root.devicePixelRatio || 1));
      r.outputEncoding = THREE.sRGBEncoding;
      r.toneMapping = THREE.ACESFilmicToneMapping;
      r.toneMappingExposure = 1.25;
      r.shadowMap.enabled = true;
      r.shadowMap.type = THREE.PCFSoftShadowMap;
      this.canvas = r.domElement;
      this.canvas.className = 'view3d';
      host.insertBefore(this.canvas, host.firstChild);
      this.labelLayer = document.createElement('div');
      this.labelLayer.className = 'labels3d';
      host.insertBefore(this.labelLayer, this.canvas.nextSibling);
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(30, 1, 5, 20000);
      this.controls = new THREE.OrbitControls(this.camera, this.canvas);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      this.controls.maxPolarAngle = Math.PI * 0.495;
      this.scene.add(new THREE.HemisphereLight(0xe3ebff, 0x2a2f38, 0.95));
      this.key = new THREE.DirectionalLight(0xfff6ec, 1.6);
      this.key.castShadow = true;
      this.key.shadow.mapSize.set(2048, 2048);
      this.key.shadow.bias = -0.0004;
      this.scene.add(this.key, this.key.target);
      const rim = new THREE.DirectionalLight(0x9db8ff, 0.45);
      rim.position.set(-900, 500, -700);
      this.scene.add(rim);
      const fill = new THREE.PointLight(0xf4f7ff, 1.4, 0, 2);
      fill.position.set(0, 0, 0);
      this.fill = fill;
      this.scene.add(fill);
      this.root = new THREE.Group();
      this.scene.add(this.root);
      this.raycaster = new THREE.Raycaster();
      this.pointer = new THREE.Vector2();
      this.frame = 0;
      this.patterns = {};
      this.bindPointer();
    }

    bindPointer() {
      let down = null;
      this.canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; this.tween = null; });
      this.canvas.addEventListener('pointerup', (e) => {
        if (!down) return;
        const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
        const quick = performance.now() - down.t < 450;
        down = null;
        if (moved > 4 || !quick) return;
        const hit = this.pick(e);
        if (!hit) return;
        const key = hit.userData.key;
        if (this.transparent.has(key)) this.transparent.delete(key); else this.transparent.add(key);
        this.applyTransparency();
        this.showTip(e, hit);
      });
      this.canvas.addEventListener('pointermove', (e) => {
        if (e.buttons) { this.hideTip(); return; }
        const hit = this.pick(e);
        if (hit) this.showTip(e, hit); else this.hideTip();
        this.canvas.style.cursor = hit ? 'pointer' : 'grab';
      });
      this.canvas.addEventListener('pointerleave', () => this.hideTip());
    }

    pick(e) {
      const r = this.canvas.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const visible = (this.pickables || []).filter((m) => this.isVisible(m));
      const hits = this.raycaster.intersectObjects(visible, false);
      if (!hits.length) return null;
      const opaque = (hh) => (hh.object.material.userData.baseOpacity || 1) >= SEE_THROUGH;
      const solid = hits.find((hh) => opaque(hh) && !this.transparent.has(hh.object.userData.key));
      const faded = hits.find((hh) => opaque(hh));
      return (solid || faded || hits[0]).object;
    }

    isVisible(obj) {
      for (let o = obj; o; o = o.parent) if (!o.visible) return false;
      return true;
    }

    showTip(e, mesh) {
      const tip = this.app.dom.tooltip;
      const r = this.host.getBoundingClientRect();
      const faded = this.transparent.has(mesh.userData.key);
      tip.innerHTML = `<b>${mesh.userData.label}</b><br>${faded ? 'Click to make solid' : 'Click to make transparent'}`;
      tip.style.display = 'block';
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      tip.style.left = `${Math.min(x + 14, r.width - tip.offsetWidth - 4)}px`;
      tip.style.top = `${Math.min(y + 14, r.height - tip.offsetHeight - 4)}px`;
    }

    hideTip() {
      this.app.dom.tooltip.style.display = 'none';
    }

    setActive(on, state) {
      if (!this.supported) return false;
      this.active = on;
      this.canvas.style.display = on ? 'block' : 'none';
      this.labelLayer.style.display = on ? 'block' : 'none';
      if (on) this.build(state);
      return true;
    }

    clear() {
      this.root.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          for (const m of [].concat(o.material)) {
            if (m.map) m.map.dispose();
            if (m.alphaMap) m.alphaMap.dispose();
            m.dispose();
          }
        }
      });
      this.root.clear();
      this.labelLayer.replaceChildren();
      this.labels = [];
    }

    P(x, y, z) {
      return new THREE.Vector3(x - this.D / 2, this.H / 2 - y, z - this.W / 2);
    }

    material(color, opacity, extra) {
      const op = opacity == null ? 1 : opacity;
      const m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.6, metalness: 0.3, transparent: op < 1, opacity: op }, extra || {}));
      m.userData.baseOpacity = op;
      return m;
    }

    register(mesh, key, label) {
      mesh.userData.key = key;
      mesh.userData.label = label;
      this.pickables.push(mesh);
      return mesh;
    }

    addMesh(parent, geo, mat, key, label, shadow) {
      const mesh = new THREE.Mesh(geo, mat);
      if (shadow !== false) {
        mesh.castShadow = mat.userData.baseOpacity >= 0.6;
        mesh.receiveShadow = true;
      }
      parent.add(mesh);
      if (key) this.register(mesh, key, label);
      return mesh;
    }

    box(parent, key, label, x0, y0, z0, x1, y1, z1, mat, shadow) {
      const geo = new THREE.BoxGeometry(Math.max(0.4, Math.abs(x1 - x0)), Math.max(0.4, Math.abs(y1 - y0)), Math.max(0.4, Math.abs(z1 - z0)));
      const mesh = this.addMesh(parent, geo, mat, key, label, shadow);
      mesh.position.copy(this.P((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
      return mesh;
    }

    cylinder(parent, key, label, x, y, z, radius, length, axis, mat, segments) {
      const geo = new THREE.CylinderGeometry(radius, radius, length, segments || 24);
      if (axis === 'x') geo.rotateZ(Math.PI / 2);
      if (axis === 'z') geo.rotateX(Math.PI / 2);
      const mesh = this.addMesh(parent, geo, mat, key, label);
      mesh.position.copy(this.P(x, y, z));
      return mesh;
    }

    tube(parent, key, label, points, radius, mat) {
      const curve = new THREE.CatmullRomCurve3(points.map((p) => this.P(p[0], p[1], p[2])));
      return this.addMesh(parent, new THREE.TubeGeometry(curve, 48, radius, 10, false), mat, key, label);
    }

    layer(name) {
      const g = new THREE.Group();
      g.userData.layer = name;
      g.visible = this.options[name] !== false;
      this.layers[name] = g;
      this.root.add(g);
      return g;
    }

    pattern(kind) {
      if (this.patterns[kind]) return this.patterns[kind];
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d');
      g.fillStyle = '#fff';
      g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#000';
      const hole = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
      if (kind === 'mesh') {
        for (const [x, y] of [[16, 16], [48, 16], [0, 48], [32, 48], [64, 48], [16, 80], [48, 80], [0, -16], [32, -16], [64, -16]]) hole(x, y, 12);
      } else if (kind === 'perforated') {
        hole(32, 32, 11);
      } else {
        for (let x = 4; x < 64; x += 8) g.fillRect(x, 0, 3, 64);
      }
      this.patterns[kind] = c;
      return c;
    }

    patternTexture(kind, repeatX, repeatY) {
      const tex = new THREE.CanvasTexture(this.pattern(kind));
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(Math.max(1, repeatX), Math.max(1, repeatY));
      tex.anisotropy = 4;
      return tex;
    }

    panelMaterial(type, spanA, spanB) {
      if (type === 'mesh' || type === 'perforated') {
        const tile = type === 'mesh' ? 7 : 9;
        const m = this.material(PALETTE.panel, 1, { alphaMap: this.patternTexture(type, spanA / tile, spanB / tile), alphaTest: 0.5, side: THREE.DoubleSide, metalness: 0.2, roughness: 0.85 });
        return m;
      }
      if (type === 'restricted') return this.material(0x0a0b0d, 1, { metalness: 0.15, roughness: 0.3 });
      return this.material(PALETTE.panel, 1, { metalness: 0.2, roughness: 0.85 });
    }

    label(text, x, y, z, layerName, variant) {
      const el = document.createElement('div');
      el.className = `label3d ${variant || ''}`;
      el.textContent = text;
      this.labelLayer.append(el);
      this.labels.push({ el, pos: this.P(x, y, z), layer: layerName });
    }

    fanModel(parent, key, label, o) {
      const style = o.style || fanStyle(o.fanId);
      const group = new THREE.Group();
      group.position.copy(this.P(o.x, o.y, o.z));
      if (o.axis === 'x') group.rotation.z = -Math.PI / 2;
      if (o.axis === 'z') group.rotation.x = Math.PI / 2;
      parent.add(group);
      const s = o.size;
      const r = s / 2;
      const frameShape = new THREE.Shape();
      const half = s / 2;
      const corner = Math.min(8, s * 0.06);
      frameShape.moveTo(-half + corner, -half);
      frameShape.lineTo(half - corner, -half);
      frameShape.quadraticCurveTo(half, -half, half, -half + corner);
      frameShape.lineTo(half, half - corner);
      frameShape.quadraticCurveTo(half, half, half - corner, half);
      frameShape.lineTo(-half + corner, half);
      frameShape.quadraticCurveTo(-half, half, -half, half - corner);
      frameShape.lineTo(-half, -half + corner);
      frameShape.quadraticCurveTo(-half, -half, -half + corner, -half);
      const hole = new THREE.Path();
      hole.absarc(0, 0, r * 0.95, 0, Math.PI * 2, true);
      frameShape.holes.push(hole);
      const frameGeo = new THREE.ExtrudeGeometry(frameShape, { depth: FT, bevelEnabled: false, curveSegments: 32 });
      frameGeo.translate(0, 0, -FT / 2);
      frameGeo.rotateX(-Math.PI / 2);
      const vent = o.mode === 'vent';
      const frameMat = this.material(vent ? 0x2a2e35 : style.frame, vent ? 0.35 : 1, { roughness: 0.7, metalness: 0.15 });
      this.addMesh(group, frameGeo, frameMat, vent ? null : key, label);
      if (vent) return group;
      if (MODE_RING[o.mode]) {
        const ringGeo = new THREE.TorusGeometry(r * 0.955, Math.max(1.1, s * 0.012), 8, 64);
        ringGeo.rotateX(Math.PI / 2);
        const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: MODE_RING[o.mode] }));
        ring.position.y = FT / 2 + 0.5;
        group.add(ring);
      }
      const hub = this.addMesh(group, new THREE.CylinderGeometry(r * 0.3, r * 0.3, FT * 0.82, 32), this.material(style.hub, 1, { roughness: 0.5 }), key, label);
      hub.position.y = 0;
      const blades = new THREE.Group();
      const count = s >= 180 ? 11 : 9;
      const bladeShape = new THREE.Shape();
      bladeShape.moveTo(r * 0.27, -r * 0.09);
      bladeShape.quadraticCurveTo(r * 0.6, -r * 0.24, r * 0.92, -r * 0.1);
      bladeShape.quadraticCurveTo(r * 0.95, r * 0.07, r * 0.86, r * 0.17);
      bladeShape.quadraticCurveTo(r * 0.58, r * 0.1, r * 0.27, r * 0.11);
      bladeShape.closePath();
      const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, { depth: 1.6, bevelEnabled: false, curveSegments: 10 });
      bladeGeo.translate(0, 0, -0.8);
      bladeGeo.rotateX(Math.PI / 2);
      const bladeMat = this.material(style.blade, style.glow ? 0.88 : 1, style.glow ? { emissive: 0xffffff, emissiveIntensity: 0.12, roughness: 0.4 } : { roughness: 0.55 });
      for (let k = 0; k < count; k++) {
        const pivot = new THREE.Group();
        pivot.rotation.y = (k / count) * Math.PI * 2;
        const blade = this.addMesh(pivot, bladeGeo, bladeMat, key, label);
        blade.rotation.x = 0.38;
        blades.add(pivot);
      }
      group.add(blades);
      this.spinners.push({ group: blades, rate: (o.speed == null ? 0.7 : o.speed) * 14 * (o.reverse ? -1 : 1) });
      if (o.flow) {
        const dir = new THREE.Vector3(o.flow[0], -o.flow[1], o.flow[2] || 0).normalize();
        const origin = this.P(o.x, o.y, o.z).sub(dir.clone().multiplyScalar(42));
        const arrow = new THREE.ArrowHelper(dir, origin, 100, MODE_RING[o.mode] || 0x6d8dff, 26, 16);
        this.layers.arrows.add(arrow);
      }
      return group;
    }

    build(state) {
      if (!this.supported) return;
      this.clear();
      this.pickables = [];
      this.layers = {};
      this.spinners = [];
      const config = state.config;
      const comps = state.layout.components;
      const c = config.case;
      this.D = c.depth;
      this.H = c.height;
      this.W = c.width;

      for (const [name] of LAYERS) if (name !== 'spin') this.layer(name);
      this.buildGround();
      this.buildChassis(config, comps);
      this.buildBoard(config, comps);
      this.buildCooler(state);
      this.buildGpu(state);
      this.buildPsu(config, comps);
      this.buildCables(config, comps);
      this.buildCaseFans(state);
      this.buildHeatmap(this.layers.heatmap, state);
      this.buildParticles(this.layers.particles, state);
      this.applyTransparency();

      const S = Math.max(this.D, this.H, this.W);
      this.key.position.set(S * 0.9, S * 1.6, S * 1.1);
      this.key.target.position.set(0, -this.H * 0.2, 0);
      this.fill.position.set(this.D * 0.1, this.H * 0.15, this.W * 1.1);
      const cam = this.key.shadow.camera;
      cam.left = cam.bottom = -S * 0.9;
      cam.right = cam.top = S * 0.9;
      cam.near = 10;
      cam.far = S * 5;
      cam.updateProjectionMatrix();

      const dims = `${this.D}x${this.H}x${this.W}`;
      if (dims !== this.dims) {
        this.dims = dims;
        this.resize();
        this.setCamera('3d', true);
      }
    }

    buildGround() {
      const S = Math.max(this.D, this.H, this.W);
      const y = -this.H / 2 - FEET;
      const grid = new THREE.GridHelper(S * 8, 48, 0x2b313a, 0x1a1e24);
      grid.material.transparent = true;
      grid.material.opacity = 0.75;
      grid.position.y = y;
      this.root.add(grid);
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(S * 8, S * 8), new THREE.ShadowMaterial({ opacity: 0.45 }));
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = y + 0.2;
      ground.receiveShadow = true;
      this.root.add(ground);
      this.label('REAR', 0, this.H + FEET, this.W + 30, 'labels', 'ground');
      this.label('FRONT', this.D, this.H + FEET, this.W + 30, 'labels', 'ground');
    }

    buildChassis(config, comps) {
      const shell = this.layers.shell;
      const glass = this.layers.glass;
      const D = this.D;
      const H = this.H;
      const W = this.W;
      const P = config.case.panels;
      const t = 2;
      const name = (panel) => AF.data.PANEL_TYPES[P[panel].type].name;
      this.box(shell, 'panel:tray', 'Motherboard tray', 0, 0, -t, D, H, 0, this.material(PALETTE.tray, 1, { roughness: 0.9, metalness: 0.1 }));
      this.box(shell, 'panel:top', `Top panel (${name('top')})`, 0, -t, 0, D, 0, W, this.panelMaterial(P.top.type, D, W));
      this.box(shell, 'panel:front', `Front panel (${name('front')})`, D, 0, 0, D + t, H, W, this.panelMaterial(P.front.type, W, H));
      this.box(shell, 'panel:rear', `Rear panel (${name('rear')})`, -t, 0, 0, 0, H, W, this.panelMaterial(P.rear.type, W, H));
      this.box(shell, 'panel:bottom', `Bottom panel (${name('bottom')})`, 0, H, 0, D, H + t, W, this.panelMaterial(config.case.shroud ? 'solid' : P.bottom.type, D, W));
      const edgeMat = this.material(PALETTE.edge, 1, { metalness: 0.35, roughness: 0.6 });
      const e = 7;
      for (const [y, z] of [[0, 0], [0, W], [H, 0], [H, W]]) this.box(shell, 'frame', 'Chassis frame', 0, y - e / 2, z - e / 2, D, y + e / 2, z + e / 2, edgeMat);
      for (const [x, z] of [[0, 0], [0, W], [D, 0], [D, W]]) this.box(shell, 'frame', 'Chassis frame', x - e / 2, 0, z - e / 2, x + e / 2, H, z + e / 2, edgeMat);
      for (const [x, y] of [[0, 0], [D, 0], [0, H], [D, H]]) this.box(shell, 'frame', 'Chassis frame', x - e / 2, y - e / 2, 0, x + e / 2, y + e / 2, W, edgeMat);
      const footMat = this.material(0x0b0c0e, 1, { roughness: 0.9 });
      for (const [x, z] of [[24, 24], [D - 24, 24], [24, W - 24], [D - 24, W - 24]]) this.box(shell, 'frame', 'Case feet', x - 16, H + t, z - 12, x + 16, H + FEET, z + 12, footMat);
      this.box(shell, 'panel:rear', 'Rear I/O cut-out', -t - 0.5, comps.mobo.y + 8, 6, 0.5, comps.mobo.y + 160, 50, this.material(0x050607, 1));

      const sideType = P.side.type;
      const sideMat = sideType === 'solid'
        ? this.material(0x9fb4cc, 0.12, { roughness: 0.05, metalness: 0.1, depthWrite: false })
        : this.panelMaterial(sideType, D, H);
      this.box(glass, 'panel:side', sideType === 'solid' ? 'Tempered glass side panel' : `Side panel (${name('side')})`, 0, 0, W, D, H, W + 3, sideMat, false);
      this.box(glass, 'panel:back', 'Rear side panel', 0, 0, -28, D, H, -26, this.material(PALETTE.panel, 1));
    }

    buildBoard(config, comps) {
      const g = this.layers.board;
      const m = comps.mobo;
      const s = comps.socket;
      const entry = AF.catalog.boardOf(config);
      const label = entry ? entry.name : 'Motherboard';
      const key = 'board';
      this.box(g, key, label, m.x, m.y, 0.5, m.x + m.w, m.y + m.h, BOARD_Z, this.material(PALETTE.pcb, 1, { roughness: 0.8 }));
      this.box(g, key, label, m.x, m.y + 6, BOARD_Z, m.x + 28, m.y + Math.min(165, m.h * 0.55), BOARD_Z + 28, this.material(PALETTE.darkMetal, 1, { metalness: 0.7, roughness: 0.4 }));
      this.box(g, key, label, s.x - 70, m.y + 8, BOARD_Z, s.x + 40, Math.max(m.y + 30, s.y - 34), BOARD_Z + 22, this.material(0x2d3138, 1, { metalness: 0.75, roughness: 0.35 }));
      this.box(g, key, label, s.x - 24, s.y - 24, BOARD_Z, s.x + 24, s.y + 24, BOARD_Z + 4, this.material(PALETTE.silver, 1, { metalness: 0.9, roughness: 0.3 }));
      const ramMat = this.material(PALETTE.ram, 1, { metalness: 0.6, roughness: 0.4 });
      const ramTop = this.material(0x5c6470, 1, { metalness: 0.7, roughness: 0.3 });
      for (let k = 0; k < 4; k++) {
        const rx = s.x + 50 + k * 9;
        if (rx + 6 > m.x + m.w - 8) break;
        this.box(g, key, label, rx, s.y - 66, BOARD_Z, rx + 6.5, s.y + 66, BOARD_Z + 33, ramMat);
        this.box(g, key, label, rx, s.y - 66, BOARD_Z + 33, rx + 6.5, s.y + 66, BOARD_Z + 36, ramTop);
      }
      this.box(g, key, label, m.x + m.w - 10, s.y + 25, BOARD_Z, m.x + m.w - 2, s.y + 85, BOARD_Z + 16, this.material(0x0b0c0e, 1));
      for (const slot of comps.pcieSlots) {
        this.box(g, key, label, m.x + 18, slot.y - 3.5, BOARD_Z, m.x + 108, slot.y + 3.5, BOARD_Z + 11, this.material(slot.primary ? 0x9aa1ab : 0x0d0f12, 1, { metalness: slot.primary ? 0.85 : 0.2 }));
      }
      if (m.h > 200) {
        const cy = m.y + m.h - 70;
        this.box(g, key, label, m.x + m.w - 95, cy, BOARD_Z, m.x + m.w - 35, cy + 45, BOARD_Z + 9, this.material(0x2a2e35, 1, { metalness: 0.7 }));
      }
    }

    buildCooler(state) {
      const g = this.layers.cooler;
      const config = state.config;
      const comps = state.layout.components;
      const cooler = AF.catalog.cpuCooler(config);
      const cc = comps.cpuCooler;
      const label = cooler.name;
      const key = 'cooler';
      const s = comps.socket;
      const nickel = this.material(0xd5d9df, 1, { metalness: 0.9, roughness: 0.28 });
      const copper = this.material(PALETTE.copper, 1, { metalness: 0.85, roughness: 0.32 });
      if (cooler.type === 'tower') {
        const zTop = BOARD_Z + cooler.height;
        const zFin = BOARD_Z + 36;
        this.box(g, key, label, s.x - 21, s.y - 21, BOARD_Z + 4, s.x + 21, s.y + 21, BOARD_Z + 16, copper);
        this.box(g, key, label, s.x - 30, s.y - 30, BOARD_Z + 16, s.x + 30, s.y + 30, BOARD_Z + 22, nickel);
        const fin = this.material(PALETTE.aluminium, 1, { metalness: 0.8, roughness: 0.35 });
        for (const t of cc.towers) {
          for (let y = cc.y; y < cc.y + cc.h; y += 3.2) this.box(g, key, label, t.x, y, zFin, t.x + t.w, y + 0.5, zTop - 3, fin);
          this.box(g, key, label, t.x, cc.y - 1, zTop - 3, t.x + t.w, cc.y + cc.h + 1, zTop, this.material(0x2a2d33, 1, { metalness: 0.6, roughness: 0.35 }));
        }
        const pipes = cc.towers.length > 1 ? 6 : 4;
        for (let k = 0; k < pipes; k++) {
          const tower = cc.towers[k % cc.towers.length];
          const x = tower.x + tower.w * ((Math.floor(k / cc.towers.length) + 1) / (Math.ceil(pipes / cc.towers.length) + 1));
          this.cylinder(g, key, label, x, s.y + (k % 2 ? 9 : -9), (BOARD_Z + 22 + zTop) / 2, 3.2, zTop - BOARD_Z - 24, 'z', copper, 12);
        }
        const zMid = (zFin + zTop) / 2;
        const fanSize = Math.min(cooler.fanSize, zTop - zFin + 14);
        for (const f of cc.fans) {
          this.fanModel(g, key, `${label} fan`, { x: f.x + f.w / 2, y: f.y + f.h / 2, z: zMid, size: fanSize, axis: 'x', mode: 'cooler', speed: config.cpu.coolerFanSpeed, fanId: config.cpu.coolerFan, flow: [-1, 0, 0] });
        }
        this.label(cooler.name.replace(/^(Noctua|Thermalright|DeepCool|be quiet!|Arctic|Scythe|Cooler Master|Corsair|NZXT|ID-COOLING)\s+/i, ''), cc.bounds.x + cc.bounds.w / 2, cc.y - 6, zTop, 'labels');
      } else if (cooler.type === 'aio') {
        this.cylinder(g, key, `${label} pump`, s.x, s.y, BOARD_Z + 24, 34, 40, 'z', this.material(0x111317, 1, { metalness: 0.5, roughness: 0.35 }), 40);
        this.cylinder(g, key, `${label} pump`, s.x, s.y, BOARD_Z + 45, 30, 3, 'z', this.material(0x2c3e66, 1, { emissive: 0x3b82f6, emissiveIntensity: 0.35 }), 40);
        const rad = comps.radiator;
        if (rad) {
          const thick = rad.thickness;
          const zc = this.W / 2;
          const radMat = (spanA, spanB) => this.material(0x2a2e35, 1, { metalness: 0.6, roughness: 0.45, alphaMap: this.patternTexture('fins', spanA / 8, 1), alphaTest: 0.3 });
          for (const slot of rad.slots) {
            const half = slot.size / 2;
            let b;
            if (slot.panel === 'front') b = [this.D - FT - thick, slot.cy - half, this.D - FT, slot.cy + half];
            else if (slot.panel === 'rear') b = [FT, slot.cy - half, FT + thick, slot.cy + half];
            else if (slot.panel === 'top') b = [slot.cx - half, FT, slot.cx + half, FT + thick];
            else b = [slot.cx - half, this.H - FT - thick, slot.cx + half, this.H - FT];
            this.box(g, key, `${label} radiator`, b[0], b[1], zc - 60, b[2], b[3], zc + 60, radMat(slot.size, thick));
            this.box(g, key, `${label} radiator`, b[0], b[1], zc - 62, b[2], b[3], zc - 58, this.material(0x15171a, 1));
            this.box(g, key, `${label} radiator`, b[0], b[1], zc + 58, b[2], b[3], zc + 62, this.material(0x15171a, 1));
          }
          const mid = rad.slots[Math.floor(rad.slots.length / 2)];
          const target = mid.panel === 'front' ? [this.D - FT - thick, mid.cy] : mid.panel === 'rear' ? [FT + thick, mid.cy] : mid.panel === 'top' ? [mid.cx, FT + thick] : [mid.cx, this.H - FT - thick];
          const tubeMat = this.material(0x0e0f12, 1, { roughness: 0.85 });
          for (const dz of [-12, 12]) {
            this.tube(g, key, `${label} tubes`, [[s.x, s.y - 20, BOARD_Z + 40 + dz], [(s.x + target[0]) / 2, Math.min(s.y, target[1]) - 20, this.W / 2 + dz], [target[0], target[1], this.W / 2 + dz]], 5.5, tubeMat);
          }
        }
        this.label(cooler.name.replace(/^(Arctic|NZXT|Corsair|Lian Li|DeepCool|be quiet!|EK-|Cooler Master|ASUS ROG)\s*/i, ''), s.x, s.y - 40, BOARD_Z + 50, 'labels');
      } else {
        const f = cooler.footprint || 100;
        const zTop = BOARD_Z + cooler.height;
        const fin = this.material(PALETTE.aluminium, 1, { metalness: 0.8, roughness: 0.35 });
        this.box(g, key, label, s.x - f / 2, s.y - f / 2, BOARD_Z + 4, s.x + f / 2, s.y + f / 2, BOARD_Z + 10, copper);
        for (let x = s.x - f / 2; x < s.x + f / 2; x += 3.5) this.box(g, key, label, x, s.y - f / 2, BOARD_Z + 10, x + 0.7, s.y + f / 2, zTop - FT, fin);
        this.fanModel(g, key, `${label} fan`, { x: s.x, y: s.y, z: zTop - FT / 2, size: Math.min(f, (cooler.fan && cooler.fan.size) || 92), axis: 'z', mode: 'cooler', speed: config.cpu.coolerFanSpeed, style: { frame: 0x15171a, blade: 0x24272c, hub: 0x15171a }, flow: [0, 0, -1] });
        this.label(cooler.name, s.x, s.y - f / 2 - 6, zTop, 'labels');
      }
    }

    buildGpu(state) {
      const g = this.layers.gpu;
      const config = state.config;
      const gp = state.layout.components.gpu;
      const entry = AF.catalog.byId(AF.catalog.GPUS, config.gpu.model);
      const label = entry ? entry.name : 'Graphics card';
      const key = 'gpu';
      const gc = AF.catalog.gpuCooler(config);
      const fe = entry && /Founders/i.test(entry.name);
      const z0 = BOARD_Z + 2;
      const z1 = z0 + CARD_HEIGHT;
      const shroudColor = fe ? 0x9ea4ad : gc.type === 'blower' ? 0x1e2a3a : PALETTE.gpuShroud;
      this.box(g, key, label, 0, gp.pcbTop - 2.5, z0, gp.pcbLength, gp.pcbTop, z1, this.material(0x2b2f36, 1, { metalness: 0.75, roughness: 0.35 }));
      this.box(g, key, label, 0, gp.pcbTop, z0, gp.pcbLength, gp.pcbBottom, z1, this.material(0x0f2a1c, 1, { roughness: 0.8 }));
      const heatsinkTop = gp.sinkTop;
      const shroudBottom = gp.sinkBottom;
      this.box(g, key, label, 0, heatsinkTop, z0, gp.length, shroudBottom - 4, z1, this.material(0x8f959e, 1, { metalness: 0.8, roughness: 0.4, alphaMap: this.patternTexture('fins', gp.length / 5, 1), alphaTest: 0.3 }));
      this.box(g, key, label, 0, shroudBottom - 6, z0, gp.length, shroudBottom, z1, this.material(shroudColor, 1, { metalness: fe ? 0.85 : 0.35, roughness: fe ? 0.3 : 0.55 }));
      this.box(g, key, label, 0, heatsinkTop, z1 - 4, gp.length, shroudBottom, z1, this.material(shroudColor, 1, { metalness: fe ? 0.85 : 0.35, roughness: fe ? 0.3 : 0.55 }));
      this.box(g, key, label, gp.length - 4, heatsinkTop, z0, gp.length, shroudBottom, z1, this.material(shroudColor, 1, { metalness: fe ? 0.85 : 0.35 }));
      this.box(g, key, label, -2, gp.pcbTop - 8, z0 - 6, 0.5, shroudBottom + 2, z1 + 4, this.material(0xa9b0b9, 1, { metalness: 0.9, roughness: 0.3 }));
      this.box(g, key, label, gp.length - 70, gp.pcbTop - 12, z1 - 30, gp.length - 40, gp.pcbTop - 2.5, z1 - 6, this.material(0x0b0c0e, 1));
      const zc = (z0 + z1) / 2;
      const speed = config.gpu.fanSpeed;
      const style = { frame: shroudColor, blade: fe ? 0x22252a : 0x1b1d21, hub: fe ? 0x1b1d21 : 0x2b2f36 };
      if (gc.type === 'blower') {
        this.fanModel(g, key, `${label} blower`, { x: gp.length - 50, y: shroudBottom - FT / 2, z: zc, size: 70, axis: 'y', mode: 'cooler', speed, style, flow: [0, -1, 0] });
      } else {
        const n = Math.max(1, config.gpu.fanCount || gc.fanCount);
        const span = gp.length * 0.9;
        const size = Math.min(CARD_HEIGHT - 12, span / n - 6);
        for (let k = 0; k < n; k++) {
          const cx = gp.length * 0.05 + span * (k + 0.5) / n;
          this.fanModel(g, key, `${label} fan ${k + 1}`, { x: cx, y: shroudBottom - FT / 2 + 3, z: zc, size, axis: 'y', mode: 'cooler', speed, style, flow: [0, -1, 0], reverse: k % 2 === 1 });
        }
      }
      this.label(label.replace(/^(NVIDIA|AMD)\s+/, ''), gp.length * 0.45, gp.pcbTop - 14, z1, 'labels');
    }

    buildPsu(config, comps) {
      const g = this.layers.shroud;
      if (!comps.shroud) return;
      const sh = comps.shroud;
      const H = this.H;
      const W = this.W;
      this.box(g, 'shroud', 'PSU shroud', 0, sh.y, 0, sh.x1, sh.y + 3, W, this.panelMaterial('perforated', sh.x1, W));
      this.box(g, 'shroud', 'PSU shroud', sh.x1 - 3, sh.y, 0, sh.x1, H, W, this.material(PALETTE.shroud, 1, { metalness: 0.2, roughness: 0.8 }));
      const len = Math.min(180, sh.x1 - 20);
      const psuH = Math.min(86, H - sh.y - 8);
      this.box(g, 'psu', 'Power supply', 4, H - psuH - 2, W / 2 - 75, 4 + len, H - 2, W / 2 + 75, this.material(PALETTE.psu, 1, { metalness: 0.5, roughness: 0.5 }));
      this.cylinder(g, 'psu', 'Power supply', 4 + len / 2, H - 1.5, W / 2, 62, 1.2, 'y', this.material(0x1d2025, 1, { alphaMap: this.patternTexture('mesh', 18, 18), alphaTest: 0.5 }), 40);
      this.label('PSU', 4 + len / 2, H - psuH - 6, W / 2 + 75, 'labels');
    }

    buildCables(config, comps) {
      const g = this.layers.cables;
      const m = comps.mobo;
      const s = comps.socket;
      const gp = comps.gpu;
      const mat = this.material(PALETTE.cable, 1, { roughness: 0.9, metalness: 0.05 });
      const right = m.x + m.w;
      this.tube(g, 'cables', '24-pin power cable', [[right - 6, s.y + 55, BOARD_Z + 16], [right + 14, s.y + 60, BOARD_Z + 12], [right + 22, s.y + 70, -4]], 7, mat);
      this.tube(g, 'cables', 'CPU power cable', [[m.x + 26, m.y + 10, BOARD_Z + 12], [m.x + 20, m.y - 8, BOARD_Z + 8], [m.x + 32, m.y - 12, -4]], 4.5, mat);
      const gx = gp.length - 55;
      this.tube(g, 'cables', 'GPU power cable', [[gx, gp.pcbTop - 12, BOARD_Z + 2 + CARD_HEIGHT - 18], [gx + 20, gp.pcbTop - 40, BOARD_Z + 60], [Math.min(this.D - 40, right + 22), gp.pcbTop - 30, -4]], 5, mat);
    }

    buildCaseFans(state) {
      const config = state.config;
      const layer = this.layers.fans;
      const elements = new Map(state.air.elements.map((e) => [e.id, e]));
      const W = this.W;
      const inwardOf = { front: [-1, 0, 0], rear: [1, 0, 0], top: [0, 1, 0], bottom: [0, -1, 0] };
      for (const s of state.layout.slots) {
        if (!s.available) continue;
        const el = elements.get(s.id);
        const sc = AF.geometry.slotConfig(config, s.id);
        const name = `${AF.data.PANELS[s.panel].name} slot ${s.index + 1}`;
        let pos;
        let axis;
        let inward;
        if (s.axis === 'z') {
          pos = [s.cx, s.cy, W - FT / 2 - 3];
          axis = 'z';
          inward = [0, 0, -1];
        } else {
          const iw = inwardOf[s.panel];
          pos = [s.cx + iw[0] * (FT / 2 + 3), s.cy + iw[1] * (FT / 2 + 3), W / 2];
          axis = s.axis === 'x' ? 'x' : 'y';
          inward = iw;
        }
        const isFan = el && el.kind === 'fan';
        const mode = isFan ? (sc.mode === 'intake' ? 'intake' : 'exhaust') : 'vent';
        const flowsIn = el ? el.inflow > 0 : true;
        const flow = isFan ? (flowsIn ? inward : inward.map((v) => -v)) : null;
        this.fanModel(layer, `fan:${s.id}`, isFan ? `${name} · ${sc.mode} fan` : `${name} · open`, { x: pos[0], y: pos[1], z: pos[2], size: s.size, axis, mode, speed: sc.speed, fanId: sc.fan, flow });
      }
      const flows = { up: [0, -1, 0], down: [0, 1, 0], left: [-1, 0, 0], right: [1, 0, 0] };
      for (const cf of state.layout.customFans || []) {
        const axis = cf.dir === 'left' || cf.dir === 'right' ? 'x' : 'y';
        const z = cf.mount.anchor === 'gpu' ? BOARD_Z + 2 + CARD_HEIGHT / 2 : W / 2;
        this.fanModel(layer, `fan:${cf.id}`, `${cf.label} · ${cf.where}`, { x: cf.x, y: cf.y, z, size: cf.size, axis, mode: cf.mode, speed: cf.speed, fanId: cf.fan, flow: flows[cf.dir] });
      }
    }

    buildHeatmap(group, state) {
      const sim = state.sim;
      if (!sim) return;
      this.heatCanvas = document.createElement('canvas');
      this.heatCanvas.width = sim.nx - 2;
      this.heatCanvas.height = sim.ny - 2;
      this.heatCtx = this.heatCanvas.getContext('2d');
      this.heatImage = this.heatCtx.createImageData(this.heatCanvas.width, this.heatCanvas.height);
      this.heatTexture = new THREE.CanvasTexture(this.heatCanvas);
      this.heatTexture.encoding = THREE.sRGBEncoding;
      this.heatTexture.magFilter = THREE.LinearFilter;
      const w = this.heatCanvas.width * sim.dxMm;
      const h = this.heatCanvas.height * sim.dxMm;
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: this.heatTexture, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
      plane.position.copy(this.P(w / 2, h / 2, this.W / 2));
      group.add(plane);
      this.heatSim = sim;
      this.updateHeatmap(state);
    }

    updateHeatmap(state) {
      const sim = state.sim;
      if (!sim || sim !== this.heatSim || !this.heatImage) return;
      const img = this.heatImage.data;
      const LUT = AF.render.LUT;
      const range = this.app.renderer.range;
      const iw = this.heatCanvas.width;
      const ih = this.heatCanvas.height;
      const speed = state.view === 'speed';
      for (let j = 0; j < ih; j++) for (let i = 0; i < iw; i++) {
        const c = (i + 1) + (j + 1) * sim.nx;
        const o = (i + j * iw) * 4;
        if (sim.type[c] !== 0) { img[o + 3] = 0; continue; }
        const v = speed ? sim.speedAvg[c] / range.vMax : (sim.T[c] - range.tMin) / (range.tMax - range.tMin);
        const k = Math.max(0, Math.min(255, Math.round(v * 255))) * 3;
        img[o] = LUT[k];
        img[o + 1] = LUT[k + 1];
        img[o + 2] = LUT[k + 2];
        img[o + 3] = 150;
      }
      this.heatCtx.putImageData(this.heatImage, 0, 0);
      this.heatTexture.needsUpdate = true;
    }

    buildParticles(group, state) {
      const sim = state.sim;
      if (!sim) return;
      const n = sim.particleCount;
      this.particleZ = new Float32Array(n);
      for (let k = 0; k < n; k++) this.particleZ[k] = 18 + Math.random() * Math.max(10, this.W - 36);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 6), 3));
      this.particleLines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      this.particleLines.frustumCulled = false;
      group.add(this.particleLines);
      this.particleSim = sim;
    }

    updateParticles(state) {
      const sim = state.sim;
      if (!this.particleLines || sim !== this.particleSim) return;
      const pos = this.particleLines.geometry.attributes.position.array;
      const col = this.particleLines.geometry.attributes.color.array;
      const L = sim.trailLength;
      const k = sim.dxMm;
      const LUT = AF.render.LUT;
      const range = this.app.renderer.range;
      const D2 = this.D / 2;
      const H2 = this.H / 2;
      const W2 = this.W / 2;
      for (let n = 0; n < sim.particleCount; n++) {
        const base = n * L * 2;
        const hx = sim.trail[base];
        const hy = sim.trail[base + 1];
        const tx = sim.trail[base + 2 * (L - 2)];
        const ty = sim.trail[base + 2 * (L - 2) + 1];
        const jump = Math.abs(hx - tx) + Math.abs(hy - ty) > 8;
        const z = this.particleZ[n] - W2;
        const o = n * 6;
        pos[o] = (hx - 1) * k - D2;
        pos[o + 1] = H2 - (hy - 1) * k;
        pos[o + 2] = z;
        pos[o + 3] = jump ? pos[o] : (tx - 1) * k - D2;
        pos[o + 4] = jump ? pos[o + 1] : H2 - (ty - 1) * k;
        pos[o + 5] = z;
        const i = Math.min(sim.nx - 1, Math.max(0, hx | 0));
        const j = Math.min(sim.ny - 1, Math.max(0, hy | 0));
        const t = (sim.T[i + j * sim.nx] - range.tMin) / (range.tMax - range.tMin);
        const li = Math.max(0, Math.min(255, Math.round(t * 255))) * 3;
        const r = LUT[li] / 255;
        const g = LUT[li + 1] / 255;
        const b = LUT[li + 2] / 255;
        col[o] = r; col[o + 1] = g; col[o + 2] = b;
        col[o + 3] = r * 0.15; col[o + 4] = g * 0.15; col[o + 5] = b * 0.15;
      }
      this.particleLines.geometry.attributes.position.needsUpdate = true;
      this.particleLines.geometry.attributes.color.needsUpdate = true;
    }

    applyTransparency() {
      for (const mesh of this.pickables || []) {
        const mat = mesh.material;
        const base = mat.userData.baseOpacity != null ? mat.userData.baseOpacity : 1;
        const faded = this.transparent.has(mesh.userData.key);
        mat.transparent = faded || base < 1;
        mat.opacity = faded ? Math.min(base, FADED_OPACITY) : base;
        mat.depthWrite = !faded && base > 0.6;
        mesh.castShadow = !faded && base >= 0.6;
        mat.needsUpdate = true;
      }
    }

    setOption(key, value) {
      this.options[key] = value;
      if (this.layers && this.layers[key]) this.layers[key].visible = value;
    }

    resetTransparency() {
      this.transparent.clear();
      this.applyTransparency();
    }

    setCamera(name, instant) {
      const preset = CAMERA_PRESETS[name] || CAMERA_PRESETS['3d'];
      const S = Math.max(this.D, this.H, this.W) * Math.max(1, 1.15 / (this.camera.aspect || 1));
      const to = new THREE.Vector3(preset[0] * S, preset[1] * S, preset[2] * S);
      const target = new THREE.Vector3(0, -this.H * 0.04, 0);
      this.view = name;
      if (instant) {
        this.camera.position.copy(to);
        this.controls.target.copy(target);
        this.controls.update();
        this.tween = null;
        return;
      }
      this.tween = { from: this.camera.position.clone(), to, fromTarget: this.controls.target.clone(), toTarget: target, t: 0 };
    }

    resetView() {
      this.setCamera('3d');
    }

    resize() {
      const r = this.host.getBoundingClientRect();
      const w = Math.max(100, Math.round(r.width));
      const h = Math.max(100, Math.round(r.height));
      if (this.size !== `${w}x${h}`) {
        this.size = `${w}x${h}`;
        this.renderer.setSize(w, h, false);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
      }
    }

    updateLabels() {
      const r = this.host.getBoundingClientRect();
      const v = new THREE.Vector3();
      for (const lab of this.labels) {
        const visible = this.options.labels && this.options[lab.layer === 'labels' ? 'labels' : lab.layer] !== false;
        v.copy(lab.pos).project(this.camera);
        if (!visible || v.z > 1) { lab.el.style.display = 'none'; continue; }
        lab.el.style.display = 'block';
        lab.el.style.transform = `translate(${((v.x + 1) / 2) * r.width}px, ${((1 - v.y) / 2) * r.height}px)`;
      }
    }

    update(state, dt) {
      if (!this.active || !this.supported) return;
      this.resize();
      if (this.tween) {
        this.tween.t = Math.min(1, this.tween.t + dt / 0.6);
        const e = 1 - Math.pow(1 - this.tween.t, 3);
        this.camera.position.lerpVectors(this.tween.from, this.tween.to, e);
        this.controls.target.lerpVectors(this.tween.fromTarget, this.tween.toTarget, e);
        if (this.tween.t >= 1) this.tween = null;
      }
      this.controls.update();
      if (this.options.spin) for (const s of this.spinners) s.group.rotation.y += s.rate * dt;
      if (this.layers.particles) this.layers.particles.visible = this.options.particles && state.particles;
      if (this.options.particles && state.particles) this.updateParticles(state);
      if (this.layers.heatmap) this.layers.heatmap.visible = this.options.heatmap && state.view !== 'none';
      if (this.options.heatmap && this.frame++ % 4 === 0) this.updateHeatmap(state);
      this.renderer.render(this.scene, this.camera);
      this.updateLabels();
    }
  }

  AF.View3D = View3D;
  AF.View3D.LAYERS = LAYERS;
})(window);
