/**
 * Module sources registry
 * =======================
 * The grounding references behind every simulation module, keyed by ModuleId. Rendered by the
 * "Sources" window (opened from the module toolbar, or by dropping Sandyx on the Sources toggle).
 * Every source is clickable: when `url` is set the reader is taken straight to that DOI / dataset
 * page; otherwise the renderer builds a Google Scholar search of the exact label so the link still
 * lands on the primary work rather than a guessed URL.
 *
 * HONESTY NOTE — every entry here is drawn from something already in this repository: the
 * calibration provenance in src/lib/physics/constants.ts (each Calib carries a `source`) or the
 * physics module headers. For the ECONOMIC module the cost figures were checked against the
 * published biocementation and carbon-market literature (URLs below). No DOI here is invented:
 * hard-coded links are either verified references or stable dataset pages; anything uncertain is
 * left as a title search rather than a fabricated identifier. If you add a source, cite a real
 * reference you can defend to a judge — see .claude/RESPONSIBLE_AI_USE.md.
 */

import type { ModuleId } from "./prongs";

export interface SourceRef {
  /** The reference, as it should be displayed (authors/short-title + year). */
  label: string;
  /** What this source grounds in the model (one line). */
  detail: string;
  /** 'literature' = external published work; 'internal' = wet-lab / field protocol; 'model' = standard modelling framework. */
  kind: "literature" | "internal" | "model";
  /** Direct link (verified DOI / dataset / publisher). Omitted → the renderer builds a title search. */
  url?: string;
}

export interface ModuleSources {
  /** One-line framing of what the model rests on. */
  intro: string;
  sources: SourceRef[];
}

