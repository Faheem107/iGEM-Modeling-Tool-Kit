"""
Hold out 2024 and see whether the fitted wind still predicts it.

The claim under test
--------------------
`public/data/era5_wind_climatology.json` is fitted on ERA5 2022 to 2024 and then
used to predict sand transport for those same years. That is a description of
the record, not a prediction of it. This refits on 2022 to 2023 only, predicts
2024, and compares against the transport computed directly from the 2024 hourly
winds that the fit never saw.

What is actually scored
-----------------------
Not the monthly fit. The page averages A and k across the three months of the
selected season before integrating (ExposureWorkspace.tsx, the `seasonal` memo),
so that averaging is a second approximation stacked on the Weibull assumption
and it is what a reader actually sees. Four columns separate the two costs:

    hourly 2024      the truth, Bagnold evaluated hour by hour
    fit 22-24        in-sample: what the Weibull and the averaging cost
    fit 22-23        out-of-sample: the actual test
    fit 22-23, summed   the same fit, monthly fluxes summed instead of A,k averaged

The fourth column exists because averaging A and k before a convex transform
biases the answer one way, and if summing is materially better it is a one line
change to the page.

What a failure means
--------------------
If the held-out error at a site exceeds the difference between two adjacent
seasons at that site, the season buttons on /exposure are not resolving anything
real and the page should say so. This script computes that comparison itself
rather than leaving it to a reader of the table.

Run:  python3 scripts/verify_wind_holdout.py
Reads .era5_cache/ only. No network.
"""

import json
import pathlib
import sys

import numpy as np
from scipy.stats import weibull_min

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "python_models"))

import era5_cache                                     # noqa: E402
import aeolian                                        # noqa: E402
from wind_stats import mean_saltation_flux            # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent

SEASONS = [("DJF", (12, 1, 2)), ("MAM", (3, 4, 5)),
           ("JJA", (6, 7, 8)), ("SON", (9, 10, 11))]

TRAIN_ALL = (2022, 2023, 2024)
TRAIN_HOLDOUT = (2022, 2023)
TEST_YEAR = (2024,)

#: Fit gates, copied from fit_era5_weibull.py so a month this script fits is a
#: month that file would also have fitted.
MIN_HOURS, MIN_POSITIVE, CALM_MS = 200, 100, 0.05

#: Khalaf & Al-Ajmi (1993) measured the IMPACT threshold in Kuwait at 5.4 m/s.
#: aeolian.threshold() is Bagnold's FLUID threshold, a different and higher
#: quantity. Both are reported: a result that only holds at one threshold is an
#: artefact of that choice, not a property of the fit.
GULF_IMPACT_THRESHOLD_MS = 5.4


def fluid_threshold_ms(grain_d_m):
    """Bagnold Eq 7 threshold for this grain, as a 10 m freestream wind."""
    return aeolian.ustar_to_freestream(aeolian.threshold(grain_d_m))


def grain_diameter_m():
    """The measured Rub al Khali grain size, or the same paper's fallback."""
    path = ROOT / "public" / "data" / "uae_parameters.json"
    try:
        d = json.loads(path.read_text())["grain_size"]["Rub' Al-Khali"]["d_m"]
        if isinstance(d, (int, float)) and d > 0:
            return float(d)
    except (OSError, KeyError, ValueError, TypeError):
        pass
    return 2 ** -1.46 / 1000


def fit_month(speeds):
    """(A, k) by maximum likelihood, or None if the month is too thin."""
    if speeds.size < MIN_HOURS:
        return None
    pos = speeds[speeds > CALM_MS]
    if pos.size < MIN_POSITIVE:
        return None
    k, _loc, A = weibull_min.fit(pos, floc=0)
    return float(A), float(k)


def flux_closed(A, k, ut):
    return mean_saltation_flux(
        A=A, k=k, u_threshold=ut,
        ustar_ratio=aeolian.USTAR_RATIO, C=aeolian.SALT_C,
        rho_air=aeolian.RHO_AIR, g=aeolian.G,
    )


def flux_hourly(speeds, ut):
    """The truth: Bagnold evaluated at every hour, then averaged.

    This is the quantity the closed form approximates. No distribution is
    assumed anywhere in it.
    """
    if speeds.size == 0:
        return float("nan")
    r = aeolian.USTAR_RATIO
    ustar = r * speeds
    ustar_t = r * ut
    q = np.where(
        ustar > ustar_t,
        aeolian.SALT_C * (aeolian.RHO_AIR / aeolian.G) * ustar ** 3
        * (1.0 - ustar_t ** 2 / np.maximum(ustar, 1e-12) ** 2),
        0.0,
    )
    return float(q.mean())


