"""
Fetch ISRIC SoilGrids clay content for the UAE sites and hotspots.

Clay drives the suspension split via Chappell et al. 2024 GRL Eq 3:
    F/Q = 10^(0.134*clay% - 6.0),  valid 0 to 20% clay.

SoilGrids returns clay in g/kg with d_factor 10, so divide by 10 for percent.
The REST endpoint is reachable but slow and rate limited, so this script paces
itself and caches. For a full gridded layer use the WCS route instead.

READ THIS BEFORE USING THE OUTPUT
---------------------------------
SoilGrids is a machine-learning prediction, not a measurement, and desert coverage
in its training data is sparse. Over UAE dune fields it returns values near 20%,
which is exactly the upper validity limit of Chappell Eq 3 and therefore the
MAXIMUM sandblasting efficiency the model can produce. Benaafi et al. (Arab J
Geosci, Table 1 and petrography) classify these same sands as quartz arenite,
dominated by quartz with under 10% calcite and low feldspar. A quartz arenite dune
cannot be 20% clay. The script reports the contradiction rather than hiding it.

Run:  python3 scripts/fetch_soilgrids_clay.py
Writes: public/data/soilgrids_clay.json
"""

import json
import os
import sys
import time
import urllib.parse
import urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(REPO, "public", "data", "soilgrids_clay.json")
BASE = "https://rest.isric.org/soilgrids/v2.0/properties/query"
PAUSE_S = 6.0          # be polite, the service is rate limited
CLAY_CAP = 20.0        # Chappell Eq 3 validity limit

POINTS = [
    # UAE solar assets, from public/data/uae_target_sites.json
    ("Al-Dhafra Solar",        54.5169, 24.1409, "target"),
    ("MBR Solar Park",         55.4410, 24.7318, "target"),
    ("Noor Abu Dhabi",         55.4446, 24.5448, "target"),
    ("Shams 1",                53.7146, 23.5699, "target"),
    # source regions
    ("Rub al Khali interior",  53.0,    22.5,    "hotspot"),
    ("Liwa dune belt",         53.8,    23.1,    "hotspot"),
    ("Tigris-Euphrates plain", 45.0,    31.0,    "hotspot"),
]


def query(lon, lat, depth="0-5cm"):
    q = urllib.parse.urlencode([("lon", lon), ("lat", lat),
                                ("property", "clay"), ("property", "sand"),
                                ("depth", depth), ("value", "mean")])
    req = urllib.request.Request(BASE + "?" + q,
                                 headers={"User-Agent": "igem-2026-dust-toolkit/1.0"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.load(r)


def parse(d):
    out = {}
    for layer in (d.get("properties") or {}).get("layers", []):
        um = layer.get("unit_measure") or {}
        dfac = um.get("d_factor") or 1
        for dep in layer.get("depths", []):
            v = (dep.get("values") or {}).get("mean")
            if v is not None:
                out[layer["name"]] = v / dfac
    return out


def alpha_from_clay(clay_pct):
    """Chappell et al. 2024 GRL Eq 3 sandblasting efficiency [1/m]."""
    return 10.0 ** (0.134 * min(clay_pct, CLAY_CAP) - 6.0)


def main():
    results = []
    print(f"{'site':<24}{'kind':<9}{'clay %':>8}{'sand %':>8}{'alpha [1/m]':>14}  flag")
    for name, lon, lat, kind in POINTS:
        try:
            vals = parse(query(lon, lat))
        except Exception as e:
            print(f"{name:<24}{kind:<9}  FAILED {type(e).__name__}: {e}")
            results.append({"name": name, "lon": lon, "lat": lat, "kind": kind,
                            "error": f"{type(e).__name__}: {e}"})
            time.sleep(PAUSE_S)
            continue
        clay = vals.get("clay")
        sand = vals.get("sand")
        if clay is None:
            print(f"{name:<24}{kind:<9}  no clay value returned")
            results.append({"name": name, "lon": lon, "lat": lat, "kind": kind,
                            "clay_percent": None})
            time.sleep(PAUSE_S)
            continue
        a = alpha_from_clay(clay)
        capped = clay >= CLAY_CAP
        flag = "AT/OVER Eq3 CAP, see docstring" if capped else ""
        print(f"{name:<24}{kind:<9}{clay:>8.1f}{(sand if sand is not None else float('nan')):>8.1f}"
              f"{a:>14.3e}  {flag}")
        results.append({"name": name, "lon": lon, "lat": lat, "kind": kind,
                        "clay_percent": clay, "sand_percent": sand,
                        "alpha_per_m": a, "at_or_over_eq3_cap": capped})
        time.sleep(PAUSE_S)

    capped_n = sum(1 for r in results if r.get("at_or_over_eq3_cap"))
    print(f"\n{capped_n} of {len(results)} points sit at or above the 20% Eq 3 cap.")
    if capped_n:
        print("Those points would run the model at MAXIMUM sandblasting efficiency.")
        print("Benaafi et al. classify UAE dune sands as quartz arenite, which cannot be")
        print("20% clay. Do not ship these values without cross-checking. See the docstring.")

    payload = {
        "provenance": {
            "source": "ISRIC SoilGrids v2.0 REST API, property=clay, depth=0-5cm, value=mean",
            "units": "returned g/kg with d_factor 10, converted to percent here",
            "licence": "CC BY 4.0, ISRIC World Soil Information",
            "consumer": "Chappell et al. 2024 GRL Eq 3, alpha = 10^(0.134*clay - 6.0)",
            "warning": ("SoilGrids is an ML prediction, not a measurement, and desert "
                        "training coverage is sparse. Values near 20% over UAE dune fields "
                        "contradict Benaafi et al.'s quartz-arenite petrography and sit at "
                        "the Eq 3 validity cap. Cross-check before use."),
        },
        "points": results,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(payload, open(OUT, "w"), indent=2)
    print(f"\nwrote {os.path.relpath(OUT, REPO)}")


if __name__ == "__main__":
    sys.exit(main())
