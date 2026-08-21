"""
Fit the monthly wind climatology the exposure module runs on.

What this builds
----------------
`public/data/era5_wind_climatology.json`: for every cell of a 1 degree grid over
the Gulf, and for each calendar month, the Weibull wind speed distribution, the
mean vector wind, and (inside the UAE working box) a 16 sector wind rose.

Why a distribution and not a mean
---------------------------------
Saltation flux goes as roughly the cube of friction velocity above a threshold,
so the flux of the mean wind is NOT the mean of the flux. A month that is calm
for 28 days and strong for 2 moves nearly all of its sand on those 2 days. The
site therefore integrates the Bagnold law over a fitted Weibull rather than
evaluating it at an average. See DUST_EXPOSURE_MODULE_SPEC.md section 3, and
src/lib/physics/windStats.ts for the closed form that consumes A and k.

Source
------
ERA5 hourly 10 m wind, served by the Open-Meteo historical archive
(https://archive-api.open-meteo.com, `models=era5`). Same reanalysis as the
Copernicus CDS, without the request queue, and no API key. Open-Meteo data is
CC BY 4.0 and ERA5 carries the Copernicus licence; both need attribution.

Reference height is 10 m and this is load-bearing. AEOLIAN_CALIB.uStarRatio =
0.03 corresponds to a 10 m wind. Substituting a 2 m or 50 m source silently
breaks the flux model.

Run
---
    python scripts/fit_era5_weibull.py            # fetch, fit, write
    python scripts/fit_era5_weibull.py --validate # re-check an existing file

Raw responses are cached per batch, so an interrupted run resumes cheaply.
"""

import argparse
import json
import math
import pathlib
import sys
import time
import urllib.error
import urllib.request

import numpy as np
from scipy.stats import weibull_min

ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"

# Map extent, matching EXTENT in src/components/exposure/ExposureMap.tsx.
LON_MIN, LON_MAX = 44.0, 60.0
LAT_MIN, LAT_MAX = 16.0, 33.0
STEP = 1.0

# The rose is only stored where the model actually reads it. Sixteen sectors for
# 306 cells would triple the file for data no screen shows.
UAE_BOX = (51.0, 57.0, 22.0, 27.0)

START, END = "2022-01-01", "2024-12-31"
BATCH = 20
N_SECTORS = 16

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
OUT = ROOT / "public" / "data" / "era5_wind_climatology.json"
CACHE = ROOT / ".era5_cache"

# Khalaf & Al-Ajmi (1993), Geomorphology 6, 111-134, measured in Kuwait.
# These are the two numbers the fit has to survive before it ships.
GULF_IMPACT_THRESHOLD_MS = 5.4
KUWAIT = (47.8, 29.3)
KUWAIT_DRIFT_PEAK_MONTHS = {5, 6, 7, 8}      # May to August
KUWAIT_DRIFT_TOWARD_DEG = 135.0              # southeast
KNOTS_PER_MS = 1.943844


def grid():
    lons = [round(LON_MIN + i * STEP, 3)
            for i in range(int((LON_MAX - LON_MIN) / STEP) + 1)]
    lats = [round(LAT_MIN + j * STEP, 3)
            for j in range(int((LAT_MAX - LAT_MIN) / STEP) + 1)]
    return lons, lats


def in_uae_box(lon, lat):
    a, b, c, d = UAE_BOX
    return a <= lon <= b and c <= lat <= d


def fetch_batch(cells, attempt=1):
    """One archive call for up to BATCH paired coordinates, cached on disk."""
    CACHE.mkdir(exist_ok=True)
    key = f"{cells[0][0]}_{cells[0][1]}_{len(cells)}_{START}_{END}.json"
    cached = CACHE / key
    if cached.exists():
        return json.loads(cached.read_text())

    lats = ",".join(str(c[1]) for c in cells)
    lons = ",".join(str(c[0]) for c in cells)
    url = (f"{ARCHIVE_URL}?latitude={lats}&longitude={lons}"
           f"&start_date={START}&end_date={END}"
           f"&hourly=wind_speed_10m,wind_direction_10m"
           f"&wind_speed_unit=ms&models=era5")
    try:
        with urllib.request.urlopen(url, timeout=600) as r:
            payload = json.loads(r.read())
    except (urllib.error.URLError, TimeoutError, OSError) as err:
        if attempt >= 4:
            raise
        wait = 20 * attempt
        print(f"    retry {attempt} after {err} ({wait}s)", flush=True)
        time.sleep(wait)
        return fetch_batch(cells, attempt + 1)

    if isinstance(payload, dict):        # a single location comes back unwrapped
        payload = [payload]
    cached.write_text(json.dumps(payload))
    return payload


