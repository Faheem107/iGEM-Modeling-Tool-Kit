import { NextResponse } from "next/server";
import {
  buildWindFieldUrl,
  liveGridPoints,
  toUV,
  LIVE_GRID,
  WIND_FIELD_ATTRIBUTION,
  type WindFieldResponse,
} from "@/src/lib/windField";
import { EXTENT } from "@/src/components/exposure/mapExtent";

/**
 * Cached proxy for the live 10 m wind grid the exposure map animates.
 *
 * Open-Meteo's free tier is non-commercial and counts each location in a
 * multi-point call separately, so one visitor loading a 90 point grid is 90
 * calls against a 10,000 a day limit. An hour of cache holds the whole site to
 * about 2,200 a day however many people visit, and the surface wind field does
 * not meaningfully change inside an hour at this grid spacing.
 */

export const revalidate = 3600;

const TTL_MS = 60 * 60 * 1000;
let cache: { at: number; body: WindFieldResponse } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json(cache.body);
  }

  const { lats, lons } = liveGridPoints(EXTENT);
  try {
    const res = await fetch(buildWindFieldUrl(lats, lons), { next: { revalidate } });
    if (!res.ok) {
      return NextResponse.json({ error: `upstream ${res.status}` }, { status: 502 });
    }
    const raw = await res.json();
    const locations: Record<string, unknown>[] = Array.isArray(raw) ? raw : [raw];

    const u: number[] = [];
    const v: number[] = [];
    let validAt: string | null = null;
    for (const loc of locations) {
      const cur = (loc?.current ?? {}) as Record<string, unknown>;
      const speed = typeof cur.wind_speed_10m === "number" ? cur.wind_speed_10m : 0;
      const dir = typeof cur.wind_direction_10m === "number" ? cur.wind_direction_10m : 0;
      const c = toUV(speed, dir);
      u.push(+c.u.toFixed(2));
      v.push(+c.v.toFixed(2));
      if (!validAt && typeof cur.time === "string") validAt = cur.time;
    }

    // A short response means the grid is incomplete; a partly-zero field would
    // animate as a dead patch with nothing saying why.
    if (u.length !== LIVE_GRID.nx * LIVE_GRID.ny) {
      return NextResponse.json(
        { error: `upstream returned ${u.length} of ${LIVE_GRID.nx * LIVE_GRID.ny} points` },
        { status: 502 },
      );
    }

    const body: WindFieldResponse = {
      nx: LIVE_GRID.nx,
      ny: LIVE_GRID.ny,
      lonMin: EXTENT.lonMin,
      lonMax: EXTENT.lonMax,
      latMin: EXTENT.latMin,
      latMax: EXTENT.latMax,
      u,
      v,
      validAt,
      fetchedAt: new Date().toISOString(),
      attribution: WIND_FIELD_ATTRIBUTION,
    };
    cache = { at: Date.now(), body };
    return NextResponse.json(body);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "wind field unavailable" },
      { status: 502 },
    );
  }
}
