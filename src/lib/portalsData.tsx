import {
  Sparkles,
  Layers,
  ShieldCheck,
  ShieldAlert,
  Bug,
  Workflow,
  Dna,
  Wind,
  Flame,
  Coins,
} from "lucide-react";
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
    title: "Polymer Overexpression",
    icon: <Sparkles className="w-8 h-8 text-dune-orange" />,
    short: "Gamma-PGA bio-adhesive matrix",
    whatItIs:
      "We boost the natural production of Gamma-PGA in Bacillus subtilis so it works as a bio-adhesive matrix.",
    modelDoes:
      "Simulates metabolic flux, cross-linking with calcium ions, and the resulting shear modulus.",
    impact:
      "Builds a biodegradable crust that holds up against wind.",
    inDesert:
      "Sprayed onto the dune, the bacteria secrete poly-γ-glutamic acid, a sticky, water-retaining biopolymer that glues loose sand grains into a flexible living crust and holds the moisture the colony needs to survive the heat.",
  },
  {
    id: 2,
    title: "Carbonic Anhydrase & Sortase",
    icon: <Layers className="w-8 h-8 text-dune-teal" />,
    short: "Non-ureolytic MICP biomineralization",
    whatItIs:
      "Engineering B. subtilis to secrete Carbonic Anhydrase (CA) and anchor it to the cell surface via Sortase-mediated ligation. This enzyme sequesters CO2 and water to form calcium carbonate crystals without producing toxic ammonia.",
    modelDoes:
      "Simulates Sortase anchoring, CA dimerization, and signal-peptide efficiency to predict covalent anchoring and biomineralization rates.",
    impact:
      "Cements sand grains together without ammonia, captures CO2, and makes the crust more durable.",
    inDesert:
      "In the sand, the surface-displayed carbonic anhydrase pulls CO₂ from the air and, using calcium already present in desert dust, grows calcium-carbonate cement between grains, hardening the surface into a durable, ammonia-free biocement while locking away carbon.",
  },
  {
    id: 3,
    title: "Sodium Alginate",
    icon: <ShieldCheck className="w-8 h-8 text-dune-rose" />,
    short: "Applied hydrogel binder, not pursued as a prong",
    whatItIs:
      "Sodium alginate is a food-grade commercial biopolymer that cross-links with calcium on contact to form an 'egg-box' gel. It was originally scoped as a third prong (an externally applied binder), but was later dropped from the core design.",
    modelDoes:
      "Still fully modelled here: gelation thermodynamics, moisture retention, and Ca²⁺ egg-box cross-linking efficiency under desert temperature and salinity, so its trade-offs against the engineered prongs remain quantifiable.",
    impact:
      "Retained as an archived comparison rather than a deployed prong. Its role is now filled by the two engineered prongs plus a genetically-encoded kill switch, keeping the whole solution a genuine synbio system.",
    inDesert:
      "On contact with the calcium already present in desert dust, sodium alginate forms an 'egg-box' gel that instantly binds the surface, but as an inert applied material rather than anything the bacteria produce.",
    whyDropped: [
      "Highly water-absorbent. As a hydrogel it can retain significant water, potentially reducing water availability and limiting nutrient diffusion to the cells, which could work against the engineered Prong 2 (CA → CaCO₃).",
      "Depends on a consistent external Ca²⁺ supply for calcite formation. Without enough calcium, the bacteria may form alternative CaCO₃ polymorphs or poorly-formed aggregates, compromising the bioremediation outcome.",
      "It is not a synthetic-biology solution. iGEM rewards demonstrating engineering through genetic design; a core prong that relies solely on an externally added material makes the overall system feel less integrated. A genetically-encoded strategy showcases the engineering contribution far better.",
    ],
  },
];

/**
 * The biocontainment kill switch, the "third element" that replaced the applied alginate prong.
 * It is a control/biosafety layer for the two engineered prongs rather than a sand binder, so it is
 * modelled separately from the prong combinations.
 */
export const KILL_SWITCH = {
  id: "killswitch" as const,
  title: "Biocontainment Kill Switch",
  icon: <ShieldAlert className="w-8 h-8 text-dune-orange" />,
  short: "MazE/MazF control of the engineered population",
  whatItIs:
    "A genetically-encoded control layer that limits and, when needed, eliminates the engineered B. subtilis population, replacing the applied alginate as the project's third element and keeping the whole design a synbio system.",
  modelDoes:
    "Models the MazE/MazF Type II toxin–antitoxin circuit: aTc-inducible MazF for on-demand elimination of vegetative cells, plasmid-dilution self-limiting, and an E. coli MazEF split that kills any wild microbe that acquires the engineered genes by horizontal gene transfer.",
  impact:
    "Function: promote rapid biofilm formation for desert bioremediation. Containment: eliminate vegetative cells via the kill switch. Long-term biosafety: pair enhanced, more uniform spore germination (gerB*) with the kill switch so dormant spores are woken and cleared rather than persisting.",
  inDesert:
    "While the colony is working it keeps making antitoxin and stays alive; add the aTc trigger, or let the plasmid dilute out over generations, and the toxin wins, self-limiting the strain. Genes that jump to native microbes carry the toxin without its cognate antitoxin, so those recipients self-eliminate.",
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
    icon: <Bug className="w-6 h-6 text-dune-orange" />,
    title: "Wet Lab Sandbox",
    desc: "Simulate physical lab assays and monitor biopolymer propagation.",
    grad: "from-dune-orange/20 via-dune-orange/5 to-transparent",
    ring: "text-dune-orange",
  },
  {
    id: "pipeline",
    href: "/portal/pipeline",
    icon: <Workflow className="w-6 h-6 text-dune-teal" />,
    title: "Physical Pipeline",
    desc: "Analyze metabolic pathways, crosslinking biophysics, and wind resistance.",
    grad: "from-dune-teal/20 via-dune-teal/5 to-transparent",
    ring: "text-dune-teal",
  },
  {
    id: "protein-suite",
    href: "/portal/protein",
    icon: <Dna className="w-6 h-6 text-dune-rose" />,
    title: "3D Protein Suite",
    desc: "Explore structural molecular dynamics and thermal decay.",
    grad: "from-dune-rose/20 via-dune-rose/5 to-transparent",
    ring: "text-dune-rose",
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
  { slug: "fba", label: "Advanced FBA", icon: <Workflow className="w-4 h-4" /> },
  { slug: "metabolic", label: "Metabolic Matrix", icon: <Dna className="w-4 h-4" /> },
  { slug: "crosslink", label: "Cross-Link Biophysics", icon: <Layers className="w-4 h-4" /> },
  { slug: "thermal", label: "Thermal Kinetics", icon: <Flame className="w-4 h-4" /> },
  { slug: "aeolian", label: "Aeolian Tunnel", icon: <Wind className="w-4 h-4" /> },
  { slug: "ecological", label: "Ecological Spread", icon: <Bug className="w-4 h-4" /> },
  { slug: "economic", label: "Economic Scalability", icon: <Coins className="w-4 h-4" /> },
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