def fit_cell(times, speed, direction):
    """Per calendar month: Weibull (A, k), mean vector wind, and a 16 sector rose."""
    months = np.array([int(t[5:7]) for t in times])
    speed = np.asarray(speed, dtype=float)
    direction = np.asarray(direction, dtype=float)
    ok = np.isfinite(speed) & np.isfinite(direction)

    out = {}
    for m in range(1, 13):
        sel = ok & (months == m)
        s = speed[sel]
        d = direction[sel]
        if s.size < 200:
            return None

        # Weibull MLE needs strictly positive samples; ERA5 reports exact calms.
        pos = s[s > 0.05]
        if pos.size < 100:
            return None
        k, _loc, A = weibull_min.fit(pos, floc=0)

        # Meteorological convention: direction is where the wind blows FROM.
        rad = np.radians(d)
        u = float(np.mean(-s * np.sin(rad)))
        v = float(np.mean(-s * np.cos(rad)))

        entry = {"A": round(float(A), 3), "k": round(float(k), 3),
                 "u": round(u, 3), "v": round(v, 3)}

        sector = (np.round(d / (360.0 / N_SECTORS)).astype(int)) % N_SECTORS

        # Fryberger Q per sector, accumulated HOUR BY HOUR.
        #
        # Q = V^2 (V - Vt) t with V in knots. Because Q goes as the cube of the
        # wind, evaluating it at a sector's mean speed is the same mistake as
        # evaluating the flux at the mean wind: it wipes out the few strong
        # hours that do nearly all the work. A Kuwait December has plenty of
        # hours over threshold but a sector mean below it, and computing from
        # the mean returns a drift potential of exactly zero. So the sum is done
        # here, where the hourly data is, and the browser only vector-sums it.
        v_kt = s * KNOTS_PER_MS
        vt_kt = GULF_IMPACT_THRESHOLD_MS * KNOTS_PER_MS
        over = v_kt > vt_kt
        q_hour = np.where(over, v_kt ** 2 * (v_kt - vt_kt), 0.0) / s.size

        freq, spd, qs = [], [], []
        for si in range(N_SECTORS):
            hit = sector == si
            freq.append(round(float(hit.sum()) / s.size, 4))
            spd.append(round(float(s[hit].mean()) if hit.any() else 0.0, 2))
            qs.append(round(float(q_hour[hit].sum()), 2))
        entry["_rose"] = [freq, spd, qs]
        out[m] = entry
    return out


def drift_from_sectors(q):
    """Fryberger (1979) DP/RDP/RDD/UDI from per-sector drift potential.

    `q` is the hourly-accumulated Q per sector in vector units. Mirrors
    driftFromSectors() in src/lib/physics/windStats.ts. Sand moves TOWARD the
    bearing 180 degrees from the sector the wind blows from.
    """
    dp = vx = vy = 0.0
    for si in range(N_SECTORS):
        if q[si] <= 0:
            continue
        dp += q[si]
        toward = math.radians((si * (360.0 / N_SECTORS) + 180.0) % 360.0)
        vx += q[si] * math.sin(toward)
        vy += q[si] * math.cos(toward)
    rdp = math.hypot(vx, vy)
    rdd = math.degrees(math.atan2(vx, vy)) % 360.0 if rdp > 0 else float("nan")
    return {"DP": dp, "RDP": rdp, "RDD": rdd, "UDI": (rdp / dp) if dp > 0 else 0.0}


def validate(doc):
    """Check the fit against the two Gulf numbers Khalaf & Al-Ajmi measured.

    Returns (ok, lines). The caller refuses to ship a file that fails.
    """
    lines = []
    lons, lats = doc["lon"], doc["lat"]
    li = min(range(len(lons)), key=lambda i: abs(lons[i] - KUWAIT[0]))
    lj = min(range(len(lats)), key=lambda j: abs(lats[j] - KUWAIT[1]))
    cell = doc["cells"].get(f"{li},{lj}")
    if cell is None or "rose" not in cell:
        return False, ["no rose stored for the Kuwait cell, cannot validate"]

    lines.append(f"Kuwait validation cell: {lons[li]}E {lats[lj]}N")
    lines.append("  month   A    k     DP     RDD    UDI")
    peak_month, peak_dp, dps, rdds = None, -1.0, {}, {}
    for m in range(1, 13):
        e = cell["months"][str(m)]
        _freq, _spd, qs = cell["rose"][str(m)]
        d = drift_from_sectors(qs)
        dps[m], rdds[m] = d["DP"], d["RDD"]
        if d["DP"] > peak_dp:
            peak_dp, peak_month = d["DP"], m
        lines.append(f"   {m:>2}   {e['A']:>4.1f} {e['k']:>4.2f} "
                     f"{d['DP']:>7.0f}  {d['RDD']:>5.1f}  {d['UDI']:.2f}")

    ok = True

    hit = peak_month in KUWAIT_DRIFT_PEAK_MONTHS
    lines.append(f"\n  drift peak month: {peak_month} "
                 f"(Khalaf & Al-Ajmi: May to August) -> {'OK' if hit else 'MISMATCH'}")
    ok &= hit

    summer = [rdds[m] for m in sorted(KUWAIT_DRIFT_PEAK_MONTHS)
              if not math.isnan(rdds[m])]
    if summer:
        sx = sum(math.sin(math.radians(a)) for a in summer)
        sy = sum(math.cos(math.radians(a)) for a in summer)
        mean_rdd = math.degrees(math.atan2(sx, sy)) % 360.0
        off = abs((mean_rdd - KUWAIT_DRIFT_TOWARD_DEG + 180) % 360 - 180)
        good = off <= 45.0
        lines.append(f"  summer drift direction: {mean_rdd:.0f} deg "
                     f"(measured about {KUWAIT_DRIFT_TOWARD_DEG:.0f}, southeast), "
                     f"off by {off:.0f} -> {'OK' if good else 'MISMATCH'}")
        ok &= good
    else:
        lines.append("  summer drift direction: no sector above threshold -> MISMATCH")
        ok = False

    peak_A = cell["months"][str(peak_month)]["A"]
    moves = peak_A > 0.5 * GULF_IMPACT_THRESHOLD_MS
    lines.append(f"  peak-month Weibull A = {peak_A:.1f} m/s against a "
                 f"{GULF_IMPACT_THRESHOLD_MS} m/s impact threshold -> "
                 f"{'OK' if moves else 'MISMATCH'}")
    ok &= moves
    return ok, lines


