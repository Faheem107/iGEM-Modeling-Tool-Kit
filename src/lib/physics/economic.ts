/**
 * Economic Scalability, combination-aware deployment cost
 * ========================================================
 * The bacterial treatment (γ-PGA, CaCO₃, or both) is costed as one flat figure per
 * hectare, the business team's estimate of what one treated hectare costs with the
 * field application included. It replaced a bottom-up sum of fermentation, reagent and
 * application line items, which came to about 960 USD per hectare at a 5 mm crust.
 * Purchased alginate stays bottom-up (dose × price), since it is bought, not grown.
 * Bacterial routes share a one-time bioprocess capex; alginate needs none.
 * The result is compared against conventional chemical-spray and concrete-blanket baselines.
 */

import { ECONOMIC_CALIB as E, cval } from "./constants";
import type { ProngId } from "./composite";

export interface EconContext {
  /** Treated area [hectares]. */
  areaHa: number;
  /** Required crust thickness [mm]. Sets the volume the CO₂ figure is taken over. */
  crustThicknessMm: number;
  /** CaCO₃ CO₂ sequestered [g per L pore solution] (Prong 2). */
  co2SequesteredGPerL?: number;
}

export interface CombinationCost {
  prongs: ProngId[];
  capex: number;
  /** Bacterial treatment per hectare, application included [USD·ha⁻¹]. 0 without a bacterial route. */
  treatmentPerHa: number;
  /** Purchased alginate per hectare [USD·ha⁻¹]. 0 without Prong 3. */
  alginatePerHa: number;
  /** Application pass, charged only when there is no bacterial treatment to carry it [USD·ha⁻¹]. */
  applicationPerHa: number;
  /** Everything paid per hectare [USD·ha⁻¹]. */
  recurringPerHa: number;
  /** Total cost over the whole area [USD] = capex + recurring·area. */
  totalCost: number;
  /** All-in cost per hectare including amortised capex over the area [USD·ha⁻¹]. */
  costPerHa: number;
  /** Net CO₂ over the area [kg] (negative = net sequestration). */
  co2Total: number;
  /** Area [ha] at which this combination undercuts the chemical-spray baseline. */
  breakEvenHaVsChemical: number;
}

const M3_PER_HA = (thicknessMm: number) => 10000 * (thicknessMm / 1000); // m³ of crust per hectare

/** Full cost of a prong combination over the deployment area. */
export function combinationCost(
  prongs: ProngId[],
  ctx: EconContext,
): CombinationCost {
  // Bacterial prongs share one bioprocess capex and one treatment figure.
  const hasBacterial = prongs.some((p) => p === 1 || p === 2);
  const capex = hasBacterial ? cval(E.bacterialSetupCapex) : 0;
  const treatmentPerHa = hasBacterial ? cval(E.treatmentCostPerHa) : 0;
  const alginatePerHa = prongs.includes(3)
    ? cval(E.alginateDoseKgPerHa) * cval(E.alginateCostPerKg)
    : 0;
  // The treatment figure already pays for the spray pass.
  const applicationPerHa = hasBacterial ? 0 : cval(E.fieldApplicationCostPerHa);
  const recurringPerHa = treatmentPerHa + alginatePerHa + applicationPerHa;

  const area = Math.max(0, ctx.areaHa);
  const totalCost = capex + recurringPerHa * area;
  const costPerHa = area > 0 ? totalCost / area : recurringPerHa;

  const co2KgPerHa = prongs.includes(2)
    ? ((ctx.co2SequesteredGPerL ?? 0) / 1000) *
      (M3_PER_HA(ctx.crustThicknessMm) * 1000) // g/L × L(=m³·1000) → kg
    : 0;
  const co2Total = -co2KgPerHa * area; // sequestered

  // Break-even vs conventional chemical spray: capex / (chemical/ha − our recurring/ha).
  const margin = cval(E.chemicalSprayCostPerHa) - recurringPerHa;
  const breakEvenHaVsChemical = margin > 0 ? capex / margin : Infinity;

  return {
    prongs,
    capex,
    treatmentPerHa,
    alginatePerHa,
    applicationPerHa,
    recurringPerHa,
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