def season_prediction(cell, months, years, ut, summed):
    """Predicted mean flux for one season, from a fit over `years`.

    `summed=False` averages A and k across the season then integrates once,
    which is what the page does. `summed=True` integrates each month then
    averages the fluxes.
    """
    per_month = []
    for m in months:
        fit = fit_month(cell.speeds(years=years, months=[m]))
        if fit is None:
            return float("nan")
        per_month.append(fit)
    if summed:
        return sum(flux_closed(A, k, ut) for A, k in per_month) / len(per_month)
    A = sum(f[0] for f in per_month) / len(per_month)
    k = sum(f[1] for f in per_month) / len(per_month)
    return flux_closed(A, k, ut)


def sites():
    """Distinct ERA5 cells under the UAE assets, plus the Kuwait cell.

    Collapsed by cell on purpose. The grid is 1 degree, about 100 km, so several
    named plants resolve to one cell and listing them separately would present
    one result as several. The names that share a cell are carried along so the
    table can say so.
    """
    picked = []
    path = ROOT / "public" / "data" / "uae_target_sites.json"
    try:
        doc = json.loads(path.read_text())
        solar = [s for s in doc.get("sites", []) if s.get("market") == "solar"
                 and s.get("capacityMw")]
        solar.sort(key=lambda s: -(s.get("capacityMw") or 0))
        picked = [(s["name"], float(s["lon"]), float(s["lat"])) for s in solar[:8]]
    except (OSError, KeyError, ValueError, TypeError) as err:
        print(f"  (could not read target sites: {err})", file=sys.stderr)
    picked.append(("Kuwait validation", 47.8, 29.3))

    by_cell = {}
    for name, lon, lat in picked:
        cell = era5_cache.nearest(lon, lat)
        key = (cell.lon, cell.lat)
        by_cell.setdefault(key, {"cell": cell, "names": []})["names"].append(name)
    out = []
    for (clon, clat), v in sorted(by_cell.items()):
        label = v["names"][0][:20]
        if len(v["names"]) > 1:
            label += f" +{len(v['names']) - 1}"
        out.append((label, v["cell"], v["names"]))
    return out


def pct(pred, truth):
    if not np.isfinite(pred) or not np.isfinite(truth) or truth <= 0:
        return float("nan")
    return (pred - truth) / truth * 100.0


def run_for_threshold(label, ut, site_list):
    """One pass over every cell and season. Returns the material for the summary."""
    print(f"\n{'=' * 100}")
    print(f"Threshold {label}: {ut:.2f} m/s at 10 m")
    print("=" * 100)
    print(f"{'cell':<26}{'sea':>4}{'peak':>7} | {'hourly 2024':>12}{'fit 22-24':>11}"
          f"{'fit 22-23':>11}{'summed':>11} | {'in-samp':>8}{'held-out':>9}{'summed':>8}")

    held_out_errors = []
    truths = {}
    rows = []
    # Seasons where 2024 never crossed the threshold but the fit predicts flux
    # anyway. This is not a missing number, it is the model inventing transport,
    # and it is counted separately because it is the more serious failure.
    invented = []

    for name, cell, _names in site_list:
        for sid, months in SEASONS:
            hourly = cell.speeds(years=TEST_YEAR, months=months)
            peak = float(hourly.max()) if hourly.size else float("nan")
            truth = flux_hourly(hourly, ut)
            in_s = season_prediction(cell, months, TRAIN_ALL, ut, summed=False)
            held = season_prediction(cell, months, TRAIN_HOLDOUT, ut, summed=False)
            summ = season_prediction(cell, months, TRAIN_HOLDOUT, ut, summed=True)

            truths[(name, sid)] = truth
            if truth <= 0:
                if np.isfinite(held) and held > 0:
                    invented.append((name, sid, peak, held))
                print(f"{name:<26}{sid:>4}{peak:7.1f} | {truth:12.4e}{in_s:11.4e}"
                      f"{held:11.4e}{summ:11.4e} |  no transport in the record")
                continue

            e_in, e_held, e_sum = pct(in_s, truth), pct(held, truth), pct(summ, truth)
            if np.isfinite(e_held):
                held_out_errors.append(abs(e_held))
            rows.append((name, sid, truth, e_held, e_sum))
            print(f"{name:<26}{sid:>4}{peak:7.1f} | {truth:12.4e}{in_s:11.4e}"
                  f"{held:11.4e}{summ:11.4e} | {e_in:7.1f}%{e_held:8.1f}%{e_sum:7.1f}%")

    if invented:
        print(f"\n{'-' * 100}")
        print("Seasons where 2024 never reached the threshold, yet the fit "
              "predicts sand moving:")
        print(f"{'cell':<26}{'sea':>4}{'peak 2024 m/s':>15}{'predicted flux':>17}")
        for name, sid, peak, held in invented:
            print(f"{name:<26}{sid:>4}{peak:15.1f}{held:17.4e}")
        print("The Weibull tail extends past the strongest hour actually "
              "observed, so the integral picks up wind that never blew.")

    print(f"\n{'-' * 100}")
    print("Does the held-out error swamp the seasonal signal it is meant to resolve?")
    print(f"{'cell':<26}{'season pair':>14}{'gap %':>10}{'held-out err %':>16}{'verdict':>12}")
    swamped = checked = 0
    for name, _cell, _names in site_list:
        for i in range(len(SEASONS)):
            a, b = SEASONS[i][0], SEASONS[(i + 1) % len(SEASONS)][0]
            ta, tb = truths.get((name, a)), truths.get((name, b))
            if not ta or not tb or ta <= 0 or tb <= 0:
                continue
            gap = abs(tb - ta) / max(ta, tb) * 100.0
            errs = [abs(e) for n, sd, _t, e, _es in rows
                    if n == name and sd in (a, b) and np.isfinite(e)]
            if not errs:
                continue
            err = max(errs)
            checked += 1
            bad = err > gap
            swamped += bad
            print(f"{name:<26}{a + ' vs ' + b:>14}{gap:9.1f}%{err:15.1f}%"
                  f"{'SWAMPED' if bad else 'ok':>12}")

    # Is summing the monthly fluxes better than averaging A and k, as the
    # first-order check suggested? Compare the two on the same site-seasons.
    paired = [(abs(e), abs(es)) for _n, _s, _t, e, es in rows
              if np.isfinite(e) and np.isfinite(es)]
    better = sum(1 for e, es in paired if es < e)

    return {
        "errors": held_out_errors, "swamped": swamped, "checked": checked,
        "ut": ut, "invented": invented, "n_seasons": len(site_list) * len(SEASONS),
        "summed_better": better, "paired": len(paired),
    }


