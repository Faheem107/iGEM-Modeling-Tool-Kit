/**
 * Prong 3, Sodium Alginate (commercial biopolymer, applied directly; NO bacteria)
 * ================================================================================
 * Alginate gels by ionic "egg-box" cross-linking: Ca²⁺ bridges guluronate (G) blocks of
 * adjacent chains. Only G-blocks form load-bearing junctions, so junction density scales
 * with the guluronate fraction F_G of the lot used.
 *
 *   ρ_polymer = concToRho · C_applied                  applied %w/v → network density
 *   θ         = [Ca²⁺]/(Kd + [Ca²⁺])                   Langmuir Ca²⁺ saturation
 *   ν         = ρ_polymer · θ · F_G · (1 − 2Mx/Mn)     egg-box junction density
 *   G         = ν R T                                  gel shear modulus [Pa]
 *
 * Alginate's honest limitations are modeled too: it is water-soluble (washout over rain
 * cycles) but an excellent water-magnet (moisture retention keeps the crust damp).
 */

import { PHYS, ALGINATE_CALIB, cval } from "./constants";

/**
 * Ca²⁺ saturation of guluronate binding sites (Langmuir). Alginate keeps its own copy of this
 * isotherm, its junctions are egg-box G-block chelation, physically distinct from γ-PGA's
 * carboxylate bridging even though both share the Langmuir form.
 */
export function eggBoxSaturation(
  calciumMillimolar: number,
  Kd: number,
): number {
  if (calciumMillimolar <= 0) return 0;
  return calciumMillimolar / (Kd + calciumMillimolar);
}

/** Egg-box gel shear modulus from junction density: G = ν R T. */
export const gelModulus = (nu: number, temperature: number): number =>
  nu * PHYS.R * temperature;

export interface AlginateInputs {
  /** Applied alginate concentration [%w/v]. */
  appliedPercent: number;
  /** Local Ca²⁺ concentration [mM]. */
  calciumMillimolar: number;
  /** Temperature [K]. */
  temperature: number;
  /** Molar mass between junctions Mx [g·mol⁻¹]. */
  Mx?: number;
  /** Number-average alginate molar mass Mn [g·mol⁻¹]. */
  Mn?: number;
}

export interface AlginateResult {
  rhoPolymer: number; // kg·m⁻³
  theta: number; // Ca²⁺ saturation 0–1
  nu: number; // junction density [mol·m⁻³ proxy]
  shearModulus: number; // Pa
}

/** Egg-box gel modulus from applied alginate + Ca²⁺. */
export function solveAlginateGel(inp: AlginateInputs): AlginateResult {
  const Mx = inp.Mx ?? 6000; // alginate junction spacing (G-block scale)
  const Mn = inp.Mn ?? 200000; // commercial sodium alginate Mn
  const Fg = cval(ALGINATE_CALIB.guluronateFraction);

  const rhoPolymer =
    Math.max(0, inp.appliedPercent) * cval(ALGINATE_CALIB.concToRho);
  const theta = eggBoxSaturation(
    inp.calciumMillimolar,
    cval(ALGINATE_CALIB.KdCa),
  );
  const endCorrection = Math.max(0, 1 - (2 * Mx) / Mn);
  const nu = rhoPolymer * theta * Fg * endCorrection;
  const G = gelModulus(nu, inp.temperature);

  return { rhoPolymer, theta, nu, shearModulus: G };
}

/**
 * Moisture retained by the alginate hydrogel [g water per litre of treatment].
 * Sorption rises with relative humidity (simple Langmuir-type isotherm) and with the
 * polymer's intrinsic water-holding capacity; falls as temperature drives evaporation.
 */
export function moistureRetention(
  appliedPercent: number,
  relativeHumidity: number,
  temperatureC: number,
): number {
  const alginateMassGPerL = Math.max(0, appliedPercent) * 10; // %w/v → g/L
  const whc = cval(ALGINATE_CALIB.waterHoldingCapacity); // g water / g alginate at saturation
  const rh = Math.max(0, Math.min(1, relativeHumidity));
  const sorption = rh / (0.25 + rh); // isotherm: half-saturation near RH≈0.25
  const evapPenalty = Math.max(0.2, 1 - Math.max(0, temperatureC - 25) * 0.012);
  return alginateMassGPerL * whc * sorption * evapPenalty;
}

/** Residual alginate fraction after n rain/wet cycles: (1 − k)^n. */
export function washoutResidual(cycles: number): number {
  const k = cval(ALGINATE_CALIB.washoutRatePerCycle);
  return Math.pow(1 - k, Math.max(0, cycles));
}

/** Number of wet cycles until half the alginate has washed away. */
export function washoutHalfLifeCycles(): number {
  const k = cval(ALGINATE_CALIB.washoutRatePerCycle);
  return Math.log(0.5) / Math.log(1 - k);
}

/** Effective shear modulus after washout (gel weakens as polymer leaches). */
export function modulusAfterWashout(
  baseModulus: number,
  cycles: number,
): number {
  return baseModulus * washoutResidual(cycles);
}
