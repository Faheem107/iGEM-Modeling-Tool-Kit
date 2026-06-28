# WETLAB_TODO — Calibrating the Dry-Lab Models

This document is the bridge between the dry-lab simulation toolkit and the NYUAD iGEM 2026 wet
lab. Every model in `src/lib/physics/` is built on real equations, but several constants are
**placeholders** that must be replaced with values measured in our own lab to make the predictions
quantitative rather than illustrative.

**How the code is organized.** All calibratable constants live in one place —
[`src/lib/physics/constants.ts`](src/lib/physics/constants.ts) — as `Calib` objects:

```ts
KdPGA: calib(4.0, 'mol·m⁻³ (mM)', '<source>', '<wet-lab experiment>', [1, 15])
//            value   units          literature anchor   how to measure        slider range
```

To update a parameter after an experiment: change the first argument (`value`) and, if useful,
tighten the `range`. Nothing else in the codebase needs to change — every model reads from here.

**Priority key:** 🔴 blocks quantitative claims · 🟠 important for realism · 🟢 refinement.

---

## 1. Flux Balance Analysis — `FBA_CALIB` (Approach 5, Prong 1 & 2)

The FBA solves `max cᵀv s.t. S·v = 0, lb ≤ v ≤ ub`. The exchange-reaction bounds are the physical
link to the lab: **the wet lab measures the bounds, the dry lab predicts the routing.**

| Param | Symbol | What it is | Experiment & protocol | Pri |
|---|---|---|---|---|
| `vGlcMax` | `ub(EX_glc)` | Max glucose uptake [mmol·gDCW⁻¹·h⁻¹] — the LP feed | Batch/fed-batch bioreactor: sample broth glucose (YSI/HPLC) and biomass (OD600 → DCW via a dry-weight calibration) over time. `q_glc = (1/X)·d[Glc]/dt` in exponential phase = the slope. | 🔴 |
| `vO2Max` | `ub(EX_o2)` | Max O₂ uptake (aerobiosis ceiling) | Respirometry / off-gas O₂ mass balance at known DCW; or DO-stat. | 🟠 |
| `atpMaintenance` | NGAM | Non-growth ATP burn [mmol·gDCW⁻¹·h⁻¹] | Chemostat at ≥3 dilution rates; plot `q_ATP` vs µ; intercept = NGAM. | 🟢 |
| `fluxToConc` | — | Converts FBA precursor flux `v_glu` → ODE intracellular `[S]` [mM]. Lumps biomass density × residence time | Quench + extract cells; LC-MS for intracellular L-glutamate pool; regress measured `[S]` against the measured precursor flux. | 🔴 |

**Knockout validation (no constant, but a key prediction to test):** the FBA predicts that deleting
overflow (`pta`/`ackA`) reroutes carbon toward γ-PGA. Confirm by building the knockout strain and
comparing acetate excretion and PGA yield to wild type.

---

## 2. γ-PGA Cross-Linking — `CROSSLINK_CALIB` (Approach 2, Prong 1)

`θ = [Ca²⁺]/(Kd+[Ca²⁺])` → `ν = ρ·θ·(1−2Mx/Mn)` → `G = νRT`.

| Param | What it is | Experiment & protocol | Pri |
|---|---|---|---|
| `KdPGA` | Ca²⁺ dissociation constant to γ-PGA carboxylates [mM] | **Isothermal titration calorimetry (ITC):** titrate CaCl₂ into γ-PGA solution; fit binding isotherm → Kd. Cheaper alt: Ca²⁺ ion-selective electrode (ISE) titration. | 🟠 |
| `yieldToRho` | Maps broth γ-PGA yield [g/L] → in-pore network density ρ [kg/m³] | Treat a known sand volume with broth of measured yield; rinse, dry, and gravimetrically determine retained polymer mass per volume. | 🟠 |
| `rhoCap` | Pore-saturation ceiling on ρ | Column tests: increase loading until permeability collapses / no further strength gain. | 🟢 |
| `Mx`, `Mn` | Molar mass between cross-links / number-average MW | GPC-MALS of the secreted γ-PGA; Mx inferred from swelling or rheology fits. (Currently UI inputs.) | 🟢 |

