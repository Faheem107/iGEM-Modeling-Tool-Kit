/**
 * Ecology — Colony Spread (Fisher–KPP) + MazE/MazF Biocontainment
 * ================================================================
 * Turns the ecological-spread module's two questions into literature-anchored numbers instead of
 * one phenomenological "spread probability" slider:
 *
 *   1. HOW FAST does the living colony expand across the treated patch?
 *      Bacterial range expansion is a Fisher–Kolmogorov (KPP) travelling wave with front speed
 *          c = 2·√(D·µ)          [mm·h⁻¹]
 *      µ = edge specific growth rate [h⁻¹]; D = effective sliding-expansion diffusivity [mm²·h⁻¹].
 *      Ca²⁺ (dosed by prongs 1–2 for cross-linking / MICP) lowers D by complexing surfactin and
 *      disabling flagellum-independent sliding — a real spread-limiting synergy (PMC5374384).
 *
 *   2. HOW WELL is it contained? The MazE/MazF kill-switch has a per-cell-per-generation escape
 *      frequency p. Over a deployed population of N cells the expected number of escapees is N·p and
 *      the probability of ≥1 escapee is 1−(1−p)^N. Independent orthogonal switches multiply their
 *      escape frequencies (p_total = ∏ pᵢ), which is how a design crosses the NIH < 10⁻⁸ line.
 *
 * All constants live in constants.ts (ECOLOGY_CALIB) with sources + wet-lab calibration notes.
 */

import { ECOLOGY_CALIB as E, cval } from './constants';

/** Effective sliding-expansion diffusivity D [mm²·h⁻¹] as a function of local Ca²⁺ [mM].
 *  D(Ca) = D₀ / (1 + [Ca²⁺]/K) — surfactin-complexation suppression (Kubota & Kobayashi 2017). */
export function expansionDiffusivity(caConc_mM: number): number {
  const D0 = cval(E.motilityD0);
  const K = cval(E.caSuppressHalf);
  return D0 / (1 + Math.max(0, caConc_mM) / K);
}

/** Fisher–KPP colony front speed c = 2√(Dµ). Inputs: µ [h⁻¹], D [mm²·h⁻¹]. Returns mm·h⁻¹. */
export function fisherFrontSpeed(mu: number, D: number): number {
  return 2 * Math.sqrt(Math.max(0, D) * Math.max(0, mu));
}

/** Generation (doubling) time t_d = ln2/µ [h]. */
export function doublingTimeHours(mu: number): number {
  return mu > 0 ? Math.LN2 / mu : Infinity;
}

export interface FrontKinematics {
  /** Edge specific growth rate actually used [h⁻¹] (µ_max × vitality). */
  mu: number;
  /** Effective expansion diffusivity [mm²·h⁻¹] after Ca²⁺ suppression. */
  D: number;
  /** Fisher front speed [mm·h⁻¹]. */
  speed_mm_h: number;
  /** Same speed expressed per day [mm·day⁻¹] for readouts. */
  speed_mm_day: number;
  /** Colony doubling time [h]. */
  doubling_h: number;
  /** Fraction of the un-suppressed speed retained (1 = no Ca²⁺). */
  caRetainedFraction: number;
}

/**
 * Full front kinematics for a given colony vitality (0–1, folds moisture/nutrient/γ-PGA health)
 * and local Ca²⁺ [mM]. Vitality scales the reaction term µ; Ca²⁺ suppresses the diffusion term D.
 */
export function frontKinematics(vitality: number, caConc_mM: number): FrontKinematics {
  const mu = cval(E.muMax) * Math.max(0, Math.min(1, vitality));
  const D0 = cval(E.motilityD0);
  const D = expansionDiffusivity(caConc_mM);
  const speed = fisherFrontSpeed(mu, D);
  return {
    mu,
    D,
    speed_mm_h: speed,
    speed_mm_day: speed * 24,
    doubling_h: doublingTimeHours(mu),
    caRetainedFraction: D0 > 0 ? D / D0 : 1,
  };
}

/**
 * Cellular-automaton per-neighbour invasion probability for the (time-accelerated) colony map.
 * The lattice is a schematic visualiser, so this is a monotone function of the SAME physical
 * drivers as the rigorous Fisher speed — it rises with colony vitality (µ) and falls with Ca²⁺
 * suppression of sliding — rather than a literal mm→pixel conversion (which the mm·day⁻¹ readout
 * reports exactly). Kept in a runnable band so the map neither freezes nor floods.
 */
export function latticeInvasionProb(k: FrontKinematics, vitality: number): number {
  const v = Math.max(0, Math.min(1, vitality));
  return Math.max(0.08, Math.min(0.92, (0.15 + 0.75 * v) * k.caRetainedFraction));
}

// --- Biocontainment: kill-switch escape statistics -------------------------------------------

export interface EscapeStats {
  /** Per-cell-per-generation escape frequency actually used. */
  pEscape: number;
  /** Deployed viable population over the treated patch. */
  population: number;
  /** Expected number of escapees = N·p (the number that matters for release risk). */
  expectedEscapees: number;
  /** Probability of at least one escapee = 1 − (1−p)^N. */
  pAtLeastOne: number;
  /** True when the single-cell escape frequency meets the NIH < 10⁻⁸ target. */
  meetsNIH: boolean;
  /** True when the *expected escapees over the whole deployment* stays below 1. */
  containedAtScale: boolean;
}

/** Combine independent orthogonal kill-switches: escape frequencies multiply. */
export function combinedEscapeFrequency(perSwitch: number, nSwitches: number): number {
  return Math.pow(Math.max(0, perSwitch), Math.max(1, nSwitches));
}

/**
 * Escape statistics for a deployed population.
 * @param pEscape  per-cell-per-generation escape frequency (already combined across switches)
 * @param population deployed viable cell count
 */
export function escapeStatistics(pEscape: number, population: number): EscapeStats {
  const p = Math.max(0, Math.min(1, pEscape));
  const N = Math.max(0, population);
  const expected = N * p;
  // 1 − (1−p)^N, numerically stable for tiny p·N via expm1/log1p.
  const pAtLeastOne = -Math.expm1(N * Math.log1p(-p));
  return {
    pEscape: p,
    population: N,
    expectedEscapees: expected,
    pAtLeastOne,
    meetsNIH: p <= cval(E.nihEscapeThreshold),
    containedAtScale: expected < 1,
  };
}

/** Deployed viable population for a treated patch of the given physical span [mm] and live fraction. */
export function deployedPopulation(patchSpanMm: number, liveFraction: number): number {
  const areaCm2 = Math.pow(patchSpanMm / 10, 2); // mm² → cm²
  return areaCm2 * cval(E.fieldViableDensity) * Math.max(0, Math.min(1, liveFraction));
}
