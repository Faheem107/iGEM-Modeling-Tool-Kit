/**
 * NYUAD iGEM 2026, Centralized physical & calibration constants
 * ================================================================
 * Single source of truth for every numerical constant used by the dry-lab models.
 *
 * Two tiers:
 *   1. FUNDAMENTAL, exact physical constants (gas constant, gravity, densities, molar masses).
 *   2. CALIBRATION, empirical / model constants that SHOULD be fit to NYUAD wet-lab data.
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
// 1. FUNDAMENTAL CONSTANTS (exact, not calibrated)
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
// 2. CALIBRATION CONSTANTS  (fit these to wet-lab data, see WETLAB_TODO.md)
// ---------------------------------------------------------------------------

/** Approach 5, Flux Balance Analysis (central carbon → precursor). */
export const FBA_CALIB = {
  /** Maximum glucose uptake bound; sets the LP feed. */
  vGlcMax: calib(
    15,
    "mmol·gDCW⁻¹·h⁻¹",
    "B. subtilis aerobic batch (typical)",
    "Measure glucose depletion vs OD600/DCW in a fed bioreactor; slope = uptake rate.",
    [2, 25],
  ),
  /** Maximum O₂ uptake bound (aerobiosis ceiling). */
  vO2Max: calib(
    20,
    "mmol·gDCW⁻¹·h⁻¹",
    "aerobic respiration cap",
    "Off-gas O₂ balance (respirometry) at known DCW.",
    [0, 40],
  ),
  /** Non-growth-associated maintenance ATP. */
  atpMaintenance: calib(
    1.0,
    "mmol·gDCW⁻¹·h⁻¹",
    "B. subtilis NGAM estimate",
    "Chemostat at several dilution rates; intercept of qATP vs µ.",
    [0.2, 4],
  ),
  /**
   * Converts steady-state FBA precursor flux v_glu [mmol·gDCW⁻¹·h⁻¹] into the ODE's
   * intracellular precursor concentration [S] [mM]. Lumps biomass density (gDCW·L⁻¹)
   * and an effective residence/accumulation time.
   *   [S] ≈ fluxToConc · v_glu
   */
  fluxToConc: calib(
    0.18,
    "mM·(mmol·gDCW⁻¹·h⁻¹)⁻¹",
    "lumped gDCW density × τ",
    "Pair intracellular L-glutamate LC-MS pools with measured uptake flux; regress [S] on v_glu.",
    [0.02, 0.6],
  ),
} as const;

/** Approach 2, γ-PGA / alginate ionic cross-linking (Langmuir → rubber elasticity). */
export const CROSSLINK_CALIB = {
  /** Ca²⁺ binding dissociation constant to γ-PGA carboxylates. */
  KdPGA: calib(
    4.0,
    "mol·m⁻³ (mM)",
    "polyelectrolyte–Ca²⁺ affinity (order of magnitude)",
    "Isothermal titration calorimetry (ITC) or Ca²⁺-ISE titration of γ-PGA.",
    [1, 15],
  ),
  /** Maps secreted γ-PGA yield [g/L] → local network mass density ρ_polymer [kg/m³]. */
  yieldToRho: calib(
    0.04,
    "kg·m⁻³ per g·L⁻¹",
    "infiltration/packing estimate",
    "Gravimetric polymer mass per treated sand volume vs broth yield.",
    [0.005, 0.12],
  ),
  /** Cap on effective ρ_polymer (saturation of pore space). */
  rhoCap: calib(
    8.0,
    "kg·m⁻³",
    "pore-filling saturation",
    "Max polymer loading before pore clogging in column tests.",
    [2, 15],
  ),
} as const;

