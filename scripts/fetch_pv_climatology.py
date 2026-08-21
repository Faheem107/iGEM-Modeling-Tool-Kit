"""
Build the PV capacity factor grid the exposure module's money chain needs.

The gap this closes
-------------------
scripts/transport_model.py carries "solar_capacity_factor" in a NEEDS_SOURCE
dict and raises rather than guessing it, so the cost panel printed "no source
yet" where the money belonged. Without it, nameplate MW never becomes MWh and
the whole chain from arriving sand to lost revenue is cut.

Why compute it rather than cite it
----------------------------------
A single published national figure cannot vary between Abu Dhabi and Ras Al
Khaimah, and it cannot vary through the year. Everything else in this module
does vary through the year: the sand arrives seasonally, so the loss is
seasonal, so a constant capacity factor would be combining two quantities at
different time resolutions and quietly averaging away the part that matters.

Source
------
Open-Meteo's historical archive, which serves ERA5 with no account and no key.
This is the same route scripts/fit_era5_weibull.py already uses for the wind,
so the two climatologies rest on the same reanalysis rather than on two
datasets that might disagree.

The checks
----------
This script refuses to write a file that fails either of two independent
checks, the same contract fit_era5_weibull.py holds itself to:

1. Global Solar Atlas PVOUT at Dubai, 1791.5 kWh/kWp per year.
2. Noor Abu Dhabi's published output. 1,177 MW, about 2,000 GWh reported by
   September 2020, so an observed capacity factor near 19 to 20 percent.

Neither should match exactly, and that is deliberate. Both describe a panel
that gets dirty; this model describes one that does not, because soiling is
computed elsewhere in this module and counting it twice would be wrong. So the
modelled figure should sit above both, by about the size of a soiling
allowance. The direction of the gap is as much of the test as its size: a
clean-panel model landing below a real-world figure would mean energy is being
lost somewhere it should not be.

These are anchors, not calibration. Nothing here is tuned to make them pass. If
they fail, the model is wrong and the fix is the model.

Run
---
    python3 scripts/fetch_pv_climatology.py
"""

import json
import pathlib
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "python_models"))
import pv   # noqa: E402

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = REPO / "public" / "data" / "uae_pv_climatology.json"

ARCHIVE = "https://archive-api.open-meteo.com/v1/archive"

# The UAE, on a 0.5 degree grid.
#
# 0.25 degrees was tried first and Open-Meteo's free tier cut it off partway
# through: five years of five hourly variables over 391 points is a lot of
# request weight. It is also more resolution than the quantity deserves.
# Capacity factor varies by only a few percent across the whole country, far
# less than the model's own uncertainty, so a finer grid would be spending
# request budget to interpolate noise.
LON_MIN, LON_MAX, LAT_MIN, LAT_MAX = 51.0, 56.5, 22.5, 26.5
STEP = 0.5

# The same window fit_era5_weibull.py uses for the wind. Deliberate: the sand
# and the sunlight it lands on should be described by the same three years, or
# a seasonal loss is being multiplied by a capacity factor from a different
# climate period.
START, END = "2022-01-01", "2024-12-31"
YEARS = 3.0

HOURLY = "shortwave_radiation,direct_normal_irradiance,diffuse_radiation,temperature_2m,wind_speed_10m"

# Open-Meteo accepts several coordinates per request and answers with a list.
# Kept small, and paced, because the free tier weights a request by variables
# times days times locations and this asks for a lot of all three.
BATCH = 4
PAUSE_S = 25

# Points already computed are cached, so a run that hits the rate limit can be
# restarted and pick up where it stopped instead of spending the whole budget
# again on work it has already done.
CACHE = REPO / ".pv_cache.json"

# -- The two anchors ----------------------------------------------------------
#
# Neither anchor should match this model exactly, and saying so is the point.
# Both of them describe a panel that gets dirty. This model deliberately does
# not, because soiling is what the rest of the exposure module computes and
# applying it twice would be wrong. So the modelled figure should come out
# ABOVE both anchors, and by roughly the size of a soiling allowance.
#
# That direction is itself the test. A clean-panel model landing BELOW a
# real-world figure that includes soiling would mean this is losing energy
# somewhere it should not be, and no amount of range-widening would fix that.

