/**
 * Live dust and wind feed, Open-Meteo.
 *
 * Verified 2026-08-18 by a live call over Abu Dhabi. See
 * DUST_EXPOSURE_DATA_SOURCES.md section 8.2.
 *
 *  - The variable is `dust`, in ug/m3, instantaneous, at 10 m.
 *  - ALWAYS pass domains=cams_global. The default `auto` may resolve to the
 *    Europe-only CAMS domain, which does not cover the Gulf and is not coupled
 *    to the global model.
 *  - The global domain is CAMS global at 0.4 degrees, 3-hourly, updated twice a day.
 *  - Free tier is non-commercial and capped at 10,000 calls a day, so requests go
 *    through our own route handler and are cached rather than fired per visitor.
 *  - Attribution to both CAMS and Open-Meteo is required and belongs in the UI.
 */

export const AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
export const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

export interface LiveDustPoint {
  time: string;
  /** Surface dust concentration, ug/m3. CAMS global. */
  dust: number | null;
  /** PM10, ug/m3. An independent cross-check on the dust field. */
  pm10: number | null;
  /** 10 m wind speed, m/s. */
  windSpeed: number | null;
  /** 10 m wind direction, degrees the wind blows FROM. */
  windDirection: number | null;
}

export interface LiveDustSeries {
  latitude: number;
  longitude: number;
  points: LiveDustPoint[];
  fetchedAt: string;
  attribution: string;
}

export const ATTRIBUTION =
  "Dust and air quality from CAMS via Open-Meteo. Wind from Open-Meteo. CC BY 4.0.";

/** Builds the two upstream URLs. Wind and air quality are separate endpoints. */
export function buildUrls(lat: number, lon: number, forecastDays = 3) {
  const aq = new URL(AIR_QUALITY_URL);
  aq.searchParams.set("latitude", String(lat));
  aq.searchParams.set("longitude", String(lon));
  aq.searchParams.set("hourly", "dust,pm10");
  aq.searchParams.set("domains", "cams_global"); // never rely on auto, see above
  aq.searchParams.set("forecast_days", String(forecastDays));

  const wx = new URL(FORECAST_URL);
  wx.searchParams.set("latitude", String(lat));
  wx.searchParams.set("longitude", String(lon));
  wx.searchParams.set("hourly", "wind_speed_10m,wind_direction_10m");
  wx.searchParams.set("wind_speed_unit", "ms");
  wx.searchParams.set("forecast_days", String(forecastDays));

  return { aq: aq.toString(), wx: wx.toString() };
}

/** Merges the two responses on their shared hourly time axis. */
export function mergeSeries(
  aq: Record<string, unknown>,
  wx: Record<string, unknown>,
): LiveDustPoint[] {
  const aqh = (aq?.hourly ?? {}) as Record<string, unknown[]>;
  const wxh = (wx?.hourly ?? {}) as Record<string, unknown[]>;
  const times = (aqh.time ?? []) as string[];
  const wxTimes = (wxh.time ?? []) as string[];
  const wxIndex = new Map(wxTimes.map((t, i) => [t, i]));

  return times.map((t, i) => {
    const j = wxIndex.get(t);
    const num = (v: unknown) => (typeof v === "number" ? v : null);
    return {
      time: t,
      dust: num(aqh.dust?.[i]),
      pm10: num(aqh.pm10?.[i]),
      windSpeed: j === undefined ? null : num(wxh.wind_speed_10m?.[j]),
      windDirection: j === undefined ? null : num(wxh.wind_direction_10m?.[j]),
    };
  });
}

/** Client helper. Calls our own cached route, never Open-Meteo directly. */
export async function fetchLiveDust(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<LiveDustSeries> {
  const res = await fetch(
    `/api/live-dust?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`,
    { signal },
  );
  if (!res.ok) throw new Error(`live feed failed: ${res.status}`);
  return res.json();
}
