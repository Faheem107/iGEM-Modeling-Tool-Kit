import {
  Sparkles,
  Layers,
  ShieldCheck,
  Bug,
  Workflow,
  Dna,
  Wind,
  Flame,
  Coins,
} from "lucide-react";
import type { ReactNode } from "react";

// Prong-tailored simulation lives at /model?prongs=1,2 — one shared source of truth
// for the three engineering prongs, the portal cards, and the pipeline sub-nav.

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
}

export const PRONGS: Prong[] = [
  {
    id: 1,
    title: "Polymer Overexpression",
    icon: <Sparkles className="w-8 h-8 text-dune-orange" />,
    short: "Gamma-PGA bio-adhesive matrix",
    whatItIs:
      "Enhancing the natural production of Gamma-PGA in Bacillus subtilis to act as a primary bio-adhesive matrix.",
    modelDoes:
      "Simulates metabolic flux, cross-linking thermodynamics with calcium ions, and calculates the resulting shear modulus.",
    impact:
      "Maximizes structural integrity and provides a biodegradable crust capable of withstanding severe wind friction.",
    inDesert:
      "Sprayed onto the dune, the bacteria secrete poly-γ-glutamic acid — a sticky, water-retaining biopolymer that glues loose sand grains into a flexible living crust and holds the moisture the colony needs to survive the heat.",
  },
  {
    id: 2,
    title: "Carbonic Anhydrase & Sortase",
    icon: <Layers className="w-8 h-8 text-dune-teal" />,
    short: "Non-ureolytic MICP biomineralization",
    whatItIs:
      "Engineering B. subtilis to secrete Carbonic Anhydrase (CA) and anchor it to the cell surface via Sortase-mediated ligation. This enzyme sequesters CO2 and water to form calcium carbonate crystals without producing toxic ammonia.",
    modelDoes:
      "Simulates Sortase & Sorting Signal functionality, CA dimerization kinetics, and Signal Peptide efficiency to predict successful covalent anchoring and biomineralization rates.",
    impact:
      "Provides a sustainable, ammonia-free pathway to cement sand grains together, permanently sequestering atmospheric CO2 while drastically improving crust durability.",
    inDesert:
      "In the sand, the surface-displayed carbonic anhydrase pulls CO₂ from the air and, using calcium already present in desert dust, grows calcium-carbonate cement between grains — hardening the surface into a durable, ammonia-free biocement while locking away carbon.",
  },
  {
    id: 3,
    title: "Commercial Biopolymer Backup",
    icon: <ShieldCheck className="w-8 h-8 text-dune-rose" />,
    short: "Sodium Alginate fail-safe",
    whatItIs:
      "Utilizing Sodium Alginate, a robust commercial biopolymer, as a fail-safe additive if engineered bacteria fail to establish in extreme, fluctuating desert conditions.",
    modelDoes:
      "Models the rheological properties, gelation thermodynamics, and cross-linking efficiency of Sodium Alginate under extreme temperatures and salinity.",
    impact:
      "Ensures reliable, immediate sand stabilization in the harshest environments, providing a dependable fallback to guarantee project success.",
    inDesert:
      "As a fail-safe, food-grade sodium alginate is cross-linked with calcium on contact to form an 'egg-box' gel that instantly binds the surface — guaranteeing stabilization even where the engineered bacteria struggle to establish.",
  },
];

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
