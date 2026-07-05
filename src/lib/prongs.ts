/**
 * Prong & Module Registry
 * =======================
 * Drives the prong-aware Simulation Workspace. A "combination" is any non-empty subset of
 * the three prongs (a single prong counts). `modulesForSelection()` returns the meaningful,
 * ordered set of modules for that exact combination — different combinations surface
 * genuinely different module sets.
 */

import type { LucideIcon } from 'lucide-react';
import {
  Sparkles, Layers, ShieldCheck, Workflow, Dna, FlaskConical, Atom, Wind, Bug,
  Coins, Thermometer, Globe, Combine, Droplets, Beaker, Ruler, CalendarClock,
} from 'lucide-react';
import type { ProngId } from './physics';

export type { ProngId };

/** Lightweight prong metadata for the workspace (the landing page keeps its own rich copy). */
export interface ProngMeta {
  id: ProngId;
  title: string;
  molecule: string;
  /** True for engineered B. subtilis prongs (1 & 2); false for the applied alginate (3). */
  bacterial: boolean;
  /** Mechanical signature that feeds the composite cohesion. */
  strengthMetric: 'shearModulus' | 'UCS';
  icon: LucideIcon;
  accent: string; // tailwind text color
}

export const PRONGS: Record<ProngId, ProngMeta> = {
  1: { id: 1, title: 'γ-PGA Overexpression', molecule: 'poly-γ-glutamic acid', bacterial: true, strengthMetric: 'shearModulus', icon: Sparkles, accent: 'text-amber-500' },
  2: { id: 2, title: 'Carbonic Anhydrase → CaCO₃', molecule: 'calcium carbonate', bacterial: true, strengthMetric: 'UCS', icon: Layers, accent: 'text-emerald-500' },
  3: { id: 3, title: 'Sodium Alginate', molecule: 'alginate biopolymer', bacterial: false, strengthMetric: 'shearModulus', icon: ShieldCheck, accent: 'text-rose-500' },
};

export const ALL_PRONGS: ProngId[] = [1, 2, 3];

/** Module scales, ordered micro → macro → synthesis. */
export type ModuleScale = 'genetic' | 'molecular' | 'protein' | 'material' | 'ecology' | 'macro' | 'synthesis' | 'deployment' | 'economic';
const SCALE_ORDER: Record<ModuleScale, number> = {
  genetic: 1, molecular: 2, protein: 3, material: 4, ecology: 5, macro: 6, synthesis: 7, deployment: 8, economic: 9,
};

