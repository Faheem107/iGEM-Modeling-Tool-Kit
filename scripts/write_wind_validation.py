"""
Collect the headline figures from the wind validation tests into one JSON.

Why this exists
---------------
`/exposure` should be able to say what its wind model has been tested against
without a reader leaving the page. Hard-coding those numbers into a component
would let them drift away from the scripts that produced them, so they are
written here and read at runtime, the same way every other dataset on the site
works.

This does not re-derive anything. It imports the four verify_* scripts and calls
the functions they already use, so a number on the page and a number in a test
table cannot disagree.

Writes: public/data/wind_validation.json

Run:  python3 scripts/write_wind_validation.py
Needs .era5_cache/ and, for the station figures, .metar_cache/ or network.
"""

import datetime
import json
import pathlib
import sys

import numpy as np

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(ROOT / "python_models"))

import era5_cache                    # noqa: E402
import verify_wind_holdout as HO     # noqa: E402
import verify_wind_stations as ST    # noqa: E402
import verify_wind_sensitivity as SE # noqa: E402
import aeolian                       # noqa: E402

OUT = ROOT / "public" / "data" / "wind_validation.json"


def holdout():
    d = HO.grain_diameter_m()
    site_list = HO.sites()
    out = {}
    for name, ut in (("fluid", HO.fluid_threshold_ms(d)),
                     ("impact", HO.GULF_IMPACT_THRESHOLD_MS)):
        errs, invented, scored, total = [], 0, 0, 0
        for _label, cell, _names in site_list:
            for _sid, months in HO.SEASONS:
                total += 1
                truth = HO.flux_hourly(cell.speeds(years=HO.TEST_YEAR, months=months), ut)
                held = HO.season_prediction(cell, months, HO.TRAIN_HOLDOUT, ut, summed=False)
                if truth <= 0:
                    if np.isfinite(held) and held > 0:
                        invented += 1
                    continue
                e = HO.pct(held, truth)
                if np.isfinite(e):
                    errs.append(abs(e))
                    scored += 1
        out[name] = {
            "thresholdMs": round(ut, 2),
            "medianErrorPct": round(float(np.median(errs)), 1) if errs else None,
            "worstErrorPct": round(float(np.max(errs)), 1) if errs else None,
            "seasonsScored": scored,
            "seasonsTotal": total,
            "seasonsWithInventedTransport": invented,
        }
    return out


def stations():
    rows = []
    for code, name in ST.STATIONS:
        obs, lon, lat = ST.parse(ST.fetch(code))
        cell = era5_cache.nearest(lon, lat)
        idx = {t: i for i, t in enumerate(cell.time)}
        so, se, do, de = [], [], [], []
        for key, (spd, dr) in obs.items():
            i = idx.get(key)
            if i is None or not np.isfinite(cell.speed[i]) or not np.isfinite(cell.direction[i]):
                continue
            so.append(spd); se.append(cell.speed[i])
            do.append(dr); de.append(cell.direction[i])
        so, se = np.array(so), np.array(se)
        do, de = np.array(do), np.array(de)
        moving = (so > 2.0) & (se > 2.0)
        dd = ST.circular_diff(de[moving], do[moving])
        dir_bias = float(np.degrees(np.arctan2(
            np.sin(np.radians(dd)).mean(), np.cos(np.radians(dd)).mean())))
        e_obs = float((so > ST.GULF_IMPACT_THRESHOLD_MS).mean())
        e_era = float((se > ST.GULF_IMPACT_THRESHOLD_MS).mean())
        rows.append({
            "station": code, "name": name,
            "cell": {"lon": cell.lon, "lat": cell.lat},
            "pairedHours": int(so.size),
            "speedBiasMs": round(float((se - so).mean()), 2),
            "rmseMs": round(float(np.sqrt(((se - so) ** 2).mean())), 2),
            "correlation": round(float(np.corrcoef(se, so)[0, 1]), 2),
            "directionBiasDeg": round(dir_bias, 1),
            "aboveThresholdObservedPct": round(e_obs * 100, 1),
            "aboveThresholdEra5Pct": round(e_era * 100, 1),
        })
    return rows


def sensitivity():
    d, d16, d84 = SE.grain()
    base = {"A": 5.16, "k": 2.10, "d": d, "gamma": 0.002,
            "bagnold_A": aeolian.A, "ustar_ratio": aeolian.USTAR_RATIO,
            "salt_C": aeolian.SALT_C, "rho_air": aeolian.RHO_AIR,
            "rho_sand": aeolian.RHO_SAND, "g": aeolian.G}
    sweeps = [("bagnold_A", "Bagnold coefficient A", "literature"),
              ("ustar_ratio", "Wind to surface shear ratio", "literature"),
              ("salt_C", "Saltation constant C", "literature"),
              ("A", "Typical wind speed", "fitted to ERA5"),
              ("k", "How gusty the wind is", "fitted to ERA5"),
              ("d", "Grain diameter", "measured"),
              ("gamma", "Crust cohesion", "unsourced")]
    rows = []
    for key, label, grade in sweeps:
        e_q, e_r = SE.elasticity(base, key)
        rows.append({"input": label, "grade": grade,
                     "elasticityFlux": round(float(e_q), 2),
                     "elasticityReduction": round(float(e_r), 2)
                     if np.isfinite(e_r) else None})
    rows.sort(key=lambda r: abs(r["elasticityFlux"]), reverse=True)
    return rows


def main():
    n_cells, first, last = era5_cache.coverage()
    doc = {
        "what": ("What the wind model has been tested against, and what those "
                 "tests found. Written by scripts/write_wind_validation.py from "
                 "the verify_* scripts. Read by the exposure module."),
        "generated": datetime.date.today().isoformat(),
        "record": {"cells": n_cells, "from": first, "to": last,
                   "source": "ERA5 hourly 10 m wind via the Open-Meteo archive"},
        "heldOutYear": holdout(),
        "stations": stations(),
        "sensitivity": sensitivity(),
        "duneOrientation": {
            "status": "not yet measured",
            "note": ("Five dune-field cells with the model's predicted crest "
                     "orientation filled in and the measurement blank. "
                     "scripts/verify_dune_orientation.py refuses to report a "
                     "result until somebody measures them off imagery."),
        },
    }
    OUT.write_text(json.dumps(doc, indent=1) + "\n")
    print(f"wrote {OUT.relative_to(ROOT)}")
    print(json.dumps(doc["heldOutYear"], indent=1))


if __name__ == "__main__":
    main()
