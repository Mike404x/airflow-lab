(function (root) {
  const AF = root.AF;
  const C = AF.catalog;
  const D = AF.data;

  const fan = (id, name, size, rpm, cfm, mmh2o, approx) => ({ id, name, size, rpm, cfm, mmh2o, approx: !!approx });

  const MORE_FANS = [
    fan('noctua-a12x25-g2', 'Noctua NF-A12x25 G2 PWM', 120, 1800, 63, 2.4, true),
    fan('noctua-a12x25-ls', 'Noctua NF-A12x25 LS-PWM', 120, 1200, 36.9, 0.97),
    fan('noctua-p12-redux-1300', 'Noctua NF-P12 redux-1300 PWM', 120, 1300, 54.3, 1.68),
    fan('noctua-s12b-redux', 'Noctua NF-S12B redux-1200 PWM', 120, 1200, 58.9, 1.07),
    fan('noctua-f12-ippc2000', 'Noctua NF-F12 industrialPPC-2000', 120, 2000, 71.6, 3.94),
    fan('noctua-p14s-redux', 'Noctua NF-P14s redux-1200 PWM', 140, 1200, 64.9, 1.25),
    fan('noctua-a14-ippc2000', 'Noctua NF-A14 industrialPPC-2000', 140, 2000, 107.4, 4.18),
    fan('noctua-a14-flx', 'Noctua NF-A14 FLX', 140, 1200, 68, 1.19, true),
    fan('noctua-b9-redux', 'Noctua NF-B9 redux-1600 PWM', 92, 1600, 37.9, 1.6, true),
    fan('arctic-f12', 'Arctic F12 PWM PST', 120, 1350, 53, 1.5, true),
    fan('arctic-f14', 'Arctic F14 PWM PST', 140, 1350, 74, 1.5, true),
    fan('arctic-p12-slim', 'Arctic P12 Slim PWM PST (15 mm)', 120, 2000, 48.8, 2.1, true),
    fan('arctic-p14-max', 'Arctic P14 Max', 140, 2800, 99.6, 5.0, true),
    fan('corsair-af140-elite', 'Corsair AF140 Elite', 140, 1600, 68.4, 1.66, true),
    fan('corsair-ml140', 'Corsair ML140 Pro', 140, 2000, 97, 3.0),
    fan('corsair-ll140', 'Corsair LL140 RGB', 140, 1300, 51.7, 0.9),
    fan('corsair-ql120', 'Corsair QL120 RGB', 120, 1500, 41.8, 1.82),
    fan('corsair-ql140', 'Corsair QL140 RGB', 140, 1250, 50.2, 1.29),
    fan('corsair-rx120', 'Corsair iCUE LINK RX120', 120, 2100, 73.5, 4.3, true),
    fan('corsair-qx120', 'Corsair iCUE LINK QX120', 120, 2400, 63.1, 4.3, true),
    fan('corsair-rx140', 'Corsair iCUE LINK RX140', 140, 1700, 85, 3.0, true),
    fan('corsair-sp140-elite', 'Corsair SP140 RGB Elite', 140, 1200, 68, 1.3, true),
    fan('lianli-sl120-v2', 'Lian Li UNI FAN SL120 V2', 120, 2000, 64.5, 2.9, true),
    fan('lianli-sl140-v2', 'Lian Li UNI FAN SL140 V2', 140, 1800, 98, 3.0, true),
    fan('lianli-tl120', 'Lian Li UNI FAN TL120', 120, 2600, 72, 3.5, true),
    fan('lianli-tl140', 'Lian Li UNI FAN TL140', 140, 2300, 92, 3.2, true),
    fan('lianli-al120-v2', 'Lian Li UNI FAN AL120 V2', 120, 2000, 64.5, 2.8, true),
    fan('lianli-p28', 'Lian Li UNI FAN P28', 120, 2800, 85, 5.0, true),
    fan('bequiet-silent-wings4-140', 'be quiet! Silent Wings 4 140 PWM', 140, 1100, 61, 1.2, true),
    fan('bequiet-silent-wings4-120-hs', 'be quiet! Silent Wings 4 120 high-speed', 120, 2500, 79, 3.1, true),
    fan('bequiet-silent-wings-pro4-120', 'be quiet! Silent Wings Pro 4 120', 120, 3000, 79.7, 5.4, true),
    fan('bequiet-silent-wings-pro4-140', 'be quiet! Silent Wings Pro 4 140', 140, 2400, 105, 4.6, true),
    fan('bequiet-pure-wings3-120', 'be quiet! Pure Wings 3 120 PWM', 120, 1600, 52, 1.8, true),
    fan('bequiet-pure-wings3-140', 'be quiet! Pure Wings 3 140 PWM', 140, 1200, 68, 1.5, true),
    fan('bequiet-light-wings-120', 'be quiet! Light Wings 120 PWM', 120, 1700, 51, 1.6, true),
    fan('phanteks-t30-120', 'Phanteks T30-120', 120, 3000, 70, 5.0, true),
    fan('phanteks-d30-120', 'Phanteks D30-120', 120, 2400, 63, 3.0, true),
    fan('phanteks-m25-140', 'Phanteks M25-140', 140, 1800, 80, 2.0, true),
    fan('thermalright-tl-c12-pro', 'Thermalright TL-C12 Pro', 120, 1850, 77, 2.4, true),
    fan('thermalright-tl-c14c', 'Thermalright TL-C14C', 140, 1500, 80, 1.6, true),
    fan('thermalright-tl-b12', 'Thermalright TL-B12', 120, 1500, 57, 1.6, true),
    fan('cm-sickleflow-140', 'Cooler Master SickleFlow 140', 140, 1400, 68, 1.6, true),
    fan('cm-mobius-120', 'Cooler Master Mobius 120', 120, 2400, 63, 2.7, true),
    fan('cm-200-bundled', 'Cooler Master 200 mm (bundled)', 200, 800, 90, 0.8, true),
    fan('scythe-kaze-flex2-140', 'Scythe Kaze Flex II 140', 140, 1200, 66, 1.2, true),
    fan('fractal-dynamic-x2-12', 'Fractal Dynamic X2 GP-12 (bundled)', 120, 1200, 52, 0.7, true),
    fan('nzxt-f120-rgb-core', 'NZXT F120 RGB Core', 120, 1800, 61, 2.1, true),
    fan('ek-vardar-s-120', 'EK-Vardar S 120ER', 120, 2200, 77, 3.2, true),
    fan('silverstone-ap120i', 'SilverStone Air Penetrator AP120i', 120, 1800, 60, 1.9, true),
    fan('silverstone-ap183', 'SilverStone Air Penetrator AP183 (180 mm)', 180, 1200, 88, 1.2, true),
    fan('thermaltake-ct140', 'Thermaltake CT140 (bundled)', 140, 1500, 67, 1.6, true),
    fan('thermaltake-bundled-120', 'Thermaltake 120 mm (bundled)', 120, 1200, 45, 1.2, true),
    fan('antec-bundled-120', 'Antec 120 mm (bundled)', 120, 1200, 48, 1.3, true),
    fan('hyte-thicc-fp12', 'HYTE THICC FP12', 120, 3000, 100, 6.0, true),
  ];

  const FE_FAN = { cfm: 65, mmh2o: 3.5, rpm: 3000, size: 115 };

  function gpu(id, group, name, power, length, slots, fans, flowThrough, extra) {
    const rjc = power >= 500 ? 0.025 : power >= 400 ? 0.03 : power >= 300 ? 0.04 : power >= 240 ? 0.05 : power >= 190 ? 0.06 : power >= 150 ? 0.1 : power >= 100 ? 0.13 : 0.15;
    const tmax = group.startsWith('NVIDIA') || group.startsWith('Workstation') ? 88 : 90;
    return Object.assign({
      id, group, name, power, length, slots, cooler: fans >= 3 ? 'open-triple' : 'open-dual',
      fanCount: fans, flowThrough, rjc, tmax, approx: true,
    }, extra || {});
  }
  const FE = { fanSpec: FE_FAN, approx: false };
  const BLOWER = { cooler: 'blower', fanCount: 1, flowThrough: false };
  const N50 = 'NVIDIA RTX 50';
  const N40 = 'NVIDIA RTX 40';
  const N30 = 'NVIDIA RTX 30';
  const A9 = 'AMD Radeon RX 9000';
  const A7 = 'AMD Radeon RX 7000/6000';
  const IA = 'Intel Arc';
  const WS = 'Workstation (blower)';

  const MORE_GPUS = [
    gpu('rtx5090-suprim', N50, 'MSI RTX 5090 Suprim X', 575, 359, 3.8, 3, true),
    gpu('rtx5090-gaming-trio', N50, 'MSI RTX 5090 Gaming Trio OC', 575, 359, 3.5, 3, true),
    gpu('rtx5090-gigabyte-gaming-oc', N50, 'Gigabyte RTX 5090 Gaming OC', 575, 360, 3.75, 3, true),
    gpu('rtx5090-aorus-master', N50, 'Gigabyte Aorus RTX 5090 Master', 600, 360, 4, 3, true),
    gpu('rtx5090-tuf', N50, 'ASUS TUF RTX 5090', 575, 348, 3.6, 3, true),
    gpu('rtx5090-zotac-solid', N50, 'Zotac RTX 5090 Solid', 575, 332, 3.5, 3, true),
    gpu('rtx5080-astral', N50, 'ASUS ROG Astral RTX 5080', 360, 358, 3.8, 3, true),
    gpu('rtx5080-gaming-trio', N50, 'MSI RTX 5080 Gaming Trio OC', 360, 338, 3, 3, true),
    gpu('rtx5080-windforce', N50, 'Gigabyte RTX 5080 Windforce', 360, 304, 2.5, 3, true),
    gpu('rtx5080-zotac-solid', N50, 'Zotac RTX 5080 Solid', 360, 329, 3, 3, true),
    gpu('rtx5070ti-tuf', N50, 'ASUS TUF RTX 5070 Ti', 300, 348, 3.6, 3, true),
    gpu('rtx5070ti-eagle', N50, 'Gigabyte RTX 5070 Ti Eagle', 300, 304, 2.5, 3, true),
    gpu('rtx5070ti-prime', N50, 'ASUS Prime RTX 5070 Ti', 300, 304, 2.5, 3, true),
    gpu('rtx5070-gaming-trio', N50, 'MSI RTX 5070 Gaming Trio OC', 250, 338, 2.7, 3, true),
    gpu('rtx5070-windforce', N50, 'Gigabyte RTX 5070 Windforce', 250, 273, 2.5, 3, true),
    gpu('rtx5070-zotac-twin', N50, 'Zotac RTX 5070 Twin Edge', 250, 230, 2, 2, false),
    gpu('rtx5060ti-windforce', N50, 'Gigabyte RTX 5060 Ti Windforce', 180, 199, 2, 2, false),
    gpu('rtx5060-zotac-twin', N50, 'Zotac RTX 5060 Twin Edge', 145, 220, 2, 2, false),
    gpu('rtx4090-strix', N40, 'ASUS ROG Strix RTX 4090', 450, 358, 3.5, 3, true),
    gpu('rtx4090-zotac-trinity', N40, 'Zotac RTX 4090 Trinity', 450, 356, 3.5, 3, true),
    gpu('rtx4080-fe', N40, 'RTX 4080 Founders Edition', 320, 304, 3, 2, true, FE),
    gpu('rtx4080s-gaming-x-slim', N40, 'MSI RTX 4080 SUPER Gaming X Slim', 320, 322, 3, 3, true),
    gpu('rtx4080s-tuf', N40, 'ASUS TUF RTX 4080 SUPER', 320, 348, 3.65, 3, true),
    gpu('rtx4070tis-zotac-trinity', N40, 'Zotac RTX 4070 Ti SUPER Trinity', 285, 306, 2.5, 3, true),
    gpu('rtx4070tis-gigabyte-gaming-oc', N40, 'Gigabyte RTX 4070 Ti SUPER Gaming OC', 285, 336, 3, 3, true),
    gpu('rtx4070-fe', N40, 'RTX 4070 Founders Edition', 200, 244, 2, 2, true, FE),
    gpu('rtx4070s-dual', N40, 'ASUS Dual RTX 4070 SUPER', 220, 267, 2.5, 2, false),
    gpu('rtx4070s-zotac-twin', N40, 'Zotac RTX 4070 SUPER Twin Edge', 220, 234, 2, 2, false),
    gpu('rtx4070-windforce', N40, 'Gigabyte RTX 4070 Windforce OC', 200, 261, 2.5, 3, false),
    gpu('rtx4060ti-gaming-x', N40, 'MSI RTX 4060 Ti Gaming X', 160, 247, 2.5, 2, false),
    gpu('rtx4060-eagle', N40, 'Gigabyte RTX 4060 Eagle OC', 115, 272, 2, 3, false),
    gpu('rtx4060-zotac-solo', N40, 'Zotac RTX 4060 Solo (single fan)', 115, 163, 2, 1, false),
    gpu('rtx3060ti-fe', N30, 'RTX 3060 Ti Founders Edition', 200, 242, 2, 2, true, FE),
    gpu('rtx3070ti-fe', N30, 'RTX 3070 Ti Founders Edition', 290, 267, 2, 2, true, FE),
    gpu('rtx3080-gaming-x-trio', N30, 'MSI RTX 3080 Gaming X Trio', 340, 323, 2.7, 3, true),
    gpu('rtx3080-tuf', N30, 'ASUS TUF RTX 3080', 320, 300, 2.7, 3, true),
    gpu('rtx3080-ftw3', N30, 'EVGA RTX 3080 FTW3 Ultra', 380, 300, 2.75, 3, false),
    gpu('rx9070xt-tuf', A9, 'ASUS TUF RX 9070 XT', 340, 331, 3.6, 3, true),
    gpu('rx9070xt-quicksilver', A9, 'XFX Quicksilver RX 9070 XT', 330, 335, 3, 3, true),
    gpu('rx9070xt-gigabyte-gaming-oc', A9, 'Gigabyte RX 9070 XT Gaming OC', 340, 288, 3, 3, true),
    gpu('rx9070xt-steel-legend', A9, 'ASRock RX 9070 XT Steel Legend', 304, 290, 2.6, 3, true),
    gpu('rx9060xt-pulse', A9, 'Sapphire Pulse RX 9060 XT', 160, 240, 2, 2, false),
    gpu('rx7900xtx-pulse', A7, 'Sapphire Pulse RX 7900 XTX', 355, 313, 2.7, 3, false),
    gpu('rx7900xtx-merc', A7, 'XFX Merc 310 RX 7900 XTX', 400, 344, 3.5, 3, true),
    gpu('rx7900xtx-hellhound', A7, 'PowerColor Hellhound RX 7900 XTX', 355, 332, 3, 3, false),
    gpu('rx7900xt-pulse', A7, 'Sapphire Pulse RX 7900 XT', 315, 313, 2.7, 3, false),
    gpu('rx7800xt-hellhound', A7, 'PowerColor Hellhound RX 7800 XT', 263, 322, 2.5, 3, false),
    gpu('rx7600xt-pulse', A7, 'Sapphire Pulse RX 7600 XT', 190, 243, 2, 2, false),
    gpu('rx6950xt-ref', A7, 'RX 6950 XT (reference)', 335, 267, 2.5, 3, false, { approx: false }),
    gpu('rx6600-mech', A7, 'MSI RX 6600 Mech 2X', 132, 213, 2, 2, false),
    gpu('arc-b570-challenger', IA, 'ASRock Arc B570 Challenger', 150, 248, 2, 2, false),
    gpu('arc-a750-le', IA, 'Arc A750 Limited Edition', 225, 267, 2, 2, true, { approx: false }),
    gpu('rtx-a5000', WS, 'NVIDIA RTX A5000', 230, 267, 2, 1, false, BLOWER),
    gpu('rtx-5000-ada', WS, 'NVIDIA RTX 5000 Ada', 250, 267, 2, 1, false, BLOWER),
    gpu('radeon-pro-w7800', WS, 'AMD Radeon Pro W7800', 260, 280, 2, 1, false, BLOWER),
  ];

  const board = (id, group, name, socket, layout, width) => ({ id, group, name, socket, layout, width });
  const AM5 = 'AMD AM5';
  const AM4 = 'AMD AM4';
  const L17 = 'Intel LGA1700';
  const L18 = 'Intel LGA1851';

  const MORE_BOARDS = [
    board('x870e-extreme', AM5, 'ASUS ROG Crosshair X870E Extreme', 'AM5', 'eatx', 277),
    board('x870e-apex', AM5, 'ASUS ROG Crosshair X870E Apex', 'AM5', 'atx-slot1'),
    board('x870e-proart', AM5, 'ASUS ProArt X870E-Creator WiFi', 'AM5', 'atx-slot1'),
    board('x870-tuf', AM5, 'ASUS TUF Gaming X870-Plus WiFi', 'AM5', 'atx-slot2'),
    board('x870-prime-p', AM5, 'ASUS Prime X870-P WiFi', 'AM5', 'atx-slot2'),
    board('b850-f', AM5, 'ASUS ROG Strix B850-F Gaming WiFi', 'AM5', 'atx-slot2'),
    board('b850-a', AM5, 'ASUS ROG Strix B850-A Gaming WiFi', 'AM5', 'atx-slot2'),
    board('b850-tuf', AM5, 'ASUS TUF Gaming B850-Plus WiFi', 'AM5', 'atx-slot2'),
    board('b650-a', AM5, 'ASUS ROG Strix B650-A Gaming WiFi', 'AM5', 'atx-slot2'),
    board('b650m-tuf', AM5, 'ASUS TUF Gaming B650M-Plus WiFi', 'AM5', 'matx'),
    board('x670e-e', AM5, 'ASUS ROG Strix X670E-E Gaming WiFi', 'AM5', 'atx-slot2'),
    board('x870-i', AM5, 'ASUS ROG Strix X870-I Gaming WiFi', 'AM5', 'itx'),
    board('x870e-godlike', AM5, 'MSI MEG X870E Godlike', 'AM5', 'eatx', 310),
    board('x870e-carbon', AM5, 'MSI MPG X870E Carbon WiFi', 'AM5', 'atx-slot2'),
    board('b850-tomahawk', AM5, 'MSI MAG B850 Tomahawk MAX WiFi', 'AM5', 'atx-slot1'),
    board('b850-pro-p', AM5, 'MSI PRO B850-P WiFi', 'AM5', 'atx-slot1'),
    board('b850m-mortar', AM5, 'MSI MAG B850M Mortar WiFi', 'AM5', 'matx'),
    board('b650m-mortar', AM5, 'MSI MAG B650M Mortar WiFi', 'AM5', 'matx'),
    board('x670e-carbon', AM5, 'MSI MPG X670E Carbon WiFi', 'AM5', 'atx-slot2'),
    board('a620m-e', AM5, 'MSI PRO A620M-E', 'AM5', 'matx'),
    board('x870e-aorus-elite', AM5, 'Gigabyte X870E Aorus Elite WiFi7', 'AM5', 'atx-slot2'),
    board('x870-aorus-elite', AM5, 'Gigabyte X870 Aorus Elite WiFi7', 'AM5', 'atx-slot2'),
    board('b850-aorus-elite', AM5, 'Gigabyte B850 Aorus Elite WiFi7', 'AM5', 'atx-slot2'),
    board('b650-gaming-x', AM5, 'Gigabyte B650 Gaming X AX', 'AM5', 'atx-slot2'),
    board('b650-eagle', AM5, 'Gigabyte B650 Eagle AX', 'AM5', 'atx-slot2'),
    board('a620m-gaming-x', AM5, 'Gigabyte A620M Gaming X', 'AM5', 'matx'),
    board('b650i-aorus-ultra', AM5, 'Gigabyte B650I Aorus Ultra', 'AM5', 'itx'),
    board('x870e-nova', AM5, 'ASRock X870E Nova WiFi', 'AM5', 'atx-slot2'),
    board('x870-steel-legend', AM5, 'ASRock X870 Steel Legend WiFi', 'AM5', 'atx-slot2'),
    board('b850-steel-legend', AM5, 'ASRock B850 Steel Legend WiFi', 'AM5', 'atx-slot2'),
    board('b650m-hdv', AM5, 'ASRock B650M-HDV/M.2', 'AM5', 'matx'),
    board('b850i-lightning', AM5, 'ASRock B850I Lightning WiFi', 'AM5', 'itx'),
    board('b550-tuf', AM4, 'ASUS TUF Gaming B550-Plus', 'AM4', 'atx-slot1'),
    board('x570-e', AM4, 'ASUS ROG Strix X570-E Gaming', 'AM4', 'atx-slot1'),
    board('b550-gaming-edge', AM4, 'MSI MPG B550 Gaming Edge WiFi', 'AM4', 'atx-slot1'),
    board('b550m-mortar', AM4, 'MSI MAG B550M Mortar', 'AM4', 'matx'),
    board('b450-tomahawk-max', AM4, 'MSI B450 Tomahawk MAX', 'AM4', 'atx-slot1'),
    board('b550m-ds3h', AM4, 'Gigabyte B550M DS3H', 'AM4', 'matx'),
    board('x570-aorus-elite', AM4, 'Gigabyte X570 Aorus Elite', 'AM4', 'atx-slot1'),
    board('b550m-pro4', AM4, 'ASRock B550M Pro4', 'AM4', 'matx'),
    board('z790-apex', L17, 'ASUS ROG Maximus Z790 Apex', 'LGA1700', 'atx-slot1'),
    board('z790-tuf', L17, 'ASUS TUF Gaming Z790-Plus WiFi', 'LGA1700', 'atx-slot2'),
    board('z790-prime-p', L17, 'ASUS Prime Z790-P WiFi', 'LGA1700', 'atx-slot2'),
    board('b760-f', L17, 'ASUS ROG Strix B760-F Gaming WiFi', 'LGA1700', 'atx-slot2'),
    board('b760m-tuf', L17, 'ASUS TUF Gaming B760M-Plus WiFi', 'LGA1700', 'matx'),
    board('b760-i', L17, 'ASUS ROG Strix B760-I Gaming WiFi', 'LGA1700', 'itx'),
    board('z790-carbon', L17, 'MSI MPG Z790 Carbon WiFi', 'LGA1700', 'atx-slot2'),
    board('b760-tomahawk', L17, 'MSI MAG B760 Tomahawk WiFi', 'LGA1700', 'atx-slot1'),
    board('b760m-mortar', L17, 'MSI MAG B760M Mortar WiFi', 'LGA1700', 'matx'),
    board('h610m-g', L17, 'MSI PRO H610M-G', 'LGA1700', 'matx'),
    board('z790-aorus-master', L17, 'Gigabyte Z790 Aorus Master', 'LGA1700', 'eatx', 260),
    board('z790-gaming-x', L17, 'Gigabyte Z790 Gaming X AX', 'LGA1700', 'atx-slot2'),
    board('b760-gaming-x', L17, 'Gigabyte B760 Gaming X AX', 'LGA1700', 'atx-slot2'),
    board('b760m-ds3h', L17, 'Gigabyte B760M DS3H', 'LGA1700', 'matx'),
    board('z790-steel-legend', L17, 'ASRock Z790 Steel Legend WiFi', 'LGA1700', 'atx-slot2'),
    board('z890-e', L18, 'ASUS ROG Strix Z890-E Gaming WiFi', 'LGA1851', 'atx-slot2'),
    board('z890-tuf', L18, 'ASUS TUF Gaming Z890-Plus WiFi', 'LGA1851', 'atx-slot2'),
    board('z890-i', L18, 'ASUS ROG Strix Z890-I Gaming WiFi', 'LGA1851', 'itx'),
    board('z890-carbon', L18, 'MSI MPG Z890 Carbon WiFi', 'LGA1851', 'atx-slot2'),
    board('z890-pro-a', L18, 'MSI PRO Z890-A WiFi', 'LGA1851', 'atx-slot1'),
    board('b860-tomahawk', L18, 'MSI MAG B860 Tomahawk WiFi', 'LGA1851', 'atx-slot1'),
    board('z890-aorus-master', L18, 'Gigabyte Z890 Aorus Master', 'LGA1851', 'eatx', 260),
    board('b860-aorus-elite', L18, 'Gigabyte B860 Aorus Elite WiFi7', 'LGA1851', 'atx-slot2'),
    board('z890-steel-legend', L18, 'ASRock Z890 Steel Legend WiFi', 'LGA1851', 'atx-slot2'),
  ];

  const PANEL_CODES = { M: 'mesh', P: 'perforated', R: 'restricted', S: 'solid' };
  const PANEL_KEYS = { F: 'front', T: 'top', R: 'rear', B: 'bottom', S: 'side' };

  function panels(spec) {
    const [front, top, rear, bottom, side] = spec.split(' ').map((code) => ({ type: PANEL_CODES[code[0]], fanSize: +code.slice(1) }));
    return { front, top, rear, bottom, side };
  }

  function support(spec) {
    const out = {};
    for (const part of spec.split(',')) {
      const [key, count] = part.split(':');
      const panel = PANEL_KEYS[key[0]];
      (out[panel] = out[panel] || {})[+key.slice(1)] = +count;
    }
    return out;
  }

  function stock(spec) {
    const out = [];
    if (!spec) return out;
    for (const part of spec.split(',')) {
      const [code, fanId] = part.trim().split(' ');
      const panel = PANEL_KEYS[code[0]];
      const mode = code[0] === 'T' || code[0] === 'R' ? 'exhaust' : 'intake';
      for (let k = 0; k < +code.slice(1); k++) out.push([`${panel}-${k}`, mode, fanId]);
    }
    return out;
  }

  function kase(id, group, name, depth, width, height, o) {
    return {
      id, group, name, depth, width, height,
      shroud: o.shroud !== false, frontSlots: o.frontSlots == null ? 3 : o.frontSlots,
      maxGpu: o.gpu, maxCooler: o.cooler, boardTop: o.top || null, grille: o.grille || null,
      stockApprox: true, approx: true,
      panels: panels(o.panels), support: support(o.sup), stock: stock(o.stock),
    };
  }

  const MID = 'F120:3,F140:3,T120:3,T140:2,R120:1,R140:1';
  const MID2 = 'F120:3,F140:2,T120:2,T140:2,R120:1';
  const DUAL = 'T120:3,T140:2,B120:3,R120:1,S120:3';
  const DUAL_PANELS = 'S120 M120 P120 M120 M120';

  const MORE_CASES = [
    kase('corsair-3500x', 'Corsair', 'Corsair 3500X (dual chamber)', 462, 296, 476, { shroud: false, panels: DUAL_PANELS, sup: DUAL, gpu: 410, cooler: 170, top: 45 }),
    kase('corsair-6500x', 'Corsair', 'Corsair 6500X (dual chamber)', 487, 300, 478, { shroud: false, panels: DUAL_PANELS, sup: DUAL, gpu: 400, cooler: 190, top: 50 }),
    kase('corsair-465x', 'Corsair', 'Corsair iCUE 465X RGB (glass front)', 456, 216, 475, { panels: 'R120 M120 P120 M120 S120', sup: MID2, gpu: 370, cooler: 170, stock: 'F3 corsair-ll120' }),
    kase('corsair-4000d-rgb', 'Corsair', 'Corsair 4000D RGB Airflow', 453, 230, 466, { panels: 'M120 M120 P120 M120 S120', sup: 'F120:3,F140:2,T120:3,T140:2,R120:1', gpu: 360, cooler: 170, stock: 'F3 corsair-af120-elite' }),
    kase('corsair-3000d-rgb', 'Corsair', 'Corsair 3000D RGB Airflow', 462, 230, 466, { panels: 'M120 M120 P120 M120 S120', sup: 'F120:3,F140:2,T120:2,T140:2,R120:1', gpu: 360, cooler: 170, stock: 'F3 corsair-af120-elite' }),
    kase('corsair-5000d-rgb', 'Corsair', 'Corsair 5000D RGB Airflow', 520, 245, 520, { panels: 'M120 M120 P120 M120 S120', sup: 'F120:3,F140:2,T120:3,T140:2,R120:1', gpu: 420, cooler: 170, top: 55, stock: 'F3 corsair-af120-elite' }),
    kase('o11-dynamic-mini', 'Lian Li', 'Lian Li O11 Dynamic Mini', 446, 269, 380, { shroud: false, panels: DUAL_PANELS, sup: 'T120:2,B120:2,R120:1,S120:2', gpu: 395, cooler: 170, top: 30 }),
    kase('o11-vision', 'Lian Li', 'Lian Li O11 Vision (glass top)', 466, 304, 480, { shroud: false, panels: 'S120 S120 P120 M120 M120', sup: 'B120:3,R120:1,S120:3', gpu: 455, cooler: 167, top: 45 }),
    kase('o11-air-mini', 'Lian Li', 'Lian Li O11 Air Mini', 400, 269, 380, { panels: 'M140 M140 P120 M120 S120', sup: 'F120:3,F140:2,T120:2,T140:2,R120:1', gpu: 362, cooler: 170, top: 30, stock: 'F2 lianli-bundled-140, R1 lianli-bundled-120' }),
    kase('lancool-207', 'Lian Li', 'Lian Li Lancool 207', 450, 215, 470, { panels: 'M140 M120 P120 M120 S120', sup: 'F120:3,F140:2,T120:2,T140:2,R120:1', gpu: 375, cooler: 180, stock: 'F2 lianli-bundled-140' }),
    kase('lancool-205-mesh', 'Lian Li', 'Lian Li Lancool 205 Mesh', 450, 210, 480, { panels: 'M140 M120 P120 M120 S120', sup: 'F120:3,F140:2,T120:2,T140:2,R120:1', gpu: 350, cooler: 160, stock: 'F2 lianli-bundled-140, R1 lianli-bundled-120' }),
    kase('o11-evo-xl', 'Lian Li', 'Lian Li O11 Dynamic EVO XL', 522, 304, 531, { shroud: false, panels: 'S120 M140 P120 M140 M120', sup: 'T120:3,T140:3,B120:3,B140:3,R120:1,S120:3', gpu: 460, cooler: 167, top: 55 }),
    kase('fractal-pop-silent', 'Fractal Design', 'Fractal Design Pop Silent', 474, 215, 466, { panels: 'R120 S120 P120 M120 S120', sup: MID2, gpu: 405, cooler: 170, stock: 'F2 fractal-aspect-12, R1 fractal-aspect-12' }),
    kase('fractal-pop-mini-air', 'Fractal Design', 'Fractal Design Pop Mini Air (Micro-ATX)', 410, 215, 440, { panels: 'M120 M120 P120 M120 S120', sup: 'F120:3,F140:2,T120:2,T140:2,R120:1', gpu: 405, cooler: 170, top: 40, stock: 'F3 fractal-aspect-12, R1 fractal-aspect-12' }),
    kase('fractal-meshify-c', 'Fractal Design', 'Fractal Design Meshify C', 413, 217, 440, { panels: 'M120 M120 P120 M120 S120', sup: 'F120:3,F140:2,T120:2,T140:2,R120:1', gpu: 315, cooler: 172, top: 40, stock: 'F1 fractal-dynamic-x2-12, R1 fractal-dynamic-x2-12' }),
    kase('fractal-define7-compact', 'Fractal Design', 'Fractal Design Define 7 Compact', 427, 210, 474, { panels: 'R140 S140 P140 M120 S120', sup: 'F120:3,F140:2,T120:2,T140:2,R120:1,R140:1', gpu: 341, cooler: 169, stock: 'F1 fractal-dynamic-x2-14, R1 fractal-dynamic-x2-14' }),
    kase('fractal-torrent-compact', 'Fractal Design', 'Fractal Design Torrent Compact', 469, 232, 529, { panels: 'M180 M140 P140 M120 S120', sup: 'F120:3,F140:3,F180:2,T120:2,T140:2,R120:1,R140:1', frontSlots: 2, gpu: 330, cooler: 174, top: 55, stock: 'F2 fractal-dynamic-x2-18' }),
    kase('fractal-meshify2-xl', 'Fractal Design', 'Fractal Design Meshify 2 XL', 563, 240, 542, { panels: 'M140 M140 P140 M120 S120', sup: 'F120:3,F140:3,T120:3,T140:3,R120:1,R140:1', gpu: 524, cooler: 185, top: 60, stock: 'F2 fractal-dynamic-x2-14, R1 fractal-dynamic-x2-14' }),
    kase('fractal-focus2', 'Fractal Design', 'Fractal Design Focus 2', 432, 220, 480, { panels: 'M140 M140 P140 M120 S120', sup: 'F120:3,F140:2,T120:2,T140:2,R120:1,R140:1', gpu: 405, cooler: 171, stock: 'F2 fractal-aspect-14, R1 fractal-aspect-14' }),
    kase('nzxt-h5-elite', 'NZXT', 'NZXT H5 Elite (glass front)', 428, 227, 464, { panels: 'R140 M120 P120 M120 S120', sup: 'F120:2,F140:2,T120:2,T140:2,R120:1', frontSlots: 2, gpu: 365, cooler: 165, stock: 'F2 nzxt-f140q, R1 nzxt-f120q' }),
    kase('nzxt-h510-flow', 'NZXT', 'NZXT H510 Flow', 428, 210, 460, { panels: 'M120 P120 P120 M120 S120', sup: 'F120:2,F140:2,T120:1,R120:1', frontSlots: 2, gpu: 360, cooler: 165, stock: 'F1 nzxt-f120q, R1 nzxt-f120q' }),
    kase('nzxt-h6-flow', 'NZXT', 'NZXT H6 Flow (dual chamber)', 435, 287, 415, { shroud: false, panels: DUAL_PANELS, sup: 'T120:3,T140:2,B120:3,R120:1,S120:3', gpu: 365, cooler: 163, top: 35, stock: 'S3 nzxt-f120q' }),
    kase('nzxt-h9-flow', 'NZXT', 'NZXT H9 Flow (dual chamber)', 495, 290, 466, { shroud: false, panels: DUAL_PANELS, sup: 'T120:3,B120:3,R120:1,S120:3', gpu: 435, cooler: 165, stock: 'S3 nzxt-f120q, R1 nzxt-f120q' }),
    kase('phanteks-p400a', 'Phanteks', 'Phanteks Eclipse P400A Digital', 465, 210, 465, { panels: 'M120 M120 P120 M120 S120', sup: 'F120:3,F140:2,T120:2,T140:2,R120:1', gpu: 420, cooler: 160, stock: 'F3 phanteks-m25-120' }),
    kase('phanteks-g300a', 'Phanteks', 'Phanteks Eclipse G300A', 400, 200, 445, { panels: 'M120 M120 P120 M120 S120', sup: 'F120:3,F140:2,T120:2,R120:1', gpu: 335, cooler: 163, top: 40, stock: 'R1 phanteks-m25-120' }),
    kase('phanteks-g500a', 'Phanteks', 'Phanteks Eclipse G500A', 503, 240, 505, { panels: 'M140 M140 P140 M120 S120', sup: MID, gpu: 435, cooler: 185, top: 50, stock: 'F3 phanteks-m25-140, R1 phanteks-m25-140' }),
    kase('phanteks-nv5', 'Phanteks', 'Phanteks NV5 (dual chamber)', 500, 250, 500, { shroud: false, panels: DUAL_PANELS, sup: 'T120:3,T140:2,B120:3,R120:1,S120:3', gpu: 415, cooler: 175, top: 50 }),
    kase('phanteks-nv7', 'Phanteks', 'Phanteks NV7 (dual chamber)', 525, 290, 580, { shroud: false, panels: 'S120 M140 P140 M120 M120', sup: 'T120:3,T140:3,B120:3,R120:1,R140:1,S120:3', gpu: 435, cooler: 180, top: 60 }),
    kase('phanteks-enthoo-pro2', 'Phanteks', 'Phanteks Enthoo Pro 2 (full tower)', 560, 240, 560, { panels: 'M140 M140 P140 M140 S120', sup: MID, gpu: 503, cooler: 195, top: 60, stock: 'R1 phanteks-m25-140' }),
    kase('bequiet-500dx-501', 'be quiet!', 'be quiet! Pure Base 501DX', 450, 232, 463, { panels: 'P140 M140 P140 M120 S120', sup: MID, gpu: 369, cooler: 190, stock: 'F1 bequiet-light-wings-140, T1 bequiet-light-wings-140, R1 bequiet-light-wings-140' }),
    kase('bequiet-pure-base-500', 'be quiet!', 'be quiet! Pure Base 500 (solid front)', 450, 232, 463, { panels: 'R140 S140 P120 M120 S120', sup: 'F120:3,F140:2,T120:2,T140:2,R120:1', gpu: 369, cooler: 190, stock: 'F1 bequiet-pure-wings2-140, R1 bequiet-pure-wings2-120' }),
    kase('bequiet-light-base-600lx', 'be quiet!', 'be quiet! Light Base 600 LX (dual chamber)', 490, 290, 480, { shroud: false, panels: DUAL_PANELS, sup: DUAL, gpu: 422, cooler: 170, stock: 'S3 bequiet-light-wings-120, R1 bequiet-light-wings-120' }),
    kase('bequiet-silent-base-601', 'be quiet!', 'be quiet! Silent Base 601', 495, 232, 491, { panels: 'R140 S140 P140 M120 S120', sup: MID, gpu: 449, cooler: 185, stock: 'F1 bequiet-pure-wings2-140, R1 bequiet-pure-wings2-140' }),
    kase('bequiet-dark-base-701', 'be quiet!', 'be quiet! Dark Base 701', 535, 240, 528, { panels: 'P140 P140 P140 M120 S120', sup: MID, gpu: 450, cooler: 190, top: 55, stock: 'F2 bequiet-silent-wings4-140, R1 bequiet-silent-wings4-140' }),
    kase('cm-haf-500', 'Cooler Master', 'Cooler Master HAF 500', 505, 229, 507, { panels: 'M200 M140 P120 M120 S120', sup: 'F120:3,F140:3,F200:2,T120:3,T140:2,R120:1', frontSlots: 2, gpu: 410, cooler: 167, stock: 'F2 cm-200-bundled, R1 cm-sickleflow-120' }),
    kase('cm-h500', 'Cooler Master', 'Cooler Master MasterCase H500', 502, 228, 544, { panels: 'P200 M140 P140 M120 S120', sup: 'F120:3,F140:3,F200:2,T120:3,T140:2,R120:1,R140:1', frontSlots: 2, gpu: 410, cooler: 167, top: 55, stock: 'F2 cm-200-bundled, R1 cm-sickleflow-140' }),
    kase('cm-mb520-mesh', 'Cooler Master', 'Cooler Master MasterBox MB520 Mesh', 496, 217, 470, { panels: 'M120 M120 P120 M120 S120', sup: MID2, gpu: 410, cooler: 165, stock: 'F3 cm-sickleflow-120' }),
    kase('cm-qube500', 'Cooler Master', 'Cooler Master Qube 500 Flatpack', 428, 231, 469, { panels: 'M120 M120 P120 M120 S120', sup: 'F120:3,F140:2,T120:2,T140:2,R120:1', gpu: 365, cooler: 172, stock: 'R1 cm-sickleflow-120' }),
    kase('cm-td300-mesh', 'Cooler Master', 'Cooler Master MasterBox TD300 Mesh (Micro-ATX)', 446, 210, 446, { panels: 'M120 M120 P120 M120 S120', sup: 'F120:2,F140:2,T120:2,T140:2,R120:1', frontSlots: 2, gpu: 335, cooler: 158, top: 40, stock: 'F2 cm-sickleflow-120' }),
    kase('montech-sky-two', 'Montech', 'Montech SKY TWO (dual chamber)', 450, 290, 470, { shroud: false, panels: DUAL_PANELS, sup: DUAL, gpu: 400, cooler: 165, stock: 'S3 montech-ax120, R1 montech-ax120' }),
    kase('montech-king-95', 'Montech', 'Montech KING 95 PRO (dual chamber)', 470, 300, 485, { shroud: false, panels: DUAL_PANELS, sup: DUAL, gpu: 420, cooler: 175, stock: 'S3 montech-ax120, B3 montech-ax120, R1 montech-ax120' }),
    kase('montech-xr', 'Montech', 'Montech XR', 431, 230, 475, { panels: 'M120 M120 P120 M120 S120', sup: MID2, gpu: 400, cooler: 165, stock: 'F3 montech-ax120, R1 montech-ax120' }),
    kase('montech-air1000', 'Montech', 'Montech AIR 1000 Premium', 466, 220, 497, { panels: 'M120 M120 P120 M120 S120', sup: MID2, gpu: 380, cooler: 165, stock: 'F3 montech-ax120, R1 montech-ax120' }),
    kase('deepcool-ch510', 'DeepCool', 'DeepCool CH510', 450, 230, 485, { panels: 'M120 M120 P120 M120 S120', sup: MID, gpu: 380, cooler: 175, stock: 'R1 deepcool-fc120' }),
    kase('deepcool-ch370', 'DeepCool', 'DeepCool CH370 (Micro-ATX)', 400, 217, 431, { panels: 'M120 M120 P120 M120 S120', sup: 'F120:3,F140:2,T120:2,T140:2,R120:1', gpu: 320, cooler: 167, top: 40, stock: 'R1 deepcool-fc120' }),
    kase('deepcool-cg560', 'DeepCool', 'DeepCool CG560', 460, 220, 468, { panels: 'M120 M120 P120 M120 S120', sup: MID2, gpu: 380, cooler: 175, stock: 'F3 deepcool-fc120, R1 deepcool-fc120' }),
    kase('deepcool-ck560', 'DeepCool', 'DeepCool CK560', 471, 230, 465, { panels: 'M120 M120 P140 M120 S120', sup: 'F120:3,F140:2,T120:3,T140:2,R120:1,R140:1', gpu: 380, cooler: 175, stock: 'F3 deepcool-fc120, R1 deepcool-bundled-140' }),
    kase('tt-versa-h18', 'Thermaltake', 'Thermaltake Versa H18 (Micro-ATX)', 400, 205, 427, { panels: 'R120 P120 P120 M120 S120', sup: 'F120:2,T120:2,R120:1', frontSlots: 2, gpu: 350, cooler: 155, top: 40, stock: 'R1 thermaltake-bundled-120' }),
    kase('tt-ceres-500', 'Thermaltake', 'Thermaltake Ceres 500 TG ARGB', 510, 230, 525, { panels: 'M140 M140 P140 M120 S120', sup: MID, gpu: 420, cooler: 185, top: 55, stock: 'F3 thermaltake-ct140, R1 thermaltake-ct140' }),
    kase('tt-s100', 'Thermaltake', 'Thermaltake S100 TG (Micro-ATX)', 400, 220, 450, { panels: 'P120 P120 P120 M120 S120', sup: 'F120:3,F140:2,T120:2,T140:2,R120:1', gpu: 330, cooler: 165, top: 40, stock: 'R1 thermaltake-bundled-120' }),
    kase('antec-c8', 'Antec', 'Antec C8 (dual chamber)', 465, 285, 450, { shroud: false, panels: DUAL_PANELS, sup: DUAL, gpu: 425, cooler: 175 }),
    kase('antec-p20c', 'Antec', 'Antec P20C', 505, 225, 490, { panels: 'M120 M120 P120 M120 S120', sup: MID, gpu: 405, cooler: 175, stock: 'F3 antec-bundled-120, R1 antec-bundled-120' }),
    kase('antec-nx410', 'Antec', 'Antec NX410', 450, 210, 470, { panels: 'M120 M120 P120 M120 S120', sup: MID2, gpu: 330, cooler: 165, stock: 'F3 antec-bundled-120, R1 antec-bundled-120' }),
    kase('hyte-y60', 'HYTE', 'HYTE Y60 (dual chamber)', 456, 285, 462, { shroud: false, panels: DUAL_PANELS, sup: 'T120:3,B120:2,R120:1,S120:3', gpu: 375, cooler: 160, stock: 'B2 antec-bundled-120, R1 antec-bundled-120' }),
    kase('hyte-y70', 'HYTE', 'HYTE Y70 (dual chamber)', 470, 320, 470, { shroud: false, panels: DUAL_PANELS, sup: 'T120:3,T140:3,B120:3,R120:1,S120:3', gpu: 422, cooler: 180 }),
    kase('asus-ap201', 'ASUS', 'ASUS Prime AP201 (Micro-ATX)', 350, 205, 460, { panels: 'M120 M120 M120 M120 S120', sup: 'F120:3,F140:2,T120:2,T140:2,R120:1', gpu: 338, cooler: 170, top: 40 }),
    kase('asus-gt502', 'ASUS', 'ASUS TUF Gaming GT502 (dual chamber)', 446, 285, 462, { shroud: false, panels: DUAL_PANELS, sup: DUAL, gpu: 400, cooler: 163 }),
    kase('jonsbo-d31-mesh', 'Jonsbo', 'Jonsbo D31 Mesh (Micro-ATX)', 400, 200, 422, { panels: 'M120 M120 P120 M120 S120', sup: 'F120:3,F140:2,T120:2,T140:2,R120:1', gpu: 400, cooler: 168, top: 35, stock: 'R1 thermaltake-bundled-120' }),
    kase('silverstone-fara-r1', 'SilverStone', 'SilverStone FARA R1', 443, 220, 468, { panels: 'M120 M120 P120 M120 S120', sup: MID2, gpu: 350, cooler: 165, stock: 'R1 silverstone-ap120i' }),
  ];

  D.FANS.push(...MORE_FANS.filter((f) => !D.FANS.some((x) => x.id === f.id)));
  C.GPUS.push(...MORE_GPUS);
  C.BOARDS.push(...MORE_BOARDS);
  C.CASES.push(...MORE_CASES);
  for (const list of [C.GPUS, C.BOARDS, C.CASES]) {
    const order = [];
    for (const item of list) if (!order.includes(item.group)) order.push(item.group);
    list.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group) || a.name.localeCompare(b.name));
  }

  C.builders = { fan, gpu, board, kase, MID, MID2, DUAL, DUAL_PANELS };

  if (typeof module === 'object' && module.exports) module.exports = AF;
})(typeof window !== 'undefined' ? window : globalThis);
