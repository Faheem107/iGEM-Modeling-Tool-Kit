/**
 * The 10 m wind vector field the exposure map animates.
 *
 * Two sources feed the same shape, and the UI must always say which one is on
 * screen, because they are different quantities:
 *
 *  - LIVE: one instantaneous field from Open-Meteo, this hour.
 *  - SEASONAL: the mean vector wind for a calendar month, from the ERA5
 *    climatology in public/data/era5_wind_climatology.json. A monthly mean
 *    vector is weaker than the typical wind whenever direction varies, so it
 *    describes the prevailing drift, not the strength of any given day. The
 *    strength that matters for sand is the Weibull fit, not this.
 *
 * Reference height is 10 m throughout, matching AEOLIAN_CALIB.uStarRatio.
 * Wind direction follows the meteorological convention: the bearing the wind
 * blows FROM. u is eastward, v is northward.
 */

export const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

export const WIND_FIELD_ATTRIBUTION =
  "Live wind from Open-Meteo. Seasonal wind from ERA5 via the Open-Meteo archive. CC BY 4.0.";

/** A regular lon/lat grid of wind vectors, row-major from the NORTH-WEST corner. */
export interface WindField {
  lonMin: number;
  lonMax: number;
  latMin: number;
  latMax: number;
  nx: number;
  ny: number;
  /** Eastward component, m/s. Length nx*ny. */
  u: Float32Array;
  /** Northward component, m/s. Length nx*ny. */
  v: Float32Array;
}

/** Speed and bearing-from, to a vector pair. */
export function toUV(speed: number, directionFromDeg: number) {
  const r = (directionFromDeg * Math.PI) / 180;
  return { u: -speed * Math.sin(r), v: -speed * Math.cos(r) };
}

/** Vector pair back to the bearing the wind blows FROM, in degrees. */
export function toDirectionFrom(u: number, v: number) {
  return (270 - (Math.atan2(v, u) * 180) / Math.PI) % 360;
}

/**
 * Bilinear sample. Returns zero outside the grid so particles simply stall at
 * the edge rather than jumping on a wrapped index.
 */
export function sampleField(f: WindField, lon: number, lat: number) {
  const gx = ((lon - f.lonMin) / (f.lonMax - f.lonMin)) * (f.nx - 1);
  const gy = ((f.latMax - lat) / (f.latMax - f.latMin)) * (f.ny - 1);
  if (gx < 0 || gy < 0 || gx > f.nx - 1 || gy > f.ny - 1) return { u: 0, v: 0 };

  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const x1 = Math.min(x0 + 1, f.nx - 1);
  const y1 = Math.min(y0 + 1, f.ny - 1);
  const fx = gx - x0;
  const fy = gy - y0;

  const at = (x: number, y: number) => y * f.nx + x;
  const mix = (a: number, b: number, c: number, d: number) =>
    (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;

  return {
    u: mix(f.u[at(x0, y0)], f.u[at(x1, y0)], f.u[at(x0, y1)], f.u[at(x1, y1)]),
    v: mix(f.v[at(x0, y0)], f.v[at(x1, y0)], f.v[at(x0, y1)], f.v[at(x1, y1)]),
  };
}

// ---------------------------------------------------------------------------
// Live grid
// ---------------------------------------------------------------------------

/**
 * The live grid is coarser than the climatology on purpose. Open-Meteo's free
 * tier is non-commercial and counts each location separately, so a 9x10 grid
 * behind a one hour cache costs about 2,200 location-calls a day against a
 * 10,000 limit however many people visit. The field is smooth at this scale;
 * a finer grid would buy nothing visible.
 */
export const LIVE_GRID = { nx: 9, ny: 10 } as const;

export function liveGridPoints(
  extent: { lonMin: number; lonMax: number; latMin: number; latMax: number },
) {
  const lats: number[] = [];
  const lons: number[] = [];
  for (let j = 0; j < LIVE_GRID.ny; j++) {
    for (let i = 0; i < LIVE_GRID.nx; i++) {
      lons.push(
        +(extent.lonMin +
          (i * (extent.lonMax - extent.lonMin)) / (LIVE_GRID.nx - 1)).toFixed(3),
      );
      lats.push(
        +(extent.latMax -
          (j * (extent.latMax - extent.latMin)) / (LIVE_GRID.ny - 1)).toFixed(3),
      );
    }
  }
  return { lats, lons };
}

/** Upstream URL for one multi-point current-conditions call. */
export function buildWindFieldUrl(lats: number[], lons: number[]) {
  const u = new URL(FORECAST_URL);
  u.searchParams.set("latitude", lats.join(","));
  u.searchParams.set("longitude", lons.join(","));
  u.searchParams.set("current", "wind_speed_10m,wind_direction_10m");
  u.searchParams.set("wind_speed_unit", "ms");
  return u.toString();
}

export interface WindFieldResponse {
  nx: number;
  ny: number;
  lonMin: number;
  lonMax: number;
  latMin: number;
  latMax: number;
  /** Flat row-major arrays, north-west first. */
  u: number[];
  v: number[];
  /** ISO timestamp the upstream data is valid for. */
  validAt: string | null;
  fetchedAt: string;
  attribution: string;
}

/** Turns the API response into the typed-array field the canvas advects. */
export function toWindField(r: WindFieldResponse): WindField {
  return {
    lonMin: r.lonMin, lonMax: r.lonMax, latMin: r.latMin, latMax: r.latMax,
    nx: r.nx, ny: r.ny,
    u: Float32Array.from(r.u), v: Float32Array.from(r.v),
  };
}

// ---------------------------------------------------------------------------
// Seasonal grid, from the ERA5 climatology
// ---------------------------------------------------------------------------

export interface Climatology {
  metadata: Record<string, unknown>;
  lon: number[];
  lat: number[];
  cells: Record<
    string,
    {
      months: Record<string, { A: number; k: number; u: number; v: number }>;
      /** [frequency[16], meanSpeed[16], fryberger Q[16]] per month, where stored. */
      rose?: Record<string, [number[], number[], number[]]>;
    }
  >;
}

/** Mean vector wind for one calendar month, as a field the canvas can advect. */
export function climatologyField(c: Climatology, month: number): WindField {
  const nx = c.lon.length;
  const ny = c.lat.length;
  const u = new Float32Array(nx * ny);
  const v = new Float32Array(nx * ny);
  // The file indexes lat ascending; the field is row-major from the north.
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const cell = c.cells[`${i},${j}`];
      const m = cell?.months[String(month)];
      const row = ny - 1 - j;
      u[row * nx + i] = m ? m.u : 0;
      v[row * nx + i] = m ? m.v : 0;
    }
  }
  return {
    lonMin: c.lon[0], lonMax: c.lon[nx - 1],
    latMin: c.lat[0], latMax: c.lat[ny - 1],
    nx, ny, u, v,
  };
}

/** Index of the climatology cell nearest a point, or null if none is stored. */
export function nearestCell(c: Climatology, lon: number, lat: number) {
  let bi = -1;
  let bj = -1;
  let best = Infinity;
  for (let j = 0; j < c.lat.length; j++) {
    for (let i = 0; i < c.lon.length; i++) {
      if (!c.cells[`${i},${j}`]) continue;
      const d = (c.lon[i] - lon) ** 2 + (c.lat[j] - lat) ** 2;
      if (d < best) { best = d; bi = i; bj = j; }
    }
  }
  return bi < 0 ? null : { key: `${bi},${bj}`, lon: c.lon[bi], lat: c.lat[bj] };
}
