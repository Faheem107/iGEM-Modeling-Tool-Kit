/**
 * Detailed B. subtilis central-carbon network for the Advanced FBA Portal.
 * =======================================================================
 * This is the SAME data the portal displays (glycolysis, PPP, TCA, overflow, PGA synthesis,
 * respiration, biomass, exchanges), moved into the physics layer so the portal solves it with
 * the shared, verified two-phase simplex in `fba.ts` instead of a hand-coded flux cascade.
 *
 * Two corrections make it a genuine, mass-balanced FBA:
 *   1. CO₂ and lactate were dead-end products (produced, never drained) → add EX_co2 / EX_lac
 *      sinks so a strict S·v=0 solve doesn't force their producers to zero.
 *   2. Uptake exchanges are written "-> metabolite" (coef +1); a genuine supply is therefore a
 *      POSITIVE flux bounded [0, cap]. `buildDetailedFbaNetwork` sets those bounds from the
 *      glucose/oxygen sliders (the legacy cascade ignored the stored bounds entirely).
 */

import type { FbaReaction, MetabolicNetwork } from "./fba";
import { solveFBA, type FbaSolution } from "./fba";

export type Subsystem =
  | "glycolysis"
  | "ppp"
  | "tca"
  | "overflow"
  | "biomass"
  | "pga_synthesis"
  | "respiration"
  | "exchanges";

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

export const DETAILED_METABOLITES: DetailedMetabolite[] = [
  { id: "glc_ext", name: "Glucose (Ext)", compartment: "extracellular" },
  { id: "g6p", name: "Glucose-6-Phosphate", compartment: "cytosol" },
  { id: "f6p", name: "Fructose-6-Phosphate", compartment: "cytosol" },
  { id: "fbp", name: "Fructose-1,6-Bisphosphate", compartment: "cytosol" },
  { id: "gap", name: "Glyceraldehyde-3-Phosphate", compartment: "cytosol" },
  { id: "dhap", name: "Dihydroxyacetone Phosphate", compartment: "cytosol" },
  { id: "pep", name: "Phosphoenolpyruvate", compartment: "cytosol" },
  { id: "pyr", name: "Pyruvate", compartment: "cytosol" },
  { id: "accoa", name: "Acetyl-CoA", compartment: "cytosol" },
  { id: "cit", name: "Citrate", compartment: "cytosol" },
  { id: "icit", name: "Isocitrate", compartment: "cytosol" },
  { id: "akg", name: "Alpha-Ketoglutarate", compartment: "cytosol" },
  { id: "succoa", name: "Succinyl-CoA", compartment: "cytosol" },
  { id: "succ", name: "Succinate", compartment: "cytosol" },
  { id: "oaa", name: "Oxaloacetate", compartment: "cytosol" },
  { id: "6pgc", name: "6-Phosphogluconate", compartment: "cytosol" },
  { id: "ru5p", name: "Ribulose-5-Phosphate", compartment: "cytosol" },
  { id: "ac_ext", name: "Acetate (Ext)", compartment: "extracellular" },
  { id: "lac_ext", name: "Lactate (Ext)", compartment: "extracellular" },
  { id: "l_glu", name: "L-Glutamate", compartment: "cytosol" },
  { id: "pga_ext", name: "PGA Biopolymer (Ext)", compartment: "extracellular" },
  { id: "nh3", name: "Ammonia", compartment: "cytosol" },
  { id: "o2", name: "Oxygen", compartment: "cytosol" },
  { id: "co2", name: "Carbon Dioxide", compartment: "cytosol" },
  { id: "atp", name: "ATP", compartment: "cytosol" },
  { id: "nadh", name: "NADH", compartment: "cytosol" },
  { id: "nadph", name: "NADPH", compartment: "cytosol" },
  { id: "biomass", name: "Biomass Portfolio", compartment: "cytosol" },
];

