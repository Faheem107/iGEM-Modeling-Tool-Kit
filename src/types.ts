/**
 * NYUAD iGEM 2026 Modeling Kit
 * Type definitions for physical, metabolic, and docking simulations
 */

export interface MetabolicParams {
  alpha_m: number; // mRNA transcription rate
  beta_m: number; // mRNA degradation rate
  alpha_e: number; // Enzyme translation rate
  beta_e: number; // Enzyme degradation rate
  k_cat: number; // PGA synthesis rate
  s_precursor: number; // L-glutamate precursor concentration
  k_m: number; // Michaelis-Menten constant
  k_deg: number; // PGA degradation rate
  ggtKnockout: boolean; // Is degradation gene GGT knocked out?
  pgcAKnockout: boolean; // Is degradation gene PgcA knocked out?
}

export interface BiophysicsParams {
  ion_conc: number; // soil divalent ion concentration [C2+]
  Kd: number; // dissociation constant
  rho_polymer: number; // polymer density (kg/m3)
  temperature: number; // temperature (Kelvin)
  Mx: number; // molecular weight between cross-links
  Mn: number; // total molecular weight of polymer
}

export interface AeolianParams {
  sand_diameter: number; // sand particle diameter d (m)
  wind_velocity: number; // friction velocity u* (m/s)
  biofilm_cohesion: number; // cohesion coefficient gamma_biofilm
}

export interface CAConfig {
  gridSize: number;
  spreadProb: number;
  resourceConsume: number;
  initialInoculation: "center" | "random" | "corners";
  killSwitchDelay: number;
}

export interface SimulationStep {
  time: number;
  mRNA: number;
  enzyme: number;
  pga: number;
}

export interface MDAtom {
  id: number;
  element: "C" | "O" | "N" | "H" | "Ca" | "Glu";
  x: number;
  y: number;
  vx: number;
  vy: number;
  charge: number;
  mass: number;
  radius: number;
  isFixed?: boolean;
}

export interface MDBond {
  atomA: number;
  atomB: number;
  length: number;
  strength: number; // Spring stiffness
  isHydrogen?: boolean;
}

export interface ResidueInfo {
  name: string;
  id: number;
  role: string;
  charge: string;
  hydrophobicity: string;
  sasa: string; // Solvent accessible surface area
  deltaH: string; // interaction enthalpy
}

// --- Prong-combination simulation types ------------------------------------

/** Prong 2 — CaCO₃ precipitation controls (Carbonic Anhydrase / non-ureolytic). */
export interface Caco3Params {
  calcium: number; // initial dissolved Ca²⁺ [mM]
  dicMax: number; // max attainable DIC when CA fully active [mM]
  pH: number; // solution pH (valid 8.5–10.5)
  caEnhancement: number; // realized CA rate-enhancement fraction (0–1)
}

/** Prong 3 — Sodium alginate gel controls (applied commercial biopolymer). */
export interface AlginateParams {
  appliedPercent: number; // applied alginate [%w/v]
  calcium: number; // Ca²⁺ crosslinker [mM]
  temperature: number; // K
  relativeHumidity: number; // 0–1
  rainCycles: number; // simulated wet/rain cycles for washout
}

/**
 * Live binder outputs each prong module bubbles up so the composite + aeolian modules can
 * combine them. Each prong reduces to an interparticle cohesion downstream.
 */
export interface SimulationVitals {
  pgaYield: number; // g/L   (Prong 1 metabolic ODE)
  pgaShearModulus: number; // Pa    (Prong 1 cross-linking)
  caco3UCS: number; // kPa   (Prong 2 biocement)
  caco3CalcitePct: number; // wt%   (Prong 2 calcite content)
  co2Sequestered: number; // g/L   (Prong 2 CO₂ capture)
  alginateModulus: number; // Pa    (Prong 3 egg-box gel)
}