def main():
    n_cells, first, last = era5_cache.coverage()
    d = grain_diameter_m()
    print(f"ERA5 cache: {n_cells} cells, {first} to {last}")
    print(f"Grain diameter {d * 1e6:.1f} um (Benaafi Rub al Khali, "
          f"public/data/uae_parameters.json)")
    print(f"Fit: weibull_min.fit(floc=0) per calendar month, "
          f"gates >={MIN_HOURS} h and >={MIN_POSITIVE} above {CALM_MS} m/s")

    site_list = sites()

    summary = {}
    for label, ut in (("Bagnold fluid, from grain size", fluid_threshold_ms(d)),
                      ("Khalaf & Al-Ajmi impact", GULF_IMPACT_THRESHOLD_MS)):
        summary[label] = run_for_threshold(label, ut, site_list)

    print(f"\n{'=' * 100}")
    print("SUMMARY")
    print("=" * 100)
    problems = []
    for label, r in summary.items():
        print(f"\n{label} (ut = {r['ut']:.2f} m/s)")
        if r["invented"]:
            print(f"  seasons with no observed transport but a predicted flux: "
                  f"{len(r['invented'])} of {r['n_seasons']}")
        if not r["errors"]:
            print("  no season produced a comparable number at all")
            problems.append(
                f"{label}: not one season in 2024 crossed this threshold, so the "
                f"model cannot be scored against the record here at all")
            continue
        arr = np.array(r["errors"])
        print(f"  held-out error, median {np.median(arr):.1f}%, "
              f"mean {arr.mean():.1f}%, worst {arr.max():.1f}%, "
              f"scored on {arr.size} of {r['n_seasons']} seasons")
        print(f"  season pairs where the error swamps the seasonal gap: "
              f"{r['swamped']} of {r['checked']}")
        if r["paired"]:
            print(f"  summing monthly fluxes beat averaging A and k in "
                  f"{r['summed_better']} of {r['paired']} seasons")
        if r["invented"]:
            problems.append(
                f"{label}: in {len(r['invented'])} of {r['n_seasons']} seasons the "
                f"2024 record never reached the threshold, yet the fit predicts "
                f"sand moving. The Weibull tail runs past the strongest hour "
                f"observed")
        if r["checked"] and r["swamped"] > r["checked"] / 2:
            problems.append(
                f"{label}: the held-out error exceeds the between-season gap in "
                f"{r['swamped']} of {r['checked']} adjacent season pairs, so the "
                f"season buttons are not resolving a real difference at most sites")

    if problems:
        print()
        for p in problems:
            print(f"FAIL  {p}", file=sys.stderr)
        raise SystemExit(
            "The hold-out test found the model does not resolve what the UI "
            "claims it resolves. Report this rather than dropping the test."
        )
    print("\nPASS, the fit predicts a year it was not shown, and the seasonal "
          "signal survives the error.")


if __name__ == "__main__":
    main()
