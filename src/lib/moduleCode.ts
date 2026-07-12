/**
 * Module code + preliminary plots registry
 * ========================================
 * The reproducible Python behind every simulation module, keyed by ModuleId. Rendered by the
 * "Code & Plots" window (opened from the module toolbar, or by dropping Sandyx on the toggle).
 *
 * Each entry points at a runnable script served from /public/code/<id>.py and a set of matplotlib
 * preview plots served from /public/code/plots/<id>-N.png. The scripts are faithful ports of the
 * physics in src/lib/physics/*.ts (+ constants.ts); running one reproduces its plots exactly. The
 * provenance copies live in /python_models (render them all with python_models/render_all.py).
 *
 * HONESTY NOTE: these scripts reproduce ONLY what the site already models. Every constant traces to
 * src/lib/physics/constants.ts or a source cited in moduleSources.ts. No fabricated data, results, or
 * DOIs. Verify any figure against the primary work before citing it on the wiki.
 */

import type { ModuleId } from "./prongs";

export interface ModulePlot {
  /** Public path to the matplotlib PNG. */
  src: string;
  /** One-line plain-language caption of what the plot shows. */
  caption: string;
}

export interface ModuleCode {
  /** Window heading. */
  title: string;
  /** One-line framing of what the script reproduces. */
  intro: string;
  /** Suggested download filename. */
  filename: string;
  /** Public path to the runnable script (fetched for display + download). */
  codeUrl: string;
  /** Language label + hint for the reader. */
  language: string;
  /** Preliminary output plots. */
  plots: ModulePlot[];
}

const entry = (
  id: ModuleId,
  title: string,
  intro: string,
  plots: ModulePlot[],
): ModuleCode => ({
  title,
  intro,
  filename: `${id}.py`,
  codeUrl: `/code/${id}.py`,
  language: "Python (numpy · scipy · matplotlib)",
  plots,
});

const p = (id: string, n: number, caption: string): ModulePlot => ({
  src: `/code/plots/${id}-${n}.png`,
  caption,
});

