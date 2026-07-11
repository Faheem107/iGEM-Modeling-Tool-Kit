/**
 * §6 — CaCO₃ Geochemical Precipitation (Prong 2, non-ureolytic via Carbonic Anhydrase)
 * ===================================================================================
 * A GEOCHEMICAL precipitation model (per Lassin et al. 2018) — NOT a full biological MICP
 * model. Scope: simplified Ca–CO₂–H₂O chemistry around pH 8.5–10.5, ~25 °C.
 *
 * Cascade:
 *   pH + DIC → carbonate speciation (α0,α1,α2)
 *           → [CO₃²⁻]
 *   Ω = [Ca²⁺][CO₃²⁻]/Ksp ,  SI = log₁₀ Ω        (supersaturation)
 *   aqueous ions → ACC (fast, kinetic precursor) → calcite (ripening)   two-step
 *   calcite wt% → UCS (empirical power law)        biocement strength
 *   mol CaCO₃ → mol CO₂ captured                   climate co-benefit
 *
 * Carbonic anhydrase accelerates CO₂(aq)+H₂O → H⁺+HCO₃⁻, raising DIC (hence [CO₃²⁻] and Ω)
 * far faster than the un-catalyzed hydration — without ureolysis, so no ammonia.
 */

import { CACO3_CALIB, MOLAR_MASS, cval } from "./constants";

const pow10 = (x: number) => Math.pow(10, x);

export interface Speciation {
  /** α0 — fraction as dissolved CO₂(aq)/H₂CO₃*. */
  alpha0: number;
  /** α1 — fraction as bicarbonate HCO₃⁻. */
  alpha1: number;
  /** α2 — fraction as carbonate CO₃²⁻. */
  alpha2: number;
}

/**
 * Carbonate speciation fractions of total dissolved inorganic carbon at a given pH.
 *   α0 = [CO₂]/DIC, α1 = [HCO₃⁻]/DIC, α2 = [CO₃²⁻]/DIC
 */
export function carbonateSpeciation(pH: number): Speciation {
  const H = pow10(-pH);
  const Ka1 = pow10(-cval(CACO3_CALIB.pKa1));
  const Ka2 = pow10(-cval(CACO3_CALIB.pKa2));
  const denom = H * H + Ka1 * H + Ka1 * Ka2;
  return {
    alpha0: (H * H) / denom,
    alpha1: (Ka1 * H) / denom,
    alpha2: (Ka1 * Ka2) / denom,
  };
}

/** Saturation ratio Ω = [Ca²⁺][CO₃²⁻]/Ksp (concentrations in mol·L⁻¹). */
export function saturationRatio(
  caMolar: number,
  co3Molar: number,
  pKsp: number,
): number {
  const Ksp = pow10(-pKsp);
  return (caMolar * co3Molar) / Ksp;
}

/** Saturation index SI = log₁₀ Ω. SI>0 ⇒ precipitation thermodynamically favorable. */
export function saturationIndex(
  caMolar: number,
  co3Molar: number,
  pKsp: number,
): number {
  const omega = saturationRatio(caMolar, co3Molar, pKsp);
  return omega > 0 ? Math.log10(omega) : -Infinity;
}

/**
 * Normalized CA activity 0–1 from the fraction of maximal rate enhancement realized.
 *   activity = log₁₀(1 + f·enhancement) / log₁₀(1 + enhancement)
 * (log scaling because CA enhancement spans orders of magnitude).
 */
export function caActivityFraction(
  realizedEnhancementFraction: number,
): number {
  const E = cval(CACO3_CALIB.caRateEnhancement);
  const f = Math.max(0, Math.min(1, realizedEnhancementFraction));
  return Math.log10(1 + f * E) / Math.log10(1 + E);
}

