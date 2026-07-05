/**
 * Module sources registry
 * =======================
 * The grounding references behind every simulation module, keyed by ModuleId. Rendered by the
 * "Sources" window (opened from the module toolbar, or by dropping Sandyx on the Sources toggle).
 *
 * HONESTY NOTE — every entry here is drawn from something already in this repository: the
 * calibration provenance in src/lib/physics/constants.ts (each Calib carries a `source`), the
 * physics module headers, or the team's own "Research Table iGEM 2026" (cited in-code as
 * "Research Table" / "Study 3/4/5"). Nothing is invented. Canonical textbook/landmark works are
 * named only where the code already names them. If you add a source, cite a real reference you
 * can defend to a judge — see .claude/RESPONSIBLE_AI_USE.md.
 */

import type { ModuleId } from './prongs';

export interface SourceRef {
  /** The reference, as it should be displayed (authors/short-title + year). */
  label: string;
  /** What this source grounds in the model (one line). */
  detail: string;
  /** 'literature' = external published work; 'internal' = NYUAD Research Table / wet-lab; 'model' = standard modelling framework. */
  kind: 'literature' | 'internal' | 'model';
}

export interface ModuleSources {
  /** One-line framing of what the model rests on. */
  intro: string;
  sources: SourceRef[];
}

const RESEARCH_TABLE: SourceRef = {
  label: 'NYUAD iGEM 2026 — Research Table',
  detail: 'The team\'s own literature/parameter compilation; the primary internal source for every prong.',
  kind: 'internal',
};

