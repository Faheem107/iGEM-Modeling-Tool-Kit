/**
 * Which source regions feed a given site, as percentages.
 *
 * Weight per region = Ginoux activity band x substrate dust emissivity x share
 * of the season's wind arriving from that bearing x distance decay.
 *
 * A screening ranking, not a transport simulation, and it covers SUSPENDED dust
 * only. The saltating sand that abrades and buries comes from within tens of
 * metres of the asset, which is why the Rub al Khali ranks low here while
 * remaining the dominant source of the sand that actually piles up.
 */

import { bearingDeg, haversineKm, sandblastEfficiency } from "./dustTransport";
import { ROSE_SECTORS } from "./windStats";

export interface SourcePolygon {
  properties: { source_type: "natural" | "anthro" | "hydro"; foo_threshold: number };
  geometry: { coordinates: number[][][] };
}

export interface SourceShare {
  /** A place name for the cluster, so the answer is readable. */
  region: string;
  sourceType: "natural" | "anthro" | "hydro";
  /** Share of this site's modelled suspended dust, percent. */
  percent: number;
  /** Distance from the cluster centre to the site, km. */
  distanceKm: number;
  /** Bearing the dust travels along, degrees from north. */
  bearingDeg: number;
  /** Fraction of the season's wind that blows along that bearing. */
  upwindFraction: number;
}

/** Coarse named regions, so a share reads as a place rather than a grid cell. */
const REGIONS: { name: string; latMin: number; latMax: number; lonMin: number; lonMax: number }[] = [
  { name: "Tigris and Euphrates flood plain", latMin: 29.5, latMax: 34.0, lonMin: 44.0, lonMax: 48.5 },
  { name: "Lower Mesopotamia and Kuwait", latMin: 28.0, latMax: 30.5, lonMin: 45.5, lonMax: 49.0 },
  { name: "Iranian Zagros foreland", latMin: 28.0, latMax: 33.0, lonMin: 48.0, lonMax: 54.0 },
  { name: "Eastern Province sand sheets", latMin: 24.0, latMax: 28.5, lonMin: 46.0, lonMax: 51.5 },
  { name: "Gulf coastal sabkha", latMin: 23.5, latMax: 27.0, lonMin: 50.0, lonMax: 53.5 },
  { name: "Rub al Khali", latMin: 17.5, latMax: 23.5, lonMin: 45.0, lonMax: 55.5 },
  { name: "Al Dhafra and the western UAE", latMin: 22.5, latMax: 25.0, lonMin: 51.5, lonMax: 54.5 },
  { name: "Eastern UAE and northern Oman", latMin: 22.5, latMax: 26.5, lonMin: 54.5, lonMax: 58.0 },
  { name: "Southern Iran coast", latMin: 25.5, latMax: 29.0, lonMin: 54.0, lonMax: 60.0 },
];

/**
 * Ginoux's frequency-of-occurrence band as a relative activity.
 *
 * The band IS a frequency in percent of days, so it is used directly. A 60
 * percent band is active six times as often as a 10 percent one.
 */
const bandStrength = (foo: number) => foo;

/**
 * Representative clay per Ginoux source tag, driving dust emissivity.
 *
 * Without this the Rub al Khali came out at 82% of Al Dhafra's dust and the
 * Tigris and Euphrates plain at 2%, inverting Hennen 2017. Sandblasting
 * efficiency goes as 10^(0.134*clay), a factor of ~258 between quartz dune sand
 * and clay-rich ground: a sand sea moves sand, not dust.
 *
 * Dune sand is 2% from Benaafi's petrography, not the ~20% SoilGrids returns
 * over UAE dunes. See DUST_EXPOSURE_MODULE_SPEC.md section 6.
 */
const SUBSTRATE_CLAY_PERCENT: Record<string, number> = {
  hydro: 20,     // ephemeral water bodies, clamped at Eq 3's validity limit
  anthro: 10,    // disturbed and agricultural ground
  natural: 2,    // sand seas, quartz arenite
};

const substrateEmissivity = (type: string) =>
  sandblastEfficiency(SUBSTRATE_CLAY_PERCENT[type] ?? 5).alpha;

/**
 * Distance decay for suspended dust, e-folding at 600 km.
 *
 * Set so both observed ranges stay appreciable: Khalaf & Al-Ajmi 1993 have
 * Kuwait's dust starting in southern Iraq, 300 to 500 km, and Hennen 2017 has
 * flood-plain dust across the whole Gulf, about 1000 km. A stand-in for
 * dilution and deposition, with no grain size in it.
 */
const REACH_KM = 600;
const reachFactor = (km: number) => Math.exp(-km / REACH_KM);

/** Ignore anything closer than this: at that range the mechanism is saltation,
 *  not suspension, and this function is not about saltation. */