export interface PrecipitationInputs {
  /** Initial dissolved Ca²⁺ [mM]. */
  calciumMillimolar: number;
  /** Maximum attainable DIC [mM] when CA fully active (CO₂ source capacity). */
  dicMaxMillimolar: number;
  /** Solution pH (clamped to the model's valid 8.5–10.5 window). */
  pH: number;
  /** Normalized CA activity 0–1 (see caActivityFraction). */
  caActivity: number;
  /** Sand bulk dry mass per litre of pore solution [g/L] (for wt% conversion). */
  sandMassPerLiter?: number;
  /** Simulated duration [h]. */
  hours?: number;
  /** Integration step [h]. */
  dt?: number;
}

export interface PrecipitationStep {
  time: number; // h
  caMolar: number; // mol/L dissolved Ca²⁺
  co3Molar: number; // mol/L carbonate ion
  accMolar: number; // mol/L amorphous CaCO₃
  vateriteMolar: number; // mol/L metastable vaterite
  calciteMolar: number; // mol/L crystalline calcite
  SIcalcite: number; // saturation index wrt calcite
  omegaACC: number; // saturation ratio wrt ACC
}

export interface PrecipitationResult {
  series: PrecipitationStep[];
  /** Final calcite [mol/L]. */
  calciteMolar: number;
  /** Final metastable vaterite [mol/L]. */
  vateriteMolar: number;
  /** Final calcite content [wt% of sand]. */
  calciteWtPercent: number;
  /** Final vaterite content [wt% of sand]. */
  vateriteWtPercent: number;
  /** Total crystalline + amorphous carbonate content [wt% of sand]. */
  carbonateWtPercent: number;
  /** Strength-weighted "effective calcite" wt% that drives UCS (vaterite counts at a reduced factor). */
  loadBearingWtPercent: number;
  /** Vaterite as a fraction of total crystalline carbonate (0–1) — the polymorph purity readout. */
  vateriteFraction: number;
  /** Unconfined compressive strength [kPa]. */
  ucsKpa: number;
  /** CO₂ sequestered [g per litre solution]. */
  co2SequesteredGPerL: number;
}

/**
 * Three-phase ACC → vaterite → calcite precipitation kinetics, integrated explicitly.
 * Non-ureolytic carbonic-anhydrase MICP is dominated by CO₂ hydration and typically crystallises
 * a large fraction of METASTABLE VATERITE (Research Table, Prong 2) that only slowly recrystallises
 * to calcite (solution-mediated Ostwald ripening). Vaterite is softer and more soluble, so the crust
 * is weaker while vaterite-rich and stiffens as it converts. CA activity raises the quasi-equilibrium
 * DIC, hence [CO₃²⁻] and Ω.
 */
