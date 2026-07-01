/**
 * NYUAD iGEM 2026 — Centralized physical & calibration constants
 * ================================================================
 * Single source of truth for every numerical constant used by the dry-lab models.
 *
 * Two tiers:
 *   1. FUNDAMENTAL — exact physical constants (gas constant, gravity, densities, molar masses).
 *   2. CALIBRATION — empirical / model constants that SHOULD be fit to NYUAD wet-lab data.
 *      Every CALIBRATION entry carries a `wetlab` note and is mirrored in /WETLAB_TODO.md.
 *
 * Each CALIBRATION constant is a {@link Calib} object so the UI can render provenance
 * (value, units, source, and the experiment needed) instead of an unexplained magic number.
 */

export interface Calib {
  /** Current best-estimate value used by the models. */
  value: number;
  /** SI / model units. */
  units: string;
  /** Literature anchor or rationale for the placeholder. */
  source: string;
  /** How NYUAD wet-lab should measure / refine this value (see WETLAB_TODO.md). */
  wetlab: string;
  /** Plausible range for sliders / sensitivity sweeps. */
  range?: [number, number];
}

const calib = (
  value: number,
  units: string,
  source: string,
  wetlab: string,
  range?: [number, number],
): Calib => ({ value, units, source, wetlab, range });

// ---------------------------------------------------------------------------
// 1. FUNDAMENTAL CONSTANTS (exact — not calibrated)
// ---------------------------------------------------------------------------
export const PHYS = {
  R: 8.314462618, // J·mol⁻¹·K⁻¹  ideal gas constant
  g: 9.80665, // m·s⁻²        standard gravity
  RHO_AIR: 1.225, // kg·m⁻³     air density (15 °C, sea level)
  RHO_SAND: 2650, // kg·m⁻³     quartz sand grain density
  T_STANDARD: 298.15, // K       25 °C reference
  KELVIN: 273.15,
  AVOGADRO: 6.02214076e23,
} as const;

/** Molar masses [g·mol⁻¹]. */
export const MOLAR_MASS = {
  CaCO3: 100.0869,
  CO2: 44.0095,
  Ca: 40.078,
  CO3: 60.008,
  glutamate: 147.13, // L-glutamate (free acid)
  glutamate_residue: 129.12, // γ-PGA repeat unit (glutamate − H₂O)
} as const;

// ---------------------------------------------------------------------------
// 2. CALIBRATION CONSTANTS  (fit these to wet-lab data — see WETLAB_TODO.md)
// ---------------------------------------------------------------------------

/** Approach 5 — Flux Balance Analysis (central carbon → precursor). */
export const FBA_CALIB = {
  /** Maximum glucose uptake bound; sets the LP feed. */
  vGlcMax: calib(15, 'mmol·gDCW⁻¹·h⁻¹', 'B. subtilis aerobic batch (typical)', 'Measure glucose depletion vs OD600/DCW in a fed bioreactor; slope = uptake rate.', [2, 25]),
  /** Maximum O₂ uptake bound (aerobiosis ceiling). */
  vO2Max: calib(20, 'mmol·gDCW⁻¹·h⁻¹', 'aerobic respiration cap', 'Off-gas O₂ balance (respirometry) at known DCW.', [0, 40]),
  /** Non-growth-associated maintenance ATP. */
  atpMaintenance: calib(1.0, 'mmol·gDCW⁻¹·h⁻¹', 'B. subtilis NGAM estimate', 'Chemostat at several dilution rates; intercept of qATP vs µ.', [0.2, 4]),
  /**
   * Converts steady-state FBA precursor flux v_glu [mmol·gDCW⁻¹·h⁻¹] into the ODE's
   * intracellular precursor concentration [S] [mM]. Lumps biomass density (gDCW·L⁻¹)
   * and an effective residence/accumulation time.
   *   [S] ≈ fluxToConc · v_glu
   */
  fluxToConc: calib(0.18, 'mM·(mmol·gDCW⁻¹·h⁻¹)⁻¹', 'lumped gDCW density × τ', 'Pair intracellular L-glutamate LC-MS pools with measured uptake flux; regress [S] on v_glu.', [0.02, 0.6]),
} as const;

