/**
 * Canonical Bacillus subtilis core-carbon network for flux balance analysis.
 * =========================================================================
 * This module is the ONLY place stoichiometry is defined. The simulation workspace and the
 * advanced portal both build their networks here, and the portal's displayed equations are
 * generated from these same coefficients by `formulaOf`, so the equation a reader sees and
 * the equation the solver uses cannot drift apart.
 *
 * WHAT IS MODELLED
 *   Glycolysis via the glucose phosphotransferase system, both branches of the pentose
 *   phosphate pathway, a closed tricarboxylic acid cycle, anaplerosis through pyruvate
 *   carboxylase and malic enzyme, gluconeogenesis through PEP carboxykinase and
 *   fructose-1,6-bisphosphatase, GS-GOGAT nitrogen assimilation, the two product routes
 *   (gamma-PGA and heterologous carbonic anhydrase), acetate and lactate overflow, and a
 *   two-branch respiratory chain.
 *
 * CHOICES SPECIFIC TO B. SUBTILIS
 *   - Glucose enters by the phosphotransferase system, so uptake costs one PEP rather than
 *     one ATP, and the pyruvate it releases is unavoidable.
 *   - Glutamate is made only by glutamine synthetase plus glutamate synthase. B. subtilis
 *     glutamate dehydrogenases (rocG, gudB) run catabolically and are not an anabolic route,
 *     so there is no GDH shortcut into the glutamate pool.
 *   - There is no glyoxylate shunt. B. subtilis has no isocitrate lyase.
 *   - Respiration is split into an NADH branch and a quinol branch with different
 *     phosphorylation ratios. The B. subtilis type-II NADH dehydrogenase does not pump
 *     protons, so the NADH branch cannot be given the ratio conventionally used for
 *     organisms with a proton-pumping complex I. Succinate dehydrogenase feeds the quinone
 *     pool directly and therefore yields less ATP again.
 *
 * NITROGEN BOOKKEEPING
 *   Glutamate is the amino donor for essentially all biomass nitrogen. Biomass therefore
 *   draws glutamate and returns 2-oxoglutarate one for one for every transaminated nitrogen,
 *   which transfers the amine without double-counting the five carbons of the carrier. The
 *   net glutamate-family carbon that stays in biomass is the separate skeleton term.
 *
 * VALIDATION (enforced by validate_models.py, do not edit these numbers by hand)
 *   Every internal reaction closes on carbon and on nitrogen. With all uptakes shut, no
 *   objective is feasible above zero, so the network contains no cycle that creates mass or
 *   free energy. At the default bounds the model returns mu = 0.717 per hour (58 min
 *   doubling), a biomass yield of 0.469 gDCW per g glucose and an oxygen demand of
 *   19.5 mmol per gDCW per hour, against measured values of 0.60 to 0.75 per hour and
 *   0.40 to 0.50 gDCW per g for B. subtilis 168 in aerobic batch on glucose minimal medium.
 *
 * A NOTE ON WHAT FLUX BALANCE ANALYSIS CAN AND CANNOT SHOW
 *   Deleting 2-oxoglutarate dehydrogenase is widely used to raise glutamate and gamma-PGA
 *   titres in vivo. This model does not reproduce that, and no repair to the stoichiometry
 *   will make it. Compared at matched growth rate, the deletion LOWERS attainable PGA to
 *   55% of wild type, because the reaction it removes is a net source of ATP and NADH. The
 *   in vivo benefit is regulatory: blocking 2-oxoglutarate catabolism raises the
 *   intracellular glutamate pool and drives the synthetase further up its substrate
 *   saturation curve. Pool sizes and enzyme saturation are outside the scope of a
 *   steady-state stoichiometric method. The knockout table below reports what this model
 *   actually predicts and says so.
 */

import type { FbaReaction, MetabolicNetwork } from "./fba";
import { FBA_CALIB, BIOMASS_CALIB, cval } from "./constants";

// --------------------------------------------------------------------------------------
// Metabolites
// --------------------------------------------------------------------------------------

export interface MetaboliteInfo {
  id: string;
  name: string;
  compartment: "cytosol" | "extracellular";
  /** Carbon atoms per molecule, used for element-balance checking. */
  carbon: number;
  /** Nitrogen atoms per molecule. */
  nitrogen: number;
}

/** Residues in the heterologous beta-carbonic anhydrase polypeptide. */
export const CA_RESIDUES = 175;

