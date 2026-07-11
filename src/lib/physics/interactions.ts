/**
 * Inter-prong interactions, what actually happens when prongs share a chassis and a soil
 * ======================================================================================
 * The three prongs are not independent. When combined they interact through concrete,
 * modellable mechanisms:
 *
 *   1. SHARED Ca²⁺ COMPETITION (physicochemical). All three prongs consume divalent calcium, *      γ-PGA carboxylate chelation, calcite precipitation, and alginate egg-box junctions all
 *      draw from the same finite soil Ca²⁺ pool. Co-applying them splits that pool, so each
 *      prong sees a lower effective [Ca²⁺] and yields a weaker binder than it would alone.
 *
 *   2. METABOLIC BURDEN (biological). γ-PGA (Prong 1) and carbonic anhydrase (Prong 2) are both
 *      heterologously expressed in the SAME engineered B. subtilis. Co-expression splits the
 *      carbon / ATP / amino-acid budget, so each product's titre falls below its single-strain
 *      maximum (a burden well documented for dual heterologous expression).
 *
 *   3. PHYSICOCHEMICAL SYNERGY (constructive). Acidic γ-PGA templates/toughens calcite nucleation
 *      (1+2), and alginate's moisture retention keeps the microhabitat damp enough to sustain CA
 *      precipitation (2+3). These are the positive η terms fed to compositeCohesion.
 *
 * Mechanisms 1 & 2 are applied to each prong's cohesion BEFORE the composite synergy term, so the
 * macro result reflects genuine competition rather than an opaque negative coefficient.
 */

import {
  INTERACTION_CALIB,
  COMPOSITE_CALIB,
  CROSSLINK_CALIB,
  ALGINATE_CALIB,
  cval,
} from "./constants";
import type { ProngId } from "./composite";

/** Every prong sequesters Ca²⁺; this is the binding-site capacity B_p [mM sites]. */
export function caDemandWeight(prong: ProngId): number {
  switch (prong) {
    case 1:
      return cval(INTERACTION_CALIB.caDemandPGA);
    case 2:
      return cval(INTERACTION_CALIB.caDemandCaCO3);
    case 3:
      return cval(INTERACTION_CALIB.caDemandAlginate);
  }
}

/** Effective Ca²⁺ dissociation constant K_d,p [mM] for each prong's binding sites. */
export function caKd(prong: ProngId): number {
  switch (prong) {
    case 1:
      return cval(CROSSLINK_CALIB.KdPGA); // γ-PGA carboxylate–Ca²⁺ (reversible)
    case 2:
      return cval(INTERACTION_CALIB.KdCalcite); // calcite: irreversible sink → high affinity
    case 3:
      return cval(ALGINATE_CALIB.KdCa); // alginate egg-box (high affinity)
  }
}

/** Langmuir Ca²⁺ occupancy θ = c/(Kd+c) of a prong at free calcium concentration c [mM]. */
const occupancy = (freeCa: number, kd: number) => freeCa / (kd + freeCa);

/**
 * Solve the shared free-Ca²⁺ concentration by mass balance (bisection):
 *   supply = c_free + Σ_p B_p · c_free/(K_d,p + c_free)
 * i.e. total calcium partitions between the free pool and each prong's occupied sites.
 */
function solveFreeCa(prongs: ProngId[], supply: number): number {
  const bound = (c: number) =>
    prongs.reduce((s, p) => s + caDemandWeight(p) * occupancy(c, caKd(p)), 0);
  let lo = 0;
  let hi = supply; // free Ca can never exceed total Ca
  for (let i = 0; i < 60; i++) {
    const mid = 0.5 * (lo + hi);
    if (mid + bound(mid) > supply) hi = mid;
    else lo = mid;
  }
  return 0.5 * (lo + hi);
}

export interface CalciumCompetition {
  /** Total Ca²⁺ binding-site capacity of the active prongs [mM sites]. */
  totalDemand: number;
  /** Shared soil Ca²⁺ supply pool [mM total Ca]. */
  supply: number;
  /** Shared free Ca²⁺ concentration at competitive equilibrium [mM]. */
  freeCa: number;
  /** Per-prong retained-binding factor 0–1 (occupancy under competition ÷ occupancy alone). */
  perProng: Record<ProngId, number>;
  /** Mean of perProng (single scalar for headline display). */
  factor: number;
  /** True when competition measurably reduces at least one prong's binding. */
  limited: boolean;
}

/**
 * Shared-Ca²⁺ competition via competitive Langmuir binding. Each prong's cohesion is scaled by how
 * much of its STANDALONE calcium binding it retains once it must share the pool with the others.
 * Because calcite (Prong 2) is modelled as an irreversible high-affinity sink, it preferentially
 * draws calcium and depresses the reversible polymer binders more than they depress it, a genuine,
 * asymmetric mechanism rather than a single uniform knock-down.
 */
export function calciumCompetition(prongs: ProngId[]): CalciumCompetition {
  const supply = cval(INTERACTION_CALIB.caSupplyCapacity);
  const totalDemand = prongs.reduce((s, p) => s + caDemandWeight(p), 0);
  const perProng = {} as Record<ProngId, number>;

  if (prongs.length === 0) {
    return {
      totalDemand,
      supply,
      freeCa: supply,
      perProng,
      factor: 1,
      limited: false,
    };
  }

  const freeShared = solveFreeCa(prongs, supply);
  let sum = 0;
  let anyLimited = false;
  for (const p of prongs) {
    const kd = caKd(p);
    const thetaShared = occupancy(freeShared, kd);
    const freeAlone = solveFreeCa([p], supply);
    const thetaAlone = occupancy(freeAlone, kd);
    const f = thetaAlone > 0 ? Math.min(1, thetaShared / thetaAlone) : 1;
    perProng[p] = f;
    sum += f;
    if (f < 0.98) anyLimited = true;
  }

  return {
    totalDemand,
    supply,
    freeCa: freeShared,
    perProng,
    factor: sum / prongs.length,
    limited: anyLimited,
  };
}

