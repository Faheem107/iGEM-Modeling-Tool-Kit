"""
Build a seasonal dust climatology for the Gulf.

The gap this closes
-------------------
The source polygons on the exposure map come from Ginoux et al. 2012, and for
the Middle East that file covers March to May only. Ginoux published one season
per region, chosen as that region's dust season, and no other season exists for
this part of the world. So the four season buttons changed the wind, the drift
direction and every number derived from them, while the coloured source areas
stayed exactly where they were in all four. A reader could reasonably conclude
the sources genuinely do not move, which is not what the literature says.

What this adds, and what it is not
----------------------------------
CAMS global surface dust concentration, averaged by calendar month. That is a
real seasonal signal: at Dubai it runs from about 72 ug/m3 in December to about
436 in July, a factor of six.

It is emphatically NOT an emission map. It says where dust IS in the air, not
where it left the ground, and those differ: dust raised over the Tigris and
Euphrates plain can be measured over the Gulf a day later. The Ginoux mask and
the MERRA-2 emission layer answer the emission question; this one answers the
exposure question. The UI has to keep them apart, because reading an airborne
concentration as a source is precisely the error DUST_EXPOSURE_MODULE_SPEC.md
section 7 warns against.

It is also a model field. CAMS assimilates satellite aerosol optical depth, so
it is observation-constrained, but the dust it reports at the surface is the
model's, not a measurement at that point.

Source
------
CAMS global via Open-Meteo's air quality archive. No key, no account. Verified
to return all twelve months back to 2020 for this region.

Run
---
    python3 scripts/fetch_cams_dust_climatology.py
"""

import json
import math
import pathlib
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = REPO / "public" / "data" / "cams_dust_climatology.json"
CACHE = REPO / ".cams_cache.json"

API = "https://air-quality-api.open-meteo.com/v1/air-quality"

# The exposure map's extent, from src/components/exposure/mapExtent.ts.
LON_MIN, LON_MAX, LAT_MIN, LAT_MAX = 44.0, 60.0, 16.0, 33.0
STEP = 1.0

START, END = "2020-01-01", "2024-12-31"

BATCH = 8
PAUSE_S = 12

MONTH_DAYS = (31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)


def grid_points():
    pts = []
    lat = LAT_MIN
    while lat <= LAT_MAX + 1e-9:
        lon = LON_MIN
        while lon <= LON_MAX + 1e-9:
            pts.append((round(lat, 3), round(lon, 3)))
            lon += STEP
        lat += STEP
    return pts


def fetch(points):
    qs = urllib.parse.urlencode({
        "latitude": ",".join(str(p[0]) for p in points),
        "longitude": ",".join(str(p[1]) for p in points),
        "start_date": START,
        "end_date": END,
        "hourly": "dust",
        "domains": "cams_global",
        "timezone": "UTC",
    })
    url = f"{API}?{qs}"
    for attempt in range(6):
        try:
            with urllib.request.urlopen(url, timeout=600) as fh:
                data = json.loads(fh.read().decode("utf-8"))
            return data if isinstance(data, list) else [data]
        except urllib.error.HTTPError as exc:
            wait = 300 if exc.code == 429 else 20 * (attempt + 1)
            print(f"    HTTP {exc.code}, waiting {wait}s", file=sys.stderr, flush=True)
            time.sleep(wait)
        except (urllib.error.URLError, ValueError, TimeoutError) as exc:
            wait = 20 * (attempt + 1)
            print(f"    retry in {wait}s, {exc}", file=sys.stderr, flush=True)
            time.sleep(wait)
    raise RuntimeError(
        f"Open-Meteo did not answer. Progress is cached in {CACHE.name}, so "
        "rerunning resumes rather than restarting."
    )


def monthly_stats(times, values):
    """Mean per calendar month, plus the spread between years.

    The spread is carried because a monthly mean on its own hides how variable
    a month is, and dust is very variable. July's mean is high because July has
    storms, not because July is uniformly dusty, and a UI that shows only the
    mean invites the reader to treat it as a typical day.
    """
    per_month_year = {}
    for t, v in zip(times, values):
        if v is None:
            continue
        month = int(t[5:7]) - 1
        year = int(t[0:4])
        per_month_year.setdefault((month, year), []).append(v)

    means, spreads = [], []
    for m in range(12):
        year_means = [
            sum(vals) / len(vals)
            for (mm, _yy), vals in per_month_year.items()
            if mm == m and vals
        ]
        if not year_means:
            means.append(None)
            spreads.append(None)
            continue
        mean = sum(year_means) / len(year_means)
        means.append(round(mean, 1))
        if len(year_means) > 1:
            var = sum((y - mean) ** 2 for y in year_means) / (len(year_means) - 1)
            spreads.append(round(math.sqrt(var), 1))
        else:
            spreads.append(None)
    return means, spreads


