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

**Priority key (out of 10).** 9-10 = blocks a quantitative claim until measured; 5-7 = important for
realism; 2-4 = refinement once the essentials are done. Higher = do sooner.

---

## 1. Flux Balance Analysis — `FBA_CALIB` (Approach 5, Prong 1 & 2)

The FBA solves `max cᵀv s.t. S·v = 0, lb ≤ v ≤ ub`. The exchange-reaction bounds are the physical
link to the lab: **the wet lab measures the bounds, the dry lab predicts the routing.**

| Param | Symbol | What it is | Experiment & protocol | Pri |
|---|---|---|---|---|
| `vGlcMax` | `ub(EX_glc)` | Max glucose uptake [mmol·gDCW⁻¹·h⁻¹] — the LP feed | Batch/fed-batch bioreactor: sample broth glucose (YSI/HPLC) and biomass (OD600 → DCW via a dry-weight calibration) over time. `q_glc = (1/X)·d[Glc]/dt` in exponential phase = the slope. | 9 |
| `vO2Max` | `ub(EX_o2)` | Max O₂ uptake (aerobiosis ceiling) | Respirometry / off-gas O₂ mass balance at known DCW; or DO-stat. | 6 |
| `atpMaintenance` | NGAM | Non-growth ATP burn [mmol·gDCW⁻¹·h⁻¹] | Chemostat at ≥3 dilution rates; plot `q_ATP` vs µ; intercept = NGAM. | 3 |
| `fluxToConc` | — | Converts FBA precursor flux `v_glu` → ODE intracellular `[S]` [mM]. Lumps biomass density × residence time | Quench + extract cells; LC-MS for intracellular L-glutamate pool; regress measured `[S]` against the measured precursor flux. | 9 |

**Knockout validation (no constant, but a key prediction to test):** the FBA predicts that deleting
overflow (`pta`/`ackA`) reroutes carbon toward γ-PGA. Confirm by building the knockout strain and
comparing acetate excretion and PGA yield to wild type.

---

## 2. γ-PGA Cross-Linking — `CROSSLINK_CALIB` (Approach 2, Prong 1)

`θ = [Ca²⁺]/(Kd+[Ca²⁺])` → `ν = ρ·θ·(1−2Mx/Mn)` → `G = νRT`.

| Param | What it is | Experiment & protocol | Pri |
|---|---|---|---|
| `KdPGA` | Ca²⁺ dissociation constant to γ-PGA carboxylates [mM] | **Isothermal titration calorimetry (ITC):** titrate CaCl₂ into γ-PGA solution; fit binding isotherm → Kd. Cheaper alt: Ca²⁺ ion-selective electrode (ISE) titration. Also sets the γ-PGA affinity in the competitive-Ca²⁺ model. | 7 |
| `yieldToRho` | Maps broth γ-PGA yield [g/L] → in-pore network density ρ [kg/m³] | Treat a known sand volume with broth of measured yield; rinse, dry, and gravimetrically determine retained polymer mass per volume. | 6 |
| `rhoCap` | Pore-saturation ceiling on ρ | Column tests: increase loading until permeability collapses / no further strength gain. | 3 |
| `Mx`, `Mn` | Molar mass between cross-links / number-average MW | GPC-MALS of the secreted γ-PGA; Mx inferred from swelling or rheology fits. (Currently UI inputs.) | 3 |

---

## 3. Aeolian Erosion — `AEOLIAN_CALIB` (Approach 3, all prongs)

Bagnold threshold `u*t = A·√[(ρs−ρa)/ρa·g·d + γ/(ρa·d)]` and saltation flux
`q = C·(ρa/g)·u*³·(1 − u*t²/u*²)`. **This is where the wind tunnel earns its keep.**

