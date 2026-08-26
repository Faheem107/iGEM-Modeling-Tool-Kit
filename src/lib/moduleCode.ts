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
  language = "Python (numpy · scipy · matplotlib)",
): ModuleCode => ({
  title,
  intro,
  filename: `${id}.py`,
  codeUrl: `/code/${id}.py`,
  language,
  plots,
});

const p = (id: string, n: number, caption: string): ModulePlot => ({
  src: `/code/plots/${id}-${n}.png`,
  caption,
});

// Only the 15 computational modules get reproducible code (protein-3d and wetlab are not models).
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
      p("metabolic", 2, "Final γ-PGA yield across knockout strategies. Removing the degradation pathways lifts it."),
    ],
  ),
  crosslink: entry(
    "crosslink",
    "Ionic Cross-Linking Biophysics",
    "Langmuir Ca²⁺ binding feeding rubber-elasticity network theory (G = νRT) for γ-PGA hydrogel stiffness.",
    [
      p("crosslink", 1, "Langmuir saturation of carboxylate sites vs [Ca²⁺]."),
      p("crosslink", 2, "Shear modulus against [Ca²⁺] at several polymer densities. Calcium is what turns loose polymer into a gel."),
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
      p("ca-anchoring", 1, "The running product along each route: export, then dimerisation, then anchoring. Sortase ends at 27% of the enzyme displayed and active, the binding motif at 23%."),
      p("ca-anchoring", 2, "Normalised CA activity against realised rate-enhancement fraction. The scale is logarithmic because the enhancement spans about 10⁶."),
    ],
  ),
  alginate: entry(
    "alginate",
    "Alginate Egg-Box Gel",
    "Guluronate-weighted egg-box gelation (G = νRT) and the honest rain-washout solubility limit R(n) = (1−k)ⁿ.",
    [
      p("alginate", 1, "Gel modulus vs [Ca²⁺] at several applied alginate loadings."),
      p("alginate", 2, "Residual alginate over rain and wet cycles. It is soluble, so it washes out."),
    ],
  ),
  thermal: entry(
    "thermal",
    "Protein Thermal Stability",
    "Two-state folding sets the active-enzyme fraction. The operative melting temperature is penalised away from the pH and salinity optima.",
    [
      p("thermal", 1, "Folded and active fraction against temperature at several pH values. The melting point shifts with pH."),
      p("thermal", 2, "Operative melting temperature over pH and salinity."),
    ],
  ),
  ecological: entry(
    "ecological",
    "Ecological Spread & Containment",
    "Fisher–KPP colony front speed c = 2√(Dµ) with Ca²⁺ suppression, and kill-switch escape statistics over the deployed population.",
    [
      p("ecological", 1, "Colony front speed against local [Ca²⁺]. The calcium that cross-links the crust also slows the colony."),
      p("ecological", 2, "Escape probability vs single-cell escape frequency at deployment scale."),
    ],
  ),
  killswitch: entry(
    "killswitch",
    "MazE/MazF Kill Switch",
    "RK4 integration of the toxin–antitoxin ODE with an aTc trigger and plasmid dilution, and the resulting population viability collapse.",
    [
      p("killswitch", 1, "Toxin / antitoxin / complex dynamics after the aTc trigger."),
      p("killswitch", 2, "Population viability after induction, in log₁₀(N/N₀)."),
    ],
  ),
  aeolian: entry(
    "aeolian",
    "Aeolian Sand Transport",
    "Bagnold threshold friction velocity and cubic saltation flux. Engineered cohesion raises the threshold and cuts erosion.",
    [
      p("aeolian", 1, "Saltation mass flux against wind, untreated and treated. Cohesion raises the threshold, so the treated curve starts later and stays lower."),
      p("aeolian", 2, "Threshold wind against engineered cohesion. Over the whole range plotted the crust stays short of the 16 to 20 m/s design band."),
    ],
  ),
  grainsize: entry(
    "grainsize",
    "Grain-Size Coverage",
    "Per-prong binding vs grain diameter and the probabilistic union, integrated over the UAE dune-sand log-normal distribution.",
    [
      p("grainsize", 1, "Per-prong binding against grain diameter, with the site size distribution behind it. No single binder covers every size. The heavy dashed line is the union of the two deployed prongs."),
      p("grainsize", 2, "Site sand held, by mass, per prong combination. Combining prongs covers more of the distribution. Bars marked with a star include alginate, which is modelled for comparison and not deployed."),
    ],
  ),
  composite: entry(
    "composite",
    "Composite Strength Synthesis",
    "Competitive-Langmuir Ca²⁺ partition and co-expression burden knock each prong down before the synergy combination, plus the redundancy matrix.",
    [
      p("composite", 1, "Additive against composite cohesion across prong combinations. Two binders in one crust do not simply add."),
      p("composite", 2, "Per-scenario resilience: the best single prong against the two deployed prongs together. Combining assumes they fail independently, which is what Bacterial Death breaks."),
    ],
  ),
  curing: entry(
    "curing",
    "Curing & Deployment Timeline",
    "Per-binder maturation γ(t) = γ_mature(1−e^(−t/τ)) over the spray protocol and field weathering γ(m) = γ_mature·2^(−m/H).",
    [
      p("curing", 1, "Maturation over the 0 to 48 h spray protocol, per prong and total. Alginate sets fast, calcite ripens slowly."),
      p("curing", 2, "Field weathering over months with the re-application cadence. Calcite persists, the polymers weather."),
    ],
  ),
  economic: entry(
    "economic",
    "Economic Scalability",
    "Bottom-up per-prong deployment cost summed per combination, with capex amortisation and break-even against a conventional chemical spray.",
    [
      p("economic", 1, "All-in cost per hectare against treated area, with baselines. The per-hectare cost falls as the capex amortises."),
      p("economic", 2, "Deployment cost breakdown per combination at 100 ha. Bars marked with a star include alginate, which is modelled for comparison and not deployed."),
    ],
  ),
  exposure: entry(
    "exposure",
    "Where the sand comes from, and what reaches a site",
    "The whole chain, from a season of wind to the sand landing on one site, and to how much less would land if we treated the hotspots upwind. It downloads the same four data files the page uses and prints the findings before it draws the plots.",
    [
      {
        src: "/code/plots/exposure-1.png",
        caption:
          "How often the wind blows at each speed, against when sand is actually moving, at Al Dhafra in spring. The two barely overlap: nothing moves below a threshold, and above it the amount climbs as the cube of the wind. The average wind sits below the threshold, so putting it into the sand equation predicts no sand at all.",
      },
      {
        src: "/code/plots/exposure-2.png",
        caption:
          "Left: half of what lands at Al Dhafra in spring starts 544 km upwind in the Eastern Province sand sheets, and a sixth starts 22 km away. Right: a pilot-sized patch changes nothing measurable, and the curve only lifts past a few thousand square kilometres. The model is saying this protects a site by treating ground near it, not by treating the regional hotspots.",
      },
    ],
    "Python (numpy · matplotlib), no other libraries",
  ),
};
