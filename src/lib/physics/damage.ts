/**
 * Receptor damage functions
 * =========================
 * Mirror of `python_models/damage.py`. Keep the two in step.
 *
 * One transport core feeds several markets. Each market has its own damage
 * function and each carries an EVIDENCE GRADE that the UI must render, because
 * the evidence behind them is very uneven and hiding that would be dishonest.
 *
 *   "measured"    a published measurement we hold and can quote
 *   "literature"  a published relation, transferred from another site or context
 *   "unsourced"   the physics is sound but no cost or response coefficient exists
 *                 yet. These return `null`, never a number.
 */

export type EvidenceGrade = "measured" | "literature" | "unsourced";

export interface DamageResult {
  /** null means no defensible number exists. Render the grade, not a zero. */
  value: number | null;
  unit: string;
  grade: EvidenceGrade;
  source: string;
  notes?: string;
  /** True when the input sits outside the source's fitted range. */
  outOfRange?: boolean;
}

// ---------------------------------------------------------------------------
// Solar, soiling. Elminir et al. (2006), Energy Convers. Manag. 47, 3192–3203,
// doi 10.1016/j.enconman.2006.02.014.
//
// Their Eq (1), verified against the PDF rather than only the text extraction:
//   Δτ[%] = 0.0381q⁴ − 0.8626q³ + 6.4143q² − 15.051q + 16.769
// fitted to their Fig 6, whose axes run q = 1…9 g/m² and Δτ = 4…24 %.
// Reported fit quality R = 0.98, MBE = −0.05 %, RMSE = 6.68 %.
//
// Two confirmed problems with using it raw:
//   • non-monotonic on [1, 2], dipping to 5.80 % at q = 1.68 after 7.31 % at q = 1,
//     which is a quartic artifact and not a physical effect;
//   • meaningless outside [1, 9]: 16.77 % at q = 0 and 252 % at q = 15.
// So the polynomial is used only inside its fitted range, monotonicity is enforced
// by a running maximum on a fixed grid, and below 1 g/m² we ramp linearly from the
// origin, the only admissible behaviour at zero dust.
//
// The abstract's 15.84 g/m² → 52.54 % and 4.48 g/m² → 12.38 % are CUMULATIVE
// seven-month exposure endpoints, a different quantity, and are deliberately NOT
// pooled with the Fig 6 correlation.
// ---------------------------------------------------------------------------

export const ELMINIR_Q_MIN = 1.0;
export const ELMINIR_Q_MAX = 9.0;

const elminirRaw = (q: number): number =>
  0.0381 * q ** 4 - 0.8626 * q ** 3 + 6.4143 * q ** 2 - 15.051 * q + 16.769;

const ENV_N = 2000;
const ENV_Y: number[] = (() => {
  const out: number[] = [];
  let running = -Infinity;
  for (let i = 0; i <= ENV_N; i++) {
    const q = ELMINIR_Q_MIN + ((ELMINIR_Q_MAX - ELMINIR_Q_MIN) * i) / ENV_N;
    running = Math.max(running, elminirRaw(q));
    out.push(running);
  }
  return out;
})();

/** Eq 1 with the quartic's non-physical dip removed. Monotone by construction. */
function elminirMonotone(q: number): number {
  if (q <= ELMINIR_Q_MIN) return ENV_Y[0];
  if (q >= ELMINIR_Q_MAX) return ENV_Y[ENV_N];
  const pos = ((q - ELMINIR_Q_MIN) / (ELMINIR_Q_MAX - ELMINIR_Q_MIN)) * ENV_N;
  const i = Math.floor(pos);
  return ENV_Y[i] + (pos - i) * (ENV_Y[i + 1] - ENV_Y[i]);
}

/** Elminir Table 1: transmittance reduction by tilt at ≈8.5 g/m² accumulation. */
export const TILT_TABLE: Record<number, number> = {
  0: 27.62, 15: 20.18, 30: 18.47, 45: 15.96, 60: 13.62, 75: 10.82, 90: 6.32,
};

/** Linear interpolation of Elminir Table 1, normalised to tilt = 0°. */
export function tiltFactor(tiltDeg: number): number {
  const t = Math.min(Math.max(tiltDeg, 0), 90);
  const keys = Object.keys(TILT_TABLE).map(Number).sort((a, b) => a - b);
  for (let i = 0; i < keys.length - 1; i++) {
    const lo = keys[i];
    const hi = keys[i + 1];
    if (t >= lo && t <= hi) {
      const f = (t - lo) / (hi - lo);
      return (TILT_TABLE[lo] + f * (TILT_TABLE[hi] - TILT_TABLE[lo])) / TILT_TABLE[0];
    }
  }
  return TILT_TABLE[90] / TILT_TABLE[0];
}