export const DETAILED_REACTIONS: DetailedReaction[] = [
  // Glycolysis
  {
    id: "R_GLCpts",
    name: "Glucose Transport (PTS)",
    gene: "ptsG",
    formula: "glc_ext + pep -> g6p + pyr",
    reversible: false,
    defaultLb: 0,
    defaultUb: 15,
    subsystem: "glycolysis",
    description:
      "B. subtilis phosphotransferase system consuming PEP to phosphorylate imported glucose.",
    stoich: { glc_ext: -1, pep: -1, g6p: 1, pyr: 1 },
  },
  {
    id: "R_PGI",
    name: "Phosphoglucose Isomerase",
    gene: "pgi",
    formula: "g6p <=> f6p",
    reversible: true,
    defaultLb: -100,
    defaultUb: 100,
    subsystem: "glycolysis",
    description:
      "Interconverts G6P to F6P. Major glycolysis–PPP bifurcation checkpoint.",
    stoich: { g6p: -1, f6p: 1 },
  },
  {
    id: "R_PFK",
    name: "Phosphofructokinase",
    gene: "pfkA",
    formula: "f6p + atp -> fbp",
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: "glycolysis",
    description:
      "Irreversible gateway step committing carbon to lower glycolysis via ATP phosphorylation.",
    stoich: { f6p: -1, atp: -1, fbp: 1 },
  },
  {
    id: "R_FBA",
    name: "Fructose-Bisphosphate Aldolase",
    gene: "fbaA",
    formula: "fbp <=> gap + dhap",
    reversible: true,
    defaultLb: -100,
    defaultUb: 100,
    subsystem: "glycolysis",
    description: "Splits 6C fructose to 3C glyceraldehyde & dihydroxyacetone.",
    stoich: { fbp: -1, gap: 1, dhap: 1 },
  },
  {
    id: "R_TPI",
    name: "Triosephosphate Isomerase",
    gene: "tpiA",
    formula: "dhap <=> gap",
    reversible: true,
    defaultLb: -100,
    defaultUb: 100,
    subsystem: "glycolysis",
    description:
      "Equilibrates the split triose pools for downstream phosphorylation.",
    stoich: { dhap: -1, gap: 1 },
  },
  {
    id: "R_GAPDH_PGK",
    name: "Lower Glycolysis Oxidation Cascade",
    gene: "gapA",
    formula: "gap -> pep + nadh + atp",
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: "glycolysis",
    description:
      "Oxidizes GAP to PEP, capturing reducing power as NADH and generating ATP.",
    stoich: { gap: -1, pep: 1, nadh: 1, atp: 1 },
  },
  {
    id: "R_PYK",
    name: "Pyruvate Kinase",
    gene: "pyk",
    formula: "pep -> pyr + atp",
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: "glycolysis",
    description:
      "Final glycolysis step generating pyruvate and ATP via substrate-level phosphorylation.",
    stoich: { pep: -1, pyr: 1, atp: 1 },
  },
  // Pentose phosphate pathway
  {
    id: "R_G6PDH",
    name: "G6P Dehydrogenase",
    gene: "zwf",
    formula: "g6p -> 6pgc + nadph",
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: "ppp",
    description:
      "Primary pathway diversion producing initial NADPH required for biopolymer synthesis.",
    stoich: { g6p: -1, "6pgc": 1, nadph: 1 },
  },
  {
    id: "R_GND",
    name: "6PG Dehydrogenase",
    gene: "gnd",
    formula: "6pgc -> ru5p + nadph + co2",
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: "ppp",
    description:
      "Oxidatively decarboxylates 6-phosphogluconate, yielding a second NADPH and pentose sugars.",
    stoich: { "6pgc": -1, ru5p: 1, nadph: 1, co2: 1 },
  },
  {
    id: "R_PPP_to_Glyc",
    name: "Pentose Recycle Cascade",
    gene: "tkt",
    formula: "3 ru5p <=> gap + 2 f6p",
    reversible: true,
    defaultLb: -100,
    defaultUb: 100,
    subsystem: "ppp",
    description:
      "Transketolase/transaldolase cascade routing intermediate pentoses back into glycolysis pools.",
    stoich: { ru5p: -3, gap: 1, f6p: 2 },
  },
  // TCA / PDH
  {
    id: "R_PDH",
    name: "Pyruvate Dehydrogenase",
    gene: "pdhA",
    formula: "pyr -> accoa + nadh + co2",
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: "tca",
    description:
      "Decarboxylates pyruvate, committing carbon into Acetyl-CoA and synthesizing 1 NADH.",
    stoich: { pyr: -1, accoa: 1, nadh: 1, co2: 1 },
  },
  {
    id: "R_CS",
    name: "Citrate Synthase",
    gene: "gltA",
    formula: "accoa + oaa -> cit",
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: "tca",
    description:
      "Condenses Acetyl-CoA with Oxaloacetate to initiate the TCA cycle.",
    stoich: { accoa: -1, oaa: -1, cit: 1 },
  },
  {
    id: "R_ACONT",
    name: "Aconitase",
    gene: "citB",
    formula: "cit <=> icit",
    reversible: true,
    defaultLb: -100,
    defaultUb: 100,
    subsystem: "tca",
    description:
      "Isomerizes citrate to isocitrate to set up oxidative decarboxylations.",
    stoich: { cit: -1, icit: 1 },
  },
  {
    id: "R_ICDH",
    name: "Isocitrate Dehydrogenase",
    gene: "citC",
    formula: "icit -> akg + nadph + co2",
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: "tca",
    description:
      "Major metabolic fork. Generates NADPH and alpha-ketoglutarate, the precursor for PGA polymer.",
    stoich: { icit: -1, akg: 1, nadph: 1, co2: 1 },
  },
  {
    id: "R_AKGDH",
    name: "Alpha-Ketoglutarate Dehydrogenase",
    gene: "odhA",
    formula: "akg -> succoa + nadh + co2",
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: "tca",
    description:
      "Competes directly with PGA synthesis by draining AKG to Succinyl-CoA.",
    stoich: { akg: -1, succoa: 1, nadh: 1, co2: 1 },
  },
  {
    id: "R_SUCOAS",
    name: "Succinyl-CoA Synthetase",
    gene: "sucC",
    formula: "succoa -> succ + atp",
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: "tca",
    description:
      "Substrate-level phosphorylation in the TCA cycle yielding Succinate and ATP.",
    stoich: { succoa: -1, succ: 1, atp: 1 },
  },
  {
    id: "R_SDH_FUM_MDH",
    name: "Malate & Oxaloacetate Regeneration",
    gene: "sdhA",
    formula: "succ -> oaa + 2 nadh",
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: "tca",
    description:
      "Lumped SDH+fumarase+MDH converting succinate back to oxaloacetate, synthesizing 2 NADH.",
    stoich: { succ: -1, oaa: 1, nadh: 2 },
  },
  {
    id: "R_PYC",
    name: "Pyruvate Carboxylase (anaplerosis)",
    gene: "pycA",
    formula: "pyr + atp + co2 -> oaa",
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: "tca",
    description:
      "Anaplerotic replenishment of oxaloacetate, refills the TCA cycle when α-ketoglutarate is drained to glutamate for PGA. Without it the cycle cannot sustain product synthesis.",
    stoich: { pyr: -1, atp: -1, co2: -1, oaa: 1 },
  },
  // Overflow
  {
    id: "R_PTA_ACK",
    name: "Acetate Overflow (PTA-ACK)",
    gene: "pta",
    formula: "accoa -> ac_ext + atp",
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: "overflow",
    description:
      "Overflow shunt used when carbon load exceeds respiratory capacity. Fast ATP but wastes acetate.",
    stoich: { accoa: -1, ac_ext: 1, atp: 1 },
  },
  {
    id: "R_LDH",
    name: "Lactate Dehydrogenase",
    gene: "ldh",
    formula: "pyr + nadh <=> lac_ext",
    reversible: true,
    defaultLb: -100,
    defaultUb: 100,
    subsystem: "overflow",
    description:
      "Acidic overflow during hypoxia, reoxidizing NADH pools rapidly.",
    stoich: { pyr: -1, nadh: -1, lac_ext: 1 },
  },
  // PGA synthesis
  {
    id: "R_GLUsyn",
    name: "Glutamate Synthase (transaminase)",
    gene: "gltD",
    formula: "akg + nadph + nh3 -> l_glu",
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: "pga_synthesis",
    description:
      "Synthesizes L-glutamate precursor by trapping ammonia. Crucial consumer of TCA α-ketoglutarate.",
    stoich: { akg: -1, nadph: -1, nh3: -1, l_glu: 1 },
  },
  {
    id: "R_PGAsyn",
    name: "PGA Synthase (Polymerizer)",
    gene: "pgas",
    formula: "l_glu + atp -> pga_ext",
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: "pga_synthesis",
    description:
      "Active iGEM operon. Polymerizes glutamate into extracellular poly-γ-glutamate, using ATP.",
    stoich: { l_glu: -1, atp: -1, pga_ext: 1 },
  },
  // Respiration & maintenance
  {
    id: "R_RESP",
    name: "Respiratory Phosphorylation (ETC)",
    gene: "ctaA",
    formula: "nadh + 0.5 o2 -> 2.5 atp",
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: "respiration",
    description:
      "Consumes oxygen to oxidize NADH, generating 2.5 ATP per NADH oxidized.",
    stoich: { nadh: -1, o2: -0.5, atp: 2.5 },
  },
  {
    id: "R_ATPM",
    name: "ATP Maintenance Requirement",
    gene: "maint",
    formula: "atp ->",
    reversible: false,
    defaultLb: 1.0,
    defaultUb: 100,
    subsystem: "respiration",
    description:
      "Forced base cellular energy demand to maintain viability and osmotic pressure.",
    stoich: { atp: -1 },
  },
  // Biomass
  {
    id: "R_Biomass",
    name: "Biomass Portfolio Synthesis",
    gene: "growth",
    formula:
      "0.1 g6p + 0.1 pep + 0.1 pyr + 0.1 accoa + 0.1 akg + 0.1 oaa + 2 atp + 1 nadph -> biomass",
    reversible: false,
    defaultLb: 0,
    defaultUb: 10,
    subsystem: "biomass",
    description:
      "Cell growth draining key precursors, energy, and reducing power.",
    stoich: {
      g6p: -0.1,
      pep: -0.1,
      pyr: -0.1,
      accoa: -0.1,
      akg: -0.1,
      oaa: -0.1,
      atp: -2.0,
      nadph: -1.0,
      biomass: 1,
    },
  },
  // Exchanges (uptake exchanges are re-bounded in buildDetailedFbaNetwork)
  {
    id: "EX_glc",
    name: "Glucose Uptake Exchange",
    gene: "exchange",
    formula: "-> glc_ext",
    reversible: false,
    defaultLb: 0,
    defaultUb: 15,
    subsystem: "exchanges",
    description: "Glucose supply from the surrounding soil interface.",
    stoich: { glc_ext: 1 },
  },
  {
    id: "EX_o2",
    name: "Oxygen Intake Exchange",
    gene: "exchange",
    formula: "-> o2",
    reversible: false,
    defaultLb: 0,
    defaultUb: 15,
    subsystem: "exchanges",
    description: "Regulates aerobic vs anaerobic soil-interface conditions.",
    stoich: { o2: 1 },
  },
  {
    id: "EX_nh3",
    name: "Ammonia Intake Exchange",
    gene: "exchange",
    formula: "-> nh3",
    reversible: false,
    defaultLb: 0,
    defaultUb: 1000,
    subsystem: "exchanges",
    description: "Nitrogen source for L-glutamate biosynthesis.",
    stoich: { nh3: 1 },
  },
  {
    id: "EX_ac",
    name: "Acetate Output Exchange",
    gene: "exchange",
    formula: "ac_ext ->",
    reversible: false,
    defaultLb: 0,
    defaultUb: 1000,
    subsystem: "exchanges",
    description: "Allows acetate overflow excretion.",
    stoich: { ac_ext: -1 },
  },
  {
    id: "EX_lac",
    name: "Lactate Output Exchange",
    gene: "exchange",
    formula: "lac_ext ->",
    reversible: false,
    defaultLb: 0,
    defaultUb: 1000,
    subsystem: "exchanges",
    description: "Drains fermentative lactate under hypoxia.",
    stoich: { lac_ext: -1 },
  },
  {
    id: "EX_co2",
    name: "CO₂ Release Exchange",
    gene: "exchange",
    formula: "co2 ->",
    reversible: false,
    defaultLb: 0,
    defaultUb: 1000,
    subsystem: "exchanges",
    description: "Releases respiratory/decarboxylation CO₂.",
    stoich: { co2: -1 },
  },
  {
    id: "EX_pga",
    name: "PGA Export Exchange",
    gene: "exchange",
    formula: "pga_ext ->",
    reversible: false,
    defaultLb: 0,
    defaultUb: 1000,
    subsystem: "exchanges",
    description:
      "Deposition of protective structural polymer onto surrounding sand.",
    stoich: { pga_ext: -1 },
  },
  {
    id: "EX_biomass",
    name: "Biomass Dilution Exchange",
    gene: "exchange",
    formula: "biomass ->",
    reversible: false,
    defaultLb: 0,
    defaultUb: 1000,
    subsystem: "exchanges",
    description: "Growth dilution / loss-rate drain.",
    stoich: { biomass: -1 },
  },
];