// Only the 14 computational modules get reproducible code (protein-3d is a viewer, not a model).
export const MODULE_CODE: Partial<Record<ModuleId, ModuleCode>> = {
  fba: entry(
    "fba",
    "Flux Balance Analysis",
    "Solves the FBA linear program (max cᵀv s.t. S·v = 0, bounds) on a reduced B. subtilis central-carbon network with SciPy, and traces the growth-vs-precursor production envelope.",
    [
      p("fba", 1, "Optimal flux distribution at maximum growth."),
      p("fba", 2, "Production envelope: the growth-vs-precursor Pareto trade-off."),
    ],
  ),
  metabolic: entry(
    "metabolic",
    "Metabolic Gene-Expression Cascade",
    "Integrates the transcription → translation → catalysis ODE for γ-PGA with RK4, and shows how degradation-pathway knockouts (Δggt, ΔpgcA) lift the final yield.",
    [
      p("metabolic", 1, "mRNA, enzyme and γ-PGA time-courses for the double-knockout strain."),
      p("metabolic", 2, "Final γ-PGA yield across knockout strategies."),
    ],
  ),
  crosslink: entry(
    "crosslink",
    "Ionic Cross-Linking Biophysics",
    "Langmuir Ca²⁺ binding feeding rubber-elasticity network theory (G = νRT) for γ-PGA hydrogel stiffness.",
    [
      p("crosslink", 1, "Langmuir saturation of carboxylate sites vs [Ca²⁺]."),
      p("crosslink", 2, "Shear modulus vs [Ca²⁺] at several polymer densities."),
    ],
  ),
  caco3: entry(
    "caco3",
    "CaCO₃ Precipitation → Strength",
    "Geochemical Ca–CO₂–H₂O precipitation with an ACC → vaterite → calcite cascade, plus the calcite-to-UCS power law.",
    [
      p("caco3", 1, "ACC → vaterite → calcite polymorph cascade over time."),
      p("caco3", 2, "Biocement strength (UCS) power law vs load-bearing carbonate wt%."),
    ],
  ),
  "ca-anchoring": entry(
    "ca-anchoring",
    "Carbonic Anhydrase Surface Display",
    "Multiplicative display efficiency (export × dimer × anchor) for the two anchoring routes, and the log-scaled normalised CA activity.",
    [
      p("ca-anchoring", 1, "Stacked multiplicative efficiency for Sortase vs binding-motif routes."),
      p("ca-anchoring", 2, "Normalised CA activity vs realised rate-enhancement fraction."),
    ],
  ),
  alginate: entry(
    "alginate",
    "Alginate Egg-Box Gel",
    "Guluronate-weighted egg-box gelation (G = νRT) and the honest rain-washout solubility limit R(n) = (1−k)ⁿ.",
    [
      p("alginate", 1, "Gel modulus vs [Ca²⁺] at several applied alginate loadings."),
      p("alginate", 2, "Residual alginate over rain/wet cycles (solubility limit)."),
    ],
  ),
  thermal: entry(
    "thermal",
    "Protein Thermal Stability",
    "Two-state folding sets the active-enzyme fraction; the operative melting temperature is penalised away from the pH and salinity optima.",
    [
      p("thermal", 1, "Folded / active fraction vs temperature at several pH values."),
      p("thermal", 2, "Operative melting temperature over pH and salinity."),
    ],
  ),
  ecological: entry(
    "ecological",
    "Ecological Spread & Containment",
    "Fisher–KPP colony front speed c = 2√(Dµ) with Ca²⁺ suppression, and kill-switch escape statistics over the deployed population.",
    [
      p("ecological", 1, "Ca²⁺ dosing slows the colony front speed (mm/day)."),
      p("ecological", 2, "Escape probability vs single-cell escape frequency at deployment scale."),
    ],
  ),
  killswitch: entry(
    "killswitch",
    "MazE/MazF Kill Switch",
    "RK4 integration of the toxin–antitoxin ODE with an aTc trigger and plasmid dilution, and the resulting population viability collapse.",
    [
      p("killswitch", 1, "Toxin / antitoxin / complex dynamics after the aTc trigger."),
      p("killswitch", 2, "Population viability collapse in log₁₀(N/N₀)."),
    ],
  ),
  aeolian: entry(
    "aeolian",
    "Aeolian Sand Transport",
    "Bagnold threshold friction velocity and cubic saltation flux; engineered cohesion raises the threshold and cuts erosion.",
    [
      p("aeolian", 1, "Saltation mass flux vs wind, untreated vs treated crust."),
      p("aeolian", 2, "Threshold wind speed vs engineered cohesion."),
    ],
  ),
  grainsize: entry(
    "grainsize",
    "Grain-Size Coverage",
    "Per-prong binding vs grain diameter and the probabilistic union, integrated over the UAE dune-sand log-normal distribution.",
    [
      p("grainsize", 1, "Per-prong coverage vs grain diameter, with the site grain-size distribution."),
      p("grainsize", 2, "Effective bound mass fraction per prong combination."),
    ],
  ),
  composite: entry(
    "composite",
    "Composite Strength Synthesis",
    "Competitive-Langmuir Ca²⁺ partition and co-expression burden knock each prong down before the synergy combination, plus the redundancy matrix.",
    [
      p("composite", 1, "Additive vs composite cohesion across prong combinations."),
      p("composite", 2, "Per-scenario resilience: best single prong vs the full combination."),
    ],
  ),
  curing: entry(
    "curing",
    "Curing & Deployment Timeline",
    "Per-binder maturation γ(t) = γ_mature(1−e^(−t/τ)) over the spray protocol and field weathering γ(m) = γ_mature·2^(−m/H).",
    [
      p("curing", 1, "Maturation over the 0–48 h spray protocol (per prong + total)."),
      p("curing", 2, "Field weathering over months with the re-application cadence."),
    ],
  ),
  economic: entry(
    "economic",
    "Economic Scalability",
    "Bottom-up per-prong deployment cost summed per combination, with capex amortisation and break-even against a conventional chemical spray.",
    [
      p("economic", 1, "All-in cost per hectare vs treated area against baselines."),
      p("economic", 2, "Deployment cost breakdown per combination at 100 ha."),
    ],
  ),
};
