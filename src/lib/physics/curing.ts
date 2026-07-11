/**
 * Curing & Deployment Timeline, how the crust rises to strength and then weathers away
 * ====================================================================================
 * The macro modules all report the crust's MATURE cohesion, its strength once fully cured. But in
 * the field the crust is neither instant nor permanent (NYUAD Research Table, Study 5):
 *
 *   • MATURATION (hours). The biofilm is sprayed at 0/8/16/24/32 h to stay hydrated and keep the
 *     MICP substrate topped up; it is "fully mature" at 32 h. Each binder cures on its own
 *     timescale, alginate gels on contact, γ-PGA sets within hours, and MICP calcite ripens slowly
 *     over the whole 32 h protocol. Modelled as a saturating approach to the mature cohesion,
 *     γ_p(t) = γ_p^mature · (1 − e^{−t/τ_p}).
 *
 *   • FIELD LIFE (months). Once cured the crust slowly weathers: γ-PGA biodegrades, alginate washes
 *     out, but the calcite cement persists. Each binder decays with its own half-life,
 *     γ_p(m) = γ_p^mature · 2^{−m/H_p}. When the total falls below the cohesion needed to survive the
 *     design wind, the crust is due for re-application (the protocol's ~6-month cadence).
 *
 * This is the mechanism behind the multi-prong advantage: a fast-setting polymer buys EARLY-AGE
 * strength (the crust resists wind within hours instead of days) while the durable calcite floor
 * EXTENDS the re-application interval, so a combination beats any single prong at both ends of the
 * timeline. Every parameter is a Calib in constants.ts (CURING_CALIB).
 */

import { CURING_CALIB, cval } from "./constants";
import {
  cohesionForThreshold,
  freestreamToUStar,
  thresholdTreated,
  uStarToFreestream,
} from "./aeolian";
import type { ProngId, ProngContribution } from "./composite";

/** Maturation time constant τ_p [h] for a prong's cure (bigger = slower to reach full strength). */
export function maturationTau(prong: ProngId): number {
  switch (prong) {
    case 1:
      return cval(CURING_CALIB.tauMaturePGA);
    case 2:
      return cval(CURING_CALIB.tauMatureCaCO3);
    case 3:
      return cval(CURING_CALIB.tauMatureAlginate);
  }
}

/** Field-life half-life H_p [months] for a prong (bigger = more durable). */
export function fieldHalfLifeMonths(prong: ProngId): number {
  switch (prong) {
    case 1:
      return cval(CURING_CALIB.halfLifePGAMonths);
    case 2:
      return cval(CURING_CALIB.halfLifeCaCO3Months);
    case 3:
      return cval(CURING_CALIB.halfLifeAlginateMonths);
  }
}

/** Fraction of a prong's mature strength reached after `hours` of curing (saturating). */
export const maturationFraction = (prong: ProngId, hours: number): number =>
  hours <= 0 ? 0 : 1 - Math.exp(-hours / maturationTau(prong));

/** Fraction of a prong's mature strength still retained after `months` in the field (decay). */
export const fieldRetention = (prong: ProngId, months: number): number =>
  months <= 0 ? 1 : Math.pow(2, -months / fieldHalfLifeMonths(prong));

export interface MaturationPoint {
  hour: number;
  /** Total cohesion at this cure age [N/m]. */
  total: number;
  /** Per-prong cohesion at this cure age [N/m]. */
  perProng: Partial<Record<ProngId, number>>;
}

export interface FieldPoint {
  month: number;
  /** Total surviving cohesion at this field age [N/m]. */
  total: number;
  /** Per-prong surviving cohesion at this field age [N/m]. */
  perProng: Partial<Record<ProngId, number>>;
}

export interface CuringTimeline {
  /** Cure-age series over the maturation window (hours). */
  maturation: MaturationPoint[];
  /** Field-age series over the deployment life (months). */
  field: FieldPoint[];
  /** Mature (fully-cured, fresh) total cohesion [N/m]. */
  matureCohesion: number;
  /** Cohesion the crust must keep to survive the design wind [N/m]. */
  survivalCohesion: number;
  /** Design survival wind speed [m/s]. */
  designWindMs: number;
  /** Hours to reach 95% of the mature cohesion. */
  hoursToMature: number;
  /** Fraction of mature strength already available at the first re-spray (8 h), the early-age metric. */
  earlyAgeFraction: number;
  /** Months until the total cohesion drops below the survival floor (Infinity if it never does within the horizon). */
  reapplyMonths: number;
  /** True if the crust still clears the survival floor at the protocol's re-apply cadence. */
  survivesToScheduledReapply: boolean;
  /** The protocol re-apply cadence checked against [months]. */
  scheduledReapplyMonths: number;
  /** Highest wind speed the freshly-cured crust withstands [m/s] (treated aeolian threshold). */
  maxSurvivableWindFresh: number;
}

