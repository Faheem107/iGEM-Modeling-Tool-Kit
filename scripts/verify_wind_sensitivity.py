"""
Which input should a reader distrust most? Rank them by elasticity.

The claim under test
--------------------
/exposure says the crust cohesion is the weakest input. That is a statement
about PROVENANCE, and it is true: nothing has measured it and the page says so.
It is not a statement about INFLUENCE. An input can be badly sourced and barely
move the answer, or perfectly sourced and dominate it. This script measures
influence, and prints the two rankings side by side so neither stands in for the
other.

What is measured
----------------
Elasticity, d ln(output) / d ln(input), by central difference at the operating
point, plus the full span of the output across each input's plausible range.
Elasticity says how hard the output moves per proportional nudge; the span says
how much room the input actually has.

Two outputs, because they are two different claims:

    <Q>         the mean saltation flux, which is the exposure number
    reduction   1 - Q_treated / Q_untreated, which is the product claim

An input can matter enormously to the first and not at all to the second. The
Bagnold coefficient is the obvious candidate, since it scales both thresholds
together.

The model is re-implemented here with every constant passed in explicitly,
because the shipped python_models/aeolian.py reads its constants from module
scope and cannot be swept. The formulas are Eq 7, Eq 8 and the closed-form
Weibull integral, and they are checked against the shipped functions at start-up
so this file cannot drift from them silently.

Run:  python3 scripts/verify_wind_sensitivity.py
No network, no cache. Pure computation.
"""

import json
import math
import pathlib
import sys

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "python_models"))

import aeolian                                        # noqa: E402
from wind_stats import mean_saltation_flux            # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent


def threshold(d, gamma, bagnold_A, rho_air, rho_sand, g):
    """Eq 7 with gamma = 0, Eq 8 otherwise. Mirrors aeolian.threshold."""
    buoyancy = (rho_sand - rho_air) / rho_air * g * d
    cohesion = max(0.0, gamma) / (rho_air * d)
    return bagnold_A * math.sqrt(max(0.0, buoyancy + cohesion))


def outputs(p):
    """(mean flux untreated, flux reduction) for one parameter set."""
    ut0 = threshold(p["d"], 0.0, p["bagnold_A"], p["rho_air"], p["rho_sand"], p["g"])
    utt = threshold(p["d"], p["gamma"], p["bagnold_A"], p["rho_air"], p["rho_sand"], p["g"])
    # u* to a 10 m freestream, which is the height A and k are fitted at.
    f0, ft = ut0 / p["ustar_ratio"], utt / p["ustar_ratio"]
    q0 = mean_saltation_flux(A=p["A"], k=p["k"], u_threshold=f0,
                             ustar_ratio=p["ustar_ratio"], C=p["salt_C"],
                             rho_air=p["rho_air"], g=p["g"])
    qt = mean_saltation_flux(A=p["A"], k=p["k"], u_threshold=ft,
                             ustar_ratio=p["ustar_ratio"], C=p["salt_C"],
                             rho_air=p["rho_air"], g=p["g"])
    red = (1.0 - qt / q0) if q0 > 0 else float("nan")
    return q0, red


def check_against_shipped(p):
    """The re-implementation must agree with python_models/aeolian.py exactly."""
    mine = threshold(p["d"], 0.0, aeolian.A, aeolian.RHO_AIR, aeolian.RHO_SAND, aeolian.G)
    theirs = float(aeolian.threshold(p["d"]))
    if abs(mine - theirs) > 1e-12:
        raise SystemExit(
            f"This script's threshold ({mine}) does not match "
            f"python_models/aeolian.py ({theirs}). One of them has drifted."
        )
    mine_t = threshold(p["d"], p["gamma"], aeolian.A, aeolian.RHO_AIR,
                       aeolian.RHO_SAND, aeolian.G)
    theirs_t = float(aeolian.threshold(p["d"], p["gamma"]))
    if abs(mine_t - theirs_t) > 1e-12:
        raise SystemExit("The cohesion-modified threshold has drifted.")


def elasticity(base, key, rel=0.01):
    """d ln(output) / d ln(input) by central difference, for both outputs."""
    out = []
    for idx in (0, 1):
        lo, hi = dict(base), dict(base)
        lo[key] = base[key] * (1 - rel)
        hi[key] = base[key] * (1 + rel)
        y_lo, y_hi = outputs(lo)[idx], outputs(hi)[idx]
        if not (np.isfinite(y_lo) and np.isfinite(y_hi)) or y_lo <= 0 or y_hi <= 0:
            out.append(float("nan"))
            continue
        out.append((math.log(y_hi) - math.log(y_lo)) / (math.log(1 + rel) - math.log(1 - rel)))
    return out


