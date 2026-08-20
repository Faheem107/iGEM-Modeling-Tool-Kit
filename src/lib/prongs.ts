/**
 * Prong & Module Registry
 * =======================
 * Drives the prong-aware Simulation Workspace. A "combination" is any non-empty subset of
 * the three prongs (a single prong counts). `modulesForSelection()` returns the meaningful,
 * ordered set of modules for that exact combination, different combinations surface
 * genuinely different module sets.
 */

import type { LucideIcon } from "lucide-react";
import {
  Sparkles,
  Layers,
  ShieldCheck,
  Workflow,
  Dna,
  FlaskConical,
  Atom,
  Wind,
  Bug,
  Coins,
  Thermometer,
  Globe,
  Combine,
  Droplets,
  Timer,
  Link2,
  Beaker,
  Ruler,
  CalendarClock,
  ShieldAlert,
} from "lucide-react";
import type { ProngId } from "./physics";
import { PRONG_TITLES, PRONG_MOLECULES, PORTAL_NAMES } from "@/content/copy";

export type { ProngId };

/** Lightweight prong metadata for the workspace (the landing page keeps its own rich copy). */
export interface ProngMeta {
  id: ProngId;
  title: string;
  molecule: string;
  /** True for engineered B. subtilis prongs (1 & 2); false for the applied alginate (3). */
  bacterial: boolean;
  /** Mechanical signature that feeds the composite cohesion. */
  strengthMetric: "shearModulus" | "UCS";
  icon: LucideIcon;
  accent: string; // tailwind text color
}

export const PRONGS: Record<ProngId, ProngMeta> = {
  1: {
    id: 1,
    title: PRONG_TITLES[1],
    molecule: PRONG_MOLECULES[1],
    bacterial: true,
    strengthMetric: "shearModulus",
    icon: Sparkles,
    accent: "text-dune-orange",
  },
  2: {
    id: 2,
    title: PRONG_TITLES[2],
    molecule: PRONG_MOLECULES[2],
    bacterial: true,
    strengthMetric: "UCS",
    icon: Layers,
    accent: "text-dune-teal",
  },
  3: {
    id: 3,
    title: PRONG_TITLES[3],
    molecule: PRONG_MOLECULES[3],
    bacterial: false,
    strengthMetric: "shearModulus",
    icon: Droplets,
    accent: "text-dune-rose",
  },
};

export const ALL_PRONGS: ProngId[] = [1, 2, 3];

/** Module scales, ordered micro → macro → synthesis. */
export type ModuleScale =
  | "genetic"
  | "molecular"
  | "protein"
  | "material"
  | "ecology"
  | "macro"
  | "synthesis"
  | "deployment"
  | "economic";
const SCALE_ORDER: Record<ModuleScale, number> = {
  genetic: 1,
  molecular: 2,
  protein: 3,
  material: 4,
  ecology: 5,
  macro: 6,
  synthesis: 7,
  deployment: 8,
  economic: 9,
};

export type ModuleId =
  | "fba"
  | "metabolic"
  | "crosslink"
  | "caco3"
  | "ca-anchoring"
  | "alginate"
  | "thermal"
  | "protein-3d"
  | "ecological"
  | "killswitch"
  | "aeolian"
  | "wetlab"
  | "grainsize"
  | "composite"
  | "curing"
  | "economic";

export interface ModuleMeta {
  id: ModuleId;
  title: string;
  blurb: string;
  scale: ModuleScale;
  icon: LucideIcon;
  /** Predicate: does this module belong in the page for this prong selection? */
  appliesTo: (selected: ProngId[]) => boolean;
}

const has = (sel: ProngId[], p: ProngId) => sel.includes(p);
const anyBacterial = (sel: ProngId[]) => has(sel, 1) || has(sel, 2);

/**
 * The full catalogue. `appliesTo` encodes the biology:
 *  - γ-PGA modules need Prong 1; CaCO₃ modules need Prong 2; alginate needs Prong 3.
 *  - FBA / thermal / ecology are bacterial → Prong 1 or 2 (alginate has no cells).
 *  - Aeolian + Economic are universal macro endpoints.
 *  - Composite appears only for true multi-prong combinations (≥2).
 */
