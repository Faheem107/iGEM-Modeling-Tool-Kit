/**
 * Biocontainment Kill Switch, MazE/MazF toxin–antitoxin dynamics
 * ==============================================================
 * The third element of the reframed project (it replaced the applied-alginate prong): a
 * genetically-encoded control layer for the two engineered B. subtilis prongs. Three coupled
 * analyses, each a pure function so the UI and any tests compute the SAME numbers.
 *
 * Grounded in the team's reframe research (project reframe/*.md) and the primary literature
 * cited there:
 *   • Type II TA circuit: stable MazF endoribonuclease (toxin, cleaves mRNA at ACA sites →
 *     translation arrest → death) neutralised by the labile MazE antitoxin. Kamada et al. 2003
 *     (E. coli MazEF complex, PDB 1UB4); B. subtilis EndoA/MazF (PDB 4MDX with RNA, 4ME7 with
 *     cognate MazE).
 *   • Cognate specificity ("lock and key"): an antitoxin only neutralises its OWN species' toxin
 *, Yamaguchi et al. 2011, Annu. Rev. Genet. This is why E. coli MazF on the plasmid kills a
 *     wild recipient that lacks E. coli MazE.
 *   • aTc-inducible over-expression of an extra mazF copy tips the toxin:antitoxin balance on
 *     demand; plasmid dilution (~20 generations) removes plasmid-borne antitoxin and self-limits.
 *   • Spore escape: MazF needs active translation, so it CANNOT kill dormant spores. Germination
 *     must wake them first, but a superdormant fraction with very low germinant-receptor levels
 *     resists a single germinant (Ghosh et al. 2012). gerB* over-expression + multiple germinants
 *     raise germination completeness before the kill switch is applied.
 *
 * Units are normalised (nondimensional) unless noted; the point is the qualitative dynamics and
 * relative comparisons (time-to-kill, log-reduction, containment probability), not absolute molar
 * concentrations, the team has no wet-lab TA measurements yet, so nothing here is presented as a
 * measured value.
 */

// ===========================================================================================
// 1) TOXIN–ANTITOXIN ODE + POPULATION VIABILITY
// ===========================================================================================

export interface KillSwitchParams {
  /** aTc inducer concentration [ng/mL] driving the Tet-promoter extra mazF copy. */
  atc: number;
  /** Tet-promoter Hill Kd for aTc [ng/mL]. */
  atcKd: number;
  /** Basal leak of the Tet promoter (fraction of full induction with no aTc). */
  tetLeak: number;
  /** Constitutive toxin production (chromosomal mazF) [1/h]. */
  sigmaTconst: number;
  /** Max inducible toxin production from the aTc copy [1/h]. */
  sigmaTmax: number;
  /** Constitutive (chromosomal) antitoxin production [1/h]. */
  sigmaAconst: number;
  /** Plasmid-borne antitoxin production at full plasmid copy [1/h]. */
  sigmaAplasmid: number;
  /** Antitoxin degradation (labile, Lon/Clp proteases) [1/h]. */
  deltaA: number;
  /** Free-toxin degradation (stable) [1/h]. */
  deltaT: number;
  /** Complex turnover [1/h], the sequestered toxin's slow removal route (keeps the antitoxin
   *  genuinely protective at steady state rather than merely buffering it). */
  deltaC: number;
  /** MazE·MazF association rate. */
  kOn: number;
  /** Complex dissociation rate. */
  kOff: number;
  /** Free-toxin level at half-max growth inhibition. */
  toxK: number;
  /** Hill coefficient of toxin action. */
  toxN: number;
  /** Max specific growth rate [1/h]. */
  muMax: number;
  /** Max specific death rate when the toxin fully dominates [1/h]. */
  deathMax: number;
  /** Mean cell generation time [h] (B. subtilis 0.5–1.2 h; reframe cites 30–73 min). */
  genTime: number;
  /** Plasmid loss probability per generation (segregational instability → dilution). */
  plasmidLossPerGen: number;
  /** Whether the aTc trigger is actually applied during the run. */
  induce: boolean;
  /** Time [h] at which aTc is added (if induce). */
  induceAt: number;
}

