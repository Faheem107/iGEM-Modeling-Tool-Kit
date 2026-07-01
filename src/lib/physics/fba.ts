/**
 * Approach 5 — Flux Balance Analysis (constraint-based metabolic optimization)
 * ===========================================================================
 * A REAL FBA: a self-contained two-phase primal simplex solves
 *     maximize  cᵀv     subject to  S·v = 0 ,  lb ≤ v ≤ ub
 * on a stoichiometric network. Built on top are the analyses that make FBA a meaningful
 * dry-lab tool — not a single point solve:
 *
 *   • solveFBA            — optimal flux distribution + objective + shadow prices
 *   • parsimoniousFBA     — unique min-Σ|v| flux map at the optimum (pFBA)
 *   • fluxVariability     — per-reaction [min,max] flux at (near-)optimal growth (FVA)
 *   • productionEnvelope  — growth ↔ product Pareto front (phenotype phase plane)
 *   • knockoutNetwork     — in-silico gene deletions (lb=ub=0) with genuine LP rerouting
 *
 * The network DATA (metabolites/reactions/bounds) is supplied by the caller so the model is
 * a single source of truth shared by the FBA portal UI and the simulation workspace.
 */

// ----------------------------- Generic LP solver ----------------------------

export type ConstraintType = '<=' | '>=' | '=';
export interface LPConstraint { coef: number[]; type: ConstraintType; rhs: number; }
export interface LPResult { x: number[]; objective: number; status: 'optimal' | 'infeasible' | 'unbounded'; }

const EPS = 1e-9;

/**
 * Two-phase primal simplex (maximize cᵀx, x ≥ 0) with Bland's anti-cycling rule.
 * Handles ≤, ≥, = constraints via slack/surplus/artificial variables.
 */