export function simulatePrecipitation(
  inp: PrecipitationInputs,
): PrecipitationResult {
  const hours = inp.hours ?? 48;
  const dt = inp.dt ?? 0.25;
  const steps = Math.round(hours / dt);
  const sandMass = inp.sandMassPerLiter ?? 1500; // ~ bulk sand in 1 L pore volume

  const pKspCal = cval(CACO3_CALIB.pKspCalcite);
  const pKspACC = cval(CACO3_CALIB.pKspACC);
  const kPrecip = cval(CACO3_CALIB.kPrecip);
  const kRipen = cval(CACO3_CALIB.kAccToCalcite);
  const fVaterite = cval(CACO3_CALIB.vateriteFraction); // ACC ripens mostly to vaterite in CA-MICP
  const kVatToCal = cval(CACO3_CALIB.kVateriteToCalcite); // slow vaterite → calcite recrystallisation
  const vatStrength = cval(CACO3_CALIB.vateriteStrengthFactor); // vaterite load-bearing vs calcite

  const pH = Math.max(8.5, Math.min(10.5, inp.pH));
  const { alpha2 } = carbonateSpeciation(pH);

  // Quasi-equilibrium DIC scales with CA activity (more enzyme ⇒ more bicarbonate captured).
  const dicTargetM =
    (inp.dicMaxMillimolar * Math.max(0, Math.min(1, inp.caActivity))) / 1000;
  const kDic = 0.6; // DIC relaxation toward target [h⁻¹] (fast CO₂ hydration once CA present)

  let ca = inp.calciumMillimolar / 1000; // mol/L
  let dic = 0;
  let acc = 0;
  let vaterite = 0;
  let calcite = 0;

  const series: PrecipitationStep[] = [];

  for (let i = 0; i <= steps; i++) {
    const co3 = alpha2 * dic;
    const omegaCal = saturationRatio(ca, co3, pKspCal);
    const omegaACC = saturationRatio(ca, co3, pKspACC);
    const SIcalcite = omegaCal > 0 ? Math.log10(omegaCal) : -Infinity;

    series.push({
      time: i * dt,
      caMolar: ca,
      co3Molar: co3,
      accMolar: acc,
      vateriteMolar: vaterite,
      calciteMolar: calcite,
      SIcalcite,
      omegaACC,
    });

    // CA-driven DIC supply (first-order relaxation to the activity-set target).
    const dDic = kDic * (dicTargetM - dic);

    // ACC precipitation when supersaturated wrt the amorphous phase (TST: rate ∝ Ω−1).
    const accDrive = Math.max(0, omegaACC - 1);
    const rAccPrecip = Math.min(kPrecip * accDrive, ca / dt, dic / dt); // can't exceed available ions
    // ACC ripens (first order); in CA-MICP it splits into mostly vaterite + some direct calcite.
    const rRipen = kRipen * acc;
    // Metastable vaterite slowly recrystallises to calcite (solution-mediated, first order).
    const rVatToCal = kVatToCal * vaterite;

    ca = Math.max(0, ca - rAccPrecip * dt);
    dic = Math.max(0, dic + (dDic - rAccPrecip) * dt);
    acc = Math.max(0, acc + (rAccPrecip - rRipen) * dt);
    vaterite = Math.max(0, vaterite + (rRipen * fVaterite - rVatToCal) * dt);
    calcite = Math.max(
      0,
      calcite + (rRipen * (1 - fVaterite) + rVatToCal) * dt,
    );
  }

  const gPerL = (mol: number) => mol * MOLAR_MASS.CaCO3;
  const calciteWtPercent = (gPerL(calcite) / sandMass) * 100;
  const vateriteWtPercent = (gPerL(vaterite) / sandMass) * 100;
  const carbonateWtPercent = (gPerL(calcite + vaterite + acc) / sandMass) * 100;
  // Vaterite bears load at a reduced factor until it converts — this is what drives UCS.
  const loadBearingWtPercent =
    calciteWtPercent + vatStrength * vateriteWtPercent;
  const crystalline = calcite + vaterite;
  const vateriteFraction = crystalline > 0 ? vaterite / crystalline : 0;
  const ucsKpa = calciteToUCS(loadBearingWtPercent);
  const co2SequesteredGPerL = (calcite + vaterite + acc) * MOLAR_MASS.CO2; // 1 mol CaCO₃ fixes 1 mol CO₂

  return {
    series,
    calciteMolar: calcite,
    vateriteMolar: vaterite,
    calciteWtPercent,
    vateriteWtPercent,
    carbonateWtPercent,
    loadBearingWtPercent,
    vateriteFraction,
    ucsKpa,
    co2SequesteredGPerL,
  };
}

/** Empirical biocement strength curve: UCS = kUcs · (load-bearing carbonate wt%)^nUcs  [kPa]. */
export function calciteToUCS(calciteWtPercent: number): number {
  if (calciteWtPercent <= 0) return 0;
  return (
    cval(CACO3_CALIB.kUcs) * Math.pow(calciteWtPercent, cval(CACO3_CALIB.nUcs))
  );
}

/** CO₂ captured per mole of CaCO₃ precipitated (1:1 stoichiometry) → mass [g]. */
export const co2Sequestered = (molCaCO3: number): number =>
  Math.max(0, molCaCO3) * MOLAR_MASS.CO2;
