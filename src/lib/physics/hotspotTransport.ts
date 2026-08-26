/**
 * Hotspot to target site mass transport
 * =====================================
 *
 * The chain the two exposure modules run, once per hotspot, once per site.
 *
 *   Q      wind lifts sand at the hotspot            kg m⁻¹ s⁻¹
 *   F      = alpha(clay) x Q, the fine part that     kg m⁻² s⁻¹
 *          actually leaves the ground and travels
 *   M      = F x area x fraction eroded x seconds    kg per season
 *   frac   the share of M that settles on the site   dimensionless
 *   landed = M x frac                                kg per season
 *
 * Run twice, once with the bare threshold wind and once with the treated one,
 * and the difference is what the product does.
 *
 * What travels tens of kilometres is the fine material, not the sand grains.
 * Grains hop and land within tens of metres. Nothing here should be read as a
 * grain of sand flying from Iraq to Abu Dhabi.
 *
 * Sources
 *  - Chappell et al. 2024 GRL Eq 3, alpha = 10^(0.134 clay% - 6.0).
 *  - Ferguson & Church 2004, settling velocity, for the travel distance.
 *  - Ginoux et al. 2012 dust source mask, for where the hotspots are.
 */

import { bearingDeg, haversineKm, sandblastEfficiency, settlingVelocity } from "./dustTransport";
import { ROSE_SECTORS } from "./windStats";

/** Named regions, so a share reads as a place and not as a grid cell. */
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
 * Clay per Ginoux source tag, which sets how much fine material each kind of
 * ground gives up. Dune sand is 2 percent from Benaafi's petrography, not the
 * 20 percent SoilGrids returns over UAE dunes. Eq 3 is exponential in clay, so
 * that difference is a factor of about 250 and it decides the whole ranking.
 */
const SUBSTRATE_CLAY_PERCENT: Record<string, number> = {
  hydro: 20,
  anthro: 10,
  natural: 2,
};

/** Plume width. One rose sector, 22.5 degrees. */
const PLUME_SECTOR_RAD = (22.5 * Math.PI) / 180;

/** The size that travels. 10 micron, the coarse end of what stays airborne. */
const TRAVELLING_GRAIN_M = 10e-6;

/** Depth of air the plume mixes through. */
const MIXING_HEIGHT_M = 1000;

/** Closer than this and the mechanism is hopping sand, not a travelling plume. */
const MIN_KM = 15;

export interface HotspotPatch {
  region: string;
  sourceType: "natural" | "anthro" | "hydro";
  lat: number;
  lon: number;
  areaM2: number;
  /** Ginoux frequency of occurrence band, percent of days the source is active. */
  foo: number;
}

interface Ring {
  properties: { source_type: "natural" | "anthro" | "hydro"; foo_threshold: number };
  geometry: { coordinates: number[][][] };
}

function regionOf(lat: number, lon: number): string | null {
  for (const r of REGIONS) {
    if (lat >= r.latMin && lat <= r.latMax && lon >= r.lonMin && lon <= r.lonMax) return r.name;
  }
  return null;
}

/** Shoelace on the outer ring, with degrees converted to metres locally. */
function ringAreaM2(ring: number[][], lat: number): number {
  const mPerDegLat = 111_320;
  const mPerDegLon = mPerDegLat * Math.cos((lat * Math.PI) / 180);
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a / 2) * mPerDegLat * mPerDegLon;
}

/** Turn the Ginoux polygons into patches with a centre, an area and a name. */
export function buildHotspots(features: Ring[]): HotspotPatch[] {
  const out: HotspotPatch[] = [];
  for (const f of features) {
    const ring = f.geometry.coordinates[0];
    if (!ring || ring.length < 3) continue;
    let lon = 0;
    let lat = 0;
    for (const [x, y] of ring) {
      lon += x;
      lat += y;
    }
    lon /= ring.length;
    lat /= ring.length;
    const region = regionOf(lat, lon);
    if (!region) continue;
    out.push({
      region,
      sourceType: f.properties.source_type,
      lat,
      lon,
      areaM2: ringAreaM2(ring, lat),
      foo: f.properties.foo_threshold,
    });
  }
  return out;
}

/**
 * Share of the season's wind that carries material along one bearing.
 * Neighbouring sectors count half, so the answer does not jump when a site
 * moves a few kilometres.
 */
