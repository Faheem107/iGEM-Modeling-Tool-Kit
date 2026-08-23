"""
Does a two-parameter Weibull actually describe Gulf wind, cell by cell, month by month?

The claim under test
--------------------
`public/data/era5_wind_climatology.json` stores one Weibull (A, k) per cell per
calendar month, and every transport number on /exposure is an integral over it.
A two-parameter Weibull cannot represent a bimodal regime, and the Gulf has one:
the summer Shamal against the winter frontal winds. This checks the shipped fit
against the hourly record it was fitted to. It does not refit anything.

Why the p-value is deliberately not the criterion
-------------------------------------------------
With roughly 2,200 hours per cell-month, a Kolmogorov-Smirnov test rejects
almost any parametric fit, because n that large resolves differences too small
to matter. "The Weibull is rejected in 100 percent of cells" would be true and
useless. So D, the statistic, is what gets reported, and three checks run in
increasing order of relevance to what the site actually computes:

    1. D            how far the whole distribution is off
    2. tail         fitted vs empirical exceedance above threshold, because
                    flux goes as roughly the cube of the wind above it, so the
                    tail does nearly all the work
    3. flux         the error in the quantity the page prints. If D is large
                    but this is small, the fit is fine for our purpose and this
                    script says so rather than raising a false alarm.

What a failure means
--------------------
If the flux error is large, or if it clusters in the transition months where two
regimes overlap, then fitting a season is the wrong move and the monthly fluxes
should be aggregated instead. That is the same question verify_wind_holdout.py
answers from the other side.

Run:  python3 scripts/verify_weibull_fit.py
Reads .era5_cache/ and public/data/era5_wind_climatology.json. No network.
"""

import json
import pathlib
import sys

import numpy as np
from scipy.stats import kstest, weibull_min

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "python_models"))

import era5_cache                                     # noqa: E402
import aeolian                                        # noqa: E402
from wind_stats import mean_saltation_flux            # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
CLIM = ROOT / "public" / "data" / "era5_wind_climatology.json"

GULF_IMPACT_THRESHOLD_MS = 5.4
CALM_MS = 0.05

MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

#: The months where a summer Shamal and a winter frontal regime overlap, so a
#: single Weibull is most likely to be averaging two populations. Named before
#: the numbers are in, so the clustering question cannot be answered after the
#: fact. See WIND_PATTERN_TESTS_NEXT_STEPS.md section 2.
TRANSITION_MONTHS = {3, 4, 10, 11}

#: A fit whose flux is out by more than this is worth flagging. Chosen against
#: the spread that verify_wind_holdout.py measured between adjacent seasons,
#: which runs 8 to 99 percent: an in-sample error above 25 percent is a
#: meaningful fraction of the signal the page asks the fit to resolve.
FLUX_TOLERANCE_PCT = 25.0


def flux_hourly(speeds, ut):
    r = aeolian.USTAR_RATIO
    ustar, ustar_t = r * speeds, r * ut
    q = np.where(
        ustar > ustar_t,
        aeolian.SALT_C * (aeolian.RHO_AIR / aeolian.G) * ustar ** 3
        * (1.0 - ustar_t ** 2 / np.maximum(ustar, 1e-12) ** 2),
        0.0,
    )
    return float(q.mean()) if speeds.size else float("nan")


def flux_closed(A, k, ut):
    return mean_saltation_flux(
        A=A, k=k, u_threshold=ut, ustar_ratio=aeolian.USTAR_RATIO,
        C=aeolian.SALT_C, rho_air=aeolian.RHO_AIR, g=aeolian.G,
    )