export type ModuleId =
  | 'fba' | 'metabolic' | 'crosslink'
  | 'caco3' | 'ca-anchoring'
  | 'alginate'
  | 'thermal' | 'protein-3d'
  | 'ecological' | 'aeolian' | 'wetlab' | 'grainsize' | 'composite' | 'curing' | 'economic';

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
  { id: 'fba', title: 'Flux Balance Analysis', blurb: 'Constraint-based metabolic optimization (S·v=0) routing carbon to the precursor.', scale: 'genetic', icon: Workflow, appliesTo: anyBacterial },
  { id: 'metabolic', title: 'Intracellular γ-PGA Kinetics', blurb: 'RK4 ODE of transcription → translation → biopolymer accumulation.', scale: 'molecular', icon: Dna, appliesTo: (s) => has(s, 1) },
  { id: 'ca-anchoring', title: 'Carbonic Anhydrase Display', blurb: 'Sortase vs binding-motif surface anchoring & CA activity.', scale: 'protein', icon: FlaskConical, appliesTo: (s) => has(s, 2) },
  { id: 'caco3', title: 'CaCO₃ Precipitation → UCS', blurb: 'Geochemical supersaturation → calcite → unconfined compressive strength + CO₂ capture.', scale: 'material', icon: Atom, appliesTo: (s) => has(s, 2) },
  { id: 'crosslink', title: 'γ-PGA Ca²⁺ Cross-Linking', blurb: 'Langmuir binding → network density → shear modulus G=νRT.', scale: 'material', icon: Layers, appliesTo: (s) => has(s, 1) },
  { id: 'alginate', title: 'Alginate Egg-Box Gel', blurb: 'Ca²⁺ egg-box gelation, moisture retention, and rain washout durability.', scale: 'material', icon: Droplets, appliesTo: (s) => has(s, 3) },
  { id: 'thermal', title: 'Protein Thermal Stability', blurb: 'Two-state folding thermodynamics gating enzyme/scaffold viability.', scale: 'protein', icon: Thermometer, appliesTo: anyBacterial },
  { id: 'protein-3d', title: '3D Protein Explorer', blurb: 'Structural view of PgsBCA (Prong 1) or Carbonic Anhydrase (Prong 2).', scale: 'protein', icon: Globe, appliesTo: anyBacterial },
  { id: 'ecological', title: 'Ecological Spread & Kill Switch', blurb: 'Reaction-diffusion colony growth with MazE/MazF biocontainment — any engineered B. subtilis prong.', scale: 'ecology', icon: Bug, appliesTo: anyBacterial },
  { id: 'aeolian', title: 'Aeolian Wind Tunnel', blurb: 'Bagnold threshold + saltation flux driven by the combined crust cohesion (all prongs).', scale: 'macro', icon: Wind, appliesTo: (s) => s.length > 0 },
  // The bench assay is glutamate substrate → γ-PGA yield → dune crust — a Prong-1 protocol.
  { id: 'wetlab', title: 'Wet-Lab Sandbox (γ-PGA)', blurb: 'Feed real γ-PGA lab parameters (OD600, glutamate, salinity) into a 2D dune-erosion assay.', scale: 'macro', icon: Beaker, appliesTo: (s) => has(s, 1) },
  // Grain-size coverage: how the active binder(s) hold the UAE dune-sand size distribution.
  // Useful for a single prong (shows its grain-size gap) and decisive for combinations (the prongs
  // are grain-size complementary — the "cover all sizes" thesis).
  { id: 'grainsize', title: 'Grain-Size Coverage', blurb: 'How the binders cover the UAE dune-sand grain-size distribution — MICP\'s 63–125 µm sweet spot vs the coarse/fine gaps γ-PGA and alginate close.', scale: 'macro', icon: Ruler, appliesTo: (s) => s.length > 0 },
  { id: 'composite', title: 'Composite Strength Synthesis', blurb: 'Multi-prong cohesion combination + failure-mode robustness.', scale: 'synthesis', icon: Combine, appliesTo: (s) => s.length >= 2 },
  // Curing/deployment timeline: how the crust matures over the 0/8/16/24/32 h spray protocol and
  // weathers until re-application. Universal (a single prong shows its own life), but the multi-prong
  // early-strength + durability trade-off is the point.
  { id: 'curing', title: 'Curing & Deployment Timeline', blurb: 'Maturation over the 32 h spray protocol → months-scale weathering → re-application cadence. Fast-setting polymers buy early strength; the calcite floor buys longevity.', scale: 'deployment', icon: CalendarClock, appliesTo: (s) => s.length > 0 },
  { id: 'economic', title: 'Economic Scalability', blurb: 'Per-prong cost basis and break-even vs conventional stabilizers.', scale: 'economic', icon: Coins, appliesTo: (s) => s.length > 0 },
];

/** Ordered, de-duplicated module list for a given prong selection. */
export function modulesForSelection(selected: ProngId[]): ModuleMeta[] {
  return MODULE_REGISTRY
    .filter((m) => m.appliesTo(selected))
    .sort((a, b) => SCALE_ORDER[a.scale] - SCALE_ORDER[b.scale]);
}

/** Human label for a combination, e.g. "γ-PGA + CaCO₃". */
export function combinationLabel(selected: ProngId[]): string {
  return selected.map((p) => PRONGS[p].title.split(' ')[0]).join(' + ');
}
