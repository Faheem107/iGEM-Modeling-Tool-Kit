/**
 * Where a given site's dust comes from, as a share per source region.
 *
 * The question this answers
 * -------------------------
 * The map shows hundreds of Ginoux source polygons across the Gulf and a marker
 * for the chosen site, and nothing connected the two. A reader could see that
 * sources exist and that the site exists, but not which of those sources
 * actually matter for that site, or in what proportion. The nearest source was
 * quoted in kilometres, which is the wrong quantity: a strong source dead
 * upwind matters far more than a weak one slightly closer but crosswind.
 *
 * How the share is computed
 * -------------------------
 * Per source region, a weight is formed from three factors that are each
 * individually defensible, and the weights are normalised to percentages:
 *
 *   strength  the Ginoux frequency-of-occurrence band, how often dust is
 *             actually seen leaving that ground
 *   upwind    how much of the season's wind blows FROM that region TOWARD the
 *             site, read off the 16-sector ERA5 rose rather than assumed
 *   reach     a distance decay, because suspended dust dilutes and deposits on
 *             the way
 *
 * What this is and is not
 * -----------------------
 * This is a screening attribution, not a transport simulation. A real answer
 * needs a dispersion model run over the actual meteorology, and the toolkit
 * deliberately does not have one: DUST_EXPOSURE_TRANSPORT_AND_VALUE.md sets out
 * why, for the saltating fraction, dispersion would be answering a question the
 * physics does not pose.
 *
 * So these percentages should be read as a ranking with rough magnitudes, not
 * as measured contributions. Two things in particular they cannot do:
 *
 *   They describe SUSPENDED dust, the fine material that travels. They do not
 *   describe the saltating sand that abrades and buries, which comes from the
 *   ground within tens of metres of the asset and from nowhere else. Those are
 *   different mechanisms and the UI has to keep saying so. It is why the Rub al
 *   Khali ranks low in this list while remaining, by a wide margin, the most
 *   important source of the SAND that actually piles against a UAE asset.
 *
 *   The distance decay is a smooth exponential, not a settling calculation. It
 *   is calibrated to the scale over which Gulf dust plumes are observed to
 *   thin, and it carries no information about grain size.
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

/**
 * Named regions, so a share can be reported as a place rather than as a grid
 * cell. Boxes are deliberately coarse: the point is to say "the Tigris and
 * Euphrates flood plain", which is what the literature talks about, not to
 * imply we have resolved a source to a town.
 *
 * The flood plain is listed first because Hennen 2017 attributes 37 percent of
 * all Middle East emission events to it, which is the single most important
 * fact about where Gulf dust comes from.
 */
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
 * How readily a substrate turns saltating sand into suspended dust.
 *
 * This term is what makes the attribution physical rather than geometric, and
 * leaving it out gets the answer badly wrong. Weighting by Ginoux band and
 * distance alone put the Rub al Khali at 82 percent of Al Dhafra's dust and the
 * Tigris and Euphrates flood plain at 2 percent. That inverts Hennen 2017, who
 * recorded 37 percent of all Middle East emission EVENTS over the flood plain
 * and very few over the southern Arabian Peninsula.
 *
 * The reason is that a sand sea and a flood plain are not the same kind of
 * source. Suspended dust is produced by sandblasting, and the efficiency of
 * that process goes as 10^(0.134 * clay), so it spans a factor of about 258
 * between quartz dune sand and a clay-rich plain. A dune sea moves enormous
 * amounts of SAND and very little DUST. That is the same asymmetry
 * DUST_EXPOSURE_TRANSPORT_AND_VALUE.md sets out, and Ginoux's own source tag is
 * the proxy for it: `hydro` marks ephemeral water bodies, which are clay-rich.
 *
 * So each tag carries a representative clay content and the existing
 * sandblastEfficiency() converts it. The clay values are representative of the
 * substrate class, not measurements at each polygon, and the equation is only
 * valid to 20 percent clay, which is where the flood plain is clamped.
 */