---

## 3. Aeolian Erosion — `AEOLIAN_CALIB` (Approach 3, all prongs)

Bagnold threshold `u*t = A·√[(ρs−ρa)/ρa·g·d + γ/(ρa·d)]` and saltation flux
`q = C·(ρa/g)·u*³·(1 − u*t²/u*²)`. **This is where the wind tunnel earns its keep.**

| Param | What it is | Experiment & protocol | Pri |
|---|---|---|---|
| `A` | Bagnold threshold parameter | Wind tunnel on **untreated** sieved sand: ramp wind, record u*t (first sustained grain motion, via high-speed video or saltation sensor) vs grain size d; fit Eq 7 → A. | 🟠 |
| `uStarRatio` | u* : U∞ coupling (roughness) | Measure vertical velocity profile (pitot rake / hot-wire) in the tunnel; fit log-law `u(z)=(u*/κ)ln(z/z₀)` → u*. | 🟠 |
| `saltationC` | Saltation mass-flux coefficient | Sand-trap (Bagnold catcher) downwind; mass flux vs u*³ slope = `C·ρa/g`. | 🟢 |
| `cohesionPerG` | γ-PGA shear modulus G [Pa] → cohesion γ [N/m] | Pair a rheometer/DMA modulus of the crust with a cohesion measurement (micro-penetrometer or torsional shear) on the **same** treated coupons; slope = cohesionPerG. | 🔴 |
| `cohesionPerUCS` | CaCO₃ UCS [kPa] → cohesion γ [N/m] | Pair UCS (§5) with the cohesion intercept `c` from a direct-shear box on cemented cores; slope = cohesionPerUCS. | 🔴 |
| `shatterPerThickness` | Wind stress a unit-thickness crust resists before brittle failure | Modulus-of-rupture (3-point bend) on crust coupons of varying thickness. | 🟢 |

> The two `cohesionPer*` bridges are the single most important calibrations: they convert *every*
> prong's strength into the wind-resistance the project ultimately claims.

---

## 4. CaCO₃ Precipitation & Biocement Strength — `CACO3_CALIB` (§6, Prong 2) — **NEW**

Geochemistry (Lassin et al. 2018): speciation → `Ω = [Ca²⁺][CO₃²⁻]/Ksp` → ACC → calcite → **UCS**.