/** Approach 3, Aeolian erosion (Bagnold threshold + saltation). */
export const AEOLIAN_CALIB = {
  /** Bagnold empirical threshold parameter A (aerodynamic regime). */
  A: calib(
    0.11,
    "dimensionless",
    "Bagnold 1941; Shao & Lu 2000",
    "Wind-tunnel threshold u*t vs grain size on UNTREATED sand; fit A.",
    [0.08, 0.14],
  ),
  /** Friction-to-freestream ratio u* : U∞ (surface roughness dependent). */
  uStarRatio: calib(
    0.03,
    "dimensionless",
    "log-law over desert sand roughness",
    "Pitot/hot-wire profile in the wind tunnel; u* from log-law fit.",
    [0.02, 0.06],
  ),
  /** Bagnold saltation mass-flux coefficient C (grain sorting dependent). */
  saltationC: calib(
    1.8,
    "dimensionless",
    "Bagnold 1.5 (uniform) – 2.8 (wide)",
    "Sand-trap mass flux vs u*³ in wind tunnel; slope = C·ρa/g.",
    [1.0, 3.0],
  ),
  /** γ-PGA shear modulus G [Pa] → interparticle cohesion γ_biofilm [N/m]. */
  cohesionPerG: calib(
    2.0e-6,
    "N·m⁻¹ per Pa",
    "cohesion–stiffness scaling placeholder",
    "Pair micro-penetrometer/torsion cohesion with rheometer G on treated crust.",
    [5e-7, 6e-6],
  ),
  /** CaCO₃ UCS [kPa] → interparticle cohesion γ_cement [N/m]. */
  cohesionPerUCS: calib(
    1.5e-5,
    "N·m⁻¹ per kPa",
    "cemented-sand cohesion scaling placeholder",
    "Pair UCS with direct-shear cohesion intercept on cemented cores.",
    [3e-6, 5e-5],
  ),
  /** Wind shear stress a crust of unit thickness can resist before brittle shatter. */
  shatterPerThickness: calib(
    3.5e-4,
    "Pa·Pa⁻¹·mm⁻¹",
    "crust flexural failure placeholder",
    "Modulus-of-rupture (3-point bend) on crust coupons vs thickness.",
    [1e-4, 8e-4],
  ),
} as const;

/** §6, CaCO₃ geochemical precipitation (Lassin et al. 2018) + biocement strength. */
export const CACO3_CALIB = {
  /** Calcite solubility product (25 °C). */
  pKspCalcite: calib(
    8.48,
    "−log₁₀(Ksp)",
    "calcite 25 °C (Plummer & Busenberg 1982)",
    "Use literature value; verify ionic strength of desert pore water.",
    [8.0, 8.9],
  ),
  /** Amorphous calcium carbonate solubility product (more soluble than calcite). */
  pKspACC: calib(
    6.4,
    "−log₁₀(Ksp)",
    "ACC (Brečević & Nielsen 1989)",
    "Literature; ACC is the kinetic precursor phase.",
    [6.0, 7.0],
  ),
  /** Carbonic acid pKa1 (CO₂(aq)/HCO₃⁻). */
  pKa1: calib(
    6.35,
    "−log₁₀(Ka)",
    "H₂CO₃* 25 °C",
    "Literature; temperature-correct for desert surface T.",
    [6.1, 6.6],
  ),
  /** Carbonic acid pKa2 (HCO₃⁻/CO₃²⁻). */
  pKa2: calib(
    10.33,
    "−log₁₀(Ka)",
    "HCO₃⁻ 25 °C",
    "Literature; temperature-correct for desert surface T.",
    [10.0, 10.6],
  ),
  /** Carbonic-anhydrase rate enhancement over un-catalyzed CO₂ hydration. */
  caRateEnhancement: calib(
    1.0e6,
    "fold",
    "CA kcat≈10⁶ s⁻¹ vs kuncat≈0.04 s⁻¹",
    "pNPA esterase assay or pH-drop (phenol red) on displayed-CA cells vs blank.",
    [1e3, 1e7],
  ),
  /** Surface-reaction precipitation rate constant (TST): r = kPrecip·(Ω−1). */
  kPrecip: calib(
    0.12,
    "mol·L⁻¹·h⁻¹ per (Ω−1)",
    "TST surface-complexation (Lassin et al. 2018)",
    "Fit calcite precipitation rate vs supersaturation Ω in stirred-cell titration.",
    [0.01, 0.6],
  ),
  /** ACC → crystalline carbonate first-order transformation rate. */
  kAccToCalcite: calib(
    0.05,
    "h⁻¹",
    "ACC ripening (Lassin et al. 2018)",
    "Time-resolved XRD/Raman of ACC→crystalline fraction; fit first-order k.",
    [0.005, 0.5],
  ),
  /**
   * Fraction of the crystallising carbonate that first forms as METASTABLE VATERITE rather than
   * calcite. Non-ureolytic carbonic-anhydrase MICP frequently yields vaterite (Research Table,
   * Prong 2), unlike the pure calcite of classic urease systems.
   */
  vateriteFraction: calib(
    0.6,
    "fraction",
    "CA-MICP often yields vaterite (Research Table; Rodriguez-Blanco 2011)",
    "Quantitative XRD (Rietveld) of the precipitate; vaterite:calcite ratio.",
    [0.2, 0.9],
  ),
  /** Solution-mediated vaterite → calcite transformation rate (Ostwald ripening; slow). */
  kVateriteToCalcite: calib(
    0.02,
    "h⁻¹",
    "vaterite→calcite solution-mediated recrystallisation (Rodriguez-Blanco 2011)",
    "Time-resolved XRD of the vaterite fraction; fit first-order decay.",
    [0.002, 0.1],
  ),
  /**
   * Load-bearing strength of vaterite RELATIVE to calcite per unit mass. Vaterite is the softer,
   * more soluble polymorph, so it cements less effectively until it recrystallises to calcite.
   */
  vateriteStrengthFactor: calib(
    0.55,
    "fraction of calcite",
    "vaterite softer/more soluble than calcite (Rodriguez-Blanco 2011)",
    "Compare UCS of vaterite-rich vs calcite-rich cores at equal carbonate wt%.",
    [0.3, 0.8],
  ),
  /** UCS power-law prefactor: UCS = kUcs · (load-bearing carbonate wt%)^nUcs. */
  kUcs: calib(
    31.6,
    "kPa per (wt%)^n",
    "MICP UCS≈1 MPa @ ~10 wt% calcite",
    "Unconfined compression of cores at several calcite contents; log-log fit → kUcs, nUcs.",
    [10, 80],
  ),
  /** UCS power-law exponent. */
  nUcs: calib(
    1.5,
    "dimensionless",
    "MICP UCS∝calcite^(1–2)",
    "Slope of log(UCS) vs log(calcite wt%).",
    [1.0, 2.2],
  ),
} as const;