# Global Solar Atlas (World Bank / ESMAP / Solargis), Dubai, utility-scale PV.
# Their default system carries about 8.9 percent of losses INCLUDING soiling.
GSA_DUBAI = {"lat": 25.13, "lon": 55.23, "pvout": 1791.5}
#: Modelled clean-panel yield should exceed GSA by this fraction, no more.
GSA_EXCESS_RANGE = (0.0, 0.20)

# Noor Abu Dhabi: 1177 MW, about 2000 GWh reported to September 2020, so an
# observed capacity factor near 19 to 20 percent. An operating plant also
# carries degradation, curtailment and outages on top of soiling, so the gap
# here should be wider than the Global Solar Atlas one, not narrower.
NOOR = {"name": "Noor Abu Dhabi", "lat": 24.3, "lon": 55.15, "observed_cf": 0.195}
NOOR_EXCESS_RANGE = (0.0, 0.30)


def grid_points():
    pts = []
    lat = LAT_MIN
    while lat <= LAT_MAX + 1e-9:
        lon = LON_MIN
        while lon <= LON_MAX + 1e-9:
            pts.append((round(lat, 4), round(lon, 4)))
            lon += STEP
        lat += STEP
    return pts


def fetch(points):
    """One archive request for up to BATCH coordinates.

    The free tier answers a rate limit with an HTTP error, so a 429 backs off
    for minutes rather than seconds. Anything already fetched is in the cache,
    so giving up here is recoverable.
    """
    qs = urllib.parse.urlencode({
        "latitude": ",".join(str(p[0]) for p in points),
        "longitude": ",".join(str(p[1]) for p in points),
        "start_date": START,
        "end_date": END,
        "hourly": HOURLY,
        "timezone": "UTC",
    })
    url = f"{ARCHIVE}?{qs}"
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
        "Open-Meteo archive did not answer. Anything already fetched is in "
        f"{CACHE.name}, so rerunning resumes rather than restarting."
    )


def times_from(iso_times):
    """(day_of_year, hour) per sample, without pulling in a date library."""
    cum = (0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334)
    out = []
    for t in iso_times:
        year, month, day = int(t[0:4]), int(t[5:7]), int(t[8:10])
        hour = int(t[11:13])
        doy = cum[month - 1] + day
        leap = (year % 4 == 0 and year % 100 != 0) or year % 400 == 0
        if leap and month > 2:
            doy += 1
        out.append((doy, float(hour)))
    return out