export function directionShare(windRun: number[] | null, bearingFromSite: number): number {
  if (!windRun || windRun.length !== ROSE_SECTORS) return 1 / ROSE_SECTORS;
  const width = 360 / ROSE_SECTORS;
  const i = Math.round(bearingFromSite / width) % ROSE_SECTORS;
  const prev = (i - 1 + ROSE_SECTORS) % ROSE_SECTORS;
  const next = (i + 1) % ROSE_SECTORS;
  const total = windRun.reduce((t, v) => t + v, 0) || 1;
  return (windRun[i] + 0.5 * windRun[prev] + 0.5 * windRun[next]) / (2 * total);
}

/** A 16 sector wind run with all of the weight in the sector the wind blows from. */
export function singleDirectionRun(directionFromDeg: number): number[] {
  const run = new Array(ROSE_SECTORS).fill(0);
  const width = 360 / ROSE_SECTORS;
  const i = Math.round(((directionFromDeg % 360) + 360) % 360 / width) % ROSE_SECTORS;
  run[i] = 1;
  return run;
}

/**
 * How far the plume carries before the fine material has settled out.
 * U x H / v_s, the distance a particle travels while falling the mixing depth.
 */
export function depositionLengthM(windSpeed: number): number {
  const vs = settlingVelocity(TRAVELLING_GRAIN_M);
  return (Math.max(windSpeed, 0.5) * MIXING_HEIGHT_M) / vs;
}

export interface TransportInputs {
  hotspots: HotspotPatch[];
  siteLat: number;
  siteLon: number;
  /** Mean saltation flux at a hotspot, kg m⁻¹ s⁻¹, for a threshold wind at 10 m. */
  flux: (lat: number, lon: number, uThresholdFree: number) => number;
  /** 16 sector wind run at the site, or null to weight every direction equally. */
  windRun: number[] | null;
  /** Wind speed used for the plume length, m/s. */
  transportWind: number;
  /** Length of the window the mass is accumulated over, seconds. */
  windowSeconds: number;
  /** Assumed share of each hotspot's topsoil that is loose enough to erode. */
  erodibleFraction: number;
  /** Area of ground at the target site that catches the deposit, m². */
  siteAreaM2: number;
  /** Threshold wind at 10 m for bare ground, m/s. */
  utFreeUntreated: number;
  /** The same once the crust adds cohesion, m/s. */
  utFreeTreated: number;
  /** How much hotspot ground the product covers, m². Spent on the worst first. */
  treatedAreaM2: number;
}

export interface HotspotShare {
  region: string;
  sourceType: "natural" | "anthro" | "hydro";
  /** Share of what lands at the site, percent. */
  percent: number;
  distanceKm: number;
  /** Bearing the material travels along, degrees from north. */
  bearingDeg: number;
  landedKg: number;
  treatedLandedKg: number;
  /** Share of this region's hotspot ground the treatment budget covered. */
  treatedShare: number;
}

export interface TransportResult {
  shares: HotspotShare[];
  /** Mass leaving all hotspots over the window, kg. */
  emittedKg: number;
  /** Mass settling on the site over the window, kg. */
  landedKg: number;
  treatedLandedKg: number;
  /** landedKg / emittedKg. */
  landingFraction: number;
  /** landedKg per square metre of the site, g m⁻². */
  depositGm2: number;
  /** 1 - treated/untreated, or null when nothing moves either way. */
  reduction: number | null;
  /** Plume length used, km. */
  reachKm: number;
  /** Hotspot ground the budget actually covered, m². */
  treatedAreaUsedM2: number;
  /** Hotspot ground in range of this site, m². */
  hotspotAreaM2: number;
}

/**
 * Run the chain for one site.
 *
 * Treated area is spent on the hotspots that deliver the most to this site
 * first, which is what an operator would do and which makes the reduction fall
 * off as the budget runs out.
 */