/** Reduction in glass normal transmittance [%] for a dust deposition density. */
export function transmittanceLossPercent(
  depositionGm2: number,
  tiltDeg = 0,
): DamageResult {
  const q = Math.max(0, depositionGm2);
  const outOfRange = q > ELMINIR_Q_MAX;
  let val: number;
  let notes: string;
  if (q < ELMINIR_Q_MIN) {
    val = elminirMonotone(ELMINIR_Q_MIN) * (q / ELMINIR_Q_MIN);
    notes = "below Elminir's fitted range, linear ramp from origin";
  } else if (!outOfRange) {
    val = elminirMonotone(q);
    notes = "inside Elminir Fig 6 fitted range";
  } else {
    const h = 0.01;
    const slope =
      (elminirMonotone(ELMINIR_Q_MAX) - elminirMonotone(ELMINIR_Q_MAX - h)) / h;
    val = elminirMonotone(ELMINIR_Q_MAX) + slope * (q - ELMINIR_Q_MAX);
    notes =
      "above Elminir's fitted range of 9 g/m², linear extrapolation at the endpoint slope, indicative only";
  }
  return {
    value: Math.min(val * tiltFactor(tiltDeg), 100),
    unit: "% transmittance loss",
    grade: "literature",
    source:
      "Elminir et al. 2006, Energy Convers. Manag. 47, 3192, Eq 1 and Table 1. Measured in Egypt, transferred to the Gulf.",
    notes,
    outOfRange,
  };
}

// ---------------------------------------------------------------------------
// Markets whose physics is sound but whose cost coefficient has no source.
// These return null on purpose. Do not fill them in without a citation.
// ---------------------------------------------------------------------------

const unsourced = (unit: string, source: string, notes?: string): DamageResult => ({
  value: null, unit, grade: "unsourced", source, notes,
});

export const solarAbrasion = (): DamageResult =>
  unsourced(
    "% power loss per year",
    "No published relation found linking saltation flux to PV glass haze.",
    "Physics is sound and the length scale is right. Candidate for own bench work.",
  );

export const roadEncroachment = (): DamageResult =>
  unsourced(
    "USD per km per year",
    "Khalaf & Al-Ajmi 1993 measure the Gulf drift rate (about 20 m³ per metre width per year in Kuwait) but publish no clearing cost.",
    "The mass side is sourced. Only the cost per cubic metre cleared is missing.",
  );

export const industrialHse = (): DamageResult =>
  unsourced(
    "USD per site per year",
    "Lead to mine: Economic Impact and Risk Assessment of SDS on the Oil and Gas Industry, Sustainability 2019, doi 10.3390/su11010200.",
  );

export const agricultureYield = (): DamageResult =>
  unsourced(
    "% yield loss",
    "Lead to mine: Effects of inert dust on olive leaf physiological parameters, doi 10.1065/espr2006.08.327.",
    "Business plan cites ~28% cotton yield loss, unverified against a primary source.",
  );

// ---------------------------------------------------------------------------
// Tariff. Official, from the DEWA slab tariff sheet retrieved August 2026.
// ---------------------------------------------------------------------------

export const AED_PER_USD = 3.6725; // the dirham is pegged to the dollar
export const DEWA_TARIFF_AED_PER_KWH = {
  industrialLow: 0.23,   // 0–10,000 kWh per month
  industrialHigh: 0.38,  // above 10,000 kWh per month
  commercialHigh: 0.38,  // above 6,000 kWh per month
} as const;
export const DEWA_FUEL_SURCHARGE_AED_PER_KWH = 0.06; // August 2026
export const DEWA_VAT = 0.05;

/**
 * Delivered retail electricity price [USD/kWh] from the official DEWA sheet.
 *
 * WARNING, and it matters for the business model: this is the RETAIL CONSUMPTION
 * tariff. A utility-scale solar plant earns the PPA price it sold at, which in the
 * UAE has been roughly an order of magnitude lower than retail. Use this only for a
 * customer who OFFSETS retail consumption. For a generator the PPA price is the
 * correct input and it is deliberately not hard-coded here.
 */
