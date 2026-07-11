/**
 * Economic Scalability, combination-aware deployment cost
 * ========================================================
 * Cost is built bottom-up, per prong, then summed for whatever combination is deployed:
 *   Prong 1 (γ-PGA)  : fermentation, glucose + salts + utilities, scaled by broth yield.
 *   Prong 2 (CaCO₃)  : calcium feedstock + carbonic-anhydrase dosing, minus a CO₂ credit.
 *   Prong 3 (alginate): purchased commodity biopolymer + crosslinker, sprayed directly.
 * Bacterial prongs (1,2) share a one-time bioprocess capex; alginate needs none.
 * The result is compared against conventional chemical-spray and concrete-blanket baselines.
 */

import { ECONOMIC_CALIB as E, cval } from "./constants";
import type { ProngId } from "./composite";

export interface EconContext {
  /** Treated area [hectares]. */
  areaHa: number;
  /** Required crust thickness [mm]. */
  crustThicknessMm: number;
  /** γ-PGA broth yield [g·L⁻¹] (Prong 1 fermentation efficiency). */
  pgaYieldGPerL: number;
  /** Polymer loading target [kg·m⁻³ of treated soil] (Prong 1). */
  pgaDemandKgPerM3: number;
  /** CaCO₃ CO₂ sequestered [g per L pore solution] (Prong 2 climate credit). */
  co2SequesteredGPerL?: number;
}

export interface ProngCost {
  prong: ProngId;
  /** One-time capital cost [USD]. */
  capex: number;
  /** Recurring cost per hectare [USD·ha⁻¹]. */
  opexPerHa: number;
  /** Net CO₂ balance per hectare [kg·ha⁻¹] (negative = sequestered). */
  co2PerHa: number;
}

export interface CombinationCost {
  prongs: ProngId[];
  capex: number;
  opexPerHa: number;
  /** Field application pass (shared, once per combination) [USD·ha⁻¹]. */
  applicationPerHa: number;
  /** Total cost over the whole area [USD] = capex + (opex+application)·area. */
  totalCost: number;
  /** All-in cost per hectare including amortised capex over the area [USD·ha⁻¹]. */
  costPerHa: number;
  /** Net CO₂ over the area [kg] (negative = net sequestration). */
  co2Total: number;
  /** Area [ha] at which this combination undercuts the chemical-spray baseline. */
  breakEvenHaVsChemical: number;
}

const M3_PER_HA = (thicknessMm: number) => 10000 * (thicknessMm / 1000); // m³ of crust per hectare

/** Per-hectare recurring cost + capex + CO₂ for a single prong. */
export function prongTreatmentCost(
  prong: ProngId,
  ctx: EconContext,
): ProngCost {
  const volumePerHa = M3_PER_HA(ctx.crustThicknessMm);

  if (prong === 1) {
    // γ-PGA fermentation.
    const pgaKgPerHa = volumePerHa * ctx.pgaDemandKgPerM3;
    const yieldKgPerL = Math.max(1e-6, ctx.pgaYieldGPerL / 1000);
    const litersPerHa = pgaKgPerHa / yieldKgPerL;
    const perLiter =
      cval(E.glucoseMassFractionInMedia) * cval(E.glucoseCostPerKg) +
      cval(E.mediaSaltsCostPerL) +
      cval(E.utilitiesCostPerL);
    return {
      prong: 1,
      capex: cval(E.bacterialSetupCapex),
      opexPerHa: litersPerHa * perLiter,
      co2PerHa: 0,
    };
  }

  if (prong === 2) {
    // CaCO₃ / MICP: calcium + enzyme dosing, minus a CO₂ credit.
    const co2KgPerHa =
      ((ctx.co2SequesteredGPerL ?? 0) / 1000) * (volumePerHa * 1000); // g/L × L(=m³·1000) → kg
    const credit = co2KgPerHa * cval(E.co2CreditPerKg);
    return {
      prong: 2,
      capex: cval(E.bacterialSetupCapex),
      opexPerHa: Math.max(0, cval(E.caReagentCostPerHa) - credit),
      co2PerHa: -co2KgPerHa, // sequestered
    };
  }

  // Prong 3, purchased alginate commodity, no fermentation.
  const alginateOpex = cval(E.alginateDoseKgPerHa) * cval(E.alginateCostPerKg);
  return { prong: 3, capex: 0, opexPerHa: alginateOpex, co2PerHa: 0 };
}

/** Full cost of a prong combination over the deployment area. */
export function combinationCost(
  prongs: ProngId[],
  ctx: EconContext,
): CombinationCost {
  const per = prongs.map((p) => prongTreatmentCost(p, ctx));
  // Bacterial prongs share one bioprocess capex (don't double-count 1 & 2).
  const hasBacterial = prongs.some((p) => p === 1 || p === 2);
  const capex = hasBacterial ? cval(E.bacterialSetupCapex) : 0;
  const opexPerHa = per.reduce((s, c) => s + c.opexPerHa, 0);
  const applicationPerHa = cval(E.fieldApplicationCostPerHa);
  const co2PerHa = per.reduce((s, c) => s + c.co2PerHa, 0);

  const area = Math.max(0, ctx.areaHa);
  const recurringPerHa = opexPerHa + applicationPerHa;
  const totalCost = capex + recurringPerHa * area;
  const costPerHa = area > 0 ? totalCost / area : recurringPerHa;
  const co2Total = co2PerHa * area;

  // Break-even vs conventional chemical spray: capex / (chemical/ha − our recurring/ha).
  const chemPerHa = cval(E.chemicalSprayCostPerHa);
  const margin = chemPerHa - recurringPerHa;
  const breakEvenHaVsChemical = margin > 0 ? capex / margin : Infinity;

  return {
    prongs,
    capex,
    opexPerHa,
    applicationPerHa,
    totalCost,
    costPerHa,
    co2Total,
    breakEvenHaVsChemical,
  };
}

/** Conventional baseline costs per hectare. */
export const conventionalCostPerHa = {
  chemical: cval(E.chemicalSprayCostPerHa),
  concrete: cval(E.concreteBlanketCostPerHa),
};

/** Every non-empty subset of {1,2,3}, in a stable order. */
export function allProngCombinations(): ProngId[][] {
  const all: ProngId[] = [1, 2, 3];
  const out: ProngId[][] = [];
  for (let mask = 1; mask < 8; mask++) {
    const combo = all.filter((_, i) => mask & (1 << i));
    out.push(combo);
  }
  // Order by size then numerically for a readable comparison axis.
  return out.sort(
    (a, b) => a.length - b.length || a.join().localeCompare(b.join()),
  );
}