/**
 * Metabolic-burden factor for the shared B. subtilis chassis. Only γ-PGA (1) and CA (2) are
 * heterologously expressed; co-expressing both retains `coexpressionBurden` of each single-strain
 * titre. Returns 1 unless BOTH bacterial prongs are active.
 */
export function metabolicBurdenFactor(prongs: ProngId[]): number {
  const coExpressed = prongs.includes(1) && prongs.includes(2);
  return coExpressed ? cval(INTERACTION_CALIB.coexpressionBurden) : 1;
}

/**
 * Per-prong multiplier combining the interactions that reduce a prong's realised binder:
 * shared-Ca²⁺ competition (all prongs) × metabolic burden (γ-PGA & CA only, when co-expressed).
 */
export function prongYieldFactors(prongs: ProngId[]): Record<ProngId, number> {
  const ca = calciumCompetition(prongs);
  const burden = metabolicBurdenFactor(prongs);
  const out = {} as Record<ProngId, number>;
  for (const p of prongs) {
    const bacterialBurden = p === 1 || p === 2 ? burden : 1;
    out[p] = (ca.perProng[p] ?? 1) * bacterialBurden;
  }
  return out;
}

export type InteractionKind = "competition" | "burden" | "synergy";

export interface InteractionEffect {
  prongs: ProngId[];
  kind: InteractionKind;
  /** Short mechanism name. */
  mechanism: string;
  /** Signed magnitude as a percentage (negative = weakening, positive = strengthening). */
  percent: number;
  /** Plain-language description of the mechanism. */
  description: string;
}

/** Enumerate the active interaction mechanisms for a prong combination (for the UI breakdown). */
export function prongInteractions(prongs: ProngId[]): InteractionEffect[] {
  const effects: InteractionEffect[] = [];
  if (prongs.length < 2) return effects;

  // 1. Shared Ca²⁺ competition (any ≥2 prongs, since all three bind Ca²⁺), competitive Langmuir.
  const ca = calciumCompetition(prongs);
  if (ca.limited) {
    const worst = prongs.reduce(
      (w, p) => ((ca.perProng[p] ?? 1) < (ca.perProng[w] ?? 1) ? p : w),
      prongs[0],
    );
    const perProngText = prongs
      .map(
        (p) =>
          `${["γ-PGA", "CaCO₃", "Alginate"][p - 1]} −${((1 - (ca.perProng[p] ?? 1)) * 100).toFixed(0)}%`,
      )
      .join(", ");
    effects.push({
      prongs: [...prongs],
      kind: "competition",
      mechanism: "Shared Ca²⁺ competition",
      percent: -(1 - ca.factor) * 100,
      description: `All active prongs bind Ca²⁺ from one soil pool (${ca.supply.toFixed(1)} mM total); free Ca²⁺ falls to ${ca.freeCa.toFixed(2)} mM at equilibrium. Because binders have different affinities the hit is uneven (${perProngText}), the high-affinity calcite sink out-competes the reversible polymers, so ${["γ-PGA", "CaCO₃", "Alginate"][worst - 1]} loses most. Dosing more CaCl₂ relaxes it.`,
    });
  }

  // 2. Metabolic burden (γ-PGA + CA co-expressed in one B. subtilis).
  if (prongs.includes(1) && prongs.includes(2)) {
    const burden = metabolicBurdenFactor(prongs);
    effects.push({
      prongs: [1, 2],
      kind: "burden",
      mechanism: "Co-expression metabolic burden",
      percent: -(1 - burden) * 100,
      description: `γ-PGA synthase and carbonic anhydrase share the same engineered cell's carbon, ATP and amino-acid budget, so each product's titre falls to ~${(burden * 100).toFixed(0)}% of its single-strain maximum. Splitting the two functions across separate strains (co-culture) would avoid this.`,
    });
  }

  // 3. Physicochemical synergies (positive η pairs).
  if (prongs.includes(1) && prongs.includes(2)) {
    effects.push({
      prongs: [1, 2],
      kind: "synergy",
      mechanism: "γ-PGA → calcite nucleation template",
      percent: cval(COMPOSITE_CALIB.eta_PGA_CaCO3) * 100,
      description:
        "The acidic carboxylate groups of γ-PGA organise Ca²⁺ and seed calcite nucleation, giving a finer, tougher biocement than either binder alone.",
    });
  }
  if (prongs.includes(2) && prongs.includes(3)) {
    effects.push({
      prongs: [2, 3],
      kind: "synergy",
      mechanism: "Alginate moisture sustains precipitation",
      percent: cval(COMPOSITE_CALIB.eta_CaCO3_Alginate) * 100,
      description:
        "Alginate is a water-magnet; the damp microhabitat it maintains keeps the bacteria and carbonic anhydrase active for longer, sustaining CaCO₃ precipitation.",
    });
  }
  if (prongs.includes(1) && prongs.includes(3)) {
    effects.push({
      prongs: [1, 3],
      kind: "synergy",
      mechanism: "Co-retained surface moisture",
      percent: cval(COMPOSITE_CALIB.eta_PGA_Alginate) * 100,
      description:
        "Both γ-PGA and alginate are moisture-holding polyanions; together they keep the crust damp, though they also compete for the same Ca²⁺ (see above).",
    });
  }

  return effects;
}