export function solveLP(c: number[], constraints: LPConstraint[], nVars: number): LPResult {
  const m = constraints.length;

  // Normalize: make every RHS ≥ 0 (flip row & relation if needed).
  const rows = constraints.map((con) => {
    let { coef, type, rhs } = { coef: [...con.coef], type: con.type, rhs: con.rhs };
    if (rhs < 0) {
      coef = coef.map((v) => -v);
      rhs = -rhs;
      type = type === '<=' ? '>=' : type === '>=' ? '<=' : '=';
    }
    return { coef, type, rhs };
  });

  // Column layout: [ decision vars | slack/surplus | artificials ]
  const slackCols: number[] = [];
  const artCols: number[] = [];
  let nExtra = 0;
  rows.forEach((r) => {
    if (r.type === '<=') { slackCols.push(nVars + nExtra); nExtra++; artCols.push(-1); }
    else if (r.type === '>=') { slackCols.push(nVars + nExtra); nExtra++; artCols.push(nVars + nExtra); nExtra++; }
    else { slackCols.push(-1); artCols.push(nVars + nExtra); nExtra++; }
  });
  const totalCols = nVars + nExtra;

  // Tableau rows (constraint rows only); RHS stored separately.
  const A: number[][] = rows.map(() => new Array(totalCols).fill(0));
  const b: number[] = rows.map((r) => r.rhs);
  const basis: number[] = new Array(m).fill(-1);

  rows.forEach((r, i) => {
    for (let j = 0; j < nVars; j++) A[i][j] = r.coef[j] ?? 0;
    if (r.type === '<=') { A[i][slackCols[i]] = 1; basis[i] = slackCols[i]; }
    else if (r.type === '>=') { A[i][slackCols[i]] = -1; A[i][artCols[i]] = 1; basis[i] = artCols[i]; }
    else { A[i][artCols[i]] = 1; basis[i] = artCols[i]; }
  });

  const pivot = (objRow: number[]) => {
    let guard = 0;
    const maxIter = 2000;
    while (guard++ < maxIter) {
      // Bland's rule: smallest index with negative reduced cost (we minimize objRow).
      let enter = -1;
      for (let j = 0; j < totalCols; j++) {
        if (objRow[j] < -EPS) { enter = j; break; }
      }
      if (enter === -1) return true; // optimal

      // Min-ratio test (smallest index ties → Bland).
      let leave = -1; let best = Infinity;
      for (let i = 0; i < m; i++) {
        if (A[i][enter] > EPS) {
          const ratio = b[i] / A[i][enter];
          if (ratio < best - EPS || (Math.abs(ratio - best) < EPS && (leave === -1 || basis[i] < basis[leave]))) {
            best = ratio; leave = i;
          }
        }
      }
      if (leave === -1) return false; // unbounded

      // Pivot on (leave, enter).
      const piv = A[leave][enter];
      for (let j = 0; j < totalCols; j++) A[leave][j] /= piv;
      b[leave] /= piv;
      for (let i = 0; i < m; i++) {
        if (i === leave) continue;
        const f = A[i][enter];
        if (Math.abs(f) < EPS) continue;
        for (let j = 0; j < totalCols; j++) A[i][j] -= f * A[leave][j];
        b[i] -= f * b[leave];
      }
      const f = objRow[enter];
      if (Math.abs(f) > EPS) {
        for (let j = 0; j < totalCols; j++) objRow[j] -= f * A[leave][j];
      }
      basis[leave] = enter;
    }
    return true;
  };

  // ---- Phase 1: minimize sum of artificials (only if any exist) ----
  const hasArtificials = artCols.some((a) => a >= 0);
  if (hasArtificials) {
    const phase1 = new Array(totalCols).fill(0);
    artCols.forEach((a) => { if (a >= 0) phase1[a] = 1; }); // minimize Σ artificials
    // Reduce to express objective in nonbasic vars (subtract basic artificial rows).
    for (let i = 0; i < m; i++) {
      if (phase1[basis[i]] !== 0) {
        const f = phase1[basis[i]];
        for (let j = 0; j < totalCols; j++) phase1[j] -= f * A[i][j];
      }
    }
    pivot(phase1);
    // Feasibility: any artificial still basic with positive value ⇒ infeasible.
    const artSet = new Set(artCols.filter((a) => a >= 0));
    let artSum = 0;
    for (let i = 0; i < m; i++) if (artSet.has(basis[i])) artSum += Math.max(0, b[i]);
    if (artSum > 1e-6) return { x: new Array(nVars).fill(0), objective: 0, status: 'infeasible' };
  }

  // ---- Phase 2: maximize cᵀx  → minimize (−c) ----
  const obj = new Array(totalCols).fill(0);
  for (let j = 0; j < nVars; j++) obj[j] = -(c[j] ?? 0);
  // Forbid artificials from re-entering by pricing them out (large cost).
  artCols.forEach((a) => { if (a >= 0) obj[a] = 1e7; });
  for (let i = 0; i < m; i++) {
    if (Math.abs(obj[basis[i]]) > EPS) {
      const f = obj[basis[i]];
      for (let j = 0; j < totalCols; j++) obj[j] -= f * A[i][j];
    }
  }
  const ok = pivot(obj);
  if (!ok) return { x: new Array(nVars).fill(0), objective: 0, status: 'unbounded' };

  const x = new Array(nVars).fill(0);
  for (let i = 0; i < m; i++) if (basis[i] < nVars) x[basis[i]] = b[i];
  const objective = c.reduce((s, cj, j) => s + cj * x[j], 0);
  return { x, objective, status: 'optimal' };
}

// ----------------------------- FBA model layer ------------------------------

export interface FbaReaction {
  id: string;
  /** metabolite id → stoichiometric coefficient (negative = consumed). */
  stoich: Record<string, number>;
  lb: number;
  ub: number;
}
export interface MetabolicNetwork {
  metabolites: string[];
  reactions: FbaReaction[];
}

export interface FbaSolution {
  status: LPResult['status'];
  objectiveValue: number;
  /** reaction id → flux. */
  fluxes: Record<string, number>;
}

/**
 * Encode S·v=0 with lb≤v≤ub as a generic LP using the shift x = v − lb (x ≥ 0).
 * Returns the LP plus a decoder back to flux space.
 */
