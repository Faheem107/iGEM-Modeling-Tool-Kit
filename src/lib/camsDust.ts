/**
 * The seasonal dust climatology, read in the app.
 *
 * Built by scripts/fetch_cams_dust_climatology.py from CAMS global via
 * Open-Meteo. Monthly means over 2020 to 2024 on a 1 degree grid across the
 * Gulf, with the spread between individual years alongside each mean.
 *
 * What this is FOR, and the distinction the module depends on: this is the
 * regional dust that is already in the air and arrives at a site from hundreds
 * of kilometres away. The treatment does not reduce it. It is separated from
 * the dust raised on the treated patch precisely so the two are never added
 * together and then both claimed as addressable.
 *
 * It is also not an emission map. It says where dust IS, not where it left the
 * ground. See DUST_EXPOSURE_MODULE_SPEC.md section 7.
 */

export interface CamsCell {
  /** Twelve monthly means in ug/m3, January first. Null where a month is
   *  missing rather than zero, because zero is a claim. */
  monthly: (number | null)[];
  /** Standard deviation between individual years, same units. A monthly mean
   *  on its own hides how variable dust is: July is high because July has
   *  storms, not because every July day is dusty. */
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
 * Mean regional dust concentration at a site over a set of months.
 *
 * Months are 1-based, matching the season definitions in the workspace.
 * Returns null rather than 0 when there is no data, so the caller has to say
 * so rather than quietly pricing a site at zero dust.
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