export const MODULE_SOURCES: Record<ModuleId, ModuleSources> = {
  fba: {
    intro: 'A constraint-based metabolic optimisation grounded in standard genome-scale modelling, bounded by B. subtilis physiology.',
    sources: [
      { label: 'Orth, Thiele & Palsson (2010), "What is flux balance analysis?", Nat. Biotechnol. 28:245', detail: 'The canonical statement of the FBA linear program (max cᵀv s.t. S·v = 0) this module solves.', kind: 'model' },
      { label: 'B. subtilis aerobic batch physiology', detail: 'Sets the glucose/O₂ uptake bounds and maintenance ATP (FBA_CALIB in constants.ts).', kind: 'literature' },
      RESEARCH_TABLE,
    ],
  },
  metabolic: {
    intro: 'A three-stage gene-expression cascade (transcription → translation → catalysis) integrated with RK4.',
    sources: [
      { label: 'Michaelis–Menten enzyme kinetics; standard transcription/translation ODE cascade', detail: 'The governing dM/dt, dE/dt, dP/dt balances (moduleMath.ts).', kind: 'model' },
      { label: 'γ-PGA degradation knockouts Δggt / ΔpgcA', detail: 'Drive the loss term k_deg → 0; the biological basis of the overexpression prong.', kind: 'literature' },
      RESEARCH_TABLE,
    ],
  },
  crosslink: {
    intro: 'Divalent Ca²⁺ bridges γ-PGA carboxylates into a load-bearing network (Langmuir binding → rubber elasticity).',
    sources: [
      { label: 'Langmuir adsorption isotherm; affine rubber-elasticity theory (G = νRT)', detail: 'The two-step binding→modulus framework (CROSSLINK_CALIB).', kind: 'model' },
      { label: 'Polyelectrolyte–Ca²⁺ affinity (γ-PGA carboxylate Kd, order-of-magnitude)', detail: 'KdPGA in constants.ts; to be refined by ITC / Ca²⁺-ISE titration.', kind: 'literature' },
      RESEARCH_TABLE,
    ],
  },
  'ca-anchoring': {
    intro: 'Carbonic-anhydrase surface display as a product of independent secretion/anchoring efficiencies.',
    sources: [
      { label: 'Sortase-mediated vs binding-motif cell-wall display', detail: 'The two anchoring routes multiplied in η_display (moduleMath.ts).', kind: 'literature' },
      { label: 'CA catalytic enhancement kcat ≈ 10⁶ s⁻¹ vs k_uncat ≈ 0.04 s⁻¹', detail: 'caRateEnhancement in constants.ts; measured by pNPA esterase / pH-drop assay.', kind: 'literature' },
      RESEARCH_TABLE,
    ],
  },
  caco3: {
    intro: 'A geochemical Ca–CO₂–H₂O precipitation model with an explicit vaterite→calcite polymorph cascade.',
    sources: [
      { label: 'Lassin et al. (2018) — TST surface-complexation CaCO₃ precipitation', detail: 'kPrecip and ACC-ripening kinetics; the precipitation-rate law (caco3.ts header, CACO3_CALIB).', kind: 'literature' },
      { label: 'Rodriguez-Blanco et al. (2011) — ACC → vaterite → calcite crystallisation', detail: 'The vaterite fraction, its slow solution-mediated ripening, and its reduced strength (CACO3_CALIB).', kind: 'literature' },
      { label: 'Plummer & Busenberg (1982); Brečević & Nielsen (1989)', detail: 'Calcite and amorphous-CaCO₃ solubility products (pKsp) used for the saturation index.', kind: 'literature' },
      RESEARCH_TABLE,
    ],
  },
  alginate: {
    intro: 'Sodium-alginate "egg-box" gelation: Ca²⁺ bridges guluronate blocks; only G-blocks bear load.',
    sources: [
      { label: 'Grant et al. — "egg-box" model of alginate gelation', detail: 'Guluronate-weighted junction density (ALGINATE_CALIB, moduleMath.ts).', kind: 'model' },
      { label: 'Commercial alginate block spec F_G ≈ 0.3–0.7', detail: 'guluronateFraction in constants.ts; from supplier ¹H-NMR block analysis.', kind: 'literature' },
      { label: 'Soluble-polymer rain washout R(n) = (1−k)ⁿ', detail: 'The honest solubility limitation; washoutRatePerCycle from rainfall simulation.', kind: 'internal' },
      RESEARCH_TABLE,
    ],
  },
  thermal: {
    intro: 'Two-state protein folding thermodynamics gating enzyme/scaffold viability with temperature.',
    sources: [
      { label: 'Two-state folding equilibrium; Gibbs ΔG(T) = ΔH − TΔS, Boltzmann folded fraction', detail: 'The viability multiplier f_folded (moduleMath.ts).', kind: 'model' },
      RESEARCH_TABLE,
    ],
  },
  'protein-3d': {
    intro: 'A structural view of the key enzymes — PgsBCA (γ-PGA synthase, Prong 1) and carbonic anhydrase (Prong 2).',
    sources: [
      { label: 'RCSB Protein Data Bank — deposited structures (uploaded .pdb)', detail: 'The Cα backbone is drawn directly from residue coordinates; no free parameters.', kind: 'literature' },
      { label: 'Carbonic anhydrase II (e.g. PDB 1CA2) as the Prong-2 catalytic reference', detail: 'Representative fold for the displayed CA enzyme.', kind: 'literature' },
      RESEARCH_TABLE,
    ],
  },
  ecological: {
    intro: 'Reaction–diffusion colony growth with an engineered MazE/MazF biocontainment kill switch.',
    sources: [
      { label: 'Fisher–KPP reaction–diffusion + logistic growth on a resource grid', detail: 'The ∂B/∂t transport-growth-containment balance (moduleMath.ts).', kind: 'model' },
      { label: 'MazE/MazF toxin–antitoxin biocontainment', detail: 'The kill-switch loss term δ_kill capping viability past an environmental trigger.', kind: 'literature' },
      RESEARCH_TABLE,
    ],
  },
  aeolian: {
    intro: 'Bagnold sand-transport physics: engineered cohesion raises the threshold wind for grain movement.',
    sources: [
      { label: 'Bagnold (1941), The Physics of Blown Sand and Desert Dunes', detail: 'Threshold friction velocity and the cubic saltation mass-flux law (Eqs. 7–9, AEOLIAN_CALIB).', kind: 'literature' },
      { label: 'Shao & Lu (2000) — threshold friction velocity parameterisation', detail: 'The threshold parameter A fit on untreated sand.', kind: 'literature' },
      { label: 'Cohesion-enhanced threshold: adhesive term γ/(ρₐd)', detail: 'How crust cohesion enters the Bagnold threshold; UAE design winds 16–20 m/s (Research Table).', kind: 'internal' },
      RESEARCH_TABLE,
    ],
  },
  wetlab: {
    intro: 'Real bench inputs (OD₆₀₀, glutamate, salinity) mapped into the same erosion physics as the wind tunnel.',
    sources: [
      { label: 'NYUAD wet-lab γ-PGA protocol (OD₆₀₀ / glutamate / salinity)', detail: 'Bench measurements feeding cohesion → the shared Bagnold threshold.', kind: 'internal' },
      { label: 'Bagnold (1941) threshold physics', detail: 'The dune-erosion assay the lab parameters drive.', kind: 'literature' },
      RESEARCH_TABLE,
    ],
  },
  grainsize: {
    intro: 'Grain-size-resolved coverage: no single binder holds every grain size; the three prongs are complementary.',
    sources: [
      { label: 'Study 4 — Xiao et al. (2024), MICP vs particle size', detail: 'MICP UCS-vs-diameter sweet spot (~63–125 µm) and the coarse/fine fall-off (GRAINSIZE_CALIB).', kind: 'literature' },
      { label: 'UAE dune-sand grain-size distribution (D₅₀ ≈ 200 µm, well-sorted)', detail: 'The log-normal PSD coverage is integrated over (Research Table).', kind: 'internal' },
      RESEARCH_TABLE,
    ],
  },
  composite: {
    intro: 'Multi-prong cohesion combination: competitive Ca²⁺ partition + co-expression burden + constructive synergy + failure-mode redundancy.',
    sources: [
      { label: 'Wei (2015); acidic-polymer CaCO₃ nucleation', detail: 'γ-PGA carboxylates template/toughen calcite — the 1+2 synergy η (COMPOSITE_CALIB).', kind: 'literature' },
      { label: 'Ceroni (2015); Borkowski (2016) — metabolic burden of dual heterologous expression', detail: 'The co-expression burden knock-down when γ-PGA synthase and CA share one cell (INTERACTION_CALIB).', kind: 'literature' },
      { label: 'Competitive Langmuir Ca²⁺ partition; rule-of-mixtures + redundancy', detail: 'Shared-calcium mass balance and 1 − Π(1−rᵢ) failure combination (interactions.ts, moduleMath.ts).', kind: 'model' },
      RESEARCH_TABLE,
    ],
  },
  curing: {
    intro: 'The crust cures over the 0/8/16/24/32 h spray protocol, then weathers over months to a re-application cadence.',
    sources: [
      { label: 'Study 5 — NYUAD field spray protocol (0/8/16/24/32 h; re-apply ~6 months)', detail: 'Maturation window and re-application interval (CURING_CALIB).', kind: 'internal' },
      { label: 'Study 3 — optimised calcite crust survives ~30 m/s', detail: 'The design-wind survival floor the weathering timeline is checked against.', kind: 'internal' },
      { label: 'Per-binder maturation τ and field half-life H', detail: 'Alginate fast/short, γ-PGA intermediate, calcite slow/durable — the multi-prong timing advantage.', kind: 'internal' },
      RESEARCH_TABLE,
    ],
  },
  economic: {
    intro: 'Bottom-up per-prong deployment cost, summed per combination and compared to conventional stabilisers.',
    sources: [
      { label: 'Feedstock/commodity quotes (dextrose, CaCl₂, sodium alginate)', detail: 'Per-prong cost bases in ECONOMIC_CALIB (to be replaced by project-scale quotes).', kind: 'internal' },
      { label: 'Conventional baselines: petrochemical dust-suppressant; concrete blanket', detail: 'The per-hectare costs the biological treatment breaks even against.', kind: 'literature' },
      { label: 'Voluntary carbon-market CO₂ credit', detail: 'The climate co-benefit priced into the CaCO₃ prong.', kind: 'internal' },
      RESEARCH_TABLE,
    ],
  },
};