def main():
    points = grid_points()
    print(f"{len(points)} grid points, {START} to {END}")

    cells = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    if cells:
        print(f"  resuming, {len(cells)} points already cached")

    todo = [p for p in points if f"{p[0]},{p[1]}" not in cells]
    for i in range(0, len(todo), BATCH):
        batch = todo[i:i + BATCH]
        print(f"  {len(cells)} of {len(points)} done, fetching {len(batch)}", flush=True)
        blocks = fetch(batch)
        if len(blocks) != len(batch):
            raise RuntimeError(f"asked for {len(batch)} points, got {len(blocks)}")
        for (lat, lon), block in zip(batch, blocks):
            h = block["hourly"]
            means, spreads = monthly_stats(h["time"], h["dust"])
            cells[f"{lat},{lon}"] = {"monthly": means, "spread": spreads}
        CACHE.write_text(json.dumps(cells))
        time.sleep(PAUSE_S)

    # -- Checks. Nothing is written unless the field behaves the way three
    # -- independent published observations say Gulf dust behaves.
    problems = []

    filled = [c for c in cells.values() if all(v is not None for v in c["monthly"])]
    if len(filled) < 0.9 * len(points):
        problems.append(f"only {len(filled)} of {len(points)} cells have all twelve months")

    # 1. A summer maximum. Khalaf and Al-Ajmi 1993 measured Kuwaiti sand drift
    #    peaking May to August, and the Shamal is a summer phenomenon.
    peak_months = [c["monthly"].index(max(c["monthly"])) + 1 for c in filled]
    summer = sum(1 for m in peak_months if 5 <= m <= 8)
    if summer < 0.6 * len(filled):
        problems.append(
            f"only {summer} of {len(filled)} cells peak between May and August, "
            "which contradicts the measured Shamal season"
        )

    # 2. A real seasonal range. If the ratio were near 1 there would be no
    #    season to show and the layer would not be worth drawing.
    ratios = [max(c["monthly"]) / max(0.1, min(c["monthly"])) for c in filled]
    median_ratio = sorted(ratios)[len(ratios) // 2]
    if median_ratio < 1.8:
        problems.append(f"median summer to winter ratio only {median_ratio:.2f}, too flat to be a season")

    # 3. The Tigris and Euphrates plain should be dustier than the lower Gulf.
    #    Hennen 2017 attributes 37 percent of Middle East emission events to it
    #    and very few to the southern Arabian Peninsula.
    plain = cell_near(cells, 31.0, 47.0)
    lower_gulf = cell_near(cells, 24.0, 55.0)
    if plain and lower_gulf:
        plain_mean = sum(v for v in plain["monthly"] if v) / 12
        gulf_mean = sum(v for v in lower_gulf["monthly"] if v) / 12
        if plain_mean <= gulf_mean:
            problems.append(
                f"the Tigris and Euphrates plain ({plain_mean:.0f}) is not dustier than "
                f"the lower Gulf ({gulf_mean:.0f}), which contradicts Hennen 2017"
            )
        else:
            print(f"  flood plain {plain_mean:.0f} vs lower Gulf {gulf_mean:.0f} ug/m3, "
                  f"ratio {plain_mean / gulf_mean:.2f}")

    print(f"  {summer} of {len(filled)} cells peak in May to August")
    print(f"  median summer to winter ratio {median_ratio:.2f}")

    if problems:
        for p in problems:
            print(f"  FAIL {p}", file=sys.stderr)
        raise SystemExit("Refusing to write a dust field that contradicts the literature.")

    payload = {
        "provenance": {
            "source": "CAMS global via the Open-Meteo air quality archive, no key",
            "variable": "surface dust concentration, ug/m3",
            "period": f"{START} to {END}",
            "grid": f"{STEP} deg over {LON_MIN} to {LON_MAX} E, {LAT_MIN} to {LAT_MAX} N",
            "statistic": "mean by calendar month, with the standard deviation between "
                         "individual years as `spread`",
            "whatThisIsNot": (
                "This is where dust IS, not where it was emitted. Dust raised over the "
                "Tigris and Euphrates plain is measured over the Gulf a day later. Use "
                "the Ginoux mask and the MERRA-2 emission layer for the emission "
                "question. Reading an airborne concentration as a source is the error "
                "DUST_EXPOSURE_MODULE_SPEC.md section 7 warns against."
            ),
            "modelNote": (
                "CAMS assimilates satellite aerosol optical depth, so it is "
                "observation-constrained, but surface dust is the model's field rather "
                "than a measurement at that point."
            ),
            "checks": {
                "cellsPeakingMayToAugust": f"{summer} of {len(filled)}",
                "medianSummerWinterRatio": round(median_ratio, 2),
                "againstKhalafAlAjmi1993": "measured Kuwaiti drift peaks May to August",
                "againstHennen2017": "Tigris and Euphrates plain dominates Middle East dust",
            },
        },
        "step": STEP,
        "cells": cells,
    }
    OUT.write_text(json.dumps(payload), encoding="utf-8")
    CACHE.unlink(missing_ok=True)
    print(f"\nwrote {OUT.relative_to(REPO)}: {len(cells)} cells, "
          f"{OUT.stat().st_size // 1024} kB")


def cell_near(cells, lat, lon):
    best, bd = None, None
    for key, cell in cells.items():
        clat, clon = (float(v) for v in key.split(","))
        d = (clat - lat) ** 2 + (clon - lon) ** 2
        if bd is None or d < bd:
            best, bd = cell, d
    return best


if __name__ == "__main__":
    main()