/** Approach 2 — γ-PGA / alginate ionic cross-linking (Langmuir → rubber elasticity). */
export const CROSSLINK_CALIB = {
  /** Ca²⁺ binding dissociation constant to γ-PGA carboxylates. */
  KdPGA: calib(4.0, 'mol·m⁻³ (mM)', 'polyelectrolyte–Ca²⁺ affinity (order of magnitude)', 'Isothermal titration calorimetry (ITC) or Ca²⁺-ISE titration of γ-PGA.', [1, 15]),
  /** Maps secreted γ-PGA yield [g/L] → local network mass density ρ_polymer [kg/m³]. */
  yieldToRho: calib(0.04, 'kg·m⁻³ per g·L⁻¹', 'infiltration/packing estimate', 'Gravimetric polymer mass per treated sand volume vs broth yield.', [0.005, 0.12]),
  /** Cap on effective ρ_polymer (saturation of pore space). */
  rhoCap: calib(8.0, 'kg·m⁻³', 'pore-filling saturation', 'Max polymer loading before pore clogging in column tests.', [2, 15]),
} as const;

/** Approach 3 — Aeolian erosion (Bagnold threshold + saltation). */
export const AEOLIAN_CALIB = {
  /** Bagnold empirical threshold parameter A (aerodynamic regime). */
  A: calib(0.11, 'dimensionless', 'Bagnold 1941; Shao & Lu 2000', 'Wind-tunnel threshold u*t vs grain size on UNTREATED sand; fit A.', [0.08, 0.14]),
  /** Friction-to-freestream ratio u* : U∞ (surface roughness dependent). */
  uStarRatio: calib(0.03, 'dimensionless', 'log-law over desert sand roughness', 'Pitot/hot-wire profile in the wind tunnel; u* from log-law fit.', [0.02, 0.06]),
  /** Bagnold saltation mass-flux coefficient C (grain sorting dependent). */
  saltationC: calib(1.8, 'dimensionless', 'Bagnold 1.5 (uniform) – 2.8 (wide)', 'Sand-trap mass flux vs u*³ in wind tunnel; slope = C·ρa/g.', [1.0, 3.0]),
  /** γ-PGA shear modulus G [Pa] → interparticle cohesion γ_biofilm [N/m]. */
  cohesionPerG: calib(2.0e-6, 'N·m⁻¹ per Pa', 'cohesion–stiffness scaling placeholder', 'Pair micro-penetrometer/torsion cohesion with rheometer G on treated crust.', [5e-7, 6e-6]),
  /** CaCO₃ UCS [kPa] → interparticle cohesion γ_cement [N/m]. */
  cohesionPerUCS: calib(1.5e-5, 'N·m⁻¹ per kPa', 'cemented-sand cohesion scaling placeholder', 'Pair UCS with direct-shear cohesion intercept on cemented cores.', [3e-6, 5e-5]),
  /** Wind shear stress a crust of unit thickness can resist before brittle shatter. */
  shatterPerThickness: calib(3.5e-4, 'Pa·Pa⁻¹·mm⁻¹', 'crust flexural failure placeholder', 'Modulus-of-rupture (3-point bend) on crust coupons vs thickness.', [1e-4, 8e-4]),
} as const;

/** §6 — CaCO₃ geochemical precipitation (Lassin et al. 2018) + biocement strength. */
export const CACO3_CALIB = {
  /** Calcite solubility product (25 °C). */
  pKspCalcite: calib(8.48, '−log₁₀(Ksp)', 'calcite 25 °C (Plummer & Busenberg 1982)', 'Use literature value; verify ionic strength of desert pore water.', [8.0, 8.9]),
  /** Amorphous calcium carbonate solubility product (more soluble than calcite). */
  pKspACC: calib(6.4, '−log₁₀(Ksp)', 'ACC (Brečević & Nielsen 1989)', 'Literature; ACC is the kinetic precursor phase.', [6.0, 7.0]),
  /** Carbonic acid pKa1 (CO₂(aq)/HCO₃⁻). */
  pKa1: calib(6.35, '−log₁₀(Ka)', 'H₂CO₃* 25 °C', 'Literature; temperature-correct for desert surface T.', [6.1, 6.6]),
  /** Carbonic acid pKa2 (HCO₃⁻/CO₃²⁻). */
  pKa2: calib(10.33, '−log₁₀(Ka)', 'HCO₃⁻ 25 °C', 'Literature; temperature-correct for desert surface T.', [10.0, 10.6]),
  /** Carbonic-anhydrase rate enhancement over un-catalyzed CO₂ hydration. */
  caRateEnhancement: calib(1.0e6, 'fold', 'CA kcat≈10⁶ s⁻¹ vs kuncat≈0.04 s⁻¹', 'pNPA esterase assay or pH-drop (phenol red) on displayed-CA cells vs blank.', [1e3, 1e7]),
  /** Surface-reaction precipitation rate constant (TST): r = kPrecip·(Ω−1). */
  kPrecip: calib(0.12, 'mol·L⁻¹·h⁻¹ per (Ω−1)', 'TST surface-complexation (Lassin et al. 2018)', 'Fit calcite precipitation rate vs supersaturation Ω in stirred-cell titration.', [0.01, 0.6]),
  /** ACC → calcite first-order transformation rate. */
  kAccToCalcite: calib(0.05, 'h⁻¹', 'ACC ripening (Lassin et al. 2018)', 'Time-resolved XRD/Raman of ACC→calcite fraction; fit first-order k.', [0.005, 0.5]),
  /** UCS power-law prefactor: UCS = kUcs · (calcite_wt%)^nUcs. */
  kUcs: calib(31.6, 'kPa per (wt%)^n', 'MICP UCS≈1 MPa @ ~10 wt% calcite', 'Unconfined compression of cores at several calcite contents; log-log fit → kUcs, nUcs.', [10, 80]),
  /** UCS power-law exponent. */
  nUcs: calib(1.5, 'dimensionless', 'MICP UCS∝calcite^(1–2)', 'Slope of log(UCS) vs log(calcite wt%).', [1.0, 2.2]),
} as const;

