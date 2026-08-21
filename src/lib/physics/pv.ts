/**
 * PV yield and capacity factor, in the app.
 *
 * Mirror of python_models/pv.py. Keep the two in step.
 *
 * The app does not re-run the hourly yield model: that is done once by
 * scripts/fetch_pv_climatology.py and shipped as
 * public/data/uae_pv_climatology.json. What lives here is the part the UI needs
 * at interaction time, which is sampling that grid for a site and carrying the
 * result through to money.
 *
 * The capacity factor in that file is for CLEAN glass. Soiling is what the rest
 * of the exposure module computes, so it is subtracted here rather than being
 * baked in twice.
 */

export interface PvCell {
  /** Annual mean, fixed tilt at the local optimum. */
  cf: number;
  /** The same, for a horizontal single-axis tracker. */
  cfTracking: number;
  yield: number;
  yieldTracking: number;
  tilt: number;
  ghi: number;
  /** Twelve monthly capacity factors, January first. */
  monthly: number[];
  monthlyTracking: number[];
}

export interface PvClimatology {
  provenance: Record<string, unknown>;
  step: number;
  cells: Record<string, PvCell>;
}

export type Mounting = "fixed" | "tracking";

/**
 * The grid cell covering a site.
 *
 * Nearest cell rather than a bilinear blend, unlike the wind. Capacity factor
 * varies by only a couple of percent across the whole country, well inside the
 * yield model's own uncertainty, so interpolating between cells would be
 * smoothing something that is already flat and would imply a precision the
 * model does not have.
 */
export function pvCellFor(
  clim: PvClimatology | null,
  lat: number,
  lon: number,
): PvCell | null {
  if (!clim) return null;
  let best: PvCell | null = null;
  let bestDist = Infinity;
  for (const [key, cell] of Object.entries(clim.cells)) {
    const [clat, clon] = key.split(",").map(Number);
    const d = (clat - lat) ** 2 + (clon - lon) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = cell;
    }
  }
  return best;
}

export function capacityFactor(cell: PvCell, mounting: Mounting): number {
  return mounting === "tracking" ? cell.cfTracking : cell.cf;
}

/** The capacity factor for one month, 0 for January. */
export function monthlyCapacityFactor(
  cell: PvCell,
  month: number,
  mounting: Mounting,
): number {
  const series = mounting === "tracking" ? cell.monthlyTracking : cell.monthly;
  return series[month] ?? capacityFactor(cell, mounting);
}

/** Mean capacity factor over a set of months, for a season. */
export function seasonCapacityFactor(
  cell: PvCell,
  months: readonly number[],
  mounting: Mounting,
): number {
  if (!months.length) return capacityFactor(cell, mounting);
  const sum = months.reduce(
    (t, m) => t + monthlyCapacityFactor(cell, m - 1, mounting),
    0,
  );
  return sum / months.length;
}

/**
 * Annual generation lost to a transmittance loss, in MWh.
 *
 * Assumes transmittance loss passes to power one for one. That is the usual
 * assumption and it is optimistic: a series string follows its worst cell, so
 * unevenly deposited dust costs more than its average transmittance suggests.
 * So this is a lower bound on the electrical loss for a given deposit.
 */
export function energyLossMwh(
  capacityMw: number,
  cf: number,
  lossPercent: number,
  hours = 8760,
): number {
  return capacityMw * cf * hours * (lossPercent / 100);
}

export function revenueLossUsd(energyMwh: number, tariffUsdPerKwh: number): number {
  return energyMwh * 1000 * tariffUsdPerKwh;
}

/** Annual generation at full output, MWh, for expressing a loss as a share. */
export function annualGenerationMwh(capacityMw: number, cf: number, hours = 8760): number {
  return capacityMw * cf * hours;
}

/**
 * Dust deposited on a horizontal surface from an airborne concentration.
 *
 * deposit [g/m2/yr] = concentration [ug/m3] * deposition velocity [m/s] * seconds
 *
 * The deposition velocity is the one number here that is not measured locally.
 * For the coarse mode of mineral dust over a flat surface the literature range
 * is roughly 0.5 to 3 cm/s, and 1 cm/s is the conventional working value. It is
 * exposed as an argument rather than buried, because the answer scales linearly
 * with it.
 *
 * This exists to separate two things the module was previously conflating. Dust
 * that settles on a panel arrives from two places: from the ground immediately
 * upwind, which treatment acts on, and from regional sources hundreds of
 * kilometres away, which it does not. Pricing only the first and presenting it
 * as the total makes the treatment look like it removes almost all soiling,
 * which contradicts what this project's own physics says.
 */
export const DEFAULT_DEPOSITION_VELOCITY_MS = 0.01;

export function depositionFromConcentration(
  concentrationUgM3: number,
  depositionVelocityMs = DEFAULT_DEPOSITION_VELOCITY_MS,
  seconds = 31_556_952,
): number {
  // ug/m3 -> g/m3 is 1e-6.
  return concentrationUgM3 * 1e-6 * depositionVelocityMs * seconds;
}
