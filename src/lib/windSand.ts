/**
 * Wind Pattern & Sand Impact Model (v0)
 * =====================================
 * A geographic hotspot → target dispersal estimate: given a sand-source "hotspot" and a
 * downwind "target" site, how much mobilized sand might plausibly reach the target?
 *
 * Ported from the team's `wind_sand_v0.py` prototype, which pulls two live public data sources
 * (Open-Meteo's ERA5 archive for a seasonal wind rose, and ISRIC SoilGrids for hotspot sand
 * content) and combines them with a deliberately naive exponential-decay transport estimate.
 * This file ports the two deterministic, offline pieces exactly (great-circle bearing/distance,
 * and the deposition-fraction formula) so the page can stay interactive without a live network
 * dependency; the live-data steps are represented by a clearly-labelled illustrative wind rose
 * (see REPRESENTATIVE_WIND_ROSE below) rather than fabricated as if they were the real ERA5 pull.
 *
 * HONESTY NOTE: this is explicitly a v0 placeholder, per the source script's own docstring, not a
 * real plume/dispersion model. Treat every number here as illustrative pending the full pipeline
 * (a live Open-Meteo pull + a proper transport model) described in the "Show the script" panel.
 */

export interface LatLon {
  name: string;
  lat: number;
  lon: number;
}

/** Example hotspot presets, known aeolian sand-source regions in the UAE. */
export const HOTSPOT_PRESETS: LatLon[] = [
  { name: "Liwa Desert (test hotspot)", lat: 23.13, lon: 53.78 },
  { name: "Sweihan Plain", lat: 24.47, lon: 55.35 },
  { name: "Al Khatim Dunes", lat: 23.85, lon: 54.9 },
];

/** Example target-site presets. */
export const TARGET_PRESETS: LatLon[] = [
  { name: "Abu Dhabi City (test target)", lat: 24.4539, lon: 54.3773 },
  { name: "Dubai", lat: 25.2048, lon: 55.2708 },
  { name: "Al Ain", lat: 24.2075, lon: 55.7447 },
];

/**
 * Great-circle bearing [deg, 0-360 from North] and distance [km] from point 1 to point 2.
 * Direct port of `bearing_and_distance()` in wind_sand_v0.py.
 */
export function bearingAndDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): { bearingDeg: number; distanceKm: number } {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const [lat1r, lon1r, lat2r, lon2r] = [lat1, lon1, lat2, lon2].map(toRad);
  const dlon = lon2r - lon1r;

  const x = Math.sin(dlon) * Math.cos(lat2r);
  const y =
    Math.cos(lat1r) * Math.sin(lat2r) -
    Math.sin(lat1r) * Math.cos(lat2r) * Math.cos(dlon);
  const bearingDeg = ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360;

  const a =
    Math.sin((lat2r - lat1r) / 2) ** 2 +
    Math.cos(lat1r) * Math.cos(lat2r) * Math.sin(dlon / 2) ** 2;
  const distanceKm = 2 * 6371 * Math.asin(Math.sqrt(a));

  return { bearingDeg, distanceKm };
}

/** 8-point compass, the sector width the interactive wind rose below buckets into (45° each). */
export const COMPASS_SECTORS = [
  "N",
  "NE",
  "E",
  "SE",
  "S",
  "SW",
  "W",
  "NW",
] as const;
export type CompassSector = (typeof COMPASS_SECTORS)[number];

/** Nearest compass sector for a bearing in degrees. */
export function sectorForBearing(bearingDeg: number): CompassSector {
  const idx = Math.round((((bearingDeg % 360) + 360) % 360) / 45) % 8;
  return COMPASS_SECTORS[idx];
}

/**
 * Illustrative Shamal-dominated wind rose (frequency + mean speed per 8-point sector), standing
 * in for the real per-sector ensemble the script builds from a year of Open-Meteo hourly data
 * (`seasonal_wind_rose()`). Frequencies sum to 1. Broadly shaped on the UAE's well-documented
 * NW Shamal regime; NOT a live ERA5 pull, swap in real per-sector numbers once you've run the
 * script against your own hotspot.
 */
export const REPRESENTATIVE_WIND_ROSE: Record<
  CompassSector,
  { freq: number; speedMs: number }
> = {
  N: { freq: 0.06, speedMs: 3.4 },
  NE: { freq: 0.05, speedMs: 3.1 },
  E: { freq: 0.04, speedMs: 2.8 },
  SE: { freq: 0.05, speedMs: 3.0 },
  S: { freq: 0.08, speedMs: 3.6 },
  SW: { freq: 0.1, speedMs: 4.2 },
  W: { freq: 0.12, speedMs: 4.8 },
  NW: { freq: 0.5, speedMs: 7.1 },
};

/** Representative sand content (%) at 0-5cm depth for an active dune hotspot (SoilGrids proxy). */
export const REPRESENTATIVE_SAND_PCT = 92;

export interface DepositionInputs {
  /** Fraction of loose topsoil at the hotspot assumed mobilized per event, the model's "slider". */
  erosionFraction: number;
  /** How often the wind blows toward the target's sector (0-1). */
  windFrequency: number;
  distanceKm: number;
  /** e-folding length scale for the naive downwind decay. */
  decayLengthKm: number;
}

export interface DepositionResult {
  distanceDecay: number;
  depositionFraction: number;
}

/**
 * VERY simple v0 placeholder: erosion_fraction × (frequency wind blows toward target) ×
 * exp(-distance / decay_length). Direct port of `estimate_deposition_fraction()`. Not a real
 * plume/dispersion model, a placeholder to get an end-to-end number flowing.
 */
export function estimateDeposition({
  erosionFraction,
  windFrequency,
  distanceKm,
  decayLengthKm,
}: DepositionInputs): DepositionResult {
  const distanceDecay = Math.exp(-distanceKm / decayLengthKm);
  const depositionFraction = erosionFraction * windFrequency * distanceDecay;
  return { distanceDecay, depositionFraction };
}
