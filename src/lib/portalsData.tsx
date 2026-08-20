import {
  Sparkles,
  Layers,
  Droplets,
  ShieldAlert,
  Bug,
  Beaker,
  Workflow,
  Dna,
  Wind,
  Flame,
  Coins,
  Waves,
} from "lucide-react";
import {
  PRONG_TITLES,
  PRONG_SHORTS,
  KILL_SWITCH_TITLE,
  KILL_SWITCH_SHORT,
  PORTAL_NAMES,
} from "@/content/copy";
import type { ReactNode } from "react";

// Prong-tailored simulation lives at /model?prongs=1,2, one shared source of truth
// for the two engineered prongs, the biocontainment kill switch, the (archived) alginate
// option, the portal cards, and the pipeline sub-nav.

export interface Prong {
  id: number;
  title: string;
  icon: ReactNode;
  short: string;
  whatItIs: string;
  modelDoes: string;
  impact: string;
  /** The biological job the prong does out in the desert during deployment. */
  inDesert: string;
  /** Only set for the archived alginate option, documented reasons it was not pursued as a prong. */
  whyDropped?: string[];
}

export const PRONGS: Prong[] = [
  {
    id: 1,
    title: PRONG_TITLES[1],
    icon: <Sparkles className="h-4 w-4 text-dune-orange" />,
    short: PRONG_SHORTS[1],
    whatItIs:
      "Bacillus subtilis already makes poly-γ-glutamic acid, a long sticky chain it secretes to hold water. We raise how much of it the cells make, so the sand around them is held in a mesh of the stuff rather than lying loose.",
    modelDoes:
      "Follows the carbon from glucose to polymer, then the polymer to a number. Calcium ions bridge neighbouring chains, the bridges set the network density, and the network density sets the shear modulus, which is the stiffness the crust actually has.",
    impact:
      "A crust that bends rather than shatters, and that breaks down on its own. Its stiffness is what the wind model reads when it decides whether a grain moves.",
    inDesert:
      "Sprayed onto the dune, the cells secrete γ-PGA into the spaces between grains. The chains hold water, which is how the colony survives the heat, and the same chains glue the grains into a crust that flexes instead of cracking.",
  },
  {
    id: 2,
    title: PRONG_TITLES[2],
    icon: <Layers className="h-4 w-4 text-dune-teal" />,
    short: PRONG_SHORTS[2],
    whatItIs:
      "Carbonic anhydrase is an enzyme that speeds up one reaction: CO₂ plus water becomes bicarbonate. We engineer B. subtilis to make it and to pin it to the outside of the cell, using sortase, an enzyme that stitches proteins onto the cell wall. More bicarbonate next to available calcium means calcium carbonate comes out of solution as solid cement. The usual way to do this uses urease and releases ammonia. This route does not.",
    modelDoes:
      "Counts how many enzymes actually reach the cell surface and stay there, through the signal peptide, the sortase reaction and the pairing of the enzyme with itself. That count sets how fast calcium carbonate precipitates.",
    impact:
      "Cement between grains, with no ammonia released into the sand. The precipitation rate feeds the strength estimate for the crust.",
    inDesert:
      "Out in the sand the enzyme sits on the cell wall, turning CO₂ into bicarbonate. Desert dust carries calcium. Where the two meet, calcium carbonate grows in the gaps between grains and the surface sets hard.",
  },
  {
    id: 3,
    title: PRONG_TITLES[3],
    icon: <Droplets className="h-4 w-4 text-dune-rose" />,
    short: PRONG_SHORTS[3],
    whatItIs:
      "Sodium alginate comes from seaweed and is sold by the tonne for food. Add calcium and the chains clamp around it in a shape called an egg-box, and the liquid sets to a gel. It was scoped as a third prong, an applied binder rather than anything the bacteria make, and later dropped.",
    modelDoes:
      "Still modelled in full: how the gel sets, how much water it holds, and how many egg-box junctions form at desert temperature and salinity. Dropping it as a prong is not a reason to stop being able to compare it.",
    impact:
      "Kept as a modelled comparison rather than a deployed prong. It was dropped on the three findings below, each of which stands on its own. The deployed design is the two engineered prongs, which are what the crust is actually built from.",
    inDesert:
      "The calcium already in desert dust sets it on contact, so the surface binds at once. Nothing living is involved, which is both why it is fast and why it does not repair itself.",
    whyDropped: [
      "It takes the water. A hydrogel holds water tightly, which leaves less of it free for the cells and slows the nutrients that reach them by diffusion. Prong 2 needs those cells working.",
      "It needs calcium we cannot promise. Below a certain supply, what precipitates is not calcite but a weaker form of calcium carbonate, or loose aggregate that binds nothing.",
      "Nothing about it is engineered. It is a material you buy and spread, so it demonstrates no genetic design and it cannot be improved by changing the strain. The two remaining prongs can.",
    ],
  },
];

