/**
 * Composite Strength Synthesis — multi-prong combination logic
 * ============================================================
 * Two complementary outputs when ≥2 prongs are selected:
 *
 * 1. COMPOSITE COHESION (mechanical, parallel load-sharing / rule of mixtures):
 *      γ_total = Σ γᵢ  +  Σ_{i<j} η_ij · √(γᵢ·γⱼ)
 *    Each prong contributes an interparticle cohesion γᵢ [N/m] (γ-PGA & alginate via shear
 *    modulus G, CaCO₃ via UCS). η_ij are labeled synergy/interference coefficients
 *    (calibration placeholders) grounded in the wet-lab three-prong rationale.
 *
 * 2. ROBUSTNESS MATRIX (resilience / redundancy):
 *    The core thesis of the three-prong design is that prongs "compensate for each other's
 *    weaknesses." Each prong carries a resilience profile across failure scenarios; a
 *    combination's resilience per scenario is 1 − Π(1 − rᵢ) — i.e. the crust survives a
 *    scenario if AT LEAST ONE active mechanism survives it (probabilistic redundancy).
 */

import { COMPOSITE_CALIB, cval } from "./constants";

export const PRONG_IDS = [1, 2, 3] as const;
export type ProngId = (typeof PRONG_IDS)[number];

export const PRONG_LABEL: Record<ProngId, string> = {
  1: "γ-PGA",
  2: "CaCO₃",
  3: "Alginate",
};

/** Failure scenarios the desert deployment must survive. */
export const SCENARIOS = [
  "Drought / Heat",
  "Flood / Rain",
  "Bacterial Death",
  "High Wind",
  "Long-term Durability",
] as const;
export type Scenario = (typeof SCENARIOS)[number];

/**
 * Per-prong resilience priors over SCENARIOS (0–1). Heuristic scores derived directly from
 * the wet-lab honesty notes (wet_lab_prongs_approach.md). Refinable via the scenario assays
 * listed in WETLAB_TODO.md (e.g. rain-simulation residual strength).
 *   P1 γ-PGA  : water-retaining but soluble & bacteria-dependent
 *   P2 CaCO₃  : mineral cement — persists even if cells die, insoluble, rigid
 *   P3 Alginate: bacteria-independent & moisture-holding, but soluble
 */
export const PRONG_RESILIENCE: Record<ProngId, Record<Scenario, number>> = {
  1: {
    "Drought / Heat": 0.7,
    "Flood / Rain": 0.2,
    "Bacterial Death": 0.15,
    "High Wind": 0.6,
    "Long-term Durability": 0.35,
  },
  2: {
    "Drought / Heat": 0.85,
    "Flood / Rain": 0.8,
    "Bacterial Death": 0.7,
    "High Wind": 0.9,
    "Long-term Durability": 0.9,
  },
  3: {
    "Drought / Heat": 0.75,
    "Flood / Rain": 0.2,
    "Bacterial Death": 0.95,
    "High Wind": 0.55,
    "Long-term Durability": 0.4,
  },
};

export interface ProngContribution {
  prong: ProngId;
  /** Interparticle cohesion contributed [N/m]. */
  cohesion: number;
}

/** Pairwise synergy coefficient η_ij for a prong pair (order-independent). */
export function etaFor(a: ProngId, b: ProngId): number {
  const key = [a, b].sort().join("-");
  switch (key) {
    case "1-2":
      return cval(COMPOSITE_CALIB.eta_PGA_CaCO3);
    case "1-3":
      return cval(COMPOSITE_CALIB.eta_PGA_Alginate);
    case "2-3":
      return cval(COMPOSITE_CALIB.eta_CaCO3_Alginate);
    default:
      return 0;
  }
}

export interface CompositeResult {
  /** Sum of individual cohesions (no interaction) [N/m]. */
  additiveCohesion: number;
  /** Net interaction term Σ η_ij·√(γᵢγⱼ) [N/m] (can be negative). */
  interactionCohesion: number;
  /** Total composite cohesion [N/m]. */
  totalCohesion: number;
  /** Synergy ratio total/additive (>1 synergistic, <1 antagonistic). */
  synergyRatio: number;
}

/** γ_total = Σ γᵢ + Σ η_ij·√(γᵢγⱼ). */
export function compositeCohesion(
  contributions: ProngContribution[],
): CompositeResult {
  const additive = contributions.reduce(
    (s, c) => s + Math.max(0, c.cohesion),
    0,
  );

  let interaction = 0;
  for (let i = 0; i < contributions.length; i++) {
    for (let j = i + 1; j < contributions.length; j++) {
      const ci = contributions[i];
      const cj = contributions[j];
      interaction +=
        etaFor(ci.prong, cj.prong) *
        Math.sqrt(Math.max(0, ci.cohesion) * Math.max(0, cj.cohesion));
    }
  }

  const total = Math.max(0, additive + interaction);
  return {
    additiveCohesion: additive,
    interactionCohesion: interaction,
    totalCohesion: total,
    synergyRatio: additive > 0 ? total / additive : 1,
  };
}

export interface RobustnessRow {
  scenario: Scenario;
  /** Resilience of each active prong alone (0–1). */
  perProng: Record<ProngId, number>;
  /** Combined resilience 1 − Π(1 − rᵢ) (0–1). */
  combined: number;
}

/** Per-scenario resilience of the chosen combination (probabilistic redundancy). */
export function robustnessMatrix(prongs: ProngId[]): RobustnessRow[] {
  return SCENARIOS.map((scenario) => {
    const perProng = {} as Record<ProngId, number>;
    let survivalFail = 1; // Π(1 − rᵢ)
    for (const p of prongs) {
      const r = PRONG_RESILIENCE[p][scenario];
      perProng[p] = r;
      survivalFail *= 1 - r;
    }
    return { scenario, perProng, combined: 1 - survivalFail };
  });
}

/** Weakest-scenario resilience — the limiting failure mode of a combination. */
export function limitingScenario(prongs: ProngId[]): {
  scenario: Scenario;
  resilience: number;
} {
  const rows = robustnessMatrix(prongs);
  return rows.reduce(
    (worst, r) =>
      r.combined < worst.resilience
        ? { scenario: r.scenario, resilience: r.combined }
        : worst,
    { scenario: rows[0].scenario, resilience: rows[0].combined },
  );
}