/**
 * ATP equivalents per residue incorporated into a polypeptide: four for elongation, being
 * two for aminoacyl-tRNA charging and two GTP for the ribosomal cycle, plus a small
 * allowance for proofreading and initiation amortised over the chain. This is the term that
 * sets how expensive heterologous expression is, so it is stated rather than buried.
 */
export const ATP_PER_RESIDUE = 4.3;

export const METABOLITE_INFO: Record<string, MetaboliteInfo> = {
  glc: { id: "glc", name: "Glucose", compartment: "extracellular", carbon: 6, nitrogen: 0 },
  G6P: { id: "G6P", name: "Glucose-6-P", compartment: "cytosol", carbon: 6, nitrogen: 0 },
  F6P: { id: "F6P", name: "Fructose-6-P", compartment: "cytosol", carbon: 6, nitrogen: 0 },
  R5P: { id: "R5P", name: "Ribose-5-P", compartment: "cytosol", carbon: 5, nitrogen: 0 },
  GAP: { id: "GAP", name: "Glyceraldehyde-3-P", compartment: "cytosol", carbon: 3, nitrogen: 0 },
  PEP: { id: "PEP", name: "Phosphoenolpyruvate", compartment: "cytosol", carbon: 3, nitrogen: 0 },
  PYR: { id: "PYR", name: "Pyruvate", compartment: "cytosol", carbon: 3, nitrogen: 0 },
  ACCOA: { id: "ACCOA", name: "Acetyl-CoA", compartment: "cytosol", carbon: 2, nitrogen: 0 },
  CIT: { id: "CIT", name: "Citrate", compartment: "cytosol", carbon: 6, nitrogen: 0 },
  AKG: { id: "AKG", name: "2-Oxoglutarate", compartment: "cytosol", carbon: 5, nitrogen: 0 },
  SUC: { id: "SUC", name: "Succinate", compartment: "cytosol", carbon: 4, nitrogen: 0 },
  MAL: { id: "MAL", name: "Malate", compartment: "cytosol", carbon: 4, nitrogen: 0 },
  OAA: { id: "OAA", name: "Oxaloacetate", compartment: "cytosol", carbon: 4, nitrogen: 0 },
  GLU: { id: "GLU", name: "L-Glutamate", compartment: "cytosol", carbon: 5, nitrogen: 1 },
  QH2: { id: "QH2", name: "Menaquinol", compartment: "cytosol", carbon: 0, nitrogen: 0 },
  NADH: { id: "NADH", name: "NADH", compartment: "cytosol", carbon: 0, nitrogen: 0 },
  NADPH: { id: "NADPH", name: "NADPH", compartment: "cytosol", carbon: 0, nitrogen: 0 },
  ATP: { id: "ATP", name: "ATP", compartment: "cytosol", carbon: 0, nitrogen: 0 },
  o2: { id: "o2", name: "Oxygen", compartment: "extracellular", carbon: 0, nitrogen: 0 },
  nh3: { id: "nh3", name: "Ammonium", compartment: "extracellular", carbon: 0, nitrogen: 1 },
  co2: { id: "co2", name: "Carbon dioxide", compartment: "extracellular", carbon: 1, nitrogen: 0 },
  pga: { id: "pga", name: "gamma-PGA (residue)", compartment: "extracellular", carbon: 5, nitrogen: 1 },
  ca: {
    id: "ca",
    name: "Carbonic anhydrase",
    compartment: "extracellular",
    carbon: CA_RESIDUES * 5,
    nitrogen: CA_RESIDUES,
  },
  ac: { id: "ac", name: "Acetate", compartment: "extracellular", carbon: 2, nitrogen: 0 },
  lac: { id: "lac", name: "L-Lactate", compartment: "extracellular", carbon: 3, nitrogen: 0 },
  biomass: { id: "biomass", name: "Biomass", compartment: "cytosol", carbon: 0, nitrogen: 0 },
};

export const CORE_METABOLITES: string[] = Object.keys(METABOLITE_INFO);

// --------------------------------------------------------------------------------------
// Biomass equation, derived from measured macromolecular composition
// --------------------------------------------------------------------------------------
/**
 * The biomass reaction is computed from composition rather than asserted, so that changing
 * a measured mass fraction in BIOMASS_CALIB propagates into the stoichiometry. The route is:
 * mass fraction of each cell component, to molar demand for that component, to the carbon
 * skeletons its building blocks are made from.
 *
 * The derivation is checked against an independent measurement. Summed precursor carbon
 * comes to 39.25 mmol per gDCW and summed nitrogen to 9.26 mmol per gDCW; the elemental
 * composition of B. subtilis biomass gives 40.6 mmol C and 8.8 mmol N per gDCW. Closing to
 * 97% on carbon and 105% on nitrogen from an independent starting point is the evidence that
 * these coefficients are anchored rather than fitted.
 */

