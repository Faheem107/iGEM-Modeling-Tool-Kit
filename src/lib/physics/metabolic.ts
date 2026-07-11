/**
 * Approach 1 — Metabolic Kinetics & Gene-Overexpression Optimization
 * =================================================================
 * Deterministic intracellular ODE model of γ-PGA production, integrated with RK4.
 *
 * Theory (modeling_subteam_theory.md):
 *   Eq 1  d[M]/dt = α_m·[DNA] − β_m·[M]                       (DNA normalized to 1)
 *   Eq 2  d[E]/dt = α_e·[M]   − β_e·[E]
 *   Eq 3  d[P]/dt = k_cat·[E]·[S]/(K_m+[S]) − k_deg·[P]
 *
 * Degradation-pathway knockouts (Δggt, ΔpgcA) drive k_deg → 0, maximizing cumulative yield.
 * The precursor [S] can be supplied directly OR derived from the FBA optimum (fbaPrecursorToConc).
 */

import { FBA_CALIB, cval } from "./constants";

export interface MetabolicParams {
  alpha_m: number; // transcription rate [h⁻¹]
  beta_m: number; // mRNA degradation [h⁻¹]
  alpha_e: number; // translation rate [h⁻¹]
  beta_e: number; // enzyme degradation [h⁻¹]
  k_cat: number; // PGA synthase turnover [h⁻¹]
  s_precursor: number; // intracellular L-glutamate [S] [mM]
  k_m: number; // Michaelis constant K_m [mM]
  k_deg: number; // baseline PGA degradation [h⁻¹]
  ggtKnockout: boolean;
  pgcAKnockout: boolean;
}

export interface SimulationStep {
  time: number;
  mRNA: number;
  enzyme: number;
  pga: number;
}

export interface MetabolicSolveOptions {
  finalTime?: number; // h, default 48
  dt?: number; // h, default 0.25
}

/**
 * Effective PGA degradation after degradation-pathway knockouts.
 *   Δggt   → 90% reduction (dominant γ-glutamyltransferase removal)
 *   ΔpgcA  → further 80% reduction
 *   both   → k_deg = 0 (theory: "setting the biopolymer degradation rate constant to zero")
 */
export function effectiveKdeg(p: MetabolicParams): number {
  if (p.ggtKnockout && p.pgcAKnockout) return 0;
  let k = p.k_deg;
  if (p.ggtKnockout) k *= 0.1;
  if (p.pgcAKnockout) k *= 0.2;
  return k;
}

/** Right-hand side of the coupled ODE system. */
function derivatives(
  p: MetabolicParams,
  kDeg: number,
  m: number,
  e: number,
  pga: number,
): [number, number, number] {
  const dm = p.alpha_m * 1.0 - p.beta_m * m;
  const de = p.alpha_e * m - p.beta_e * e;
  const dp =
    (p.k_cat * e * p.s_precursor) / (p.k_m + p.s_precursor) - kDeg * pga;
  return [dm, de, dp];
}

/** Integrate the system with classic 4th-order Runge–Kutta. */
export function simulateMetabolicODE(
  p: MetabolicParams,
  opts: MetabolicSolveOptions = {},
): SimulationStep[] {
  const finalTime = opts.finalTime ?? 48;
  const dt = opts.dt ?? 0.25;
  const steps = Math.round(finalTime / dt);
  const kDeg = effectiveKdeg(p);

  const data: SimulationStep[] = [];
  let m = 0,
    e = 0,
    pga = 0;

  for (let i = 0; i <= steps; i++) {
    data.push({ time: i * dt, mRNA: m, enzyme: e, pga });

    const [dm1, de1, dp1] = derivatives(p, kDeg, m, e, pga);
    const [dm2, de2, dp2] = derivatives(
      p,
      kDeg,
      m + 0.5 * dt * dm1,
      e + 0.5 * dt * de1,
      pga + 0.5 * dt * dp1,
    );
    const [dm3, de3, dp3] = derivatives(
      p,
      kDeg,
      m + 0.5 * dt * dm2,
      e + 0.5 * dt * de2,
      pga + 0.5 * dt * dp2,
    );
    const [dm4, de4, dp4] = derivatives(
      p,
      kDeg,
      m + dt * dm3,
      e + dt * de3,
      pga + dt * dp3,
    );

    m += (dt / 6) * (dm1 + 2 * dm2 + 2 * dm3 + dm4);
    e += (dt / 6) * (de1 + 2 * de2 + 2 * de3 + de4);
    pga += (dt / 6) * (dp1 + 2 * dp2 + 2 * dp3 + dp4);
  }
  return data;
}

