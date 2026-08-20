import React, { useState, useMemo } from "react";
import {
  Play,
  Settings,
  RotateCcw,
  Cpu,
  Gauge,
  Layers,
  TrendingUp,
  Database,
  Activity,
  HelpCircle,
  Dna,
  Zap,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  XCircle,
  Sun,
  Moon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import GlossaryTerm from "./GlossaryTerm";
import { PORTAL_NAMES } from "@/content/copy";
import { DUNE, HAIRLINE, STATUS, SURFACE, TINT } from "@/src/lib/palette";
import {
  solveDetailedFBA,
  OBJECTIVE_PGA,
  OBJECTIVE_BIOMASS,
} from "../lib/physics/fbaDetailed";

// -------------------------------------------------------------
// METABOLIC MODEL DEFINITION FOR BACILLUS SUBTILIS CENTRAL METABOLISM
// -------------------------------------------------------------

interface Reaction {
  id: string;
  name: string;
  gene: string;
  formula: string;
  reversible: boolean;
  defaultLb: number;
  defaultUb: number;
  subsystem:
    | "glycolysis"
    | "ppp"
    | "tca"
    | "overflow"
    | "biomass"
    | "pga_synthesis"
    | "respiration"
    | "exchanges";
  description: string;
  leftToRightMap: { [metabolite: string]: number };
}

interface Metabolite {
  id: string;
  name: string;
  compartment: "cytosol" | "extracellular";
}

const METABOLITES: Metabolite[] = [
  { id: "glc_ext", name: "Glucose (Ext)", compartment: "extracellular" },
  { id: "glc", name: "Glucose (Cyt)", compartment: "cytosol" },
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
  { id: "fum", name: "Fumarate", compartment: "cytosol" },
  { id: "mal", name: "Malate", compartment: "cytosol" },
  { id: "oaa", name: "Oxaloacetate", compartment: "cytosol" },
  { id: "6pgc", name: "6-Phosphogluconate", compartment: "cytosol" },
  { id: "ru5p", name: "Ribulose-5-Phosphate", compartment: "cytosol" },
  { id: "actp", name: "Acetyl-Phosphate", compartment: "cytosol" },
  { id: "ac_ext", name: "Acetate (Ext)", compartment: "extracellular" },
  { id: "lac_ext", name: "Lactate (Ext)", compartment: "extracellular" },
  { id: "l_glu", name: "L-Glutamate", compartment: "cytosol" },
  { id: "pga_ext", name: "PGA Biopolymer(Ext)", compartment: "extracellular" },
  { id: "nh3", name: "Ammonia", compartment: "cytosol" },
  { id: "o2", name: "Oxygen", compartment: "cytosol" },
  { id: "co2", name: "Carbon Dioxide", compartment: "cytosol" },
  { id: "atp", name: "ATP", compartment: "cytosol" },
  { id: "nadh", name: "NADH", compartment: "cytosol" },
  { id: "nadph", name: "NADPH", compartment: "cytosol" },
  { id: "biomass", name: "Biomass Portfolio", compartment: "cytosol" },
];

const REACTIONS: Reaction[] = [
  // GLYCOLYSIS
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
      "B. subtilis phosphotransferase system consuming PEP to phosphorylate import glucose.",
    leftToRightMap: { glc_ext: -1, pep: -1, g6p: 1, pyr: 1 },
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
      "Interconverts G6P to F6P. Major glycolysis-PPP bifurcation checkpoint.",
    leftToRightMap: { g6p: -1, f6p: 1 },
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
    leftToRightMap: { f6p: -1, atp: -1, fbp: 1 },
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
    leftToRightMap: { fbp: -1, gap: 1, dhap: 1 },
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
    leftToRightMap: { dhap: -1, gap: 1 },
  },
  {
    id: "R_GAPDH_PGK",
    name: "Lower Glycolysis Oxidation Cascade",
    gene: "gapA",
    formula: "gap + atp -> pep + nadh + atp", // Simplified step: overall GAP -> PEP creates 1 NADH and yields ATP
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: "glycolysis",
    description:
      "Oxidizes GAP to PEP, capturing reducing power as NADH and generating redundant ATP.",
    leftToRightMap: { gap: -1, pep: 1, nadh: 1, atp: 1 },
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
    leftToRightMap: { pep: -1, pyr: 1, atp: 1 },
  },

  // PENTOSE PHOSPHATE PATHWAY (PPP)
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
    leftToRightMap: { g6p: -1, "6pgc": 1, nadph: 1 },
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
      "Oxidatively decarboxylates 6-phosphogluconate, yielding crucial second NADPH and pentose sugars.",
    leftToRightMap: { "6pgc": -1, ru5p: 1, nadph: 1, co2: 1 },
  },
  {
    id: "R_PPP_to_Glyc",
    name: "Pentose Recycle Cascade",
    gene: "tkt",
    formula: "ru5p -> gap + f6p", // Simplified Pentose recycling: 3 Ru5P <=> 2 F6P + GAP
    reversible: true,
    defaultLb: -100,
    defaultUb: 100,
    subsystem: "ppp",
    description:
      "Transketolase and transaldolase cascade routing intermediate pentoses back into glycolysis pools.",
    leftToRightMap: { ru5p: -3, gap: 1, f6p: 2 },
  },

  // TCA / PYRUVATE DEHYDROGENASE
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
      "Decarboxylates pyruvate, committing cellular carbon into Acetyl-CoA and synthesizing 1 NADH.",
    leftToRightMap: { pyr: -1, accoa: 1, nadh: 1, co2: 1 },
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
      "Condenses Acetyl-CoA with Oxaloacetate to initiate the TCA cycle spiral.",
    leftToRightMap: { accoa: -1, oaa: -1, cit: 1 },
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
    leftToRightMap: { cit: -1, icit: 1 },
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
      "Major metabolic fork. Generates NADPH and alpha-ketoglutarate, which is transaminated to the L-glutamate monomer that PGA is polymerised from.",
    leftToRightMap: { icit: -1, akg: 1, nadph: 1, co2: 1 },
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
      "Competes directly with PGA synthesis channels by draining AKG to Succinyl-CoA.",
    leftToRightMap: { akg: -1, succoa: 1, nadh: 1, co2: 1 },
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
      "Substrate level phosphorylation in TCA cycle yielding Succinate and ATP.",
    leftToRightMap: { succoa: -1, succ: 1, atp: 1 },
  },
  {
    id: "R_SDH_FUM_MDH",
    name: "Malate & Oxaloacetate Regeneration",
    gene: "sdhA",
    formula: "succ -> oaa + 2 nadh", // Combine SDH + fumarase + MDH for simpler model topology
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: "tca",
    description:
      "Converts succinate back to oxaloacetate to balance the cycle, synthesizing 2 reducing NADH.",
    leftToRightMap: { succ: -1, oaa: 1, nadh: 2 },
  },

  // OVERFLOW METABOLISM
  {
    id: "R_PTA_ACK",
    name: "Acetate Overflow (PTA-ACK)",
    gene: "pta",
    formula: "accoa -> actp -> ac_ext + atp", // Combined Acetate synthesis
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: "overflow",
    description:
      "Overflow shunt used when carbon load exceeds respiratory capacity. Generates fast ATP but wastes acetate.",
    leftToRightMap: { accoa: -1, ac_ext: 1, atp: 1 },
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
    leftToRightMap: { pyr: -1, nadh: -1, lac_ext: 1 },
  },

  // SPECIFIC iGEM POLY-γ-GLUTAMATE (PGA) SYNTHESIS
  {
    id: "R_GLUsyn",
    name: "Glutamate Synthase (Glt), transaminase",
    gene: "gltD",
    formula: "akg + nadph + nh3 -> l_glu",
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: "pga_synthesis",
    description:
      "Synthesizes L-glutamate precursor by trapping ammonia. Crucial consumer of TCA alpha-ketoglutarate.",
    leftToRightMap: { akg: -1, nadph: -1, nh3: -1, l_glu: 1 },
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
      "Active iGEM custom operon. Polymerizes glutamate into extracellular Poly-γ-glutamate biopolymer, utilizing ATP energy.",
    leftToRightMap: { l_glu: -1, atp: -1, pga_ext: 1 },
  },

  // RESPIRATION & MAINTENANCE
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
      "Consumes oxygen to oxidize NADH. Generates 2.5 equivalent ATP molecules per NADH oxidized.",
    leftToRightMap: { nadh: -1, o2: -0.5, atp: 2.5 },
  },
  {
    id: "R_ATPM",
    name: "ATP Maintenance Requirement",
    gene: "maint",
    formula: "atp -> ",
    reversible: false,
    defaultLb: 1.0, // Forced maintenance load
    defaultUb: 100,
    subsystem: "respiration",
    description:
      "Forced base cellular energy demand to maintain cell viability and osmotic pressure.",
    leftToRightMap: { atp: -1 },
  },

  // BIOMASS SYNTHESIS
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
      "Standard model for cell growth draining key metabolic precursors, energy, and reducing power.",
    leftToRightMap: {
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

  // EXCHANGES
  {
    id: "EX_glc",
    name: "Glucose Uptake Exchange",
    gene: "exchange",
    formula: "-> glc_ext",
    reversible: true,
    defaultLb: -10, // Max 10 mmol/gDCW/hr uptake
    defaultUb: 0,
    subsystem: "exchanges",
    description:
      "Matches the surrounding bio-mineralizing soil glucose concentration bounds.",
    leftToRightMap: { glc_ext: 1 },
  },
  {
    id: "EX_o2",
    name: "Oxygen Intake Exchange",
    gene: "exchange",
    formula: "-> o2",
    reversible: true,
    defaultLb: -15, // Oxygen limit
    defaultUb: 0,
    subsystem: "exchanges",
    description: "Regulates aerobic vs anaerobic soil interface conditions.",
    leftToRightMap: { o2: 1 },
  },
  {
    id: "EX_nh3",
    name: "Ammonia Intake Exchange",
    gene: "exchange",
    formula: "-> nh3",
    reversible: true,
    defaultLb: -100,
    defaultUb: 100,
    subsystem: "exchanges",
    description: "Source nitrogen for L-glutamate biosynthesis pathways.",
    leftToRightMap: { nh3: 1 },
  },
  {
    id: "EX_ac",
    name: "Acetate Output Exchange",
    gene: "exchange",
    formula: "ac_ext ->",
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: "exchanges",
    description: "Allows acetate overflow excretion out of target cells.",
    leftToRightMap: { ac_ext: -1 },
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
      "Precipitation/deposition of protective structural polymer on surrounding sand coordinates.",
    leftToRightMap: { pga_ext: -1 },
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
    description: "Growth dilution/loss rate mapping.",
    leftToRightMap: { biomass: -1 },
  },
];

