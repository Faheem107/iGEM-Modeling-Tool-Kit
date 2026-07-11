/**
 * Approach 2 — Polymer Physics & Intermolecular Cross-linking Thermodynamics
 * =========================================================================
 * Divalent-cation (Ca²⁺/Mg²⁺) cross-linking of a carboxylated biopolymer into a
 * structural hydrogel, evaluated with a Langmuir binding isotherm feeding affine
 * rubber-elasticity network theory. Shared by γ-PGA (Prong 1) and alginate (Prong 3).
 *
 * Theory (modeling_subteam_theory.md):
 *   Eq 4  θ      = [C²⁺] / (Kd + [C²⁺])                     fractional site saturation
 *   Eq 5  ν      = ρ_polymer · θ · (1 − 2·Mx/Mn)            effective network density
 *   Eq 6  G      = ν · R · T                                 shear modulus [Pa]
 *
 * Note on ρ_polymer: kept as the theory's effective network-density proxy [kg·m⁻³] so the
 * model stays consistent with the .md derivation and the existing calibrated graph ranges.
 * The (1 − 2·Mx/Mn) chain-end correction is the standard affine-network finite-chain term.
 */

import { PHYS } from "./constants";

export interface CrossLinkInputs {
  /** Local divalent cation concentration [C²⁺] [mol·m⁻³ ≈ mM]. */
  ionConcentration: number;
  /** Ca²⁺ dissociation constant Kd [mol·m⁻³]. */
  Kd: number;
  /** Effective polymer network density ρ_polymer [kg·m⁻³]. */
  rhoPolymer: number;
  /** Molar mass between cross-links Mx [g·mol⁻¹]. */
  Mx: number;
  /** Number-average polymer molar mass Mn [g·mol⁻¹]. */
  Mn: number;
  /** Absolute temperature T [K]. */
  temperature: number;
  /**
   * Optional environmental viability multiplier 0–1 (protein/enzyme denaturation,
   * desiccation) that scales saturation and modulus down. Defaults to 1.
   */
  viability?: number;
}

export interface CrossLinkResult {
  /** θ — fractional saturation of binding sites (0–1). */
  theta: number;
  /** ν — effective cross-link network density [mol·m⁻³ proxy]. */
  nu: number;
  /** G — shear modulus [Pa]. */
  shearModulus: number;
}

/** Eq 4 — Langmuir fractional saturation of carboxylate sites by divalent cations. */
export function saturation(ionConcentration: number, Kd: number): number {
  if (ionConcentration <= 0) return 0;
  return ionConcentration / (Kd + ionConcentration);
}

/** Eq 5 — affine network cross-link density with finite-chain end correction. */
export function crossLinkDensity(
  rhoPolymer: number,
  theta: number,
  Mx: number,
  Mn: number,
): number {
  const endCorrection = 1 - (2 * Mx) / Mn; // chains shorter than 2·Mx cannot bear load
  return Math.max(0, rhoPolymer * theta * endCorrection);
}

/** Eq 6 — rubber-elasticity shear modulus G = νRT. */
export const shearModulus = (nu: number, temperature: number): number =>
  nu * PHYS.R * temperature;

/** Full Langmuir → network → modulus solve. */
export function solveCrossLink(inp: CrossLinkInputs): CrossLinkResult {
  const viability = inp.viability ?? 1;
  const theta = saturation(inp.ionConcentration, inp.Kd) * viability;
  const nu = crossLinkDensity(inp.rhoPolymer, theta, inp.Mx, inp.Mn);
  const G = shearModulus(nu, inp.temperature) * viability;
  return { theta, nu, shearModulus: G };
}
