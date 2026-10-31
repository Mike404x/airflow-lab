(function (root) {
  const AF = root.AF || (root.AF = {});
  const D = AF.data;

  const EXTRA_FANS = [
    { id: 'noctua-p12-redux', name: 'Noctua NF-P12 redux-1700 PWM', size: 120, rpm: 1700, cfm: 70.7, mmh2o: 2.83 },
    { id: 'noctua-s12a', name: 'Noctua NF-S12A PWM', size: 120, rpm: 1200, cfm: 63.3, mmh2o: 1.19 },
    { id: 'noctua-a12x15', name: 'Noctua NF-A12x15 PWM', size: 120, rpm: 1850, cfm: 55.4, mmh2o: 1.85 },
    { id: 'noctua-f12-ippc3000', name: 'Noctua NF-F12 industrialPPC-3000', size: 120, rpm: 3000, cfm: 109.9, mmh2o: 7.63 },
    { id: 'noctua-a15', name: 'Noctua NF-A15 PWM', size: 140, rpm: 1500, cfm: 82.5, mmh2o: 2.08 },
    { id: 'noctua-a14x25-g2', name: 'Noctua NF-A14x25 G2 PWM', size: 140, rpm: 1500, cfm: 84, mmh2o: 2.6, approx: true },
    { id: 'noctua-a14-ippc3000', name: 'Noctua NF-A14 industrialPPC-3000', size: 140, rpm: 3000, cfm: 158.5, mmh2o: 10.52 },
    { id: 'noctua-a9x14', name: 'Noctua NF-A9x14 HS-PWM', size: 92, rpm: 2500, cfm: 33.8, mmh2o: 2.25 },
    { id: 'arctic-p12-pro', name: 'Arctic P12 Pro PST', size: 120, rpm: 3000, cfm: 77, mmh2o: 6.6, approx: true },
    { id: 'arctic-p14-pro', name: 'Arctic P14 Pro PST', size: 140, rpm: 2800, cfm: 105, mmh2o: 5.6, approx: true },
    { id: 'corsair-af120-elite', name: 'Corsair AF120 Elite', size: 120, rpm: 2100, cfm: 63.2, mmh2o: 1.92 },
    { id: 'corsair-ml120', name: 'Corsair ML120 Pro', size: 120, rpm: 2400, cfm: 75, mmh2o: 4.2 },
    { id: 'corsair-ll120', name: 'Corsair LL120 RGB', size: 120, rpm: 1500, cfm: 43.25, mmh2o: 1.61 },
    { id: 'corsair-airguide-120', name: 'Corsair AirGuide 120 (bundled)', size: 120, rpm: 1100, cfm: 50, mmh2o: 1.3, approx: true },
    { id: 'thermalright-tl-c12c', name: 'Thermalright TL-C12C', size: 120, rpm: 1550, cfm: 66.2, mmh2o: 1.53 },
    { id: 'deepcool-fk120', name: 'DeepCool FK120', size: 120, rpm: 1850, cfm: 69, mmh2o: 2.19 },
    { id: 'deepcool-fc120', name: 'DeepCool FC120', size: 120, rpm: 1800, cfm: 61.9, mmh2o: 2.0, approx: true },
    { id: 'lianli-sl-inf120', name: 'Lian Li UNI FAN SL-INF 120', size: 120, rpm: 2100, cfm: 61.3, mmh2o: 2.66, approx: true },
    { id: 'lianli-bundled-140', name: 'Lian Li 140 mm (bundled)', size: 140, rpm: 1400, cfm: 72, mmh2o: 1.6, approx: true },
    { id: 'lianli-bundled-160', name: 'Lian Li 160 mm (Lancool 216 bundled)', size: 160, rpm: 1400, cfm: 90, mmh2o: 1.6, approx: true },
    { id: 'fractal-aspect-12', name: 'Fractal Aspect 12 (bundled)', size: 120, rpm: 1200, cfm: 46, mmh2o: 1.1, approx: true },
    { id: 'fractal-aspect-14', name: 'Fractal Aspect 14 PWM (bundled)', size: 140, rpm: 1200, cfm: 66, mmh2o: 1.2, approx: true },
    { id: 'fractal-dynamic-x2-14', name: 'Fractal Dynamic X2 GP-14 (bundled)', size: 140, rpm: 1000, cfm: 68, mmh2o: 0.96, approx: true },
    { id: 'bequiet-pure-wings2-120', name: 'be quiet! Pure Wings 2 120', size: 120, rpm: 1500, cfm: 51, mmh2o: 1.4, approx: true },
    { id: 'bequiet-pure-wings2-140', name: 'be quiet! Pure Wings 2 140 (bundled)', size: 140, rpm: 1000, cfm: 61, mmh2o: 0.85, approx: true },
    { id: 'bequiet-silent-wings4-120', name: 'be quiet! Silent Wings 4 120 PWM', size: 120, rpm: 1600, cfm: 49, mmh2o: 1.8, approx: true },
    { id: 'phanteks-m25-120', name: 'Phanteks M25-120 (bundled)', size: 120, rpm: 2000, cfm: 63, mmh2o: 1.9, approx: true },
    { id: 'montech-ax140', name: 'Montech AX140 (bundled)', size: 140, rpm: 1500, cfm: 72, mmh2o: 1.6, approx: true },
    { id: 'cm-sickleflow-120', name: 'Cooler Master SickleFlow 120', size: 120, rpm: 1800, cfm: 62, mmh2o: 2.5, approx: true },
    { id: 'scythe-kaze-flex2-120', name: 'Scythe Kaze Flex II 120', size: 120, rpm: 1500, cfm: 51, mmh2o: 1.4, approx: true },
    { id: 'nzxt-f120p', name: 'NZXT F120P (Kraken bundled)', size: 120, rpm: 2000, cfm: 73, mmh2o: 2.9, approx: true },
    { id: 'corsair-sp120-elite', name: 'Corsair SP120 RGB Elite (bundled)', size: 120, rpm: 1500, cfm: 47.7, mmh2o: 1.68 },
    { id: 'corsair-airguide-140', name: 'Corsair AirGuide 140 (bundled)', size: 140, rpm: 1100, cfm: 65, mmh2o: 1.2, approx: true },
    { id: 'fractal-dynamic-x2-18', name: 'Fractal Dynamic X2 GP-18 (Torrent bundled)', size: 180, rpm: 800, cfm: 100, mmh2o: 0.9, approx: true },
    { id: 'nzxt-f120q', name: 'NZXT F120Q (bundled)', size: 120, rpm: 1500, cfm: 55, mmh2o: 1.4, approx: true },
    { id: 'nzxt-f140q', name: 'NZXT F140Q (bundled)', size: 140, rpm: 1200, cfm: 68, mmh2o: 1.3, approx: true },
    { id: 'bequiet-light-wings-140', name: 'be quiet! Light Wings 140 (bundled)', size: 140, rpm: 1100, cfm: 61, mmh2o: 1.0, approx: true },
    { id: 'montech-ax120', name: 'Montech AX120 (bundled)', size: 120, rpm: 1500, cfm: 52, mmh2o: 1.5, approx: true },
    { id: 'deepcool-bundled-140', name: 'DeepCool 140 mm (bundled)', size: 140, rpm: 1200, cfm: 66, mmh2o: 1.3, approx: true },
    { id: 'lianli-bundled-120', name: 'Lian Li 120 mm (bundled)', size: 120, rpm: 1500, cfm: 52, mmh2o: 1.5, approx: true },
  ];

  const CPUS = [
    { id: 'r5-7600', group: 'AMD Ryzen 7000 (AM5)', name: 'Ryzen 5 7600', socket: 'AM5', power: 88, gaming: 50, rjc: 0.33, tjmax: 95 },
    { id: 'r5-7600x', group: 'AMD Ryzen 7000 (AM5)', name: 'Ryzen 5 7600X', socket: 'AM5', power: 142, gaming: 60, rjc: 0.33, tjmax: 95 },
    { id: 'r7-7700', group: 'AMD Ryzen 7000 (AM5)', name: 'Ryzen 7 7700', socket: 'AM5', power: 88, gaming: 55, rjc: 0.31, tjmax: 95 },
    { id: 'r7-7700x', group: 'AMD Ryzen 7000 (AM5)', name: 'Ryzen 7 7700X', socket: 'AM5', power: 142, gaming: 65, rjc: 0.31, tjmax: 95 },
    { id: 'r7-7800x3d', group: 'AMD Ryzen 7000 (AM5)', name: 'Ryzen 7 7800X3D', socket: 'AM5', power: 88, gaming: 55, rjc: 0.36, tjmax: 89 },
    { id: 'r9-7900x', group: 'AMD Ryzen 7000 (AM5)', name: 'Ryzen 9 7900X', socket: 'AM5', power: 230, gaming: 85, rjc: 0.21, tjmax: 95 },
    { id: 'r9-7950x', group: 'AMD Ryzen 7000 (AM5)', name: 'Ryzen 9 7950X', socket: 'AM5', power: 230, gaming: 95, rjc: 0.2, tjmax: 95 },
    { id: 'r9-7950x3d', group: 'AMD Ryzen 7000 (AM5)', name: 'Ryzen 9 7950X3D', socket: 'AM5', power: 145, gaming: 70, rjc: 0.24, tjmax: 89 },
    { id: 'r5-9600x', group: 'AMD Ryzen 9000 (AM5)', name: 'Ryzen 5 9600X', socket: 'AM5', power: 88, gaming: 50, rjc: 0.3, tjmax: 95 },
    { id: 'r7-9700x', group: 'AMD Ryzen 9000 (AM5)', name: 'Ryzen 7 9700X', socket: 'AM5', power: 88, gaming: 55, rjc: 0.3, tjmax: 95 },
    { id: 'r7-9800x3d', group: 'AMD Ryzen 9000 (AM5)', name: 'Ryzen 7 9800X3D', socket: 'AM5', power: 140, gaming: 70, rjc: 0.25, tjmax: 95 },
    { id: 'r9-9900x', group: 'AMD Ryzen 9000 (AM5)', name: 'Ryzen 9 9900X', socket: 'AM5', power: 162, gaming: 80, rjc: 0.22, tjmax: 95 },
    { id: 'r9-9950x', group: 'AMD Ryzen 9000 (AM5)', name: 'Ryzen 9 9950X', socket: 'AM5', power: 230, gaming: 95, rjc: 0.2, tjmax: 95 },
    { id: 'r9-9950x3d', group: 'AMD Ryzen 9000 (AM5)', name: 'Ryzen 9 9950X3D', socket: 'AM5', power: 200, gaming: 85, rjc: 0.21, tjmax: 95 },
    { id: 'r5-5600x', group: 'AMD Ryzen 5000 (AM4)', name: 'Ryzen 5 5600X', socket: 'AM4', power: 76, gaming: 50, rjc: 0.38, tjmax: 95 },
    { id: 'r7-5700x3d', group: 'AMD Ryzen 5000 (AM4)', name: 'Ryzen 7 5700X3D', socket: 'AM4', power: 95, gaming: 60, rjc: 0.38, tjmax: 90 },
    { id: 'r7-5800x', group: 'AMD Ryzen 5000 (AM4)', name: 'Ryzen 7 5800X', socket: 'AM4', power: 125, gaming: 70, rjc: 0.33, tjmax: 90 },
    { id: 'r7-5800x3d', group: 'AMD Ryzen 5000 (AM4)', name: 'Ryzen 7 5800X3D', socket: 'AM4', power: 110, gaming: 65, rjc: 0.38, tjmax: 90 },
    { id: 'r9-5900x', group: 'AMD Ryzen 5000 (AM4)', name: 'Ryzen 9 5900X', socket: 'AM4', power: 142, gaming: 80, rjc: 0.24, tjmax: 90 },
    { id: 'r9-5950x', group: 'AMD Ryzen 5000 (AM4)', name: 'Ryzen 9 5950X', socket: 'AM4', power: 142, gaming: 85, rjc: 0.22, tjmax: 90 },
    { id: 'i5-12400f', group: 'Intel Core 12th–14th gen (LGA1700)', name: 'Core i5-12400F', socket: 'LGA1700', power: 117, gaming: 50, rjc: 0.26, tjmax: 100 },
    { id: 'i5-12600k', group: 'Intel Core 12th–14th gen (LGA1700)', name: 'Core i5-12600K', socket: 'LGA1700', power: 150, gaming: 70, rjc: 0.23, tjmax: 100 },
    { id: 'i7-12700k', group: 'Intel Core 12th–14th gen (LGA1700)', name: 'Core i7-12700K', socket: 'LGA1700', power: 190, gaming: 90, rjc: 0.2, tjmax: 100 },
    { id: 'i9-12900k', group: 'Intel Core 12th–14th gen (LGA1700)', name: 'Core i9-12900K', socket: 'LGA1700', power: 241, gaming: 110, rjc: 0.18, tjmax: 100 },
    { id: 'i5-13400f', group: 'Intel Core 12th–14th gen (LGA1700)', name: 'Core i5-13400F', socket: 'LGA1700', power: 148, gaming: 60, rjc: 0.24, tjmax: 100 },
    { id: 'i5-13600k', group: 'Intel Core 12th–14th gen (LGA1700)', name: 'Core i5-13600K', socket: 'LGA1700', power: 181, gaming: 85, rjc: 0.22, tjmax: 100 },
    { id: 'i7-13700k', group: 'Intel Core 12th–14th gen (LGA1700)', name: 'Core i7-13700K', socket: 'LGA1700', power: 253, gaming: 110, rjc: 0.18, tjmax: 100 },
    { id: 'i9-13900k', group: 'Intel Core 12th–14th gen (LGA1700)', name: 'Core i9-13900K', socket: 'LGA1700', power: 253, gaming: 125, rjc: 0.17, tjmax: 100 },
    { id: 'i5-14600k', group: 'Intel Core 12th–14th gen (LGA1700)', name: 'Core i5-14600K', socket: 'LGA1700', power: 181, gaming: 85, rjc: 0.22, tjmax: 100 },
    { id: 'i7-14700k', group: 'Intel Core 12th–14th gen (LGA1700)', name: 'Core i7-14700K', socket: 'LGA1700', power: 253, gaming: 115, rjc: 0.18, tjmax: 100 },
    { id: 'i9-14900k', group: 'Intel Core 12th–14th gen (LGA1700)', name: 'Core i9-14900K', socket: 'LGA1700', power: 253, gaming: 135, rjc: 0.17, tjmax: 100 },
    { id: 'u5-245k', group: 'Intel Core Ultra 200S (LGA1851)', name: 'Core Ultra 5 245K', socket: 'LGA1851', power: 159, gaming: 60, rjc: 0.22, tjmax: 105 },
    { id: 'u7-265k', group: 'Intel Core Ultra 200S (LGA1851)', name: 'Core Ultra 7 265K', socket: 'LGA1851', power: 250, gaming: 80, rjc: 0.19, tjmax: 105 },
    { id: 'u9-285k', group: 'Intel Core Ultra 200S (LGA1851)', name: 'Core Ultra 9 285K', socket: 'LGA1851', power: 250, gaming: 90, rjc: 0.18, tjmax: 105 },
  ];

  const FE_FAN = { cfm: 65, mmh2o: 3.5, rpm: 3000, size: 115 };

  const GPUS = [
    { id: 'rtx5090-fe', group: 'NVIDIA RTX 50', name: 'RTX 5090 Founders Edition', power: 575, length: 304, slots: 2, cooler: 'open-triple', fanCount: 2, flowThrough: true, rjc: 0.025, tmax: 90 , fanSpec: FE_FAN },
    { id: 'rtx5090-astral', group: 'NVIDIA RTX 50', name: 'ASUS ROG Astral RTX 5090', power: 600, length: 358, slots: 3.8, cooler: 'open-triple', fanCount: 4, flowThrough: true, rjc: 0.025, tmax: 90 },
    { id: 'rtx5080-fe', group: 'NVIDIA RTX 50', name: 'RTX 5080 Founders Edition', power: 360, length: 304, slots: 2, cooler: 'open-triple', fanCount: 2, flowThrough: true, rjc: 0.035, tmax: 90 , fanSpec: FE_FAN },
    { id: 'rtx5080-tuf', group: 'NVIDIA RTX 50', name: 'ASUS TUF RTX 5080', power: 360, length: 348, slots: 3.6, cooler: 'open-triple', fanCount: 3, flowThrough: true, rjc: 0.035, tmax: 90 },
    { id: 'rtx5070ti-ventus', group: 'NVIDIA RTX 50', name: 'MSI RTX 5070 Ti Ventus 3X', power: 300, length: 303, slots: 2.5, cooler: 'open-triple', fanCount: 3, flowThrough: true, rjc: 0.045, tmax: 88 },
    { id: 'rtx5070-fe', group: 'NVIDIA RTX 50', name: 'RTX 5070 Founders Edition', power: 250, length: 242, slots: 2, cooler: 'open-dual', fanCount: 2, flowThrough: true, rjc: 0.05, tmax: 88 },
    { id: 'rtx5060ti-dual', group: 'NVIDIA RTX 50', name: 'ASUS Dual RTX 5060 Ti', power: 180, length: 229, slots: 2.5, cooler: 'open-dual', fanCount: 2, flowThrough: false, rjc: 0.11, tmax: 88 },
    { id: 'rtx5060-ventus', group: 'NVIDIA RTX 50', name: 'MSI RTX 5060 Ventus 2X', power: 145, length: 197, slots: 2, cooler: 'open-dual', fanCount: 2, flowThrough: false, rjc: 0.13, tmax: 88 },
    { id: 'rtx4090-fe', group: 'NVIDIA RTX 40', name: 'RTX 4090 Founders Edition', power: 450, length: 304, slots: 3, cooler: 'open-triple', fanCount: 2, flowThrough: true, rjc: 0.03, tmax: 88 , fanSpec: FE_FAN },
    { id: 'rtx4090-tuf', group: 'NVIDIA RTX 40', name: 'ASUS TUF RTX 4090', power: 450, length: 348, slots: 3.65, cooler: 'open-triple', fanCount: 3, flowThrough: true, rjc: 0.03, tmax: 88 },
    { id: 'rtx4090-suprim', group: 'NVIDIA RTX 40', name: 'MSI RTX 4090 Suprim X', power: 450, length: 336, slots: 3.8, cooler: 'open-triple', fanCount: 3, flowThrough: true, rjc: 0.03, tmax: 88 },
    { id: 'rtx4090-gaming-oc', group: 'NVIDIA RTX 40', name: 'Gigabyte RTX 4090 Gaming OC', power: 450, length: 340, slots: 3.75, cooler: 'open-triple', fanCount: 3, flowThrough: true, rjc: 0.03, tmax: 88 },
    { id: 'rtx4080s-fe', group: 'NVIDIA RTX 40', name: 'RTX 4080 SUPER Founders Edition', power: 320, length: 304, slots: 3, cooler: 'open-triple', fanCount: 2, flowThrough: true, rjc: 0.04, tmax: 88 , fanSpec: FE_FAN },
    { id: 'rtx4070tis-tuf', group: 'NVIDIA RTX 40', name: 'ASUS TUF RTX 4070 Ti SUPER', power: 285, length: 305, slots: 3.25, cooler: 'open-triple', fanCount: 3, flowThrough: true, rjc: 0.05, tmax: 88 },
    { id: 'rtx4070tis-ventus', group: 'NVIDIA RTX 40', name: 'MSI RTX 4070 Ti SUPER Ventus 3X', power: 285, length: 308, slots: 2.5, cooler: 'open-triple', fanCount: 3, flowThrough: true, rjc: 0.05, tmax: 88 },
    { id: 'rtx4070s-fe', group: 'NVIDIA RTX 40', name: 'RTX 4070 SUPER Founders Edition', power: 220, length: 244, slots: 2, cooler: 'open-dual', fanCount: 2, flowThrough: true, rjc: 0.06, tmax: 88 },
    { id: 'rtx4070s-ventus', group: 'NVIDIA RTX 40', name: 'MSI RTX 4070 SUPER Ventus 2X', power: 220, length: 242, slots: 2, cooler: 'open-dual', fanCount: 2, flowThrough: false, rjc: 0.06, tmax: 88 },
    { id: 'rtx4060ti-dual', group: 'NVIDIA RTX 40', name: 'ASUS Dual RTX 4060 Ti', power: 160, length: 227, slots: 2.5, cooler: 'open-dual', fanCount: 2, flowThrough: false, rjc: 0.12, tmax: 88 },
    { id: 'rtx4060-ventus', group: 'NVIDIA RTX 40', name: 'MSI RTX 4060 Ventus 2X', power: 115, length: 199, slots: 2, cooler: 'open-dual', fanCount: 2, flowThrough: false, rjc: 0.15, tmax: 88 },
    { id: 'rtx3090-fe', group: 'NVIDIA RTX 30', name: 'RTX 3090 Founders Edition', power: 350, length: 313, slots: 3, cooler: 'open-triple', fanCount: 2, flowThrough: true, rjc: 0.035, tmax: 88 , fanSpec: FE_FAN },
    { id: 'rtx3080-fe', group: 'NVIDIA RTX 30', name: 'RTX 3080 Founders Edition', power: 320, length: 285, slots: 2, cooler: 'open-dual', fanCount: 2, flowThrough: true, rjc: 0.04, tmax: 88 },
    { id: 'rtx3070-fe', group: 'NVIDIA RTX 30', name: 'RTX 3070 Founders Edition', power: 220, length: 242, slots: 2, cooler: 'open-dual', fanCount: 2, flowThrough: true, rjc: 0.06, tmax: 88 },
    { id: 'rtx3060-dual', group: 'NVIDIA RTX 30', name: 'ASUS Dual RTX 3060 12GB', power: 170, length: 200, slots: 2.5, cooler: 'open-dual', fanCount: 2, flowThrough: false, rjc: 0.11, tmax: 88 },
    { id: 'rx9070xt-pulse', group: 'AMD Radeon RX 9000', name: 'Sapphire Pulse RX 9070 XT', power: 304, length: 280, slots: 2.5, cooler: 'open-triple', fanCount: 3, flowThrough: false, rjc: 0.045, tmax: 90 },
    { id: 'rx9070xt-nitro', group: 'AMD Radeon RX 9000', name: 'Sapphire Nitro+ RX 9070 XT', power: 340, length: 330, slots: 3.5, cooler: 'open-triple', fanCount: 3, flowThrough: true, rjc: 0.045, tmax: 90 },
    { id: 'rx9070xt-reddevil', group: 'AMD Radeon RX 9000', name: 'PowerColor Red Devil RX 9070 XT', power: 340, length: 340, slots: 3.5, cooler: 'open-triple', fanCount: 3, flowThrough: true, rjc: 0.045, tmax: 90 },
    { id: 'rx9070-pulse', group: 'AMD Radeon RX 9000', name: 'Sapphire Pulse RX 9070', power: 220, length: 280, slots: 2.5, cooler: 'open-triple', fanCount: 3, flowThrough: false, rjc: 0.055, tmax: 90 },
    { id: 'rx7900xtx-ref', group: 'AMD Radeon RX 7000/6000', name: 'RX 7900 XTX (reference)', power: 355, length: 287, slots: 2.5, cooler: 'open-triple', fanCount: 3, flowThrough: false, rjc: 0.04, tmax: 90 },
    { id: 'rx7900xtx-nitro', group: 'AMD Radeon RX 7000/6000', name: 'Sapphire Nitro+ RX 7900 XTX', power: 420, length: 320, slots: 3.5, cooler: 'open-triple', fanCount: 3, flowThrough: true, rjc: 0.04, tmax: 90 },
    { id: 'rx7900xt-ref', group: 'AMD Radeon RX 7000/6000', name: 'RX 7900 XT (reference)', power: 315, length: 276, slots: 2.5, cooler: 'open-triple', fanCount: 3, flowThrough: false, rjc: 0.045, tmax: 90 },
    { id: 'rx7800xt-pulse', group: 'AMD Radeon RX 7000/6000', name: 'Sapphire Pulse RX 7800 XT', power: 263, length: 280, slots: 2.5, cooler: 'open-dual', fanCount: 2, flowThrough: false, rjc: 0.05, tmax: 90 },
    { id: 'rx7700xt-pulse', group: 'AMD Radeon RX 7000/6000', name: 'Sapphire Pulse RX 7700 XT', power: 245, length: 280, slots: 2.5, cooler: 'open-dual', fanCount: 2, flowThrough: false, rjc: 0.055, tmax: 90 },
    { id: 'rx7600-ref', group: 'AMD Radeon RX 7000/6000', name: 'RX 7600 (reference)', power: 165, length: 204, slots: 2, cooler: 'open-dual', fanCount: 2, flowThrough: false, rjc: 0.12, tmax: 90 },
    { id: 'rx6800xt-ref', group: 'AMD Radeon RX 7000/6000', name: 'RX 6800 XT (reference)', power: 300, length: 267, slots: 2.5, cooler: 'open-triple', fanCount: 3, flowThrough: false, rjc: 0.045, tmax: 90 },
    { id: 'rx6700xt-ref', group: 'AMD Radeon RX 7000/6000', name: 'RX 6700 XT (reference)', power: 230, length: 267, slots: 2, cooler: 'open-dual', fanCount: 2, flowThrough: false, rjc: 0.06, tmax: 90 },
    { id: 'arc-b580-le', group: 'Intel Arc', name: 'Arc B580 Limited Edition', power: 190, length: 272, slots: 2, cooler: 'open-dual', fanCount: 2, flowThrough: true, rjc: 0.09, tmax: 90 },
    { id: 'arc-a770-le', group: 'Intel Arc', name: 'Arc A770 Limited Edition', power: 225, length: 267, slots: 2, cooler: 'open-dual', fanCount: 2, flowThrough: true, rjc: 0.06, tmax: 90 },
    { id: 'rtx-a4000', group: 'Workstation (blower)', name: 'NVIDIA RTX A4000', power: 140, length: 241, slots: 1, cooler: 'blower', fanCount: 1, flowThrough: false, rjc: 0.11, tmax: 88 },
    { id: 'rtx-4000-ada', group: 'Workstation (blower)', name: 'NVIDIA RTX 4000 Ada', power: 130, length: 241, slots: 1, cooler: 'blower', fanCount: 1, flowThrough: false, rjc: 0.12, tmax: 88 },
    { id: 'rtx-a6000', group: 'Workstation (blower)', name: 'NVIDIA RTX A6000', power: 300, length: 267, slots: 2, cooler: 'blower', fanCount: 1, flowThrough: false, rjc: 0.05, tmax: 88 },
    { id: 'rtx-6000-ada', group: 'Workstation (blower)', name: 'NVIDIA RTX 6000 Ada', power: 300, length: 267, slots: 2, cooler: 'blower', fanCount: 1, flowThrough: false, rjc: 0.04, tmax: 88 },
  ];

  const COOLERS = [
    { id: 'generic-stock', group: 'Generic', name: 'Generic stock top-down', type: 'stock' },
    { id: 'generic-lowprofile', group: 'Generic', name: 'Generic low-profile', type: 'lowprofile' },
    { id: 'generic-tower-single', group: 'Generic', name: 'Generic single-tower (120 mm)', type: 'tower-single' },
    { id: 'generic-tower-dual', group: 'Generic', name: 'Generic dual-tower (2 × 140 mm)', type: 'tower-dual' },
    { id: 'generic-aio', group: 'Generic', name: 'Generic AIO', type: 'aio' },
    { id: 'nh-d15', group: 'Dual-tower air', name: 'Noctua NH-D15', type: 'tower-dual', height: 165, depth: 135, finHeight: 150, fanSize: 140, fanCount: 2, fan: 'noctua-a15', perf: 0.93 },
    { id: 'nh-d15-g2', group: 'Dual-tower air', name: 'Noctua NH-D15 G2', type: 'tower-dual', height: 168, depth: 140, finHeight: 150, fanSize: 140, fanCount: 2, fan: 'noctua-a14x25-g2', perf: 0.88 },
    { id: 'pa120-se', group: 'Dual-tower air', name: 'Thermalright Peerless Assassin 120 SE', type: 'tower-dual', height: 155, depth: 110, finHeight: 125, fanSize: 120, fanCount: 2, fan: 'thermalright-tl-c12c', perf: 0.97 },
    { id: 'ps120-se', group: 'Dual-tower air', name: 'Thermalright Phantom Spirit 120 SE', type: 'tower-dual', height: 154, depth: 110, finHeight: 125, fanSize: 120, fanCount: 2, fan: 'thermalright-tl-c12c', perf: 0.95 },
    { id: 'ak620', group: 'Dual-tower air', name: 'DeepCool AK620', type: 'tower-dual', height: 160, depth: 112, finHeight: 130, fanSize: 120, fanCount: 2, fan: 'deepcool-fk120', perf: 0.98 },
    { id: 'drp5', group: 'Dual-tower air', name: 'be quiet! Dark Rock Pro 5', type: 'tower-dual', height: 168, depth: 125, finHeight: 136, fanSize: 120, fanCount: 2, fan: 'bequiet-silent-wings4-120', perf: 0.98 },
    { id: 'fuma3', group: 'Dual-tower air', name: 'Scythe Fuma 3', type: 'tower-dual', height: 155, depth: 115, finHeight: 130, fanSize: 120, fanCount: 2, fan: 'scythe-kaze-flex2-120', perf: 1.02 },
    { id: 'nh-u12a', group: 'Single-tower air', name: 'Noctua NH-U12A', type: 'tower-single', height: 158, depth: 58, finHeight: 125, fanSize: 120, fanCount: 2, fan: 'noctua-a12x25', perf: 0.82 },
    { id: 'nh-u12s-redux', group: 'Single-tower air', name: 'Noctua NH-U12S redux', type: 'tower-single', height: 158, depth: 45, finHeight: 125, fanSize: 120, fanCount: 1, fan: 'noctua-p12-redux', perf: 1.0 },
    { id: 'ak400', group: 'Single-tower air', name: 'DeepCool AK400', type: 'tower-single', height: 155, depth: 50, finHeight: 125, fanSize: 120, fanCount: 1, fan: 'deepcool-fk120', perf: 1.0 },
    { id: 'ax120-se', group: 'Single-tower air', name: 'Thermalright Assassin X 120 R SE', type: 'tower-single', height: 148, depth: 50, finHeight: 120, fanSize: 120, fanCount: 1, fan: 'thermalright-tl-c12c', perf: 1.05 },
    { id: 'freezer36', group: 'Single-tower air', name: 'Arctic Freezer 36', type: 'tower-single', height: 159, depth: 55, finHeight: 125, fanSize: 120, fanCount: 2, fan: 'arctic-p12', perf: 0.88 },
    { id: 'hyper212', group: 'Single-tower air', name: 'Cooler Master Hyper 212', type: 'tower-single', height: 155, depth: 52, finHeight: 120, fanSize: 120, fanCount: 1, fan: 'cm-sickleflow-120', perf: 1.12 },
    { id: 'pure-rock-2', group: 'Single-tower air', name: 'be quiet! Pure Rock 2', type: 'tower-single', height: 155, depth: 45, finHeight: 120, fanSize: 120, fanCount: 1, fan: 'bequiet-pure-wings2-120', perf: 1.1 },
    { id: 'nh-l9', group: 'Low-profile & stock', name: 'Noctua NH-L9i / NH-L9a', type: 'lowprofile', height: 37, footprint: 95, builtinFan: { cfm: 33.8, mmh2o: 2.25, rpm: 2500, size: 92 }, perf: 1.3 },
    { id: 'nh-l12s', group: 'Low-profile & stock', name: 'Noctua NH-L12S', type: 'lowprofile', height: 70, footprint: 128, builtinFan: { cfm: 55.4, mmh2o: 1.85, rpm: 1850, size: 120 }, perf: 0.9 },
    { id: 'wraith-prism', group: 'Low-profile & stock', name: 'AMD Wraith Prism', type: 'stock', height: 93, footprint: 105, perf: 0.85 },
    { id: 'wraith-spire', group: 'Low-profile & stock', name: 'AMD Wraith Spire', type: 'stock', height: 71, footprint: 100, perf: 1.0 },
    { id: 'wraith-stealth', group: 'Low-profile & stock', name: 'AMD Wraith Stealth', type: 'stock', height: 54, footprint: 95, perf: 1.15 },
    { id: 'laminar-rm1', group: 'Low-profile & stock', name: 'Intel Laminar RM1', type: 'stock', height: 55, footprint: 95, perf: 1.1 },
    { id: 'laminar-rh1', group: 'Low-profile & stock', name: 'Intel Laminar RH1', type: 'stock', height: 72, footprint: 100, perf: 0.95 },
    { id: 'lf3-360', group: 'AIO liquid', name: 'Arctic Liquid Freezer III 360', type: 'aio', aio: { fans: 3, size: 120, thickness: 38 }, fan: 'arctic-p12', perf: 0.88 },
    { id: 'lf3-280', group: 'AIO liquid', name: 'Arctic Liquid Freezer III 280', type: 'aio', aio: { fans: 2, size: 140, thickness: 38 }, fan: 'arctic-p14', perf: 0.9 },
    { id: 'lf3-240', group: 'AIO liquid', name: 'Arctic Liquid Freezer III 240', type: 'aio', aio: { fans: 2, size: 120, thickness: 38 }, fan: 'arctic-p12', perf: 0.9 },
    { id: 'kraken-360', group: 'AIO liquid', name: 'NZXT Kraken 360', type: 'aio', aio: { fans: 3, size: 120, thickness: 30 }, fan: 'nzxt-f120p', perf: 1.0 },
    { id: 'kraken-240', group: 'AIO liquid', name: 'NZXT Kraken 240', type: 'aio', aio: { fans: 2, size: 120, thickness: 30 }, fan: 'nzxt-f120p', perf: 1.0 },
    { id: 'h150i-elite', group: 'AIO liquid', name: 'Corsair iCUE H150i Elite', type: 'aio', aio: { fans: 3, size: 120, thickness: 27 }, fan: 'corsair-af120-elite', perf: 1.0 },
    { id: 'h100i-elite', group: 'AIO liquid', name: 'Corsair iCUE H100i Elite', type: 'aio', aio: { fans: 2, size: 120, thickness: 27 }, fan: 'corsair-af120-elite', perf: 1.0 },
    { id: 'galahad2-360', group: 'AIO liquid', name: 'Lian Li Galahad II Trinity 360', type: 'aio', aio: { fans: 3, size: 120, thickness: 32 }, fan: 'lianli-sl-inf120', perf: 0.97 },
    { id: 'lt720', group: 'AIO liquid', name: 'DeepCool LT720', type: 'aio', aio: { fans: 3, size: 120, thickness: 27 }, fan: 'deepcool-fc120', perf: 1.0 },
    { id: 'pure-loop2-280', group: 'AIO liquid', name: 'be quiet! Pure Loop 2 280', type: 'aio', aio: { fans: 2, size: 140, thickness: 27 }, fan: 'bequiet-pure-wings2-140', perf: 1.03 },
  ];

  const BOARDS = [
    { id: 'x870e-hero', group: 'AMD AM5', name: 'ASUS ROG Crosshair X870E Hero', socket: 'AM5', layout: 'atx-slot2' },
    { id: 'x870e-e', group: 'AMD AM5', name: 'ASUS ROG Strix X870E-E Gaming WiFi', socket: 'AM5', layout: 'atx-slot2' },
    { id: 'x870-tomahawk', group: 'AMD AM5', name: 'MSI MAG X870 Tomahawk WiFi', socket: 'AM5', layout: 'atx-slot2' },
    { id: 'x870e-aorus-master', group: 'AMD AM5', name: 'Gigabyte X870E Aorus Master', socket: 'AM5', layout: 'eatx', width: 269 },
    { id: 'x870e-taichi', group: 'AMD AM5', name: 'ASRock X870E Taichi', socket: 'AM5', layout: 'eatx', width: 267 },
    { id: 'b650-tomahawk', group: 'AMD AM5', name: 'MSI MAG B650 Tomahawk WiFi', socket: 'AM5', layout: 'atx-slot1' },
    { id: 'b650-tuf', group: 'AMD AM5', name: 'ASUS TUF Gaming B650-Plus WiFi', socket: 'AM5', layout: 'atx-slot2' },
    { id: 'b650-aorus-elite', group: 'AMD AM5', name: 'Gigabyte B650 Aorus Elite AX', socket: 'AM5', layout: 'atx-slot2' },
    { id: 'b650m-pro-a', group: 'AMD AM5', name: 'MSI PRO B650M-A WiFi', socket: 'AM5', layout: 'matx' },
    { id: 'b650m-aorus-elite', group: 'AMD AM5', name: 'Gigabyte B650M Aorus Elite AX', socket: 'AM5', layout: 'matx' },
    { id: 'b650m-pro-rs', group: 'AMD AM5', name: 'ASRock B650M Pro RS', socket: 'AM5', layout: 'matx' },
    { id: 'b650e-i', group: 'AMD AM5', name: 'ASUS ROG Strix B650E-I Gaming', socket: 'AM5', layout: 'itx' },
    { id: 'b650i-edge', group: 'AMD AM5', name: 'MSI MPG B650I Edge WiFi', socket: 'AM5', layout: 'itx' },
    { id: 'b550-tomahawk', group: 'AMD AM4', name: 'MSI MAG B550 Tomahawk', socket: 'AM4', layout: 'atx-slot1' },
    { id: 'b550-f', group: 'AMD AM4', name: 'ASUS ROG Strix B550-F Gaming', socket: 'AM4', layout: 'atx-slot1' },
    { id: 'b550-aorus-elite', group: 'AMD AM4', name: 'Gigabyte B550 Aorus Elite', socket: 'AM4', layout: 'atx-slot1' },
    { id: 'b550m-pro-vdh', group: 'AMD AM4', name: 'MSI B550M PRO-VDH WiFi', socket: 'AM4', layout: 'matx' },
    { id: 'b550-i', group: 'AMD AM4', name: 'ASUS ROG Strix B550-I Gaming', socket: 'AM4', layout: 'itx' },
    { id: 'z790-hero', group: 'Intel LGA1700', name: 'ASUS ROG Maximus Z790 Hero', socket: 'LGA1700', layout: 'atx-slot2' },
    { id: 'z790-e', group: 'Intel LGA1700', name: 'ASUS ROG Strix Z790-E Gaming WiFi', socket: 'LGA1700', layout: 'atx-slot2' },
    { id: 'z790-tomahawk', group: 'Intel LGA1700', name: 'MSI MAG Z790 Tomahawk WiFi', socket: 'LGA1700', layout: 'atx-slot1' },
    { id: 'z790-pro-a', group: 'Intel LGA1700', name: 'MSI PRO Z790-A WiFi', socket: 'LGA1700', layout: 'atx-slot1' },
    { id: 'z790-aorus-elite', group: 'Intel LGA1700', name: 'Gigabyte Z790 Aorus Elite AX', socket: 'LGA1700', layout: 'atx-slot2' },
    { id: 'b760-tuf', group: 'Intel LGA1700', name: 'ASUS TUF Gaming B760-Plus WiFi', socket: 'LGA1700', layout: 'atx-slot2' },
    { id: 'b760m-pro-a', group: 'Intel LGA1700', name: 'MSI PRO B760M-A WiFi', socket: 'LGA1700', layout: 'matx' },
    { id: 'z790-i', group: 'Intel LGA1700', name: 'ASUS ROG Strix Z790-I Gaming', socket: 'LGA1700', layout: 'itx' },
    { id: 'z890-hero', group: 'Intel LGA1851', name: 'ASUS ROG Maximus Z890 Hero', socket: 'LGA1851', layout: 'atx-slot2' },
    { id: 'z890-tomahawk', group: 'Intel LGA1851', name: 'MSI MAG Z890 Tomahawk WiFi', socket: 'LGA1851', layout: 'atx-slot2' },
    { id: 'z890-aorus-elite', group: 'Intel LGA1851', name: 'Gigabyte Z890 Aorus Elite WiFi7', socket: 'LGA1851', layout: 'atx-slot2' },
    { id: 'b860m-pro-a', group: 'Intel LGA1851', name: 'MSI PRO B860M-A WiFi', socket: 'LGA1851', layout: 'matx' },
  ];

  const p = (type, fanSize) => ({ type, fanSize });
  const CASES = [
    {
      id: 'corsair-4000d', group: 'Corsair', name: 'Corsair 4000D Airflow', height: 466, depth: 453, width: 230, shroud: true, frontSlots: 3, maxGpu: 360, maxCooler: 170,
      panels: { front: p('mesh', 120), top: p('mesh', 120), rear: p('perforated', 120), bottom: p('mesh', 120), side: p('solid', 120) },
      support: { front: { 120: 3, 140: 2 }, top: { 120: 3, 140: 2 }, rear: { 120: 1 } },
      stock: [['front-0', 'intake', 'corsair-airguide-120'], ['rear-0', 'exhaust', 'corsair-airguide-120']],
    },
    {
      id: 'corsair-5000d', group: 'Corsair', name: 'Corsair 5000D Airflow', height: 520, depth: 520, width: 245, shroud: true, frontSlots: 3, maxGpu: 420, maxCooler: 170,
      panels: { front: p('mesh', 120), top: p('mesh', 120), rear: p('perforated', 120), bottom: p('mesh', 120), side: p('solid', 120) },
      support: { front: { 120: 3, 140: 2 }, top: { 120: 3, 140: 2 }, rear: { 120: 1 } },
      stock: [['front-0', 'intake', 'corsair-airguide-120'], ['rear-0', 'exhaust', 'corsair-airguide-120']],
    },
    {
      id: 'corsair-3000d', group: 'Corsair', name: 'Corsair 3000D Airflow', height: 466, depth: 462, width: 230, shroud: true, frontSlots: 3, maxGpu: 360, maxCooler: 170, stockApprox: true,
      panels: { front: p('mesh', 120), top: p('mesh', 120), rear: p('perforated', 120), bottom: p('mesh', 120), side: p('solid', 120) },
      support: { front: { 120: 3, 140: 2 }, top: { 120: 2, 140: 2 }, rear: { 120: 1 } },
      stock: [['front-0', 'intake', 'corsair-airguide-120'], ['front-1', 'intake', 'corsair-airguide-120']],
    },
    {
      id: 'lancool-216', group: 'Lian Li', name: 'Lian Li Lancool 216', height: 491, depth: 480, width: 235, shroud: true, frontSlots: 2, maxGpu: 392, maxCooler: 180,
      panels: { front: p('mesh', 160), top: p('mesh', 140), rear: p('perforated', 140), bottom: p('mesh', 120), side: p('solid', 120) },
      support: { front: { 120: 3, 140: 3, 160: 2 }, top: { 120: 3, 140: 2 }, rear: { 120: 1, 140: 1 } },
      stock: [['front-0', 'intake', 'lianli-bundled-160'], ['front-1', 'intake', 'lianli-bundled-160'], ['rear-0', 'exhaust', 'lianli-bundled-140']],
    },
    {
      id: 'lancool-3', group: 'Lian Li', name: 'Lian Li Lancool III', height: 523, depth: 526, width: 238, shroud: true, frontSlots: 3, maxGpu: 435, maxCooler: 187,
      panels: { front: p('mesh', 140), top: p('mesh', 140), rear: p('perforated', 140), bottom: p('mesh', 120), side: p('solid', 120) },
      support: { front: { 120: 3, 140: 3 }, top: { 120: 3, 140: 3 }, rear: { 120: 1, 140: 1 } },
      stock: [['front-0', 'intake', 'lianli-bundled-140'], ['front-1', 'intake', 'lianli-bundled-140'], ['front-2', 'intake', 'lianli-bundled-140'], ['rear-0', 'exhaust', 'lianli-bundled-140']],
    },
    {
      id: 'o11-evo', group: 'Lian Li', name: 'Lian Li O11 Dynamic EVO (side-intake layout)', height: 459, depth: 465, width: 285, shroud: false, frontSlots: 3, maxGpu: 422, maxCooler: 167,
      panels: { front: p('solid', 120), top: p('mesh', 120), rear: p('perforated', 120), bottom: p('mesh', 120), side: p('mesh', 120) },
      support: { top: { 120: 3 }, bottom: { 120: 3 }, rear: { 120: 1 }, side: { 120: 4 } },
      stock: [],
    },
    {
      id: 'fractal-north', group: 'Fractal Design', name: 'Fractal Design North', height: 469, depth: 447, width: 215, shroud: true, frontSlots: 3, maxGpu: 355, maxCooler: 170,
      panels: { front: p('perforated', 140), top: p('mesh', 140), rear: p('perforated', 140), bottom: p('mesh', 120), side: p('solid', 120) },
      support: { front: { 120: 3, 140: 2 }, top: { 120: 2, 140: 2 }, rear: { 120: 1, 140: 1 } },
      stock: [['front-0', 'intake', 'fractal-aspect-14'], ['front-1', 'intake', 'fractal-aspect-14'], ['rear-0', 'exhaust', 'fractal-aspect-14']],
    },
    {
      id: 'meshify2-compact', group: 'Fractal Design', name: 'Fractal Design Meshify 2 Compact', height: 475, depth: 427, width: 210, shroud: true, frontSlots: 3, maxGpu: 360, maxCooler: 169,
      panels: { front: p('mesh', 140), top: p('mesh', 140), rear: p('perforated', 140), bottom: p('mesh', 120), side: p('solid', 120) },
      support: { front: { 120: 3, 140: 2 }, top: { 120: 2, 140: 2 }, rear: { 120: 1, 140: 1 } },
      stock: [['front-0', 'intake', 'fractal-dynamic-x2-14'], ['front-1', 'intake', 'fractal-dynamic-x2-14'], ['rear-0', 'exhaust', 'fractal-dynamic-x2-14']],
    },
    {
      id: 'fractal-pop-air', group: 'Fractal Design', name: 'Fractal Design Pop Air', height: 466, depth: 474, width: 215, shroud: true, frontSlots: 3, maxGpu: 405, maxCooler: 170,
      panels: { front: p('mesh', 120), top: p('mesh', 120), rear: p('perforated', 120), bottom: p('mesh', 120), side: p('solid', 120) },
      support: { front: { 120: 3, 140: 2 }, top: { 120: 2, 140: 2 }, rear: { 120: 1 } },
      stock: [['front-0', 'intake', 'fractal-aspect-12'], ['front-1', 'intake', 'fractal-aspect-12'], ['front-2', 'intake', 'fractal-aspect-12'], ['rear-0', 'exhaust', 'fractal-aspect-12']],
    },
    {
      id: 'montech-air903-max', group: 'Montech', name: 'Montech AIR 903 MAX', height: 487, depth: 493, width: 230, shroud: true, frontSlots: 3, maxGpu: 400, maxCooler: 180,
      panels: { front: p('mesh', 140), top: p('mesh', 140), rear: p('perforated', 140), bottom: p('mesh', 120), side: p('solid', 120) },
      support: { front: { 120: 3, 140: 3 }, top: { 120: 3, 140: 2 }, rear: { 120: 1, 140: 1 } },
      stock: [['front-0', 'intake', 'montech-ax140'], ['front-1', 'intake', 'montech-ax140'], ['front-2', 'intake', 'montech-ax140'], ['rear-0', 'exhaust', 'montech-ax140']],
    },
    {
      id: 'phanteks-g360a', group: 'Phanteks', name: 'Phanteks Eclipse G360A', height: 450, depth: 465, width: 220, shroud: true, frontSlots: 3, maxGpu: 400, maxCooler: 162,
      panels: { front: p('mesh', 120), top: p('mesh', 120), rear: p('perforated', 120), bottom: p('mesh', 120), side: p('solid', 120) },
      support: { front: { 120: 3, 140: 2 }, top: { 120: 3, 140: 2 }, rear: { 120: 1 } },
      stock: [['front-0', 'intake', 'phanteks-m25-120'], ['front-1', 'intake', 'phanteks-m25-120'], ['front-2', 'intake', 'phanteks-m25-120']],
    },
    {
      id: 'bequiet-500dx', group: 'be quiet!', name: 'be quiet! Pure Base 500DX', height: 463, depth: 450, width: 232, shroud: true, frontSlots: 3, maxGpu: 369, maxCooler: 190, stockApprox: true,
      panels: { front: p('perforated', 140), top: p('mesh', 140), rear: p('perforated', 140), bottom: p('mesh', 120), side: p('solid', 120) },
      support: { front: { 120: 3, 140: 3 }, top: { 120: 2, 140: 2 }, rear: { 120: 1, 140: 1 } },
      stock: [['front-0', 'intake', 'bequiet-pure-wings2-140'], ['top-0', 'exhaust', 'bequiet-pure-wings2-140'], ['rear-0', 'exhaust', 'bequiet-pure-wings2-140']],
    },
    {
      id: 'nr200p', group: 'Cooler Master', name: 'Cooler Master NR200P (Mini-ITX)', height: 292, depth: 376, width: 185, shroud: false, frontSlots: 0, maxGpu: 330, maxCooler: 155,
      panels: { front: p('solid', 120), top: p('perforated', 120), rear: p('perforated', 92), bottom: p('perforated', 120), side: p('solid', 120) },
      support: { top: { 120: 2, 140: 2 }, bottom: { 120: 2, 140: 2 }, rear: { 92: 1 } },
      stock: [['bottom-0', 'intake', 'cm-sickleflow-120'], ['bottom-1', 'intake', 'cm-sickleflow-120']],
    },
    {
      id: 'corsair-4000x', group: 'Corsair', name: 'Corsair iCUE 4000X RGB (glass front)', height: 466, depth: 453, width: 230, shroud: true, frontSlots: 3, maxGpu: 360, maxCooler: 170,
      panels: { front: p('restricted', 120), top: p('mesh', 120), rear: p('perforated', 120), bottom: p('mesh', 120), side: p('solid', 120) },
      support: { front: { 120: 3, 140: 2 }, top: { 120: 3, 140: 2 }, rear: { 120: 1 } },
      stock: [['front-0', 'intake', 'corsair-sp120-elite'], ['front-1', 'intake', 'corsair-sp120-elite'], ['front-2', 'intake', 'corsair-sp120-elite']],
    },
    {
      id: 'corsair-5000x', group: 'Corsair', name: 'Corsair iCUE 5000X RGB (glass front)', height: 520, depth: 520, width: 245, shroud: true, frontSlots: 3, maxGpu: 400, maxCooler: 170,
      panels: { front: p('restricted', 120), top: p('mesh', 120), rear: p('perforated', 120), bottom: p('mesh', 120), side: p('solid', 120) },
      support: { front: { 120: 3, 140: 2 }, top: { 120: 3, 140: 2 }, rear: { 120: 1 } },
      stock: [['front-0', 'intake', 'corsair-sp120-elite'], ['front-1', 'intake', 'corsair-sp120-elite'], ['front-2', 'intake', 'corsair-sp120-elite']],
    },
    {
      id: 'corsair-7000d', group: 'Corsair', name: 'Corsair 7000D Airflow (full tower)', height: 600, depth: 550, width: 248, shroud: true, frontSlots: 3, maxGpu: 450, maxCooler: 190, stockApprox: true,
      panels: { front: p('mesh', 140), top: p('mesh', 140), rear: p('perforated', 140), bottom: p('mesh', 120), side: p('solid', 120) },
      support: { front: { 120: 3, 140: 3 }, top: { 120: 3, 140: 3 }, rear: { 120: 1, 140: 1 } },
      stock: [['front-0', 'intake', 'corsair-airguide-140'], ['front-1', 'intake', 'corsair-airguide-140'], ['rear-0', 'exhaust', 'corsair-airguide-140']],
    },
    {
      id: 'fractal-meshify2', group: 'Fractal Design', name: 'Fractal Design Meshify 2', height: 474, depth: 542, width: 240, shroud: true, frontSlots: 3, maxGpu: 467, maxCooler: 185,
      panels: { front: p('mesh', 140), top: p('mesh', 140), rear: p('perforated', 140), bottom: p('mesh', 120), side: p('solid', 120) },
      support: { front: { 120: 3, 140: 3 }, top: { 120: 3, 140: 3 }, rear: { 120: 1, 140: 1 } },
      stock: [['front-0', 'intake', 'fractal-dynamic-x2-14'], ['front-1', 'intake', 'fractal-dynamic-x2-14'], ['rear-0', 'exhaust', 'fractal-dynamic-x2-14']],
    },
    {
      id: 'fractal-define7', group: 'Fractal Design', name: 'Fractal Design Define 7 (solid front)', height: 475, depth: 547, width: 240, shroud: true, frontSlots: 3, maxGpu: 467, maxCooler: 185,
      panels: { front: p('restricted', 140), top: p('solid', 140), rear: p('perforated', 140), bottom: p('mesh', 120), side: p('solid', 120) },
      support: { front: { 120: 3, 140: 3 }, top: { 120: 3, 140: 3 }, rear: { 120: 1, 140: 1 } },
      stock: [['front-0', 'intake', 'fractal-dynamic-x2-14'], ['front-1', 'intake', 'fractal-dynamic-x2-14'], ['rear-0', 'exhaust', 'fractal-dynamic-x2-14']],
    },
    {
      id: 'fractal-north-xl', group: 'Fractal Design', name: 'Fractal Design North XL', height: 509, depth: 503, width: 240, shroud: true, frontSlots: 3, maxGpu: 413, maxCooler: 185, stockApprox: true,
      panels: { front: p('perforated', 140), top: p('mesh', 140), rear: p('perforated', 140), bottom: p('mesh', 120), side: p('solid', 120) },
      support: { front: { 120: 3, 140: 3 }, top: { 120: 3, 140: 3 }, rear: { 120: 1, 140: 1 } },
      stock: [['front-0', 'intake', 'fractal-aspect-14'], ['front-1', 'intake', 'fractal-aspect-14'], ['front-2', 'intake', 'fractal-aspect-14'], ['rear-0', 'exhaust', 'fractal-aspect-14']],
    },
    {
      id: 'fractal-torrent', group: 'Fractal Design', name: 'Fractal Design Torrent', height: 530, depth: 544, width: 242, shroud: false, frontSlots: 2, maxGpu: 461, maxCooler: 188, grille: { panel: 'top', areaMm2: 35000 },
      panels: { front: p('mesh', 180), top: p('solid', 140), rear: p('perforated', 140), bottom: p('mesh', 140), side: p('solid', 120) },
      support: { front: { 120: 3, 140: 3, 180: 2 }, bottom: { 120: 3, 140: 3 }, rear: { 120: 1, 140: 1 } },
      stock: [['front-0', 'intake', 'fractal-dynamic-x2-18'], ['front-1', 'intake', 'fractal-dynamic-x2-18'], ['bottom-0', 'intake', 'fractal-dynamic-x2-14'], ['bottom-1', 'intake', 'fractal-dynamic-x2-14'], ['bottom-2', 'intake', 'fractal-dynamic-x2-14']],
    },
    {
      id: 'nzxt-h5-flow', group: 'NZXT', name: 'NZXT H5 Flow (2024)', height: 464, depth: 435, width: 227, shroud: true, frontSlots: 3, maxGpu: 365, maxCooler: 165, stockApprox: true,
      panels: { front: p('mesh', 120), top: p('mesh', 120), rear: p('perforated', 120), bottom: p('mesh', 120), side: p('solid', 120) },
      support: { front: { 120: 3, 140: 2 }, top: { 120: 2, 140: 2 }, rear: { 120: 1 } },
      stock: [['front-0', 'intake', 'nzxt-f120q'], ['front-1', 'intake', 'nzxt-f120q'], ['rear-0', 'exhaust', 'nzxt-f120q']],
    },
    {
      id: 'nzxt-h7-flow', group: 'NZXT', name: 'NZXT H7 Flow (2024)', height: 505, depth: 505, width: 230, shroud: true, frontSlots: 3, maxGpu: 400, maxCooler: 185, stockApprox: true,
      panels: { front: p('mesh', 140), top: p('mesh', 140), rear: p('perforated', 120), bottom: p('mesh', 120), side: p('solid', 120) },
      support: { front: { 120: 3, 140: 3 }, top: { 120: 3, 140: 3 }, rear: { 120: 1 } },
      stock: [['front-0', 'intake', 'nzxt-f140q'], ['front-1', 'intake', 'nzxt-f140q'], ['front-2', 'intake', 'nzxt-f140q'], ['rear-0', 'exhaust', 'nzxt-f120q']],
    },
    {
      id: 'phanteks-xt-pro-ultra', group: 'Phanteks', name: 'Phanteks XT Pro Ultra', height: 485, depth: 470, width: 230, shroud: true, frontSlots: 3, maxGpu: 415, maxCooler: 184, stockApprox: true,
      panels: { front: p('mesh', 120), top: p('mesh', 120), rear: p('perforated', 120), bottom: p('mesh', 120), side: p('solid', 120) },
      support: { front: { 120: 3, 140: 3 }, top: { 120: 3, 140: 2 }, rear: { 120: 1 } },
      stock: [['front-0', 'intake', 'phanteks-m25-120'], ['front-1', 'intake', 'phanteks-m25-120'], ['front-2', 'intake', 'phanteks-m25-120'], ['rear-0', 'exhaust', 'phanteks-m25-120']],
    },
    {
      id: 'bequiet-shadow-base-800fx', group: 'be quiet!', name: 'be quiet! Shadow Base 800 FX', height: 512, depth: 527, width: 240, shroud: true, frontSlots: 3, maxGpu: 450, maxCooler: 180, stockApprox: true,
      panels: { front: p('mesh', 140), top: p('mesh', 140), rear: p('perforated', 140), bottom: p('mesh', 120), side: p('solid', 120) },
      support: { front: { 120: 3, 140: 3 }, top: { 120: 3, 140: 3 }, rear: { 120: 1, 140: 1 } },
      stock: [['front-0', 'intake', 'bequiet-light-wings-140'], ['front-1', 'intake', 'bequiet-light-wings-140'], ['front-2', 'intake', 'bequiet-light-wings-140'], ['rear-0', 'exhaust', 'bequiet-light-wings-140']],
    },
    {
      id: 'bequiet-silent-base-802', group: 'be quiet!', name: 'be quiet! Silent Base 802 (mesh front)', height: 553, depth: 539, width: 281, shroud: true, frontSlots: 3, maxGpu: 432, maxCooler: 185, stockApprox: true,
      panels: { front: p('mesh', 140), top: p('mesh', 140), rear: p('perforated', 140), bottom: p('mesh', 120), side: p('solid', 120) },
      support: { front: { 120: 3, 140: 3 }, top: { 120: 3, 140: 3 }, rear: { 120: 1, 140: 1 } },
      stock: [['front-0', 'intake', 'bequiet-pure-wings2-140'], ['front-1', 'intake', 'bequiet-pure-wings2-140'], ['rear-0', 'exhaust', 'bequiet-pure-wings2-140']],
    },
    {
      id: 'cm-td500-mesh-v2', group: 'Cooler Master', name: 'Cooler Master MasterBox TD500 Mesh V2', height: 469, depth: 493, width: 217, shroud: true, frontSlots: 3, maxGpu: 410, maxCooler: 165,
      panels: { front: p('mesh', 120), top: p('mesh', 120), rear: p('perforated', 120), bottom: p('mesh', 120), side: p('solid', 120) },
      support: { front: { 120: 3, 140: 2 }, top: { 120: 3, 140: 2 }, rear: { 120: 1 } },
      stock: [['front-0', 'intake', 'cm-sickleflow-120'], ['front-1', 'intake', 'cm-sickleflow-120'], ['front-2', 'intake', 'cm-sickleflow-120']],
    },
    {
      id: 'cm-q300l', group: 'Cooler Master', name: 'Cooler Master MasterBox Q300L (Micro-ATX)', height: 381, depth: 387, width: 230, shroud: false, frontSlots: 2, maxGpu: 360, maxCooler: 159,
      panels: { front: p('perforated', 120), top: p('perforated', 120), rear: p('perforated', 120), bottom: p('perforated', 120), side: p('solid', 120) },
      support: { front: { 120: 2, 140: 2 }, top: { 120: 2 }, rear: { 120: 1 } },
      stock: [['rear-0', 'exhaust', 'cm-sickleflow-120']],
    },
    {
      id: 'montech-air100', group: 'Montech', name: 'Montech AIR 100 ARGB (Micro-ATX)', height: 426, depth: 405, width: 210, shroud: true, frontSlots: 2, maxGpu: 330, maxCooler: 161, stockApprox: true,
      panels: { front: p('mesh', 120), top: p('mesh', 120), rear: p('perforated', 120), bottom: p('mesh', 120), side: p('solid', 120) },
      support: { front: { 120: 2, 140: 2 }, top: { 120: 2, 140: 2 }, rear: { 120: 1 } },
      stock: [['front-0', 'intake', 'montech-ax120'], ['front-1', 'intake', 'montech-ax120'], ['top-0', 'exhaust', 'montech-ax120'], ['rear-0', 'exhaust', 'montech-ax120']],
    },
    {
      id: 'deepcool-ch560', group: 'DeepCool', name: 'DeepCool CH560', height: 478, depth: 467, width: 230, shroud: true, frontSlots: 3, maxGpu: 380, maxCooler: 175, stockApprox: true,
      panels: { front: p('mesh', 140), top: p('mesh', 140), rear: p('perforated', 120), bottom: p('mesh', 120), side: p('solid', 120) },
      support: { front: { 120: 3, 140: 3 }, top: { 120: 3, 140: 2 }, rear: { 120: 1 } },
      stock: [['front-0', 'intake', 'deepcool-bundled-140'], ['front-1', 'intake', 'deepcool-bundled-140'], ['front-2', 'intake', 'deepcool-bundled-140'], ['rear-0', 'exhaust', 'deepcool-fc120']],
    },
    {
      id: 'deepcool-cc560', group: 'DeepCool', name: 'DeepCool CC560 V2', height: 477, depth: 416, width: 210, shroud: true, frontSlots: 3, maxGpu: 370, maxCooler: 163, stockApprox: true,
      panels: { front: p('perforated', 120), top: p('mesh', 120), rear: p('perforated', 120), bottom: p('mesh', 120), side: p('solid', 120) },
      support: { front: { 120: 3, 140: 2 }, top: { 120: 2, 140: 2 }, rear: { 120: 1 } },
      stock: [['front-0', 'intake', 'deepcool-fc120'], ['front-1', 'intake', 'deepcool-fc120'], ['front-2', 'intake', 'deepcool-fc120'], ['rear-0', 'exhaust', 'deepcool-fc120']],
    },
    {
      id: 'lianli-lancool-2-mesh', group: 'Lian Li', name: 'Lian Li Lancool II Mesh', height: 494, depth: 478, width: 229, shroud: true, frontSlots: 3, maxGpu: 384, maxCooler: 176, stockApprox: true,
      panels: { front: p('mesh', 120), top: p('mesh', 120), rear: p('perforated', 120), bottom: p('mesh', 120), side: p('solid', 120) },
      support: { front: { 120: 3, 140: 3 }, top: { 120: 3, 140: 2 }, rear: { 120: 1 } },
      stock: [['front-0', 'intake', 'lianli-bundled-120'], ['front-1', 'intake', 'lianli-bundled-120'], ['rear-0', 'exhaust', 'lianli-bundled-120']],
    },
    {
      id: 'jonsbo-d41-mesh', group: 'Jonsbo', name: 'Jonsbo D41 Mesh', height: 450, depth: 430, width: 210, shroud: true, frontSlots: 3, maxGpu: 400, maxCooler: 168, stockApprox: true,
      panels: { front: p('mesh', 120), top: p('mesh', 120), rear: p('perforated', 120), bottom: p('mesh', 120), side: p('solid', 120) },
      support: { front: { 120: 3, 140: 2 }, top: { 120: 3, 140: 2 }, rear: { 120: 1 } },
      stock: [['rear-0', 'exhaust', 'deepcool-fc120']],
    },
  ];

  function byId(list, id) {
    return list.find((x) => x.id === id) || null;
  }

  function fanLabel(f) {
    return `${f.name} (${f.approx ? '≈' : ''}${f.cfm} CFM, ${f.mmh2o} mmH₂O)`;
  }

  function cpuCooler(config) {
    const cpu = config.cpu;
    const base = D.CPU_COOLERS[cpu.cooler] || D.CPU_COOLERS['tower-single'];
    const entry = byId(COOLERS, cpu.coolerModel);
    if (!entry || entry.type !== cpu.cooler || entry.id.startsWith('generic-')) return base;
    const perf = entry.perf || 1;
    const spec = Object.assign({}, base, { name: entry.name, model: entry.id });
    for (const key of ['height', 'depth', 'finHeight', 'fanSize', 'footprint']) if (entry[key] != null) spec[key] = entry[key];
    if (entry.fanCount) {
      spec.defaultFanCount = entry.fanCount;
      spec.maxFanCount = Math.max(base.maxFanCount || 1, entry.fanCount);
    }
    if (entry.fan) spec.defaultFan = entry.fan;
    if (entry.builtinFan) spec.fan = entry.builtinFan;
    if (base.rRef != null) {
      spec.rRef = base.rRef * perf;
      spec.rBase = base.rBase * perf;
    }
    if (base.sectionResistance) {
      spec.sectionResistance = { 120: base.sectionResistance[120] * perf, 140: base.sectionResistance[140] * perf };
    }
    return spec;
  }

  function gpuCooler(config) {
    const base = D.GPU_COOLERS[config.gpu.cooler] || D.GPU_COOLERS['open-dual'];
    if (config.gpu.flowThrough == null || base.type !== 'open') return base;
    return Object.assign({}, base, { flowThrough: !!config.gpu.flowThrough });
  }

  function cpuPower(entry, workload) {
    return workload === 'gaming' ? entry.gaming : entry.power;
  }

  function gpuPower(entry, workload) {
    return Math.round(workload === 'gaming' ? entry.power * 0.88 : entry.power);
  }

  function applyCpu(config, id) {
    const e = byId(CPUS, id);
    if (!e) return;
    Object.assign(config.cpu, { model: id, socket: e.socket, power: cpuPower(e, config.workload), rjc: e.rjc, tjmax: e.tjmax });
  }

  function applyGpu(config, id) {
    const e = byId(GPUS, id);
    if (!e) return;
    Object.assign(config.gpu, {
      model: id, power: gpuPower(e, config.workload), length: e.length, slots: e.slots, cooler: e.cooler,
      fanCount: e.fanCount, flowThrough: e.flowThrough, rjc: e.rjc, tmax: e.tmax, fanSpec: e.fanSpec || null,
    });
  }

  function applyBoard(config, id) {
    const e = byId(BOARDS, id);
    if (!e) return;
    const board = D.motherboardConfig(e.layout);
    if (e.width) board.width = e.width;
    board.product = id;
    board.socket = e.socket;
    config.case.motherboard = board;
  }

  function defaultRadiatorPanel(config, size) {
    const support = config.case.support;
    const fits = (panel) => !support || !support[panel] || (support[panel][size] || 0) >= 1;
    if (config.case.panels.top.type !== 'solid' && fits('top')) return 'top';
    if (config.case.panels.front.type !== 'solid' && fits('front')) return 'front';
    return 'top';
  }

  function applyCooler(config, id) {
    const e = byId(COOLERS, id);
    if (!e) return;
    config.cpu.cooler = e.type;
    config.cpu.coolerModel = id;
    if (e.type === 'tower-single' || e.type === 'tower-dual') {
      config.cpu.coolerFan = e.fan || D.CPU_COOLERS[e.type].defaultFan;
      config.cpu.coolerFanCount = e.fanCount || D.CPU_COOLERS[e.type].defaultFanCount;
    }
    if (e.type === 'aio' && e.aio) {
      const panel = config.cpu.aio && ['top', 'front', 'bottom'].includes(config.cpu.aio.panel) ? config.cpu.aio.panel : defaultRadiatorPanel(config, e.aio.size);
      config.cpu.aio = { panel, fans: e.aio.fans, thickness: e.aio.thickness, pushPull: false };
      config.case.panels[panel].fanSize = e.aio.size;
      const mode = panel === 'front' || panel === 'bottom' ? 'intake' : 'exhaust';
      for (let k = 0; k < e.aio.fans; k++) {
        config.slots[`${panel}-${k}`] = { mode, fan: e.fan, speed: 0.7, filter: mode === 'intake' ? 'nylon' : 'none' };
      }
      for (const [slotId, sc] of Object.entries(config.slots)) {
        if (!slotId.startsWith(`${panel}-`) || sc.fan === 'custom') continue;
        const spec = D.FANS.find((f) => f.id === sc.fan);
        if (!spec || spec.size !== e.aio.size) sc.fan = e.fan;
      }
    }
  }

  function applyCase(config, id) {
    const e = byId(CASES, id);
    if (!e) return;
    const c = config.case;
    Object.assign(c, {
      model: id, name: e.name, height: e.height, depth: e.depth, width: e.width, shroud: e.shroud,
      frontSlots: e.frontSlots, maxGpu: e.maxGpu, maxCooler: e.maxCooler, grille: e.grille ? Object.assign({}, e.grille) : null,
      panels: JSON.parse(JSON.stringify(e.panels)), support: JSON.parse(JSON.stringify(e.support)),
    });
    config.slots = {};
    for (const [slotId, mode, fan] of e.stock) config.slots[slotId] = { mode, fan, speed: 0.7, filter: mode === 'intake' ? 'nylon' : 'none' };
    if (config.cpu.cooler === 'aio') {
      const size = c.panels[config.cpu.aio.panel] ? c.panels[config.cpu.aio.panel].fanSize : 120;
      config.cpu.aio.panel = defaultRadiatorPanel(config, size);
    }
  }

  function supportCap(config, panel, size) {
    const support = config.case.support;
    if (!support) return Infinity;
    if (!support[panel]) return 0;
    return support[panel][size] || 0;
  }

  function supportedSizes(config, panel) {
    const all = D.PANELS[panel].sizes;
    const support = config.case.support;
    if (!support) return all;
    const sizes = all.filter((s) => supportCap(config, panel, s) > 0);
    return sizes.length ? sizes : [config.case.panels[panel].fanSize];
  }

  function boardOf(config) {
    const board = config.case.motherboard || {};
    return byId(BOARDS, board.product);
  }

  D.FANS.push(...EXTRA_FANS.filter((f) => !D.FANS.some((x) => x.id === f.id)));
  if (!D.PANELS.front.sizes.includes(160)) D.PANELS.front.sizes.splice(2, 0, 160);
  if (!D.PANELS.front.sizes.includes(180)) D.PANELS.front.sizes.splice(3, 0, 180);
  if (!D.RADIATOR_THICKNESS.includes(32)) D.RADIATOR_THICKNESS.splice(2, 0, 32);

  AF.catalog = {
    CPUS, GPUS, COOLERS, BOARDS, CASES, byId, fanLabel, cpuCooler, gpuCooler,
    applyCpu, applyGpu, applyBoard, applyCooler, applyCase, supportCap, supportedSizes, boardOf, cpuPower, gpuPower,
  };

  if (typeof module === 'object' && module.exports) module.exports = AF;
})(typeof window !== 'undefined' ? window : globalThis);