/** Prong 3, Sodium alginate (egg-box gel, moisture, washout). */
export const ALGINATE_CALIB = {
  /** Guluronate (G) fraction, controls Ca²⁺ egg-box junction density. */
  guluronateFraction: calib(
    0.55,
    "fraction",
    "commercial alginate F_G≈0.3–0.7",
    "Provided by supplier spec or ¹H-NMR block analysis of the lot used.",
    [0.3, 0.7],
  ),
  /** Ca²⁺ dissociation constant to alginate G-blocks (high affinity). */
  KdCa: calib(
    1.0,
    "mol·m⁻³ (mM)",
    "egg-box high Ca²⁺ affinity",
    "Ca²⁺-ISE titration of the alginate lot.",
    [0.3, 3],
  ),
  /** Maps applied alginate concentration [%w/v] → network density ρ [kg/m³]. */
  concToRho: calib(
    9.0,
    "kg·m⁻³ per %w/v",
    "1 %w/v ≈ 10 kg/m³ minus losses",
    "Gravimetric retained alginate per sand volume vs applied %.",
    [4, 12],
  ),
  /** Water held per unit alginate (hydrogel swelling). */
  waterHoldingCapacity: calib(
    20,
    "g water per g alginate",
    "alginate hydrogel swelling",
    "Gravimetric water retention vs RH on alginate-treated sand.",
    [5, 50],
  ),
  /** First-order washout/dissolution rate per simulated wet (rain) cycle. */
  washoutRatePerCycle: calib(
    0.15,
    "fraction·cycle⁻¹",
    "soluble polymer leaching estimate",
    "Rainfall-simulation: residual alginate vs number of wetting cycles.",
    [0.03, 0.4],
  ),
} as const;

/**
 * Grain-size-resolved crust performance (Study 4, Erdmann et al. 2024, Discover Materials,
 * doi:10.1007/s43939-024-00108-3, MICP vs particle size;
 * UAE dune-sand grain-size distribution). MICP cementation is NOT uniform across grain sizes:
 * it peaks for fine–medium sand (~63–125 µm), where pores are small enough for calcite bridging
 * yet permeable enough for bacteria to penetrate, and falls off for coarse sand (pores too large
 * to bridge) and ultra-fine sand (too low-permeability for cells to colonise). γ-PGA and alginate
 * cover the grain sizes MICP misses, the quantitative basis of the three-prong "cover all sizes"
 * thesis.
 */
