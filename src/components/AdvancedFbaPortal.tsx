import React, { useState, useMemo } from 'react';
import { 
  Play, 
  Settings, 
  RotateCcw, 
  Cpu, 
  Gauge, 
  Layers, 
  TrendingUp, 
  Database, 
  Activity, 
  HelpCircle, 
  Dna, 
  Zap, 
  Sparkles, 
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  XCircle,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import GlossaryTerm from './GlossaryTerm';

// -------------------------------------------------------------
// METABOLIC MODEL DEFINITION FOR BACILLUS SUBTILIS CENTRAL METABOLISM
// -------------------------------------------------------------

interface Reaction {
  id: string;
  name: string;
  gene: string;
  formula: string;
  reversible: boolean;
  defaultLb: number;
  defaultUb: number;
  subsystem: 'glycolysis' | 'ppp' | 'tca' | 'overflow' | 'biomass' | 'pga_synthesis' | 'respiration' | 'exchanges';
  description: string;
  leftToRightMap: { [metabolite: string]: number };
}

interface Metabolite {
  id: string;
  name: string;
  compartment: 'cytosol' | 'extracellular';
}

const METABOLITES: Metabolite[] = [
  { id: 'glc_ext', name: 'Glucose (Ext)', compartment: 'extracellular' },
  { id: 'glc', name: 'Glucose (Cyt)', compartment: 'cytosol' },
  { id: 'g6p', name: 'Glucose-6-Phosphate', compartment: 'cytosol' },
  { id: 'f6p', name: 'Fructose-6-Phosphate', compartment: 'cytosol' },
  { id: 'fbp', name: 'Fructose-1,6-Bisphosphate', compartment: 'cytosol' },
  { id: 'gap', name: 'Glyceraldehyde-3-Phosphate', compartment: 'cytosol' },
  { id: 'dhap', name: 'Dihydroxyacetone Phosphate', compartment: 'cytosol' },
  { id: 'pep', name: 'Phosphoenolpyruvate', compartment: 'cytosol' },
  { id: 'pyr', name: 'Pyruvate', compartment: 'cytosol' },
  { id: 'accoa', name: 'Acetyl-CoA', compartment: 'cytosol' },
  { id: 'cit', name: 'Citrate', compartment: 'cytosol' },
  { id: 'icit', name: 'Isocitrate', compartment: 'cytosol' },
  { id: 'akg', name: 'Alpha-Ketoglutarate', compartment: 'cytosol' },
  { id: 'succoa', name: 'Succinyl-CoA', compartment: 'cytosol' },
  { id: 'succ', name: 'Succinate', compartment: 'cytosol' },
  { id: 'fum', name: 'Fumarate', compartment: 'cytosol' },
  { id: 'mal', name: 'Malate', compartment: 'cytosol' },
  { id: 'oaa', name: 'Oxaloacetate', compartment: 'cytosol' },
  { id: '6pgc', name: '6-Phosphogluconate', compartment: 'cytosol' },
  { id: 'ru5p', name: 'Ribulose-5-Phosphate', compartment: 'cytosol' },
  { id: 'actp', name: 'Acetyl-Phosphate', compartment: 'cytosol' },
  { id: 'ac_ext', name: 'Acetate (Ext)', compartment: 'extracellular' },
  { id: 'lac_ext', name: 'Lactate (Ext)', compartment: 'extracellular' },
  { id: 'l_glu', name: 'L-Glutamate', compartment: 'cytosol' },
  { id: 'pga_ext', name: 'PGA Biopolymer(Ext)', compartment: 'extracellular' },
  { id: 'nh3', name: 'Ammonia', compartment: 'cytosol' },
  { id: 'o2', name: 'Oxygen', compartment: 'cytosol' },
  { id: 'co2', name: 'Carbon Dioxide', compartment: 'cytosol' },
  { id: 'atp', name: 'ATP', compartment: 'cytosol' },
  { id: 'nadh', name: 'NADH', compartment: 'cytosol' },
  { id: 'nadph', name: 'NADPH', compartment: 'cytosol' },
  { id: 'biomass', name: 'Biomass Portfolio', compartment: 'cytosol' },
];

const REACTIONS: Reaction[] = [
  // GLYCOLYSIS
  {
    id: 'R_GLCpts',
    name: 'Glucose Transport (PTS)',
    gene: 'ptsG',
    formula: 'glc_ext + pep -> g6p + pyr',
    reversible: false,
    defaultLb: 0,
    defaultUb: 15,
    subsystem: 'glycolysis',
    description: 'B. subtilis phosphotransferase system consuming PEP to phosphorylate import glucose.',
    leftToRightMap: { glc_ext: -1, pep: -1, g6p: 1, pyr: 1 }
  },
  {
    id: 'R_PGI',
    name: 'Phosphoglucose Isomerase',
    gene: 'pgi',
    formula: 'g6p <=> f6p',
    reversible: true,
    defaultLb: -100,
    defaultUb: 100,
    subsystem: 'glycolysis',
    description: 'Interconverts G6P to F6P. Major glycolysis-PPP bifurcation checkpoint.',
    leftToRightMap: { g6p: -1, f6p: 1 }
  },
  {
    id: 'R_PFK',
    name: 'Phosphofructokinase',
    gene: 'pfkA',
    formula: 'f6p + atp -> fbp',
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: 'glycolysis',
    description: 'Irreversible gateway step committing carbon to lower glycolysis via ATP phosphorylation.',
    leftToRightMap: { f6p: -1, atp: -1, fbp: 1 }
  },
  {
    id: 'R_FBA',
    name: 'Fructose-Bisphosphate Aldolase',
    gene: 'fbaA',
    formula: 'fbp <=> gap + dhap',
    reversible: true,
    defaultLb: -100,
    defaultUb: 100,
    subsystem: 'glycolysis',
    description: 'Splits 6C fructose to 3C glyceraldehyde & dihydroxyacetone.',
    leftToRightMap: { fbp: -1, gap: 1, dhap: 1 }
  },
  {
    id: 'R_TPI',
    name: 'Triosephosphate Isomerase',
    gene: 'tpiA',
    formula: 'dhap <=> gap',
    reversible: true,
    defaultLb: -100,
    defaultUb: 100,
    subsystem: 'glycolysis',
    description: 'Equilibrates the split triose pools for downstream phosphorylation.',
    leftToRightMap: { dhap: -1, gap: 1 }
  },
  {
    id: 'R_GAPDH_PGK',
    name: 'Lower Glycolysis Oxidation Cascade',
    gene: 'gapA',
    formula: 'gap + atp -> pep + nadh + atp', // Simplified step: overall GAP -> PEP creates 1 NADH and yields ATP
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: 'glycolysis',
    description: 'Oxidizes GAP to PEP, capturing reducing power as NADH and generating redundant ATP.',
    leftToRightMap: { gap: -1, pep: 1, nadh: 1, atp: 1 }
  },
  {
    id: 'R_PYK',
    name: 'Pyruvate Kinase',
    gene: 'pyk',
    formula: 'pep -> pyr + atp',
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: 'glycolysis',
    description: 'Final glycolysis step generating pyruvate and ATP via substrate-level phosphorylation.',
    leftToRightMap: { pep: -1, pyr: 1, atp: 1 }
  },

  // PENTOSE PHOSPHATE PATHWAY (PPP)
  {
    id: 'R_G6PDH',
    name: 'G6P Dehydrogenase',
    gene: 'zwf',
    formula: 'g6p -> 6pgc + nadph',
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: 'ppp',
    description: 'Primary pathway diversion producing initial NADPH required for biopolymer synthesis.',
    leftToRightMap: { g6p: -1, '6pgc': 1, nadph: 1 }
  },
  {
    id: 'R_GND',
    name: '6PG Dehydrogenase',
    gene: 'gnd',
    formula: '6pgc -> ru5p + nadph + co2',
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: 'ppp',
    description: 'Oxidatively decarboxylates 6-phosphogluconate, yielding crucial second NADPH and pentose sugars.',
    leftToRightMap: { '6pgc': -1, ru5p: 1, nadph: 1, co2: 1 }
  },
  {
    id: 'R_PPP_to_Glyc',
    name: 'Pentose Recycle Cascade',
    gene: 'tkt',
    formula: 'ru5p -> gap + f6p', // Simplified Pentose recycling: 3 Ru5P <=> 2 F6P + GAP
    reversible: true,
    defaultLb: -100,
    defaultUb: 100,
    subsystem: 'ppp',
    description: 'Transketolase and transaldolase cascade routing intermediate pentoses back into glycolysis pools.',
    leftToRightMap: { ru5p: -3, gap: 1, f6p: 2 }
  },

  // TCA / PYRUVATE DEHYDROGENASE
  {
    id: 'R_PDH',
    name: 'Pyruvate Dehydrogenase',
    gene: 'pdhA',
    formula: 'pyr -> accoa + nadh + co2',
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: 'tca',
    description: 'Decarboxylates pyruvate, committing cellular carbon into Acetyl-CoA and synthesizing 1 NADH.',
    leftToRightMap: { pyr: -1, accoa: 1, nadh: 1, co2: 1 }
  },
  {
    id: 'R_CS',
    name: 'Citrate Synthase',
    gene: 'gltA',
    formula: 'accoa + oaa -> cit',
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: 'tca',
    description: 'Condenses Acetyl-CoA with Oxaloacetate to initiate the TCA cycle spiral.',
    leftToRightMap: { accoa: -1, oaa: -1, cit: 1 }
  },
  {
    id: 'R_ACONT',
    name: 'Aconitase',
    gene: 'citB',
    formula: 'cit <=> icit',
    reversible: true,
    defaultLb: -100,
    defaultUb: 100,
    subsystem: 'tca',
    description: 'Isomerizes citrate to isocitrate to set up oxidative decarboxylations.',
    leftToRightMap: { cit: -1, icit: 1 }
  },
  {
    id: 'R_ICDH',
    name: 'Isocitrate Dehydrogenase',
    gene: 'citC',
    formula: 'icit -> akg + nadph + co2',
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: 'tca',
    description: 'Major metabolic fork. Generates NADPH and alpha-ketoglutarate, the absolute precursor for PGA polymer.',
    leftToRightMap: { icit: -1, akg: 1, nadph: 1, co2: 1 }
  },
  {
    id: 'R_AKGDH',
    name: 'Alpha-Ketoglutarate Dehydrogenase',
    gene: 'odhA',
    formula: 'akg -> succoa + nadh + co2',
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: 'tca',
    description: 'Competes directly with PGA synthesis channels by draining AKG to Succinyl-CoA.',
    leftToRightMap: { akg: -1, succoa: 1, nadh: 1, co2: 1 }
  },
  {
    id: 'R_SUCOAS',
    name: 'Succinyl-CoA Synthetase',
    gene: 'sucC',
    formula: 'succoa -> succ + atp',
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: 'tca',
    description: 'Substrate level phosphorylation in TCA cycle yielding Succinate and ATP.',
    leftToRightMap: { succoa: -1, succ: 1, atp: 1 }
  },
  {
    id: 'R_SDH_FUM_MDH',
    name: 'Malate & Oxaloacetate Regeneration',
    gene: 'sdhA',
    formula: 'succ -> oaa + 2 nadh', // Combine SDH + fumarase + MDH for simpler model topology
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: 'tca',
    description: 'Converts succinate back to oxaloacetate to balance the cycle, synthesizing 2 reducing NADH.',
    leftToRightMap: { succ: -1, oaa: 1, nadh: 2 }
  },

  // OVERFLOW METABOLISM
  {
    id: 'R_PTA_ACK',
    name: 'Acetate Overflow (PTA-ACK)',
    gene: 'pta',
    formula: 'accoa -> actp -> ac_ext + atp', // Combined Acetate synthesis
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: 'overflow',
    description: 'Overflow shunt used when carbon load exceeds respiratory capacity. Generates fast ATP but wastes acetate.',
    leftToRightMap: { accoa: -1, ac_ext: 1, atp: 1 }
  },
  {
    id: 'R_LDH',
    name: 'Lactate Dehydrogenase',
    gene: 'ldh',
    formula: 'pyr + nadh <=> lac_ext',
    reversible: true,
    defaultLb: -100,
    defaultUb: 100,
    subsystem: 'overflow',
    description: 'Acidic overflow during hypoxia, reoxidizing NADH pools rapidly.',
    leftToRightMap: { pyr: -1, nadh: -1, lac_ext: 1 }
  },

  // SPECIFIC iGEM POLY-γ-GLUTAMATE (PGA) SYNTHESIS
  {
    id: 'R_GLUsyn',
    name: 'Glutamate Synthase (Glt), transaminase',
    gene: 'gltD',
    formula: 'akg + nadph + nh3 -> l_glu',
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: 'pga_synthesis',
    description: 'Synthesizes L-glutamate precursor by trapping ammonia. Crucial consumer of TCA alpha-ketoglutarate.',
    leftToRightMap: { akg: -1, nadph: -1, nh3: -1, l_glu: 1 }
  },
  {
    id: 'R_PGAsyn',
    name: 'PGA Synthase (Polymerizer)',
    gene: 'pgas',
    formula: 'l_glu + atp -> pga_ext',
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: 'pga_synthesis',
    description: 'Active iGEM custom operon. Polymerizes glutamate into extracellular Poly-γ-glutamate biopolymer, utilizing ATP energy.',
    leftToRightMap: { l_glu: -1, atp: -1, pga_ext: 1 }
  },

  // RESPIRATION & MAINTENANCE
  {
    id: 'R_RESP',
    name: 'Respiratory Phosphorylation (ETC)',
    gene: 'ctaA',
    formula: 'nadh + 0.5 o2 -> 2.5 atp',
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: 'respiration',
    description: 'Consumes oxygen to oxidize NADH. Generates 2.5 equivalent ATP molecules per NADH oxidized.',
    leftToRightMap: { nadh: -1, o2: -0.5, atp: 2.5 }
  },
  {
    id: 'R_ATPM',
    name: 'ATP Maintenance Requirement',
    gene: 'maint',
    formula: 'atp -> ',
    reversible: false,
    defaultLb: 1.0, // Forced maintenance load
    defaultUb: 100,
    subsystem: 'respiration',
    description: 'Forced base cellular energy demand to maintain cell viability and osmotic pressure.',
    leftToRightMap: { atp: -1 }
  },

  // BIOMASS SYNTHESIS
  {
    id: 'R_Biomass',
    name: 'Biomass Portfolio Synthesis',
    gene: 'growth',
    formula: '0.1 g6p + 0.1 pep + 0.1 pyr + 0.1 accoa + 0.1 akg + 0.1 oaa + 2 atp + 1 nadph -> biomass',
    reversible: false,
    defaultLb: 0,
    defaultUb: 10,
    subsystem: 'biomass',
    description: 'Standard model for cell growth draining key metabolic precursors, energy, and reducing power.',
    leftToRightMap: { g6p: -0.1, pep: -0.1, pyr: -0.1, accoa: -0.1, akg: -0.1, oaa: -0.1, atp: -2.0, nadph: -1.0, biomass: 1 }
  },

  // EXCHANGES
  {
    id: 'EX_glc',
    name: 'Glucose Uptake Exchange',
    gene: 'exchange',
    formula: '-> glc_ext',
    reversible: true,
    defaultLb: -10, // Max 10 mmol/gDCW/hr uptake
    defaultUb: 0,
    subsystem: 'exchanges',
    description: 'Matches the surrounding bio-mineralizing soil glucose concentration bounds.',
    leftToRightMap: { glc_ext: 1 }
  },
  {
    id: 'EX_o2',
    name: 'Oxygen Intake Exchange',
    gene: 'exchange',
    formula: '-> o2',
    reversible: true,
    defaultLb: -15, // Oxygen limit
    defaultUb: 0,
    subsystem: 'exchanges',
    description: 'Regulates aerobic vs anaerobic soil interface conditions.',
    leftToRightMap: { o2: 1 }
  },
  {
    id: 'EX_nh3',
    name: 'Ammonia Intake Exchange',
    gene: 'exchange',
    formula: '-> nh3',
    reversible: true,
    defaultLb: -100,
    defaultUb: 100,
    subsystem: 'exchanges',
    description: 'Source nitrogen for L-glutamate biosynthesis pathways.',
    leftToRightMap: { nh3: 1 }
  },
  {
    id: 'EX_ac',
    name: 'Acetate Output Exchange',
    gene: 'exchange',
    formula: 'ac_ext ->',
    reversible: false,
    defaultLb: 0,
    defaultUb: 100,
    subsystem: 'exchanges',
    description: 'Allows acetate overflow excretion out of target cells.',
    leftToRightMap: { ac_ext: -1 }
  },
  {
    id: 'EX_pga',
    name: 'PGA Export Exchange',
    gene: 'exchange',
    formula: 'pga_ext ->',
    reversible: false,
    defaultLb: 0,
    defaultUb: 1000,
    subsystem: 'exchanges',
    description: 'Precipitation/deposition of protective structural polymer on surrounding sand coordinates.',
    leftToRightMap: { pga_ext: -1 }
  },
  {
    id: 'EX_biomass',
    name: 'Biomass Dilution Exchange',
    gene: 'exchange',
    formula: 'biomass ->',
    reversible: false,
    defaultLb: 0,
    defaultUb: 1000,
    subsystem: 'exchanges',
    description: 'Growth dilution/loss rate mapping.',
    leftToRightMap: { biomass: -1 }
  }
];

// -------------------------------------------------------------
// LINEAR PROGRAMMING SIMPLEX MATHEMATICS SOLVER ENGINE
// -------------------------------------------------------------

class PrimalSimplexSolver {
  /**
   * Solves: Maximize c^T * x
   * Subject to: A * x <= b
   *             x_lb <= x <= x_ub
   * 
   * For standard metabolic networks, we convert raw reactions to positive variables.
   * To handle lower bounds (lb) and upper bounds (ub) we add explicit constraints:
   *   x_i <= ub      => slack_ub
   *   -x_i <= -lb    => slack_lb (if lb > 0, we use dual phase or shift, or dual simplex)
   *   S * x = 0      => converted to S*x <= eps and -S*x <= eps
   */
  static solve(
    objectiveCoeffs: number[], // c
    M_matrix: number[][],      // constraint matrix rows
    q_bounds: number[],        // RHS values
    varNames: string[]
  ): { x: number[]; obj: number; shadowPrices: number[]; iterations: number; status: string } {
    const numConstraints = M_matrix.length;
    const numVars = objectiveCoeffs.length;

    // We build a Simplex Tableau:
    // Rows: [0 to numConstraints-1] represent constraints, Row [numConstraints] represents objective
    // Columns: [0 to numVars-1] variables, [numVars to numVars+numConstraints-1] slack variables, Column [numVars+numConstraints] is RHS
    const numCols = numVars + numConstraints + 1;
    const numRows = numConstraints + 1;

    const tableau: number[][] = Array(numRows).fill(0).map(() => Array(numCols).fill(0));

    // Fill constraints
    for (let r = 0; r < numConstraints; r++) {
      for (let c = 0; c < numVars; c++) {
        tableau[r][c] = M_matrix[r][c];
      }
      tableau[r][numVars + r] = 1; // Slack variable
      tableau[r][numCols - 1] = q_bounds[r];
    }

    // Fill objective row (we want to Maximize c^T * x, which is Minimize -c^T * x in standard tableau)
    for (let c = 0; c < numVars; c++) {
      tableau[numConstraints][c] = -objectiveCoeffs[c];
    }
    tableau[numConstraints][numCols - 1] = 0; // Initial obj value

    // List of basic variables corresponding to each row (initially slack variables)
    const basicVars: number[] = Array(numConstraints);
    for (let r = 0; r < numConstraints; r++) {
      basicVars[r] = numVars + r;
    }

    // -----------------------------------------------------------------
    // DUAL FEASIBILITY / PHASE 1 PHASE-IN FOR NEGATIVE BOUNDS
    // -----------------------------------------------------------------
    // If any RHS q_bounds[r] < 0, our starting slack basis is basic-infeasible (slacks < 0).
    // We execute a quick Dual Simplex pivot sequence to achieve primal feasibility.
    let iter = 0;
    const maxIter = 400;
    let status = 'Feasible';

    while (iter < maxIter) {
      // Find row with most negative RHS
      let pivotRow = -1;
      let worstRHS = -1e-6;
      for (let r = 0; r < numConstraints; r++) {
        const rhs = tableau[r][numCols - 1];
        if (rhs < worstRHS) {
          worstRHS = rhs;
          pivotRow = r;
        }
      }

      if (pivotRow === -1) {
        break; // Achieved primal feasibility!
      }

      // Dual Simplex pivot selection: find entering column in entry row with negative coefficient
      // we choose column matching min ratio: objective_coeff / tableau[pivotRow][col] for negative elements
      let pivotCol = -1;
      let minRatio = Infinity;
      for (let c = 0; c < numVars + numConstraints; c++) {
        const val = tableau[pivotRow][c];
        if (val < -1e-8) {
          const ratio = Math.abs(tableau[numConstraints][c] / val);
          if (ratio < minRatio) {
            minRatio = ratio;
            pivotCol = c;
          }
        }
      }

      if (pivotCol === -1) {
        status = 'Infeasible';
        break; // No negative pivot element found, dual unbounded -> primal infeasible
      }

      // Perform Pivot on (pivotRow, pivotCol)
      const pivotVal = tableau[pivotRow][pivotCol];
      for (let c = 0; c < numCols; c++) {
        tableau[pivotRow][c] /= pivotVal;
      }

      for (let r = 0; r <= numConstraints; r++) {
        if (r !== pivotRow) {
          const factor = tableau[r][pivotCol];
          for (let c = 0; c < numCols; c++) {
            tableau[r][c] -= factor * tableau[pivotRow][c];
          }
        }
      }

      basicVars[pivotRow] = pivotCol;
      iter++;
    }

    // -----------------------------------------------------------------
    // PRIMAL SIMPLEX MAXIMIZATION STAGE
    // -----------------------------------------------------------------
    if (status !== 'Infeasible') {
      while (iter < maxIter) {
        // Find entering variable (most negative value in objective row representing potential gain)
        let enterCol = -1;
        let mostNegativeVal = -1e-6;
        for (let c = 0; c < numVars + numConstraints; c++) {
          const val = tableau[numConstraints][c];
          if (val < mostNegativeVal) {
            mostNegativeVal = val;
            enterCol = c;
          }
        }

        if (enterCol === -1) {
          break; // No entering variable improves objective. Optimal basis found!
        }

        // Find leaving variable (Primal Minimum ratio test)
        let leaveRow = -1;
        let minRatio = Infinity;
        for (let r = 0; r < numConstraints; r++) {
          const coeff = tableau[r][enterCol];
          if (coeff > 1e-8) {
            const ratio = tableau[r][numCols - 1] / coeff;
            if (ratio < minRatio) {
              minRatio = ratio;
              leaveRow = r;
            }
          }
        }

        if (leaveRow === -1) {
          status = 'Unbounded';
          break; // Objective can go to infinity
        }

        // Pivot on (leaveRow, enterCol)
        const pivotVal = tableau[leaveRow][enterCol];
        for (let c = 0; c < numCols; c++) {
          tableau[leaveRow][c] /= pivotVal;
        }

        for (let r = 0; r <= numConstraints; r++) {
          if (r !== leaveRow) {
            const factor = tableau[r][enterCol];
            for (let c = 0; c < numCols; c++) {
              tableau[r][c] -= factor * tableau[leaveRow][c];
            }
          }
        }

        basicVars[leaveRow] = enterCol;
        iter++;
      }
    }

    // Extract Solution Values
    const fluxes = Array(numVars).fill(0);
    for (let r = 0; r < numConstraints; r++) {
      const variableIdx = basicVars[r];
      if (variableIdx < numVars) {
        fluxes[variableIdx] = Math.max(0, tableau[r][numCols - 1]);
      }
    }

    // Shadow prices: extracted from the objective row coefficients corresponding to slack positions
    // Reduced price indicates how relaxing a constraint bounds improves the objective value
    const shadowPrices = Array(numConstraints).fill(0);
    for (let r = 0; r < numConstraints; r++) {
      shadowPrices[r] = tableau[numConstraints][numVars + r];
    }

    const finalObjVal = tableau[numConstraints][numCols - 1];

    return {
      x: fluxes,
      obj: finalObjVal,
      shadowPrices,
      iterations: iter,
      status: status === 'Infeasible' ? 'Infeasible Model' : status
    };
  }
}

// Helper to construct the linear programming framework
function runFBASimulation(
  knockouts: { [gene: string]: boolean },
  glucoseUptakeMax: number,
  oxygenUptakeMax: number,
  isAnaerobic: boolean,
  objectiveReactionId: string // e.g., 'R_PGAsyn' (Max poly-glutamate) or 'R_Biomass' (Max growth)
) {
  // Construct dynamic list of reaction variables.
  // We split the fluxes for any REVERSIBLE steps into individual positive components for simplex tableau stability
  // Var map: we have a set of variables x[k]
  interface SimplexVarMap {
    rxnId: string;
    isReverse: boolean;
    colIndex: number;
  }

  const variablesList: SimplexVarMap[] = [];
  let indexCount = 0;
  
  REACTIONS.forEach(rxn => {
    // Forward variable
    variablesList.push({ rxnId: rxn.id, isReverse: false, colIndex: indexCount++ });
    if (rxn.reversible) {
      // Reverse variable
      variablesList.push({ rxnId: rxn.id, isReverse: true, colIndex: indexCount++ });
    }
  });

  const numVars = indexCount;

  // Let's formulate S • v = 0 representing metabolic steady state
  // We enforce this as:
  // (1) S • v <= epsilon (0.0001)
  // (2) -S • v <= epsilon (0.0001)
  // This guarantees highly accurate stoichiometric equality without requiring custom artificial variable phase 1 complexity!
  const S_constraints_matrix: number[][] = [];
  const constraints_RHS: number[] = [];
  const constraintDescriptions: string[] = [];

  // Add Stoichiometric balancing constraints for intracellular metabolites (all except extracellular inputs)
  METABOLITES.forEach(met => {
    if (met.compartment === 'cytosol') {
      // Row 1: Net synthesis <= 0.0001
      const S_row_pos = Array(numVars).fill(0);
      // Row 2: -Net synthesis <= 0.0001
      const S_row_neg = Array(numVars).fill(0);

      let contributes = false;

      variablesList.forEach(vMap => {
        const rxn = REACTIONS.find(r => r.id === vMap.rxnId)!;
        const stoich = rxn.leftToRightMap[met.id];
        if (stoich !== undefined && stoich !== 0) {
          contributes = true;
          const val = vMap.isReverse ? -stoich : stoich;
          S_row_pos[vMap.colIndex] = val;
          S_row_neg[vMap.colIndex] = -val;
        }
      });

      if (contributes) {
        S_constraints_matrix.push(S_row_pos);
        constraints_RHS.push(0.0005);
        constraintDescriptions.push(`Stoichiometry limit [${met.name}] surplus`);

        S_constraints_matrix.push(S_row_neg);
        constraints_RHS.push(0.0005);
        constraintDescriptions.push(`Stoichiometry limit [${met.name}] deficit`);
      }
    }
  });

  // Now, apply lower and upper bounds for each variable based on custom sliders, knockouts and default boundaries
  variablesList.forEach(vMap => {
    const rxn = REACTIONS.find(r => r.id === vMap.rxnId)!;
    
    // Default boundaries
    let boundMax = vMap.isReverse ? (rxn.defaultLb < 0 ? -rxn.defaultLb : 0) : rxn.defaultUb;
    let boundMin = vMap.isReverse ? 0 : (rxn.defaultLb > 0 ? rxn.defaultLb : 0);

    // Apply slider adjustments manually
    if (rxn.id === 'EX_glc') {
      // Glucose uptake exchange: negative upper bound in exchange conventions
      // Variable forward: exports, Variable reverse: imports glucose
      // Here EX_glc = -> glc_ext (stoich: glc_ext +1).
      // So forward rate means export of glucose (not occurring), reverse rate means import.
      // Maximum import of glucose is controlled by glucoseUptakeMax slider
      if (vMap.isReverse) {
        boundMax = glucoseUptakeMax;
      } else {
        boundMax = 0; // No excretion logic
      }
    }

    if (rxn.id === 'EX_o2') {
      // Oxygen exchange
      if (vMap.isReverse) {
        boundMax = isAnaerobic ? 0.0 : oxygenUptakeMax;
      } else {
        boundMax = 0;
      }
    }

    // Apply strict knockout status if associated enzymatic gene is checked
    if (rxn.gene && knockouts[rxn.gene]) {
      boundMax = 0;
      boundMin = 0;
    }

    // Enforce upper bound constraint (x_j <= boundMax)
    const row_ub = Array(numVars).fill(0);
    row_ub[vMap.colIndex] = 1;
    S_constraints_matrix.push(row_ub);
    constraints_RHS.push(boundMax);
    constraintDescriptions.push(`Reaction upper limit [${rxn.name} ${vMap.isReverse ? 'Rev' : 'Fwd'}]`);

    // Enforce lower bound constraint if boundMin > 0 (e.g., ATP Maintenance load)
    if (boundMin > 0) {
      const row_lb = Array(numVars).fill(0);
      row_lb[vMap.colIndex] = -1;
      S_constraints_matrix.push(row_lb);
      constraints_RHS.push(-boundMin);
      constraintDescriptions.push(`Reaction forced lower load [${rxn.name}]`);
    }
  });

  // Formulate objective matrix
  const c_objectiveCoeffs = Array(numVars).fill(0);
  variablesList.forEach(vMap => {
    if (vMap.rxnId === objectiveReactionId && !vMap.isReverse) {
      c_objectiveCoeffs[vMap.colIndex] = 1.0; // Maximize target flux (1.0 weight)
    }
  });

  const varNames = variablesList.map(v => `${v.rxnId}${v.isReverse ? '_rev' : ''}`);

  // Solve the LP problem formulation!
  const lpSolution = PrimalSimplexSolver.solve(
    c_objectiveCoeffs,
    S_constraints_matrix,
    constraints_RHS,
    varNames
  );

  // Map variable solutions back to unified reaction fluxes
  const finalFluxes: { [rxnId: string]: number } = {};
  REACTIONS.forEach(r => {
    finalFluxes[r.id] = 0;
  });

  variablesList.forEach(vMap => {
    const value = lpSolution.x[vMap.colIndex];
    if (vMap.isReverse) {
      finalFluxes[vMap.rxnId] -= value;
    } else {
      finalFluxes[vMap.rxnId] += value;
    }
  });

  // Calculate Shadow prices for nutrients / constraints to identify literal network bottlenecks
  // We look at shadow prices for the Glucose uptake check and Oxygen limit check
  const shadowPriceImpacts: { label: string; price: number; bottleneckScore: number }[] = [];
  
  // Locate glucose transport limit row constraint index
  variablesList.forEach(vMap => {
    if (vMap.rxnId === 'EX_glc' && vMap.isReverse) {
      const constraintIdx = S_constraints_matrix.length - numVars + vMap.colIndex; 
      // Offset matches placement of UPPER LIMIT constraints at end of the matrix
      const price = Math.abs(lpSolution.shadowPrices[constraintIdx] || 0);
      shadowPriceImpacts.push({
        label: 'Glucose Substrate Availability Limit',
        price,
        bottleneckScore: price > 0.01 ? Math.min(100, price * 120) : 0
      });
    }

    if (vMap.rxnId === 'EX_o2' && vMap.isReverse) {
      const constraintIdx = S_constraints_matrix.length - numVars + vMap.colIndex;
      const price = Math.abs(lpSolution.shadowPrices[constraintIdx] || 0);
      shadowPriceImpacts.push({
        label: 'Oxygen Dissolution Coefficient',
        price,
        bottleneckScore: price > 0.01 ? Math.min(100, price * 120) : 0
      });
    }

    if (vMap.rxnId === 'R_PFK' && !vMap.isReverse) {
      const constraintIdx = S_constraints_matrix.length - numVars + vMap.colIndex;
      const price = Math.abs(lpSolution.shadowPrices[constraintIdx] || 0);
      if (price > 0.01) {
        shadowPriceImpacts.push({
          label: 'Phosphofructokinase Bottleneck (Lower Glycolysis Cap)',
          price,
          bottleneckScore: price * 100
        });
      }
    }
  });

  return {
    fluxMap: finalFluxes,
    rawObjective: lpSolution.obj,
    status: lpSolution.status,
    bottlenecks: shadowPriceImpacts,
    iterations: lpSolution.iterations
  };
}

// -------------------------------------------------------------
// MAIN COMPONENT EXPORT
// -------------------------------------------------------------

export default function AdvancedFbaPortal({ 
  isLightMode, 
  onUpdatePrecursorFlux 
}: { 
  isLightMode: boolean; 
  onUpdatePrecursorFlux?: (val: number) => void;
}) {
  // Simulator operational parameters
  const [substrateGlucoseSl, setSubstrateGlucoseSl] = useState<number>(12.0);
  const [dissolvedOxygenSl, setDissolvedOxygenSl] = useState<number>(10.0);
  const [hypoxiaMode, setHypoxiaMode] = useState<boolean>(false);
  const [currentObjective, setCurrentObjective] = useState<string>('R_PGAsyn'); // default maximizes visual iGEM biopolymer

  // Glossary and active tooltips state management
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Pulse animation state for metric recalculations
  const [pulseMetric, setPulseMetric] = useState<boolean>(false);

  // Custom gene knockouts state
  const [knockoutList, setKnockoutList] = useState<{ [gene: string]: boolean }>({
    ptsG: false,
    pgi: false,
    pfkA: false,
    zwf: false,
    pdhA: false,
    gltA: false,
    sucC: false,
    pta: false,
    pgas: false,
  });

  // Calculate outputs dynamically using useMemo heavily targeting simplex optimization
  const fbaResults = useMemo(() => {
    return runFBASimulation(
      knockoutList,
      substrateGlucoseSl,
      dissolvedOxygenSl,
      hypoxiaMode,
      currentObjective
    );
  }, [knockoutList, substrateGlucoseSl, dissolvedOxygenSl, hypoxiaMode, currentObjective]);

  // Derived dashboard analytics from core FBA solution
  const metabolicFlux = fbaResults.fluxMap;
  const growthRate = metabolicFlux['R_Biomass'] || 0;
  const pgaSynthesisFlux = metabolicFlux['R_PGAsyn'] || 0;

  // Pulse effect handler upon flux recalculations
  React.useEffect(() => {
    setPulseMetric(true);
    const timer = setTimeout(() => setPulseMetric(false), 600);
    return () => clearTimeout(timer);
  }, [pgaSynthesisFlux, knockoutList, substrateGlucoseSl, dissolvedOxygenSl, hypoxiaMode, currentObjective]);

  // Propagate the optimized precursor output flux to the parent dashboard context
  React.useEffect(() => {
    if (onUpdatePrecursorFlux) {
      onUpdatePrecursorFlux(pgaSynthesisFlux);
    }
  }, [pgaSynthesisFlux, onUpdatePrecursorFlux]);

  // ATP Yield mapping: ATP generated sum vs consumed
  const atpProductionRate = useMemo(() => {
    let prod = 0;
    // PFK consumes 1, PYK generates 1, Respiratory ETC generates 2.5 per NADH, lower glyco oxidation generates 1
    if (metabolicFlux['R_PYK']) prod += metabolicFlux['R_PYK'];
    if (metabolicFlux['R_GAPDH_PGK']) prod += metabolicFlux['R_GAPDH_PGK'];
    if (metabolicFlux['R_RESP']) prod += metabolicFlux['R_RESP'] * 2.5; 
    if (metabolicFlux['R_PTA_ACK']) prod += metabolicFlux['R_PTA_ACK'];
    if (metabolicFlux['R_SUCOAS']) prod += metabolicFlux['R_SUCOAS'];
    return prod;
  }, [metabolicFlux]);

  // Transferred NADPH capacity for active biosynthesis
  const nadphProductionRate = useMemo(() => {
    let p = 0;
    if (metabolicFlux['R_G6PDH']) p += metabolicFlux['R_G6PDH'];
    if (metabolicFlux['R_GND']) p += metabolicFlux['R_GND'];
    if (metabolicFlux['R_ICDH']) p += metabolicFlux['R_ICDH'];
    return p;
  }, [metabolicFlux]);

  // top 5 key fluxes leaderboard
  const leaderboardFluxes = useMemo(() => {
    return [
      {
        id: 'EX_glc',
        name: 'Glucose Uptake Exchange',
        flux: Math.abs(metabolicFlux['EX_glc'] || 0),
        unit: 'mmol/gDCW/h',
        color: 'bg-cyan-500',
        textColor: 'text-cyan-500',
        desc: 'Primary carbon supply rate entering glycolysis'
      },
      {
        id: 'R_GAPDH_PGK',
        name: 'Glycolysis oxidation (GAP -> PEP)',
        flux: Math.abs(metabolicFlux['R_GAPDH_PGK'] || 0),
        unit: 'mmol/gDCW/h',
        color: 'bg-blue-500',
        textColor: 'text-blue-550',
        desc: 'Commitment of sugars toward lower metabolism'
      },
      {
        id: 'R_PTA_ACK',
        name: 'Acetate Waste Overflow (PTA-ACK)',
        flux: Math.abs(metabolicFlux['R_PTA_ACK'] || 0),
        unit: 'mmol/gDCW/h',
        color: 'bg-rose-500',
        textColor: 'text-rose-500',
        desc: 'Wasted energy shunt; bypasses TCA cycle',
        toggleGene: 'pta',
        isKnockedOut: knockoutList['pta']
      },
      {
        id: 'R_Biomass',
        name: 'Biomass Division Growth (Specific Rate)',
        flux: Math.abs(metabolicFlux['R_Biomass'] || 0),
        unit: '1/h',
        color: 'bg-amber-500',
        textColor: 'text-amber-500',
        desc: 'Specific cellular replication speed'
      },
      {
        id: 'R_GLUsyn',
        name: 'L-Glutamate Precursor synthesis',
        flux: Math.abs(metabolicFlux['R_GLUsyn'] || 0),
        unit: 'mmol/gDCW/h',
        color: 'bg-emerald-500',
        textColor: 'text-emerald-500',
        desc: 'Precursor committed to sand-grout PGA biopolymer'
      }
    ];
  }, [metabolicFlux, knockoutList]);

  // Dynamic SVG path properties calculated according to custom metabolic loads
  const getPathProps = (rxnId: string, activeColor: string) => {
    const flux = Math.abs(metabolicFlux[rxnId] || 0);
    const hasFlux = flux > 0.05;
    // Thickness scales with flux magnitude: up to 10px thickness!
    const strokeWidth = hasFlux ? Math.max(1.5, Math.min(10, flux * 0.75)) : 1.2;
    const stroke = hasFlux ? activeColor : (isLightMode ? '#dfceb0' : '#334155');
    
    // speed rate based on flux magnitude (higher flux = faster flow animation)
    const dashSpeed = hasFlux ? Math.max(0.2, Math.min(4.0, 4.5 / Math.max(0.1, flux))) : 0;
    const style = hasFlux ? {
      strokeDasharray: '6 4',
      animation: `dash ${dashSpeed}s linear infinite`
    } : undefined;

    return {
      stroke,
      strokeWidth,
      style,
      className: hasFlux ? "transition-all duration-300" : ""
    };
  };

  // Knockout trigger switch
  const handleToggleKnockout = (gene: string) => {
    setKnockoutList(prev => ({ ...prev, [gene]: !prev[gene] }));
  };

  // Reset simulator toggles
  const handleResetParameters = () => {
    setSubstrateGlucoseSl(12.0);
    setDissolvedOxygenSl(10.0);
    setHypoxiaMode(false);
    setKnockoutList({
      ptsG: false,
      pgi: false,
      pfkA: false,
      zwf: false,
      pdhA: false,
      gltA: false,
      sucC: false,
      pta: false,
      pgas: false,
    });
  };

  return (
    <div className={`p-5 transition-all duration-300 font-sans ${
      isLightMode ? 'bg-[#f4ebd0] text-stone-900' : 'bg-[#030508] text-slate-200'
    }`} id="fba-sim-portal-frame">
      
      {/* Simulation Banner Summary */}
      <div className={`p-4 rounded-xl border mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors duration-300 ${
        isLightMode ? 'bg-amber-100/60 border-amber-900/10' : 'bg-[#0a0f18] border-slate-800'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isLightMode ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-950/50 text-[#a5b4fc] border border-indigo-900/50'}`}>
            <Cpu className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider font-mono">
              FBA Core Central Metabolism Optimizer
            </h2>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Simulating <GlossaryTerm term="flux balance analysis" theme={isLightMode ? 'light' : 'dark'} activeTooltip={activeTooltip} setActiveTooltip={setActiveTooltip}>Flux Balance Analysis</GlossaryTerm> (S • v = 0) of 32 central reactions in <em>Bacillus subtilis</em>.
            </p>
          </div>
        </div>

        {/* Diagnostic indicators */}
        <div className="flex gap-2.5 flex-wrap font-mono text-[10px]">
          <div className={`px-2 py-1 rounded border flex items-center gap-1.5 ${
            fbaResults.status === 'Optimal' || fbaResults.status === 'Feasible'
              ? (isLightMode ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400')
              : (isLightMode ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-rose-950/20 border-rose-900/40 text-rose-400')
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping"></span>
            Solver Status: {fbaResults.status}
          </div>
          <div className={`px-2 py-1 rounded border ${isLightMode ? 'bg-stone-100 border-stone-200' : 'bg-slate-900/50 border-slate-800'}`}>
            Objective Vol: <span className="font-extrabold">{fbaResults.rawObjective.toFixed(4)}</span>
          </div>
          <div className={`px-2 py-1 rounded border ${isLightMode ? 'bg-stone-100 border-stone-200' : 'bg-slate-900/50 border-slate-800'}`}>
            Pivots: <span className="text-[#a5b4fc] font-bold">{fbaResults.iterations}</span>
          </div>
        </div>
      </div>

      {/* Grid Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ----------------- LEFT COLUMN: CONTROLS & GAUGES (4 Cols) ----------------- */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Objective Target & Inputs */}
          <div className={`p-5 rounded-xl border space-y-4 ${
            isLightMode ? 'bg-white border-amber-900/10 shadow-sm' : 'bg-[#0a0f18] border-slate-850/80'
          }`}>
            <h3 className={`text-xs font-black uppercase tracking-wider font-mono pb-2 border-b flex justify-between items-center ${
              isLightMode ? 'text-stone-900 border-amber-900/10' : 'text-slate-100 border-slate-800/80'
            }`}>
              <span className="flex items-center gap-2">
                <Settings className={`w-4 h-4 text-cyan-500`} /> Input Boundaries
              </span>
              <button 
                onClick={handleResetParameters}
                className={`p-1 rounded cursor-pointer transition text-[9px] font-semibold border ${
                  isLightMode ? 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
                title="Reset boundaries and knockouts"
              >
                <RotateCcw className="w-2.5 h-2.5 inline mr-1" /> Reset
              </button>
            </h3>

            {/* Objective Selector */}
            <div className="space-y-1.5">
              <label className={`text-[10px] font-extrabold uppercase font-mono block ${isLightMode ? 'text-amber-800' : 'text-cyan-400'}`}>
                Mathematical Objective (Maximize)
              </label>
              <div className={`grid grid-cols-2 p-1 rounded border text-[10px] font-mono gap-1 ${
                isLightMode ? 'bg-stone-50 border-stone-200' : 'bg-[#06080d] border-slate-805'
              }`}>
                <button 
                  onClick={() => setCurrentObjective('R_PGAsyn')}
                  className={`py-1.5 rounded cursor-pointer transition text-center ${
                    currentObjective === 'R_PGAsyn'
                      ? (isLightMode ? 'bg-indigo-650 text-white font-bold' : 'bg-indigo-950 text-indigo-200 border border-indigo-900/60 font-black')
                      : (isLightMode ? 'text-stone-500 hover:text-stone-900' : 'text-slate-500 hover:text-slate-350')
                  }`}
                >
                  Poly-γ-PGA Yield
                </button>
                <button 
                  onClick={() => setCurrentObjective('R_Biomass')}
                  className={`py-1.5 rounded cursor-pointer transition text-center ${
                    currentObjective === 'R_Biomass'
                      ? (isLightMode ? 'bg-indigo-650 text-white font-bold' : 'bg-indigo-950 text-indigo-200 border border-indigo-900/60 font-black')
                      : (isLightMode ? 'text-stone-500 hover:text-stone-900' : 'text-slate-500 hover:text-slate-350')
                  }`}
                >
                  Biomass (Growth)
                </button>
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-semibold">Glucose Max Uptake Rate:</span>
                  <span className="font-mono font-bold text-cyan-600">{substrateGlucoseSl.toFixed(1)} mmol/g·h</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="20"
                  step="0.5"
                  value={substrateGlucoseSl}
                  onChange={(e) => setSubstrateGlucoseSl(parseFloat(e.target.value))}
                  className={`w-full cursor-ew-resize accent-cyan-500 ${isLightMode ? 'bg-stone-200' : 'bg-slate-900'}`}
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-semibold">Oxygen Substrate Limit:</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {hypoxiaMode ? '0.0 (Anaerobic)' : `${dissolvedOxygenSl.toFixed(1)} mmol/g·h`}
                  </span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="20"
                  step="0.5"
                  disabled={hypoxiaMode}
                  value={dissolvedOxygenSl}
                  onChange={(e) => setDissolvedOxygenSl(parseFloat(e.target.value))}
                  className={`w-full cursor-ew-resize accent-emerald-500 disabled:opacity-30 ${isLightMode ? 'bg-stone-200' : 'bg-slate-900'}`}
                />
              </div>

              {/* Hypoxia Toggle Switches */}
              <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition-colors ${
                isLightMode ? 'bg-[#fcfbf9]/40 border-amber-900/10' : 'bg-[#080b12] border-slate-900'
              }`}>
                <div>
                  <span className="font-bold font-mono block text-[10px] uppercase">Hypoxic/Anaerobic Soil Mode</span>
                  <span className="text-[9px] text-slate-500 block mt-0.5">Shuts oxygen exchange inflow to zero</span>
                </div>
                <input 
                  type="checkbox"
                  checked={hypoxiaMode}
                  onChange={() => setHypoxiaMode(!hypoxiaMode)}
                  className="w-4 h-4 accent-red-505 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Genetic Knockout Sandbox (Simulating ∆zwf, ∆pta, etc) */}
          <div className={`p-5 rounded-xl border space-y-3.5 ${
            isLightMode ? 'bg-white border-amber-900/10 shadow-sm' : 'bg-[#0a0f18] border-slate-850/80'
          }`}>
            <div>
              <h3 className={`text-xs font-black uppercase tracking-wider font-mono flex items-center gap-1.5 pb-2 border-b ${
                isLightMode ? 'text-stone-900 border-amber-900/10' : 'text-slate-100 border-slate-800/80'
              }`}>
                <Dna className="w-4 h-4 text-rose-500" /> iGEM Knockout Sandbox
              </h3>
              <p className="text-[9px] text-slate-500 mt-1">
                Induce single gene deletions. Simplex reroutes carbon fluxes dynamically.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              {[
                { gene: 'ptsG', label: '∆ptsG (Glucose Transport)' },
                { gene: 'pgi', label: '∆pgi (Glycolysis check)' },
                { gene: 'pfkA', label: '∆pfkA (Forces PPP redirection)' },
                { gene: 'zwf', label: '∆zwf (Halves NADPH generator)' },
                { gene: 'pdhA', label: '∆pdhA (Decarboxylase blockage)' },
                { gene: 'gltA', label: '∆gltA (Blocks TCA cycles)' },
                { gene: 'sucC', label: '∆sucC (Succinyl pathways)' },
                { gene: 'pta', label: '∆pta (Eliminates Acetate wasting)' },
                { gene: 'pgas', label: '∆pgas (iGEM Polymerase off)' },
              ].map(item => (
                <button
                  key={item.gene}
                  onClick={() => handleToggleKnockout(item.gene)}
                  className={`p-2 rounded border text-left cursor-pointer transition-all flex items-center justify-between ${
                    knockoutList[item.gene]
                      ? (isLightMode ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold' : 'bg-rose-950/20 border-rose-800/80 text-rose-300')
                      : (isLightMode ? 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100' : 'bg-slate-905 border-slate-900 text-slate-450 hover:bg-slate-900')
                  }`}
                >
                  <span>{item.label}</span>
                  <span className={`w-2 h-2 rounded-full ${knockoutList[item.gene] ? 'bg-rose-500 animate-pulse' : 'bg-slate-500/30'}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Energy Co-Factor Yield Dashboard (Gauges) */}
          <div className={`p-4 rounded-xl border space-y-3 ${
            isLightMode ? 'bg-white border-amber-900/10 shadow-sm' : 'bg-[#0a0f18] border-slate-850/80'
          }`}>
            <h3 className={`text-xs font-black uppercase tracking-wider font-mono flex items-center gap-1.5 pb-1 border-b ${
              isLightMode ? 'text-stone-900 border-amber-900/10' : 'text-slate-100 border-slate-800/80'
            }`}>
              <Gauge className="w-4 h-4 text-indigo-400" /> Co-Factor Biosynthetic Yields
            </h3>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* ATP production box */}
              <div className={`p-2.5 rounded border text-center ${
                isLightMode ? 'bg-stone-50 border-stone-200' : 'bg-slate-950/40 border-slate-900'
              }`}>
                <span className="text-[9px] text-slate-500 uppercase font-mono tracking-wider block">ATP Production Rate</span>
                <span className={`font-mono text-xl font-black block my-1 ${isLightMode ? 'text-indigo-750' : 'text-indigo-400'}`}>
                  {atpProductionRate.toFixed(2)}
                </span>
                <span className="text-[8px] text-slate-500">mmol / gDCW·h</span>
              </div>

              {/* NADPH efficiency circle */}
              <div className={`p-2.5 rounded border text-center ${
                isLightMode ? 'bg-stone-50 border-stone-200' : 'bg-slate-950/40 border-slate-900'
              }`}>
                <span className="text-[9px] text-slate-500 uppercase font-mono tracking-wider block">Anabolic NADPH Yield</span>
                <span className={`font-mono text-xl font-black block my-1 ${isLightMode ? 'text-cyan-750' : 'text-cyan-400'}`}>
                  {nadphProductionRate.toFixed(2)}
                </span>
                <span className="text-[8px] text-slate-500">mmol / gDCW·h</span>
              </div>
            </div>

            {/* Explainer note */}
            <div className="p-2 bg-indigo-50/20 rounded border border-indigo-900/10 text-[9.5px] text-slate-500 leading-tight">
              Glutamate synthesis pathways require 1 full mole of <strong className={isLightMode ? 'text-cyan-805' : 'text-cyan-400'}>NADPH</strong>, while biopolymer polymerization drains <strong className={isLightMode ? 'text-indigo-805' : 'text-indigo-400'}>ATP</strong> coordinates. Redirection increases yields.
            </div>
          </div>

        </div>

        {/* ----------------- CENTER COLUMN: METABOLIC SVG NETWORK (8 Cols) ----------------- */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* SVG Metabolic Map */}
          <div className={`p-5 rounded-xl border relative ${
            isLightMode ? 'bg-[#fdfbf7] border-amber-900/10 shadow-sm' : 'bg-[#06080d] border-slate-850/90'
          }`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className={`text-xs font-black uppercase tracking-wider font-mono flex items-center gap-1.5 ${
                isLightMode ? 'text-stone-900' : 'text-slate-100'
              }`}>
                <Activity className="w-4 h-4 text-emerald-400 font-extrabold animate-pulse" /> Active Analytical Metabolic Flux Map
              </h3>
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${
                isLightMode ? 'bg-[#f5e9ce] border-amber-200' : 'bg-[#0a0f18] border-slate-800'
              }`}>
                Thicker Arrows = Elevated Flux Magnitude
              </span>
            </div>

            {/* Non-overlapping flow channel legend bar */}
            <div className={`flex flex-wrap items-center gap-4 text-[9.5px] font-mono p-2.5 rounded-lg border mb-4 transition-all ${
              isLightMode ? 'bg-[#f8f5ee] border-amber-900/10 text-slate-800' : 'bg-[#03060a]/90 border-slate-900 text-slate-400'
            }`}>
              <span className="font-extrabold uppercase text-[9px] text-[#10b981] select-none">Flow Channels Legend:</span>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <span>Cyan = Glycolytic transport</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse"></span>
                <span>Pink = Pentose & Glutamate synthesis</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Green = TCA & PGA final export</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                <span>Dull = Inactive / Dormant paths</span>
              </div>
            </div>

            {/* Glowing Flow SVG Container */}
            <div className={`relative border rounded-lg h-[410px] overflow-hidden select-none shadow-inner ${
              isLightMode ? 'bg-[#fdfbf6] border-amber-900/5' : 'bg-[#020305]/95 border-slate-900'
            }`}>
              
              <svg width="100%" height="100%" viewBox="0 0 800 400" className="absolute top-0 left-0">
                <style>{`
                  @keyframes dash {
                    to {
                      stroke-dashoffset: -20;
                    }
                  }
                `}</style>

                <defs>
                  {/* Glowing end markers */}
                  <marker id="arrow-cyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#22d3ee" />
                  </marker>
                  <marker id="arrow-emerald" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
                  </marker>
                  <marker id="arrow-indigo" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#6366f1" />
                  </marker>
                  <marker id="arrow-stone" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
                  </marker>
                </defs>

                {/* ------------------- STAGE 1: METABOLITE NODE CIRCLES ------------------- */}
                {/* Glucose ext */}
                <circle cx="50" cy="80" r="14" fill={isLightMode ? '#dfceb0' : '#1e293b'} stroke={isLightMode ? '#b8956c' : '#475569'} strokeWidth="2" />
                <text x="50" y="84" textAnchor="middle" fontSize="8" className="font-sans font-bold select-none fill-current pointer-events-none">GlcExt</text>

                {/* G6P */}
                <circle cx="160" cy="80" r="14" fill={isLightMode ? '#f5e9ce' : '#0f172a'} stroke={isLightMode ? '#6366f1' : '#6366f1'} strokeWidth="2" />
                <text x="160" y="84" textAnchor="middle" fontSize="8" className="font-sans font-bold select-none fill-current pointer-events-none">G6P</text>

                {/* F6P */}
                <circle cx="280" cy="80" r="14" fill={isLightMode ? '#fcfbf7' : '#020617'} stroke="#38bdf8" strokeWidth="1.5" />
                <text x="280" y="84" textAnchor="middle" fontSize="8" className="font-sans font-semibold select-none fill-current pointer-events-none">F6P</text>

                {/* FBP */}
                <circle cx="280" cy="180" r="14" fill={isLightMode ? '#fcfbf7' : '#020617'} stroke="#0284c7" strokeWidth="1.5" />
                <text x="280" y="184" textAnchor="middle" fontSize="8" className="font-sans select-none fill-current pointer-events-none">FBP</text>

                {/* GAP */}
                <circle cx="160" cy="230" r="14" fill={isLightMode ? '#fcfbf7' : '#020617'} stroke="#22d3ee" strokeWidth="1.5" />
                <text x="160" y="234" textAnchor="middle" fontSize="8" className="font-sans select-none fill-current pointer-events-none">GAP</text>

                {/* PEP */}
                <circle cx="160" cy="330" r="14" fill={isLightMode ? '#fcfbf7' : '#020617'} stroke="#06b6d4" strokeWidth="1.5" />
                <text x="160" y="334" textAnchor="middle" fontSize="8" className="font-sans select-none fill-current pointer-events-none">PEP</text>

                {/* Pyr */}
                <circle cx="290" cy="330" r="14" fill={isLightMode ? '#fcfbf7' : '#020617'} stroke="#e11d48" strokeWidth="1.5" />
                <text x="290" y="334" textAnchor="middle" fontSize="8" className="font-sans select-none fill-current pointer-events-none">Pyr</text>

                {/* PPP 6PGC */}
                <circle cx="160" cy="150" r="14" fill={isLightMode ? '#f5f0e1' : '#080d19'} stroke="#f43f5e" strokeWidth="1.5" />
                <text x="160" y="154" textAnchor="middle" fontSize="8" className="font-sans select-none fill-current pointer-events-none">6PGC</text>

                {/* PPP Ru5P */}
                <circle cx="80" cy="190" r="14" fill={isLightMode ? '#f5f0e1' : '#080d19'} stroke="#db2777" strokeWidth="1.5" />
                <text x="80" y="194" textAnchor="middle" fontSize="8" className="font-sans select-none fill-current pointer-events-none">Ru5P</text>

                {/* Acetate */}
                <circle cx="390" cy="370" r="14" fill={isLightMode ? '#dfceb0' : '#1e293b'} stroke="#64748b" strokeWidth="1.5" />
                <text x="390" y="374" textAnchor="middle" fontSize="8" className="font-sans select-none fill-current pointer-events-none">AcetExt</text>

                {/* AcetCoA */}
                <circle cx="410" cy="270" r="14" fill={isLightMode ? '#f5e9ce' : '#0a0f1d'} stroke="#f59e0b" strokeWidth="1.5" />
                <text x="410" y="274" textAnchor="middle" fontSize="8" className="font-sans select-none fill-current pointer-events-none">AcCoA</text>

                {/* Cit */}
                <circle cx="530" cy="270" r="14" fill={isLightMode ? '#fcfbf7' : '#020617'} stroke="#059669" strokeWidth="1.5" />
                <text x="530" y="274" textAnchor="middle" fontSize="8" className="font-sans select-none fill-current pointer-events-none">Cit</text>

                {/* ICit */}
                <circle cx="630" cy="220" r="14" fill={isLightMode ? '#fcfbf7' : '#020617'} stroke="#10b981" strokeWidth="1.5" />
                <text x="630" y="224" textAnchor="middle" fontSize="8" className="font-sans select-none fill-current pointer-events-none">ICit</text>

                {/* AKG */}
                <circle cx="530" cy="150" r="14" fill={isLightMode ? '#fcfbf7' : '#020617'} stroke="#10b981" strokeWidth="2" />
                <text x="530" y="154" textAnchor="middle" fontSize="8" className="font-sans font-extrabold select-none fill-current pointer-events-none">AKG</text>

                {/* L-Glu */}
                <circle cx="530" cy="60" r="14" fill={isLightMode ? '#ebdec7' : '#101726'} stroke="#db2777" strokeWidth="2.5" />
                <text x="530" y="64" textAnchor="middle" fontSize="8" className="font-sans font-black select-none fill-current pointer-events-none">L-Glu</text>

                {/* PGA Biopolymer Ext */}
                <circle cx="680" cy="60" r="16" fill={isLightMode ? '#d1fae5' : '#064e3b'} stroke="#059669" strokeWidth="3" />
                <text x="680" y="64" textAnchor="middle" fontSize="9" className="font-sans font-black select-none fill-current pointer-events-none">PGA</text>

                {/* SucCoA */}
                <circle cx="650" cy="320" r="14" fill={isLightMode ? '#fcfbf7' : '#020617'} stroke="#059669" strokeWidth="1.5" />
                <text x="650" y="324" textAnchor="middle" fontSize="8" className="font-sans select-none fill-current pointer-events-none">SucCoA</text>

                {/* Succinate */}
                <circle cx="530" cy="380" r="14" fill={isLightMode ? '#fcfbf7' : '#020617'} stroke="#059669" strokeWidth="1.5" />
                <text x="530" y="384" textAnchor="middle" fontSize="8" className="font-sans select-none fill-current pointer-events-none">Succ</text>

                {/* OAA */}
                <circle cx="410" cy="180" r="14" fill={isLightMode ? '#fcfbf7' : '#020617'} stroke="#10b981" strokeWidth="1.5" />
                <text x="410" y="184" textAnchor="middle" fontSize="8" className="font-sans select-none fill-current pointer-events-none">OAA</text>


                {/* ------------------- STAGE 2: FLUX EDGE PATHS WITH CALCULATED THICKNESS ------------------- */}
                {/* PTS */}
                <path d="M 64 80 L 146 80" markerEnd="url(#arrow-cyan)" fill="none" {...getPathProps('R_GLCpts', '#22d3ee')} />
                <text x="105" y="72" fontSize="7" className="font-mono fill-current opacity-60 font-medium">
                   R_GLCpts ({metabolicFlux['R_GLCpts']?.toFixed(1)})
                </text>

                {/* PGI */}
                <path d="M 174 80 L 266 80" markerEnd="url(#arrow-cyan)" fill="none" {...getPathProps('R_PGI', '#22d3ee')} />
                <text x="220" y="72" fontSize="7" className="font-mono fill-current opacity-60 font-medium">
                   R_PGI ({metabolicFlux['R_PGI']?.toFixed(1)})
                </text>

                {/* PFK */}
                <path d="M 280 94 L 280 166" markerEnd="url(#arrow-cyan)" fill="none" {...getPathProps('R_PFK', '#22d3ee')} />
                <text x="290" y="130" fontSize="7" className="font-mono fill-current opacity-60 font-medium">
                   R_PFK ({metabolicFlux['R_PFK']?.toFixed(1)})
                </text>

                {/* GAP Split (FBA + TPI combined visually as FBP -> GAP) */}
                <path d="M 268 188 L 172 224" markerEnd="url(#arrow-cyan)" fill="none" {...getPathProps('R_FBA', '#38bdf8')} />

                {/* GAP -> PEP (Lower glycolysis cascade) */}
                <path d="M 160 244 L 160 316" markerEnd="url(#arrow-cyan)" fill="none" {...getPathProps('R_GAPDH_PGK', '#06b6d4')} />
                <text x="110" y="280" fontSize="7" className="font-mono fill-current opacity-80 font-semibold">
                   R_GAPDH_PGK ({metabolicFlux['R_GAPDH_PGK']?.toFixed(1)})
                </text>

                {/* PYK */}
                <path d="M 174 330 L 276 330" markerEnd="url(#arrow-cyan)" fill="none" {...getPathProps('R_PYK', '#e11d48')} />
                <text x="225" y="342" fontSize="7" className="font-mono fill-current opacity-60 font-medium">
                   R_PYK ({metabolicFlux['R_PYK']?.toFixed(1)})
                </text>

                {/* G6PDH */}
                <path d="M 160 94 L 160 136" markerEnd="url(#arrow-cyan)" fill="none" {...getPathProps('R_G6PDH', '#db2777')} />
                <text x="115" y="118" fontSize="7" className="font-mono fill-current opacity-60 font-medium font-bold">
                   zwf ({metabolicFlux['R_G6PDH']?.toFixed(1)})
                </text>

                {/* GND */}
                <path d="M 148 158 L 92 182" markerEnd="url(#arrow-cyan)" fill="none" {...getPathProps('R_GND', '#db2777')} />

                {/* PPP Recycle (Ru5P -> GAP/F6P) */}
                <path d="M 80 176 L 146 222" markerEnd="url(#arrow-stone)" fill="none" {...getPathProps('R_PPP_to_Glyc', '#64748b')} />

                {/* PDH (Pyr -> AcCoA) */}
                <path d="M 302 322 L 398 278" markerEnd="url(#arrow-emerald)" fill="none" {...getPathProps('R_PDH', '#f59e0b')} />
                <text x="350" y="295" fontSize="7" className="font-mono fill-current opacity-60 font-medium">
                   R_PDH ({metabolicFlux['R_PDH']?.toFixed(1)})
                </text>

                {/* Overflow (AcCoA -> Acetate Ext) */}
                <path d="M 405 284 L 395 356" markerEnd="url(#arrow-stone)" fill="none" {...getPathProps('R_PTA_ACK', '#64748b')} />
                <text x="360" y="318" fontSize="7" className="font-mono fill-current opacity-60 font-medium">
                   pta-ack ({metabolicFlux['R_PTA_ACK']?.toFixed(1)})
                </text>

                {/* Citrate Synthase */}
                <path d="M 424 270 L 516 270" markerEnd="url(#arrow-emerald)" fill="none" {...getPathProps('R_CS', '#10b981')} />

                {/* Acont (Cit -> ICit) */}
                <path d="M 542 264 L 618 226" markerEnd="url(#arrow-emerald)" fill="none" {...getPathProps('R_ACONT', '#10b981')} />

                {/* ICDH (ICit -> AKG) */}
                <path d="M 618 212 L 542 158" markerEnd="url(#arrow-emerald)" fill="none" {...getPathProps('R_ICDH', '#10b981')} />
                <text x="590" y="172" fontSize="7" className="font-mono fill-current opacity-80 font-semibold animate-pulse">
                   citC ({metabolicFlux['R_ICDH']?.toFixed(1)})
                </text>

                {/* AKGDH (AKG -> SucCoA) */}
                <path d="M 544 150 L 638 310" markerEnd="url(#arrow-stone)" fill="none" {...getPathProps('R_AKGDH', '#10b981')} />
                <text x="585" y="240" fontSize="7" className="font-mono fill-current opacity-60 font-medium">
                   odhA ({metabolicFlux['R_AKGDH']?.toFixed(1)})
                </text>

                {/* SUCOAS (SucCoA -> Succ) */}
                <path d="M 638 322 L 544 376" markerEnd="url(#arrow-emerald)" fill="none" {...getPathProps('R_SUCOAS', '#10b981')} />

                {/* Regeneration (Succ -> OAA) */}
                <path d="M 518 376 L 412 194" markerEnd="url(#arrow-emerald)" fill="none" {...getPathProps('R_SDH_FUM_MDH', '#10b981')} />

                {/* OAA -> Cit condensation loop */}
                <path d="M 410 194 L 410 256" markerEnd="url(#arrow-emerald)" fill="none" {...getPathProps('R_CS', '#10b981')} />

                {/* ------------------- STAGE 3: POLYMER PGA CHANNELS ------------------- */}
                {/* Glutamate Synthase (AKG -> Glu) */}
                <path d="M 530 136 L 530 74" markerEnd="url(#arrow-indigo)" fill="none" {...getPathProps('R_GLUsyn', '#db2777')} />
                <text x="540" y="105" fontSize="7.5" className="font-mono fill-current font-black text-pink-500">
                   R_GLUsyn ({metabolicFlux['R_GLUsyn']?.toFixed(1)})
                </text>

                {/* PGA Synthesising Polymerizer (L-Glu -> PGA Extracellular) */}
                <path d="M 544 60 L 664 60" markerEnd="url(#arrow-emerald)" fill="none" {...getPathProps('R_PGAsyn', '#10b981')} />
                <text x="590" y="52" fontSize="8" className="font-sans font-black fill-current text-emerald-500 animate-pulse">
                   iGEM PGA OP ({metabolicFlux['R_PGAsyn']?.toFixed(2)})
                </text>
              </svg>

            </div>
          </div>

          {/* Stoichiometric Heatmap Matrix Grid (Y: Metabolites, X: Reactions) */}
          <div className={`p-5 rounded-xl border space-y-4 ${
            isLightMode ? 'bg-white border-amber-900/10 shadow-sm' : 'bg-[#0a0f18] border-slate-850/80'
          }`}>
            <div className="flex justify-between items-center">
              <h3 className={`text-xs font-black uppercase tracking-wider font-mono flex items-center gap-1.5 ${
                isLightMode ? 'text-stone-900' : 'text-slate-100'
              }`}>
                <Database className="w-4 h-4 text-cyan-500" /> Micro Stoichiometric Coefficient Matrix (S)
              </h3>
              <span className="font-mono text-[9px] text-slate-500">
                26 Metabolites x 24 Reactions
              </span>
            </div>

            {/* Matrix Heatmap Scroller */}
            <div className={`overflow-x-auto border rounded-xl p-2 ${
              isLightMode ? 'bg-[#fcfaf5] border-amber-900/10' : 'bg-[#05070a] border-slate-900'
            }`}>
              <div className="min-w-[700px] text-[8px] font-mono select-none">
                
                {/* Header row */}
                <div className="flex border-b border-slate-800/40 pb-1 mb-1">
                  <div className="w-[85px] shrink-0 font-bold truncate">Metabolite \ Reaction</div>
                  {REACTIONS.slice(0, 16).map(rxn => (
                    <div key={rxn.id} className="w-[32px] shrink-0 text-center text-slate-500 truncate" title={rxn.name}>
                      {rxn.id.substring(2, 8)}
                    </div>
                  ))}
                </div>

                {/* Metabolite rows */}
                <div className="space-y-1">
                  {METABOLITES.slice(0, 13).map(met => (
                    <div key={met.id} className="flex items-center text-slate-400">
                      <div className="w-[85px] shrink-0 font-bold font-sans text-slate-500 truncate" title={met.name}>
                        {met.name}
                      </div>

                      {REACTIONS.slice(0, 16).map(rxn => {
                        const coeff = rxn.leftToRightMap[met.id] || 0;
                        let bgClass = isLightMode ? 'bg-stone-100 text-stone-300' : 'bg-slate-900/40 text-slate-700';
                        if (coeff < 0) bgClass = 'bg-rose-500/20 text-rose-500 font-bold border border-rose-500/50';
                        if (coeff > 0) bgClass = 'bg-emerald-500/20 text-emerald-500 font-bold border border-emerald-500/50';

                        return (
                          <div 
                            key={`${met.id}-${rxn.id}`} 
                            className={`w-[32px] h-[18px] shrink-0 flex items-center justify-center rounded-sm mx-0.5 text-[9px] ${bgClass}`}
                            title={`Reaction: ${rxn.name}\nMetabolite: ${met.name}\nCoefficient: ${coeff}`}
                          >
                            {coeff !== 0 ? coeff : '.'}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <p className="text-[9px] text-slate-500 leading-normal">
              Heatmap representation of chemical formulas. Red cells indicate substrate consumption (negative entry). Green cells signify synthesis products (positive stoichiometry entry).
            </p>
          </div>

          {/* Live Metabolic Flux Leaderboard */}
          <div className={`p-5 rounded-xl border space-y-4 transition-all duration-300 ${
            isLightMode ? 'bg-white border-amber-900/10 shadow-sm' : 'bg-[#0a0f18] border-slate-850/80'
          }`}>
            <div className="flex justify-between items-center">
              <h3 className={`text-xs font-black uppercase tracking-wider font-mono flex items-center gap-1.5 ${
                isLightMode ? 'text-stone-900' : 'text-slate-100'
              }`}>
                <Zap className="w-4 h-4 text-emerald-500 animate-pulse" /> Metabolic Flux Leaderboard
              </h3>
              <span className={`text-[9.5px] font-mono px-2 py-0.5 rounded border ${
                isLightMode ? 'bg-[#f5e9ce] border-amber-200' : 'bg-[#0a0f1e] border-slate-855'
              }`}>
                Top 5 Key Flux Coordinates
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {leaderboardFluxes.map((item) => (
                <div 
                  key={item.id} 
                  className={`p-3 rounded-xl border flex flex-col justify-between transition-all hover:scale-[1.02] ${
                    isLightMode ? 'bg-[#faf8f4] border-amber-900/10 hover:shadow-md' : 'bg-[#060a10]/80 border-slate-900/80 shadow-lg'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-1.5 gap-1">
                      <span className={`text-[9.5px] font-extrabold uppercase tracking-wide truncate max-w-[100px] ${isLightMode ? 'text-slate-800' : 'text-slate-350'}`} title={item.name}>
                        {item.name}
                      </span>
                      {item.toggleGene && (
                        <button
                          onClick={() => handleToggleKnockout(item.toggleGene)}
                          className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider transition-all duration-200 shrink-0 ${
                            item.isKnockedOut
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-rose-950/20 hover:text-rose-300 hover:border-rose-500'
                          }`}
                          title={`Click to toggle ${item.toggleGene} knockout`}
                        >
                          {item.isKnockedOut ? '∆pta KO' : 'pta WT'}
                        </button>
                      )}
                    </div>
                    <div className="text-xl font-mono font-black tracking-tight leading-none text-slate-100 flex items-baseline gap-0.5 my-1.5">
                      <span className={item.textColor}>
                        {item.flux.toFixed(3)}
                      </span>
                      <span className="text-[7.5px] font-semibold text-slate-500 font-sans tracking-normal block ml-0.5 shrink-0 truncate">
                        {item.unit}
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-500 leading-tight mt-1 line-clamp-2" title={item.desc}>
                      {item.desc}
                    </div>
                  </div>
                  {/* Mini visual indicator */}
                  <div className="mt-2.5">
                    <div className="w-full h-1 bg-slate-910/50 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                        style={{ width: `${Math.min(100, (item.flux / 15) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shadow Prices / Nutrient Bottlenecks Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Bottleneck tracking card */}
            <div className={`p-4 rounded-xl border space-y-3.5 ${
              isLightMode ? 'bg-white border-amber-900/10 shadow-sm' : 'bg-[#0a0f18] border-slate-850/80'
            }`}>
              <h4 className={`text-xs font-black uppercase tracking-wider font-mono flex items-center gap-1.5 ${
                isLightMode ? 'text-amber-955' : 'text-slate-100'
              }`}>
                <TrendingUp className="w-4 h-4 text-emerald-400" /> Matrix Constraint Shadow Prices
              </h4>
              <p className="text-[9.5px] text-slate-500 leading-normal">
                Shadow price identifies the fractional increase in the objective function if we relax a nutrient barrier by 1 unit.
              </p>

              <div className="space-y-3 pt-1">
                {fbaResults.bottlenecks.map((b, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-[10px] items-center">
                      <span className="font-bold">{b.label}</span>
                      <span className="font-mono text-cyan-600 font-extrabold">{b.price.toFixed(3)}</span>
                    </div>
                    {/* Progress representation */}
                    <div className={`w-full h-1.5 rounded-full ${isLightMode ? 'bg-stone-100' : 'bg-slate-900'}`}>
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          b.price > 0.5 ? 'bg-amber-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${b.bottleneckScore || 5}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FBA Theory Explainer */}
            <div className={`p-4 rounded-xl border space-y-2.5 ${
              isLightMode ? 'bg-white border-amber-900/10 shadow-sm' : 'bg-[#0a0f18] border-slate-850/80'
            }`}>
              <h4 className={`text-xs font-black uppercase tracking-wider font-mono flex items-center gap-1.5 ${
                isLightMode ? 'text-indigo-950' : 'text-slate-100'
              }`}>
                <HelpCircle className="w-4 h-4 text-cyan-400" /> iGEM FBA Science Deck
              </h4>
              <p className="text-[9.5px] text-slate-500 leading-relaxed font-sans">
                FBA calculates intracellular reaction speeds (fluxes) assuming static internal metabolite pools at equilibrium (the S • v = 0 balance constraint).
              </p>
              <div className={`p-2 rounded border text-[9px] font-mono text-left leading-normal ${
                isLightMode ? 'bg-stone-50 border-stone-200' : 'bg-slate-950/45 border-slate-900'
              }`}>
                Maximize <span className="text-emerald-500">v_PGA</span> subject to:<br />
                • steady state stoichiometric balance<br />
                • glucose uptake & oxygenation sliders<br />
                • active sand knockout gene checkboxes
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Massive Glowing Precursor Flux Outcome Block */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ 
          opacity: 1, 
          y: 0,
          scale: pulseMetric ? [1, 1.03, 1] : 1,
          boxShadow: pulseMetric
            ? (isLightMode ? '0 10px 30px rgba(16,185,129,0.25)' : '0 0 35px rgba(16,185,129,0.55)')
            : (isLightMode ? '0 4px 12px rgba(139,94,26,0.06)' : '0 0 0px rgba(0,0,0,0)')
        }}
        transition={{ duration: 0.4 }}
        className={`mt-6 p-6 rounded-2xl border text-center relative overflow-hidden transition-all duration-300 ${
          isLightMode
            ? 'bg-gradient-to-r from-emerald-50 via-white to-emerald-50 border-emerald-300 shadow-md text-slate-900'
            : 'bg-gradient-to-r from-slate-950 via-[#031c11] to-slate-950 border-emerald-500/20 text-emerald-50'
        }`}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-emerald-500 to-indigo-500 animate-pulse" />
        <span className="text-[10px] uppercase font-mono tracking-widest text-[#10b981] font-black block mb-1">
          SYSTEM METABOLIC SIMULATION OUTCOME
        </span>
        <h4 className="text-sm font-bold uppercase tracking-wider font-sans mb-1.5">
          Optimized Precursor Synthesis (PGA Yield)
        </h4>
        <div className="flex flex-col items-center justify-center">
          <div className={`text-4xl md:text-5xl font-black font-mono tracking-tight my-2 drop-shadow-sm flex items-center justify-center gap-1.5 transition-all ${
            pulseMetric 
              ? 'text-emerald-500 scale-105' 
              : (isLightMode ? 'text-emerald-800' : 'text-emerald-450')
          }`}>
            <span className="font-mono">{pgaSynthesisFlux.toFixed(4)}</span>
            <span className={`text-xs md:text-sm font-semibold tracking-normal font-sans text-slate-500 shrink-0`}>
              mmol / gDCW · h
            </span>
          </div>
        </div>
        <p className="text-[10.5px] text-slate-500 max-w-2xl mx-auto leading-relaxed mt-2 font-sans">
          This optimized Precursor Export represents the mathematical maximum solution of the linear system <strong>S • v = 0</strong>. Knocking out metabolic side channels like <strong>pta</strong> (acetate excretion) commitments glucose toward glutamate synthesis, yielding maximal cell-cementation material.
        </p>
      </motion.div>

    </div>
  );
}