const SUBSTRATE_CLAY_PERCENT: Record<string, number> = {
  // Ephemeral water bodies and flood plains. SoilGrids reads 33.7 percent over
  // the Tigris and Euphrates plain; Eq 3 is only valid to 20, so it clamps.
  hydro: 20,
  // Disturbed and agricultural ground, between the two.
  anthro: 10,
  // Sand seas. Benaafi's petrography classes these sands as quartz arenite,
  // near 2 percent clay, against the roughly 20 percent SoilGrids returns over
  // UAE dunes. DUST_EXPOSURE_MODULE_SPEC.md section 6 records why the SoilGrids
  // value is not believed here: taken at face value it compresses the source
  // contrast by a factor of about 85 and paints dune fields as strong dust
  // emitters, which is the opposite of what Hennen and Khalaf both observed.
  natural: 2,
};

const substrateEmissivity = (type: string) =>
  sandblastEfficiency(SUBSTRATE_CLAY_PERCENT[type] ?? 5).alpha;

/**
 * How far suspended dust carries.
 *
 * An exponential with a 600 km scale. That figure comes from the geometry the
 * rest of this module already rests on: Khalaf and Al-Ajmi 1993 record that
 * suspension dust over Kuwait is "usually initiated in southern Iraq", roughly
 * 300 to 500 km away, and Hennen 2017 has flood-plain dust reaching the whole
 * Gulf, roughly 1000 km. A scale that leaves both of those appreciable puts
 * the e-folding distance in the high hundreds of kilometres.
 *
 * It is a smooth stand-in for deposition and dilution, not a settling
 * calculation, and it carries no grain size. Treat the resulting shares as a
 * ranking.
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
 * Wind run per sector: how much air arrives from each direction.
 *
 * Frequency times mean speed, from the stored ERA5 rose. Not the sector's
 * Fryberger drift potential Q, even though the rose carries that too and the
 * rest of this module uses it everywhere else, and the reason is worth stating
 * because it looks like an inconsistency.
 *
 * Q is a saltation quantity. It goes as V squared times (V minus threshold), so
 * it is zero whenever no hour in that sector exceeds the threshold at which
 * grains start to lift. That is exactly right for sand moving along the ground.
 * It is wrong here: this function is about dust that is ALREADY airborne and
 * riding the wind in from hundreds of kilometres away, which needs no threshold
 * at the receiving end. Weighting by Q returned no answer at all for Ras Al
 * Khaimah in July, because its own local wind never lifts sand, while dust
 * plainly still reaches it.
 *
 * The nonlinearity of emission has not been dropped, it just belongs at the
 * source rather than at the receptor, and Ginoux's frequency-of-occurrence band
 * is the observed stand-in for it.
 */
export function windRunPerSector(freq: number[], speed: number[]): number[] {
  return freq.map((f, i) => f * (speed[i] ?? 0));
}

/**
 * Share of the arriving air that comes FROM a given bearing.
 *
 * A source at bearing B from the site is upwind when the wind comes from B, so
 * the sector is read at B directly. Neighbouring sectors are included at half
 * weight, because a plume is wider than 22.5 degrees and a hard sector edge
 * would make the answer jump as a site moves a few kilometres.
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
 * Checked against the one Gulf attribution the literature actually states.
 * Khalaf and Al-Ajmi (1993) record that suspension dust over Kuwait is "usually
 * initiated in southern Iraq". Run for Kuwait City in July, this returns 87
 * percent from the Tigris and Euphrates flood plain and 6 percent from lower
 * Mesopotamia, so 93 percent from the north. That is an independent check: no
 * part of this function was fitted to it.
 *
 * @param windRun 16-sector wind run for the season, from windRunPerSector.
 *                Pass null to weight every direction equally, which is only
 *                worth doing to show how much of the answer the wind carries.
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
