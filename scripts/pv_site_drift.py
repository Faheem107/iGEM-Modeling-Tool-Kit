"""
Sand drift direction at the solar sites the business team is sizing.

What this builds
----------------
`public/data/pv_site_drift.json`: for each large solar site with an exact
position, the ERA5 wind rose turned into Fryberger drift potential. The numbers
that matter are RDD, the bearing sand moves toward over a year, and the share
of that drift which comes from the 290 to 340 degree sector the business sizing
assumes for every site.

Why
---
The site list (drylab_sites_gcc.csv, from the Global Energy Monitor Global Solar
Power Tracker, February 2026) gives every site the same upwind sector, a
north-westerly Shamal prior. That is a guess the list itself says to replace
with a measured rose. Sand arrives from the side the drift comes from, so the
edge of a plant that faces the drift is where treatment would go. This script
replaces the prior with ERA5 at each site.

What it does not do
-------------------
It does not give a belt depth, the distance behind a treated edge at which sand
flux falls to zero. A crust stops the ground it covers from giving up sand. It
does not stop grains already hopping in from further upwind, which keep moving
over a hard surface while the wind is above the impact threshold. The width a
belt needs depends on how far the loose sand extends upwind of each plant, which
is a question for imagery, not for a wind rose.

Inputs
------
Only rows with priority 1 (the largest serviceable sites) and loc_accuracy
"exact" are used. An approximate position is inferred from the nearest town and
can be kilometres off, which is enough to put a site in the wrong wind.

ERA5 hourly 10 m wind, 2022 to 2024, from the Open-Meteo archive, the same
source, period and threshold as scripts/fit_era5_weibull.py. Open-Meteo returns
the nearest ERA5 grid point, about 25 km apart.

Run
---
    python scripts/pv_site_drift.py
    python scripts/pv_site_drift.py --sites "path/to/drylab_sites_gcc.csv"
"""

import argparse
import csv
import json
import pathlib
import sys

import numpy as np

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(ROOT / "python_models"))

from fit_era5_weibull import (  # noqa: E402
    END, GULF_IMPACT_THRESHOLD_MS, KNOTS_PER_MS, N_SECTORS, START, UAE_BOX,
    fetch_batch,
)
from wind_stats import drift_from_sectors  # noqa: E402

DEFAULT_SITES = ROOT / "Solar Panel output" / "drylab_sites_gcc.csv"
OUT = ROOT / "public" / "data" / "pv_site_drift.json"
GRID = ROOT / "public" / "data" / "era5_wind_climatology.json"

# The upwind sector the site list assigns to every row, as wind-from bearings.
PRIOR_FROM = (290.0, 340.0)

# Inside the UAE box the 1 degree grid also stores a rose, so the two drift
# directions can be compared. This catches a convention error (from against
# toward), which would show as about 180 degrees. It is not a test of accuracy:
# a site can sit up to 70 km from its grid cell centre, and the drift direction
# really does change over that distance near the coast, so a few tens of degrees
# is expected. Only checked where the drift has a clear direction.
CHECK_MIN_UDI = 0.3
CHECK_MAX_OFF_DEG = 90.0


def load_sites(path):
    rows = list(csv.DictReader(open(path, newline="")))
    keep = [r for r in rows if r["priority"] == "1" and r["loc_accuracy"] == "exact"]
    return sorted(keep, key=lambda r: -float(r["capacity_mw"]))


def angle_off(a, b):
    return abs((a - b + 180.0) % 360.0 - 180.0)


def site_drift(times, speed, direction):
    """Annual and monthly Fryberger drift from hourly wind at one point.

    Q = V^2 (V - Vt) t, V in knots, summed hour by hour for the same reason as
    in fit_era5_weibull.py: Q goes as the cube of the wind, so a sector's mean
    speed hides the strong hours that do the work.
    """
    s = np.asarray(speed, dtype=float)
    d = np.asarray(direction, dtype=float)
    months = np.array([int(t[5:7]) for t in times])
    ok = np.isfinite(s) & np.isfinite(d)
    s, d, months = s[ok], d[ok], months[ok]

    v_kt = s * KNOTS_PER_MS
    vt_kt = GULF_IMPACT_THRESHOLD_MS * KNOTS_PER_MS
    q = np.where(v_kt > vt_kt, v_kt ** 2 * (v_kt - vt_kt), 0.0) / s.size
    sector = (np.round(d / (360.0 / N_SECTORS)).astype(int)) % N_SECTORS

    annual_q = [float(q[sector == i].sum()) for i in range(N_SECTORS)]
    annual = drift_from_sectors(annual_q)

    lo, hi = PRIOR_FROM
    in_prior = (d >= lo) & (d <= hi)
    prior_share = float(q[in_prior].sum() / q.sum()) if q.sum() > 0 else 0.0

    monthly_dp = []
    for m in range(1, 13):
        sel = months == m
        monthly_dp.append(float(q[sel].sum()))
    peak_month = int(np.argmax(monthly_dp)) + 1

    hours_over = float((v_kt > vt_kt).mean())
    return annual, annual_q, prior_share, monthly_dp, peak_month, hours_over