export const DETAILED_OBJ_PGA = "EX_PGA_OBJ_ALIAS"; // not used; objectives below
export const OBJECTIVE_PGA = "R_PGAsyn";
export const OBJECTIVE_BIOMASS = "R_Biomass";

/** gene → reaction id, so UI knockout toggles map onto reactions. */
export const GENE_TO_REACTION: Record<string, string> =
  DETAILED_REACTIONS.reduce(
    (m, r) => {
      m[r.gene] = r.id;
      return m;
    },
    {} as Record<string, string>,
  );

export interface DetailedFbaOptions {
  glucose: number; // max uptake (mmol/gDCW/h)
  oxygen: number; // max uptake
  /** gene → knocked-out? */
  knockouts?: Record<string, boolean>;
}

/** Assemble a genuine, mass-balanced MetabolicNetwork from the detailed catalogue. */
export function buildDetailedFbaNetwork(
  opts: DetailedFbaOptions,
): MetabolicNetwork {
  const koGenes = new Set(
    Object.entries(opts.knockouts ?? {})
      .filter(([, v]) => v)
      .map(([g]) => g),
  );
  const glc = Math.max(0, opts.glucose);
  const o2 = Math.max(0, opts.oxygen);

  const reactions: FbaReaction[] = DETAILED_REACTIONS.map((r) => {
    let lb = r.defaultLb;
    let ub = r.defaultUb;
    if (r.id === "EX_glc") {
      lb = 0;
      ub = glc;
    } else if (r.id === "EX_o2") {
      lb = 0;
      ub = o2;
    }
    // Knockout by gene → clamp flux to zero.
    if (koGenes.has(r.gene)) {
      lb = 0;
      ub = 0;
    }
    return { id: r.id, stoich: r.stoich, lb, ub };
  });

  return { metabolites: DETAILED_METABOLITES.map((m) => m.id), reactions };
}

