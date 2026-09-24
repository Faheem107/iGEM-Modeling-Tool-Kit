/**
 * Adapter between the canonical network and the Advanced FBA Portal.
 * ==================================================================
 * This file used to hold a second copy of the stoichiometry, and the portal held a third for
 * display. The three disagreed: on the ATP yield of NADH oxidation (2.5 against 1.5), on the
 * cost of a gamma-PGA residue (1 ATP against 2), on whether succinate dehydrogenase reduces
 * NAD or the quinone pool, and on the biomass equation, where the display copy drew 0.1 mmol
 * of each precursor per gDCW, about a fortieth of the carbon a cell actually contains. The
 * portal displayed one set of equations and reported numbers from another.
 *
 * There is now one stoichiometry, in network.ts. This file only renames it.
 *
 * WHY THE PORTAL HAS MORE ARROWS THAN THE NETWORK HAS REACTIONS
 *   The portal draws individual enzymatic steps: phosphofructokinase, aldolase and triose
 *   phosphate isomerase as three arrows, aconitase separately from isocitrate dehydrogenase,
 *   and so on. The canonical network lumps each of those linear chains into one reaction,
 *   which is standard practice and changes nothing: a chain with no branch point carries the
 *   same flux at every step by mass balance. PORTAL_ALIAS therefore maps several display
 *   arrows onto one canonical reaction, and each arrow shows the flux that genuinely passes
 *   through it. No arrow shows a number that was not solved for.
 */

import type { MetabolicNetwork } from "./fba";
import { solveFBA, type FbaSolution } from "./fba";
import {
  buildCoreNetwork,
  CORE_REACTIONS,
  METABOLITE_INFO,
  OBJ_GROWTH,
  OBJ_PGA,
  type CoreReactionMeta,
  type Subsystem as CoreSubsystem,
} from "./network";

export type Subsystem = CoreSubsystem;

export interface DetailedReaction {
  id: string;
  name: string;
  gene: string;
  formula: string;
  reversible: boolean;
  defaultLb: number;
  defaultUb: number;
  subsystem: Subsystem;
  description: string;
  stoich: Record<string, number>;
}

export interface DetailedMetabolite {
  id: string;
  name: string;
  compartment: "cytosol" | "extracellular";
}

export const DETAILED_METABOLITES: DetailedMetabolite[] = Object.values(
  METABOLITE_INFO,
).map((m) => ({ id: m.id, name: m.name, compartment: m.compartment }));

/**
 * Display arrow id to canonical reaction id. Several arrows may share a target when they are
 * consecutive steps of a lumped linear chain; in that case they all carry the same flux,
 * which is the correct thing to show.
 */
export const PORTAL_ALIAS: Record<string, string> = {
  EX_glc: "EX_GLC",
  EX_o2: "EX_O2",
  EX_nh3: "EX_NH3",
  EX_co2: "EX_CO2",
  EX_ac: "EX_AC",
  EX_lac: "EX_LAC",
  EX_pga: "EX_PGA",
  EX_biomass: "EX_BIOM",
  R_GLCpts: "PTS",
  R_PGI: "PGI",
  R_PFK: "PFK",
  R_FBA: "PFK", // aldolase, same chain as phosphofructokinase
  R_TPI: "PFK", // triose phosphate isomerase, same chain
  R_FBP: "FBP",
  R_GAPDH_PGK: "GAPD",
  R_PYK: "PYK",
  R_PCK: "PCK",
  R_G6PDH: "ZWF",
  R_GND: "ZWF", // 6-phosphogluconate dehydrogenase, same chain as zwf
  R_PPP_to_Glyc: "TKT",
  R_PDH: "PDH",
  R_PYC: "PYC",
  R_CS: "CS",
  R_ACONT: "ICDH", // aconitase, same chain as isocitrate dehydrogenase
  R_ICDH: "ICDH",
  R_AKGDH: "AKGD",
  R_SUCOAS: "AKGD", // succinyl-CoA synthetase, same chain as odhAB
  R_SDH_FUM_MDH: "SDH",
  R_MDH: "MDH",
  R_ME: "ME",
  R_GLUsyn: "GOGAT",
  R_PGAsyn: "PGS",
  R_CAsyn: "CAS",
  R_RESP: "RESP",
  R_RESPQ: "RESPQ",
  R_ATPM: "ATPM",
  R_PTA_ACK: "OVF",
  R_LDH: "LDH",
  R_Biomass: "BIO",
};