def run_point(block, lat, lon, tracking="fixed"):
    h = block["hourly"]
    return pv.annual_yield(
        times_from(h["time"]),
        h["shortwave_radiation"],
        h["direct_normal_irradiance"],
        h["diffuse_radiation"],
        h["temperature_2m"],
        # Open-Meteo reports 10 m wind in km/h by default.
        [(w or 0.0) / 3.6 for w in h["wind_speed_10m"]],
        lat, lon, tracking=tracking, years=YEARS,
    )


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
            fixed = run_point(block, lat, lon, "fixed")
            track = run_point(block, lat, lon, "single-axis")
            cells[f"{lat},{lon}"] = {
                "cf": round(fixed.capacity_factor, 5),
                "cfTracking": round(track.capacity_factor, 5),
                "yield": round(fixed.specific_yield_kwh_per_kwp, 1),
                "yieldTracking": round(track.specific_yield_kwh_per_kwp, 1),
                "tilt": fixed.tilt_deg,
                "ghi": round(fixed.ghi_kwh_m2_yr, 1),
                "monthly": [round(v, 5) for v in fixed.monthly_capacity_factor],
                "monthlyTracking": [round(v, 5) for v in track.monthly_capacity_factor],
            }
        CACHE.write_text(json.dumps(cells))
        time.sleep(PAUSE_S)

    # -- Check 1, against Global Solar Atlas at Dubai -------------------------
    gsa_cell = nearest_cell(cells, GSA_DUBAI["lat"], GSA_DUBAI["lon"])
    gsa_excess = gsa_cell["yield"] / GSA_DUBAI["pvout"] - 1.0
    gsa_ok = GSA_EXCESS_RANGE[0] <= gsa_excess <= GSA_EXCESS_RANGE[1]

    # -- Check 2, against Noor Abu Dhabi's published output -------------------
    noor = nearest_cell(cells, NOOR["lat"], NOOR["lon"])
    noor_excess = noor["cf"] / NOOR["observed_cf"] - 1.0
    noor_ok = NOOR_EXCESS_RANGE[0] <= noor_excess <= NOOR_EXCESS_RANGE[1]

    yields = [c["yield"] for c in cells.values()]
    mean_yield = sum(yields) / len(yields)

    print("\nchecks. Both anchors describe panels that get dirty and this model")
    print("does not, so it should sit above both, by about a soiling allowance.")
    print(f"  Dubai modelled {gsa_cell['yield']:.0f} kWh/kWp clean against "
          f"Global Solar Atlas {GSA_DUBAI['pvout']:.0f}, "
          f"{gsa_excess * 100:+.1f}%  {'ok' if gsa_ok else 'FAIL'}")
    print(f"  {NOOR['name']} modelled {noor['cf'] * 100:.1f}% clean against "
          f"observed {NOOR['observed_cf'] * 100:.1f}%, "
          f"{noor_excess * 100:+.1f}%  {'ok' if noor_ok else 'FAIL'}")
    print(f"  grid mean fixed-tilt yield {mean_yield:.0f} kWh/kWp/yr")
    print(f"  single-axis tracking adds {(noor['cfTracking'] / noor['cf'] - 1) * 100:.1f}% "
          f"at Noor, high because backtracking is not modelled")

    if not (gsa_ok and noor_ok):
        raise SystemExit(
            "Refusing to write. The yield model disagrees with a published anchor "
            "in size or in direction. Fix the model, do not widen the range."
        )

    payload = {
        "provenance": {
            "source": "ERA5 hourly irradiance, temperature and 10 m wind via the "
                      "Open-Meteo historical archive. No key, no account, same route "
                      "as the wind climatology.",
            "period": f"{START} to {END}",
            "grid": f"{STEP} deg over {LON_MIN} to {LON_MAX} E, {LAT_MIN} to {LAT_MAX} N",
            "model": "python_models/pv.py and src/lib/physics/pv.ts. HDKR transposition "
                     "(Reindl, Beckman and Duffie 1990), Sandia module temperature "
                     "(King, Boyson and Kratochvil 2004), crystalline silicon at "
                     f"{pv.GAMMA_PMP_PER_C} per degree C.",
            "systemLosses": {
                "inverter": pv.LOSS_INVERTER,
                "dcWiring": pv.LOSS_DC_WIRING,
                "mismatch": pv.LOSS_MISMATCH,
                "availability": pv.LOSS_AVAILABILITY,
                "soiling": "deliberately absent, see below",
            },
            "soilingNote": "This capacity factor is for clean glass. Soiling is what the "
                           "rest of the exposure module computes and is subtracted "
                           "downstream. Including a soiling allowance here as well would "
                           "count the same effect twice.",
            "checks": {
                "note": "Both anchors include a soiling allowance and this model "
                        "deliberately does not, so it is expected to sit above "
                        "them. The direction of the gap is part of the test.",
                "globalSolarAtlasDubai": {
                    "modelledYield": gsa_cell["yield"],
                    "publishedPvout": GSA_DUBAI["pvout"],
                    "excess": round(gsa_excess, 4),
                    "allowed": list(GSA_EXCESS_RANGE),
                    "passed": gsa_ok,
                },
                "noorAbuDhabi": {
                    "modelledCapacityFactor": noor["cf"],
                    "observedCapacityFactor": NOOR["observed_cf"],
                    "excess": round(noor_excess, 4),
                    "allowed": list(NOOR_EXCESS_RANGE),
                    "basis": "1177 MW, about 2000 GWh reported to September 2020",
                    "passed": noor_ok,
                },
                "gridMeanYield": round(mean_yield, 1),
            },
            "caveat": "A yield model, not a plant model. It does not know a given "
                      "plant's module type, row spacing, inverter loading ratio, "
                      "curtailment or outages, and the tracker variant does not "
                      "model backtracking, so it overstates a row-spaced array at "
                      "low sun.",
        },
        "step": STEP,
        "cells": cells,
    }
    OUT.write_text(json.dumps(payload), encoding="utf-8")
    CACHE.unlink(missing_ok=True)
    print(f"\nwrote {OUT.relative_to(REPO)}: {len(cells)} cells, "
          f"{OUT.stat().st_size // 1024} kB")


def nearest_cell(cells, lat, lon):
    best, bd = None, None
    for key, cell in cells.items():
        clat, clon = (float(v) for v in key.split(","))
        d = (clat - lat) ** 2 + (clon - lon) ** 2
        if bd is None or d < bd:
            best, bd = cell, d
    return best


if __name__ == "__main__":
    main()
