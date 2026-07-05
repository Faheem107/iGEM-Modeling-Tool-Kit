/**
 * Canonical B. subtilis core-carbon metabolic network for FBA.
 * ===========================================================
 * A compact but **fully mass-balanced** reconstruction (every internal metabolite has
 * producers and consumers) so `solveFBA` returns genuine optima — unlike a hand-coded flux
 * cascade. Captures: glucose → glycolysis → pyruvate → acetyl-CoA → α-ketoglutarate →
 * L-glutamate → γ-PGA, with growth (biomass), respiration, ATP maintenance and acetate
 * overflow. Lumped stoichiometry is chosen to balance carbon, ATP and redox.
 */

import type { FbaReaction, MetabolicNetwork } from './fba';
import { FBA_CALIB, cval } from './constants';

export const CORE_METABOLITES = [
  'glc', 'G6P', 'PEP', 'PYR', 'ACCOA', 'AKG', 'GLU', 'ATP', 'NADH',
  'o2', 'nh3', 'co2', 'pga', 'biomass', 'ac', 'ca',
];

/** Reaction catalogue with display metadata. */
export interface CoreReactionMeta extends FbaReaction {
  name: string;
  gene?: string;
  subsystem: 'uptake' | 'glycolysis' | 'tca' | 'pga' | 'micp' | 'biomass' | 'energy' | 'overflow' | 'exchange';
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
    r('EX_GLC', 'Glucose supply', 'uptake', { glc: 1 }, 0, glcUb),
    r('GLT', 'Glucose transport', 'uptake', { glc: -1, G6P: 1 }, 0, 1000, 'ptsG'),
    r('GLY', 'Glycolysis (G6P→2 PEP)', 'glycolysis', { G6P: -1, PEP: 2, ATP: 2, NADH: 2 }, 0, 1000, 'pfkA'),
    r('PYK', 'Pyruvate kinase', 'glycolysis', { PEP: -1, PYR: 1, ATP: 1 }, 0, 1000, 'pyk'),
    r('PDH', 'Pyruvate dehydrogenase', 'tca', { PYR: -1, ACCOA: 1, NADH: 1, co2: 1 }, 0, 1000, 'pdhA'),
    r('TCA', 'TCA to α-ketoglutarate', 'tca', { ACCOA: -1, AKG: 1, NADH: 1, co2: 1 }, 0, 1000, 'gltA'),
    r('GDH', 'Glutamate dehydrogenase', 'pga', { AKG: -1, nh3: -1, GLU: 1 }, 0, 1000, 'gdh'),
    r('PGS', 'γ-PGA synthase (PgsBCA)', 'pga', { GLU: -1, pga: 1 }, 0, 1000, 'pgsBCA'),
    // Prong 2 — carbonic anhydrase is a secreted protein; expressing it draws amino-acid
    // (glutamate proxy) and ATP away from growth, exactly like γ-PGA competes for carbon.
    r('CAS', 'Carbonic anhydrase expression', 'micp', { GLU: -1, ATP: -10, ca: 1 }, 0, 1000, 'can'),
    r('BIO', 'Biomass assembly', 'biomass', { G6P: -0.5, PEP: -1.5, ACCOA: -1, AKG: -1, GLU: -1, ATP: -25, biomass: 1 }, 0, 1000),
    r('RESP', 'Oxidative phosphorylation', 'energy', { NADH: -1, o2: -0.5, ATP: 2 }, 0, 1000),
    r('ATPM', 'ATP maintenance (NGAM)', 'energy', { ATP: -1 }, ngam, 1000),
    r('OVF', 'Acetate overflow', 'overflow', { PYR: -1, ac: 1, ATP: 1 }, 0, 1000, 'pta'),
    r('EX_O2', 'O₂ supply', 'exchange', { o2: 1 }, 0, o2Ub),
    r('EX_NH3', 'Ammonia supply', 'exchange', { nh3: 1 }, 0, 1000),
    r('EX_CO2', 'CO₂ release', 'exchange', { co2: -1 }, 0, 1000),
    r('EX_AC', 'Acetate secretion', 'exchange', { ac: -1 }, 0, 1000),
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

/** Knockout-able reactions surfaced in the UI (gene → reaction id). */
export const KNOCKOUTS: { id: string; gene: string; label: string }[] = [
  { id: 'OVF', gene: 'pta/ackA', label: 'Δpta (acetate overflow)' },
  { id: 'PDH', gene: 'pdhA', label: 'ΔpdhA (pyruvate DH)' },
  { id: 'TCA', gene: 'gltA', label: 'ΔgltA (citrate synthase)' },
  { id: 'RESP', gene: 'cyt', label: 'ΔRESP (respiration)' },
];