const MIN_KM = 15;

function regionOf(lat: number, lon: number): string | null {
  for (const r of REGIONS) {
    if (lat >= r.latMin && lat <= r.latMax && lon >= r.lonMin && lon <= r.lonMax) {
      return r.name;
    }
  }
  return null;
}

/** Centroid of a polygon's outer ring. */
function centroid(poly: SourcePolygon): { lat: number; lon: number } {
  const ring = poly.geometry.coordinates[0];
  let lon = 0;
  let lat = 0;
  for (const [x, y] of ring) {
    lon += x;
    lat += y;
  }
  return { lat: lat / ring.length, lon: lon / ring.length };
}

/**
 * Wind run per sector: frequency x mean speed.
 *
 * Not the sector's Fryberger drift potential, which the rest of the module
 * uses. Q is a saltation quantity and is zero when no local hour lifts a grain,
 * which returned nothing at all for Ras Al Khaimah in July while dust plainly
 * still reaches it. This is dust already airborne, needing no threshold at the
 * receiving end.
 */
export function windRunPerSector(freq: number[], speed: number[]): number[] {
  return freq.map((f, i) => f * (speed[i] ?? 0));
}

/**
 * Share of arriving air from a bearing. Neighbouring sectors count half, so the
 * answer does not jump as a site moves a few kilometres.
 */
function upwindShare(windRun: number[] | null, bearingFromSite: number): number {
  if (!windRun || windRun.length !== ROSE_SECTORS) return 1 / ROSE_SECTORS;
  const width = 360 / ROSE_SECTORS;
  const i = Math.round(bearingFromSite / width) % ROSE_SECTORS;
  const prev = (i - 1 + ROSE_SECTORS) % ROSE_SECTORS;
  const next = (i + 1) % ROSE_SECTORS;
  const total = windRun.reduce((t, v) => t + v, 0) || 1;
  return (windRun[i] + 0.5 * windRun[prev] + 0.5 * windRun[next]) / (2 * total);
}

/**
 * Rank the source regions feeding one site.
 *
 * Checked against Khalaf & Al-Ajmi 1993, who record Kuwait's suspension dust as
 * "usually initiated in southern Iraq". Run for Kuwait City in July this gives
 * 93% from the north. Nothing was fitted to that.
 *
 * @param windRun 16-sector wind run, or null to weight all directions equally.
 */
export function attributeSources(
  sources: SourcePolygon[],
  siteLat: number,
  siteLon: number,
  windRun: number[] | null,
): SourceShare[] {
  const acc = new Map<string, {
    weight: number; type: Record<string, number>;
    distSum: number; bearSumX: number; bearSumY: number; upwindSum: number;
  }>();

  for (const poly of sources) {
    const c = centroid(poly);
    const region = regionOf(c.lat, c.lon);
    if (!region) continue;

    const km = haversineKm(siteLat, siteLon, c.lat, c.lon);
    if (km < MIN_KM) continue;

    // Bearing FROM the site TO the source: the direction the wind must come
    // from for that source to be upwind.
    const bearing = bearingDeg(siteLat, siteLon, c.lat, c.lon);
    const upwind = upwindShare(windRun, bearing);
    const weight =
      bandStrength(poly.properties.foo_threshold) *
      substrateEmissivity(poly.properties.source_type) *
      upwind *
      reachFactor(km);
    if (!(weight > 0)) continue;

    const entry = acc.get(region) ?? {
      weight: 0, type: {}, distSum: 0, bearSumX: 0, bearSumY: 0, upwindSum: 0,
    };
    entry.weight += weight;
    entry.type[poly.properties.source_type] =
      (entry.type[poly.properties.source_type] ?? 0) + weight;
    entry.distSum += km * weight;
    entry.bearSumX += Math.sin((bearing * Math.PI) / 180) * weight;
    entry.bearSumY += Math.cos((bearing * Math.PI) / 180) * weight;
    entry.upwindSum += upwind * weight;
    acc.set(region, entry);
  }

  const total = [...acc.values()].reduce((t, e) => t + e.weight, 0);
  if (total <= 0) return [];

  return [...acc.entries()]
    .map(([region, e]) => {
      const dominant = Object.entries(e.type).sort((a, b) => b[1] - a[1])[0][0];
      const bear = ((Math.atan2(e.bearSumX, e.bearSumY) * 180) / Math.PI + 360) % 360;
      return {
        region,
        sourceType: dominant as SourceShare["sourceType"],
        percent: (e.weight / total) * 100,
        distanceKm: e.distSum / e.weight,
        bearingDeg: bear,
        upwindFraction: e.upwindSum / e.weight,
      };
    })
    .sort((a, b) => b.percent - a.percent);
}