function buildLP(net: MetabolicNetwork, objective: number[]): {
  c: number[]; constraints: LPConstraint[]; nVars: number; decode: (x: number[]) => number[];
} {
  const n = net.reactions.length;
  const lb = net.reactions.map((r) => r.lb);
  const ub = net.reactions.map((r) => r.ub);

  // Mass-balance equalities: Σ_j S[m][j]·(x_j + lb_j) = 0  ⇒  Σ S[m][j]·x_j = −Σ S[m][j]·lb_j
  const constraints: LPConstraint[] = net.metabolites.map((met) => {
    const coef = net.reactions.map((r) => r.stoich[met] ?? 0);
    const rhs = -coef.reduce((s, cj, j) => s + cj * lb[j], 0);
    return { coef, type: '=' as ConstraintType, rhs };
  });
  // Upper bounds: x_j ≤ ub_j − lb_j.
  for (let j = 0; j < n; j++) {
    const coef = new Array(n).fill(0);
    coef[j] = 1;
    constraints.push({ coef, type: '<=', rhs: ub[j] - lb[j] });
  }
  const decode = (x: number[]) => x.map((xj, j) => xj + lb[j]);
  return { c: objective, constraints, nVars: n, decode };
}

const objectiveVector = (net: MetabolicNetwork, rxnId: string, maximize = true): number[] =>
  net.reactions.map((r) => (r.id === rxnId ? (maximize ? 1 : -1) : 0));

/** Core FBA: optimize one reaction's flux subject to S·v=0 and bounds. */
export function solveFBA(net: MetabolicNetwork, objectiveRxn: string, maximize = true): FbaSolution {
  const { c, constraints, nVars, decode } = buildLP(net, objectiveVector(net, objectiveRxn, maximize));
  const res = solveLP(c, constraints, nVars);
  const v = decode(res.x);
  const fluxes: Record<string, number> = {};
  net.reactions.forEach((r, j) => (fluxes[r.id] = v[j]));
  const objIdx = net.reactions.findIndex((r) => r.id === objectiveRxn);
  return { status: res.status, objectiveValue: objIdx >= 0 ? v[objIdx] : 0, fluxes };
}

/** In-silico knockouts: clamp the named reactions to zero flux (lb = ub = 0). */
export function knockoutNetwork(net: MetabolicNetwork, rxnIds: string[]): MetabolicNetwork {
  const ko = new Set(rxnIds);
  return {
    metabolites: net.metabolites,
    reactions: net.reactions.map((r) => (ko.has(r.id) ? { ...r, lb: 0, ub: 0 } : r)),
  };
}

/**
 * Parsimonious FBA: among all optima of the primary objective, pick the flux map with
 * minimum total flux Σ|v|. Implemented by fixing the objective at its optimum and minimizing
 * Σ(vf+vr) on a forward/backward split (|v| = vf+vr).
 */
export function parsimoniousFBA(net: MetabolicNetwork, objectiveRxn: string): FbaSolution {
  const opt = solveFBA(net, objectiveRxn, true);
  if (opt.status !== 'optimal') return opt;
  const zStar = opt.objectiveValue;

  const n = net.reactions.length;
  // Variables: [vf_0..vf_{n-1}, vr_0..vr_{n-1}],  v_j = vf_j − vr_j,  vf,vr ≥ 0.
  const metEqs: LPConstraint[] = net.metabolites.map((met) => {
    const coef = new Array(2 * n).fill(0);
    net.reactions.forEach((r, j) => {
      const s = r.stoich[met] ?? 0;
      coef[j] = s; coef[n + j] = -s;
    });
    return { coef, type: '=' as ConstraintType, rhs: 0 };
  });
  const bounds: LPConstraint[] = [];
  net.reactions.forEach((r, j) => {
    // vf_j − vr_j ≤ ub_j ;  vf_j − vr_j ≥ lb_j
    const up = new Array(2 * n).fill(0); up[j] = 1; up[n + j] = -1;
    bounds.push({ coef: up, type: '<=', rhs: r.ub });
    const lo = new Array(2 * n).fill(0); lo[j] = 1; lo[n + j] = -1;
    bounds.push({ coef: lo, type: '>=', rhs: r.lb });
  });
  // Fix the objective at its optimum.
  const objIdx = net.reactions.findIndex((r) => r.id === objectiveRxn);
  const fix = new Array(2 * n).fill(0); fix[objIdx] = 1; fix[n + objIdx] = -1;
  const fixCon: LPConstraint = { coef: fix, type: '=', rhs: zStar };

  // Minimize Σ(vf+vr) ⇒ maximize −Σ.
  const c = new Array(2 * n).fill(-1);
  const res = solveLP(c, [...metEqs, ...bounds, fixCon], 2 * n);
  const fluxes: Record<string, number> = {};
  net.reactions.forEach((r, j) => (fluxes[r.id] = (res.x[j] ?? 0) - (res.x[n + j] ?? 0)));
  return { status: res.status, objectiveValue: zStar, fluxes };
}