export function transportToSite(inp: TransportInputs): TransportResult {
  const {
    hotspots, siteLat, siteLon, flux, windRun, transportWind, windowSeconds,
    erodibleFraction, siteAreaM2, utFreeUntreated, utFreeTreated, treatedAreaM2,
  } = inp;

  const L = depositionLengthM(transportWind);

  type Row = {
    patch: HotspotPatch;
    distanceKm: number;
    bearingDeg: number;
    landingFraction: number;
    emittedBare: number;
    emittedCrust: number;
    landedBare: number;
  };

  const rows: Row[] = [];
  for (const h of hotspots) {
    const km = haversineKm(siteLat, siteLon, h.lat, h.lon);
    if (km < MIN_KM) continue;

    // Bearing from the site to the hotspot is the direction the wind has to
    // come from for that hotspot to be upwind.
    const fromSite = bearingDeg(siteLat, siteLon, h.lat, h.lon);
    const share = directionShare(windRun, fromSite);
    const d = km * 1000;

    // Only the part of the season's wind pointing at the site carries anything
    // here, and that part spreads across a sector arc of width theta at range
    // d while it deposits along the way.
    const landingFraction =
      (share * siteAreaM2 * Math.exp(-d / L)) / (L * PLUME_SECTOR_RAD * d);
    if (!(landingFraction > 0)) continue;

    const clay = SUBSTRATE_CLAY_PERCENT[h.sourceType] ?? 5;
    const alpha = sandblastEfficiency(clay).alpha;
    // The Ginoux band is the percent of days the source is active, so it scales
    // the time the hotspot spends emitting at all.
    const duty = h.foo / 100;

    const perArea = (ut: number) =>
      alpha * flux(h.lat, h.lon, ut) * duty * erodibleFraction * windowSeconds;

    const emittedBare = perArea(utFreeUntreated) * h.areaM2;
    const emittedCrust = perArea(utFreeTreated) * h.areaM2;

    rows.push({
      patch: h,
      distanceKm: km,
      bearingDeg: (fromSite + 180) % 360,
      landingFraction,
      emittedBare,
      emittedCrust,
      landedBare: emittedBare * landingFraction,
    });
  }

  // Spend the treatment on what delivers most to this site.
  rows.sort((a, b) => b.landedBare - a.landedBare);
  let budget = Math.max(treatedAreaM2, 0);
  const treatedShareOf = new Map<Row, number>();
  for (const r of rows) {
    const covered = Math.min(budget, r.patch.areaM2);
    treatedShareOf.set(r, r.patch.areaM2 > 0 ? covered / r.patch.areaM2 : 0);
    budget -= covered;
    if (budget <= 0) break;
  }
  const treatedAreaUsedM2 = Math.max(treatedAreaM2, 0) - Math.max(budget, 0);

  const acc = new Map<string, {
    sourceType: Record<string, number>;
    landed: number; treatedLanded: number;
    distSum: number; bearX: number; bearY: number;
    area: number; treatedArea: number;
  }>();

  let emittedKg = 0;
  let landedKg = 0;
  let treatedLandedKg = 0;
  let hotspotAreaM2 = 0;

  for (const r of rows) {
    const t = treatedShareOf.get(r) ?? 0;
    const emitted = r.emittedBare * (1 - t) + r.emittedCrust * t;
    const landed = r.landedBare;
    const treatedLanded = emitted * r.landingFraction;

    emittedKg += r.emittedBare;
    landedKg += landed;
    treatedLandedKg += treatedLanded;
    hotspotAreaM2 += r.patch.areaM2;

    const e = acc.get(r.patch.region) ?? {
      sourceType: {}, landed: 0, treatedLanded: 0,
      distSum: 0, bearX: 0, bearY: 0, area: 0, treatedArea: 0,
    };
    e.sourceType[r.patch.sourceType] = (e.sourceType[r.patch.sourceType] ?? 0) + landed;
    e.landed += landed;
    e.treatedLanded += treatedLanded;
    e.distSum += r.distanceKm * landed;
    e.bearX += Math.sin((r.bearingDeg * Math.PI) / 180) * landed;
    e.bearY += Math.cos((r.bearingDeg * Math.PI) / 180) * landed;
    e.area += r.patch.areaM2;
    e.treatedArea += r.patch.areaM2 * t;
    acc.set(r.patch.region, e);
  }

  const shares: HotspotShare[] = [...acc.entries()]
    .filter(([, e]) => e.landed > 0)
    .map(([region, e]) => {
      const dominant = Object.entries(e.sourceType).sort((a, b) => b[1] - a[1])[0][0];
      return {
        region,
        sourceType: dominant as HotspotShare["sourceType"],
        percent: landedKg > 0 ? (e.landed / landedKg) * 100 : 0,
        distanceKm: e.distSum / e.landed,
        bearingDeg: ((Math.atan2(e.bearX, e.bearY) * 180) / Math.PI + 360) % 360,
        landedKg: e.landed,
        treatedLandedKg: e.treatedLanded,
        treatedShare: e.area > 0 ? e.treatedArea / e.area : 0,
      };
    })
    .sort((a, b) => b.percent - a.percent);

  return {
    shares,
    emittedKg,
    landedKg,
    treatedLandedKg,
    landingFraction: emittedKg > 0 ? landedKg / emittedKg : 0,
    depositGm2: siteAreaM2 > 0 ? (landedKg * 1000) / siteAreaM2 : 0,
    reduction: landedKg > 0 ? 1 - treatedLandedKg / landedKg : null,
    reachKm: L / 1000,
    treatedAreaUsedM2,
    hotspotAreaM2,
  };
}