/** Representative amino acid mole fractions of the B. subtilis proteome. */
const AA_FRACTION: Record<string, number> = {
  Ala: 0.078, Arg: 0.049, Asn: 0.040, Asp: 0.053, Cys: 0.008, Gln: 0.039,
  Glu: 0.079, Gly: 0.074, His: 0.023, Ile: 0.069, Leu: 0.096, Lys: 0.069,
  Met: 0.026, Phe: 0.044, Pro: 0.036, Ser: 0.058, Thr: 0.057, Trp: 0.010,
  Tyr: 0.033, Val: 0.069,
};

/**
 * Carbon skeleton drawn per amino acid residue, expressed in core metabolites. Aromatic
 * residues need two PEP plus one erythrose-4-phosphate; the core network does not carry E4P,
 * so it is charged as the half F6P plus half GAP that the transketolase reactions would
 * supply.
 */
const AA_PRECURSOR: Record<string, Record<string, number>> = {
  Ala: { PYR: 1 },
  Val: { PYR: 2 },
  Leu: { PYR: 2, ACCOA: 1 },
  Ser: { GAP: 1 },
  Gly: { GAP: 1 },
  Cys: { GAP: 1 },
  Asp: { OAA: 1 },
  Asn: { OAA: 1 },
  Thr: { OAA: 1 },
  Met: { OAA: 1 },
  Lys: { OAA: 1, PYR: 1 },
  Ile: { OAA: 1, PYR: 1 },
  Glu: { AKG: 1 },
  Gln: { AKG: 1 },
  Pro: { AKG: 1 },
  Arg: { AKG: 1 },
  His: { R5P: 1 },
  Phe: { PEP: 2, F6P: 0.5, GAP: 0.5 },
  Tyr: { PEP: 2, F6P: 0.5, GAP: 0.5 },
  Trp: { PEP: 2, F6P: 0.5, GAP: 0.5, R5P: 1 },
};

/** Amino nitrogens per residue, backbone plus side chain. */
const AA_NITROGEN: Record<string, number> = {
  Ala: 1, Arg: 4, Asn: 2, Asp: 1, Cys: 1, Gln: 2, Glu: 1, Gly: 1, His: 3, Ile: 1,
  Leu: 1, Lys: 2, Met: 1, Phe: 1, Pro: 1, Ser: 1, Thr: 1, Trp: 2, Tyr: 1, Val: 1,
};

export interface BiomassDerivation {
  /** Final reaction stoichiometry, metabolite id to coefficient. */
  stoich: Record<string, number>;
  /** Carbon skeleton demand before the nitrogen carrier is added, mmol per gDCW. */
  precursors: Record<string, number>;
  /** Total carbon consumed, mmol per gDCW. */
  carbonDrawn: number;
  /** Total nitrogen consumed, mmol per gDCW. */
  nitrogenDrawn: number;
  /** Glutamate drawn purely as an amino donor and returned as 2-oxoglutarate. */
  transaminatedNitrogen: number;
}