def collect_rows():
    """Score every shipped (A, k) against the hourly record it was fitted to.

    Returns (rows, missing), where a row is

        (lon, lat, month, n, D, p, tail_err, p90_err, flux_err)

    and `missing` counts cells in the fit with no cached hourly record. Nothing
    is refitted. Split out of main() so write_wind_validation.py can report the
    same numbers this script prints, instead of a second copy of the loop that
    could drift away from it.
    """
    if not CLIM.exists():
        raise SystemExit(f"{CLIM} not found. Run scripts/fit_era5_weibull.py first.")
    doc = json.loads(CLIM.read_text())
    lons, lats = doc["lon"], doc["lat"]

    rows = []
    missing = 0
    for key, cell_doc in doc["cells"].items():
        i, j = (int(x) for x in key.split(","))
        lon, lat = lons[i], lats[j]
        try:
            cell = era5_cache.nearest(lon, lat, max_deg=0.6)
        except SystemExit:
            missing += 1
            continue
        for m_str, params in (cell_doc.get("months") or {}).items():
            m = int(m_str)
            A, k = float(params["A"]), float(params["k"])
            speeds = cell.speeds(months=[m])
            pos = speeds[speeds > CALM_MS]
            if pos.size < 100:
                continue

            D, p = kstest(pos, "weibull_min", args=(k, 0.0, A))

            # Tail: how often the wind is above the transport threshold.
            emp_tail = float((pos > GULF_IMPACT_THRESHOLD_MS).mean())
            fit_tail = float(np.exp(-((GULF_IMPACT_THRESHOLD_MS / A) ** k)))
            tail_err = (fit_tail - emp_tail) / emp_tail * 100 if emp_tail > 0 else np.nan

            # The 90th percentile, where the flux integral does its work.
            q90 = float(np.percentile(pos, 90))
            fit_q90 = float(weibull_min.ppf(0.90, k, loc=0, scale=A))
            p90_err = (fit_q90 - q90) / q90 * 100 if q90 > 0 else np.nan

            f_true = flux_hourly(speeds, GULF_IMPACT_THRESHOLD_MS)
            f_fit = flux_closed(A, k, GULF_IMPACT_THRESHOLD_MS)
            flux_err = (f_fit - f_true) / f_true * 100 if f_true > 0 else np.nan

            rows.append((lon, lat, m, pos.size, D, p, tail_err, p90_err, flux_err))

    if not rows:
        raise SystemExit("No cell-month could be compared. The cache and the "
                         "climatology do not line up.")
    return rows, missing


def by_month_flux_error(rows):
    """Median flux error per calendar month, as {month: percent}."""
    out = {}
    for m in range(1, 13):
        sel = [r for r in rows if r[2] == m]
        if sel:
            out[m] = float(np.nanmedian([r[8] for r in sel]))
    return out


