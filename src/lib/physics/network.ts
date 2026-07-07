/**
 * Canonical B. subtilis core-carbon metabolic network for FBA.
 * ===========================================================
 * A compact but **fully mass-balanced** reconstruction (every internal metabolite has producers
 * AND consumers) so `solveFBA` returns genuine optima — not a hand-coded flux cascade. It captures
 * the branch points that actually decide precursor supply in B. subtilis:
 *
 *   • Glycolysis (EMP)                      glucose → G6P → PEP → pyruvate
 *   • Oxidative pentose-phosphate pathway   G6P → R5P + 2 NADPH        (zwf) — NADPH + nucleotides
 *   • Pyruvate node                          → acetyl-CoA (pdhA) │ → OAA anaplerosis (pycA)
 *   • A CLOSED TCA cycle                     AcCoA+OAA→citrate→α-KG→…→OAA   (citZ, citC, odhAB)
 *   • GS–GOGAT glutamate synthesis           α-KG + NH₃ + NADPH + ATP → L-Glu  (glnA/gltAB)
 *   • Products                               L-Glu → γ-PGA (capBCA) │ carbonic anhydrase (can)
 *   • Overflow sinks                         acetate (pta/ackA) and fermentative lactate (ldh)
 *   • Energy                                 oxidative phosphorylation, NGAM, redox balancing
 *
 * Deliberately faithful to B. subtilis: glutamate is made by GS–GOGAT (rocG/gudB run catabolically),
 * and there is **no glyoxylate shunt** (B. subtilis lacks isocitrate lyase). Blocking 2-oxoglutarate
 * dehydrogenase (ΔodhAB) makes α-KG pile up and is the textbook lever for glutamate / γ-PGA
 * overproduction — the knockout list surfaces it. Lumped stoichiometry balances C, ATP and redox.
 */

import type { FbaReaction, MetabolicNetwork } from './fba';
import { FBA_CALIB, cval } from './constants';

export const CORE_METABOLITES = [
  'glc', 'G6P', 'R5P', 'PEP', 'PYR', 'ACCOA', 'OAA', 'CIT', 'AKG', 'GLU',
  'ATP', 'NADH', 'NADPH', 'o2', 'nh3', 'co2', 'pga', 'ca', 'ac', 'lac', 'biomass',
];

/** Reaction catalogue with display metadata. */
export interface CoreReactionMeta extends FbaReaction {
  name: string;
  gene?: string;
  subsystem: 'uptake' | 'glycolysis' | 'ppp' | 'tca' | 'anaplerosis' | 'pga' | 'micp' | 'biomass' | 'energy' | 'overflow' | 'exchange';
}