const CANON_BY_ID: Record<string, CoreReactionMeta> = Object.fromEntries(
  CORE_REACTIONS.map((r) => [r.id, r]),
);

/** The canonical catalogue, presented under the portal's display ids. */
export const DETAILED_REACTIONS: DetailedReaction[] = Object.entries(PORTAL_ALIAS)
  .map(([displayId, canonId]) => {
    const c = CANON_BY_ID[canonId];
    if (!c) throw new Error(`PORTAL_ALIAS points at unknown reaction ${canonId}`);
    return {
      id: displayId,
      name: c.name,
      gene: c.gene ?? "exchange",
      formula: c.formula,
      reversible: c.reversible,
      defaultLb: c.lb,
      defaultUb: c.ub,
      subsystem: c.subsystem,
      description: c.description,
      stoich: c.stoich,
    };
  })
  .filter((r, i, all) => all.findIndex((x) => x.id === r.id) === i);

export const OBJECTIVE_PGA = OBJ_PGA;
export const OBJECTIVE_BIOMASS = OBJ_GROWTH;

/**
 * Gene name to canonical reaction id. Lumped reactions carry several gene names separated by
 * a slash, and each is registered, so deleting sucCD and deleting odhAB both clamp the
 * 2-oxoglutarate dehydrogenase lump.
 */
export const GENE_TO_REACTION: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const r of CORE_REACTIONS) {
    if (!r.gene) continue;
    for (const g of r.gene.split("/")) map[g] = r.id;
  }
  return map;
})();

export interface DetailedFbaOptions {
  glucose: number;
  oxygen: number;
  knockouts?: { [gene: string]: boolean };
}

export function buildDetailedFbaNetwork(opts: DetailedFbaOptions): MetabolicNetwork {
  const ko: string[] = [];
  for (const [gene, off] of Object.entries(opts.knockouts ?? {})) {
    if (!off) continue;
    const rxn = GENE_TO_REACTION[gene] ?? (CANON_BY_ID[gene] ? gene : undefined);
    if (rxn) ko.push(rxn);
  }
  return buildCoreNetwork({
    glucoseUb: opts.glucose,
    o2Ub: opts.oxygen,
    knockouts: ko,
  }).network;
}

export interface DetailedFbaResult {
  status: FbaSolution["status"];
  /** Keyed by canonical id AND by every display alias, so either lookup works. */
  fluxMap: Record<string, number>;
  objectiveValue: number;
  /**
   * Sensitivity of the objective to the uptake bound, obtained by perturbing the bound and
   * re-solving. This is the reduced cost on that bound, which is the quantity a bottleneck
   * plot should show. It is NOT a metabolite shadow price: the metabolite duals of this
   * network are degenerate, because several reactions form alternative optima of equal
   * objective value, so any single dual vector the solver reports is one of many.
   */
  glucoseShadowPrice: number;
  oxygenShadowPrice: number;
}

export function solveDetailedFBA(
  opts: DetailedFbaOptions,
  objective: string = OBJECTIVE_PGA,
): DetailedFbaResult {
  const canonicalObjective = PORTAL_ALIAS[objective] ?? objective;
  const sol = solveFBA(buildDetailedFbaNetwork(opts), canonicalObjective, true);

  const eps = 0.5;
  const objAt = (glucose: number, oxygen: number) =>
    solveFBA(
      buildDetailedFbaNetwork({ ...opts, glucose, oxygen }),
      canonicalObjective,
      true,
    ).objectiveValue;
  const base = sol.objectiveValue;
  const glucoseShadowPrice =
    opts.glucose > 0
      ? Math.max(0, (objAt(opts.glucose + eps, opts.oxygen) - base) / eps)
      : 0;
  const oxygenShadowPrice =
    opts.oxygen > 0
      ? Math.max(0, (objAt(opts.glucose, opts.oxygen + eps) - base) / eps)
      : 0;

  const fluxMap: Record<string, number> = {};
  for (const [id, v] of Object.entries(sol.fluxes)) {
    fluxMap[id] = Math.abs(v) < 1e-7 ? 0 : v;
  }
  // Mirror each canonical flux onto its display aliases.
  for (const [displayId, canonId] of Object.entries(PORTAL_ALIAS)) {
    if (canonId in fluxMap) fluxMap[displayId] = fluxMap[canonId];
  }

  return {
    status: sol.status,
    fluxMap,
    objectiveValue: sol.objectiveValue,
    glucoseShadowPrice,
    oxygenShadowPrice,
  };
}