export const MODULE_REGISTRY: ModuleMeta[] = [
  {
    id: "fba",
    title: "Flux Balance Analysis",
    blurb:
      "At steady state nothing accumulates inside the cell, so every metabolite balances. That leaves a space of possible flux patterns, and this picks the one that sends the most carbon to the precursor.",
    scale: "genetic",
    icon: Workflow,
    appliesTo: anyBacterial,
  },
  {
    id: "metabolic",
    title: "Intracellular γ-PGA Kinetics",
    blurb: "Gene to mRNA to enzyme to polymer, as four coupled rates integrated step by step. Knock out a degradation gene and the loss term drops toward zero.",
    scale: "molecular",
    icon: Timer,
    appliesTo: (s) => has(s, 1),
  },
  {
    id: "ca-anchoring",
    title: "Carbonic Anhydrase Display",
    blurb: "Two ways to hold an enzyme on the cell wall, one covalent and one not. How many stay put, and how active they are once there.",
    scale: "protein",
    icon: FlaskConical,
    appliesTo: (s) => has(s, 2),
  },
  {
    id: "caco3",
    title: "CaCO₃ Precipitation → UCS",
    blurb:
      "How far the water is past saturation sets how fast calcite forms. Calcite between grains sets the compressive strength, and the same reaction locks away CO₂.",
    scale: "material",
    icon: Atom,
    appliesTo: (s) => has(s, 2),
  },
  {
    id: "crosslink",
    title: "γ-PGA Ca²⁺ Cross-Linking",
    blurb: "Calcium ions bind the polymer chains and bridge them. Count the bridges and you have the network density, which is the stiffness.",
    scale: "material",
    icon: Link2,
    appliesTo: (s) => has(s, 1),
  },
  {
    id: "alginate",
    title: "Alginate Egg-Box Gel",
    blurb:
      "Calcium clamps the alginate chains into egg-box junctions. How firm the gel gets, how much water it holds, and how long it lasts once it rains.",
    scale: "material",
    icon: Droplets,
    appliesTo: (s) => has(s, 3),
  },
  {
    id: "thermal",
    title: "Protein Thermal Stability",
    blurb: "A protein is either folded or it is not, and heat shifts the balance. Above its melting point the enzyme stops working, which sets the temperature ceiling on the whole design.",
    scale: "protein",
    icon: Thermometer,
    appliesTo: anyBacterial,
  },
  {
    id: "protein-3d",
    title: PORTAL_NAMES.protein,
    blurb:
      "The actual structures, in 3D: the γ-PGA synthetase complex for Prong 1, carbonic anhydrase for Prong 2.",
    scale: "protein",
    icon: Globe,
    appliesTo: anyBacterial,
  },
  {
    id: "ecological",
    title: "Ecological Spread & Kill Switch",
    blurb:
      "Cells divide where there is food and spread by diffusion, so the colony grows as a front. Turn on the kill switch and watch how far it got.",
    scale: "ecology",
    icon: Bug,
    appliesTo: anyBacterial,
  },
  {
    id: "killswitch",
    title: "Biocontainment Kill Switch",
    blurb:
      "The toxin kills the cell, the antitoxin blocks the toxin, and the antitoxin breaks down faster. Stop making it and the cell dies. Three routes to that, plus what to do about spores.",
    scale: "ecology",
    icon: ShieldAlert,
    appliesTo: anyBacterial,
  },
  {
    id: "aeolian",
    title: "Aeolian Wind Tunnel",
    blurb:
      "Below a threshold wind speed the surface does not move at all. Above it, transport climbs with the cube of the excess. Cohesion from the crust raises the threshold.",
    scale: "macro",
    icon: Wind,
    appliesTo: (s) => s.length > 0,
  },
  // The bench assay is glutamate substrate → γ-PGA yield → dune crust, a Prong-1 protocol.
  {
    id: "wetlab",
    title: PORTAL_NAMES.wetlab,
    blurb:
      "Put real bench numbers in, cell density, glutamate, salinity, and erode a dune with them.",
    scale: "macro",
    icon: Beaker,
    appliesTo: (s) => has(s, 1),
  },
  // Grain-size coverage: how the active binder(s) hold the UAE dune-sand size distribution.
  // Useful for a single prong (shows its grain-size gap) and decisive for combinations (the prongs
  // are grain-size complementary, the "cover all sizes" thesis).
  {
    id: "grainsize",
    title: "Grain-Size Coverage",
    blurb:
      "Sand is not one size. Calcite bridges the 63 to 125 µm band well and struggles either side of it, which is the gap the polymer fills.",
    scale: "macro",
    icon: Ruler,
    appliesTo: (s) => s.length > 0,
  },
  {
    id: "composite",
    title: "Composite Strength Synthesis",
    blurb: "Two binders in the same crust do not add up. What the combined cohesion is, and which failure mode goes first.",
    scale: "synthesis",
    icon: Combine,
    appliesTo: (s) => s.length >= 2,
  },
  // Curing/deployment timeline: how the crust matures over the 0/8/16/24/32 h spray protocol and
  // weathers until re-application. Universal (a single prong shows its own life), but the multi-prong
  // early-strength + durability trade-off is the point.
  {
    id: "curing",
    title: "Curing & Deployment Timeline",
    blurb:
      "Strength over the 32 h spray protocol, then months of weathering, then when to spray again. The polymer sets fast and the calcite lasts, so the pair covers both ends.",
    scale: "deployment",
    icon: CalendarClock,
    appliesTo: (s) => s.length > 0,
  },
  {
    id: "economic",
    title: "Economic Scalability",
    blurb: "What a hectare costs per prong, and the point at which that beats spraying conventional stabilizer.",
    scale: "economic",
    icon: Coins,
    appliesTo: (s) => s.length > 0,
  },
];

/** Ordered, de-duplicated module list for a given prong selection. */
export function modulesForSelection(selected: ProngId[]): ModuleMeta[] {
  return MODULE_REGISTRY.filter((m) => m.appliesTo(selected)).sort(
    (a, b) => SCALE_ORDER[a.scale] - SCALE_ORDER[b.scale],
  );
}

/** Human label for a combination, e.g. "γ-PGA + CaCO₃". */
export function combinationLabel(selected: ProngId[]): string {
  return selected.map((p) => PRONGS[p].title.split(" ")[0]).join(" + ");
}