export function dewaTariffUsdPerKwh(
  slab: keyof typeof DEWA_TARIFF_AED_PER_KWH = "industrialHigh",
  includeSurcharge = true,
  includeVat = true,
): number {
  let aed: number = DEWA_TARIFF_AED_PER_KWH[slab];
  if (includeSurcharge) aed += DEWA_FUEL_SURCHARGE_AED_PER_KWH;
  if (includeVat) aed *= 1 + DEWA_VAT;
  return aed / AED_PER_USD;
}

// ---------------------------------------------------------------------------
// The price a site actually earns.
//
// This is the single easiest place in the whole chain to overstate the value of
// the product by an order of magnitude, so it carries two prices rather than
// one and makes the reader choose.
//
// A utility-scale plant SELLS its output at the price it contracted for, which
// in the UAE has been between 1.35 and 2.42 US cents. A factory or a farm that
// puts panels on its own roof AVOIDS buying retail electricity, which DEWA
// bills at about 12.6 US cents delivered. The two differ by roughly a factor of
// ten, and using the retail figure for a generator inflates every result on the
// cost panel by that factor.
// ---------------------------------------------------------------------------

export interface PpaPrice {
  usdPerKwh: number;
  source: string;
}

/**
 * Contracted PPA prices for the UAE utility-scale plants that have published
 * one. Keyed on a substring of the site name as it appears in
 * public/data/uae_target_sites.json.
 *
 * These are the auction-winning bid prices as announced. A real settlement can
 * include indexation and availability terms that are not public, so treat them
 * as the contracted headline rather than as revenue per kWh delivered.
 */
export const UAE_PPA_USD_PER_KWH: Record<string, PpaPrice> = {
  "Al-Dhafra": {
    usdPerKwh: 0.0135,
    source: "EWEC award for the 2 GW Al Dhafra project, announced April 2020",
  },
  "Mohammed bin Rashid": {
    usdPerKwh: 0.016953,
    source: "DEWA 25-year PPA for the 900 MW MBR Phase V, signed April 2020",
  },
  "Noor Abu Dhabi": {
    usdPerKwh: 0.0242,
    source: "Winning bid for the 1177 MW Noor Abu Dhabi plant, 2017",
  },
};

/**
 * The range the UAE has actually contracted at, used for a plant with no
 * published price of its own. Shown as a range on purpose: a single midpoint
 * would look like a figure for that specific plant, which it is not.
 */
export const UAE_PPA_RANGE_USD_PER_KWH = { low: 0.0135, high: 0.0242 } as const;

/** The published PPA for a named site, or null if that site has none. */
export function ppaForSite(siteName: string): PpaPrice | null {
  for (const [key, price] of Object.entries(UAE_PPA_USD_PER_KWH)) {
    if (siteName.includes(key)) return price;
  }
  return null;
}

export type PriceBasis = "ppa" | "retail";

/**
 * The price to value a lost kilowatt-hour at.
 *
 * `ppa` is right for a plant that sells its output. `retail` is right for a
 * site that consumes what it generates, because the kilowatt-hour it fails to
 * generate is one it has to buy instead.
 */
export function tariffUsdPerKwh(
  basis: PriceBasis,
  siteName?: string,
): { value: number; label: string; source: string; exact: boolean } {
  if (basis === "retail") {
    return {
      value: dewaTariffUsdPerKwh(),
      label: "DEWA industrial retail, delivered",
      source: "DEWA slab tariff sheet, August 2026, high industrial slab plus fuel surcharge and VAT",
      exact: true,
    };
  }
  const ppa = siteName ? ppaForSite(siteName) : null;
  if (ppa) {
    return { value: ppa.usdPerKwh, label: "contracted PPA", source: ppa.source, exact: true };
  }
  const mid = (UAE_PPA_RANGE_USD_PER_KWH.low + UAE_PPA_RANGE_USD_PER_KWH.high) / 2;
  return {
    value: mid,
    label: "UAE utility PPA range, midpoint",
    source:
      `No published PPA for this site. UAE awards have run from ` +
      `${UAE_PPA_RANGE_USD_PER_KWH.low} to ${UAE_PPA_RANGE_USD_PER_KWH.high} USD/kWh; ` +
      `this is the midpoint and should be read as a range, not as this plant's price.`,
    exact: false,
  };
}
