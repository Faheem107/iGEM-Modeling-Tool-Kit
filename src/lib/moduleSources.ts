/**
 * Module sources registry
 * =======================
 * The grounding references behind every simulation module, keyed by ModuleId. Rendered by the
 * "Sources" window (opened from the module toolbar, or by dropping Sandyx on the Sources toggle).
 * Every source is clickable: when `url` is set the reader is taken straight to that DOI / dataset
 * page; otherwise the renderer builds a Google Scholar search of the exact label so the link still
 * lands on the primary work rather than a guessed URL.
 *
 * HONESTY NOTE, every entry here is drawn from something already in this repository: the
 * calibration provenance in src/lib/physics/constants.ts (each Calib carries a `source`) or the
 * physics module headers. For the ECONOMIC module the cost figures were checked against the
 * published biocementation and carbon-market literature (URLs below). No DOI here is invented:
 * hard-coded links are either verified references or stable dataset pages; anything uncertain is
 * left as a title search rather than a fabricated identifier. If you add a source, cite a real
 * reference you can defend to a judge.
 */

import type { ModuleId } from "./prongs";

export interface SourceRef {
  /** The reference, as it should be displayed (authors/short-title + year). */
  label: string;
  /**
   * The full reference in ACS style, which is what the wiki and the report have
   * to print. Present for published work we can cite exactly; absent for an
   * internal protocol or a standard framework, where `label` is the reference.
   */
  citation?: string;
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
        citation:
          "Orth, J. D.; Thiele, I.; Palsson, B. Ø. What Is Flux Balance Analysis? Nat. Biotechnol. 2010, 28 (3), 245–248.",
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
        citation:
          "Michaelis, L.; Menten, M. L. Die Kinetik der Invertinwirkung. Biochem. Z. 1913, 49, 333–369.",
        detail: "The governing dM/dt, dE/dt, dP/dt balances (moduleMath.ts).",
        kind: "model",
      },
      {
        label: "γ-PGA degradation knockouts Δggt / ΔpgcA",
        detail:
          "Drive the loss term k_deg → 0. The biological basis of the overexpression route.",
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
        citation:
          "Langmuir, I. The Adsorption of Gases on Plane Surfaces of Glass, Mica and Platinum. J. Am. Chem. Soc. 1918, 40 (9), 1361–1403. Flory, P. J. Principles of Polymer Chemistry; Cornell University Press: Ithaca, NY, 1953.",
        detail: "The two-step binding→modulus framework (CROSSLINK_CALIB).",
        kind: "model",
      },
      {
        label:
          "Polyelectrolyte–Ca²⁺ affinity (γ-PGA carboxylate Kd, order-of-magnitude)",
        detail: "KdPGA in constants.ts. To be refined by ITC / Ca²⁺-ISE titration.",
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
        citation:
          "Mazmanian, S. K.; Liu, G.; Ton-That, H.; Schneewind, O. Staphylococcus aureus Sortase, an Enzyme That Anchors Surface Proteins to the Cell Wall. Science 1999, 285 (5428), 760–763.",
        detail:
          "The two anchoring routes multiplied in η_display (moduleMath.ts).",
        kind: "literature",
      },
      {
        label: "CA catalytic enhancement kcat ≈ 10⁶ s⁻¹ vs k_uncat ≈ 0.04 s⁻¹",
        detail:
          "caRateEnhancement in constants.ts. Measured by pNPA esterase / pH-drop assay.",
        kind: "literature",
      },
      {
        label: "The four step efficiencies are estimates, not measurements",
        detail:
          "Export 0.70, dimerisation 0.65, sortase 0.60 and binding motif 0.50 (CA_DISPLAY_CALIB) are the wet lab's working numbers for a choice it has not made yet. The product of four estimates is an estimate. What survives a wide range of them is the ordering of the two routes, not the 27%.",
        kind: "internal",
      },
    ],
  },
  caco3: {
    intro:
      "A geochemical Ca–CO₂–H₂O precipitation model with an explicit vaterite→calcite polymorph cascade.",
    sources: [
      {
        label:
          "Lassin et al. (2018), TST surface-complexation CaCO₃ precipitation",
        detail:
          "kPrecip and ACC-ripening kinetics. The precipitation-rate law (caco3.ts header, CACO3_CALIB).",
        kind: "literature",
      },
      {
        label:
          "Rodriguez-Blanco et al. (2011), ACC → vaterite → calcite crystallisation",
        citation:
          "Rodriguez-Blanco, J. D.; Shaw, S.; Benning, L. G. The Kinetics and Mechanisms of Amorphous Calcium Carbonate (ACC) Crystallization to Calcite, via Vaterite. Nanoscale 2011, 3 (1), 265–271.",
        detail:
          "The vaterite fraction, its slow solution-mediated ripening, and its reduced strength (CACO3_CALIB).",
        kind: "literature",
      },
      {
        label: "Plummer & Busenberg (1982); Brečević & Nielsen (1989)",
        citation:
          "Plummer, L. N.; Busenberg, E. The Solubilities of Calcite, Aragonite and Vaterite in CO₂–H₂O Solutions between 0 and 90 °C. Geochim. Cosmochim. Acta 1982, 46 (6), 1011–1040.",
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
        label: 'Grant et al., "egg-box" model of alginate gelation',
        detail:
          "Guluronate-weighted junction density (ALGINATE_CALIB, moduleMath.ts).",
        citation:
          "Grant, G. T.; Morris, E. R.; Rees, D. A.; Smith, P. J. C.; Thom, D. Biological Interactions between Polysaccharides and Divalent Cations: The Egg-Box Model. FEBS Lett. 1973, 32 (1), 195–198.",
        kind: "model",
      },
      {
        label: "Commercial alginate block spec F_G ≈ 0.3–0.7",
        detail:
          "guluronateFraction in constants.ts. From supplier ¹H-NMR block analysis.",
        kind: "literature",
      },
      {
        label: "Soluble-polymer rain washout R(n) = (1−k)ⁿ",
        detail:
          "The honest solubility limitation. The washoutRatePerCycle constant comes from rainfall simulation.",
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
      {
        label: "No measured melting point, for any protein in this project",
        detail:
          "Tm₀ = 52 °C, the 4.5 °C transition width and both penalty coefficients (THERMAL_CALIB) are placeholders for a mesophilic B. subtilis enzyme. Published midpoints for human carbonic anhydrase II sit nearer 60 °C, and none has been published for PgsBCA. Read the shape of the curve, not the temperature on it.",
        kind: "internal",
      },
    ],
  },
  "protein-3d": {
    intro:
      "A structural view of the key enzymes, PgsBCA (γ-PGA synthase, Route 1) and carbonic anhydrase (Route 2).",
    sources: [
      {
        label: "RCSB Protein Data Bank, deposited structures (uploaded .pdb)",
        detail:
          "The Cα backbone is drawn directly from residue coordinates. No free parameters.",
        kind: "literature",
        url: "https://www.rcsb.org/",
      },
      {
        label:
          "Carbonic anhydrase II (PDB 1CA2) as the Route 2 catalytic reference",
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
        citation:
          "Bagnold, R. A. The Physics of Blown Sand and Desert Dunes; Methuen: London, 1941.",
        detail:
          "Threshold friction velocity and the cubic saltation mass-flux law (Eqs. 7–9, AEOLIAN_CALIB).",
        kind: "literature",
      },
      {
        label:
          "Shao & Lu (2000), threshold friction velocity parameterisation",
        citation:
          "Shao, Y.; Lu, H. A Simple Expression for Wind Erosion Threshold Friction Velocity. J. Geophys. Res. Atmos. 2000, 105 (D17), 22437–22443.",
        detail: "The threshold parameter A fit on untreated sand.",
        kind: "literature",
      },
      {
        label: "Cohesion-enhanced threshold: adhesive term γ/(ρₐd)",
        detail:
          "How crust cohesion enters the Bagnold threshold. UAE design winds 16–20 m/s.",
        kind: "internal",
      },
      {
        label:
          "Abdelfattah (2009), Soil Survey Horizons 50:3, doi:10.2136/sh2009.1.0003",
        citation:
          "Abdelfattah, M. A. Land Degradation Indicators and Management Options in the Desert Environment of Abu Dhabi. Soil Surv. Horiz. 2009, 50 (1), 3–10.",
        detail:
          "Measured in Abu Dhabi Emirate dune soils: 70 to 92 percent of sand movement is saltation and only 2 to 8 percent is suspension. This is the local evidence that the threshold is the right thing to model. Sand here hops; it mostly does not fly.",
        kind: "literature",
        url: "https://doi.org/10.2136/sh2009.1.0003",
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
        citation:
          "Bagnold, R. A. The Physics of Blown Sand and Desert Dunes; Methuen: London, 1941.",
        detail: "The dune-erosion assay the lab parameters drive.",
        kind: "literature",
      },
    ],
  },
  grainsize: {
    intro:
      "Grain-size-resolved coverage: no single binder holds every grain size. The three routes are complementary.",
    sources: [
      {
        label:
          "Erdmann et al. (2024), Discover Materials, MICP vs particle size",
        citation:
          "Erdmann, N.; et al. Influence of Particle Size on Microbially Induced Calcite Precipitation. Discovery Mater. 2024, 4, 34.",
        detail:
          "Compressive strength peaks at 63 to 125 µm (about 3.1 and 2.9 MPa), falls to about 1.6 MPa at 250 µm and about 0.7 MPa at 500 µm. That curve is the whole shape of this module: coarse pores are too wide to bridge, fine ones too tight for cells to enter.",
        kind: "literature",
        url: "https://doi.org/10.1007/s43939-024-00108-3",
      },
      {
        label:
          "UAE dune-sand grain-size distribution (D₅₀ ≈ 200 µm, well-sorted)",
        detail: "The log-normal PSD coverage is integrated over.",
        kind: "internal",
      },
      {
        label: "This module and the exposure page do not use the same grain size",
        detail:
          "Here the median grain is 200 µm. The exposure page uses 364 µm, taken from Benaafi's measured Rub' al Khali sand. That is nearly a factor of two on the same desert, and it matters because strength falls steeply across exactly that interval. We have not resolved which is right for the ground we would treat, and until we measure our own sand both numbers stay as they are rather than being quietly averaged.",
        kind: "internal",
      },
    ],
  },
  composite: {
    intro:
      "Multi-route cohesion combination: competitive Ca²⁺ partition + co-expression burden + constructive synergy + failure-mode redundancy.",
    sources: [
      {
        label: "Wei (2015); acidic-polymer CaCO₃ nucleation",
        detail:
          "γ-PGA carboxylates template/toughen calcite, the 1+2 synergy η (COMPOSITE_CALIB).",
        kind: "literature",
      },
      {
        label:
          "Ceroni (2015); Borkowski (2016), metabolic burden of dual heterologous expression",
        citation:
          "Ceroni, F.; Algar, R.; Stan, G.-B.; Ellis, T. Quantifying Cellular Capacity Identifies Gene Expression Designs with Reduced Burden. Nat. Methods 2015, 12 (5), 415–418.",
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
        label: "Pisithkul et al. (2019), mBio 10:e00623-19",
        citation:
          "Pisithkul, T.; Schroeder, J. W.; Trujillo, E. A.; et al. Metabolic Remodeling during Biofilm Development of Bacillus subtilis. mBio 2019, 10 (3), e00623-19.",
        detail:
          "B. subtilis NCIB3610 pellicles: fragile at about 12 h, mature between 20 and 32 h. This is where the 32 h maturation window comes from. It was measured in standing liquid culture at 37 °C on defined medium, not in sand and not in the heat, so it sets the shape of the curve rather than its timing in the field.",
        kind: "literature",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6529636/",
      },
      {
        label:
          "Ulan Buh Desert field trial, Geoderma, doi:10.1016/j.geoderma.2020.114723",
        citation:
          "Meng, H.; Gao, Y.; He, J.; Qi, Y.; Hang, L. Microbially Induced Carbonate Precipitation for Wind Erosion Control of Desert Soil: Field-Scale Tests. Geoderma 2021, 383, 114723.",
        detail:
          "Sprayed 0.2 M cementation solution at 4 L/m². The 12.5 mm crust it grew held a 30 m/s wind for 2 min and was still stable at 180 days, which is where the design wind and the six-month interval come from. The organism was Sporosarcina pasteurii, not B. subtilis, and 180 days is where they stopped looking rather than when the crust failed.",
        kind: "literature",
        url: "https://doi.org/10.1016/j.geoderma.2020.114723",
      },
      {
        label: "Per-binder maturation τ and field half-life H",
        detail:
          "Alginate fast/short, γ-PGA intermediate, calcite slow/durable, the advantage of running both.",
        kind: "internal",
      },
      {
        label: "The two papers above are the wrong system, and the rest has none",
        detail:
          "One is a liquid culture, the other a different organism, so both are borrowed rather than measured here. Behind the per-binder time constants and the field half-lives there is nothing at all: no weathering study, no measured half-life. This is still the least externally supported module on the site, and the months on its axis should be read that way.",
        kind: "internal",
      },
    ],
  },
  economic: {
    intro:
      "Bottom-up per-route deployment cost, summed per combination and compared against conventional treatment. None of the prices below is a supplier quote yet, so read the comparison rather than the absolute figures.",
    sources: [
      {
        label: "None of the thirteen cost figures is a supplier quote",
        detail:
          "Every one of them is our own estimate, and each carries a wide range: the calcium and enzyme figure is 650 USD per hectare with a range of 200 to 1500, a factor of seven and a half. The verification note attached to each constant is written as a job still to do, not as a price already obtained.",
        kind: "internal",
      },
      {
        label:
          "Yan, Nakashima, Takano & Kawasaki (2025), World J. Microbiol. Biotechnol. 41",
        citation:
          "Yan, X.; Nakashima, K.; Takano, C.; Kawasaki, S. Cost Reduction Strategies for Microbially Induced Carbonate Precipitation. World J. Microbiol. Biotechnol. 2025, 41, 96.",
        detail:
          "Where the cost of biocement actually goes: cheaper media and lower-grade cementation chemicals cut it by large fractions. The paper reports those fractions, not prices, so it tells us which line items matter and cannot set any figure here.",
        kind: "literature",
        url: "https://doi.org/10.1007/s11274-025-04281-2",
      },
      {
        label:
          "Plant-derived urease EICP costing (2025), PLOS One, doi:10.1371/journal.pone.0331241, Table 3",
        detail:
          "Enzymatic carbonate precipitation at about $52 per m³ against about $135 per m³ for microbial MICP. Both are worked-out estimates from a study about locking heavy metals into soil, not money anyone actually spent in a field, and they pay for treating a deep column of soil rather than a thin surface crust. Read the ratio between the two routes, not either number against ours.",
        kind: "literature",
        url: "https://doi.org/10.1371/journal.pone.0331241",
      },
      {
        label: "Why our per-hectare figure is so far under that $135 per m³",
        detail:
          "650 USD buys the dose for a 12.5 mm crust, which is 125 m³ of soil in a hectare, so about 5 USD per m³. The dose scales with depth, so that per-m³ figure holds at any depth. The gap is mostly real: those studies cement a whole soil column to a load-bearing strength, we grow a thin crust to resist wind, and our route makes carbonate from CO₂ rather than urea so it skips roughly 480 kg of urea per hectare. The part we cannot yet check is whether one pore volume of reagent is really enough at depths well beyond the 12.5 mm field trial.",
        kind: "internal",
      },
      {
        label:
          "Sodium-alginate market price, IMARC price trend (Sept 2025: US $13.2, Germany $10.6, France $10.2, Spain $8.9 kg⁻¹)",
        detail:
          "We use 10.5 USD per kg, the middle of that spread. It is about 20 percent under the US price, so the alginate route is still costed slightly in its favour.",
        kind: "literature",
        url: "https://www.imarcgroup.com/sodium-alginate-price-trend",
      },
      {
        label:
          "State of the Voluntary Carbon Market 2025 (2024 average ≈ $6.3 tCO₂⁻¹)",
        detail:
          "We use $10 per tonne. Calcite is a durable mineral removal and those trade far higher, over $100 per tonne, so this is a deliberate floor. It makes almost no difference either way: the credit is worth a few dollars a hectare against a cost of over a thousand, so treat the tonnage as the result and not the money.",
        kind: "literature",
        url: "https://carboncredits.com/carbon-prices-today/",
      },
      {
        label: "Conventional baselines, and how soft they are",
        detail:
          "Soilworks does not publish a price for Soiltac and gives its service life as anything from weeks to several years, so the 2800 USD per hectare chemical baseline is an estimate against a moving target. Published costs for dust suppressants run from about 1,200 USD per hectare for a light copolymer blend to over 20,000 for heavier products. 2800 sits near the low end, so the break-even area shown here is more likely too large than too small. The concrete figure is sprayed concrete at 30 USD per m², the bottom of 2025 US contractor prices of 30 to 50 USD per m². It is a permanent surface rather than a treatment, so it sits on the chart for scale.",
        kind: "internal",
        url: "https://www.fs.usda.gov/t-d/pubs/pdf/99771207.pdf",
      },
      {
        label: "The comparison is one treatment against one spray",
        detail:
          "There is no time in this model: no service life, no re-application interval, no discounting. Our own crust is resprayed about every six months and we have no figure for how long the chemical lasts, so the saving shown here is per application and must not be read as a saving per year.",
        kind: "internal",
      },
    ],
  },
  killswitch: {
    intro:
      "A Type II toxin–antitoxin (MazE/MazF) circuit, its aTc-inducible and plasmid-dilution kill modes, the horizontal-gene-transfer containment logic, and the spore-germination caveat, grounded in the team's reframe research (project reframe/*.md) and its primary literature.",
    sources: [
      {
        label:
          'Kamada, Hanaoka & Burley (2003), "Crystal structure of the MazE/MazF complex", Mol. Cell 11:875',
        citation:
          "Kamada, K.; Hanaoka, F.; Burley, S. K. Crystal Structure of the MazE/MazF Complex: Molecular Bases of Antidote–Toxin Recognition. Mol. Cell 2003, 11 (4), 875–884.",
        detail:
          "The E. coli MazE·MazF complex (PDB 1UB4) that grounds the antitoxin-neutralises-toxin mechanism and the 3D viewer.",
        kind: "literature",
        url: "https://doi.org/10.1016/S1097-2765(03)00097-2",
      },
      {
        label:
          "B. subtilis EndoA/MazF structures, PDB 4MDX (MazF·RNA) and 4ME7 (MazF·cognate MazE)",
        detail:
          "The cognate B. subtilis toxin bound to RNA substrate and to its own antitoxin, the structural basis of the 'lock-and-key' species specificity.",
        kind: "literature",
        url: "https://www.rcsb.org/structure/4ME7",
      },
      {
        label:
          "Yamaguchi, Park & Inouye (2011), Toxin–antitoxin systems in bacteria and archaea, Annu. Rev. Genet. 45:61",
        citation:
          "Yamaguchi, Y.; Park, J.-H.; Inouye, M. Toxin–Antitoxin Systems in Bacteria and Archaea. Annu. Rev. Genet. 2011, 45, 61–79.",
        detail:
          "Cognate specificity: an antitoxin does not neutralise a toxin from a different species/family, why E. coli MazF kills a B. subtilis recipient lacking E. coli MazE.",
        kind: "literature",
        url: "https://doi.org/10.1146/annurev-genet-110410-132412",
      },
      {
        label:
          "Ghosh, Korza, Setlow et al. (2012), Levels of germination proteins in dormant and superdormant B. subtilis spores, PMC3347068",
        detail:
          "Superdormancy from very low germinant-receptor levels, the fraction of spores a single germinant cannot wake, which the kill switch (translation-dependent) then cannot reach.",
        kind: "literature",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3347068/",
      },
      {
        label:
          "TA-system population dynamics (Cataudella et al. 2013; standard mass-action toxin–antitoxin ODEs)",
        detail:
          "The dA/dt, dT/dt, dC/dt balances and the toxin-gated net growth rate integrated in killswitch.ts.",
        kind: "model",
      },
      {
        label: "NYUAD iGEM 2026 reframe research, project reframe/*.md",
        detail:
          "The aTc-inducible + plasmid-dilution kill design, the E. coli MazEF HGT-containment split (with mazE splitting / codon optimisation), and the spore germinate-then-kill strategy.",
        kind: "internal",
      },
    ],
  },
  exposure: {
    intro:
      "The chain from a season's wind to the sand landing at one site. Every step is either a published relation or a public dataset. Where there is neither, the page says so rather than filling the gap in.",
    sources: [
      {
        label: "Fryberger (1979), Dune forms and wind regime",
        citation:
          "Fryberger, S. G.; Dean, G. Dune Forms and Wind Regime. In A Study of Global Sand Seas; McKee, E. D., Ed.; USGS Professional Paper 1052; U.S. Government Printing Office: Washington, DC, 1979; pp 137–169.",
        detail:
          "Drift potential, the resultant direction, and the unidirectionality index. Chapter 5 of A Study of Global Sand Seas, USGS Professional Paper 1052.",
        kind: "literature",
      },
      {
        label: "Khalaf & Al-Ajmi (1993), Geomorphology 6, 111-134",
        citation:
          "Khalaf, F. I.; Al-Ajmi, D. Aeolian Processes and Sand Encroachment Problems in Kuwait. Geomorphology 1993, 6 (2), 111–134.",
        detail:
          "Kuwait: saltation begins near 5.4 m/s at 10 m, and about 20 m³ of sand drifts per metre of width per year, mostly May to August, toward the southeast. The two numbers the climatology is validated against.",
        kind: "literature",
        url: "https://doi.org/10.1016/0169-555X(93)90042-Z",
      },
      {
        label: "Marticorena & Bergametti (1995), J. Geophys. Res. 100, 16415",
        citation:
          "Marticorena, B.; Bergametti, G. Modeling the Atmospheric Dust Cycle: 1. Design of a Soil-Derived Dust Emission Scheme. J. Geophys. Res. Atmos. 1995, 100 (D8), 16415–16430.",
        detail:
          "The size bands that separate creep, saltation and suspension, and the 1 m saltation layer height. This is why regional dust and local sand are different problems.",
        kind: "literature",
        url: "https://doi.org/10.1029/95JD00690",
      },
      {
        label: "Ferguson & Church (2004), J. Sediment. Res. 74, 933",
        citation:
          "Ferguson, R. I.; Church, M. A Simple Universal Equation for Grain Settling Velocity. J. Sediment. Res. 2004, 74 (6), 933–937.",
        detail:
          "Settling velocity across the Stokes and turbulent regimes, which sets how far a grain released from the saltation layer travels before it lands.",
        kind: "literature",
        url: "https://doi.org/10.1306/051204740933",
      },
      {
        label: "Benaafi et al. (2016), Arab. J. Geosci. 9, 1970, Table 1",
        citation:
          "Benaafi, M.; Al-Shaibani, A.; Abdullatif, O. Sedimentological and Geochemical Characterisation of the Dune Sands in Saudi Arabia. Arab. J. Geosci. 2016, 9, 1970.",
        detail:
          "Measured grain size for Saudi dune fields, including the Rub' al-Khali, which the paper itself states resembles eastern UAE dune sand. 99.7 percent of that mass is in the saltation band.",
        kind: "literature",
        url: "https://doi.org/10.1007/s12517-015-1970-9",
      },
      {
        label: "Chappell et al. (2024), Geophys. Res. Lett. 51, e2023GL106540, Eq 3",
        citation:
          "Chappell, A.; Webb, N. P.; Hennen, M.; et al. Evaluating Aeolian Dust Emission from a Land Surface Model. Geophys. Res. Lett. 2024, 51, e2023GL106540.",
        detail:
          "Sandblasting efficiency against soil clay content: how much fine dust saltating grains knock loose.",
        kind: "literature",
        url: "https://doi.org/10.1029/2023GL106540",
      },
      {
        label: "Tian et al. (2018), Land Degrad. Dev. 29, 4271",
        citation:
          "Tian, J.; Dong, Z.; Shi, Z.; et al. Aeolian Sand Transport over a Wind-Eroded Surface. Land Degrad. Dev. 2018, 29 (11), 4271–4281.",
        detail:
          "Wind tunnel threshold for untreated aeolian sand, 5.73 m/s at 0.6 m. An independent check on the threshold this model computes from grain size.",
        kind: "literature",
        url: "https://doi.org/10.1002/ldr.3176",
      },
      {
        label: "Ginoux et al. (2012), Rev. Geophys. 50, RG3005",
        citation:
          "Ginoux, P.; Prospero, J. M.; Gill, T. E.; Hsu, N. C.; Zhao, M. Global-Scale Attribution of Anthropogenic and Natural Dust Sources. Rev. Geophys. 2012, 50, RG3005.",
        detail:
          "The mapped dust source areas, by how often dust is seen over them. 0.1 degree grid, March to May only for this region.",
        kind: "literature",
        url: "https://doi.org/10.1029/2012RG000388",
      },
      {
        label: "Hennen (2017), PhD thesis, Middle East dust sources",
        detail:
          "27,000 dust emission events tracked by satellite. Finds the Tigris and Euphrates flood plain dominant and the southern Arabian Peninsula quiet, which agrees with the grain size physics from an independent direction.",
        kind: "literature",
      },
      {
        label: "ERA5 hourly 10 m wind, via the Open-Meteo historical archive",
        detail:
          "The monthly Weibull fit and wind rose, 2022 to 2024 on a 1 degree grid. Built by scripts/fit_era5_weibull.py, which refuses to write a file that fails the Kuwait validation. Copernicus licence, attribution required.",
        kind: "model",
        url: "https://open-meteo.com/en/docs/historical-weather-api",
      },
      {
        label: "Open-Meteo forecast API, current 10 m wind",
        detail:
          "The live view's wind. We ask for one reading per point on a 9 by 10 grid over the Gulf and cache it for an hour, which keeps us inside the free non-commercial allowance however many people visit. CC BY 4.0.",
        kind: "model",
        url: "https://open-meteo.com/en/docs/air-quality-api",
      },
      {
        label: "OpenStreetMap, via Overpass",
        detail:
          "Every target site on the map: solar, industrial, aviation and farmland assets in the UAE. ODbL, which requires attribution and applies share-alike to a derived database.",
        kind: "model",
        url: "https://www.openstreetmap.org/copyright",
      },
      {
        label: "Natural Earth 1:50m Admin 0",
        detail: "The coastline and country outlines. Public domain.",
        kind: "model",
        url: "https://www.naturalearthdata.com/",
      },
      {
        label: "Iowa Environmental Mesonet, ASOS archive",
        detail:
          "Hourly METAR for Abu Dhabi, Dubai and Al Ain international airports, 2022 to 2024, about 75,000 paired hours. Free and needs no key, which is why the wind model could be compared against an instrument at all. This is the only measured record anything on this page has been tested against.",
        kind: "literature",
        url: "https://mesonet.agron.iastate.edu/request/download.phtml",
      },
      {
        label: "Our own tests, scripts/verify_wind_*.py",
        detail:
          "Holding a year back, checking the Weibull assumption, the airport comparison, and which input moves the answer. Each writes its failure criterion before it runs, and two of them exit non-zero because they found something. Their headline figures are collected into public/data/wind_validation.json and read by the section at the end of this page, so a number on screen and a number in a test cannot disagree.",
        kind: "internal",
      },
      {
        label:
          "Abdelfattah (2009), Soil Survey Horizons 50:3, doi:10.2136/sh2009.1.0003",
        detail:
          "Abu Dhabi Emirate dune soils: 70 to 92 percent of sand movement is saltation, 2 to 8 percent is suspension. The near-field case for treating ground rests on this split.",
        kind: "literature",
        url: "https://doi.org/10.2136/sh2009.1.0003",
      },
      {
        label: "Filioglou et al. (2020), Atmos. Chem. Phys. 20, 8909",
        citation:
          "Filioglou, M.; Giannakaki, E.; Backman, J.; et al. Optical and Geometrical Aerosol Particle Properties over the United Arab Emirates. Atmos. Chem. Phys. 2020, 20, 8909–8922.",
        detail:
          "A year of lidar over the UAE. The country is both a source and a receptor of mineral dust, local emission is abundant, and the air also carries dust from Saudi Arabia, Iran and Iraq.",
        kind: "literature",
        url: "https://doi.org/10.5194/acp-20-8909-2020",
      },
      {
        label:
          "Alhebsi, Abuelgasim, Almurshidi, Al Hosani & Ramadan (2025), ISPRS Archives XLVIII-4/W17",
        detail:
          "Twenty Abu Dhabi stations, 2022. PM10 peaks near 218 µg/m³ in summer and the PM2.5/PM10 ratio stays under 0.5, which says the sources are natural. It names the UAE part of the Rub' al Khali as the primary PM10 source inland and west.",
        kind: "literature",
        url: "https://doi.org/10.5194/isprs-archives-XLVIII-4-W17-2025-13-2026",
      },
      {
        label: "Most of the dust in the air over the UAE is not ours to treat",
        detail:
          "Published work traces roughly 60 percent of it back to Iraq, 25 percent to the Afghanistan, Pakistan and Iran border region, and 15 percent to the Empty Quarter. Treating a dune patch does nothing to that fraction. What it acts on is the sand that hops nearby and the dust knocked loose close to the treated ground, which is a smaller and more local claim than the numbers on this page might suggest.",
        kind: "literature",
      },
      {
        label: "The four numbers nobody has measured for us",
        detail:
          "How much of a hotspot is loose enough to blow away, how much ground a site counts as its own, how much hotspot ground we treat, and how much strength the crust adds. The first three are choices we made and can defend. The fourth is a lab result we are waiting on. All four are dials on the page rather than constants in the code, so you can see what each one does to the answer.",
        kind: "internal",
      },
    ],
  },
};
