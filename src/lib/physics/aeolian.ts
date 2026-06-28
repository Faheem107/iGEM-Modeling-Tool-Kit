/**
 * Approach 3 — Aeolian Fluid Dynamics & Sand Erosion Thresholds
 * =============================================================
 * Implements the modeling-subteam theory exactly:
 *   Eq 7  baseline threshold friction velocity (untreated dry sand)
 *   Eq 8  cohesion-modified threshold (engineered crust adds γ_biofilm)
 *   Eq 9  Bagnold saltation mass flux above threshold
 *
 * All prongs feed this module through a single quantity: the effective interparticle
 * cohesion γ [N/m]. γ-PGA & alginate contribute via shear modulus G; CaCO₃ via UCS.
 * This is what lets ANY prong combination resolve to one macro erosion-resistance result.
 */

import { PHYS, AEOLIAN_CALIB, cval } from './constants';

export interface AeolianInputs {
  /** Grain diameter d [m] (desert quartz ≈ 1–3 ×10⁻⁴ m). */
  grainDiameter: number;
  /** Actual friction velocity u* [m/s] imposed by the wind. */
  frictionVelocity: number;
  /** Effective interparticle cohesion γ [N/m] from the active prong(s). */
  cohesion: number;
}

export interface AeolianResult {
  /** Eq 7 — untreated threshold friction velocity u*t0 [m/s]. */
  uStarT0: number;
  /** Eq 8 — treated (cohesion-enhanced) threshold u*t [m/s]. */
  uStarT: number;
  /** Saltation mass flux of the UNtreated bed [kg·m⁻¹·s⁻¹]. */
  fluxUntreated: number;
  /** Saltation mass flux of the treated bed [kg·m⁻¹·s⁻¹]. */
  fluxTreated: number;
  /** Protection factor = flux_untreated / flux_treated (≥1; ∞ if treated immobile). */
  protectionFactor: number;
  /** Fractional reduction in transported mass, 0–1. */
  fluxReduction: number;
}

/** u* = ratio · U∞  (log-law surface coupling). */
export const uStarToFreestream = (uStar: number): number => uStar / cval(AEOLIAN_CALIB.uStarRatio);
export const freestreamToUStar = (uInf: number): number => uInf * cval(AEOLIAN_CALIB.uStarRatio);

/** Eq 7 — baseline threshold friction velocity for an untreated grain of diameter d. */
export function thresholdUntreated(grainDiameter: number): number {
  const A = cval(AEOLIAN_CALIB.A);
  const buoyancy = ((PHYS.RHO_SAND - PHYS.RHO_AIR) / PHYS.RHO_AIR) * PHYS.g * grainDiameter;
  return A * Math.sqrt(Math.max(0, buoyancy));
}

/**
 * Eq 8 — cohesion-modified threshold friction velocity.
 *   u*t = A·√[ (ρs−ρa)/ρa · g·d  +  γ/(ρa·d) ]
 * The added γ/(ρa·d) term is the interparticle adhesive force per unit inertia.
 */
export function thresholdTreated(grainDiameter: number, cohesion: number): number {
  const A = cval(AEOLIAN_CALIB.A);
  const buoyancy = ((PHYS.RHO_SAND - PHYS.RHO_AIR) / PHYS.RHO_AIR) * PHYS.g * grainDiameter;
  const cohesionTerm = Math.max(0, cohesion) / (PHYS.RHO_AIR * grainDiameter);
  return A * Math.sqrt(Math.max(0, buoyancy + cohesionTerm));
}

/**
 * Eq 9 — Bagnold saltation mass flux.
 *   q = C·(ρa/g)·u*³·(1 − u*t²/u*²)   for u* > u*t,  else 0
 */
export function saltationFlux(frictionVelocity: number, thresholdVelocity: number): number {
  if (frictionVelocity <= thresholdVelocity) return 0;
  const C = cval(AEOLIAN_CALIB.saltationC);
  const ratio2 = (thresholdVelocity * thresholdVelocity) / (frictionVelocity * frictionVelocity);
  return C * (PHYS.RHO_AIR / PHYS.g) * Math.pow(frictionVelocity, 3) * (1 - ratio2);
}

/** Full untreated-vs-treated comparison at one wind condition. */
export function solveAeolian(inp: AeolianInputs): AeolianResult {
  const uStarT0 = thresholdUntreated(inp.grainDiameter);
  const uStarT = thresholdTreated(inp.grainDiameter, inp.cohesion);

  const fluxUntreated = saltationFlux(inp.frictionVelocity, uStarT0);
  const fluxTreated = saltationFlux(inp.frictionVelocity, uStarT);

  const protectionFactor = fluxTreated <= 1e-12
    ? (fluxUntreated > 1e-12 ? Infinity : 1)
    : fluxUntreated / fluxTreated;

  const fluxReduction = fluxUntreated <= 1e-12 ? 0 : 1 - fluxTreated / fluxUntreated;

  return { uStarT0, uStarT, fluxUntreated, fluxTreated, protectionFactor, fluxReduction };
}

// --- Strength → cohesion bridges (the unifying conversion for every prong) ----

/** γ-PGA / alginate elastic shear modulus G [Pa] → cohesion γ [N/m]. */
export const cohesionFromShearModulus = (G: number): number =>
  Math.max(0, G) * cval(AEOLIAN_CALIB.cohesionPerG);

/** CaCO₃ unconfined compressive strength UCS [kPa] → cohesion γ [N/m]. */
export const cohesionFromUCS = (ucsKpa: number): number =>
  Math.max(0, ucsKpa) * cval(AEOLIAN_CALIB.cohesionPerUCS);