export interface CuringOptions {
  /** Deployment grain diameter [m] (sets the survival cohesion floor). */
  grainDiameter: number;
  /** Design survival wind speed [m/s] (defaults to CURING_CALIB.designWindMs). */
  designWindMs?: number;
  /** Maturation horizon [h]. */
  matureHours?: number;
  /** Field horizon [months]. */
  fieldMonths?: number;
}

/**
 * Build the full curing + weathering timeline for a set of (already interaction-adjusted) per-prong
 * cohesion contributions. Each prong is matured on its own τ and weathered on its own half-life; the
 * survival floor comes from inverting the aeolian threshold at the design wind.
 */
export function curingTimeline(
  contributions: ProngContribution[],
  opts: CuringOptions,
): CuringTimeline {
  const mature = contributions.filter((c) => c.cohesion > 0);
  const matureCohesion = mature.reduce((s, c) => s + c.cohesion, 0);

  const designWindMs = opts.designWindMs ?? cval(CURING_CALIB.designWindMs);
  const matureHours = opts.matureHours ?? 48;
  const fieldMonths = opts.fieldMonths ?? 18;
  const scheduledReapplyMonths = cval(CURING_CALIB.reapplyIntervalMonths);
  const survivalCohesion = cohesionForThreshold(
    opts.grainDiameter,
    freestreamToUStar(designWindMs),
  );

  // --- Maturation series (hours) ---
  const maturation: MaturationPoint[] = [];
  const hStep = matureHours / 48;
  for (let i = 0; i <= 48; i++) {
    const hour = i * hStep;
    const perProng: Partial<Record<ProngId, number>> = {};
    let total = 0;
    for (const c of mature) {
      const v = c.cohesion * maturationFraction(c.prong, hour);
      perProng[c.prong] = v;
      total += v;
    }
    maturation.push({ hour, total, perProng });
  }

  // Hours to reach 95% of mature (fine scan; each prong saturating so the sum is monotone).
  let hoursToMature = matureHours;
  if (matureCohesion > 0) {
    for (let h = 0; h <= matureHours; h += 0.25) {
      const tot = mature.reduce(
        (s, c) => s + c.cohesion * maturationFraction(c.prong, h),
        0,
      );
      if (tot >= 0.95 * matureCohesion) {
        hoursToMature = h;
        break;
      }
    }
  }
  const earlyAgeFraction =
    matureCohesion > 0
      ? mature.reduce(
          (s, c) => s + c.cohesion * maturationFraction(c.prong, 8),
          0,
        ) / matureCohesion
      : 0;

  // --- Field-life series (months) ---
  const field: FieldPoint[] = [];
  const mStep = fieldMonths / 48;
  for (let i = 0; i <= 48; i++) {
    const month = i * mStep;
    const perProng: Partial<Record<ProngId, number>> = {};
    let total = 0;
    for (const c of mature) {
      const v = c.cohesion * fieldRetention(c.prong, month);
      perProng[c.prong] = v;
      total += v;
    }
    field.push({ month, total, perProng });
  }

  // Months until total drops below the survival floor (fine scan; decay is monotone).
  let reapplyMonths = Infinity;
  if (matureCohesion > survivalCohesion) {
    for (let m = 0; m <= fieldMonths; m += 0.1) {
      const tot = mature.reduce(
        (s, c) => s + c.cohesion * fieldRetention(c.prong, m),
        0,
      );
      if (tot < survivalCohesion) {
        reapplyMonths = m;
        break;
      }
    }
  } else {
    // Never clears the floor even fresh → immediate under-performance.
    reapplyMonths = 0;
  }
  const survivesToScheduledReapply = reapplyMonths >= scheduledReapplyMonths;
  const maxSurvivableWindFresh = uStarToFreestream(
    thresholdTreated(opts.grainDiameter, matureCohesion),
  );

  return {
    maturation,
    field,
    matureCohesion,
    survivalCohesion,
    designWindMs,
    hoursToMature,
    earlyAgeFraction,
    reapplyMonths,
    survivesToScheduledReapply,
    scheduledReapplyMonths,
    maxSurvivableWindFresh,
  };
}
