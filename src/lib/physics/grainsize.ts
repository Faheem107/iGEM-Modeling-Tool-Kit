/**
 * Grain-Size-Resolved Crust Performance (Prong-coverage across the UAE sand distribution)
 * =======================================================================================
 * The single biggest thing a uniform-cohesion model misses: sand is not one grain size, and no
 * single binder works at every grain size. Grounded in the NYUAD Research Table (Study 4) and the
 * UAE dune-sand PSD:
 *
 *   • MICP / CaCO₃ (Prong 2) cements best at ~63–125 µm (UCS ≈ 3.1 MPa) and falls off for coarse
 *     sand (pores too large for calcite bridging) and ultra-fine sand (too low-permeability for
 *     bacteria to colonise). Modelled as a log-Gaussian in grain diameter × a fine-side
 *     permeability (penetration) roll-off.
 *   • γ-PGA (Prong 1) is a water-binding gel that bridges fine/medium grain contacts but cannot
 *     span coarse-sand pores, a decreasing logistic in diameter.
 *   • Alginate (Prong 3) coats grains and seeds nucleation "regardless of grain size" and partially
 *     fills the large pores MICP misses, a broad floor with a coarse-end boost.
 *
 * A grain of diameter d is "held" if AT LEAST ONE active mechanism binds it, so per-grain coverage
 * is the probabilistic union  1 − Π(1 − eₚ(d))  (the same redundancy idiom as the robustness
 * matrix). Integrating that union over the site's log-normal grain-size distribution yields the
 * effective bound mass fraction, the quantitative statement of the three-prong "cover all sizes"
 * thesis, and a genuine multi-prong interaction (each prong closes another's grain-size gap).
 */

import { GRAINSIZE_CALIB, cval } from "./constants";
import type { ProngId } from "./composite";

const logistic = (x: number) => 1 / (1 + Math.exp(-x));

/**
 * MICP (CaCO₃) cementation efficiency at grain diameter d [µm], 0–1 relative to the peak.
 * Log-Gaussian sweet spot × fine-side permeability roll-off (bacteria cannot penetrate very fine,
 * low-permeability sand).
 */
export function micpEfficiency(diameterUm: number): number {
  const d = Math.max(1, diameterUm);
  const dPeak = cval(GRAINSIZE_CALIB.micpPeakDiameter);
  const sigma = cval(GRAINSIZE_CALIB.micpLogWidth);
  const z = Math.log(d / dPeak) / sigma;
  const sweetSpot = Math.exp(-0.5 * z * z);
  // Fine-side penetration: colonisation fails below the low-permeability threshold.
  const dPen = cval(GRAINSIZE_CALIB.micpPenetrationD50);
  const kPen = cval(GRAINSIZE_CALIB.micpPenetrationSteep);
  const penetration = logistic(kPen * Math.log(d / dPen));
  return Math.max(0, Math.min(1, sweetSpot * penetration));
}

/** γ-PGA gel bridging effectiveness at diameter d [µm], high for fine/medium, fails at coarse. */
export function pgaCoverage(diameterUm: number): number {
  const d = Math.max(1, diameterUm);
  const dHalf = cval(GRAINSIZE_CALIB.pgaCoverHalfD);
  const k = cval(GRAINSIZE_CALIB.pgaCoverSteep);
  // Decreasing logistic in ln d: ~1 well below dHalf, → 0 well above.
  return Math.max(0, Math.min(1, 1 - logistic(k * Math.log(d / dHalf))));
}

/** Alginate surface-coating effectiveness at diameter d [µm], broad floor + coarse-pore boost. */
export function alginateCoverage(diameterUm: number): number {
  const d = Math.max(1, diameterUm);
  const floor = cval(GRAINSIZE_CALIB.alginateCoverFloor);
  const boost = cval(GRAINSIZE_CALIB.alginateCoarseBoost);
  const dHalf = cval(GRAINSIZE_CALIB.alginateCoarseHalfD);
  const coarse = logistic(2 * Math.log(d / dHalf));
  return Math.max(0, Math.min(1, floor + boost * coarse));
}

/** Per-prong binding effectiveness eₚ(d) ∈ [0,1] at grain diameter d [µm]. */
export function prongCoverage(prong: ProngId, diameterUm: number): number {
  switch (prong) {
    case 1:
      return pgaCoverage(diameterUm);
    case 2:
      return micpEfficiency(diameterUm);
    case 3:
      return alginateCoverage(diameterUm);
  }
}

/**
 * Combined per-grain coverage of a prong set = 1 − Π(1 − eₚ(d)) (a grain is held if any active
 * mechanism binds it). `yieldFactors` optionally scales each prong's effectiveness by its realised
 * yield (e.g. the inter-prong competition / burden factors), so a starved prong covers less.
 */