| Param | What it is | Experiment & protocol | Pri |
|---|---|---|---|
| `A` | Bagnold threshold parameter | Wind tunnel on **untreated** sieved sand: ramp wind, record u*t (first sustained grain motion, via high-speed video or saltation sensor) vs grain size d; fit Eq 7 → A. Cross-check: treated field crust survives ~30 m/s (Research Table Study 3). | 6 |
| `uStarRatio` | u* : U∞ coupling (roughness) | Measure vertical velocity profile (pitot rake / hot-wire) in the tunnel; fit log-law `u(z)=(u*/κ)ln(z/z₀)` → u*. | 6 |
| `saltationC` | Saltation mass-flux coefficient | Sand-trap (Bagnold catcher) downwind; mass flux vs u*³ slope = `C·ρa/g`. | 3 |
| `cohesionPerG` | γ-PGA shear modulus G [Pa] → cohesion γ [N/m] | Pair a rheometer/DMA modulus of the crust with a cohesion measurement (micro-penetrometer or torsional shear) on the **same** treated coupons; slope = cohesionPerG. | 9 |
| `cohesionPerUCS` | CaCO₃ UCS [kPa] → cohesion γ [N/m] | Pair UCS (§5) with the cohesion intercept `c` from a direct-shear box on cemented cores; slope = cohesionPerUCS. | 9 |
| `shatterPerThickness` | Wind stress a unit-thickness crust resists before brittle failure | Modulus-of-rupture (3-point bend) on crust coupons of varying thickness. | 3 |

> The two `cohesionPer*` bridges are the single most important calibrations: they convert *every*
> prong's strength into the wind-resistance the project ultimately claims.

---

## 4. CaCO₃ Precipitation & Biocement Strength — `CACO3_CALIB` (§6, Prong 2) — **NEW**

Geochemistry (Lassin et al. 2018): speciation → `Ω = [Ca²⁺][CO₃²⁻]/Ksp` → ACC → calcite → **UCS**.

