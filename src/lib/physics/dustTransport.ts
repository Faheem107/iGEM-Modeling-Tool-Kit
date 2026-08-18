/**
 * Source to receptor transport
 * ============================
 * Mirror of the Python in `scripts/transport_model.py`. See
 * `DUST_EXPOSURE_MODULE_SPEC.md` section 2 for why this is split three ways.
 *
 * Three mechanisms carry sand from a hotspot to a target site, at three very
 * different length scales. Conflating them is the main way this model could
 * mislead someone, so they are kept separate all the way to the UI.
 *
 *   1. Suspension  F = alpha(clay) x Q, tens to a thousand km, hours to days.
 *   2. Drift       the hotspot feeds the local sand supply, years to millennia.
 *   3. Saltation   treated patch to asset, metres, seconds.
 *
 * Sources
 *  - Marticorena & Bergametti 1995: saltation is 60 to 2000 um, creep above that,
 *    saltation layer of order 1 m.
 *  - Chappell et al. 2024 GRL Eq 3: alpha = 10^(0.134 clay% - 6.0), 0 to 20% clay.
 *  - Ferguson & Church 2004: settling velocity across Stokes and turbulent.
 *  - Benaafi et al., Arab J Geosci Table 1: grain statistics in phi.
 */

export const SALTATION_MIN_M = 60e-6;
export const SALTATION_MAX_M = 2000e-6;
/** Marticorena & Bergametti 1995: the saltation layer is of order 1 m. */
export const SALTATION_LAYER_H_M = 1.0;
/** Chappell Eq 3 is only valid to 20% clay. */
export const CLAY_CAP_PERCENT = 20;
/** Zender et al. 2003 emitted dust fraction for 0.1 to 10 um. */
export const EMITTED_DUST_FRACTION_M = 0.87;

const RHO_SAND = 2650;
const RHO_AIR = 1.225;
const G = 9.80665;
const NU_AIR = 1.81e-5 / RHO_AIR;

/** Benaafi et al. Table 1. The UAE transfer is the paper's own stated similarity. */
export const GRAIN_STATS = {
  "Rub al Khali": { meanPhi: 1.46, sortingPhi: 0.863, n: 12 },
  "Eastern Province": { meanPhi: 1.999, sortingPhi: 0.74, n: 9 },
  Sakaka: { meanPhi: 2.29, sortingPhi: 0.802, n: 12 },
} as const;

export type GrainKey = keyof typeof GRAIN_STATS;

export const phiToMetres = (phi: number): number => 2 ** -phi / 1000;

/** Ferguson & Church (2004), J. Sediment. Res. 74, 933. */
export function settlingVelocity(d: number, C1 = 18, C2 = 1): number {
  const R = (RHO_SAND - RHO_AIR) / RHO_AIR;
  return (R * G * d * d) / (C1 * NU_AIR + Math.sqrt(0.75 * C2 * R * G * d ** 3));
}

const erf = (x: number): number => {
  // Abramowitz & Stegun 7.1.26
  const s = Math.sign(x);
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-a * a);
  return s * y;
};

/** Mass fraction of a log2-normal grain size distribution finer than d. */
export function massFinerThan(d: number, meanPhi: number, sortingPhi: number): number {
  const phiC = -Math.log2(d * 1000);
  return 0.5 * (1 - erf((phiC - meanPhi) / sortingPhi / Math.SQRT2));
}

/** Ballistic settling range of one grain released from the saltation layer. */
export const saltationTravelDistance = (
  d: number,
  windSpeed: number,
  releaseH = SALTATION_LAYER_H_M,
): number => (windSpeed * releaseH) / settlingVelocity(d);

/**
 * Fraction of the SALTATING mass emitted at a source still airborne after
 * travelling `distanceM` downwind. This is the brief's "fraction of sand reaching
 * the target site", for the addressable mass.
 *
 * Deliberately an UPPER BOUND: it ignores repeated re-launch, which extends net
 * transport, and it ignores turbulence. Say so in the UI.
 */
export function nearFieldCaptureFraction(
  distanceM: number,
  windSpeed: number,
  grain: GrainKey = "Rub al Khali",
  nBins = 200,
): number {
  const { meanPhi, sortingPhi } = GRAIN_STATS[grain];
  const loPhi = -Math.log2(SALTATION_MAX_M * 1000);
  const hiPhi = -Math.log2(SALTATION_MIN_M * 1000);
  const step = (hiPhi - loPhi) / nBins;
  let reaching = 0;
  let total = 0;
  for (let i = 0; i < nBins; i++) {
    const p0 = loPhi + i * step;
    const p1 = p0 + step;
    const w =
      massFinerThan(phiToMetres(p0), meanPhi, sortingPhi) -
      massFinerThan(phiToMetres(p1), meanPhi, sortingPhi);
    total += w;
    if (saltationTravelDistance(phiToMetres((p0 + p1) / 2), windSpeed) >= distanceM) {
      reaching += w;
    }
  }
  return total > 0 ? reaching / total : 0;
}

export interface SandblastResult {
  /** F/Q sandblasting efficiency, m^-1. */
  alpha: number;
  /** True when the clay input was clamped at the 20% validity limit. */
  capped: boolean;
}

/** Chappell et al. 2024 GRL Eq 3, quoting Marticorena & Bergametti 1995. */
export function sandblastEfficiency(clayPercent: number): SandblastResult {
  const capped = clayPercent > CLAY_CAP_PERCENT;
  const c = Math.min(Math.max(clayPercent, 0), CLAY_CAP_PERCENT);
  return { alpha: 10 ** (0.134 * c - 6.0), capped };
}

/** Vertical dust flux F [kg/m2/s] from horizontal flux Q [kg/m/s]. */
export function verticalDustFlux(
  horizontalFluxQ: number,
  clayPercent: number,
  bareFraction = 1,
  snowFreeFraction = 1,
): SandblastResult & { F: number } {
  const { alpha, capped } = sandblastEfficiency(clayPercent);
  return {
    F: bareFraction * snowFreeFraction * EMITTED_DUST_FRACTION_M * horizontalFluxQ * alpha,
    alpha,
    capped,
  };
}

// --- geometry ---------------------------------------------------------------

/** Great-circle distance in km. */
export function haversineKm(
  lat1: number, lon1: number, lat2: number, lon2: number,
): number {
  const R = 6371;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = p2 - p1;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Initial bearing from point 1 to point 2, degrees from north. */
export function bearingDeg(
  lat1: number, lon1: number, lat2: number, lon2: number,
): number {
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * How well the resultant drift direction points from a hotspot at a target.
 * 1 is dead on, 0 is ninety degrees off or worse. Used for mechanism 2, the
 * multi-year sand pathway, and for weighting mechanism 1's plume alignment.
 */
export function alignment(rddDeg: number, targetBearingDeg: number): number {
  if (!Number.isFinite(rddDeg)) return 0;
  const diff = Math.abs(((rddDeg - targetBearingDeg + 540) % 360) - 180);
  return Math.max(0, Math.cos((diff * Math.PI) / 180));
}
