/**
 * PV yield and capacity factor in the app. Mirror of python_models/pv.py.
 *
 * The hourly yield model runs once in scripts/fetch_pv_climatology.py and ships
 * as public/data/uae_pv_climatology.json. This samples that grid and carries the
 * result through to money.
 *
 * The shipped capacity factor is for CLEAN glass. Soiling is computed elsewhere
 * in this module and subtracted downstream, not baked in twice.
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
 * Nearest cell, not a bilinear blend as the wind uses. Capacity factor varies by
 * a couple of percent nationally, inside the model's own uncertainty, so
 * interpolating would imply precision that is not there.
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
 * Generation lost to a transmittance loss, MWh/yr.
 *
 * Assumes light loss passes to power one for one. Optimistic: a series string
 * follows its worst cell, so uneven dust costs more. A lower bound.
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
 * Deposit from an airborne concentration: conc x deposition velocity x time.
 *
 * Deposition velocity is the unmeasured number here. Coarse mineral dust runs
 * 0.5 to 3 cm/s in the literature; 1 cm/s is conventional. Exposed as an
 * argument because the answer scales linearly with it.
 *
 * Exists to keep regional dust, which treatment cannot reduce, separate from
 * dust raised on the treated patch, which it can.
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