def build():
    lons, lats = grid()
    cells = [(lo, la) for la in lats for lo in lons]
    print(f"grid {len(lons)} x {len(lats)} = {len(cells)} cells, {START} to {END}")

    fitted, skipped = {}, 0
    for b in range(0, len(cells), BATCH):
        chunk = cells[b:b + BATCH]
        t0 = time.time()
        payload = fetch_batch(chunk)
        for (lon, lat), loc in zip(chunk, payload):
            h = loc.get("hourly") or {}
            res = fit_cell(h.get("time", []),
                           h.get("wind_speed_10m", []),
                           h.get("wind_direction_10m", []))
            if res is None:
                skipped += 1
                continue
            i, j = lons.index(lon), lats.index(lat)
            months, rose = {}, {}
            for m, e in res.items():
                r = e.pop("_rose")
                months[str(m)] = e
                if in_uae_box(lon, lat) or (abs(lon - KUWAIT[0]) <= STEP
                                            and abs(lat - KUWAIT[1]) <= STEP):
                    rose[str(m)] = r
            entry = {"months": months}
            if rose:
                entry["rose"] = rose
            fitted[f"{i},{j}"] = entry
        print(f"  {b + len(chunk):>4}/{len(cells)} cells "
              f"({time.time() - t0:.0f}s)", flush=True)

    doc = {
        "metadata": {
            "what": "Monthly 10 m wind climatology for the Gulf: Weibull fit, "
                    "mean vector wind, and a 16 sector rose.",
            "source": "ERA5 hourly 10 m wind via the Open-Meteo historical archive, "
                      "models=era5",
            "url": ARCHIVE_URL,
            "licence": "ERA5 under the Copernicus licence, Open-Meteo under CC BY 4.0. "
                       "Attribution required.",
            "period": f"{START} to {END}",
            "reference_height_m": 10,
            "grid_deg": STEP,
            "fit": "scipy weibull_min maximum likelihood with the location fixed at 0, "
                   "on hourly speeds above 0.05 m/s",
            "wind_convention": "direction is the bearing the wind blows FROM; "
                               "u is eastward, v is northward",
            "rose": f"{N_SECTORS} sectors, [frequency, mean speed m/s, Fryberger Q in "
                    "vector units accumulated hourly], stored only "
                    "over the UAE working box and the Kuwait validation cell",
            "built_by": "scripts/fit_era5_weibull.py",
        },
        "lon": lons,
        "lat": lats,
        "cells": fitted,
    }
    if skipped:
        doc["metadata"]["skipped_cells"] = skipped
    return doc


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--validate", action="store_true",
                    help="re-run validation against the file already on disk")
    args = ap.parse_args()

    if args.validate:
        doc = json.loads(OUT.read_text())
    else:
        doc = build()

    ok, lines = validate(doc)
    print("\n".join(lines))
    if not ok:
        print("\nVALIDATION FAILED. Not writing. The fitted climatology disagrees "
              "with the measured Gulf drift regime, so something upstream is wrong.")
        return 1

    if not args.validate:
        OUT.write_text(json.dumps(doc, separators=(",", ":")))
        print(f"\nwrote {OUT} ({OUT.stat().st_size / 1024:.0f} KB), "
              f"{len(doc['cells'])} cells")
    else:
        print("\nvalidation only, file untouched")
    return 0


if __name__ == "__main__":
    sys.exit(main())