export const GRAINSIZE_CALIB = {
  /** Peak MICP cementation grain diameter (geometric centre of the 63–125 µm sweet spot). */
  micpPeakDiameter: calib(
    90,
    "µm",
    "Study 4: SP0063/SP0125 UCS≈3.1/2.9 MPa peak; SP0250≈1.6, SP0500≈0.7 MPa",
    "UCS of MICP-treated cores sieved to several narrow size bands; locate the UCS-vs-d peak.",
    [63, 125],
  ),
  /** Log-normal width (in ln d) of the MICP efficiency curve; fit to the SP0063→SP0500 fall-off. */
  micpLogWidth: calib(
    0.85,
    "ln(µm) (dimensionless)",
    "fit to Study 4 UCS(d): eff(250µm)≈0.52, eff(500µm)≈0.23 of peak",
    "Regress ln(UCS/UCS_peak) on (ln d)²; slope sets the width.",
    [0.5, 1.4],
  ),
  /** Below this diameter, low permeability blocks bacterial colonisation → MICP penetration falls. */
  micpPenetrationD50: calib(
    40,
    "µm",
    "Study 4: fine-size limit set by cells failing to penetrate low-permeability sand",
    "Colonisation depth vs grain size (thin-section / CFU-with-depth) on sieved packs.",
    [20, 63],
  ),
  /** Steepness of the fine-side penetration roll-off (logistic). */
  micpPenetrationSteep: calib(
    6,
    "dimensionless",
    "sharp permeability threshold for cell transport",
    "Fit the fine-side UCS drop to a logistic in ln d.",
    [3, 12],
  ),
  /** γ-PGA pore-filling half-diameter, polymer bridges fine/medium pores, fails at coarse gaps. */
  pgaCoverHalfD: calib(
    320,
    "µm",
    "γ-PGA gel bridges grain contacts up to coarse-sand pore scale",
    "Aggregate-stability (wet-sieving) of γ-PGA-treated bands vs grain size.",
    [150, 600],
  ),
  pgaCoverSteep: calib(
    2.5,
    "dimensionless",
    "gradual loss of gel bridging with pore size",
    "Slope of coverage vs ln d.",
    [1.5, 5],
  ),
  /** Alginate broad-spectrum coating floor (effective at every grain size by surface coating). */
  alginateCoverFloor: calib(
    0.45,
    "fraction",
    'Study 4: alginate coats grains & seeds nucleation "regardless of grain size"',
    "Cohesion of alginate-only bands across the full size range.",
    [0.2, 0.7],
  ),
  /** Extra alginate coverage at the coarse end (partial pore-filling of large voids). */
  alginateCoarseBoost: calib(
    0.35,
    "fraction",
    "alginate partially fills the large pores MICP cannot bridge",
    "Coarse-band cohesion gain from alginate vs untreated.",
    [0.1, 0.6],
  ),
  alginateCoarseHalfD: calib(
    300,
    "µm",
    "onset of the large-pore regime alginate helps fill",
    "Locate where alginate contribution rises with grain size.",
    [200, 450],
  ),
  // --- UAE deployment-site dune-sand grain-size distribution (log-normal) ---
  /** Median grain diameter D50 of UAE aeolian dune sand. */
  uaeD50: calib(
    200,
    "µm",
    "UAE dune sand 100–300 µm, D50≈0.15–0.3 mm (Research Table)",
    "Sieve/laser-diffraction PSD of the actual deployment-site sand; read D50.",
    [120, 280],
  ),
  /** Geometric standard deviation of the (well-sorted, aeolian) size distribution. */
  uaeSizeSigma: calib(
    1.35,
    "dimensionless (geometric)",
    "well-sorted aeolian dune sand (narrow PSD)",
    "σg = √(D84/D16) from the site PSD.",
    [1.2, 1.8],
  ),
} as const;