export function buildCoreNetwork(opts?: { glucoseUb?: number; o2Ub?: number; knockouts?: string[] }): {
  network: MetabolicNetwork; reactions: CoreReactionMeta[];
} {
  const glcUb = opts?.glucoseUb ?? cval(FBA_CALIB.vGlcMax);
  const o2Ub = opts?.o2Ub ?? cval(FBA_CALIB.vO2Max);
  const ngam = cval(FBA_CALIB.atpMaintenance);
  const ko = new Set(opts?.knockouts ?? []);

  const r = (id: string, name: string, subsystem: CoreReactionMeta['subsystem'], stoich: Record<string, number>, lb: number, ub: number, gene?: string): CoreReactionMeta => ({
    id, name, subsystem, gene, stoich,
    lb: ko.has(id) ? 0 : lb,
    ub: ko.has(id) ? 0 : ub,
  });

  const reactions: CoreReactionMeta[] = [
    // --- Uptake ---
    r('EX_GLC', 'Glucose supply', 'uptake', { glc: 1 }, 0, glcUb),
    r('GLT', 'Glucose uptake (PTS)', 'uptake', { glc: -1, G6P: 1 }, 0, 1000, 'ptsG'),
    // --- Glycolysis (EMP) ---
    r('GLY', 'Glycolysis (G6P→2 PEP)', 'glycolysis', { G6P: -1, PEP: 2, ATP: 2, NADH: 2 }, 0, 1000, 'pfkA'),
    r('PYK', 'Pyruvate kinase', 'glycolysis', { PEP: -1, PYR: 1, ATP: 1 }, 0, 1000, 'pyk'),
    // --- Oxidative pentose-phosphate pathway ---
    r('ZWF', 'Pentose-P pathway (oxidative)', 'ppp', { G6P: -1, R5P: 1, co2: 1, NADPH: 2 }, 0, 1000, 'zwf'),
    // --- Pyruvate node ---
    r('PDH', 'Pyruvate dehydrogenase', 'tca', { PYR: -1, ACCOA: 1, NADH: 1, co2: 1 }, 0, 1000, 'pdhA'),
    r('PYC', 'Pyruvate carboxylase (anaplerosis)', 'anaplerosis', { PYR: -1, co2: -1, ATP: -1, OAA: 1 }, 0, 1000, 'pycA'),
    // --- Closed TCA cycle ---
    r('CS', 'Citrate synthase', 'tca', { ACCOA: -1, OAA: -1, CIT: 1 }, 0, 1000, 'citZ'),
    r('ICDH', 'Isocitrate dehydrogenase', 'tca', { CIT: -1, AKG: 1, co2: 1, NADPH: 1 }, 0, 1000, 'citC'),
    r('AKGD', '2-oxoglutarate DH → OAA (cycle closure)', 'tca', { AKG: -1, OAA: 1, NADH: 3, co2: 1, ATP: 1 }, 0, 1000, 'odhAB'),
    // --- Glutamate synthesis (GS–GOGAT, the B. subtilis route) ---
    r('GOGAT', 'GS–GOGAT glutamate synthesis', 'pga', { AKG: -1, nh3: -1, NADPH: -1, ATP: -1, GLU: 1 }, 0, 1000, 'glnA/gltAB'),
    // --- Products ---
    r('PGS', 'γ-PGA synthase (CapB/CapC/CapA)', 'pga', { GLU: -1, pga: 1 }, 0, 1000, 'capBCA'),
    // Prong 2 — carbonic anhydrase is a secreted protein; expressing it draws amino-acid
    // (glutamate proxy) and ATP away from growth, exactly like γ-PGA competes for carbon.
    r('CAS', 'Carbonic anhydrase expression', 'micp', { GLU: -1, ATP: -10, ca: 1 }, 0, 1000, 'can'),
    // --- Overflow sinks ---
    r('OVF', 'Acetate overflow', 'overflow', { ACCOA: -1, ac: 1, ATP: 1 }, 0, 1000, 'pta/ackA'),
    r('LDH', 'Lactate overflow (fermentative NADH sink)', 'overflow', { PYR: -1, NADH: -1, lac: 1 }, 0, 1000, 'ldh'),
    // --- Energy & redox ---
    r('RESP', 'Oxidative phosphorylation', 'energy', { NADH: -1, o2: -0.5, ATP: 2 }, 0, 1000, 'cytABCD'),
    r('THD', 'Transhydrogenase (NADPH→NADH balance)', 'energy', { NADPH: -1, NADH: 1 }, 0, 1000, 'udhA (lumped)'),
    r('ATPM', 'ATP maintenance (NGAM)', 'energy', { ATP: -1 }, ngam, 1000),
    // --- Biomass (multi-precursor drain) ---
    r('BIO', 'Biomass assembly', 'biomass', { G6P: -0.25, R5P: -0.3, PEP: -0.5, PYR: -0.4, ACCOA: -0.4, OAA: -0.5, AKG: -0.2, GLU: -0.4, NADPH: -2, ATP: -25, biomass: 1 }, 0, 1000),
    // --- Exchanges ---
    r('EX_O2', 'O₂ supply', 'exchange', { o2: 1 }, 0, o2Ub),
    r('EX_NH3', 'Ammonia supply', 'exchange', { nh3: 1 }, 0, 1000),
    r('EX_CO2', 'CO₂ release', 'exchange', { co2: -1 }, 0, 1000),
    r('EX_AC', 'Acetate secretion', 'exchange', { ac: -1 }, 0, 1000),
    r('EX_LAC', 'Lactate secretion', 'exchange', { lac: -1 }, 0, 1000),
    r('EX_PGA', 'γ-PGA secretion', 'exchange', { pga: -1 }, 0, 1000),
    r('EX_CA', 'CA enzyme secretion', 'exchange', { ca: -1 }, 0, 1000),
    r('EX_BIOM', 'Growth (biomass drain)', 'exchange', { biomass: -1 }, 0, 1000),
  ];

  return { network: { metabolites: CORE_METABOLITES, reactions }, reactions };
}

/** Objective reaction ids. */
export const OBJ_GROWTH = 'EX_BIOM';
export const OBJ_PGA = 'EX_PGA';
/** Prong 2 objective — maximise secreted carbonic-anhydrase titre. */
export const OBJ_CA = 'EX_CA';

/**
 * Knockout-able reactions surfaced in the UI (gene → reaction id). Chosen to teach real
 * metabolic-engineering levers, each of which visibly re-routes carbon in the flow map:
 *   • ΔodhAB  — the classic α-KG/glutamate over-production lever (drives γ-PGA precursor supply)
 *   • Δpta    — kills acetate overflow, recovering wasted carbon
 *   • Δldh    — removes the fermentative lactate sink (matters under low O₂)
 *   • Δzwf    — closes the oxidative PPP → NADPH must come from the TCA/transhydrogenase
 *   • ΔpycA   — removes anaplerosis → OAA (hence TCA + biomass) becomes limiting
 *   • ΔpdhA   — cuts acetyl-CoA supply to the TCA cycle
 *   • ΔRESP   — forces fermentation (overflow lights up)
 */
export const KNOCKOUTS: { id: string; gene: string; label: string }[] = [
  { id: 'AKGD', gene: 'odhAB', label: 'ΔodhAB (2-oxoglutarate DH)' },
  { id: 'OVF', gene: 'pta/ackA', label: 'Δpta (acetate overflow)' },
  { id: 'LDH', gene: 'ldh', label: 'Δldh (lactate sink)' },
  { id: 'ZWF', gene: 'zwf', label: 'Δzwf (pentose-P / NADPH)' },
  { id: 'PYC', gene: 'pycA', label: 'ΔpycA (anaplerosis)' },
  { id: 'PDH', gene: 'pdhA', label: 'ΔpdhA (pyruvate DH)' },
  { id: 'RESP', gene: 'cytABCD', label: 'ΔRESP (respiration)' },
];
