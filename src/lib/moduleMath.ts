/**
 * Module math registry
 * ====================
 * The governing equations behind every simulation module, in LaTeX, keyed by ModuleId.
 * Rendered by the "Show the Math" window (KaTeX). Sourced directly from src/lib/physics/*
 * and constants.ts so the on-screen math cannot drift from the code that runs.
 */

import type { ModuleId } from "./prongs";

export interface MathBlock {
  /** A LaTeX expression (no surrounding $). */
  tex: string;
  /** One-line plain-language caption under the equation. */
  caption: string;
}

export interface ModuleMath {
  title: string;
  /** Short framing sentence shown at the top of the window. */
  intro: string;
  blocks: MathBlock[];
}

export const MODULE_MATH: Record<ModuleId, ModuleMath> = {
  fba: {
    title: "Flux Balance Analysis",
    intro:
      "A linear program over the stoichiometric matrix S: at metabolic steady state every internal metabolite is balanced, and we pick the flux vector v that maximises an objective (growth, or product export).",
    blocks: [
      {
        tex: "\\max_{v}\\; c^{\\top} v \\quad \\text{s.t.}\\quad S\\,v = 0,\\; v_{lb} \\le v \\le v_{ub}",
        caption:
          "Maximise the objective flux subject to mass balance (S·v = 0) and reaction bounds.",
      },
      {
        tex: "\\min \\sum_i |v_i| \\quad \\text{s.t.}\\quad c^{\\top} v = Z^{*}",
        caption:
          "Parsimonious FBA: among all optima, choose the one using the least total flux (enzyme cost).",
      },
      {
        tex: "[S] = \\kappa \\cdot v_{\\text{glu}}",
        caption:
          "The precursor export flux is converted to an intracellular concentration that feeds the kinetics model.",
      },
    ],
  },
  metabolic: {
    title: "Intracellular γ-PGA Kinetics",
    intro:
      "A three-stage gene-expression cascade (transcription → translation → catalysis) integrated with 4th-order Runge–Kutta. Degradation knockouts (Δggt, ΔpgcA) drive the loss term toward zero.",
    blocks: [
      {
        tex: "\\frac{d[M]}{dt} = \\alpha_m - \\beta_m [M]",
        caption:
          "mRNA balance: constitutive transcription minus first-order decay.",
      },
      {
        tex: "\\frac{d[E]}{dt} = \\alpha_e [M] - \\beta_e [E]",
        caption: "Enzyme balance: translation from mRNA minus enzyme turnover.",
      },
      {
        tex: "\\frac{d[P]}{dt} = k_{cat}[E]\\,\\frac{[S]}{K_m + [S]} - k_{deg}[P]",
        caption:
          "γ-PGA accumulation: Michaelis–Menten synthesis minus degradation (k_deg → 0 under both knockouts).",
      },
    ],
  },
  crosslink: {
    title: "γ-PGA Ca²⁺ Cross-Linking",
    intro:
      "Divalent Ca²⁺ bridges carboxylate groups into a load-bearing network. A Langmuir isotherm sets how many sites are occupied; affine rubber-elasticity theory turns that into a shear modulus.",
    blocks: [
      {
        tex: "\\theta = \\frac{[\\mathrm{Ca}^{2+}]}{K_d + [\\mathrm{Ca}^{2+}]}",
        caption: "Fractional saturation of binding sites (Langmuir).",
      },
      {
        tex: "\\nu = \\rho_{\\text{polymer}}\\,\\theta\\left(1 - \\frac{2 M_x}{M_n}\\right)",
        caption:
          "Effective cross-link density, with the finite-chain end correction.",
      },
      {
        tex: "G = \\nu R T",
        caption: "Rubber-elasticity shear modulus of the gel [Pa].",
      },
    ],
  },
  "ca-anchoring": {
    title: "Carbonic Anhydrase Surface Display",
    intro:
      "The fraction of catalytically-active enzyme displayed on the cell wall is the product of independent efficiencies along the secretion-and-anchoring route (Sortase-mediated vs binding-motif).",
    blocks: [
      {
        tex: "\\eta_{\\text{display}} = \\eta_{\\text{export}} \\times \\eta_{\\text{dimer}} \\times \\eta_{\\text{anchor}}",
        caption:
          "Overall display efficiency multiplies export, dimerisation and anchoring efficiencies.",
      },
      {
        tex: "a_{\\mathrm{CA}} = \\frac{\\log_{10}(1 + f\\,E)}{\\log_{10}(1 + E)}",
        caption:
          "Normalised CA activity (log-scaled, since enhancement E spans orders of magnitude).",
      },
    ],
  },
  caco3: {
    title: "CaCO₃ Precipitation → UCS",
    intro:
      "Carbonic anhydrase raises dissolved inorganic carbon, pushing the solution supersaturated so calcium carbonate precipitates and cements the grains. Calcite content maps to compressive strength.",
    blocks: [
      {
        tex: "\\alpha_2 = \\frac{K_{a1}K_{a2}}{[\\mathrm{H}^+]^2 + K_{a1}[\\mathrm{H}^+] + K_{a1}K_{a2}}",
        caption:
          "Carbonate fraction of dissolved inorganic carbon at a given pH (Bjerrum).",
      },
      {
        tex: "\\Omega = \\frac{[\\mathrm{Ca}^{2+}][\\mathrm{CO_3^{2-}}]}{K_{sp}},\\qquad SI = \\log_{10}\\Omega",
        caption:
          "Saturation ratio and index; SI > 0 means precipitation is favourable.",
      },
      {
        tex: "\\mathrm{ACC} \\xrightarrow{k_r} f_v\\,\\text{vaterite} + (1-f_v)\\,\\text{calcite},\\qquad \\text{vaterite} \\xrightarrow{k_{vc}} \\text{calcite}",
        caption:
          "Non-ureolytic CA-MICP crystallises mostly metastable vaterite (fraction f_v), which slowly recrystallises to calcite (Ostwald ripening).",
      },
      {
        tex: "w_{\\text{eff}} = w_{\\text{cal}} + s_v\\,w_{\\text{vat}},\\qquad \\mathrm{UCS} = k_{\\mathrm{UCS}}\\,w_{\\text{eff}}^{\\,n_{\\mathrm{UCS}}}",
        caption:
          "Load-bearing carbonate wt%: vaterite counts at a reduced strength factor s_v until it converts; UCS is a power law of it [kPa].",
      },
      {
        tex: "m_{\\mathrm{CO_2}} = n_{\\mathrm{CaCO_3}} \\cdot M_{\\mathrm{CO_2}}",
        caption:
          "Each mole of carbonate (any polymorph) sequesters one mole of CO₂ (climate co-benefit).",
      },
    ],
  },
  alginate: {
    title: "Alginate Egg-Box Gel",
    intro:
      'Sodium alginate gels when Ca²⁺ bridges guluronate (G) blocks of neighbouring chains into "egg-box" junctions. Only G-blocks bear load, so junction density scales with the guluronate fraction F_G.',
    blocks: [
      {
        tex: "\\nu = \\rho_{\\text{polymer}}\\,\\theta\\,F_G\\left(1 - \\frac{2 M_x}{M_n}\\right),\\qquad G = \\nu R T",
        caption:
          "Egg-box junction density (guluronate-weighted) and the resulting gel modulus.",
      },
      {
        tex: "R(n) = (1 - k)^{\\,n}",
        caption:
          "Residual alginate after n rain/wet cycles, its honest solubility limitation.",
      },
    ],
  },
  thermal: {
    title: "Protein Thermal Stability",
    intro:
      "A two-state folding equilibrium sets what fraction of the enzyme/scaffold is folded and active at a given temperature, the viability multiplier that gates every downstream rate.",
    blocks: [
      {
        tex: "\\Delta G(T) = \\Delta H - T\\,\\Delta S",
        caption: "Gibbs free energy of unfolding at temperature T.",
      },
      {
        tex: "f_{\\text{folded}} = \\frac{1}{1 + e^{-\\Delta G / RT}}",
        caption:
          "Folded fraction (Boltzmann two-state); the melting point is where f = ½.",
      },
    ],
  },
  "protein-3d": {
    title: "3D Protein Explorer",
    intro:
      "A structural view of the key enzymes, PgsBCA (γ-PGA synthase, Prong 1) or carbonic anhydrase (Prong 2). The backbone is drawn from residue coordinates; no free parameters.",
    blocks: [
      {
        tex: "\\mathbf{r}_i = (x_i, y_i, z_i)",
        caption:
          "Each residue is placed by its Cα coordinate; the ribbon interpolates the backbone.",
      },
    ],
  },
  ecological: {
    title: "Ecological Spread & Kill Switch",
    intro:
      "Colony expansion is a reaction–diffusion / probabilistic-growth process on a resource grid. The engineered kill switch caps viability when the environmental trigger (e.g. moisture) crosses a threshold.",
    blocks: [
      {
        tex: "\\frac{\\partial B}{\\partial t} = D\\,\\nabla^2 B + r\\,B\\!\\left(1 - \\frac{B}{K}\\right) - \\delta_{\\text{kill}}\\,B",
        caption:
          "Diffusion + logistic growth minus the containment (kill-switch) loss term.",
      },
      {
        tex: "P_{\\text{spread}} = p_0\\,\\frac{R}{R + K_R}",
        caption:
          "Per-step colonisation probability, limited by local resource availability.",
      },
    ],
  },
  aeolian: {
    title: "Aeolian Wind Tunnel",
    intro:
      "Bagnold sand-transport physics. Wind must exceed a threshold friction velocity to move grains; the engineered cohesion γ raises that threshold, and any excess wind drives a cubic saltation flux.",
    blocks: [
      {
        tex: "u_{*t0} = A\\sqrt{\\frac{\\rho_s - \\rho_a}{\\rho_a}\\,g\\,d}",
        caption: "Threshold friction velocity for untreated dry sand (Eq. 7).",
      },
      {
        tex: "u_{*t} = A\\sqrt{\\frac{\\rho_s - \\rho_a}{\\rho_a}\\,g\\,d + \\frac{\\gamma}{\\rho_a d}}",
        caption:
          "Cohesion-enhanced threshold, the crust adds an adhesive term γ/(ρₐd) (Eq. 8).",
      },
      {
        tex: "q = C\\,\\frac{\\rho_a}{g}\\,u_*^{3}\\left(1 - \\frac{u_{*t}^{2}}{u_*^{2}}\\right),\\quad u_* > u_{*t}",
        caption: "Bagnold saltation mass flux above threshold (Eq. 9).",
      },
    ],
  },
  wetlab: {
    title: "Wet-Lab Sandbox",
    intro:
      "Real lab inputs (OD₆₀₀, glutamate, salinity) are mapped into the same erosion physics as the wind tunnel, so a bench measurement can be pushed straight into a 2D dune-erosion assay.",
    blocks: [
      {
        tex: "u_{*t} = A\\sqrt{\\frac{\\rho_s - \\rho_a}{\\rho_a}\\,g\\,d + \\frac{\\gamma(\\text{OD}_{600},\\,[\\text{Glu}])}{\\rho_a d}}",
        caption:
          "Lab-derived cohesion feeds the same threshold equation as the aeolian module.",
      },
    ],
  },
  grainsize: {
    title: "Grain-Size Coverage",
    intro:
      "Sand is a distribution of grain sizes, and no single binder works at every size: MICP (CaCO₃) cements a mid-fine sweet spot, while γ-PGA and alginate close the coarse and fine gaps. Coverage is integrated over the deployment site's log-normal grain-size distribution.",
    blocks: [
      {
        tex: "e_{\\mathrm{MICP}}(d) = \\exp\\!\\left[-\\tfrac12\\left(\\tfrac{\\ln(d/d_{\\text{pk}})}{\\sigma}\\right)^2\\right]\\cdot \\operatorname{logistic}\\!\\big(k\\,\\ln(d/d_{\\text{pen}})\\big)",
        caption:
          "CaCO₃ cementation vs grain diameter: a log-Gaussian sweet spot × a fine-side permeability (bacterial-penetration) roll-off.",
      },
      {
        tex: "C(d) = 1 - \\prod_{p}\\big(1 - e_p(d)\\big)",
        caption:
          "A grain of size d is held if AT LEAST ONE active binder covers it (probabilistic union of per-prong effectiveness eₚ).",
      },
      {
        tex: "f_{\\text{bound}} = \\int C(d)\\,\\phi(\\ln d)\\,\\mathrm{d}\\ln d,\\qquad \\phi \\sim \\mathrm{LogNormal}(D_{50},\\sigma_g)",
        caption:
          "Effective bound mass fraction: coverage weighted by the site grain-size distribution (UAE dune sand, D₅₀ ≈ 200 µm).",
      },
    ],
  },
  composite: {
    title: "Composite Strength Synthesis",
    intro:
      "When two or more prongs act together, their cohesions combine (rule of mixtures plus a labelled synergy term), and the design survives a failure scenario if at least one mechanism survives it.",
    blocks: [
      {
        tex: "S_{\\mathrm{Ca}} = c_f + \\sum_p B_p\\,\\frac{c_f}{K_{d,p}+c_f},\\qquad \\phi_{\\mathrm{Ca},p} = \\frac{c_f/(K_{d,p}+c_f)}{c_f^{\\,\\text{alone}}/(K_{d,p}+c_f^{\\,\\text{alone}})}",
        caption:
          "Competitive Langmuir Ca²⁺ partition: free calcium c_f solves the shared mass balance; each prong keeps φ_Ca of its standalone binding (the high-affinity calcite sink wins). Plus co-expression burden β for γ-PGA & CA.",
      },
      {
        tex: "\\tilde\\gamma_i = \\gamma_i\\,\\phi_{\\mathrm{Ca}}\\,\\phi_{\\text{burden},i}",
        caption:
          "Each prong’s cohesion is knocked down by the interactions it takes part in, before combining.",
      },
      {
        tex: "\\gamma_{\\text{total}} = \\sum_i \\tilde\\gamma_i + \\sum_{i<j} \\eta_{ij}\\sqrt{\\tilde\\gamma_i \\tilde\\gamma_j}",
        caption:
          "Composite cohesion: adjusted load-sharing plus the constructive physicochemical synergy η.",
      },
      {
        tex: "r_{\\text{combined}} = 1 - \\prod_i (1 - r_i)",
        caption:
          "Redundancy: the combination fails a scenario only if every prong fails it.",
      },
    ],
  },
  curing: {
    title: "Curing & Deployment Timeline",
    intro:
      "The crust is neither instant nor permanent. It cures over the 0/8/16/24/32 h spray protocol (Study 5) and then weathers over months until it must be re-applied. Each binder matures on its own time constant and weathers on its own half-life, so a fast-setting polymer buys early strength while the durable calcite floor extends the re-application interval.",
    blocks: [
      {
        tex: "\\gamma_p(t) = \\gamma_p^{\\text{mature}}\\left(1 - e^{-t/\\tau_p}\\right)",
        caption:
          "Maturation: each prong approaches its mature cohesion on a per-binder time constant τ_p (alginate fast, MICP slow).",
      },
      {
        tex: "\\gamma_p(m) = \\gamma_p^{\\text{mature}}\\,2^{-m/H_p}",
        caption:
          "Field weathering: cohesion decays with a per-binder half-life H_p (calcite most durable, alginate shortest).",
      },
      {
        tex: "\\gamma_{\\text{survive}} = \\rho_a d\\left[\\left(\\tfrac{u_{*}(U_{\\text{design}})}{A}\\right)^2 - \\tfrac{\\rho_s-\\rho_a}{\\rho_a}g d\\right],\\quad m^{*}: \\textstyle\\sum_p \\gamma_p(m^{*}) = \\gamma_{\\text{survive}}",
        caption:
          "Re-application is due at m*, when the total surviving cohesion drops below the floor needed to withstand the design wind (inverse aeolian threshold).",
      },
    ],
  },
  economic: {
    title: "Economic Scalability",
    intro:
      "Cost is built bottom-up per prong (fermentation for γ-PGA, feedstock + enzyme for CaCO₃, commodity purchase for alginate) then summed for the chosen combination and compared against conventional stabilisers.",
    blocks: [
      {
        tex: "C_{\\text{combo}} = \\sum_{p \\in \\text{prongs}} C_p^{\\text{capex}} + A \\sum_{p} C_p^{\\text{opex/ha}}",
        caption:
          "Total cost of a combination: per-prong capital plus per-hectare operating cost over area A.",
      },
      {
        tex: "A_{\\text{break-even}} = \\frac{C^{\\text{capex}}}{C_{\\text{conv}}^{\\text{/ha}} - C^{\\text{opex/ha}}}",
        caption:
          "Area at which the biological treatment undercuts the conventional chemical/concrete baseline.",
      },
    ],
  },
  killswitch: {
    title: "Biocontainment Kill Switch (MazE/MazF)",
    intro:
      "A Type II toxin–antitoxin circuit as mass-action ODEs: the labile antitoxin A (MazE) sequesters the stable toxin T (MazF) into an inert complex C. Free toxin gates a net growth rate that flips from growth to death, so the viable population is an RK4-integrated log balance.",
    blocks: [
      {
        tex: "\\frac{dA}{dt} = \\sigma_A(p) - \\delta_A A - k_{on} A T + k_{off} C",
        caption:
          "Antitoxin: production (constitutive + plasmid-borne σ_A·p) minus fast degradation and toxin binding.",
      },
      {
        tex: "\\frac{dT}{dt} = \\sigma_T(\\text{aTc}) - \\delta_T T - k_{on} A T + k_{off} C + \\delta_A C",
        caption:
          "Toxin: production (constitutive + aTc-induced) minus slow degradation; the labile antitoxin in the complex decays, releasing stable toxin.",
      },
      {
        tex: "\\sigma_T(\\text{aTc}) = \\sigma_T^{0} + \\sigma_T^{\\max}\\left[\\ell + (1-\\ell)\\frac{\\text{aTc}^h}{K_d^h + \\text{aTc}^h}\\right]",
        caption:
          "The Tet promoter's aTc dose–response (leak ℓ) sets the inducible mazF copy's output.",
      },
      {
        tex: "p(t) = (1 - \\phi)^{\\,t/\\tau_g}, \\qquad \\mu(T) = \\mu_{\\max}(1-\\theta) - d_{\\max}\\,\\theta,\\;\\; \\theta = \\frac{T^n}{K_T^n + T^n}",
        caption:
          "Plasmid copy dilutes by loss-per-generation φ; free toxin θ switches the specific rate from growth to death.",
      },
      {
        tex: "\\frac{d}{dt}\\log_{10} N = \\frac{\\mu(T)}{\\ln 10}",
        caption:
          "Viable-cell log balance; the time to an X-log kill is when log₁₀(N/N₀) ≤ −X.",
      },
      {
        tex: "P_{\\text{contain}} = e_{\\text{expr}}\\left(1 - \\big[f_{cog} + (1-f_{cog})\\,f_{frag}^{\\,s}\\,\\varepsilon_{codon}\\big]\\right)",
        caption:
          "HGT containment: a recipient that expresses the linked toxin self-eliminates unless it is a cognate carrier or acquires (both halves of, if split) a translatable E. coli mazE.",
      },
      {
        tex: "V_R = f_{\\min} + \\sum_{r=1}^{R}\\big[\\text{dormant}_r - g\\,(\\text{dormant}_r - f_{\\min})\\big], \\quad g = 1-(1-g_1)^{n_{\\text{germ}}}",
        caption:
          "Spore clearance: each germinate-then-kill round wakes fraction g (raised by gerB* and multiple germinants); a superdormant floor f_min never wakes.",
      },
    ],
  },
};