// -------------------------------------------------------------
// FBA SOLVE, delegated to the shared, mass-balanced physics core
// -------------------------------------------------------------
// Genuine Flux Balance Analysis: the portal solves the detailed B. subtilis network with the
// two-phase simplex in src/lib/physics (fba.ts + fbaDetailed.ts), the single source of truth
// shared with the simulation workspace. The old hand-coded flux cascade and the duplicate
// in-file simplex have been removed.
export function calculateFluxes(
  glucose: number,
  oxygen: number,
  knockouts: { [gene: string]: boolean },
  objective: string,
) {
  const objRxn =
    objective === "Biomass" || objective === "R_Biomass"
      ? OBJECTIVE_BIOMASS
      : OBJECTIVE_PGA;
  const res = solveDetailedFBA({ glucose, oxygen, knockouts }, objRxn);

  const isBiomass = objRxn === OBJECTIVE_BIOMASS;
  const rawObjective = isBiomass
    ? res.fluxMap["R_Biomass"] || 0
    : res.fluxMap["R_PGAsyn"] || 0;

  const bottlenecks: {
    label: string;
    price: number;
    bottleneckScore: number;
  }[] = [];
  if (glucose > 0.1)
    bottlenecks.push({
      label: "Glucose Substrate Availability Limit",
      price: res.glucoseShadowPrice,
      bottleneckScore: Math.min(100, res.glucoseShadowPrice * 60),
    });
  if (oxygen > 0.1)
    bottlenecks.push({
      label: "Oxygen Dissolution Coefficient",
      price: res.oxygenShadowPrice,
      bottleneckScore: Math.min(100, res.oxygenShadowPrice * 60),
    });

  const activeReactions = Object.values(res.fluxMap).filter(
    (v) => Math.abs(v) > 1e-6,
  ).length;

  return {
    fluxMap: res.fluxMap,
    rawObjective,
    status:
      res.status === "optimal"
        ? "Optimal flux distribution found"
        : res.status === "infeasible"
          ? "No feasible solution for these constraints"
          : "Objective is unbounded",
    bottlenecks,
    iterations: activeReactions,
  };
}

// -------------------------------------------------------------
// MAIN COMPONENT EXPORT
// -------------------------------------------------------------