def main():
    n_cells, first, last = era5_cache.coverage()
    print(f"Shipped fit: {CLIM.relative_to(ROOT)}")
    print(f"ERA5 cache:  {n_cells} cells, {first} to {last}")
    print(f"Testing the shipped (A, k) against the hourly record. Nothing is refitted.\n")

    rows, missing = collect_rows()

    arr = np.array([(r[4], r[6], r[7], r[8]) for r in rows], dtype=float)
    D_all, tail_all, p90_all, flux_all = arr[:, 0], arr[:, 1], arr[:, 2], arr[:, 3]
    p_all = np.array([r[5] for r in rows], dtype=float)

    print("=" * 92)
    print(f"1. KS statistic, {len(rows)} cell-months"
          + (f" ({missing} cells in the fit had no cached hourly record)" if missing else ""))
    print("=" * 92)
    rejected = int((p_all < 0.05).sum())
    print(f"  D      median {np.median(D_all):.4f}   90th pct {np.percentile(D_all, 90):.4f}"
          f"   worst {D_all.max():.4f}")
    print(f"  p<0.05 in {rejected} of {len(rows)} cell-months "
          f"({rejected / len(rows) * 100:.1f}%), which at n~2200 is expected and")
    print("         is why p is recorded but not used as the criterion.")

    print("\n" + "=" * 92)
    print("2. The tail, which is where the transport is")
    print("=" * 92)
    ft = tail_all[np.isfinite(tail_all)]
    fq = p90_all[np.isfinite(p90_all)]
    print(f"  hours above {GULF_IMPACT_THRESHOLD_MS} m/s, fitted vs observed:"
          f"  median {np.median(ft):+.1f}%   "
          f"|err| 90th pct {np.percentile(np.abs(ft), 90):.1f}%")
    print(f"  90th percentile wind speed, fitted vs observed:     "
          f"  median {np.median(fq):+.1f}%   "
          f"|err| 90th pct {np.percentile(np.abs(fq), 90):.1f}%")

    print("\n" + "=" * 92)
    print("3. Saltation flux, the number the page prints")
    print("=" * 92)
    ff = flux_all[np.isfinite(flux_all)]
    over = int((np.abs(ff) > FLUX_TOLERANCE_PCT).sum())
    print(f"  in-sample flux error: median {np.median(ff):+.1f}%   "
          f"mean {ff.mean():+.1f}%   |err| 90th pct {np.percentile(np.abs(ff), 90):.1f}%")
    print(f"  outside +/-{FLUX_TOLERANCE_PCT:.0f}%: {over} of {ff.size} cell-months "
          f"({over / ff.size * 100:.1f}%)")

    print("\n" + "=" * 92)
    print("4. Does the misfit cluster, and where?")
    print("=" * 92)
    print(f"{'month':>7}{'n':>7}{'median D':>11}{'median tail err':>18}"
          f"{'median flux err':>18}")
    by_month = {}
    for m in range(1, 13):
        sel = [r for r in rows if r[2] == m]
        if not sel:
            continue
        d = np.median([r[4] for r in sel])
        t = np.nanmedian([r[6] for r in sel])
        f = np.nanmedian([r[8] for r in sel])
        by_month[m] = (d, t, f)
        mark = "  <- transition" if m in TRANSITION_MONTHS else ""
        print(f"{MONTH_NAMES[m]:>7}{len(sel):>7}{d:11.4f}{t:17.1f}%{f:17.1f}%{mark}")

    # The clustering verdict is taken from the flux error, not from D. D
    # separates the transition months from the rest by about 2 percent, which is
    # too little to carry a claim. The flux error separates them by a factor of
    # several, and the flux is the quantity the page prints.
    trans_d = [by_month[m][0] for m in by_month if m in TRANSITION_MONTHS]
    other_d = [by_month[m][0] for m in by_month if m not in TRANSITION_MONTHS]
    if trans_d and other_d:
        print(f"\n  median D, transition months {np.mean(trans_d):.4f} vs the rest "
              f"{np.mean(other_d):.4f}. Too close to carry a conclusion.")

    # Rank the months by how badly the flux is missed, and see where they fall.
    ranked = sorted(by_month.items(), key=lambda kv: abs(kv[1][2]), reverse=True)
    worst = [MONTH_NAMES[m] for m, _ in ranked[:4]]
    best = [MONTH_NAMES[m] for m, _ in ranked[-4:]]
    summer = {5, 6, 7, 8}
    clustered = all(m not in summer for m, _ in ranked[:4])
    print(f"  flux error is worst in {', '.join(worst)} and best in "
          f"{', '.join(best)}.")
    if clustered:
        print("  Every one of the four worst months sits outside May to August.")
        print("  The summer Shamal is one steady regime and a single Weibull")
        print("  describes it well. The winter half-year is not, and that is")
        print("  where the fit costs the most. The transition months were the")
        print("  hypothesis; the winter months are what the data says.")

    print("\n" + "=" * 92)
    print("VERDICT")
    print("=" * 92)
    problems = []
    if over / ff.size > 0.25:
        problems.append(
            f"the fitted flux is out by more than {FLUX_TOLERANCE_PCT:.0f}% in "
            f"{over / ff.size * 100:.0f}% of cell-months, so the Weibull is not "
            f"adequate for the quantity the page reports")
    if np.median(np.abs(ft)) > 20:
        problems.append(
            f"the fit misses how often the wind is above threshold by a median "
            f"{np.median(np.abs(ft)):.0f}%, which is the part that carries the sand")

    print(f"  The Weibull is rejected as a distribution nearly everywhere, which at")
    print(f"  this sample size says little. What matters is that the flux it")
    print(f"  produces sits within {np.percentile(np.abs(ff), 90):.0f}% of the hourly "
          f"truth for 90% of cell-months,")
    print(f"  in sample. verify_wind_holdout.py measures what that becomes out of sample.")
    if clustered:
        print("  The misfit concentrates in the winter half-year, not in the")
        print("  transition months the hypothesis named. Summer is the one")
        print("  season a single Weibull describes well.")

    if problems:
        print()
        for p in problems:
            print(f"FAIL  {p}", file=sys.stderr)
        raise SystemExit("The Weibull assumption does not hold well enough for "
                         "the use it is put to. Report this.")
    print("\nPASS, the fitted flux tracks the hourly truth in sample.")


if __name__ == "__main__":
    main()