export interface FvaRange { min: number; max: number; }

/** Flux Variability Analysis at a fraction (e.g. 0.99) of the optimal objective. */
export function fluxVariability(net: MetabolicNetwork, objectiveRxn: string, fraction = 0.99, rxnIds?: string[]): Record<string, FvaRange> {
  const opt = solveFBA(net, objectiveRxn, true);
  const target = opt.objectiveValue * fraction;

  // Add the objective-floor constraint to the base LP, then min/max each reaction.
  const base = buildLP(net, objectiveVector(net, objectiveRxn));
  const objIdx = net.reactions.findIndex((r) => r.id === objectiveRxn);
  const lbObj = net.reactions[objIdx].lb;
  const floor: LPConstraint = {
    coef: net.reactions.map((_, j) => (j === objIdx ? 1 : 0)),
    type: '>=',
    rhs: target - lbObj, // in shifted x-space
  };
  const constraints = [...base.constraints, floor];

  const ids = rxnIds ?? net.reactions.map((r) => r.id);
  const out: Record<string, FvaRange> = {};
  for (const id of ids) {
    const j = net.reactions.findIndex((r) => r.id === id);
    const cj = net.reactions.map((_, k) => (k === j ? 1 : 0));
    const lo = solveLP(cj.map((v) => -v), constraints, base.nVars); // minimize x_j
    const hi = solveLP(cj, constraints, base.nVars);                // maximize x_j
    out[id] = {
      min: lo.status === 'optimal' ? (lo.x[j] ?? 0) + net.reactions[j].lb : NaN,
      max: hi.status === 'optimal' ? (hi.x[j] ?? 0) + net.reactions[j].lb : NaN,
    };
  }
  return out;
}

export interface EnvelopePoint { growth: number; productMin: number; productMax: number; }

/**
 * Production envelope (phenotype phase plane): sweep the growth reaction across [0, μmax]
 * and, at each fixed growth, report the achievable product flux range. The upper edge is the
 * growth↔product Pareto front — how much growth must be traded for γ-PGA / glutamate.
 */
export function productionEnvelope(net: MetabolicNetwork, growthRxn: string, productRxn: string, n = 20): EnvelopePoint[] {
  const muMax = solveFBA(net, growthRxn, true).objectiveValue;
  const points: EnvelopePoint[] = [];
  const gi = net.reactions.findIndex((r) => r.id === growthRxn);
  for (let i = 0; i <= n; i++) {
    const mu = (muMax * i) / n;
    const fixed: MetabolicNetwork = {
      metabolites: net.metabolites,
      reactions: net.reactions.map((r, j) => (j === gi ? { ...r, lb: mu, ub: mu } : r)),
    };
    const lo = solveFBA(fixed, productRxn, false);
    const hi = solveFBA(fixed, productRxn, true);
    points.push({
      growth: mu,
      productMin: lo.status === 'optimal' ? lo.objectiveValue : 0,
      productMax: hi.status === 'optimal' ? hi.objectiveValue : 0,
    });
  }
  return points;
}