export default function AdvancedFbaPortal({
  isLightMode,
  onUpdatePrecursorFlux,
}: {
  isLightMode: boolean;
  onUpdatePrecursorFlux?: (val: number) => void;
}) {
  // Simulator operational parameters
  const [substrateGlucoseSl, setSubstrateGlucoseSl] = useState<number>(12.0);
  const [dissolvedOxygenSl, setDissolvedOxygenSl] = useState<number>(10.0);
  const [hypoxiaMode, setHypoxiaMode] = useState<boolean>(false);
  const [currentObjective, setCurrentObjective] = useState<string>("R_PGAsyn"); // default maximizes visual iGEM biopolymer

  // Glossary and active tooltips state management
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Pulse animation state for metric recalculations
  const [pulseMetric, setPulseMetric] = useState<boolean>(false);

  // Custom gene knockouts state
  const [knockoutList, setKnockoutList] = useState<{ [gene: string]: boolean }>(
    {
      ptsG: false,
      pgi: false,
      pfkA: false,
      zwf: false,
      pdhA: false,
      gltA: false,
      sucC: false,
      pta: false,
      pgas: false,
    },
  );

  // Calculate outputs dynamically using useMemo with an EXHAUSTIVE dependency array under Directive 2
  const glucoseInput = substrateGlucoseSl;
  const oxygenInput = hypoxiaMode ? 0.0 : dissolvedOxygenSl;
  const activeKnockouts = knockoutList;
  const activeObjective =
    currentObjective === "R_PGAsyn" ? "Poly-y-PGA Yield" : "Biomass";

  const fbaResults = useMemo(() => {
    return calculateFluxes(
      glucoseInput,
      oxygenInput,
      activeKnockouts,
      activeObjective,
    );
  }, [glucoseInput, oxygenInput, activeKnockouts, activeObjective]);

  // Derived dashboard analytics from core FBA solution
  const metabolicFlux = fbaResults.fluxMap;
  const growthRate = metabolicFlux["R_Biomass"] || 0;
  const pgaSynthesisFlux = metabolicFlux["R_PGAsyn"] || 0;

  // Pulse effect handler upon flux recalculations
  React.useEffect(() => {
    setPulseMetric(true);
    const timer = setTimeout(() => setPulseMetric(false), 600);
    return () => clearTimeout(timer);
  }, [
    pgaSynthesisFlux,
    knockoutList,
    substrateGlucoseSl,
    dissolvedOxygenSl,
    hypoxiaMode,
    currentObjective,
  ]);

  // Propagate the optimized precursor output flux to the parent dashboard context
  React.useEffect(() => {
    if (onUpdatePrecursorFlux) {
      onUpdatePrecursorFlux(pgaSynthesisFlux);
    }
  }, [pgaSynthesisFlux, onUpdatePrecursorFlux]);

  // ATP Yield mapping: ATP generated sum vs consumed
  const atpProductionRate = useMemo(() => {
    let prod = 0;
    // PFK consumes 1, PYK generates 1, Respiratory ETC generates 2.5 per NADH, lower glyco oxidation generates 1
    if (metabolicFlux["R_PYK"]) prod += metabolicFlux["R_PYK"];
    if (metabolicFlux["R_GAPDH_PGK"]) prod += metabolicFlux["R_GAPDH_PGK"];
    if (metabolicFlux["R_RESP"]) prod += metabolicFlux["R_RESP"] * 2.5;
    if (metabolicFlux["R_PTA_ACK"]) prod += metabolicFlux["R_PTA_ACK"];
    if (metabolicFlux["R_SUCOAS"]) prod += metabolicFlux["R_SUCOAS"];
    return prod;
  }, [metabolicFlux]);

  // Transferred NADPH capacity for active biosynthesis
  const nadphProductionRate = useMemo(() => {
    let p = 0;
    if (metabolicFlux["R_G6PDH"]) p += metabolicFlux["R_G6PDH"];
    if (metabolicFlux["R_GND"]) p += metabolicFlux["R_GND"];
    if (metabolicFlux["R_ICDH"]) p += metabolicFlux["R_ICDH"];
    return p;
  }, [metabolicFlux]);

  // top 5 key fluxes leaderboard
  const leaderboardFluxes = useMemo(() => {
    return [
      {
        id: "EX_glc",
        name: "Glucose Uptake Exchange",
        flux: Math.abs(metabolicFlux["EX_glc"] || 0),
        unit: "mmol/gDCW/h",
        color: "bg-dune-teal",
        textColor: "text-dune-teal",
        desc: "Primary carbon supply rate entering glycolysis",
      },
      {
        id: "R_GAPDH_PGK",
        name: "Glycolysis oxidation (GAP -> PEP)",
        flux: Math.abs(metabolicFlux["R_GAPDH_PGK"] || 0),
        unit: "mmol/gDCW/h",
        color: "bg-dune-teal",
        textColor: "text-dune-teal",
        desc: "Commitment of sugars toward lower metabolism",
      },
      {
        id: "R_PTA_ACK",
        name: "Acetate Waste Overflow (PTA-ACK)",
        flux: Math.abs(metabolicFlux["R_PTA_ACK"] || 0),
        unit: "mmol/gDCW/h",
        color: "bg-dune-rose",
        textColor: "text-dune-rose",
        desc: "Wasted energy shunt, bypasses the TCA cycle",
        toggleGene: "pta",
        isKnockedOut: knockoutList["pta"],
      },
      {
        id: "R_Biomass",
        name: "Biomass Division Growth (Specific Rate)",
        flux: Math.abs(metabolicFlux["R_Biomass"] || 0),
        unit: "1/h",
        color: "bg-dune-orange",
        textColor: "text-dune-orange",
        desc: "Specific cellular replication speed",
      },
      {
        id: "R_GLUsyn",
        name: "L-Glutamate Precursor synthesis",
        flux: Math.abs(metabolicFlux["R_GLUsyn"] || 0),
        unit: "mmol/gDCW/h",
        color: "bg-dune-teal",
        textColor: "text-dune-teal",
        desc: "Precursor committed to sand-grout PGA biopolymer",
      },
    ];
  }, [metabolicFlux, knockoutList]);

  // Sophisticated, academic palette config based on light/dark mode triggers
  const skyColor = isLightMode ? TINT.tealDeep : DUNE.teal;
  const roseColor = isLightMode ? TINT.roseDeep : DUNE.rose;
  const emeraldColor = isLightMode ? TINT.roseDeep : DUNE.rose;
  const dormantColor = isLightMode ? DUNE.ash : DUNE.ash;
  const labelColor = isLightMode ? DUNE.ink : TINT.sandWash;

  // Dynamic SVG path properties calculated according to custom metabolic loads
  const getPathProps = (
    rxnId: string,
    activeColor: string,
    markerName: string,
  ) => {
    const flux = Math.abs(metabolicFlux[rxnId] || 0);
    const hasFlux = flux > 0.05;
    // Represent Flux Magnitude (v) purely through elegant line thickness (stroke-width)
    const strokeWidth = hasFlux
      ? Math.max(1.8, Math.min(8.2, 1.8 + flux * 0.38))
      : 1.0;
    // Subtle luminosity: active color or dormant color
    const stroke = hasFlux ? activeColor : dormantColor;

    // "ZERO Flux (0.0): A faint, dull-gray dotted line, indicating it is dormant." - continuous otherwise!
    const style = !hasFlux ? { strokeDasharray: "3 3" } : undefined;
    const markerEnd = `url(#arrow-${hasFlux ? markerName : "stone"})`;

    return {
      stroke,
      strokeWidth,
      style,
      markerEnd,
      className: "transition-all duration-300",
    };
  };

  // Knockout trigger switch
  const handleToggleKnockout = (gene: string) => {
    setKnockoutList((prev) => ({ ...prev, [gene]: !prev[gene] }));
  };

  // Reset simulator toggles
  const handleResetParameters = () => {
    setSubstrateGlucoseSl(12.0);
    setDissolvedOxygenSl(10.0);
    setHypoxiaMode(false);
    setKnockoutList({
      ptsG: false,
      pgi: false,
      pfkA: false,
      zwf: false,
      pdhA: false,
      gltA: false,
      sucC: false,
      pta: false,
      pgas: false,
    });
  };

  return (
    <div
      className={`p-6 transition-colors duration-300 font-sans ${
        isLightMode
          ? "bg-dune-sand text-foreground"
          : "bg-dune-ink text-foreground"
      }`}
      id="fba-sim-portal-frame"
    >
      {/* Simulation Banner Summary */}
      <div
        className={`p-4 rounded-[6px] border mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors duration-300 ${
          isLightMode
            ? "bg-dune-orange/60 border-dune-orange/10"
            : "bg-dune-ink border-border"
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`p-2 rounded-[4px] ${isLightMode ? "bg-dune-orange text-dune-orange" : "bg-dune-orange/50 text-dune-teal border border-dune-orange/50"}`}
          >
            <Cpu
              className="h-4 w-4 animate-spin"
              style={{ animationDuration: "6s" }}
            />
          </div>
          <div>
            <h2 className="text-[length:var(--text-micro)] font-black uppercase tracking-wider font-mono">
              {PORTAL_NAMES.pipeline}
            </h2>
            <p className="text-[length:var(--text-caption)] text-muted-foreground mt-1">
              Simulating{" "}
              <GlossaryTerm
                term="flux balance analysis"
                theme={isLightMode ? "light" : "dark"}
              >
                Flux Balance Analysis
              </GlossaryTerm>{" "}
              (S • v = 0) of 32 central reactions in <em>Bacillus subtilis</em>.
            </p>
          </div>
        </div>

        {/* Diagnostic indicators */}
        <div className="flex gap-2 flex-wrap font-mono text-[length:var(--text-caption)]">
          <div
            className={`px-2 py-1 rounded-[4px] border flex items-center gap-2 ${
              fbaResults.status === "Optimal" ||
              fbaResults.status === "Feasible"
                ? isLightMode
                  ? "bg-dune-teal border-dune-teal text-dune-teal"
                  : "bg-dune-teal/20 border-dune-teal/40 text-dune-teal"
                : isLightMode
                  ? "bg-dune-rose border-dune-rose text-dune-rose"
                  : "bg-dune-rose/20 border-dune-rose/40 text-dune-rose"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping"></span>
            Solver Status: {fbaResults.status}
          </div>
          <div
            className={`px-2 py-1 rounded-[4px] border ${isLightMode ? "bg-muted border-border" : "bg-dune-basalt/50 border-border"}`}
          >
            Objective Vol:{" "}
            <span className="font-extrabold">
              {fbaResults.rawObjective.toFixed(4)}
            </span>
          </div>
          <div
            className={`px-2 py-1 rounded-[4px] border ${isLightMode ? "bg-muted border-border" : "bg-dune-basalt/50 border-border"}`}
          >
            Pivots:{" "}
            <span className="text-dune-teal font-bold">
              {fbaResults.iterations}
            </span>
          </div>
        </div>
      </div>

      {/* Grid Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ----------------- LEFT COLUMN: CONTROLS & GAUGES (4 Cols) ----------------- */}
        <div className="lg:col-span-4 space-y-6">
          {/* Objective Target & Inputs */}
          <div
            className={`p-6 rounded-[6px] border space-y-4 ${
              isLightMode
                ? "bg-white border-dune-orange/10 "
                : "bg-dune-ink border-border"
            }`}
          >
            <h3
              className={`text-[length:var(--text-micro)] font-black uppercase tracking-wider font-mono pb-2 border-b flex justify-between items-center ${
                isLightMode
                  ? "text-foreground border-dune-orange/10"
                  : "text-foreground border-border"
              }`}
            >
              <span className="flex items-center gap-2">
                <Settings className={`w-4 h-4 text-dune-teal`} /> Input
                Boundaries
              </span>
              <button
                onClick={handleResetParameters}
                className={`p-1 rounded-[4px] cursor-pointer transition text-[length:var(--text-caption)] font-semibold border ${
                  isLightMode
                    ? "bg-muted text-muted-foreground border-border hover:bg-secondary"
                    : "bg-dune-basalt text-muted-foreground border-border hover:bg-card"
                }`}
                title="Reset boundaries and knockouts"
              >
                <RotateCcw className="w-2.5 h-2.5 inline mr-1" /> Reset
              </button>
            </h3>

            {/* Objective Selector */}
            <div className="space-y-2">
              <label
                className={`text-[length:var(--text-caption)] font-extrabold uppercase font-mono block ${isLightMode ? "text-dune-orange" : "text-dune-teal"}`}
              >
                Mathematical Objective (Maximize)
              </label>
              <div
                className={`grid grid-cols-2 p-1 rounded-[4px] border text-[length:var(--text-caption)] font-mono gap-1 ${
                  isLightMode
                    ? "bg-background border-border"
                    : "bg-dune-ink border-border"
                }`}
              >
                <button
                  onClick={() => setCurrentObjective("R_PGAsyn")}
                  className={`py-2 rounded-[4px] cursor-pointer transition text-center ${
                    currentObjective === "R_PGAsyn"
                      ? isLightMode
                        ? "bg-dune-orange text-foreground font-bold"
                        : "bg-dune-orange text-dune-orange border border-dune-orange/60 font-black"
                      : isLightMode
                        ? "text-muted-foreground hover:text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Poly-γ-PGA Yield
                </button>
                <button
                  onClick={() => setCurrentObjective("R_Biomass")}
                  className={`py-2 rounded-[4px] cursor-pointer transition text-center ${
                    currentObjective === "R_Biomass"
                      ? isLightMode
                        ? "bg-dune-orange text-foreground font-bold"
                        : "bg-dune-orange text-dune-orange border border-dune-orange/60 font-black"
                      : isLightMode
                        ? "text-muted-foreground hover:text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Biomass (Growth)
                </button>
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <div className="flex justify-between text-[length:var(--text-caption)]">
                  <span className="font-semibold">
                    Glucose Max Uptake Rate:
                  </span>
                  <span className="font-mono font-bold text-dune-teal">
                    {substrateGlucoseSl.toFixed(1)} mmol/g·h
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="0.5"
                  value={substrateGlucoseSl}
                  onChange={(e) =>
                    setSubstrateGlucoseSl(parseFloat(e.target.value))
                  }
                  className={`w-full cursor-ew-resize accent-dune-teal ${isLightMode ? "bg-secondary" : "bg-dune-basalt"}`}
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[length:var(--text-caption)]">
                  <span className="font-semibold">Oxygen Substrate Limit:</span>
                  <span className="font-mono font-bold text-dune-teal">
                    {hypoxiaMode
                      ? "0.0 (Anaerobic)"
                      : `${dissolvedOxygenSl.toFixed(1)} mmol/g·h`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="0.5"
                  disabled={hypoxiaMode}
                  value={dissolvedOxygenSl}
                  onChange={(e) =>
                    setDissolvedOxygenSl(parseFloat(e.target.value))
                  }
                  className={`w-full cursor-ew-resize accent-dune-teal disabled:opacity-30 ${isLightMode ? "bg-secondary" : "bg-dune-basalt"}`}
                />
              </div>

              {/* Hypoxia Toggle Switches */}
              <div
                className={`p-2 rounded-[4px] border flex items-center justify-between text-[length:var(--text-micro)] transition-colors ${
                  isLightMode
                    ? "bg-card/40 border-dune-orange/10"
                    : "bg-dune-ink border-border"
                }`}
              >
                <div>
                  <span className="font-bold font-mono block text-[length:var(--text-caption)] uppercase">
                    Hypoxic/Anaerobic Soil Mode
                  </span>
                  <span className="text-[length:var(--text-caption)] text-muted-foreground block mt-1">
                    Shuts oxygen exchange inflow to zero
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={hypoxiaMode}
                  onChange={() => setHypoxiaMode(!hypoxiaMode)}
                  className="h-4 w-4 accent-dune-maroon cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Genetic Knockout Sandbox (Simulating ∆zwf, ∆pta, etc) */}
          <div
            className={`p-6 rounded-[6px] border space-y-4 ${
              isLightMode
                ? "bg-white border-dune-orange/10 "
                : "bg-dune-ink border-border"
            }`}
          >
            <div>
              <h3
                className={`text-[length:var(--text-micro)] font-black uppercase tracking-wider font-mono flex items-center gap-2 pb-2 border-b ${
                  isLightMode
                    ? "text-foreground border-dune-orange/10"
                    : "text-foreground border-border"
                }`}
              >
                <Dna className="h-4 w-4 text-dune-rose" /> iGEM Knockout Sandbox
              </h3>
              <p className="text-[length:var(--text-caption)] text-muted-foreground mt-1">
                Induce single gene deletions. Simplex reroutes carbon fluxes
                dynamically.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[length:var(--text-caption)] font-mono">
              {[
                { gene: "ptsG", label: "∆ptsG (Glucose Transport)" },
                { gene: "pgi", label: "∆pgi (Glycolysis check)" },
                { gene: "pfkA", label: "∆pfkA (Forces PPP redirection)" },
                { gene: "zwf", label: "∆zwf (Halves NADPH generator)" },
                { gene: "pdhA", label: "∆pdhA (Decarboxylase blockage)" },
                { gene: "gltA", label: "∆gltA (Blocks TCA cycles)" },
                { gene: "sucC", label: "∆sucC (Succinyl pathways)" },
                { gene: "pta", label: "∆pta (Eliminates Acetate wasting)" },
                { gene: "pgas", label: "∆pgas (iGEM Polymerase off)" },
              ].map((item) => (
                <button
                  key={item.gene}
                  onClick={() => handleToggleKnockout(item.gene)}
                  className={`p-2 rounded-[4px] border text-left cursor-pointer transition-all flex items-center justify-between ${
                    knockoutList[item.gene]
                      ? isLightMode
                        ? "bg-dune-rose border-dune-rose text-dune-rose font-bold"
                        : "bg-dune-rose/20 border-dune-rose/80 text-dune-rose"
                      : isLightMode
                        ? "bg-background border-border text-muted-foreground hover:bg-muted"
                        : "bg-muted border-border text-muted-foreground hover:bg-dune-basalt"
                  }`}
                >
                  <span>{item.label}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${knockoutList[item.gene] ? "bg-dune-rose" : "bg-muted/30"}`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Energy Co-Factor Yield Dashboard (Gauges) */}
          <div
            className={`p-4 rounded-[6px] border space-y-4 ${
              isLightMode
                ? "bg-white border-dune-orange/10 "
                : "bg-dune-ink border-border"
            }`}
          >
            <h3
              className={`text-[length:var(--text-micro)] font-black uppercase tracking-wider font-mono flex items-center gap-2 pb-1 border-b ${
                isLightMode
                  ? "text-foreground border-dune-orange/10"
                  : "text-foreground border-border"
              }`}
            >
              <Gauge className="h-4 w-4 text-dune-orange" /> Co-Factor
              Biosynthetic Yields
            </h3>

            <div className="grid grid-cols-2 gap-4 pt-1">
              {/* ATP production box */}
              <div
                className={`p-2 rounded-[4px] border text-center ${
                  isLightMode
                    ? "bg-background border-border"
                    : "bg-dune-basalt/40 border-border"
                }`}
              >
                <span className="text-[length:var(--text-caption)] text-muted-foreground uppercase font-mono tracking-wider block">
                  ATP Production Rate
                </span>
                <span
                  className={`font-mono text-[length:var(--text-h3)] font-black block my-1 ${isLightMode ? "text-dune-orange" : "text-dune-orange"}`}
                >
                  {atpProductionRate.toFixed(2)}
                </span>
                <span className="text-[length:var(--text-caption)] text-muted-foreground">mmol / gDCW·h</span>
              </div>

              {/* NADPH efficiency circle */}
              <div
                className={`p-2 rounded-[4px] border text-center ${
                  isLightMode
                    ? "bg-background border-border"
                    : "bg-dune-basalt/40 border-border"
                }`}
              >
                <span className="text-[length:var(--text-caption)] text-muted-foreground uppercase font-mono tracking-wider block">
                  Anabolic NADPH Yield
                </span>
                <span
                  className={`font-mono text-[length:var(--text-h3)] font-black block my-1 ${isLightMode ? "text-dune-teal" : "text-dune-teal"}`}
                >
                  {nadphProductionRate.toFixed(2)}
                </span>
                <span className="text-[length:var(--text-caption)] text-muted-foreground">mmol / gDCW·h</span>
              </div>
            </div>

            {/* Explainer note */}
            <div className="p-2 bg-dune-orange/20 rounded-[4px] border border-dune-orange/10 text-[length:var(--text-caption)] text-muted-foreground leading-tight">
              Glutamate synthesis pathways require 1 full mole of{" "}
              <strong
                className={isLightMode ? "text-dune-teal" : "text-dune-teal"}
              >
                NADPH
              </strong>, while biopolymer polymerization drains{" "}
              <strong
                className={isLightMode ? "text-dune-orange" : "text-dune-orange"}
              >
                ATP
              </strong>{" "}
              coordinates. Redirection increases yields.
            </div>
          </div>
        </div>

        {/* ----------------- CENTER COLUMN: METABOLIC SVG NETWORK (8 Cols) ----------------- */}
        <div className="lg:col-span-8 space-y-6">
          {/* SVG Metabolic Map */}
          <div
            className={`p-6 rounded-[6px] border relative ${
              isLightMode
                ? "bg-card border-dune-orange/10 "
                : "bg-dune-ink border-border"
            }`}
          >
            <div className="flex justify-between items-center mb-4">
              <h3
                className={`text-[length:var(--text-micro)] font-black uppercase tracking-wider font-mono flex items-center gap-2 ${
                  isLightMode ? "text-foreground" : "text-foreground"
                }`}
              >
                <Activity className="h-4 w-4 text-dune-teal font-extrabold" />{" "}
                Active Analytical Metabolic Flux Map
              </h3>
              <span
                className={`text-[length:var(--text-caption)] font-mono px-2 py-1 rounded-[4px] border ${
                  isLightMode
                    ? "bg-dune-sand border-dune-orange"
                    : "bg-dune-ink border-border"
                }`}
              >
                Thicker Arrows = Elevated Flux Magnitude
              </span>
            </div>

            {/* Non-overlapping flow channel legend bar */}
            <div
              className={`flex flex-wrap items-center gap-4 text-[length:var(--text-caption)] font-mono p-2 rounded-[4px] border mb-4 transition-all ${
                isLightMode
                  ? "bg-card border-dune-orange/10 text-foreground"
                  : "bg-dune-ink/90 border-border text-foreground"
              }`}
            >
              <span className="font-extrabold uppercase text-[length:var(--text-caption)] text-dune-rose select-none">
                Flow Channels Legend:
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: skyColor }}
                ></span>
                <span className={isLightMode ? "text-foreground font-bold" : ""}>
                  Sky Blue = Glycolytic transport
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: roseColor }}
                ></span>
                <span className={isLightMode ? "text-foreground font-bold" : ""}>
                  Rose Pink = Pentose & Glutamate synthesis
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: emeraldColor }}
                ></span>
                <span className={isLightMode ? "text-foreground font-bold" : ""}>
                  Emerald = TCA & PGA final export
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full border border-border"
                  style={{ backgroundColor: dormantColor }}
                ></span>
                <span
                  className={isLightMode ? "text-foreground font-medium" : ""}
                >
                  Dull Gray = Dormant paths (Dotted)
                </span>
              </div>
            </div>

            {/* Glowing Flow SVG Container */}
            <div
              className={`relative border rounded-[4px] h-[410px] overflow-hidden select-none ${
                isLightMode
                  ? "bg-card border-dune-orange/5"
                  : "bg-dune-ink/95 border-border"
              }`}
            >
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 800 400"
                className="absolute top-0 left-0"
              >
                <defs>
                  {/* Small, sleek, academic triangle arrowheads */}
                  <marker
                    id="arrow-sky"
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 7.5 5 L 0 8.5 z" fill={skyColor} />
                  </marker>
                  <marker
                    id="arrow-rose"
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 7.5 5 L 0 8.5 z" fill={roseColor} />
                  </marker>
                  <marker
                    id="arrow-emerald"
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 7.5 5 L 0 8.5 z" fill={emeraldColor} />
                  </marker>
                  <marker
                    id="arrow-stone"
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 7.5 5 L 0 8.5 z" fill={dormantColor} />
                  </marker>
                </defs>

                {/* ------------------- STAGE 1: METABOLITE NODE CIRCLES WITH CLEAN BORDERS ------------------- */}
                {/* Glucose ext */}
                <circle
                  cx="50"
                  cy="80"
                  r="15"
                  fill={isLightMode ? SURFACE.light : DUNE.ink}
                  stroke={isLightMode ? HAIRLINE.dark : DUNE.ash}
                  strokeWidth="1.5"
                />
                <text
                  x="50"
                  y="83"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="bold"
                  fill={labelColor}
                  className="font-sans select-none pointer-events-none"
                >
                  GlcExt
                </text>

                {/* G6P */}
                <circle
                  cx="160"
                  cy="80"
                  r="15"
                  fill={isLightMode ? SURFACE.light : DUNE.ink}
                  stroke={skyColor}
                  strokeWidth="2"
                />
                <text
                  x="160"
                  y="83"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="bold"
                  fill={labelColor}
                  className="font-sans select-none pointer-events-none"
                >
                  G6P
                </text>

                {/* F6P */}
                <circle
                  cx="280"
                  cy="80"
                  r="15"
                  fill={isLightMode ? SURFACE.light : DUNE.ink}
                  stroke={skyColor}
                  strokeWidth="1.5"
                />
                <text
                  x="280"
                  y="83"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="bold"
                  fill={labelColor}
                  className="font-sans select-none pointer-events-none"
                >
                  F6P
                </text>

                {/* FBP */}
                <circle
                  cx="280"
                  cy="180"
                  r="15"
                  fill={isLightMode ? SURFACE.light : DUNE.ink}
                  stroke={skyColor}
                  strokeWidth="1.5"
                />
                <text
                  x="280"
                  y="183"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="semibold"
                  fill={labelColor}
                  className="font-sans select-none pointer-events-none"
                >
                  FBP
                </text>

                {/* GAP */}
                <circle
                  cx="160"
                  cy="230"
                  r="15"
                  fill={isLightMode ? SURFACE.light : DUNE.ink}
                  stroke={skyColor}
                  strokeWidth="1.5"
                />
                <text
                  x="160"
                  y="233"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="semibold"
                  fill={labelColor}
                  className="font-sans select-none pointer-events-none"
                >
                  GAP
                </text>

                {/* PEP */}
                <circle
                  cx="160"
                  cy="330"
                  r="15"
                  fill={isLightMode ? SURFACE.light : DUNE.ink}
                  stroke={skyColor}
                  strokeWidth="1.5"
                />
                <text
                  x="160"
                  y="333"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="semibold"
                  fill={labelColor}
                  className="font-sans select-none pointer-events-none"
                >
                  PEP
                </text>

                {/* Pyr */}
                <circle
                  cx="290"
                  cy="330"
                  r="15"
                  fill={isLightMode ? SURFACE.light : DUNE.ink}
                  stroke={skyColor}
                  strokeWidth="1.5"
                />
                <text
                  x="290"
                  y="333"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="semibold"
                  fill={labelColor}
                  className="font-sans select-none pointer-events-none"
                >
                  Pyr
                </text>

                {/* PPP 6PGC */}
                <circle
                  cx="160"
                  cy="150"
                  r="15"
                  fill={isLightMode ? SURFACE.light : DUNE.ink}
                  stroke={roseColor}
                  strokeWidth="1.5"
                />
                <text
                  x="160"
                  y="153"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="semibold"
                  fill={labelColor}
                  className="font-sans select-none pointer-events-none"
                >
                  6PGC
                </text>

                {/* PPP Ru5P */}
                <circle
                  cx="80"
                  cy="190"
                  r="15"
                  fill={isLightMode ? SURFACE.light : DUNE.ink}
                  stroke={roseColor}
                  strokeWidth="1.5"
                />
                <text
                  x="80"
                  y="193"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="semibold"
                  fill={labelColor}
                  className="font-sans select-none pointer-events-none"
                >
                  Ru5P
                </text>

                {/* Acetate */}
                <circle
                  cx="390"
                  cy="370"
                  r="15"
                  fill={isLightMode ? SURFACE.light : DUNE.ink}
                  stroke={isLightMode ? DUNE.ash : DUNE.ash}
                  strokeWidth="1.5"
                />
                <text
                  x="390"
                  y="373"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="semibold"
                  fill={labelColor}
                  className="font-sans select-none pointer-events-none"
                >
                  AcetExt
                </text>

                {/* AcetCoA */}
                <circle
                  cx="410"
                  cy="270"
                  r="15"
                  fill={isLightMode ? SURFACE.light : DUNE.ink}
                  stroke={emeraldColor}
                  strokeWidth="1.5"
                />
                <text
                  x="410"
                  y="273"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="semibold"
                  fill={labelColor}
                  className="font-sans select-none pointer-events-none"
                >
                  AcCoA
                </text>

                {/* Cit */}
                <circle
                  cx="530"
                  cy="270"
                  r="15"
                  fill={isLightMode ? SURFACE.light : DUNE.ink}
                  stroke={emeraldColor}
                  strokeWidth="1.5"
                />
                <text
                  x="530"
                  y="273"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="semibold"
                  fill={labelColor}
                  className="font-sans select-none pointer-events-none"
                >
                  Cit
                </text>

                {/* ICit */}
                <circle
                  cx="630"
                  cy="220"
                  r="15"
                  fill={isLightMode ? SURFACE.light : DUNE.ink}
                  stroke={emeraldColor}
                  strokeWidth="1.5"
                />
                <text
                  x="630"
                  y="223"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="semibold"
                  fill={labelColor}
                  className="font-sans select-none pointer-events-none"
                >
                  ICit
                </text>

                {/* AKG */}
                <circle
                  cx="530"
                  cy="150"
                  r="15"
                  fill={isLightMode ? SURFACE.light : DUNE.ink}
                  stroke={emeraldColor}
                  strokeWidth="2.5"
                />
                <text
                  x="530"
                  y="153"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="extrabold"
                  fill={labelColor}
                  className="font-sans select-none pointer-events-none"
                >
                  AKG
                </text>

                {/* L-Glu */}
                <circle
                  cx="530"
                  cy="60"
                  r="15"
                  fill={isLightMode ? SURFACE.light : DUNE.ink}
                  stroke={roseColor}
                  strokeWidth="2.5"
                />
                <text
                  x="530"
                  y="63"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="extrabold"
                  fill={labelColor}
                  className="font-sans select-none pointer-events-none"
                >
                  L-Glu
                </text>

                {/* PGA Biopolymer Ext */}
                <circle
                  cx="680"
                  cy="60"
                  r="17"
                  fill={isLightMode ? TINT.tealWash : TINT.tealDeep}
                  stroke={emeraldColor}
                  strokeWidth="3.5"
                />
                <text
                  x="680"
                  y="63"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="black"
                  fill={isLightMode ? TINT.tealDeep : STATUS.good}
                  className="font-sans select-none pointer-events-none"
                >
                  PGA
                </text>

                {/* SucCoA */}
                <circle
                  cx="650"
                  cy="320"
                  r="15"
                  fill={isLightMode ? SURFACE.light : DUNE.ink}
                  stroke={emeraldColor}
                  strokeWidth="1.5"
                />
                <text
                  x="650"
                  y="323"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="semibold"
                  fill={labelColor}
                  className="font-sans select-none pointer-events-none"
                >
                  SucCoA
                </text>

                {/* Succinate */}
                <circle
                  cx="530"
                  cy="380"
                  r="15"
                  fill={isLightMode ? SURFACE.light : DUNE.ink}
                  stroke={emeraldColor}
                  strokeWidth="1.5"
                />
                <text
                  x="530"
                  y="383"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="semibold"
                  fill={labelColor}
                  className="font-sans select-none pointer-events-none"
                >
                  Succ
                </text>

                {/* OAA */}
                <circle
                  cx="410"
                  cy="180"
                  r="15"
                  fill={isLightMode ? SURFACE.light : DUNE.ink}
                  stroke={emeraldColor}
                  strokeWidth="1.5"
                />
                <text
                  x="410"
                  y="183"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="semibold"
                  fill={labelColor}
                  className="font-sans select-none pointer-events-none"
                >
                  OAA
                </text>

                {/* ------------------- STAGE 2: CONTINUOUS FLUX BEZIER PATHS ------------------- */}
                {/* PTS */}
                <path
                  d="M 65 80 C 85 64, 125 64, 145 80"
                  fill="none"
                  {...getPathProps("R_GLCpts", skyColor, "sky")}
                />
                <text
                  x="105"
                  y="55"
                  fontSize="10"
                  fontWeight="bold"
                  fill={labelColor}
                  textAnchor="middle"
                  className="font-mono"
                >
                  R_GLCpts ({metabolicFlux["R_GLCpts"]?.toFixed(1)})
                </text>

                {/* PGI */}
                <path
                  d="M 175 80 C 195 64, 245 64, 265 80"
                  fill="none"
                  {...getPathProps("R_PGI", skyColor, "sky")}
                />
                <text
                  x="220"
                  y="55"
                  fontSize="10"
                  fontWeight="bold"
                  fill={labelColor}
                  textAnchor="middle"
                  className="font-mono"
                >
                  R_PGI ({metabolicFlux["R_PGI"]?.toFixed(1)})
                </text>

                {/* PFK */}
                <path
                  d="M 280 95 C 295 110, 295 150, 280 165"
                  fill="none"
                  {...getPathProps("R_PFK", skyColor, "sky")}
                />
                <text
                  x="302"
                  y="130"
                  fontSize="10"
                  fontWeight="bold"
                  fill={labelColor}
                  textAnchor="start"
                  className="font-mono"
                >
                  R_PFK ({metabolicFlux["R_PFK"]?.toFixed(1)})
                </text>

                {/* GAP Split (FBA + TPI combined visually as FBP -> GAP) */}
                <path
                  d="M 265 188 C 235 195, 200 210, 175 224"
                  fill="none"
                  {...getPathProps("R_FBA", skyColor, "sky")}
                />

                {/* GAP -> PEP (Lower glycolysis cascade) */}
                <path
                  d="M 160 245 C 145 265, 145 295, 160 315"
                  fill="none"
                  {...getPathProps("R_GAPDH_PGK", skyColor, "sky")}
                />
                <text
                  x="96"
                  y="280"
                  fontSize="10"
                  fontWeight="black"
                  fill={labelColor}
                  textAnchor="start"
                  className="font-mono"
                >
                  R_GAPDH_PGK ({metabolicFlux["R_GAPDH_PGK"]?.toFixed(1)})
                </text>

                {/* PYK */}
                <path
                  d="M 175 330 C 195 345, 255 345, 275 330"
                  fill="none"
                  {...getPathProps("R_PYK", skyColor, "sky")}
                />
                <text
                  x="225"
                  y="358"
                  fontSize="10"
                  fontWeight="bold"
                  fill={labelColor}
                  textAnchor="middle"
                  className="font-mono"
                >
                  R_PYK ({metabolicFlux["R_PYK"]?.toFixed(1)})
                </text>

                {/* G6PDH */}
                <path
                  d="M 160 95 C 175 110, 175 130, 160 135"
                  fill="none"
                  {...getPathProps("R_G6PDH", roseColor, "rose")}
                />
                <text
                  x="178"
                  y="118"
                  fontSize="10"
                  fontWeight="black"
                  fill={labelColor}
                  textAnchor="start"
                  className="font-mono"
                >
                  zwf ({metabolicFlux["R_G6PDH"]?.toFixed(1)})
                </text>

                {/* GND */}
                <path
                  d="M 148 155 C 125 150, 100 165, 93 176"
                  fill="none"
                  {...getPathProps("R_GND", roseColor, "rose")}
                />

                {/* PPP Recycle (Ru5P -> GAP/F6P) */}
                <path
                  d="M 93 196 C 110 205, 130 215, 147 224"
                  fill="none"
                  {...getPathProps("R_PPP_to_Glyc", dormantColor, "stone")}
                />

                {/* PDH (Pyr -> AcCoA) */}
                <path
                  d="M 302 322 C 325 305, 375 290, 396 277"
                  fill="none"
                  {...getPathProps("R_PDH", emeraldColor, "emerald")}
                />
                <text
                  x="360"
                  y="308"
                  fontSize="10"
                  fontWeight="bold"
                  fill={labelColor}
                  textAnchor="middle"
                  className="font-mono"
                >
                  R_PDH ({metabolicFlux["R_PDH"]?.toFixed(1)})
                </text>

                {/* Overflow (AcCoA -> Acetate Ext) */}
                <path
                  d="M 406 283 C 418 310, 412 335, 394 356"
                  fill="none"
                  {...getPathProps("R_PTA_ACK", dormantColor, "stone")}
                />
                <text
                  x="415"
                  y="322"
                  fontSize="10"
                  fontWeight="bold"
                  fill={labelColor}
                  textAnchor="start"
                  className="font-mono"
                >
                  pta-ack ({metabolicFlux["R_PTA_ACK"]?.toFixed(1)})
                </text>

                {/* Citrate Synthase (AcCoA -> Cit) */}
                <path
                  d="M 425 270 C 450 258, 490 258, 515 270"
                  fill="none"
                  {...getPathProps("R_CS", emeraldColor, "emerald")}
                />

                {/* Acont (Cit -> ICit) */}
                <path
                  d="M 543 264 C 570 248, 595 238, 616 225"
                  fill="none"
                  {...getPathProps("R_ACONT", emeraldColor, "emerald")}
                />

                {/* ICDH (ICit -> AKG) */}
                <path
                  d="M 617 210 C 595 192, 570 182, 543 157"
                  fill="none"
                  {...getPathProps("R_ICDH", emeraldColor, "emerald")}
                />
                <text
                  x="590"
                  y="196"
                  fontSize="10"
                  fontWeight="black"
                  fill={labelColor}
                  textAnchor="middle"
                  className="font-mono"
                >
                  citC ({metabolicFlux["R_ICDH"]?.toFixed(1)})
                </text>

                {/* AKGDH (AKG -> SucCoA) */}
                <path
                  d="M 542 160 C 580 200, 615 260, 638 310"
                  fill="none"
                  {...getPathProps("R_AKGDH", dormantColor, "stone")}
                />
                <text
                  x="600"
                  y="242"
                  fontSize="10"
                  fontWeight="bold"
                  fill={labelColor}
                  textAnchor="start"
                  className="font-mono"
                >
                  odhA ({metabolicFlux["R_AKGDH"]?.toFixed(1)})
                </text>

                {/* SUCOAS (SucCoA -> Succ) */}
                <path
                  d="M 638 326 C 600 348, 570 365, 543 375"
                  fill="none"
                  {...getPathProps("R_SUCOAS", emeraldColor, "emerald")}
                />

                {/* Regeneration (Succ -> OAA) */}
                <path
                  d="M 518 371 C 470 310, 440 250, 413 193"
                  fill="none"
                  {...getPathProps("R_SDH_FUM_MDH", emeraldColor, "emerald")}
                />

                {/* OAA -> Cit condensation loop */}
                <path
                  d="M 410 195 C 400 215, 400 240, 410 255"
                  fill="none"
                  {...getPathProps("R_CS", emeraldColor, "emerald")}
                />

                {/* ------------------- STAGE 3: POLYMER PGA CHANNELS ------------------- */}
                {/* Glutamate Synthase (AKG -> Glu) */}
                <path
                  d="M 530 135 C 515 110, 515 90, 530 75"
                  fill="none"
                  {...getPathProps("R_GLUsyn", roseColor, "rose")}
                />
                <text
                  x="452"
                  y="105"
                  fontSize="10"
                  fontWeight="black"
                  fill={roseColor}
                  textAnchor="start"
                  className="font-mono"
                >
                  R_GLUsyn ({metabolicFlux["R_GLUsyn"]?.toFixed(1)})
                </text>

                {/* PGA Synthesising Polymerizer (L-Glu -> PGA Extracellular) */}
                <path
                  d="M 545 60 C 575 48, 635 48, 663 60"
                  fill="none"
                  {...getPathProps("R_PGAsyn", emeraldColor, "emerald")}
                />
                <text
                  x="604"
                  y="36"
                  fontSize="10.5"
                  fontWeight="black"
                  fill={isLightMode ? TINT.tealDeep : TINT.roseLight}
                  textAnchor="middle"
                  className="font-sans antialiased tracking-tight bg-dune-teal/50"
                >
                  iGEM PGA OP ({metabolicFlux["R_PGAsyn"]?.toFixed(2)})
                </text>
              </svg>
            </div>
          </div>

          {/* Stoichiometric Heatmap Matrix Grid (Y: Metabolites, X: Reactions) */}
          <div
            className={`p-6 rounded-[6px] border space-y-4 ${
              isLightMode
                ? "bg-white border-dune-orange/10 "
                : "bg-dune-ink border-border"
            }`}
          >
            <div className="flex justify-between items-center">
              <h3
                className={`text-[length:var(--text-micro)] font-black uppercase tracking-wider font-mono flex items-center gap-2 ${
                  isLightMode ? "text-foreground" : "text-foreground"
                }`}
              >
                <Database className="h-4 w-4 text-dune-teal" /> Micro
                Stoichiometric Coefficient Matrix (S)
              </h3>
              <span className="font-mono text-[length:var(--text-caption)] text-muted-foreground">
                26 Metabolites x 24 Reactions
              </span>
            </div>

            {/* Matrix Heatmap Scroller */}
            <div
              className={`overflow-x-auto border rounded-[6px] p-2 ${
                isLightMode
                  ? "bg-card border-dune-orange/10"
                  : "bg-dune-ink border-border"
              }`}
            >
              <div className="min-w-[700px] text-[length:var(--text-caption)] font-mono select-none">
                {/* Header row */}
                <div className="flex border-b border-border pb-1 mb-1">
                  <div className="w-[85px] shrink-0 font-bold truncate">
                    Metabolite \ Reaction
                  </div>
                  {REACTIONS.slice(0, 16).map((rxn) => (
                    <div
                      key={rxn.id}
                      className="w-[32px] shrink-0 text-center text-muted-foreground truncate"
                      title={rxn.name}
                    >
                      {rxn.id.substring(2, 8)}
                    </div>
                  ))}
                </div>

                {/* Metabolite rows */}
                <div className="space-y-1">
                  {METABOLITES.slice(0, 13).map((met) => (
                    <div
                      key={met.id}
                      className="flex items-center text-muted-foreground"
                    >
                      <div
                        className="w-[85px] shrink-0 font-bold font-sans text-muted-foreground truncate"
                        title={met.name}
                      >
                        {met.name}
                      </div>

                      {REACTIONS.slice(0, 16).map((rxn) => {
                        const coeff = rxn.leftToRightMap[met.id] || 0;
                        let bgClass = isLightMode
                          ? "bg-muted text-foreground"
                          : "bg-dune-basalt/40 text-foreground";
                        if (coeff < 0)
                          bgClass =
                            "bg-dune-rose/20 text-dune-rose font-bold border border-dune-rose/50";
                        if (coeff > 0)
                          bgClass =
                            "bg-dune-teal/20 text-dune-teal font-bold border border-dune-teal/50";

                        return (
                          <div
                            key={`${met.id}-${rxn.id}`}
                            className={`w-[32px] h-[18px] shrink-0 flex items-center justify-center rounded-[4px] mx-1 text-[length:var(--text-caption)] ${bgClass}`}
                            title={`Reaction: ${rxn.name}\nMetabolite: ${met.name}\nCoefficient: ${coeff}`}
                          >
                            {coeff !== 0 ? coeff : "."}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-[length:var(--text-caption)] text-muted-foreground leading-normal">
              Heatmap representation of chemical formulas. Red cells indicate
              substrate consumption (negative entry). Green cells signify
              synthesis products (positive stoichiometry entry).
            </p>
          </div>

          {/* Live Metabolic Flux Leaderboard */}
          <div
            className={`p-6 rounded-[6px] border space-y-4 transition-all duration-300 ${
              isLightMode
                ? "bg-white border-dune-orange/10 "
                : "bg-dune-ink border-border"
            }`}
          >
            <div className="flex justify-between items-center">
              <h3
                className={`text-[length:var(--text-micro)] font-black uppercase tracking-wider font-mono flex items-center gap-2 ${
                  isLightMode ? "text-foreground" : "text-foreground"
                }`}
              >
                <Zap className="h-4 w-4 text-dune-teal" />{" "}
                Metabolic Flux Leaderboard
              </h3>
              <span
                className={`text-[length:var(--text-caption)] font-mono px-2 py-1 rounded-[4px] border ${
                  isLightMode
                    ? "bg-dune-sand border-dune-orange"
                    : "bg-dune-ink border-border"
                }`}
              >
                Top 5 Key Flux Coordinates
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              {leaderboardFluxes.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-[6px] border flex flex-col justify-between transition-all hover:scale-[1.02] ${
                    isLightMode
                      ? "bg-card border-dune-orange/10 "
                      : "bg-dune-ink/80 border-border "
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-2 gap-1">
                      <span
                        className={`text-[length:var(--text-caption)] font-extrabold uppercase tracking-wide truncate max-w-[100px] ${isLightMode ? "text-foreground" : "text-foreground"}`}
                        title={item.name}
                      >
                        {item.name}
                      </span>
                      {item.toggleGene && (
                        <button
                          onClick={() => handleToggleKnockout(item.toggleGene)}
                          className={`text-[length:var(--text-caption)] px-2 py-1 rounded-[4px] font-black uppercase tracking-wider transition-all duration-200 shrink-0 ${
                            item.isKnockedOut
                              ? "bg-dune-rose/10 text-dune-rose border border-dune-rose/30"
                              : "bg-dune-teal/10 text-dune-teal border border-dune-teal/30 hover:bg-dune-rose/20 hover:text-dune-rose hover:border-dune-rose"
                          }`}
                          title={`Click to toggle ${item.toggleGene} knockout`}
                        >
                          {item.isKnockedOut ? "∆pta KO" : "pta WT"}
                        </button>
                      )}
                    </div>
                    <div className="text-[length:var(--text-h3)] font-mono font-black tracking-tight leading-none text-foreground flex items-baseline gap-1 my-2">
                      <span className={item.textColor}>
                        {item.flux.toFixed(3)}
                      </span>
                      <span className="text-[length:var(--text-caption)] font-semibold text-muted-foreground font-sans tracking-normal block ml-1 shrink-0 truncate">
                        {item.unit}
                      </span>
                    </div>
                    <div
                      className="text-[length:var(--text-caption)] text-muted-foreground leading-tight mt-1 line-clamp-2"
                      title={item.desc}
                    >
                      {item.desc}
                    </div>
                  </div>
                  {/* Mini visual indicator */}
                  <div className="mt-2">
                    <div className="w-full h-1 bg-muted/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                        style={{
                          width: `${Math.min(100, (item.flux / 15) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shadow Prices / Nutrient Bottlenecks Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bottleneck tracking card */}
            <div
              className={`p-4 rounded-[6px] border space-y-4 ${
                isLightMode
                  ? "bg-white border-dune-orange/10 "
                  : "bg-dune-ink border-border"
              }`}
            >
              <h4
                className={`text-[length:var(--text-micro)] font-black uppercase tracking-wider font-mono flex items-center gap-2 ${
                  isLightMode ? "text-dune-orange" : "text-foreground"
                }`}
              >
                <TrendingUp className="h-4 w-4 text-dune-teal" /> Matrix
                Constraint Shadow Prices
              </h4>
              <p className="text-[length:var(--text-caption)] text-muted-foreground leading-normal">
                Shadow price identifies the fractional increase in the objective
                function if we relax a nutrient barrier by 1 unit.
              </p>

              <div className="space-y-4 pt-1">
                {fbaResults.bottlenecks.map((b, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-[length:var(--text-caption)] items-center">
                      <span className="font-bold">{b.label}</span>
                      <span className="font-mono text-dune-teal font-extrabold">
                        {b.price.toFixed(3)}
                      </span>
                    </div>
                    {/* Progress representation */}
                    <div
                      className={`w-full h-1.5 rounded-full ${isLightMode ? "bg-muted" : "bg-dune-basalt"}`}
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          b.price > 0.5 ? "bg-dune-orange" : "bg-dune-orange"
                        }`}
                        style={{ width: `${b.bottleneckScore || 5}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FBA Theory Explainer */}
            <div
              className={`p-4 rounded-[6px] border space-y-2 ${
                isLightMode
                  ? "bg-white border-dune-orange/10 "
                  : "bg-dune-ink border-border"
              }`}
            >
              <h4
                className={`text-[length:var(--text-micro)] font-black uppercase tracking-wider font-mono flex items-center gap-2 ${
                  isLightMode ? "text-dune-orange" : "text-foreground"
                }`}
              >
                <HelpCircle className="h-4 w-4 text-dune-teal" /> iGEM FBA
                Science Deck
              </h4>
              <p className="text-[length:var(--text-caption)] text-muted-foreground leading-relaxed font-sans">
                FBA calculates intracellular reaction speeds (fluxes) assuming
                static internal metabolite pools at equilibrium (the S • v = 0
                balance constraint).
              </p>
              <div
                className={`p-2 rounded-[4px] border text-[length:var(--text-caption)] font-mono text-left leading-normal ${
                  isLightMode
                    ? "bg-background border-border"
                    : "bg-dune-basalt/45 border-border"
                }`}
              >
                Maximize <span className="text-dune-teal">v_PGA</span> subject
                to:
                <br />
                • steady state stoichiometric balance
                <br />
                • glucose uptake & oxygenation sliders
                <br />• active sand knockout gene checkboxes
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Massive Glowing Precursor Flux Outcome Block */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: pulseMetric ? [1, 1.03, 1] : 1,
          boxShadow: pulseMetric
            ? isLightMode
              ? "0 10px 30px rgba(16,185,129,0.25)"
              : "0 0 35px rgba(16,185,129,0.55)"
            : isLightMode
              ? "0 4px 12px rgba(139,94,26,0.06)"
              : "0 0 0px rgba(0,0,0,0)",
        }}
        transition={{ duration: 0.4 }}
        className={`relative mt-6 overflow-hidden rounded-[6px] border border-dune-teal p-6 text-center transition-colors duration-300 ${
          isLightMode ? "bg-white/70 text-foreground" : "bg-card/70 text-dune-teal"
        }`}
      >
        <span className="text-[length:var(--text-caption)] uppercase font-mono tracking-widest text-dune-rose font-black block mb-1">
          SYSTEM METABOLIC SIMULATION OUTCOME
        </span>
        <h4 className="text-[length:var(--text-micro)] font-bold uppercase tracking-wider font-sans mb-2">
          Optimized Precursor Synthesis (PGA Yield)
        </h4>
        <div className="flex flex-col items-center justify-center">
          <div
            className={`text-[length:var(--text-h1)] font-black font-mono tracking-tight my-2 flex items-center justify-center gap-2 transition-all ${
              pulseMetric
                ? "text-dune-teal scale-105"
                : isLightMode
                  ? "text-dune-teal"
                  : "text-dune-teal"
            }`}
          >
            <span className="font-mono">{pgaSynthesisFlux.toFixed(4)}</span>
            <span
              className={`text-[length:var(--text-micro)] font-semibold tracking-normal font-sans text-muted-foreground shrink-0`}
            >
              mmol / gDCW · h
            </span>
          </div>
        </div>
        <p className="text-[length:var(--text-caption)] text-muted-foreground max-w-2xl mx-auto leading-relaxed mt-2 font-sans">
          This optimized Precursor Export represents the mathematical maximum
          solution of the linear system <strong>S • v = 0</strong>. Knocking out
          metabolic side channels like <strong>pta</strong> (acetate excretion)
          commitments glucose toward glutamate synthesis, yielding maximal
          cell-cementation material.
        </p>
      </motion.div>
    </div>
  );
}