export const DEFAULT_KILLSWITCH: KillSwitchParams = {
  atc: 100,
  atcKd: 20,
  tetLeak: 0.02,
  sigmaTconst: 0.3,
  sigmaTmax: 6.0,
  sigmaAconst: 0.4,
  sigmaAplasmid: 3.0,
  deltaA: 1.0,
  deltaT: 0.25,
  deltaC: 0.1,
  kOn: 2.0,
  kOff: 1.0,
  toxK: 1.0,
  toxN: 3,
  muMax: 0.9,
  deathMax: 1.6,
  genTime: 0.75,
  plasmidLossPerGen: 0.1,
  induce: true,
  induceAt: 6,
};

export interface KillSwitchStep {
  time: number; // h
  antitoxin: number; // free MazE
  toxin: number; // free MazF
  complex: number; // MazE·MazF
  plasmid: number; // mean plasmid copy fraction (1 → 0)
  logViability: number; // log10(N/N0)
  growthRate: number; // net specific rate [1/h]
}

/** Tet-promoter output (0..1) for the aTc-inducible extra mazF copy. */
export function tetOutput(p: KillSwitchParams, atcNow: number): number {
  const h = 2;
  const hill = Math.pow(atcNow, h) / (Math.pow(p.atcKd, h) + Math.pow(atcNow, h));
  return p.tetLeak + (1 - p.tetLeak) * hill;
}

/** Mean plasmid copy fraction after time t: exponential dilution set by loss-per-generation. */
export function plasmidCopy(p: KillSwitchParams, t: number): number {
  const generations = t / Math.max(1e-6, p.genTime);
  return Math.pow(1 - p.plasmidLossPerGen, generations);
}

/** Net specific growth rate given free toxin: growth at low T, death at high T (Hill switch). */
export function netGrowthRate(p: KillSwitchParams, toxin: number): number {
  const t = Number.isFinite(toxin) ? Math.max(0, toxin) : 1e9;
  const x = Math.pow(t, p.toxN);
  const kn = Math.pow(p.toxK, p.toxN);
  const frac = x >= 1e300 ? 1 : x / (kn + x); // 0 (safe) → 1 (toxin dominates)
  return p.muMax * (1 - frac) - p.deathMax * frac;
}

interface State {
  A: number;
  T: number;
  C: number;
  logN: number;
}

function derivs(p: KillSwitchParams, s: State, t: number): State {
  const atcNow = p.induce && t >= p.induceAt ? p.atc : 0;
  const pl = plasmidCopy(p, t);
  const sigmaT = p.sigmaTconst + p.sigmaTmax * tetOutput(p, atcNow);
  const sigmaA = p.sigmaAconst + p.sigmaAplasmid * pl;

  const bind = p.kOn * s.A * s.T;
  const unbind = p.kOff * s.C;
  // Antitoxin is protective because sequestered toxin leaves via the (slow) complex turnover δ_C,
  // not by being released back into the free pool. When antitoxin production can't keep the toxin
  // sequestered (aTc spike, or plasmid dilution starving σ_A), free toxin rises and the cell dies.
  const dA = sigmaA - p.deltaA * s.A - bind + unbind;
  const dT = sigmaT - p.deltaT * s.T - bind + unbind;
  const dC = bind - unbind - p.deltaC * s.C;
  const mu = netGrowthRate(p, s.T);
  const dLogN = mu / Math.LN10; // d/dt log10(N) = (μ/ln10)
  return { A: dA, T: dT, C: dC, logN: dLogN };
}

/** Integrate the TA system + population with classic RK4. */
export function simulateKillSwitch(
  p: KillSwitchParams,
  opts: { finalTime?: number; dt?: number } = {},
): KillSwitchStep[] {
  const finalTime = opts.finalTime ?? 48;
  const dt = opts.dt ?? 0.02;
  const steps = Math.round(finalTime / dt);
  const clamp = (v: number) => (Number.isFinite(v) ? Math.min(1e6, Math.max(0, v)) : 0);

  // Start near the pre-induction steady state so the "before trigger" phase is flat.
  let s: State = { A: 3.0, T: 0.1, C: 2.0, logN: 0 };
  const add = (a: State, b: State, f: number): State => ({
    A: a.A + f * b.A,
    T: a.T + f * b.T,
    C: a.C + f * b.C,
    logN: a.logN + f * b.logN,
  });
  const out: KillSwitchStep[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i * dt;
    out.push({
      time: t,
      antitoxin: Math.max(0, s.A),
      toxin: Math.max(0, s.T),
      complex: Math.max(0, s.C),
      plasmid: plasmidCopy(p, t),
      logViability: s.logN,
      growthRate: netGrowthRate(p, s.T),
    });
    const k1 = derivs(p, s, t);
    const k2 = derivs(p, add(s, k1, dt / 2), t + dt / 2);
    const k3 = derivs(p, add(s, k2, dt / 2), t + dt / 2);
    const k4 = derivs(p, add(s, k3, dt), t + dt);
    const nextLog = s.logN + (dt / 6) * (k1.logN + 2 * k2.logN + 2 * k3.logN + k4.logN);
    s = {
      A: clamp(s.A + (dt / 6) * (k1.A + 2 * k2.A + 2 * k3.A + k4.A)),
      T: clamp(s.T + (dt / 6) * (k1.T + 2 * k2.T + 2 * k3.T + k4.T)),
      C: clamp(s.C + (dt / 6) * (k1.C + 2 * k2.C + 2 * k3.C + k4.C)),
      // Viability floors at −12 logs (below any assay's detection) to keep the axis sane.
      logN: Number.isFinite(nextLog) ? Math.max(-12, nextLog) : -12,
    };
  }
  return out;
}