export function deriveBiomassEquation(): BiomassDerivation {
  const comp = BIOMASS_CALIB;
  const prec: Record<string, number> = {};
  const add = (m: string, v: number) => {
    prec[m] = (prec[m] ?? 0) + v;
  };

  // Protein. Mass fraction over the weight-averaged peptide-bond residue mass.
  const residues = (cval(comp.proteinFraction) / cval(comp.residueMass)) * 1000;
  let aminoNitrogen = 0;
  for (const [aa, f] of Object.entries(AA_FRACTION)) {
    for (const [m, c] of Object.entries(AA_PRECURSOR[aa])) add(m, residues * f * c);
    aminoNitrogen += residues * f * AA_NITROGEN[aa];
  }

  // RNA and DNA. One ribose-5-phosphate per nucleotide; the pyrimidine ring carbon beyond
  // the sugar comes from aspartate, hence from oxaloacetate.
  const nmp = (cval(comp.rnaFraction) / 339.0) * 1000;
  const dnmp = (cval(comp.dnaFraction) / 323.0) * 1000;
  add("R5P", nmp + dnmp);
  add("OAA", 0.55 * (nmp + dnmp));
  const nucleicNitrogen = 3.75 * (nmp + dnmp);

  // Membrane lipid. Two branched-chain acyl chains of about sixteen carbons, so eight
  // acetyl-CoA each, esterified to a glycerol-3-phosphate derived from GAP.
  const lipid = (cval(comp.lipidFraction) / 720.0) * 1000;
  add("ACCOA", 8 * 2 * lipid);
  add("GAP", lipid);

  // Peptidoglycan. Disaccharide pentapeptide: two amino sugars from F6P, two N-acetyl
  // groups from acetyl-CoA, the muramic acid lactyl ether from PEP, two alanines and part
  // of diaminopimelate from pyruvate, the rest of diaminopimelate from OAA, and the stem
  // iso-glutamate from 2-oxoglutarate.
  const pg = (cval(comp.peptidoglycanFraction) / 940.0) * 1000;
  add("F6P", 2 * pg);
  add("ACCOA", 2 * pg);
  add("PEP", pg);
  add("PYR", 3 * pg);
  add("OAA", pg);
  add("AKG", pg);
  const pgNitrogen = 5 * pg;

  // Teichoic acid. Poly(glycerol phosphate) on an N-acetylglucosamine linkage unit.
  const ta = (cval(comp.teichoicFraction) / 172.0) * 1000;
  add("GAP", ta);
  add("F6P", 0.06 * ta);

  // Nitrogen carrier. Glutamate-family residues keep their own skeleton and backbone
  // nitrogen; every remaining biomass nitrogen arrives by one glutamate to 2-oxoglutarate
  // transamination, which is carbon neutral.
  const glutamateSkeleton = prec["AKG"] ?? 0;
  delete prec["AKG"];
  const nitrogenDrawn = aminoNitrogen + nucleicNitrogen + pgNitrogen;
  const transaminated = nitrogenDrawn - glutamateSkeleton;

  const stoich: Record<string, number> = {};
  for (const [m, v] of Object.entries(prec)) stoich[m] = -v;
  stoich["GLU"] = -(glutamateSkeleton + transaminated);
  stoich["AKG"] = transaminated;
  stoich["ATP"] = -cval(comp.growthAtp);
  stoich["NADPH"] = -cval(comp.growthNadph);
  stoich["biomass"] = 1;

  const carbonDrawn = -Object.entries(stoich).reduce(
    (s, [m, v]) => s + v * (METABOLITE_INFO[m]?.carbon ?? 0),
    0,
  );
  const nDrawn = -Object.entries(stoich).reduce(
    (s, [m, v]) => s + v * (METABOLITE_INFO[m]?.nitrogen ?? 0),
    0,
  );

  return {
    stoich,
    precursors: prec,
    carbonDrawn,
    nitrogenDrawn: nDrawn,
    transaminatedNitrogen: transaminated,
  };
}

export const BIOMASS = deriveBiomassEquation();

// --------------------------------------------------------------------------------------
// Reaction catalogue
// --------------------------------------------------------------------------------------

export type Subsystem =
  | "uptake"
  | "glycolysis"
  | "ppp"
  | "tca"
  | "anaplerosis"
  | "nitrogen"
  | "pga"
  | "micp"
  | "biomass"
  | "energy"
  | "overflow"
  | "exchange";

export interface CoreReactionMeta extends FbaReaction {
  name: string;
  gene?: string;
  subsystem: Subsystem;
  reversible: boolean;
  /** Human-readable equation, generated from `stoich` so it cannot disagree with it. */
  formula: string;
  description: string;
}

const INF = 1000;

/** Render a reaction equation from its stoichiometry. */
export function formulaOf(stoich: Record<string, number>, reversible: boolean): string {
  const term = ([m, c]: [string, number]) => {
    const a = Math.abs(c);
    const rounded = Math.round(a * 1e4) / 1e4;
    return (Math.abs(rounded - 1) < 1e-9 ? "" : `${rounded} `) + m;
  };
  const entries = Object.entries(stoich).filter(([, c]) => Math.abs(c) > 1e-12);
  const lhs = entries.filter(([, c]) => c < 0).map(term).join(" + ") || "(none)";
  const rhs = entries.filter(([, c]) => c > 0).map(term).join(" + ") || "(none)";
  return `${lhs} ${reversible ? "<=>" : "->"} ${rhs}`;
}

interface RawReaction {
  id: string;
  name: string;
  gene?: string;
  subsystem: Subsystem;
  stoich: Record<string, number>;
  lb: number;
  ub: number;
  description: string;
}