/** Final accumulated γ-PGA at the end of a run. */
export function finalYield(
  p: MetabolicParams,
  opts?: MetabolicSolveOptions,
): number {
  const series = simulateMetabolicODE(p, opts);
  return series[series.length - 1]?.pga ?? 0;
}

/**
 * Closed-form steady state (when k_deg > 0):
 *   M* = α_m/β_m ,  E* = α_e·M* / β_e ,  P* = k_cat·E*·[S] / ((K_m+[S])·k_deg)
 * With both knockouts (k_deg = 0) accumulation is unbounded → return null for P*.
 */
export function steadyState(p: MetabolicParams): {
  mRNA: number;
  enzyme: number;
  pga: number | null;
} {
  const mSS = p.alpha_m / p.beta_m;
  const eSS = (p.alpha_e * mSS) / p.beta_e;
  const kDeg = effectiveKdeg(p);
  const synth = (p.k_cat * eSS * p.s_precursor) / (p.k_m + p.s_precursor);
  return { mRNA: mSS, enzyme: eSS, pga: kDeg > 0 ? synth / kDeg : null };
}

/**
 * Wet-lab calibration: solve for the k_cat that reproduces a measured spectrophotometric
 * yield. Accumulation under knockouts is ~linear in k_cat, so k_cat' = k_cat·(target/current).
 */
export function calibrateKcat(
  p: MetabolicParams,
  targetYield: number,
  opts?: MetabolicSolveOptions,
): number {
  const current = finalYield(p, opts);
  if (current <= 0) return p.k_cat;
  return p.k_cat * (targetYield / current);
}

/**
 * Local sensitivity of final yield to each rate parameter (normalized elasticity
 *   Sᵢ = (∂Y/∂θᵢ)·(θᵢ/Y) via central differences). Identifies the rate-limiting step.
 */
export function yieldSensitivity(
  p: MetabolicParams,
  opts?: MetabolicSolveOptions,
): Record<string, number> {
  const base = finalYield(p, opts);
  const keys: (keyof MetabolicParams)[] = [
    "alpha_m",
    "beta_m",
    "alpha_e",
    "beta_e",
    "k_cat",
    "s_precursor",
    "k_m",
  ];
  const out: Record<string, number> = {};
  if (base <= 0) {
    keys.forEach((k) => (out[k] = 0));
    return out;
  }
  for (const k of keys) {
    const theta = p[k] as number;
    if (theta === 0) {
      out[k] = 0;
      continue;
    }
    const h = Math.abs(theta) * 0.02 || 1e-4;
    const yPlus = finalYield({ ...p, [k]: theta + h }, opts);
    const yMinus = finalYield({ ...p, [k]: Math.max(0, theta - h) }, opts);
    out[k] = ((yPlus - yMinus) / (2 * h)) * (theta / base);
  }
  return out;
}

/**
 * Couple the FBA optimum to the ODE: convert steady-state precursor flux
 * v_glu [mmol·gDCW⁻¹·h⁻¹] into intracellular [S] [mM] via a labeled lumped factor.
 */
export const fbaPrecursorToConc = (vGlu: number): number =>
  Math.max(0, vGlu) * cval(FBA_CALIB.fluxToConc);
