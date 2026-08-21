/**
 * Seasonal dust climatology, read in the app.
 *
 * CAMS global monthly means 2020-2024 on a 1 degree Gulf grid, built by
 * scripts/fetch_cams_dust_climatology.py.
 *
 * This is the regional dust arriving from hundreds of kilometres away, which
 * treatment does not reduce. Kept separate from dust raised on the treated
 * patch so the two are never both claimed as addressable.
 *
 * Not an emission map: it says where dust IS, not where it left the ground.
 */

export interface CamsCell {
  /** Twelve monthly means, ug/m3, January first. Null, not 0, when missing. */
  monthly: (number | null)[];
  /** Between-year standard deviation. July is high because July has storms,
   *  not because every July day is dusty. */
  spread: (number | null)[];
}

export interface CamsClimatology {
  provenance: Record<string, unknown>;
  step: number;
  cells: Record<string, CamsCell>;
}

/** Nearest grid cell to a point, or null if the file is not loaded. */
export function camsCellFor(
  clim: CamsClimatology | null,
  lat: number,
  lon: number,
): CamsCell | null {
  if (!clim) return null;
  let best: CamsCell | null = null;
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

/**
 * Mean regional dust over a set of 1-based months. Null, not 0, when absent, so
 * a caller cannot quietly price a site at zero dust.
 */
export function camsFor(
  clim: CamsClimatology | null,
  lat: number,
  lon: number,
  months: readonly number[],
): number | null {
  const cell = camsCellFor(clim, lat, lon);
  if (!cell) return null;
  const vals = months
    .map((m) => cell.monthly[m - 1])
    .filter((v): v is number => typeof v === "number");
  if (!vals.length) return null;
  return vals.reduce((t, v) => t + v, 0) / vals.length;
}

/** The between-year spread over the same months, for saying how variable it is. */
export function camsSpreadFor(
  clim: CamsClimatology | null,
  lat: number,
  lon: number,
  months: readonly number[],
): number | null {
  const cell = camsCellFor(clim, lat, lon);
  if (!cell) return null;
  const vals = months
    .map((m) => cell.spread[m - 1])
    .filter((v): v is number => typeof v === "number");
  if (!vals.length) return null;
  return vals.reduce((t, v) => t + v, 0) / vals.length;
}