/**
 * The biocontainment kill switch.
 *
 * It is a control and biosafety layer that runs over both engineered prongs, not a sand binder, so
 * it is modelled separately from the prong combinations. It is an addition to the design and not a
 * substitute for anything: dropping alginate as a prong and adding the kill switch were two
 * separate decisions, taken for unrelated reasons.
 */
export const KILL_SWITCH = {
  id: "killswitch" as const,
  title: KILL_SWITCH_TITLE,
  icon: <ShieldAlert className="h-4 w-4 text-dune-orange" />,
  short: KILL_SWITCH_SHORT,
  whatItIs:
    "A genetically-encoded control layer that limits the engineered B. subtilis population and, when needed, eliminates it. It runs over both engineered prongs rather than standing in for one. It binds nothing and adds no strength to the crust. What it adds is the ability to end the deployment.",
  modelDoes:
    "Runs the MazE/MazF pair. MazF cuts the cell's own RNA and kills it. MazE binds MazF and stops that, but MazE breaks down quickly, so the cell has to keep making more. Three ways out follow from that: add aTc and MazF wins, let the plasmid dilute out over generations and MazF wins, or let the genes jump to a wild microbe with no matching antitoxin and MazF wins there too.",
  impact:
    "The strain does its work, then stops. Growing cells are cleared by the switch. Spores are the harder case: a spore is dormant, and a toxin that cuts active RNA does nothing to one, so gerB* is used to wake them first and clear them after.",
  inDesert:
    "While the colony is working it keeps topping up the antitoxin and stays alive. Add the trigger, or wait for the plasmid to dilute out over generations, and the toxin wins. A native microbe that picks up the genes gets the toxin without the antitoxin, so it clears itself.",
};

export interface PortalCard {
  id: string;
  href: string;
  icon: ReactNode;
  title: string;
  desc: string;
  grad: string;
  ring: string;
}

export const PORTAL_CARDS: PortalCard[] = [
  {
    id: "wetlab-sandbox",
    href: "/portal/wet-lab",
    icon: <Beaker className="h-4 w-4 text-dune-orange" />,
    title: PORTAL_NAMES.wetlab,
    desc: "Set the bench conditions, then watch how far the polymer spreads and how much dune survives the wind.",
    grad: "from-dune-orange/20 via-dune-orange/5 to-transparent",
    ring: "text-dune-orange",
  },
  {
    id: "pipeline",
    href: "/portal/pipeline",
    icon: <Workflow className="h-4 w-4 text-dune-teal" />,
    title: PORTAL_NAMES.pipeline,
    desc: "One grain traced end to end: metabolism, cross-linking, then the wind it has to hold against.",
    grad: "from-dune-teal/20 via-dune-teal/5 to-transparent",
    ring: "text-dune-teal",
  },
  {
    id: "protein-suite",
    href: "/portal/protein",
    icon: <Dna className="h-4 w-4 text-dune-rose" />,
    title: PORTAL_NAMES.protein,
    desc: "The real structures in 3D, and what heat does to them.",
    grad: "from-dune-rose/20 via-dune-rose/5 to-transparent",
    ring: "text-dune-rose",
  },
  {
    id: "xanthan-flow",
    href: "/portal/xanthan-flow",
    icon: <Waves className="h-4 w-4 text-dune-teal" />,
    title: PORTAL_NAMES.xanthan,
    desc: "Xanthan gum thins as you push it harder. This is what that does to pressure in the delivery tubing.",
    grad: "from-dune-teal/20 via-dune-teal/5 to-transparent",
    ring: "text-dune-teal",
  },
];

export type TabSlug =
  | "fba"
  | "metabolic"
  | "crosslink"
  | "thermal"
  | "aeolian"
  | "ecological"
  | "economic";

export interface NavItem {
  slug: TabSlug;
  label: string;
  icon: ReactNode;
}

export const NAV_ITEMS: NavItem[] = [
  { slug: "fba", label: "Advanced FBA", icon: <Workflow className="h-4 w-4" /> },
  { slug: "metabolic", label: "Metabolic Matrix", icon: <Dna className="h-4 w-4" /> },
  { slug: "crosslink", label: "Cross-Link Biophysics", icon: <Layers className="h-4 w-4" /> },
  { slug: "thermal", label: "Thermal Kinetics", icon: <Flame className="h-4 w-4" /> },
  { slug: "aeolian", label: "Aeolian Tunnel", icon: <Wind className="h-4 w-4" /> },
  { slug: "ecological", label: "Ecological Spread", icon: <Bug className="h-4 w-4" /> },
  { slug: "economic", label: "Economic Scalability", icon: <Coins className="h-4 w-4" /> },
];

/** Encode a set of prong ids for the /model?prongs= query (e.g. [1,2] → "1,2"). */
export function prongsToParam(ids: number[]): string {
  return ids.slice().sort().join(",");
}

/** Parse the /model?prongs= query back into a validated, de-duplicated id list. */
export function parseProngsParam(param: string | null | undefined): number[] {
  if (!param) return [];
  const ids = param
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => n === 1 || n === 2 || n === 3);
  return Array.from(new Set(ids)).sort();
}