/**
 * Curing & deployment timeline (Study 5, NYUAD Research Table field protocol).
 * The engineered crust is not instant and it is not permanent. It CURES over the first ~32 h
 * (sprayed at 0/8/16/24/32 h to keep the biofilm hydrated and the MICP substrate replenished),
 * then slowly WEATHERS over months until it must be re-applied (every ~6 months in the protocol).
 * Each binder has its own maturation speed and its own field durability:
 *   • CaCO₃ (MICP), matures slowly (calcite ripening needs the full 32 h) but is the most durable.
 *   • γ-PGA, sets on an intermediate timescale; biodegradable, months-scale field life.
 *   • Alginate, gels almost instantly but is soluble and washes out fastest.
 * This is the mechanism behind the multi-prong advantage: a fast-setting polymer buys early-age
 * strength while the durable calcite floor extends the re-application interval.
 */
export const CURING_CALIB = {
  /** Protocol spray times over the maturation window [h] (Study 5). */
  sprayScheduleHours: calib(
    32,
    "h (last spray / full maturation)",
    "Study 5: spray at 0/8/16/24/32 h; biofilm fully mature at 32 h",
    "Wind-tunnel/UCS of cores cured for 0/8/16/24/32 h; locate the maturation plateau.",
    [16, 48],
  ),
  /** γ-PGA cross-link maturation time constant [h] (gel sets on an intermediate timescale). */
  tauMaturePGA: calib(
    4,
    "h",
    "ionic gelation sets within hours",
    "UCS/rheometry of γ-PGA crust vs cure time; fit τ.",
    [1, 12],
  ),
  /** CaCO₃ (MICP) maturation time constant [h], slow calcite ripening over the full 32 h protocol. */
  tauMatureCaCO3: calib(
    11,
    "h",
    "Study 5: MICP crust matures over the 32 h protocol (~95% by 32 h)",
    "UCS of MICP cores vs cure time; fit τ to reach plateau by 32 h.",
    [6, 20],
  ),
  /** Alginate maturation time constant [h], near-instant Ca²⁺ egg-box gelation. */
  tauMatureAlginate: calib(
    0.5,
    "h",
    "alginate gels on contact with Ca²⁺ (seconds–minutes)",
    "Time-to-gel of the applied alginate; effectively immediate.",
    [0.1, 3],
  ),
  /** γ-PGA field-life half-life [months], biodegradable polyanion under UV/desiccation/microbial loss. */
  halfLifePGAMonths: calib(
    5,
    "months",
    "biodegradable γ-PGA weathers over months",
    "Residual crust cohesion vs field exposure time for a γ-PGA-only plot.",
    [2, 12],
  ),
  /** CaCO₃ field-life half-life [months], calcite is the durable, weather-resistant load-bearer. */
  halfLifeCaCO3Months: calib(
    30,
    "months",
    "calcite cement is durable; slow abrasion/dissolution only",
    "Residual UCS of an MICP crust vs field exposure over 1–2 years.",
    [12, 60],
  ),
  /** Alginate field-life half-life [months], soluble, rain-washout limited (shortest). */
  halfLifeAlginateMonths: calib(
    3,
    "months",
    "soluble alginate leaches under wetting cycles (see washoutRatePerCycle)",
    "Residual alginate/cohesion vs number of rain events converted to months.",
    [1, 8],
  ),
  /** Design survival wind speed the crust must keep withstanding between re-applications [m/s]. */
  designWindMs: calib(
    30,
    "m/s",
    "Study 3: optimised calcite crust survives ~30 m/s (UAE winds 16–20 m/s)",
    "Wind-tunnel survival speed of the cured crust; set the design threshold below it.",
    [15, 40],
  ),
  /** Protocol re-application interval [months] (the field cadence the timeline is checked against). */
  reapplyIntervalMonths: calib(
    6,
    "months",
    "Study 5: repeat the spray cycle every 6 months",
    "Confirm crust still exceeds the survival threshold at the chosen cadence.",
    [3, 12],
  ),
} as const;

