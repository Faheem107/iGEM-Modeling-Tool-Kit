import { NextResponse } from "next/server";
import { buildUrls, mergeSeries, ATTRIBUTION } from "@/src/lib/liveFeed";

/**
 * Cached proxy for the Open-Meteo dust and wind feed.
 *
 * Open-Meteo's free tier is non-commercial and capped at 10,000 calls a day, so
 * upstream calls must not scale with visitors. CAMS global updates twice a day
 * and is 3-hourly, so a 30 minute cache loses nothing.
 */

export const revalidate = 1800;

const CACHE = new Map<string, { at: number; body: unknown }>();
const TTL_MS = 30 * 60 * 1000;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  // Round the key so nearby targets share a cache entry. CAMS global is 0.4 deg,
  // so 0.1 deg of key resolution is already finer than the data.
  const key = `${lat.toFixed(1)},${lon.toFixed(1)}`;
  const hit = CACHE.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return NextResponse.json(hit.body);
  }

  const { aq, wx } = buildUrls(lat, lon);
  try {
    const [aqRes, wxRes] = await Promise.all([
      fetch(aq, { next: { revalidate } }),
      fetch(wx, { next: { revalidate } }),
    ]);
    if (!aqRes.ok || !wxRes.ok) {
      return NextResponse.json(
        { error: `upstream ${aqRes.status}/${wxRes.status}` },
        { status: 502 },
      );
    }
    const [aqJson, wxJson] = await Promise.all([aqRes.json(), wxRes.json()]);
    const body = {
      latitude: aqJson.latitude ?? lat,
      longitude: aqJson.longitude ?? lon,
      points: mergeSeries(aqJson, wxJson),
      fetchedAt: new Date().toISOString(),
      attribution: ATTRIBUTION,
    };
    CACHE.set(key, { at: Date.now(), body });
    return NextResponse.json(body);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "live feed unavailable" },
      { status: 502 },
    );
  }
}
