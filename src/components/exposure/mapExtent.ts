/**
 * The map extent and its projection, kept in their own module.
 *
 * ExposureMap is a client component, and the wind-field API route needs the
 * same extent on the server. Importing the component from a route handler would
 * drag the whole React tree in, so the geometry lives here and both sides
 * import it.
 *
 * The projection is equirectangular with the standard parallel at the middle of
 * the extent: a degree of longitude is drawn cos(lat) times a degree of
 * latitude. Without that factor the Gulf is stretched about 9 percent across.
 */

export const EXTENT = { lonMin: 44, lonMax: 60, latMin: 16, latMax: 33 } as const;

export const W = 800;

const LAT_MID = (EXTENT.latMin + EXTENT.latMax) / 2;
const COS_MID = Math.cos((LAT_MID * Math.PI) / 180);

export const H = Math.round(
  (W * (EXTENT.latMax - EXTENT.latMin)) /
    ((EXTENT.lonMax - EXTENT.lonMin) * COS_MID),
);

export const project = (lon: number, lat: number) => ({
  x: ((lon - EXTENT.lonMin) / (EXTENT.lonMax - EXTENT.lonMin)) * W,
  y: ((EXTENT.latMax - lat) / (EXTENT.latMax - EXTENT.latMin)) * H,
});

/** Inverse of `project`, used to advect particles in lon/lat. */
export const unproject = (x: number, y: number) => ({
  lon: EXTENT.lonMin + (x / W) * (EXTENT.lonMax - EXTENT.lonMin),
  lat: EXTENT.latMax - (y / H) * (EXTENT.latMax - EXTENT.latMin),
});