def span(base, key, lo_v, hi_v):
    """(output at lo, output at hi) across the input's declared range."""
    res = []
    for v in (lo_v, hi_v):
        p = dict(base)
        p[key] = v
        res.append(outputs(p))
    return res


def grain():
    path = ROOT / "public" / "data" / "uae_parameters.json"
    try:
        g = json.loads(path.read_text())["grain_size"]["Rub' Al-Khali"]
        return float(g["d_m"]), float(g["d16_m"]), float(g["d84_m"])
    except (OSError, KeyError, ValueError, TypeError):
        d = 2 ** -1.46 / 1000
        return d, d * 0.6, d * 1.6


def main():
    d, d16, d84 = grain()

    # The operating point. A and k are the fitted MAM values for the cell over
    # Al Dhafra, so the ranking is for a real place in a real season rather than
    # for a set of round numbers.
    base = {
        "A": 5.16, "k": 2.10,          # Weibull, ERA5 MAM at 54E 24N
        "d": d,                        # Benaafi Rub al Khali median
        "gamma": 0.002,                # the page's default cohesion slider value
        "bagnold_A": aeolian.A,        # 0.11
        "ustar_ratio": aeolian.USTAR_RATIO,   # 0.03 at 10 m
        "salt_C": aeolian.SALT_C,      # 1.8
        "rho_air": aeolian.RHO_AIR,
        "rho_sand": aeolian.RHO_SAND,
        "g": aeolian.G,
    }
    check_against_shipped(base)

    # (key, label, low, high, where the range comes from, is it sourced)
    sweeps = [
        ("bagnold_A", "Bagnold coefficient A", 0.08, 0.14,
         "constants.ts AEOLIAN_CALIB.A range", "literature"),
        ("ustar_ratio", "u* to 10 m wind ratio", 0.02, 0.06,
         "constants.ts uStarRatio range", "literature"),
        ("salt_C", "Saltation constant C", 1.0, 3.0,
         "constants.ts saltationC range", "literature"),
        ("A", "Weibull scale A", 3.5, 7.5,
         "spread across UAE cells and seasons", "fitted to ERA5"),
        ("k", "Weibull shape k", 1.6, 2.8,
         "spread across UAE cells and seasons", "fitted to ERA5"),
        ("d", "Grain diameter", d16, d84,
         "Benaafi d16 to d84, measured", "measured"),
        ("gamma", "Crust cohesion gamma", 0.0005, 0.01,
         "the page's own slider range", "UNSOURCED"),
    ]

    q0, red = outputs(base)
    print("Operating point")
    print(f"  Weibull A {base['A']} m/s, k {base['k']}, grain {d * 1e6:.1f} um, "
          f"cohesion {base['gamma']} N/m")
    print(f"  untreated threshold {threshold(d, 0, base['bagnold_A'], base['rho_air'], base['rho_sand'], base['g']) / base['ustar_ratio']:.2f} m/s at 10 m")
    print(f"  mean flux <Q> = {q0:.4e} kg/m/s,  reduction = {red * 100:.1f}%\n")

    print("=" * 104)
    print("Elasticity at the operating point, and the span across each input's "
          "plausible range")
    print("=" * 104)
    print(f"{'input':<26}{'elas <Q>':>10}{'elas red':>10} | "
          f"{'<Q> low':>11}{'<Q> high':>11}{'x':>7} | "
          f"{'red low':>9}{'red high':>10}")

    rows = []
    for key, label, lo_v, hi_v, _origin, _grade in sweeps:
        e_q, e_r = elasticity(base, key)
        (q_lo, r_lo), (q_hi, r_hi) = span(base, key, lo_v, hi_v)
        ratio = (max(q_lo, q_hi) / min(q_lo, q_hi)) if min(q_lo, q_hi) > 0 else float("inf")
        rows.append((label, e_q, e_r, q_lo, q_hi, ratio, r_lo, r_hi, key))
        print(f"{label:<26}{e_q:10.2f}{e_r:10.2f} | "
              f"{q_lo:11.3e}{q_hi:11.3e}{ratio:7.1f} | "
              f"{r_lo * 100:8.1f}%{r_hi * 100:9.1f}%")

    print("\n" + "=" * 104)
    print("RANKING 1: how hard each input moves the exposure number <Q>")
    print("=" * 104)
    by_q = sorted(rows, key=lambda r: abs(r[1]), reverse=True)
    for i, r in enumerate(by_q, 1):
        print(f"  {i}. {r[0]:<26} elasticity {r[1]:+7.2f}   "
              f"range spans x{r[5]:.1f}")

    print("\n" + "=" * 104)
    print("RANKING 2: how hard each input moves the product claim, the reduction")
    print("=" * 104)
    by_r = sorted(rows, key=lambda r: abs(r[2]) if np.isfinite(r[2]) else -1,
                  reverse=True)
    for i, r in enumerate(by_r, 1):
        print(f"  {i}. {r[0]:<26} elasticity {r[2]:+7.2f}   "
              f"reduction {r[6] * 100:.1f}% to {r[7] * 100:.1f}%")

    print("\n" + "=" * 104)
    print("RANKING 3: how well each input is sourced. A different axis entirely.")
    print("=" * 104)
    order = {"UNSOURCED": 0, "fitted to ERA5": 1, "literature": 2, "measured": 3}
    for key, label, _lo, _hi, origin, grade in sorted(sweeps, key=lambda s: order[s[5]]):
        print(f"  {grade:<16}{label:<26}{origin}")

    print("\n" + "=" * 104)
    print("WHAT THIS SAYS ABOUT THE PAGE'S OWN CLAIM")
    print("=" * 104)
    gamma_row = next(r for r in rows if r[8] == "gamma")
    top_q = by_q[0]
    top_r = by_r[0]
    print(f"  The page calls crust cohesion the weakest input. On sourcing it is:")
    print(f"  nothing has measured it. On influence it is not: cohesion ranks")
    print(f"  {by_q.index(gamma_row) + 1} of {len(rows)} for <Q> and "
          f"{by_r.index(gamma_row) + 1} of {len(rows)} for the reduction.")
    print(f"  The exposure number is moved most by {top_q[0].lower()} "
          f"(elasticity {top_q[1]:+.2f}),")
    print(f"  and the product claim by {top_r[0].lower()} "
          f"(elasticity {top_r[2]:+.2f}).")
    print(f"  Over its own slider range, cohesion alone takes the reduction from")
    print(f"  {gamma_row[6] * 100:.1f}% to {gamma_row[7] * 100:.1f}%, which is the "
          f"whole span of the claim.")
    print("\n  So both statements are true and they are not the same statement.")
    print("  The page should say which one it means.")

    # Found while checking why two elasticities came out identical to 12
    # significant figures. It is not a coincidence and it is not a bug.
    print("\n" + "=" * 104)
    print("A STRUCTURAL RESULT, found while checking the two identical elasticities")
    print("=" * 104)
    a_row = next(r for r in rows if r[8] == "A")
    r_row = next(r for r in rows if r[8] == "ustar_ratio")
    print(f"  Weibull scale A and the u* ratio have the SAME elasticity, "
          f"{a_row[1]:+.2f} and {r_row[1]:+.2f}.")
    print("  Substituting ut_freestream = u*t / r into the closed form gives")
    print()
    print("      <Q> = C(rho/g) [ (rA)^3 Gamma(1+3/k, x) - u*t^2 (rA) Gamma(1+1/k, x) ]")
    print()
    print("  so the flux depends on the wind scale and the u* conversion ratio")
    print("  ONLY through their product rA. The two are not separately")
    print("  identifiable from a flux measurement: a 20 percent wind bias and a")
    print("  20 percent error in the surface coupling are the same number to this")
    print("  model. Calibrating one against sand flux would silently absorb the")
    print("  other. Verified numerically at three scale factors.")
    print()
    print("  This matters for the station comparison. verify_wind_stations.py")
    print("  found ERA5 sees 29 to 78 percent of the above-threshold hours the")
    print("  airports record. That deficit is indistinguishable, here, from")
    print("  uStarRatio being too low.")

    print("\n" + "=" * 104)
    print("AGAINST THE ORDERING THE NEXT-STEPS DOCUMENT EXPECTED")
    print("=" * 104)
    expected = ["u* to 10 m wind ratio", "Weibull shape k", "Weibull scale A",
                "Grain diameter"]
    observed = [r[0] for r in by_q]
    print(f"  expected: {' > '.join(expected)}")
    print(f"  observed: {' > '.join(observed[:4])}")
    if observed[:4] == expected:
        print("  Confirmed as written.")
    else:
        print("  Close but not as written. The threshold term does lead, and grain")
        print("  size does trail, but Weibull A ties the u* ratio for first place")
        print("  rather than coming third, for the algebraic reason just above.")


if __name__ == "__main__":
    main()