/**
 * Ecology, engineered-colony spread (Fisher–KPP) + MazE/MazF biocontainment.
 * ==========================================================================
 * Two distinct, literature-anchored quantities the previous model lumped into one raw
 * "spread probability" knob:
 *
 *   1. COLONY FRONT SPEED, how fast the living colony physically expands across the treated
 *      patch. Bacterial range expansion is the textbook Fisher–Kolmogorov (KPP) travelling wave:
 *          c = 2·√(D·µ)
 *      with µ the edge specific-growth-rate [h⁻¹] and D an effective sliding/expansion
 *      diffusivity [mm²·h⁻¹]. Ca²⁺ (which prongs 1–2 dose for cross-linking / MICP) *lowers* D by
 *      complexing surfactin and disabling flagellum-independent sliding (Kubota/Kobayashi 2017,
 *      PMC5374384), a genuine spread-limiting synergy of the chemistry we already deploy.
 *
 *   2. BIOCONTAINMENT ESCAPE FREQUENCY, the probability a cell evades the MazE/MazF kill-switch
 *      per generation. This is the real biosafety "spread probability": it multiplies by the huge
 *      deployed cell count to give the expected number of escapees. NIH/NIST-style guidance sets a
 *      < 10⁻⁸ escapees·cell⁻¹·gen⁻¹ target (Chan et al. 2016 Nat Chem Biol; Stirling et al. 2017
 *      Mol Cell "Deadman/Passcode"; Rottinghaus et al. 2022 layered switches). Independent switches
 *      MULTIPLY: two orthogonal switches at 10⁻⁴ each reach the 10⁻⁸ floor.
 */
export const ECOLOGY_CALIB = {
  /** Edge specific growth rate µ of the expanding colony [h⁻¹] (sets the KPP reaction term). */
  muMax: calib(
    1.0,
    "h⁻¹",
    "B. subtilis exponential growth, doubling ≈40 min (µ=ln2/t_d)",
    "OD600 growth curve on the deployment medium/temperature; µ = slope of ln(OD) vs t.",
    [0.3, 2.0],
  ),
  /**
   * Effective colony-expansion (sliding-motility) diffusivity D₀ [mm²·h⁻¹] at zero Ca²⁺.
   * Calibrated so the Fisher speed c=2√(Dµ) lands at the few-mm·day⁻¹ sliding-expansion rate of
   * B. subtilis biofilms on soft agar (Grau et al. 2015; van Gestel et al. 2015).
   */
  motilityD0: calib(
    0.012,
    "mm²·h⁻¹",
    "B. subtilis sliding-expansion → c≈5 mm·day⁻¹ via c=2√(Dµ)",
    "Track colony-edge radius vs time on the deployment substrate; D=(c/2)²/µ.",
    [0.002, 0.08],
  ),
  /**
   * Ca²⁺ concentration that halves sliding expansion (surfactin-complexation suppression):
   * D(Ca) = D₀ / (1 + [Ca²⁺]/K). Kubota & Kobayashi 2017 saw restriction already at 1 mM Ca²⁺,
   * deepening at 10–100 mM.
   */
  caSuppressHalf: calib(
    1.0,
    "mM Ca²⁺",
    "Ca²⁺ lowers B. subtilis colony expansion, half-effect ~1 mM (PMC5374384)",
    "Colony diameter vs [Ca²⁺] (0/1/10/100 mM); fit the half-suppression constant.",
    [0.3, 10],
  ),
  /** Physical edge length of the simulated deployment patch [mm], sets the grid cell size Δx. */
  patchSpanMm: calib(
    100,
    "mm",
    "simulated overhead patch = 10 cm treated square",
    "Set to the plot size the colony map represents; Δx = span/gridSize.",
    [20, 500],
  ),
  /**
   * Kill-switch escape frequency [escapees·cell⁻¹·generation⁻¹], a cell mutationally inactivating
   * MazF / retaining the antitoxin. Default at the NIH < 10⁻⁸ biocontainment target.
   */
  escapeFreqPerGen: calib(
    1.0e-8,
    "cell⁻¹·gen⁻¹",
    "engineered T-A / MazEF escape 10⁻⁶–10⁻⁸ (Chan 2016; Stirling 2017; Rottinghaus 2022)",
    "Plate a saturated culture on inducing medium; escapees/CFU = escape frequency.",
    [1e-9, 1e-5],
  ),
  /** NIH-style biocontainment benchmark the design is judged against (fixed reference line). */
  nihEscapeThreshold: calib(
    1.0e-8,
    "cell⁻¹·gen⁻¹",
    "NIH/community biocontainment target (Chan et al. 2016)",
    "Fixed reference; the design should meet or beat it.",
    [1e-8, 1e-8],
  ),
  /** Viable engineered cells laid down per cm² of treated crust (sets the deployed population). */
  fieldViableDensity: calib(
    1.0e7,
    "cells·cm⁻²",
    "B. subtilis spray inoculation ~10⁷–10⁹ CFU·cm⁻²",
    "CFU per cm² of freshly sprayed crust by plate count.",
    [1e5, 1e9],
  ),
} as const;

