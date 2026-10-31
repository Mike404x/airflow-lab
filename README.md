# Airflow Lab

Configurable PC case airflow simulator. Build a case, place fans, pick a CPU/GPU and its cooler, and check the pressure, the flow of every fan, the air paths, dead zones and component temperatures.

## Run

- **Quickest:** open `index.html` in a browser (no build step, no dependencies).
- **As a local website:** `npm start`, then open http://localhost:8080. Set `PORT=3000` to use another port.
- **Tests:** `npm test`

## Publish as a website (GitHub Pages)

The site is fully static, so any static host works. The repo is set up for **GitHub Pages**. The workflow in `.github/workflows/deploy.yml` runs the test suite on every push, and if it passes, publishes `index.html`, `favicon.svg`, `css/`, `js/` and `vendor/`.

1. Create a free account at https://github.com and a new **empty** repository (for example `airflow-lab`, with no README).
2. In this folder:
   ```
   git branch -M main
   git remote add origin https://github.com/<your-user>/airflow-lab.git
   git push -u origin main
   ```
3. On GitHub, open the repository's **Settings → Pages** and set **Source** to **GitHub Actions**.
4. Open the **Actions** tab. When "Test and deploy to GitHub Pages" turns green, the site is live at `https://<your-user>.github.io/airflow-lab/`.

Every later `git push` redeploys automatically. A failing test blocks the deploy.

**Alternatives:**
- **Netlify:** drag this folder onto https://app.netlify.com/drop for an instant URL.
- **Cloudflare Pages:** connect the GitHub repo, with no build command and `/` as the output directory.

Builds are saved per visitor in their browser's local storage; nothing is sent to a server.

## 3D view

The **2D / 3D** switch above the simulation turns the view into an interactive 3D model built from the same geometry. It shows the case panels, the glass side panel, the motherboard with RAM and slots, the CPU cooler (fin stacks, fans, AIO pump, tubes and radiators), the graphics card, the PSU shroud, and every case fan and extra fan with spinning blades and flow arrows. It also shows the live CFD heat map as a slice through the case and the airflow particles as streaks.

- Drag to orbit, scroll to zoom, right-drag to pan.
- **Click any part to make it transparent**, and click it again to make it solid. Clicks pass through see-through panels such as glass and mesh.
- The **render options** button (layers icon) toggles each layer, makes everything solid again, and resets the camera.

The 3D view uses three.js r147 (MIT license), vendored in `vendor/three/` so the app still works offline straight from disk. The CFD is still the 2D side-view simulation; the 3D view displays it, it does not add a third dimension to the physics.

## Component catalog

Pick real parts instead of typing dimensions. Every picker has a search box, and the raw numbers stay editable under "details".

- **Cases** (157, from 2015 onward): Corsair, Lian Li, Fractal Design, NZXT, Phanteks, be quiet!, Cooler Master, Montech, DeepCool, Thermaltake, Antec, HYTE, ASUS, MSI, Gigabyte, Zalman, Jonsbo and SilverStone. This covers mid towers, full towers, Micro-ATX, Mini-ITX and dual-chamber cases. Each fills in its dimensions, panel types, fan-size support per panel, max GPU length, max cooler height, motherboard roof clearance and **bundled fans**. Cases with a vented top or rear but no fan mounts (Torrent) have a passive grille.
- **Motherboards** (94): AM5, AM4, LGA1700 and LGA1851 boards from ASUS, MSI, Gigabyte and ASRock, in ATX, E-ATX, mATX and ITX. Each sets its socket, size and slot layout. The layout is typical for the form factor; adjust it if your manual differs.
- **CPUs** (34): Ryzen 5000/7000/9000 and Intel 12th–14th gen / Core Ultra 200S, with full-load and gaming power, Tjmax and die resistance.
- **CPU coolers** (94): Air coolers from Noctua, Thermalright, DeepCool, be quiet!, Arctic, Scythe, Cooler Master, Corsair, NZXT and ID-COOLING, plus low-profile and stock coolers. AIOs from 120 to 420 mm: Arctic Liquid Freezer II/III, NZXT Kraken X/Elite, Corsair H60 to H170i, Lian Li Galahad, DeepCool, EK, be quiet!, Cooler Master and ASUS ROG. Choosing one sets its height, fin stack, bundled fans and relative performance. AIOs mount their radiator with their bundled fans.
- **GPUs** (96): RTX 30/40/50 (Founders Edition and partner cards), Radeon RX 6000/7000/9000, Intel Arc, and workstation blower cards, with length, slot thickness, board power, fan count and flow-through design.
- **Fans** (146): case and cooler fans from spec sheets. Entries marked ≈ (fans, cases, GPUs) use approximate specs from memory of manufacturer listings and should be checked against the product page.
- **Checks**: CPU vs motherboard socket, GPU length vs the case limit (minus a front radiator), cooler height vs the case limit, and fan count vs what each panel supports.
- **Workload**: full load or gaming sets CPU and GPU power from the selected parts.