/** Prong 3 — Sodium alginate (egg-box gel, moisture, washout). */
export const ALGINATE_CALIB = {
  /** Guluronate (G) fraction — controls Ca²⁺ egg-box junction density. */
  guluronateFraction: calib(0.55, 'fraction', 'commercial alginate F_G≈0.3–0.7', 'Provided by supplier spec or ¹H-NMR block analysis of the lot used.', [0.3, 0.7]),
  /** Ca²⁺ dissociation constant to alginate G-blocks (high affinity). */
  KdCa: calib(1.0, 'mol·m⁻³ (mM)', 'egg-box high Ca²⁺ affinity', 'Ca²⁺-ISE titration of the alginate lot.', [0.3, 3]),
  /** Maps applied alginate concentration [%w/v] → network density ρ [kg/m³]. */
  concToRho: calib(9.0, 'kg·m⁻³ per %w/v', '1 %w/v ≈ 10 kg/m³ minus losses', 'Gravimetric retained alginate per sand volume vs applied %.', [4, 12]),
  /** Water held per unit alginate (hydrogel swelling). */
  waterHoldingCapacity: calib(20, 'g water per g alginate', 'alginate hydrogel swelling', 'Gravimetric water retention vs RH on alginate-treated sand.', [5, 50]),
  /** First-order washout/dissolution rate per simulated wet (rain) cycle. */
  washoutRatePerCycle: calib(0.15, 'fraction·cycle⁻¹', 'soluble polymer leaching estimate', 'Rainfall-simulation: residual alginate vs number of wetting cycles.', [0.03, 0.4]),
} as const;

/** Composite — multi-prong strength combination (rule of mixtures + synergy). */
export const COMPOSITE_CALIB = {
  /** Pairwise synergy/interference η_ij in γ_total = Σγᵢ + Σ η_ij·√(γᵢγⱼ). */
  eta_PGA_CaCO3: calib(0.2, 'dimensionless', 'PGA templates/toughens calcite (synergy)', 'Direct-shear cohesion of 1+2 cores vs sum of singles → η.', [-0.3, 0.6]),
  eta_PGA_Alginate: calib(-0.1, 'dimensionless', 'shared Ca²⁺ → mild competition', 'Cohesion of 1+3 vs sum of singles → η.', [-0.4, 0.3]),
  eta_CaCO3_Alginate: calib(0.1, 'dimensionless', 'alginate retains moisture aiding calcite', 'Cohesion of 2+3 vs sum of singles → η.', [-0.3, 0.4]),
} as const;

/** Convenience: every calibration group, for UI provenance panels and audits. */
export const CALIBRATION = {
  FBA: FBA_CALIB,
  CROSSLINK: CROSSLINK_CALIB,
  AEOLIAN: AEOLIAN_CALIB,
  CACO3: CACO3_CALIB,
  ALGINATE: ALGINATE_CALIB,
  COMPOSITE: COMPOSITE_CALIB,
} as const;

/** Helper: pull just the numeric value of a calibration entry. */
export const cval = (c: Calib): number => c.value;
