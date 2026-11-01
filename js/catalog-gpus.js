(function (root) {
  const AF = root.AF;
  const C = AF.catalog;
  const { gpu, FE } = C.builders;

  const N20 = 'NVIDIA RTX 20';
  const N30 = 'NVIDIA RTX 30';
  const N40 = 'NVIDIA RTX 40';
  const N50 = 'NVIDIA RTX 50';
  const FE20 = { approx: false };

  const GPUS_RTX = [
    gpu('rtx2060-fe', N20, 'RTX 2060 Founders Edition', 160, 229, 2, 2, false, FE20),
    gpu('rtx2060s-fe', N20, 'RTX 2060 SUPER Founders Edition', 175, 229, 2, 2, false, FE20),
    gpu('rtx2070-fe', N20, 'RTX 2070 Founders Edition', 185, 229, 2, 2, false, FE20),
    gpu('rtx2070s-fe', N20, 'RTX 2070 SUPER Founders Edition', 215, 267, 2, 2, false, FE20),
    gpu('rtx2080-fe', N20, 'RTX 2080 Founders Edition', 225, 267, 2, 2, false, FE20),
    gpu('rtx2080s-fe', N20, 'RTX 2080 SUPER Founders Edition', 250, 267, 2, 2, false, FE20),
    gpu('rtx2080ti-fe', N20, 'RTX 2080 Ti Founders Edition', 260, 267, 2, 2, false, FE20),
    gpu('titan-rtx', N20, 'NVIDIA TITAN RTX', 280, 267, 2, 2, false, FE20),
    gpu('rtx2060-asus-dual', N20, 'ASUS Dual RTX 2060', 160, 242, 2, 2, false),
    gpu('rtx2060-msi-ventus', N20, 'MSI RTX 2060 Ventus XS', 160, 199, 2, 2, false),
    gpu('rtx2060s-gigabyte-gaming-oc', N20, 'Gigabyte RTX 2060 SUPER Gaming OC', 175, 280, 2, 3, false),
    gpu('rtx2070-msi-armor', N20, 'MSI RTX 2070 Armor', 185, 309, 2.5, 2, false),
    gpu('rtx2070s-asus-strix', N20, 'ASUS ROG Strix RTX 2070 SUPER', 215, 300, 2.7, 3, false),
    gpu('rtx2070s-msi-gaming-x-trio', N20, 'MSI RTX 2070 SUPER Gaming X Trio', 215, 327, 2.7, 3, false),
    gpu('rtx2070s-evga-xc-ultra', N20, 'EVGA RTX 2070 SUPER XC Ultra', 215, 268, 2.75, 2, false),
    gpu('rtx2080-gigabyte-gaming-oc', N20, 'Gigabyte RTX 2080 Gaming OC', 225, 286, 2.5, 3, false),
    gpu('rtx2080s-msi-gaming-x-trio', N20, 'MSI RTX 2080 SUPER Gaming X Trio', 250, 327, 2.7, 3, false),
    gpu('rtx2080ti-asus-strix', N20, 'ASUS ROG Strix RTX 2080 Ti', 280, 300, 2.7, 3, false),
    gpu('rtx2080ti-msi-gaming-x-trio', N20, 'MSI RTX 2080 Ti Gaming X Trio', 300, 327, 2.7, 3, false),
    gpu('rtx2080ti-evga-ftw3', N20, 'EVGA RTX 2080 Ti FTW3 Ultra', 300, 302, 2.75, 3, false),

    gpu('rtx3050-asus-dual', N30, 'ASUS Dual RTX 3050 8GB', 130, 200, 2, 2, false),
    gpu('rtx3050-msi-ventus', N30, 'MSI RTX 3050 Ventus 2X 8G', 130, 189, 2, 2, false),
    gpu('rtx3060-msi-ventus', N30, 'MSI RTX 3060 Ventus 2X 12G', 170, 235, 2, 2, false),
    gpu('rtx3060-gigabyte-eagle', N30, 'Gigabyte RTX 3060 Eagle OC 12G', 170, 242, 2, 2, false),
    gpu('rtx3060ti-zotac-twin', N30, 'Zotac RTX 3060 Ti Twin Edge', 200, 221, 2, 2, false),
    gpu('rtx3060ti-msi-gaming-x', N30, 'MSI RTX 3060 Ti Gaming X', 200, 276, 2.5, 2, false),
    gpu('rtx3060ti-asus-tuf', N30, 'ASUS TUF RTX 3060 Ti', 200, 300, 2.7, 3, true),
    gpu('rtx3070-zotac-twin', N30, 'Zotac RTX 3070 Twin Edge', 220, 232, 2, 2, false),
    gpu('rtx3070-asus-tuf', N30, 'ASUS TUF RTX 3070', 220, 300, 2.7, 3, true),
    gpu('rtx3070-msi-gaming-x-trio', N30, 'MSI RTX 3070 Gaming X Trio', 240, 323, 2.7, 3, true),
    gpu('rtx3070ti-asus-tuf', N30, 'ASUS TUF RTX 3070 Ti', 290, 300, 2.7, 3, true),
    gpu('rtx3080-zotac-trinity', N30, 'Zotac RTX 3080 Trinity', 320, 318, 2.5, 3, true),
    gpu('rtx3080-gigabyte-gaming-oc', N30, 'Gigabyte RTX 3080 Gaming OC', 320, 320, 2.7, 3, true),
    gpu('rtx3080ti-fe', N30, 'RTX 3080 Ti Founders Edition', 350, 285, 2, 2, true, FE),
    gpu('rtx3080ti-asus-strix', N30, 'ASUS ROG Strix RTX 3080 Ti', 400, 319, 2.9, 3, true),
    gpu('rtx3090-asus-strix', N30, 'ASUS ROG Strix RTX 3090', 390, 319, 2.9, 3, true),
    gpu('rtx3090-msi-suprim', N30, 'MSI RTX 3090 Suprim X', 420, 336, 3, 3, true),
    gpu('rtx3090-evga-ftw3', N30, 'EVGA RTX 3090 FTW3 Ultra', 380, 300, 2.75, 3, false),
    gpu('rtx3090ti-fe', N30, 'RTX 3090 Ti Founders Edition', 450, 313, 3, 2, true, FE),
    gpu('rtx3090ti-asus-tuf', N30, 'ASUS TUF RTX 3090 Ti', 450, 300, 3.2, 3, true),

    gpu('rtx4060ti-fe', N40, 'RTX 4060 Ti Founders Edition', 160, 244, 2, 2, true, FE),
    gpu('rtx4060ti16-msi-ventus', N40, 'MSI RTX 4060 Ti 16GB Ventus 2X', 165, 199, 2, 2, false),
    gpu('rtx4060-asus-dual', N40, 'ASUS Dual RTX 4060', 115, 227, 2.5, 2, false),
    gpu('rtx4060-gigabyte-windforce', N40, 'Gigabyte RTX 4060 Windforce OC', 115, 192, 2, 2, false),
    gpu('rtx4070-msi-ventus', N40, 'MSI RTX 4070 Ventus 2X', 200, 242, 2, 2, false),
    gpu('rtx4070-asus-dual', N40, 'ASUS Dual RTX 4070', 200, 267, 2.5, 2, false),
    gpu('rtx4070s-asus-tuf', N40, 'ASUS TUF RTX 4070 SUPER', 220, 301, 2.7, 3, true),
    gpu('rtx4070s-gigabyte-gaming-oc', N40, 'Gigabyte RTX 4070 SUPER Gaming OC', 220, 300, 2.5, 3, true),
    gpu('rtx4070ti-asus-tuf', N40, 'ASUS TUF RTX 4070 Ti', 285, 305, 3.25, 3, true),
    gpu('rtx4070ti-msi-gaming-x-trio', N40, 'MSI RTX 4070 Ti Gaming X Trio', 285, 337, 3, 3, true),
    gpu('rtx4070ti-zotac-trinity', N40, 'Zotac RTX 4070 Ti Trinity', 285, 307, 3, 3, true),
    gpu('rtx4080-asus-tuf', N40, 'ASUS TUF RTX 4080', 320, 348, 3.65, 3, true),
    gpu('rtx4080-msi-suprim', N40, 'MSI RTX 4080 Suprim X', 320, 336, 3.8, 3, true),
    gpu('rtx4080-aorus-master', N40, 'Gigabyte Aorus RTX 4080 Master', 320, 358, 4, 3, true),
    gpu('rtx4080s-msi-ventus', N40, 'MSI RTX 4080 SUPER Ventus 3X', 320, 322, 3, 3, true),
    gpu('rtx4090-msi-gaming-x-trio', N40, 'MSI RTX 4090 Gaming X Trio', 450, 337, 3.5, 3, true),
    gpu('rtx4090-aorus-master', N40, 'Gigabyte Aorus RTX 4090 Master', 450, 358, 4, 3, true),
    gpu('rtx4090-pny-verto', N40, 'PNY RTX 4090 Verto', 450, 332, 3.5, 3, true),
    gpu('rtx4090-zotac-amp-airo', N40, 'Zotac RTX 4090 AMP Extreme AIRO', 450, 356, 3.5, 3, true),

    gpu('rtx5050-msi-ventus', N50, 'MSI RTX 5050 Ventus 2X', 130, 197, 2, 2, false),
    gpu('rtx5060-asus-dual', N50, 'ASUS Dual RTX 5060', 145, 229, 2.5, 2, false),
    gpu('rtx5060ti-msi-ventus', N50, 'MSI RTX 5060 Ti Ventus 2X', 180, 197, 2, 2, false),
    gpu('rtx5060ti-asus-prime', N50, 'ASUS Prime RTX 5060 Ti', 180, 268, 2.5, 3, false),
    gpu('rtx5070-asus-prime', N50, 'ASUS Prime RTX 5070', 250, 304, 2.5, 3, true),
    gpu('rtx5070-asus-tuf', N50, 'ASUS TUF RTX 5070', 250, 312, 3.1, 3, true),
    gpu('rtx5070-msi-ventus', N50, 'MSI RTX 5070 Ventus 2X', 250, 230, 2, 2, false),
    gpu('rtx5070ti-msi-gaming-trio', N50, 'MSI RTX 5070 Ti Gaming Trio OC', 300, 338, 3, 3, true),
    gpu('rtx5070ti-gigabyte-gaming-oc', N50, 'Gigabyte RTX 5070 Ti Gaming OC', 300, 340, 3.5, 3, true),
    gpu('rtx5070ti-zotac-solid', N50, 'Zotac RTX 5070 Ti Solid', 300, 329, 3, 3, true),
    gpu('rtx5080-gigabyte-gaming-oc', N50, 'Gigabyte RTX 5080 Gaming OC', 360, 340, 3.7, 3, true),
    gpu('rtx5080-msi-ventus', N50, 'MSI RTX 5080 Ventus 3X', 360, 303, 2.5, 3, true),
    gpu('rtx5080-msi-suprim', N50, 'MSI RTX 5080 Suprim', 360, 359, 3.8, 3, true),
    gpu('rtx5090-pny-argb', N50, 'PNY RTX 5090 ARGB OC', 575, 330, 3.5, 3, true),
    gpu('rtx5090-palit-gamerock', N50, 'Palit RTX 5090 GameRock', 575, 332, 3.5, 3, true),
    gpu('rtx5090-gigabyte-windforce', N50, 'Gigabyte RTX 5090 Windforce OC', 575, 342, 3.7, 3, true),
  ];

  C.GPUS.push(...GPUS_RTX.filter((g) => !C.GPUS.some((x) => x.id === g.id)));

  if (typeof module === 'object' && module.exports) module.exports = AF;
})(typeof window !== 'undefined' ? window : globalThis);
