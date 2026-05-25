/**
 * NYUAD iGEM 2026 Modeling Kit
 * Type definitions for physical, metabolic, and docking simulations
 */

export interface MetabolicParams {
  alpha_m: number;   // mRNA transcription rate
  beta_m: number;    // mRNA degradation rate
  alpha_e: number;   // Enzyme translation rate
  beta_e: number;    // Enzyme degradation rate
  k_cat: number;     // PGA synthesis rate
  s_precursor: number; // L-glutamate precursor concentration
  k_m: number;       // Michaelis-Menten constant
  k_deg: number;     // PGA degradation rate
  ggtKnockout: boolean; // Is degradation gene GGT knocked out?
  pgcAKnockout: boolean; // Is degradation gene PgcA knocked out?
}

export interface BiophysicsParams {
  ion_conc: number;       // soil divalent ion concentration [C2+]
  Kd: number;             // dissociation constant
  rho_polymer: number;    // polymer density (kg/m3)
  temperature: number;    // temperature (Kelvin)
  Mx: number;             // molecular weight between cross-links
  Mn: number;             // total molecular weight of polymer
}

export interface AeolianParams {
  sand_diameter: number;  // sand particle diameter d (m)
  wind_velocity: number;  // friction velocity u* (m/s)
  biofilm_cohesion: number; // cohesion coefficient gamma_biofilm
}

export interface CAConfig {
  gridSize: number;
  spreadProb: number;
  resourceConsume: number;
  initialInoculation: 'center' | 'random' | 'corners';
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
  element: 'C' | 'O' | 'N' | 'H' | 'Ca' | 'Glu';
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
