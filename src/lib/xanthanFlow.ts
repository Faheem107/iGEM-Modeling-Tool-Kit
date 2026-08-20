/**
 * Xanthan Gum Flow Model
 * ======================
 * Power-law (Ostwald–de Waele) rheology for xanthan gum solution flowing through a straight
 * cylindrical tube, laminar, steady, fully developed, isothermal, incompressible. This is the
 * source of truth behind the "Xanthan Flow" page: every number shown there is computed from the
 * functions below, not transcribed, so the page cannot drift from the model.
 *
 * Derivation summary (see the page's "Show the math" panels for the full working):
 *  - Constitutive law:      τ = K γ̇^n                                            (power-law fluid)
 *  - Force balance:         τ(r) = (ΔP / 2L) r
 *  - Velocity profile:      u(r) = (n/(n+1)) (ΔP/2KL)^(1/n) [ R^((n+1)/n) − r^((n+1)/n) ]
 *  - Flow rate:              Q = (πnR³/(3n+1)) (ΔP R / 2KL)^(1/n)   (generalized Hagen–Poiseuille)
 *  - Mean speed:             V = Q/(πR²) = (nR/(3n+1)) (ΔP R / 2KL)^(1/n)
 *  - Inverted (ΔP from V):   ΔP(V) = (2KL/R) ((3n+1)V / nR)^n
 */
import { DUNE, TINT } from "@/src/lib/palette";

/** Tube geometry: D = 1 cm, L = 15 cm, matching the worked example in the source model. */
export const TUBE = {
  diameter: 0.01, // m
  get radius() {
    return this.diameter / 2;
  },
  length: 0.15, // m
};

/** Undiluted (φ = 1, ~1% w/w aqueous, ~25 °C) base rheology, the paper's working default. */
export const BASE_XANTHAN = {
  n0: 0.245, // flow behaviour index (dimensionless), n < 1 = shear-thinning
  K0: 2.29, // consistency index, Pa·s^n
  rho: 1000, // density, kg/m^3
};

/** Pure-water endpoint (φ = 0) and the empirical dilution-scaling exponents. */
export const DILUTION = {
  Kw: 0.001, // dynamic viscosity of water, Pa·s
  alpha: 1.8, // K(φ) drops faster than linearly with dilution
  beta: 0.5, // n(φ) rises toward 1 more slowly than linearly
};

/** Metzner–Reed generalized Reynolds number laminar cutoff, same rule of thumb as Newtonian pipe flow. */
export const RE_LAMINAR_LIMIT = 2100;

export interface RheologyParams {
  /** Consistency index, Pa·s^n. */
  K: number;
  /** Flow behaviour index, dimensionless. */
  n: number;
}

/**
 * Concentration-dependent (K, n) at dilution fraction φ ∈ [0,1] (φ = 1 undiluted, φ = 0 pure
 * water). Eqs. (14)–(15): K falls off faster than linearly (α = 1.8 > 1), n climbs back toward 1
 * more slowly than linearly (β = 0.5 < 1).
 */
export function concentrationParams(
  phi: number,
  base: { n0: number; K0: number } = BASE_XANTHAN,
): RheologyParams {
  const p = Math.min(1, Math.max(0, phi));
  const K = DILUTION.Kw + (base.K0 - DILUTION.Kw) * Math.pow(p, DILUTION.alpha);
  const n = 1 - (1 - base.n0) * Math.pow(p, DILUTION.beta);
  return { K, n };
}

/** Pressure drop [Pa] required to drive the mean speed V [m/s]. Eq. (7). */
export function pressureFromSpeed(
  V: number,
  { K, n }: RheologyParams,
  R = TUBE.radius,
  L = TUBE.length,
): number {
  if (V <= 0) return 0;
  return ((2 * K * L) / R) * Math.pow(((3 * n + 1) * V) / (n * R), n);
}

/** Mean flow speed V [m/s] produced by an applied pressure drop ΔP [Pa]. Eq. (6). */
export function speedFromPressure(
  dP: number,
  { K, n }: RheologyParams,
  R = TUBE.radius,
  L = TUBE.length,
): number {
  if (dP <= 0) return 0;
  return ((n * R) / (3 * n + 1)) * Math.pow((dP * R) / (2 * K * L), 1 / n);
}

/** Transit time [s] for a fluid element to cross the tube at mean speed V [m/s]. Eq. (12). */
export function transitTime(V: number, L = TUBE.length): number {
  if (V <= 0) return Infinity;
  return L / V;
}

/** Volumetric flow rate [mL/min] at mean speed V [m/s] through radius R [m]. */
export function flowRateMlPerMin(V: number, R = TUBE.radius): number {
  const qM3PerS = Math.PI * R * R * V;
  return qM3PerS * 6e7; // m^3/s -> mL/min
}

/**
 * Metzner–Reed generalized Reynolds number for power-law pipe flow. Eq. (17).
 * Re ≲ 2100 is used as the laminar cutoff, same rule of thumb as Newtonian pipe flow.
 */
export function reynoldsMR(
  V: number,
  { K, n }: RheologyParams,
  D = TUBE.diameter,
  rho = BASE_XANTHAN.rho,
): number {
  if (V <= 0) return 0;
  const denom = Math.pow(8, n - 1) * K * Math.pow((3 * n + 1) / (4 * n), n);
  return (rho * Math.pow(V, 2 - n) * Math.pow(D, n)) / denom;
}

/** The five concentration levels used throughout the page (undiluted → heavily diluted). */
export const CONCENTRATION_LEVELS = [1, 0.75, 0.5, 0.25, 0.1] as const;

// A sequential ramp on the dune teal: darkest is undiluted, lightest is the
// most dilute, so the ordering reads without the legend.
export const CONCENTRATION_COLORS: Record<number, string> = {
  1: TINT.tealDeep, // undiluted
  0.75: TINT.tealDeep,
  0.5: TINT.tealDeep,
  0.25: DUNE.teal, // dune-teal
  0.1: TINT.tealWash,
};

/** Format a fraction as a whole-number percentage label, e.g. 0.75 -> "75%". */
export function pctLabel(phi: number): string {
  return `${Math.round(phi * 100)}%`;
}