/** Time [h] to reach an X-log reduction in viable cells (null if never within the run). */
export function timeToLogKill(series: KillSwitchStep[], logs = 3): number | null {
  const target = -Math.abs(logs);
  for (const step of series) if (step.logViability <= target) return step.time;
  return null;
}

// ===========================================================================================
// 2) HORIZONTAL-GENE-TRANSFER CONTAINMENT (E. coli MazEF split, Problem 2)
// ===========================================================================================

export interface HgtParams {
  /** Per-exposure probability a wild recipient acquires the plasmid by HGT. */
  hgtFrequency: number;
  /** Coupling: fraction of recipients that can express the payload (and therefore mazF, since
   *  mazF sits in the SAME transcriptional unit as the biofilm genes). */
  payloadExpression: number;
  /** Per-event probability the recipient ALSO acquires the chromosomal E. coli mazE by
   *  transformation/chromosome fragmentation (rare relative to plasmid transfer). */
  chromFragFreq: number;
  /** Fraction of the recipient community that is E. coli-like (carries a cognate MazE and could
   *  neutralise the transferred E. coli MazF, the reframe's noted failure mode). */
  cognateRecipients: number;
  /** Split the antitoxin across two distant loci → both halves needed to rescue. */
  splitAntitoxin: boolean;
  /** Rare-codon-optimise mazE so most recipients cannot translate it even if acquired. */
  codonOptimise: boolean;
}

export const DEFAULT_HGT: HgtParams = {
  hgtFrequency: 1e-4,
  payloadExpression: 0.9,
  chromFragFreq: 0.15,
  cognateRecipients: 0.02,
  splitAntitoxin: true,
  codonOptimise: true,
};

export interface HgtResult {
  /** P(a recipient that acquired the plasmid self-eliminates). */
  containmentEfficiency: number;
  /** P(a recipient that acquired the plasmid escapes, survives with the genes). */
  escapeProbability: number;
  /** Absolute escape rate per exposure = hgtFrequency × escapeProbability. */
  escapePerExposure: number;
  /** Breakdown of the ways a recipient can escape (for the UI). */
  routes: { label: string; probability: number }[];
}

/**
 * A recipient escapes containment only if it EITHER
 *   (a) cannot/does not express the toxin at all (then it also gained no functional payload, *       contained by irrelevance, but counted here as "not killed"), OR
 *   (b) expresses the toxin but is rescued: it acquires a FUNCTIONAL cognate E. coli MazE.
 * Rescue requires acquiring the chromosomal mazE (chromFragFreq), both halves if split, and being
 * able to translate it (defeated by codon optimisation), OR simply being an E. coli-like organism
 * that already carries cognate MazE.
 */