/**
 * Bounds are assigned per reaction from thermodynamic reasoning, not uniformly. Reactions
 * carrying a large negative free-energy change under physiological conditions are held
 * irreversible so the solver cannot run them backwards to manufacture ATP or reducing
 * equivalents. Isomerases and the near-equilibrium dehydrogenases are left reversible.
 *
 * Two reversible pairs deserve comment. Phosphofructokinase with fructose-1,6-bisphosphatase
 * forms a cycle that hydrolyses ATP; it is dissipative rather than generative, so the solver
 * has no incentive to carry it. Malate dehydrogenase running toward malate, followed by
 * malic enzyme and pyruvate carboxylase, forms a cycle that converts NADH plus ATP into
 * NADPH. That is a real route in B. subtilis and the only one available when 2-oxoglutarate
 * dehydrogenase is deleted, which is why the deletion is viable here rather than lethal.
 */
const RAW_REACTIONS: RawReaction[] = [
  // ---- exchanges -------------------------------------------------------------------
  { id: "EX_GLC", name: "Glucose uptake", subsystem: "uptake", stoich: { glc: 1 }, lb: 0, ub: 15,
    description: "Feed bound. Upper bound is the measured specific uptake rate." },
  { id: "EX_O2", name: "Oxygen uptake", subsystem: "uptake", stoich: { o2: 1 }, lb: 0, ub: 20,
    description: "Aerobiosis ceiling set by mass transfer in the vessel." },
  { id: "EX_NH3", name: "Ammonium uptake", subsystem: "uptake", stoich: { nh3: 1 }, lb: 0, ub: INF,
    description: "Nitrogen source, not limiting on minimal medium with excess ammonium." },
  { id: "EX_CO2", name: "CO2 release", subsystem: "exchange", stoich: { co2: -1 }, lb: 0, ub: INF,
    description: "Respiratory and decarboxylation carbon leaving the system." },
  { id: "EX_AC", name: "Acetate excretion", subsystem: "exchange", stoich: { ac: -1 }, lb: 0, ub: INF,
    description: "Overflow product, appears when carbon inflow exceeds respiratory capacity." },
  { id: "EX_LAC", name: "Lactate excretion", subsystem: "exchange", stoich: { lac: -1 }, lb: 0, ub: INF,
    description: "Fermentative product, appears only under oxygen limitation." },
  { id: "EX_PGA", name: "gamma-PGA export", subsystem: "exchange", stoich: { pga: -1 }, lb: 0, ub: INF,
    description: "Polymer product, counted per glutamate residue." },
  { id: "EX_CA", name: "Carbonic anhydrase", subsystem: "exchange", stoich: { ca: -1 }, lb: 0, ub: INF,
    description: "Heterologous enzyme product, counted per polypeptide." },
  { id: "EX_BIOM", name: "Growth", subsystem: "exchange", stoich: { biomass: -1 }, lb: 0, ub: INF,
    description: "Biomass drain. Its flux is the specific growth rate in reciprocal hours." },

  // ---- glycolysis ------------------------------------------------------------------
  { id: "PTS", name: "Glucose phosphotransferase system", gene: "ptsG", subsystem: "glycolysis",
    stoich: { glc: -1, PEP: -1, G6P: 1, PYR: 1 }, lb: 0, ub: INF,
    description: "Uptake and phosphorylation in one step, paid for with PEP rather than ATP." },
  { id: "PGI", name: "Phosphoglucose isomerase", gene: "pgi", subsystem: "glycolysis",
    stoich: { G6P: -1, F6P: 1 }, lb: -INF, ub: INF,
    description: "Near equilibrium, so left reversible." },
  { id: "PFK", name: "Phosphofructokinase, aldolase and triose-P isomerase", gene: "pfkA/fbaA/tpiA",
    subsystem: "glycolysis", stoich: { F6P: -1, ATP: -1, GAP: 2 }, lb: 0, ub: INF,
    description: "Lumped hexose cleavage. Irreversible: the kinase step is strongly exergonic." },
  { id: "FBP", name: "Fructose-1,6-bisphosphatase", gene: "fbp", subsystem: "glycolysis",
    stoich: { GAP: -2, F6P: 1 }, lb: 0, ub: INF,
    description: "Gluconeogenic bypass of phosphofructokinase, needed for growth on C4 substrates." },
  { id: "GAPD", name: "Lower glycolysis", gene: "gapA/pgk/pgm/eno", subsystem: "glycolysis",
    stoich: { GAP: -1, PEP: 1, ATP: 1, NADH: 1 }, lb: -INF, ub: INF,
    description: "Oxidation and substrate-level phosphorylation from GAP to PEP. Reversible, which is what makes gluconeogenesis possible." },
  { id: "PYK", name: "Pyruvate kinase", gene: "pyk", subsystem: "glycolysis",
    stoich: { PEP: -1, PYR: 1, ATP: 1 }, lb: 0, ub: INF,
    description: "Irreversible, large negative free-energy change." },
  { id: "PCK", name: "PEP carboxykinase", gene: "pckA", subsystem: "anaplerosis",
    stoich: { OAA: -1, ATP: -1, PEP: 1, co2: 1 }, lb: 0, ub: INF,
    description: "Gluconeogenic exit from the TCA cycle." },

  // ---- pentose phosphate -----------------------------------------------------------
  { id: "ZWF", name: "Oxidative pentose phosphate branch", gene: "zwf/gntZ", subsystem: "ppp",
    stoich: { G6P: -1, R5P: 1, co2: 1, NADPH: 2 }, lb: 0, ub: INF,
    description: "Glucose-6-P dehydrogenase and 6-phosphogluconate dehydrogenase lumped. The main NADPH source." },
  { id: "TKT", name: "Non-oxidative pentose phosphate branch", gene: "tkt/tal", subsystem: "ppp",
    stoich: { R5P: -3, F6P: 2, GAP: 1 }, lb: -INF, ub: INF,
    description: "Transketolase and transaldolase lumped. Reversible, so ribose-5-P can be made without the oxidative branch." },

  // ---- pyruvate node and TCA -------------------------------------------------------
  { id: "PDH", name: "Pyruvate dehydrogenase", gene: "pdhABCD", subsystem: "tca",
    stoich: { PYR: -1, ACCOA: 1, co2: 1, NADH: 1 }, lb: 0, ub: INF,
    description: "Irreversible oxidative decarboxylation. The only route from pyruvate to acetyl-CoA here." },
  { id: "PYC", name: "Pyruvate carboxylase", gene: "pycA", subsystem: "anaplerosis",
    stoich: { PYR: -1, ATP: -1, co2: -1, OAA: 1 }, lb: 0, ub: INF,
    description: "Replenishes the C4 pool drained by biosynthesis. Essential on glucose." },
  { id: "CS", name: "Citrate synthase", gene: "citZ", subsystem: "tca",
    stoich: { ACCOA: -1, OAA: -1, CIT: 1 }, lb: 0, ub: INF, description: "Irreversible condensation." },
  { id: "ICDH", name: "Aconitase and isocitrate dehydrogenase", gene: "citB/citC", subsystem: "tca",
    stoich: { CIT: -1, AKG: 1, co2: 1, NADPH: 1 }, lb: 0, ub: INF,
    description: "Lumped. B. subtilis isocitrate dehydrogenase is NADP-dependent, so this is a second NADPH source." },
  { id: "AKGD", name: "2-Oxoglutarate dehydrogenase and succinyl-CoA synthetase", gene: "odhAB/sucCD",
    subsystem: "tca", stoich: { AKG: -1, SUC: 1, co2: 1, NADH: 1, ATP: 1 }, lb: 0, ub: INF,
    description: "Lumped. A net source of ATP and NADH, which is why deleting it costs product capacity in this model." },
  { id: "SDH", name: "Succinate dehydrogenase and fumarase", gene: "sdhCAB", subsystem: "tca",
    stoich: { SUC: -1, MAL: 1, QH2: 1 }, lb: 0, ub: INF,
    description: "Reduces the quinone pool directly rather than NAD, so its electrons yield less ATP." },
  { id: "MDH", name: "Malate dehydrogenase", gene: "citH", subsystem: "tca",
    stoich: { MAL: -1, OAA: 1, NADH: 1 }, lb: -INF, ub: INF,
    description: "Near equilibrium and reversible. Running it toward malate is how the cell reaches malic enzyme." },
  { id: "ME", name: "Malic enzyme", gene: "malE/ytsJ", subsystem: "anaplerosis",
    stoich: { MAL: -1, PYR: 1, co2: 1, NADPH: 1 }, lb: 0, ub: INF,
    description: "Decarboxylating exit from the C4 pool and a third NADPH source." },

  // ---- nitrogen and products -------------------------------------------------------
  { id: "GOGAT", name: "Glutamine synthetase and glutamate synthase", gene: "glnA/gltAB",
    subsystem: "nitrogen", stoich: { AKG: -1, nh3: -1, ATP: -1, NADPH: -1, GLU: 1 }, lb: 0, ub: INF,
    description: "The only anabolic route to glutamate in B. subtilis. Every biomass and product nitrogen passes through it." },
  { id: "PGS", name: "gamma-PGA synthetase", gene: "capBCA", subsystem: "pga",
    stoich: { GLU: -1, ATP: -2, pga: 1 }, lb: 0, ub: INF,
    description: "Two ATP equivalents per residue, since the ligase reaction releases AMP and pyrophosphate." },
  { id: "CAS", name: "Carbonic anhydrase expression", gene: "yvdA", subsystem: "micp",
    stoich: { GLU: -CA_RESIDUES, ATP: -ATP_PER_RESIDUE * CA_RESIDUES, ca: 1 }, lb: 0, ub: INF,
    description: "Polypeptide synthesis charged per residue, with glutamate standing in for the amino acid pool. This is what makes enzyme expression compete with polymer production for the same nitrogen." },

  // ---- energy ----------------------------------------------------------------------
  { id: "RESP", name: "NADH respiration", gene: "ndh/qoxABCD", subsystem: "energy",
    stoich: { NADH: -1, o2: -0.5, ATP: cval(FBA_CALIB.poNadh) }, lb: 0, ub: INF,
    description: "Type-II NADH dehydrogenase does not pump protons, so the phosphorylation ratio is lower than in organisms with a proton-pumping complex I." },
  { id: "RESPQ", name: "Quinol respiration", gene: "qcrABC/ctaCDEF", subsystem: "energy",
    stoich: { QH2: -1, o2: -0.5, ATP: cval(FBA_CALIB.poQuinol) }, lb: 0, ub: INF,
    description: "Electrons entering at the quinone pool skip one coupling site." },
  { id: "ATPM", name: "Non-growth ATP maintenance", subsystem: "energy", stoich: { ATP: -1 },
    lb: cval(FBA_CALIB.atpMaintenance), ub: INF,
    description: "Lower bound is the measured maintenance demand, which the cell must meet before any growth." },

  // ---- overflow --------------------------------------------------------------------
  { id: "OVF", name: "Acetate overflow", gene: "pta/ackA", subsystem: "overflow",
    stoich: { ACCOA: -1, ac: 1, ATP: 1 }, lb: 0, ub: INF,
    description: "Phosphotransacetylase and acetate kinase. Recovers one ATP while discarding two carbons." },
  { id: "LDH", name: "Lactate dehydrogenase", gene: "ldh", subsystem: "overflow",
    stoich: { PYR: -1, NADH: -1, lac: 1 }, lb: 0, ub: INF,
    description: "Regenerates NAD when respiration cannot. Carries flux only under oxygen limitation." },

  // ---- biomass ---------------------------------------------------------------------
  { id: "BIO", name: "Biomass assembly", subsystem: "biomass", stoich: BIOMASS.stoich, lb: 0, ub: INF,
    description: "Composition-derived precursor draw. Coefficients come from deriveBiomassEquation, not from a literal table." },
];