| Param | What it is | Experiment & protocol | Pri |
|---|---|---|---|
| `pKspCalcite`, `pKspACC` | Solubility products of calcite / amorphous CaCO₃ | Use literature (calcite 10⁻⁸·⁴⁸); verify the **ionic strength** of actual desert pore water (it shifts activity coefficients). | 🟢 |
| `pKa1`, `pKa2` | Carbonic-acid dissociation constants | Literature; **temperature-correct** to desert surface T (van 't Hoff). | 🟢 |
| `caRateEnhancement` | Fold rate increase of CO₂ hydration by displayed Carbonic Anhydrase | **pNPA esterase assay** (ΔA₄₀₅ vs blank) OR DIY **phenol-red pH-drop** assay on washed whole cells bubbled with CO₂ (red→yellow rate). Compare displayed-CA cells vs empty-vector control; the activity ratio sets the realized enhancement fraction fed to `caActivityFraction()`. | 🔴 |
| `kPrecip` | TST surface precipitation rate, `r = kPrecip·(Ω−1)` | Stirred-cell: mix Ca²⁺ + carbonate at known supersaturation, track [Ca²⁺] depletion (ISE) vs time; fit rate vs (Ω−1). | 🟠 |
| `kAccToCalcite` | ACC → calcite ripening rate [h⁻¹] | Time-resolved **XRD or Raman**: fraction of crystalline calcite vs amorphous over time; fit first-order k. | 🟠 |
| `kUcs`, `nUcs` | **UCS = kUcs·(calcite wt%)^nUcs** [kPa] | **Unconfined Compression Test** (ASTM D2166-style) on cemented sand cores made at several calcite contents; measure calcite wt% by **acid digestion / TGA**; log-log regress UCS vs calcite% → slope `nUcs`, intercept `kUcs`. | 🔴 |

**Anchoring decision support (Prong 2):** the dry-lab `CaAnchoringModule` compares Sortase-mediated
vs LytE-CWBD binding-motif display. Feed it real numbers from the proof-of-concept assays the wet
lab already planned: GFP-on-PDL/PLL bead retention (sortase functionality), pNPA dimerization
assay (CA activity), and the periplasmic-fractionation signal-peptide test.

---

## 5. Sodium Alginate — `ALGINATE_CALIB` (Prong 3) — **NEW**

Egg-box gel: `ν = ρ·θ·F_G·(1−2Mx/Mn)`, `G = νRT`, plus moisture & washout.

| Param | What it is | Experiment & protocol | Pri |
|---|---|---|---|
| `guluronateFraction` | F_G — fraction of guluronate blocks (sets junction density) | From supplier certificate of analysis, or measure by **¹H-NMR block analysis** of the lot used. | 🟠 |
| `KdCa` | Ca²⁺ dissociation constant to alginate G-blocks [mM] | Ca²⁺-ISE titration of the alginate solution. | 🟢 |
| `concToRho` | Applied %w/v → retained network density [kg/m³] | Gravimetric: retained alginate mass per treated sand volume vs applied concentration. | 🟢 |
| `waterHoldingCapacity` | g water held per g alginate | Equilibrate alginate-treated sand at controlled RH (saturated-salt chambers); gravimetric water uptake. | 🟢 |
| `washoutRatePerCycle` | Fractional alginate loss per rain/wet cycle | **Rainfall simulation:** subject treated coupons to repeated wetting; measure residual alginate (or residual strength) vs cycle number; fit `(1−k)^n`. | 🟠 |

---

## 6. Composite Combination — `COMPOSITE_CALIB` + resilience priors (≥2 prongs) — **NEW**

`γ_total = Σ γᵢ + Σ η_ij·√(γᵢγⱼ)`.

| Param | What it is | Experiment & protocol | Pri |
|---|---|---|---|
| `eta_PGA_CaCO3` | Synergy of γ-PGA + CaCO₃ (PGA templates/toughens calcite) | Make 1-only, 2-only, and 1+2 cores; direct-shear or UCS each; `η = (S₁₊₂ − S₁ − S₂)/√(S₁S₂)`. | 🟠 |
| `eta_PGA_Alginate` | Interaction of γ-PGA + alginate (shared Ca²⁺ competition) | Same paired protocol for 1-only, 3-only, 1+3. | 🟠 |
| `eta_CaCO3_Alginate` | Interaction of CaCO₃ + alginate | Same paired protocol for 2-only, 3-only, 2+3. | 🟠 |

**Resilience priors** (in `src/lib/physics/composite.ts`, `PRONG_RESILIENCE`): the per-scenario
0–1 scores driving the robustness radar are currently heuristic, taken from the wet-lab honesty
notes. Refine each with a targeted stress assay and re-score:

- **Flood / Rain** → rainfall-simulation residual strength (distinguishes soluble P1/P3 from insoluble P2).
- **Bacterial Death** → kill the culture (heat/antibiotic), then test residual crust strength (P2 cement and P3 alginate should persist; P1 should not).
- **Drought / Heat** → bake coupons at desert surface T, retest strength + moisture.
- **High Wind** → wind-tunnel survival time (links to §3).
- **Long-term Durability** → accelerated weathering cycles.

---

## Suggested experimental order (maximize dry-lab value early)

1. **DCW calibration + glucose uptake** (`vGlcMax`) — unlocks quantitative FBA.
2. **CA activity assay** (`caRateEnhancement`) — unlocks Prong 2 precipitation realism + the anchoring decision.
3. **UCS vs calcite%** (`kUcs`, `nUcs`) — the headline biocement strength curve.
4. **Cohesion bridges** (`cohesionPerG`, `cohesionPerUCS`) — connect all strengths to wind resistance.
5. **Wind-tunnel A + profile** (`A`, `uStarRatio`) — anchor the macro erosion claim.
6. **Paired combination cores** (`η_ij`) — validate the composite synergy story.

*Maintained automatically as new `CALIBRATION` constants are added to the physics core.*