export function evaluateHgtContainment(p: HgtParams): HgtResult {
  const half = p.splitAntitoxin ? p.chromFragFreq : 1; // second-half acquisition if split
  const acquireMazE = p.chromFragFreq * half; // both fragments if split
  const translatable = p.codonOptimise ? 0.05 : 1; // rare codons → poor translation elsewhere
  const rescuedByAcquisition = acquireMazE * translatable;

  const expresses = p.payloadExpression;
  const notExpressing = 1 - expresses; // route (a): no toxin made → not killed

  // Among toxin-expressing recipients: rescued if cognate-carrier OR acquires functional mazE.
  const rescued =
    p.cognateRecipients + (1 - p.cognateRecipients) * rescuedByAcquisition;
  const killedGivenExpress = 1 - rescued;

  const containmentEfficiency = expresses * killedGivenExpress;
  const escapeProbability = 1 - containmentEfficiency;

  return {
    containmentEfficiency,
    escapeProbability,
    escapePerExposure: p.hgtFrequency * escapeProbability,
    routes: [
      {
        label: "Cognate-carrier recipient (e.g. E. coli) neutralises MazF",
        probability: expresses * p.cognateRecipients,
      },
      {
        label: "Acquires + translates a functional E. coli MazE",
        probability:
          expresses * (1 - p.cognateRecipients) * rescuedByAcquisition,
      },
      {
        label: "Never expresses the toxin (nor a functional payload)",
        probability: notExpressing,
      },
    ],
  };
}

// ===========================================================================================
// 3) SPORE SUPERDORMANCY, germinate-then-kill over successive rounds
// ===========================================================================================

export interface SporeParams {
  /** Base fraction of dormant spores a SINGLE germinant wakes per round. */
  baseGerminationPerRound: number;
  /** Over-express the mutant germinant receptor gerB* → lowers the germination threshold. */
  gerBstar: boolean;
  /** Number of DISTINCT germinants co-applied (L-Ala, AGFK, …), each hits a different GR set. */
  distinctGerminants: number;
  /** Superdormant floor: fraction of spores with GR levels so low essentially none wake
   *  (Ghosh et al. 2012, superdormancy from very low germinant-receptor content). */
  superdormantFloor: number;
  /** Fraction of woken cells that re-sporulate before the kill switch clears them (nutrient
   *  run-out in the desert → new dormant spores). */
  resporulation: number;
  /** Kill efficiency on vegetative cells once germinated (MazF works only on active cells). */
  vegetativeKill: number;
  /** Number of germination→kill rounds applied. */
  rounds: number;
}

export const DEFAULT_SPORE: SporeParams = {
  baseGerminationPerRound: 0.55,
  gerBstar: true,
  distinctGerminants: 2,
  superdormantFloor: 0.002,
  resporulation: 0.08,
  vegetativeKill: 0.999,
  rounds: 4,
};

export interface SporeRound {
  round: number;
  viableSpores: number; // fraction of the ORIGINAL viable spore load remaining
  logReduction: number; // −log10(remaining)
}

/** Per-round germination completeness, combining gerB*, multiple germinants, and the floor. */
export function germinationFraction(p: SporeParams): number {
  const boost = p.gerBstar ? 1.35 : 1.0; // gerB* lowers threshold → more spores respond
  const single = Math.min(0.98, p.baseGerminationPerRound * boost);
  // Each distinct germinant independently recruits a fraction of the still-dormant pool.
  const combined = 1 - Math.pow(1 - single, Math.max(1, p.distinctGerminants));
  return combined;
}

/**
 * Iterate germinate → kill → (re-sporulate). Each round: the responsive pool germinates and is
 * killed (× vegetativeKill), a small fraction re-sporulates back into the dormant pool, and the
 * superdormant floor never wakes, so viability approaches an asymptotic floor rather than zero.
 */
export function simulateSporeClearance(p: SporeParams): SporeRound[] {
  const g = germinationFraction(p);
  const out: SporeRound[] = [{ round: 0, viableSpores: 1, logReduction: 0 }];
  let dormant = 1.0;
  const floor = Math.max(0, Math.min(1, p.superdormantFloor));

  for (let r = 1; r <= p.rounds; r++) {
    const responsive = Math.max(0, dormant - floor);
    const germinated = responsive * g;
    const survivingVeg = germinated * (1 - p.vegetativeKill);
    const newSpores = survivingVeg * p.resporulation;
    // Remaining dormant = never-germinated responsive + permanent floor + re-sporulated cells.
    dormant = (responsive - germinated) + floor + newSpores;
    const viable = Math.max(1e-12, dormant);
    out.push({
      round: r,
      viableSpores: viable,
      logReduction: -Math.log10(viable),
    });
  }
  return out;
}

/** Convenience: overall log-reduction of viable spores after all rounds. */
export function sporeLogReduction(p: SporeParams): number {
  const series = simulateSporeClearance(p);
  return series[series.length - 1]?.logReduction ?? 0;
}