/** Composite, multi-prong strength combination (rule of mixtures + synergy). */
export const COMPOSITE_CALIB = {
  /**
   * Pairwise PHYSICOCHEMICAL synergy η_ij in γ_total = Σγᵢ + Σ η_ij·√(γᵢγⱼ).
   * These now capture ONLY the constructive chemistry (nucleation templating, moisture support);
   * the antagonistic shared-Ca²⁺ competition is modelled explicitly in interactions.ts and applied
   * to the contributions before this synergy term, so it is no longer folded into a negative η.
   */
  eta_PGA_CaCO3: calib(
    0.2,
    "dimensionless",
    "γ-PGA carboxylates template/toughen calcite (Wei 2015; acidic-polymer CaCO₃ nucleation)",
    "Direct-shear cohesion of 1+2 cores vs sum of singles → η.",
    [0, 0.6],
  ),
  eta_PGA_Alginate: calib(
    0.05,
    "dimensionless",
    "both polyanions co-hold moisture (weak synergy); Ca²⁺ competition handled separately",
    "Cohesion of 1+3 vs sum of singles → η (with Ca competition removed).",
    [0, 0.3],
  ),
  eta_CaCO3_Alginate: calib(
    0.1,
    "dimensionless",
    "alginate hydrogel keeps microhabitat damp, sustaining CA precipitation",
    "Cohesion of 2+3 vs sum of singles → η.",
    [0, 0.4],
  ),
} as const;

/** Inter-prong interactions, shared-resource competition + co-expression burden. */
export const INTERACTION_CALIB = {
  /**
   * Relative Ca²⁺ demand weight of each prong (all three sequester divalent calcium):
   * γ-PGA carboxylate chelation, calcite precipitation (stoichiometric Ca lock-up), alginate egg-box.
   */
  caDemandPGA: calib(
    1.0,
    "mM sites",
    "γ-PGA carboxylate–Ca²⁺ chelation demand",
    "Ca²⁺-ISE: Ca bound per g γ-PGA.",
    [0.5, 2],
  ),
  caDemandCaCO3: calib(
    2.0,
    "mM sites",
    "calcite locks 1 mol Ca per mol CaCO₃ (highest sink)",
    "Ca²⁺ consumed per unit calcite formed.",
    [1, 3],
  ),
  caDemandAlginate: calib(
    1.2,
    "mM sites",
    "alginate G-block egg-box Ca²⁺ demand",
    "Ca²⁺-ISE: Ca bound per g alginate.",
    [0.6, 2.5],
  ),
  /**
   * Shared soil Ca²⁺ supply [mM] the active prongs partition. Interpreted as a total-Ca pool in the
   * competitive-binding model (interactions.ts): free + Σ bound. Competition bites when Σ demand ≳ supply.
   */
  caSupplyCapacity: calib(
    2.6,
    "mM total Ca²⁺",
    "plant-available soil Ca²⁺ + dosed CaCl₂ pool",
    "Titrate available Ca²⁺ in treated desert soil.",
    [1.5, 5],
  ),
  /**
   * Effective Ca²⁺ dissociation constants [mM] used to partition the shared pool by affinity
   * (competitive Langmuir). Calcite is an irreversible sink → modelled as very high affinity, so it
   * out-competes the reversible polyelectrolyte binders for calcium.
   */
  KdCalcite: calib(
    0.05,
    "mM",
    "calcite precipitation is an irreversible high-affinity Ca²⁺ sink",
    "Effective, set far below the polymer Kd values; not directly titratable.",
    [0.01, 0.3],
  ),
  /**
   * Fraction of each product's single-strain yield retained when γ-PGA synthase AND carbonic
   * anhydrase are co-expressed in the same B. subtilis (shared carbon/ATP/amino-acid budget).
   */
  coexpressionBurden: calib(
    0.78,
    "fraction retained",
    "metabolic burden of dual heterologous expression (Ceroni 2015; Borkowski 2016)",
    "Compare γ-PGA & CA titres in single vs dual-expression strains.",
    [0.5, 0.95],
  ),
} as const;

