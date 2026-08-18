/**
 * Seasonal wind statistics
 * ========================
 * Mirror of `python_models/wind_stats.py`. Keep the two in step.
 *
 * Two things live here, both driven by the same seasonal wind data:
 *
 *  1. Weibull-integrated saltation flux. The Bagnold law of `aeolian.ts` (Eq 9)
 *     integrated exactly over a Weibull wind speed distribution. This is what makes
 *     a monthly mean flux correct: flux goes as roughly the cube of friction
 *     velocity above a threshold, so the flux of the mean wind is NOT the mean of
 *     the flux. Proven exact by `scripts/verify_weibull_flux.py`.
 *
 *  2. Fryberger drift potential, the standard aeolian measure of how much sand a
 *     wind regime can move and in which direction.
 *
 * Sources
 *  - Fryberger (1979), "Dune forms and wind regime", ch. 5 of A Study of Global
 *    Sand Seas, USGS Professional Paper 1052. The working equation Q = V²(V − Vt)t,
 *    "a modified form of the Lettau equation", is quoted in text by Khalaf &
 *    Al-Ajmi (1993), Geomorphology 6, 111–134.
 *  - Gulf impact threshold 5.4 m/s at 10 m: Khalaf & Al-Ajmi (1993), Kuwait.
 */

import { PHYS, AEOLIAN_CALIB, cval } from "./constants";

/** Fryberger's tables use knots, which yields drift potential in "vector units". */
export const KNOTS_PER_MS = 1.943844;

/** Khalaf & Al-Ajmi (1993): saltation in Kuwait begins at about 5.4 m/s at 10 m. */
export const GULF_IMPACT_THRESHOLD_MS = 5.4;

/** Γ(s) via Lanczos. The browser has no gamma function. */
function gammaFn(s: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (s < 0.5) return Math.PI / (Math.sin(Math.PI * s) * gammaFn(1 - s));
  s -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (s + i);
  const t = s + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, s + 0.5) * Math.exp(-t) * x;
}

/**
 * Upper incomplete gamma Γ(s, x) = ∫ₓ^∞ t^(s−1) e^(−t) dt.
 * Computed as Γ(s) − γ(s, x) with the standard lower-incomplete series.
 */
export function upperIncompleteGamma(s: number, x: number): number {
  if (x <= 0) return gammaFn(s);
  if (x > 60) return 0;
  let term = 1 / s;
  let total = term;
  for (let k = 1; k < 600; k++) {
    term *= x / (s + k);
    total += term;
    if (Math.abs(term) < 1e-17 * Math.abs(total)) break;
  }
  const lower = Math.exp(-x + s * Math.log(x)) * total;
  return gammaFn(s) - lower;
}

export interface WeibullFluxInputs {
  /** Weibull scale A [m/s] at the SAME reference height as `uStarRatio`, i.e. 10 m. */
  A: number;
  /** Weibull shape k, dimensionless. */
  k: number;
  /** Threshold expressed as a freestream wind speed at that height [m/s]. */
  uThreshold: number;
}

/**
 * Mean Bagnold saltation flux over a Weibull wind speed distribution [kg·m⁻¹·s⁻¹].
 *
 *   ⟨q⟩ = C·(ρa/g)·r³ · [ A³·Γ(1+3/k, x) − ut²·A·Γ(1+1/k, x) ],   x = (ut/A)^k
 *
 * Exact, not an approximation. No gustiness fudge factor.
 */
export function meanSaltationFlux({ A, k, uThreshold }: WeibullFluxInputs): number {
  if (A <= 0 || k <= 0) return 0;
  const r = cval(AEOLIAN_CALIB.uStarRatio);
  const C = cval(AEOLIAN_CALIB.saltationC);
  const ut = Math.max(uThreshold, 0);
  const x = Math.pow(ut / A, k);
  const g3 = upperIncompleteGamma(1 + 3 / k, x);
  const g1 = upperIncompleteGamma(1 + 1 / k, x);
  const val = Math.pow(A, 3) * g3 - ut * ut * A * g1;
  return Math.max(0, C * (PHYS.RHO_AIR / PHYS.g) * Math.pow(r, 3) * val);
}

/** One bin of a directional wind rose. */
export interface WindRoseBin {
  /** Direction the wind blows FROM, degrees from north (meteorological). */
  directionFrom: number;
  /** Mean speed in this bin [m/s] at 10 m. */
  speed: number;
  /** Fraction of the period this bin occupies. Bins should sum to 1. */
  timeFraction: number;
}

export interface DriftPotential {
  /** Drift potential, scalar sum, vector units. */
  DP: number;
  /** Resultant drift potential, vector sum magnitude, vector units. */
  RDP: number;
  /** Resultant drift direction, degrees, the direction sand moves TOWARD. */
  RDD: number;
  /** RDP/DP, Fryberger's unidirectionality index, 0 to 1. */
  UDI: number;
}

/**
 * Fryberger (1979) drift potential from a directional wind rose.
 * Q = V²(V − Vt)·t with V in knots, per Fryberger's convention.
 */
export function driftPotential(
  rose: WindRoseBin[],
  thresholdMs: number = GULF_IMPACT_THRESHOLD_MS,
): DriftPotential {
  const Vt = thresholdMs * KNOTS_PER_MS;
  let DP = 0;
  let vx = 0;
  let vy = 0;
  for (const { directionFrom, speed, timeFraction } of rose) {
    const V = speed * KNOTS_PER_MS;
    if (V <= Vt || timeFraction <= 0) continue;
    const q = V * V * (V - Vt) * timeFraction;
    DP += q;
    // sand moves toward where the wind is heading, 180° from "from"
    const toward = (((directionFrom + 180) % 360) * Math.PI) / 180;
    vx += q * Math.sin(toward);
    vy += q * Math.cos(toward);
  }
  const RDP = Math.hypot(vx, vy);
  const RDD = RDP > 0 ? ((Math.atan2(vx, vy) * 180) / Math.PI + 360) % 360 : NaN;
  return { DP, RDP, RDD, UDI: DP > 0 ? RDP / DP : 0 };
}