/** Full catalogue with generated formulas, independent of any bound overrides. */
export const CORE_REACTIONS: CoreReactionMeta[] = RAW_REACTIONS.map((r) => ({
  id: r.id,
  stoich: r.stoich,
  lb: r.lb,
  ub: r.ub,
  name: r.name,
  gene: r.gene,
  subsystem: r.subsystem,
  reversible: r.lb < 0,
  formula: formulaOf(r.stoich, r.lb < 0),
  description: r.description,
}));

export function buildCoreNetwork(opts?: {
  glucoseUb?: number;
  o2Ub?: number;
  knockouts?: string[];
}): {
  network: MetabolicNetwork;
  reactions: CoreReactionMeta[];
} {
  const glcUb = opts?.glucoseUb ?? cval(FBA_CALIB.vGlcMax);
  const o2Ub = opts?.o2Ub ?? cval(FBA_CALIB.vO2Max);
  const ngam = cval(FBA_CALIB.atpMaintenance);
  const ko = new Set(opts?.knockouts ?? []);

  const reactions: CoreReactionMeta[] = CORE_REACTIONS.map((r) => {
    let { lb, ub } = r;
    if (r.id === "EX_GLC") ub = glcUb;
    if (r.id === "EX_O2") ub = o2Ub;
    if (r.id === "ATPM") lb = ngam;
    if (ko.has(r.id)) {
      lb = 0;
      ub = 0;
    }
    return { ...r, lb, ub };
  });

  return { network: { metabolites: CORE_METABOLITES, reactions }, reactions };
}