/** Economic scalability, per-prong deployment cost bases (field-scale). */
export const ECONOMIC_CALIB = {
  // --- Prong 1: γ-PGA fermentation ---
  glucoseCostPerKg: calib(
    0.4,
    "USD·kg⁻¹",
    "bulk dextrose feedstock",
    "Quote from feedstock supplier at project scale.",
    [0.2, 1.0],
  ),
  mediaSaltsCostPerL: calib(
    0.08,
    "USD·L⁻¹",
    "nitrogen/mineral salts per L broth",
    "Cost the defined medium recipe per litre.",
    [0.02, 0.25],
  ),
  utilitiesCostPerL: calib(
    0.04,
    "USD·L⁻¹",
    "water + aeration + power per L",
    "Meter reactor utilities per batch.",
    [0.01, 0.15],
  ),
  glucoseMassFractionInMedia: calib(
    0.03,
    "fraction",
    "~3 %w/v glucose fermentation",
    "Set by the actual medium formulation.",
    [0.01, 0.08],
  ),
  // --- Prong 2: CaCO₃ (MICP via carbonic anhydrase) ---
  calciumSourceCostPerKg: calib(
    0.15,
    "USD·kg⁻¹ CaCl₂",
    "bulk calcium chloride",
    "Quote calcium feedstock; CaCl₂ vs Ca(OH)₂.",
    [0.08, 0.5],
  ),
  caReagentCostPerHa: calib(
    650,
    "USD·ha⁻¹",
    "enzyme induction + Ca dosing per hectare",
    "Cost calcium + inducer dosing for one treated hectare.",
    [200, 1500],
  ),
  co2CreditPerKg: calib(
    0.01,
    "USD·kg⁻¹ CO₂",
    "voluntary carbon market 2024 ≈ $6/tCO₂ avg; nature-based removals command a premium, $10/t is a defensible mid-point (State of the VCM 2024)",
    "Use the applicable carbon-credit price for durable mineral removal.",
    [0.003, 0.03],
  ),
  // --- Prong 3: sodium alginate (purchased commodity) ---
  alginateCostPerKg: calib(
    9.0,
    "USD·kg⁻¹",
    "food/technical-grade sodium alginate; within the 2024 bulk market band ≈ $6–12/kg (IMARC / Procurement Resource price trend)",
    "Quote alginate + CaCl₂ crosslinker per kg applied.",
    [4, 20],
  ),
  alginateDoseKgPerHa: calib(
    400,
    "kg·ha⁻¹",
    "2 %w/v over a thin applied layer",
    "Set by applied %w/v and layer depth.",
    [100, 1200],
  ),
  // --- Shared field operations & conventional baselines ---
  bacterialSetupCapex: calib(
    25000,
    "USD",
    "pilot fermentation / enzyme-production setup",
    "Estimate the one-time bioprocess infrastructure cost at deployment scale.",
    [5000, 100000],
  ),
  fieldApplicationCostPerHa: calib(
    180,
    "USD·ha⁻¹",
    "spray rig + labour per hectare",
    "Cost the spray application pass per hectare.",
    [80, 400],
  ),
  chemicalSprayCostPerHa: calib(
    2800,
    "USD·ha⁻¹",
    'petrochemical dust-suppressant (polymer emulsion class; cf. USDA FS "Dust Palliative Selection and Application Guide", commercial Soiltac/Soilworks)',
    "Vendor quote for conventional chemical stabiliser.",
    [1500, 4000],
  ),
  concreteBlanketCostPerHa: calib(
    18500,
    "USD·ha⁻¹",
    "hard-engineering blanket",
    "Contractor quote for concrete/aggregate matting.",
    [10000, 30000],
  ),
} as const;

/** Convenience: every calibration group, for UI provenance panels and audits. */
export const CALIBRATION = {
  FBA: FBA_CALIB,
  CROSSLINK: CROSSLINK_CALIB,
  AEOLIAN: AEOLIAN_CALIB,
  CACO3: CACO3_CALIB,
  ALGINATE: ALGINATE_CALIB,
  GRAINSIZE: GRAINSIZE_CALIB,
  CURING: CURING_CALIB,
  ECOLOGY: ECOLOGY_CALIB,
  COMPOSITE: COMPOSITE_CALIB,
  INTERACTION: INTERACTION_CALIB,
  ECONOMIC: ECONOMIC_CALIB,
} as const;

/** Helper: pull just the numeric value of a calibration entry. */
export const cval = (c: Calib): number => c.value;