## What you can configure

- **Case**: height/depth/width, PSU shroud, vented PCIe covers, number of front fan mounts (1–3, limited by case height). The shroud stops short of the front fans, so a bottom front fan feeds the main chamber. Each panel (front, top, rear, bottom, side) has a type (mesh, perforated, glass with side gaps, sealed) and a fan size.
- **Motherboard**: layout presets (ATX with the GPU in slot 1/2/3, ATX with a low socket, E-ATX, Micro-ATX, Mini-ITX), plus editable board size, CPU socket position, slot-1 position and which PCIe slot holds the GPU. This moves the CPU cooler and GPU in both the flow and thermal models. There are checks for board fit, the cooler overhanging the GPU slot, and the cooler hitting the top fans.
- **Fan slots**: click any slot in the view. Set it to intake, exhaust or open vent, and choose the fan model (spec-sheet presets or a custom CFM / mmH₂O / RPM), the speed and the dust filter. Use "Copy to all slots" to fill a whole panel.
- **Fan sizes**: every fan slot's inspector has a size selector (mm) listing the sizes that panel supports. Changing it refits the panel's slots and switches fans to a matching model.
- **Extra fans**: **Add fan** creates a fan you position from a list of mounting spots:
  - under the GPU;
  - the rear **PCIe slot area** below the GPU, as a real intake/exhaust in the pressure network and CFD;
  - in front of the CPU cooler;
  - on the PSU shroud;
  - the middle of the case.

  Spots where the chosen size does not fit (for example 120 mm below a thick GPU) are disabled with the reason. **R** rotates or flips the selected fan and **Delete** removes it.
- **CPU**: processor presets (power, die resistance, Tjmax), stock, low-profile, single-tower, dual-tower or AIO cooler. For tower coolers you can set the fan model, the fan count (push-pull) and the speed. For AIOs you can set the radiator location, size, thickness and push-pull.
- **GPU**: presets, board power, length, slot thickness, and the cooler type (open-air dual/triple flow-through, or blower), with fan count and speed.
- **Environment**: room temperature, other heat (VRM, RAM, SSD), CFM or m³/h, Pa or mmH₂O.
- Export/import builds as JSON. The current build autosaves to localStorage.

## How it is computed

### 1. Flow network (exact for the lumped model)
- Every fan uses a P‑Q curve `ΔP = Pmax·(1 − (Q/Qmax)^1.5)` built from its spec sheet. Speed follows the fan affinity laws (Q ∝ n, P ∝ n²). When pressure exceeds Pmax, a fan passes backflow through a stalled-rotor resistance.
- Losses on each path: panel grill (loss coefficient ζ), dust filter, radiator (`ΔP ∝ v^1.75`, scaled by thickness). Open slots, PCIe vents and panel gaps are orifices (Cd = 0.62).
- The internal case pressure is solved so the mass balance closes (Σ inflow = Σ outflow, residual ~1e‑17). This gives each fan's real operating point, the passive flow through every gap, and whether the case is positive or negative.
- CPU tower/top-down and GPU fans are solved against their own heatsink impedance. A blower GPU is an exhaust in the case network.

### 2. Thermal model
- Component temperature = inlet air + P × (die resistance + paste + heatsink base + convective resistance). The convective resistance scales with heatsink airflow as `(Qref/Q)^0.8`.
- AIO: the coolant temperature is set by the radiator sections in parallel. Each section's UA depends on its own fan flow and its inlet air: room air for intake radiators, case air for exhaust radiators. Heat from intake radiators goes into the case.
- Throttling: if Tjmax or the GPU limit is reached, the power is reduced until the temperature holds at the limit.
- **Well-mixed** column: uniform case air, `ΔT = Q_heat / (ρ·cp·Q_through)` (conservative).

### 3. 2D CFD (side view)
- Incompressible flow on a staggered (MAC) grid (~5 mm cells), solved with a MIC(0)-preconditioned conjugate-gradient pressure solve. Fans are prescribed flux boundaries taken from the network solution, so CFD and network flows match. It includes Boussinesq buoyancy.
- Temperature uses a conservative finite-volume upwind scheme, so the energy balance closes within a few %. Heat is injected in the CPU heatsink, GPU heatsink, radiators and motherboard area.
- The **CFD** column uses the local air temperature at each cooler inlet. This captures GPU exhaust recirculating into the CPU cooler, the hot pocket behind a top-front exhaust, dead zones and similar effects.

## Limitations
- The CFD is 2D, a slice through the side view. It doesn't resolve flow toward or from the side panel or around the motherboard tray. Local temperatures are indicative, so compare configurations rather than trust absolute values to ±1 °C.
- Fan curves are fitted from 2 spec-sheet points (max CFM, max static pressure). Real curves have a stall dip.
- Resistance and heatsink coefficients are typical values, not measurements of a specific product.