// --------------------------------------------------------------------------------------
// Objectives
// --------------------------------------------------------------------------------------

export const OBJ_GROWTH = "EX_BIOM";
export const OBJ_PGA = "EX_PGA";
/** Prong 2 objective, maximise carbonic anhydrase titre. */
export const OBJ_CA = "EX_CA";

// --------------------------------------------------------------------------------------
// Knockouts
// --------------------------------------------------------------------------------------

export type KnockoutClass =
  | "lethal"
  | "conditional"
  | "mild"
  | "silent"
  | "abolishes-product";

export interface KnockoutSpec {
  id: string;
  gene: string;
  label: string;
  class: KnockoutClass;
  /** The condition under which this deletion changes anything at all. */
  condition: string;
  /** What this model predicts, with the numbers validate_models.py asserts. */
  prediction: string;
}

/**
 * Every entry states the condition under which it has an effect, because several of these
 * deletions are silent at the default bounds and only bite when a bound moves. A knockout
 * list that reports a phenotype without naming its condition is not a useful lever.
 */
export const KNOCKOUTS: KnockoutSpec[] = [
  {
    id: "PYC",
    gene: "pycA",
    label: "dpycA (anaplerosis)",
    class: "lethal",
    condition: "any growth on glucose",
    prediction:
      "No growth. Pyruvate carboxylase is the only route into the C4 pool on glucose, and biomass needs 1.95 mmol oxaloacetate per gDCW.",
  },
  {
    id: "PDH",
    gene: "pdhABCD",
    label: "dpdhABCD (pyruvate dehydrogenase)",
    class: "lethal",
    condition: "any growth on glucose",
    prediction:
      "No growth. The only acetyl-CoA source is cut, which removes both lipid synthesis and all TCA-cycle carbon.",
  },
  {
    id: "RESP",
    gene: "ndh/qoxABCD",
    label: "dRESP (NADH respiration)",
    class: "conditional",
    condition: "aerobic; forces fermentative metabolism",
    prediction:
      "Growth falls to 16% of wild type. Carbon is forced into lactate and acetate, which is the clearest demonstration of overflow in the model.",
  },
  {
    id: "OVF",
    gene: "pta/ackA",
    label: "dpta/ackA (acetate overflow)",
    class: "conditional",
    condition: "carbon excess only, uptake above about 9 mmol per gDCW per hour",
    prediction:
      "Silent at the default feed because no acetate is made there. At an uptake of 15 it costs 10% of growth.",
  },
  {
    id: "LDH",
    gene: "ldh",
    label: "dldh (lactate sink)",
    class: "conditional",
    condition: "oxygen limitation only",
    prediction:
      "Silent while oxygen is sufficient. At an oxygen bound of 6 it costs 22% of growth, because NAD can no longer be regenerated without respiration.",
  },
  {
    id: "ZWF",
    gene: "zwf",
    label: "dzwf (oxidative pentose phosphate)",
    class: "mild",
    condition: "always, but small",
    prediction:
      "Growth retained at 96%. NADPH shifts to isocitrate dehydrogenase and malic enzyme, and ribose-5-phosphate is made by running transketolase backwards.",
  },
  {
    id: "TKT",
    gene: "tkt/tal",
    label: "dtkt/tal (non-oxidative pentose phosphate)",
    class: "mild",
    condition: "always, but small",
    prediction:
      "Growth retained at 97%. The oxidative branch must then supply all ribose-5-phosphate, which wastes carbon as CO2.",
  },
  {
    id: "AKGD",
    gene: "odhAB",
    label: "dodhAB (2-oxoglutarate dehydrogenase)",
    class: "mild",
    condition: "always",
    prediction:
      "Growth retained at 74%, and attainable PGA at matched growth falls to 55% of wild type. This model predicts the deletion HURTS product capacity, because the reaction is a net source of ATP and NADH. The titre increase reported in the literature is a regulatory effect on glutamate pool size and enzyme saturation, which a steady-state stoichiometric model cannot represent.",
  },
  {
    id: "ME",
    gene: "malE/ytsJ",
    label: "dmalE/ytsJ (malic enzyme)",
    class: "silent",
    condition: "no effect at any bound tested",
    prediction:
      "No change. Its NADPH and its C3 output are both available by other routes on glucose.",
  },
  {
    id: "PCK",
    gene: "pckA",
    label: "dpckA (PEP carboxykinase)",
    class: "silent",
    condition: "gluconeogenic substrates only",
    prediction:
      "No change on glucose, where flux runs the other way. Include it to show that a knockout can be genuinely neutral.",
  },
  {
    id: "PGS",
    gene: "capBCA",
    label: "dcapBCA (PGA synthetase)",
    class: "abolishes-product",
    condition: "always",
    prediction:
      "Growth unchanged, PGA falls to zero. The negative control that confirms the synthetase is the only polymer route.",
  },
];