| Param | What it is | Experiment & protocol | Pri |
|---|---|---|---|
| `pKspCalcite`, `pKspACC` | Solubility products of calcite / amorphous CaCO₃ | Use literature (calcite 10⁻⁸·⁴⁸); verify the **ionic strength** of actual desert pore water (it shifts activity coefficients). | 3 |
| `pKa1`, `pKa2` | Carbonic-acid dissociation constants | Literature; **temperature-correct** to desert surface T (van 't Hoff). | 3 |
| `caRateEnhancement` | Fold rate increase of CO₂ hydration by displayed Carbonic Anhydrase | **pNPA esterase assay** (ΔA₄₀₅ vs blank) OR DIY **phenol-red pH-drop** assay on washed whole cells bubbled with CO₂ (red→yellow rate). Compare displayed-CA cells vs empty-vector control; the activity ratio sets the realized enhancement fraction fed to `caActivityFraction()`. | 9 |
| `kPrecip` | TST surface precipitation rate, `r = kPrecip·(Ω−1)` | Stirred-cell: mix Ca²⁺ + carbonate at known supersaturation, track [Ca²⁺] depletion (ISE) vs time; fit rate vs (Ω−1). | 6 |
| `kAccToCalcite` | ACC → calcite ripening rate [h⁻¹] | Time-resolved **XRD or Raman**: fraction of crystalline calcite vs amorphous over time; fit first-order k. Note UAE field MICP often yields **vaterite**, not just calcite (Research Table); consider a vaterite pKsp/ripening branch. | 6 |
| `kUcs`, `nUcs` | **UCS = kUcs·(calcite wt%)^nUcs** [kPa] | **Unconfined Compression Test** (ASTM D2166-style) on cemented sand cores made at several calcite contents; measure calcite wt% by **acid digestion / TGA**; log-log regress UCS vs calcite% → slope `nUcs`, intercept `kUcs`. Field anchor: 0.57% CaCO₃ → 12.5 mm crust, ~460 kPa bearing (Study 3). | 9 |

**Anchoring decision support (Prong 2):** the dry-lab `CaAnchoringModule` compares Sortase-mediated
vs LytE-CWBD binding-motif display. Feed it real numbers from the proof-of-concept assays the wet
lab already planned: GFP-on-PDL/PLL bead retention (sortase functionality), pNPA dimerization
assay (CA activity), and the periplasmic-fractionation signal-peptide test.

---

## 5. Sodium Alginate — `ALGINATE_CALIB` (Prong 3) — **NEW**

Egg-box gel: `ν = ρ·θ·F_G·(1−2Mx/Mn)`, `G = νRT`, plus moisture & washout.

| Param | What it is | Experiment & protocol | Pri |
|---|---|---|---|
| `guluronateFraction` | F_G — fraction of guluronate blocks (sets junction density) | From supplier certificate of analysis, or measure by **¹H-NMR block analysis** of the lot used. | 6 |
| `KdCa` | Ca²⁺ dissociation constant to alginate G-blocks [mM] | Ca²⁺-ISE titration of the alginate solution. Also sets the alginate affinity in the competitive-Ca²⁺ model. | 4 |
| `concToRho` | Applied %w/v → retained network density [kg/m³] | Gravimetric: retained alginate mass per treated sand volume vs applied concentration. | 3 |
| `waterHoldingCapacity` | g water held per g alginate | Equilibrate alginate-treated sand at controlled RH (saturated-salt chambers); gravimetric water uptake. Field anchor: alginate beads retain ~55% water (Study 2). | 3 |
| `washoutRatePerCycle` | Fractional alginate loss per rain/wet cycle | **Rainfall simulation:** subject treated coupons to repeated wetting; measure residual alginate (or residual strength) vs cycle number; fit `(1−k)^n`. | 6 |

---

## 6. Composite Combination — `COMPOSITE_CALIB` + resilience priors (≥2 prongs) — **NEW**

`γ_total = Σ γᵢ + Σ η_ij·√(γᵢγⱼ)`.

| Param | What it is | Experiment & protocol | Pri |
|---|---|---|---|
| `eta_PGA_CaCO3` | Synergy of γ-PGA + CaCO₃ (PGA templates/toughens calcite) | Make 1-only, 2-only, and 1+2 cores; direct-shear or UCS each; `η = (S₁₊₂ − S₁ − S₂)/√(S₁S₂)`. | 6 |
| `eta_PGA_Alginate` | Constructive synergy of γ-PGA + alginate (co-retained moisture; Ca²⁺ competition handled separately) | Same paired protocol for 1-only, 3-only, 1+3, with Ca²⁺ dosed to excess to isolate the synergy from competition. | 6 |
| `eta_CaCO3_Alginate` | Interaction of CaCO₃ + alginate | Same paired protocol for 2-only, 3-only, 2+3. | 6 |

**Resilience priors** (in `src/lib/physics/composite.ts`, `PRONG_RESILIENCE`): the per-scenario
0–1 scores driving the robustness radar are currently heuristic, taken from the wet-lab honesty
notes. Refine each with a targeted stress assay and re-score:

- **Flood / Rain** → rainfall-simulation residual strength (distinguishes soluble P1/P3 from insoluble P2).
- **Bacterial Death** → kill the culture (heat/antibiotic), then test residual crust strength (P2 cement and P3 alginate should persist; P1 should not).
- **Drought / Heat** → bake coupons at desert surface T, retest strength + moisture.
- **High Wind** → wind-tunnel survival time (links to §3).
- **Long-term Durability** → accelerated weathering cycles.

---

## 7. Inter-Prong Interactions — `INTERACTION_CALIB` (≥2 prongs)

The composite total already reflects two antagonistic mechanisms applied **before** the synergy
term. Shared-Ca²⁺ competition is now a **competitive Langmuir partition** of one soil calcium pool
(`interactions.ts`): free Ca²⁺ solves `S = c_f + Σ B_p·c_f/(K_d,p+c_f)`, and each prong keeps
`φ_Ca,p = θ_p(shared)/θ_p(alone)` of its binding. Because affinities differ, the hit is uneven —
the high-affinity calcite sink out-competes the reversible polymer binders.

| Param | What it is | Experiment & protocol | Pri |
|---|---|---|---|
| `caSupplyCapacity` | Shared plant-available + dosed Ca²⁺ pool [mM total] | Titrate available Ca²⁺ in treated deployment-site soil (Ca²⁺-ISE); include the dosed CaCl₂. | 6 |
| `caDemandPGA/CaCO3/Alginate` | Per-prong Ca²⁺ binding-site capacity `B_p` [mM sites] | Ca²⁺-ISE: Ca bound per gram of each binder; for calcite, Ca consumed per unit calcite formed. | 6 |
| `KdCalcite` | Effective Ca²⁺ affinity of the (irreversible) calcite sink [mM] | Not directly titratable — set far below the polymer `KdPGA`/`KdCa` so calcite wins the partition; sensitivity-check only. | 4 |
| `coexpressionBurden` | Fraction of single-strain titre retained when γ-PGA synthase **and** CA are co-expressed | Compare γ-PGA and CA titres in single-function vs dual-function strains (CTAB / WA assays); ratio = β. | 6 |

**Validation:** make 1+2, 1+3, 2+3, and 1+2+3 cores at fixed total Ca²⁺; the model predicts γ-PGA
loses the most cohesion and calcite the least. Dosing excess CaCl₂ should relax the competition.

---

## 8. Grain-Size Coverage — `GRAINSIZE_CALIB` (all prongs)

No single binder grips every grain size. MICP cements a fine-medium sweet spot; γ-PGA and alginate
close the coarse and fine gaps. Coverage is integrated over the site grain-size distribution, so the
**deployment-site PSD is itself a calibration input.**

| Param | What it is | Experiment & protocol | Pri |
|---|---|---|---|
| `uaeD50`, `uaeSizeSigma` | Deployment-site grain-size distribution (median + spread) | **Sieve stack or laser-diffraction PSD** of the actual site sand; read D₅₀ and `σg = √(D84/D16)`. | 7 |
| `micpPeakDiameter`, `micpLogWidth` | MICP UCS-vs-grain-size sweet spot + width | UCS of MICP cores sieved to narrow bands (e.g. 63/125/250/500 µm); locate the peak and fit the fall-off. Anchor: SP0063/SP0125 ≈ 3.1/2.9 MPa, SP0250 ≈ 1.6, SP0500 ≈ 0.7 (Study 4). | 6 |
| `micpPenetrationD50`, `micpPenetrationSteep` | Fine-side limit where cells cannot colonise low-permeability sand | Colonisation depth / CFU-with-depth vs grain size on sieved packs; fit the fine-side UCS drop. | 4 |
| `pgaCoverHalfD`, `pgaCoverSteep` | Grain size above which γ-PGA gel stops bridging pores | Wet-sieve aggregate stability of γ-PGA-only bands across the size range. | 4 |
| `alginateCoverFloor`, `alginateCoarseBoost`, `alginateCoarseHalfD` | Alginate broad-spectrum coating + coarse-pore filling | Cohesion of alginate-only bands across the full size range; note the coarse-end gain. | 4 |

---

## Suggested experimental order (maximize dry-lab value early)

1. **DCW calibration + glucose uptake** (`vGlcMax`) — unlocks quantitative FBA.
2. **CA activity assay** (`caRateEnhancement`) — unlocks Prong 2 precipitation realism + the anchoring decision.
3. **UCS vs calcite%** (`kUcs`, `nUcs`) — the headline biocement strength curve.
4. **Cohesion bridges** (`cohesionPerG`, `cohesionPerUCS`) — connect all strengths to wind resistance.
5. **Wind-tunnel A + profile** (`A`, `uStarRatio`) — anchor the macro erosion claim.
6. **Site grain-size distribution** (`uaeD50`, `uaeSizeSigma`) + **MICP band UCS** (`micpPeakDiameter`) — ground the grain-size coverage story in the real deployment sand.
7. **Paired combination cores** (`η_ij`, `coexpressionBurden`) — validate the composite synergy + competition story.

*Maintained automatically as new `CALIBRATION` constants are added to the physics core.*