export const MODULE_SOURCES: Record<ModuleId, ModuleSources> = {
  fba: {
    intro:
      "A constraint-based metabolic optimisation grounded in standard genome-scale modelling, bounded by B. subtilis physiology.",
    sources: [
      {
        label:
          'Orth, Thiele & Palsson (2010), "What is flux balance analysis?", Nat. Biotechnol. 28:245',
        detail:
          "The canonical statement of the FBA linear program (max cᵀv s.t. S·v = 0) this module solves.",
        kind: "model",
        url: "https://doi.org/10.1038/nbt.1614",
      },
      {
        label: "B. subtilis aerobic batch physiology",
        detail:
          "Sets the glucose/O₂ uptake bounds and maintenance ATP (FBA_CALIB in constants.ts).",
        kind: "literature",
      },
    ],
  },
  metabolic: {
    intro:
      "A three-stage gene-expression cascade (transcription → translation → catalysis) integrated with RK4.",
    sources: [
      {
        label:
          "Michaelis–Menten enzyme kinetics; standard transcription/translation ODE cascade",
        detail: "The governing dM/dt, dE/dt, dP/dt balances (moduleMath.ts).",
        kind: "model",
      },
      {
        label: "γ-PGA degradation knockouts Δggt / ΔpgcA",
        detail:
          "Drive the loss term k_deg → 0; the biological basis of the overexpression prong.",
        kind: "literature",
      },
    ],
  },
  crosslink: {
    intro:
      "Divalent Ca²⁺ bridges γ-PGA carboxylates into a load-bearing network (Langmuir binding → rubber elasticity).",
    sources: [
      {
        label:
          "Langmuir adsorption isotherm; affine rubber-elasticity theory (G = νRT)",
        detail: "The two-step binding→modulus framework (CROSSLINK_CALIB).",
        kind: "model",
      },
      {
        label:
          "Polyelectrolyte–Ca²⁺ affinity (γ-PGA carboxylate Kd, order-of-magnitude)",
        detail:
          "KdPGA in constants.ts; to be refined by ITC / Ca²⁺-ISE titration.",
        kind: "literature",
      },
    ],
  },
  "ca-anchoring": {
    intro:
      "Carbonic-anhydrase surface display as a product of independent secretion/anchoring efficiencies.",
    sources: [
      {
        label: "Sortase-mediated vs binding-motif cell-wall display",
        detail:
          "The two anchoring routes multiplied in η_display (moduleMath.ts).",
        kind: "literature",
      },
      {
        label: "CA catalytic enhancement kcat ≈ 10⁶ s⁻¹ vs k_uncat ≈ 0.04 s⁻¹",
        detail:
          "caRateEnhancement in constants.ts; measured by pNPA esterase / pH-drop assay.",
        kind: "literature",
      },
    ],
  },
  caco3: {
    intro:
      "A geochemical Ca–CO₂–H₂O precipitation model with an explicit vaterite→calcite polymorph cascade.",
    sources: [
      {
        label:
          "Lassin et al. (2018) — TST surface-complexation CaCO₃ precipitation",
        detail:
          "kPrecip and ACC-ripening kinetics; the precipitation-rate law (caco3.ts header, CACO3_CALIB).",
        kind: "literature",
      },
      {
        label:
          "Rodriguez-Blanco et al. (2011) — ACC → vaterite → calcite crystallisation",
        detail:
          "The vaterite fraction, its slow solution-mediated ripening, and its reduced strength (CACO3_CALIB).",
        kind: "literature",
      },
      {
        label: "Plummer & Busenberg (1982); Brečević & Nielsen (1989)",
        detail:
          "Calcite and amorphous-CaCO₃ solubility products (pKsp) used for the saturation index.",
        kind: "literature",
      },
    ],
  },
  alginate: {
    intro:
      'Sodium-alginate "egg-box" gelation: Ca²⁺ bridges guluronate blocks; only G-blocks bear load.',
    sources: [
      {
        label: 'Grant et al. — "egg-box" model of alginate gelation',
        detail:
          "Guluronate-weighted junction density (ALGINATE_CALIB, moduleMath.ts).",
        kind: "model",
      },
      {
        label: "Commercial alginate block spec F_G ≈ 0.3–0.7",
        detail:
          "guluronateFraction in constants.ts; from supplier ¹H-NMR block analysis.",
        kind: "literature",
      },
      {
        label: "Soluble-polymer rain washout R(n) = (1−k)ⁿ",
        detail:
          "The honest solubility limitation; washoutRatePerCycle from rainfall simulation.",
        kind: "internal",
      },
    ],
  },
  thermal: {
    intro:
      "Two-state protein folding thermodynamics gating enzyme/scaffold viability with temperature.",
    sources: [
      {
        label:
          "Two-state folding equilibrium; Gibbs ΔG(T) = ΔH − TΔS, Boltzmann folded fraction",
        detail: "The viability multiplier f_folded (moduleMath.ts).",
        kind: "model",
      },
      {
        label: "Protein two-state stability curve ΔG(T)",
        detail: "The thermodynamic form the folded-fraction gate is built on.",
        kind: "literature",
      },
    ],
  },
  "protein-3d": {
    intro:
      "A structural view of the key enzymes — PgsBCA (γ-PGA synthase, Prong 1) and carbonic anhydrase (Prong 2).",
    sources: [
      {
        label: "RCSB Protein Data Bank — deposited structures (uploaded .pdb)",
        detail:
          "The Cα backbone is drawn directly from residue coordinates; no free parameters.",
        kind: "literature",
        url: "https://www.rcsb.org/",
      },
      {
        label:
          "Carbonic anhydrase II (PDB 1CA2) as the Prong-2 catalytic reference",
        detail: "Representative fold for the displayed CA enzyme.",
        kind: "literature",
        url: "https://www.rcsb.org/structure/1CA2",
      },
    ],
  },
  ecological: {
    intro:
      "Reaction–diffusion colony growth with an engineered MazE/MazF biocontainment kill switch.",
    sources: [
      {
        label:
          "Fisher–KPP reaction–diffusion + logistic growth on a resource grid",
        detail:
          "The ∂B/∂t transport-growth-containment balance (moduleMath.ts).",
        kind: "model",
      },
      {
        label: "MazE/MazF toxin–antitoxin biocontainment",
        detail:
          "The kill-switch loss term δ_kill capping viability past an environmental trigger.",
        kind: "literature",
      },
    ],
  },
  aeolian: {
    intro:
      "Bagnold sand-transport physics: engineered cohesion raises the threshold wind for grain movement.",
    sources: [
      {
        label: "Bagnold (1941), The Physics of Blown Sand and Desert Dunes",
        detail:
          "Threshold friction velocity and the cubic saltation mass-flux law (Eqs. 7–9, AEOLIAN_CALIB).",
        kind: "literature",
      },
      {
        label:
          "Shao & Lu (2000) — threshold friction velocity parameterisation",
        detail: "The threshold parameter A fit on untreated sand.",
        kind: "literature",
      },
      {
        label: "Cohesion-enhanced threshold: adhesive term γ/(ρₐd)",
        detail:
          "How crust cohesion enters the Bagnold threshold; UAE design winds 16–20 m/s.",
        kind: "internal",
      },
    ],
  },
  wetlab: {
    intro:
      "Real bench inputs (OD₆₀₀, glutamate, salinity) mapped into the same erosion physics as the wind tunnel.",
    sources: [
      {
        label: "NYUAD wet-lab γ-PGA protocol (OD₆₀₀ / glutamate / salinity)",
        detail:
          "Bench measurements feeding cohesion → the shared Bagnold threshold.",
        kind: "internal",
      },
      {
        label: "Bagnold (1941) threshold physics",
        detail: "The dune-erosion assay the lab parameters drive.",
        kind: "literature",
      },
    ],
  },
  grainsize: {
    intro:
      "Grain-size-resolved coverage: no single binder holds every grain size; the three prongs are complementary.",
    sources: [
      {
        label:
          "Erdmann et al. (2024), Discover Materials — MICP vs particle size",
        detail:
          "MICP UCS-vs-diameter sweet spot (~63–125 µm) and the coarse/fine fall-off (GRAINSIZE_CALIB).",
        kind: "literature",
        url: "https://doi.org/10.1007/s43939-024-00108-3",
      },
      {
        label:
          "UAE dune-sand grain-size distribution (D₅₀ ≈ 200 µm, well-sorted)",
        detail: "The log-normal PSD coverage is integrated over.",
        kind: "internal",
      },
    ],
  },
  composite: {
    intro:
      "Multi-prong cohesion combination: competitive Ca²⁺ partition + co-expression burden + constructive synergy + failure-mode redundancy.",
    sources: [
      {
        label: "Wei (2015); acidic-polymer CaCO₃ nucleation",
        detail:
          "γ-PGA carboxylates template/toughen calcite — the 1+2 synergy η (COMPOSITE_CALIB).",
        kind: "literature",
      },
      {
        label:
          "Ceroni (2015); Borkowski (2016) — metabolic burden of dual heterologous expression",
        detail:
          "The co-expression burden knock-down when γ-PGA synthase and CA share one cell (INTERACTION_CALIB).",
        kind: "literature",
      },
      {
        label:
          "Competitive Langmuir Ca²⁺ partition; rule-of-mixtures + redundancy",
        detail:
          "Shared-calcium mass balance and 1 − Π(1−rᵢ) failure combination (interactions.ts, moduleMath.ts).",
        kind: "model",
      },
    ],
  },
  curing: {
    intro:
      "The crust cures over the 0/8/16/24/32 h spray protocol, then weathers over months to a re-application cadence.",
    sources: [
      {
        label:
          "NYUAD field spray protocol (0/8/16/24/32 h; re-apply ~6 months)",
        detail: "Maturation window and re-application interval (CURING_CALIB).",
        kind: "internal",
      },
      {
        label: "Optimised calcite crust survives ~30 m/s",
        detail:
          "The design-wind survival floor the weathering timeline is checked against.",
        kind: "internal",
      },
      {
        label: "Per-binder maturation τ and field half-life H",
        detail:
          "Alginate fast/short, γ-PGA intermediate, calcite slow/durable — the multi-prong timing advantage.",
        kind: "internal",
      },
    ],
  },
  economic: {
    intro:
      "Bottom-up per-prong deployment cost, summed per combination and benchmarked against the published biocementation and carbon-market literature — every headline figure below is checked against a real study.",
    sources: [
      {
        label:
          '"Strategies for cost-optimized biocement production" (2025), World J. Microbiol. Biotechnol. 41',
        detail:
          "Reagent/feedstock cost drivers (calcium source, cultivation, application) behind the Prong-2 MICP cost base (ECONOMIC_CALIB).",
        kind: "literature",
        url: "https://doi.org/10.1007/s11274-025-04281-2",
      },
      {
        label:
          "Plant-derived urease EICP field study (2025), PLOS One — doi:10.1371/journal.pone.0331241",
        detail:
          "Carbonate-precipitation treatment at ≈ $52 m⁻³ vs ≈ $135 m⁻³ for microbial MICP — the order-of-magnitude reality check on caReagentCostPerHa.",
        kind: "literature",
        url: "https://doi.org/10.1371/journal.pone.0331241",
      },
      {
        label:
          "Sodium-alginate market price — bulk ≈ $6–12 kg⁻¹ (IMARC / Procurement Resource price trend, 2024)",
        detail:
          "Grounds alginateCostPerKg = 9 USD·kg⁻¹ (Prong-3 commodity binder).",
        kind: "literature",
        url: "https://www.imarcgroup.com/sodium-alginate-price-trend",
      },
      {
        label:
          "State of the Voluntary Carbon Market 2024 — average ≈ $6 tCO₂⁻¹; nature-based removals command a premium",
        detail:
          "Sets the CO₂ credit subtracted from the CaCO₃ prong (co2CreditPerKg corrected from $50 to $10 tCO₂⁻¹).",
        kind: "literature",
        url: "https://carboncredits.com/carbon-prices-today/",
      },
      {
        label:
          'Conventional baselines — USDA Forest Service, "Dust Palliative Selection and Application Guide" (9977-1207); commercial polymer emulsions (Soilworks Soiltac)',
        detail:
          "The petrochemical dust-suppressant and hard-engineering costs the biological treatment breaks even against.",
        kind: "literature",
        url: "https://www.fs.usda.gov/t-d/pubs/pdf/99771207.pdf",
      },
    ],
  },
};