def grid_rdd(grid, lon, lat):
    """Annual RDD from the stored 1 degree rose of the nearest cell, if it has one."""
    lons, lats = grid["lon"], grid["lat"]
    i = min(range(len(lons)), key=lambda k: abs(lons[k] - lon))
    j = min(range(len(lats)), key=lambda k: abs(lats[k] - lat))
    cell = grid["cells"].get(f"{i},{j}")
    if not cell or "rose" not in cell:
        return None
    q = [0.0] * N_SECTORS
    for m in range(1, 13):
        for si, qi in enumerate(cell["rose"][str(m)][2]):
            q[si] += qi / 12.0
    return drift_from_sectors(q)["RDD"], lons[i], lats[j]


def in_uae_box(lon, lat):
    a, b, c, d = UAE_BOX
    return a <= lon <= b and c <= lat <= d


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sites", default=str(DEFAULT_SITES),
                    help="drylab_sites_gcc.csv from the business team")
    args = ap.parse_args()

    sites = load_sites(args.sites)
    if not sites:
        print("no priority 1 sites with an exact position, nothing to do")
        return 1
    print(f"{len(sites)} sites, ERA5 {START} to {END}, threshold "
          f"{GULF_IMPACT_THRESHOLD_MS} m/s at 10 m")

    cells = [(round(float(r["lon"]), 4), round(float(r["lat"]), 4)) for r in sites]
    payload = fetch_batch(cells)
    grid = json.loads(GRID.read_text())

    out, failures = [], []
    print(f"\n  {'site':<42}{'RDD':>6}{'from':>6}{'UDI':>6}{'DP':>7}"
          f"{'in prior':>10}{'peak':>6}")
    for r, (lon, lat), loc in zip(sites, cells, payload):
        h = loc.get("hourly") or {}
        annual, q, prior_share, monthly_dp, peak, hours_over = site_drift(
            h["time"], h["wind_speed_10m"], h["wind_direction_10m"])
        rdd = annual["RDD"]
        from_deg = (rdd + 180.0) % 360.0

        entry = {
            "location_id": r["location_id"],
            "project": r["project"],
            "country": r["country"],
            "lat": lat,
            "lon": lon,
            "era5_lat": loc.get("latitude"),
            "era5_lon": loc.get("longitude"),
            "capacity_mw": float(r["capacity_mw"]),
            "side_m": round(float(r["side_m"])),
            "status": r["status_mix"],
            "dp_vu": round(annual["DP"], 1),
            "rdp_vu": round(annual["RDP"], 1),
            "rdd_toward_deg": round(rdd, 1),
            "drift_from_deg": round(from_deg, 1),
            "udi": round(annual["UDI"], 3),
            "share_of_drift_from_prior_sector": round(prior_share, 3),
            "peak_drift_month": peak,
            "hours_above_threshold": round(hours_over, 3),
            "sector_q_vu": [round(x, 2) for x in q],
        }

        check = ""
        if in_uae_box(lon, lat):
            g = grid_rdd(grid, lon, lat)
            if g is not None:
                g_rdd, g_lon, g_lat = g
                off = angle_off(rdd, g_rdd)
                entry["grid_cell_rdd_deg"] = round(g_rdd, 1)
                check = f"  grid cell {g_lon}E {g_lat}N RDD {g_rdd:.0f}, off {off:.0f}"
                if annual["UDI"] >= CHECK_MIN_UDI and off > CHECK_MAX_OFF_DEG:
                    failures.append(f"{r['project']}: {off:.0f} deg from the grid rose")
        out.append(entry)
        print(f"  {r['project'][:41]:<42}{rdd:>6.0f}{from_deg:>6.0f}"
              f"{annual['UDI']:>6.2f}{annual['DP']:>7.0f}"
              f"{prior_share * 100:>9.0f}%{peak:>6}{check}")

    if failures:
        print("\nsite and grid roses disagree, not writing:")
        for f in failures:
            print("  " + f)
        return 1

    doc = {
        "provenance": {
            "what": "Annual Fryberger sand drift at large solar sites, from the ERA5 "
                    "wind at each site.",
            "sites": "Global Energy Monitor, Global Solar Power Tracker, February 2026, "
                     "CC BY 4.0, as filtered by the business team (drylab_sites_gcc.csv). "
                     "Priority 1 rows with an exact position only.",
            "wind": "ERA5 hourly 10 m wind via the Open-Meteo archive, models=era5, "
                    f"{START} to {END}. ERA5 under the Copernicus licence, Open-Meteo "
                    "under CC BY 4.0. The nearest ERA5 grid point is used.",
            "method": "Q = V^2 (V - Vt) t per hour, V in knots, Vt = "
                      f"{GULF_IMPACT_THRESHOLD_MS} m/s (Khalaf and Al-Ajmi 1993), "
                      "summed into 16 sectors and vector-summed (Fryberger 1979).",
            "convention": "rdd_toward_deg is the bearing sand moves toward. "
                          "drift_from_deg = rdd_toward_deg + 180 is the side it arrives "
                          "from. share_of_drift_from_prior_sector is the fraction of DP "
                          "from winds blowing from 290 to 340 degrees.",
            "accuracy": "At three UAE airports ERA5 direction is within 6 degrees of "
                        "METAR, but ERA5 has 1.3 to 3.4 times fewer hours above the "
                        "threshold (public/data/wind_validation.json). DP and RDP are "
                        "therefore low. The drift direction is the part to use.",
            "not_included": "No belt depth. A wind rose gives the direction and the "
                            "amount of drift, not how far upwind the loose sand extends.",
            "built_by": "scripts/pv_site_drift.py",
        },
        "sites": out,
    }
    OUT.write_text(json.dumps(doc, indent=1, ensure_ascii=False) + "\n")
    print(f"\nwrote {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
