/**
 * Approach 2, Polymer Physics & Intermolecular Cross-linking Thermodynamics
 * =========================================================================
 * Divalent-cation (Ca²⁺/Mg²⁺) cross-linking of a carboxylated biopolymer into a
 * structural hydrogel, evaluated with a Langmuir binding isotherm feeding affine
 * rubber-elasticity network theory. Shared by γ-PGA (Prong 1) and alginate (Prong 3).
 *
 * Theory (modeling_subteam_theory.md):
 *   Eq 4  θ      = [C²⁺] / (Kd + [C²⁺])                     fractional site saturation
 *   Eq 5  ν      = (ρ_polymer · θ / Mx) · (1 − 2·Mx/Mn)     elastic strand density [mol·m⁻³]
 *   Eq 6  G      = ν · R · T                                 shear modulus [Pa]
 *
 * Note on Eq 5. The affine network model is G = (ρ/Mx)·R·T, so ν has to be a molar
 * concentration of elastically effective strands before ν·R·T comes out in Pa. Earlier
 * versions of this file left the division by Mx out, which made ν a mass density and G a
 * specific energy rather than a stress. That mattered more than a constant scale factor,
 * because γ-PGA and alginate use Mx values that differ by more than an order of magnitude,
 * so the missing division did not cancel between the two routes. Mx arrives in g·mol⁻¹
 * because that is the unit the interface and the literature both use, so it is converted to
 * kg·mol⁻¹ here.
 *
 * Note on ρ_polymer: kept as the theory's effective network-density proxy [kg·m⁻³] so the
 * model stays consistent with the .md derivation. The (1 − 2·Mx/Mn) chain-end correction is
 * the standard affine-network finite-chain term. It is worth saying that it barely moves the
 * answer at any setting the interface allows, so it is here for completeness rather than
 * because it changes a result.
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
  /** θ, fractional saturation of binding sites (0–1). */
  theta: number;
  /** ν, density of elastically effective strands [mol·m⁻³]. */
  nu: number;
  /** G, shear modulus [Pa]. */
  shearModulus: number;
}

/** Eq 4, Langmuir fractional saturation of carboxylate sites by divalent cations. */
export function saturation(ionConcentration: number, Kd: number): number {
  if (ionConcentration <= 0) return 0;
  return ionConcentration / (Kd + ionConcentration);
}

/**
 * Eq 5, affine network strand density with the finite-chain end correction.
 * Returns mol·m⁻³, so ν·R·T below is a stress.
 */
export function crossLinkDensity(
  rhoPolymer: number,
  theta: number,
  Mx: number,
  Mn: number,
): number {
  const MxKgPerMol = Math.max(1e-6, Mx / 1000); // g·mol⁻¹ → kg·mol⁻¹
  const endCorrection = 1 - (2 * Mx) / Mn; // chains shorter than 2·Mx cannot bear load
  return Math.max(0, ((rhoPolymer * theta) / MxKgPerMol) * endCorrection);
}

/** Eq 6, rubber-elasticity shear modulus G = νRT. */
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