export function combinedCoverage(
  prongs: ProngId[],
  diameterUm: number,
  yieldFactors?: Partial<Record<ProngId, number>>,
): number {
  let miss = 1;
  for (const p of prongs) {
    const e = prongCoverage(p, diameterUm) * (yieldFactors?.[p] ?? 1);
    miss *= 1 - Math.max(0, Math.min(1, e));
  }
  return 1 - miss;
}

/** Log-normal grain-size PDF (per unit ln d) for the deployment-site sand. */
export function grainSizePdf(
  diameterUm: number,
  d50Um: number,
  sigmaG: number,
): number {
  const d = Math.max(1e-3, diameterUm);
  const lnSigma = Math.log(Math.max(1.001, sigmaG));
  const z = Math.log(d / d50Um) / lnSigma;
  return Math.exp(-0.5 * z * z) / (lnSigma * Math.sqrt(2 * Math.PI));
}

export interface GrainBand {
  /** Band centre diameter [µm]. */
  diameter: number;
  /** Relative mass fraction of the site's sand in this band (Σ = 1). */
  massFraction: number;
  /** Per-prong effectiveness at this diameter. */
  perProng: Record<ProngId, number>;
  /** Combined union coverage 0–1 at this diameter. */
  combined: number;
  /** MICP cementation efficiency 0–1 (drives local crust strength). */
  micp: number;
}

export interface GrainSizeProfile {
  bands: GrainBand[];
  /** Mass-weighted effective bound fraction of the whole deployment sand (0–1). */
  boundMassFraction: number;
  /** Mass-weighted MICP cementation efficiency (0–1). */
  micpEfficiencyMean: number;
  /** Diameter band with the WEAKEST combined coverage among appreciable-mass bands [µm]. */
  weakestDiameter: number;
  weakestCoverage: number;
  /** Site median grain size used [µm]. */
  d50: number;
}

/**
 * Resolve the crust performance across a log-normal grain-size distribution for the active prongs.
 * Sweeps a log-spaced diameter grid, weights each band by the site PSD, and reports the effective
 * bound mass fraction plus the weakest (limiting) grain band.
 */
export function grainSizeProfile(
  prongs: ProngId[],
  opts?: {
    d50Um?: number;
    sigmaG?: number;
    yieldFactors?: Partial<Record<ProngId, number>>;
    minUm?: number;
    maxUm?: number;
    bands?: number;
  },
): GrainSizeProfile {
  const d50 = opts?.d50Um ?? cval(GRAINSIZE_CALIB.uaeD50);
  const sigmaG = opts?.sigmaG ?? cval(GRAINSIZE_CALIB.uaeSizeSigma);
  const minUm = opts?.minUm ?? 20;
  const maxUm = opts?.maxUm ?? 600;
  const n = opts?.bands ?? 48;

  const lnMin = Math.log(minUm);
  const lnMax = Math.log(maxUm);
  const dLn = (lnMax - lnMin) / (n - 1);

  const bands: GrainBand[] = [];
  let pdfSum = 0;
  for (let i = 0; i < n; i++) {
    const d = Math.exp(lnMin + i * dLn);
    const w = grainSizePdf(d, d50, sigmaG); // per unit ln d → constant dLn spacing cancels on normalise
    pdfSum += w;
    const perProng = {} as Record<ProngId, number>;
    for (const p of prongs)
      perProng[p] = prongCoverage(p, d) * (opts?.yieldFactors?.[p] ?? 1);
    bands.push({
      diameter: d,
      massFraction: w, // normalised below
      perProng,
      combined: combinedCoverage(prongs, d, opts?.yieldFactors),
      micp: micpEfficiency(d),
    });
  }

  let boundMassFraction = 0;
  let micpEfficiencyMean = 0;
  let weakestDiameter = bands[0].diameter;
  let weakestCoverage = Infinity;
  for (const b of bands) {
    b.massFraction /= pdfSum;
    boundMassFraction += b.massFraction * b.combined;
    micpEfficiencyMean += b.massFraction * b.micp;
    // "limiting" band: weakest coverage among bands carrying non-trivial mass.
    if (b.massFraction > 0.5 / bands.length && b.combined < weakestCoverage) {
      weakestCoverage = b.combined;
      weakestDiameter = b.diameter;
    }
  }
  if (!isFinite(weakestCoverage)) weakestCoverage = bands[0].combined;

  return {
    bands,
    boundMassFraction,
    micpEfficiencyMean,
    weakestDiameter,
    weakestCoverage,
    d50,
  };
}