export interface DetailedFbaResult {
  status: FbaSolution["status"];
  fluxMap: Record<string, number>;
  objectiveValue: number;
  /** Finite-difference shadow prices: d(objective)/d(uptake cap). */
  glucoseShadowPrice: number;
  oxygenShadowPrice: number;
}

/** Solve the detailed network for a chosen objective, with rigorous finite-difference duals. */
export function solveDetailedFBA(
  opts: DetailedFbaOptions,
  objective: string = OBJECTIVE_PGA,
): DetailedFbaResult {
  const net = buildDetailedFbaNetwork(opts);
  const sol = solveFBA(net, objective, true);

  // Shadow prices via a small perturbation of each uptake cap (only if that resource is used).
  const eps = 0.5;
  const objAt = (glucose: number, oxygen: number) =>
    solveFBA(
      buildDetailedFbaNetwork({ ...opts, glucose, oxygen }),
      objective,
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

  // Clean tiny numerical noise to zero for display stability.
  const fluxMap: Record<string, number> = {};
  for (const [id, v] of Object.entries(sol.fluxes)) {
    fluxMap[id] = Math.abs(v) < 1e-7 ? 0 : v;
  }

  return {
    status: sol.status,
    fluxMap,
    objectiveValue: sol.objectiveValue,
    glucoseShadowPrice,
    oxygenShadowPrice,
  };
}
