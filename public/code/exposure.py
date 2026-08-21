"""
Exposure and the commercial case - NYUAD iGEM 2026 Dunelock toolkit
==================================================================
Reproduces the "Exposure" module: from a season's wind distribution to the mass
of sand arriving at an asset, and to what treating the ground upwind takes off
that number.

The point of the whole module is one correction, and plot 1 is it.

Sand does not move at all below a threshold wind, and above it the flux climbs
as roughly the CUBE of the wind. So a month that is calm for 28 days and fierce
for 2 moves nearly all of its sand on those 2 days, and putting that month's
AVERAGE wind into the flux equation gives an answer that is wrong by a large
factor, usually far too low. The fix is to integrate the flux over the whole
fitted wind speed distribution instead of evaluating it at the mean. That
integral has an exact closed form, so no gustiness fudge factor is needed.

Exact port of:
  src/lib/physics/windStats.ts    the Weibull-integrated flux and Fryberger drift
  src/lib/physics/aeolian.ts      the thresholds (Eqs 7-8)
  src/lib/physics/dustTransport.ts  settling and near-field capture

Sources
-------
Weibull-integrated Bagnold flux : verified exact by scripts/verify_weibull_flux.py
Fryberger drift potential       : Fryberger (1979), USGS PP 1052, ch. 5
Gulf impact threshold 5.4 m/s   : Khalaf & Al-Ajmi (1993), Geomorphology 6, 111-134
Grain size                      : Benaafi et al. (2016), Arab J Geosci, Table 1
Saltation layer height, bands   : Marticorena & Bergametti (1995), 10.1029/95JD00690
Settling velocity               : Ferguson & Church (2004), J Sediment Res 74, 933
Wind climatology                : ERA5 2022-2024, public/data/era5_wind_climatology.json,
                                  built by scripts/fit_era5_weibull.py

Run:  python exposure.py
"""

import math

import numpy as np
import matplotlib.pyplot as plt

ORANGE, TEAL, ROSE, MAROON, ASH = "#D6884A", "#8FB3AC", "#C28A7C", "#6E1E18", "#8A7E75"
plt.rcParams.update({
    "figure.figsize": (7.2, 4.3), "font.size": 11, "figure.dpi": 130,
    "axes.spines.top": False, "axes.spines.right": False, "axes.edgecolor": ASH,
    "axes.grid": True, "grid.color": "#E7D8C4", "grid.linewidth": 0.8,
    "axes.titleweight": "bold", "figure.facecolor": "#FBF7F0", "axes.facecolor": "#FBF7F0",
})

# constants.ts: PHYS and AEOLIAN_CALIB. uStarRatio is a 10 m reference height,
# which is what ERA5 and Open-Meteo both report. Swapping in a 2 m or 50 m wind
# source silently breaks the model.
RHO_AIR, RHO_SAND, G = 1.225, 2650.0, 9.80665
A_THR, SALT_C, USTAR_RATIO = 0.11, 1.8, 0.03

GULF_IMPACT_THRESHOLD_MS = 5.4
KNOTS_PER_MS = 1.943844

# Benaafi et al. Table 1, Rub' al-Khali: 1.460 phi mean, 0.863 phi sorting.
GRAIN_D_M = 2 ** -1.46 / 1000
SORTING_PHI = 0.863
MEAN_PHI = 1.46

SALTATION_LAYER_M = 1.0     # Marticorena & Bergametti 1995


# --------------------------------------------------------------------------
# Thresholds, aeolian.ts Eqs 7-8
# --------------------------------------------------------------------------

def threshold(grain_d_m, cohesion=0.0):
    buoyancy = (RHO_SAND - RHO_AIR) / RHO_AIR * G * grain_d_m
    cohesion_term = max(0.0, cohesion) / (RHO_AIR * grain_d_m)
    return A_THR * math.sqrt(max(0.0, buoyancy + cohesion_term))


# --------------------------------------------------------------------------
# The Weibull-integrated flux, windStats.ts
# --------------------------------------------------------------------------

def upper_incomplete_gamma(s, x, terms=600):
    """Gamma(s, x), via Gamma(s) minus the lower-incomplete series."""
    if x <= 0:
        return math.gamma(s)
    if x > 60:
        return 0.0
    term = 1.0 / s
    total = term
    for k in range(1, terms):
        term *= x / (s + k)
        total += term
        if abs(term) < 1e-17 * abs(total):
            break
    return math.gamma(s) - math.exp(-x + s * math.log(x)) * total


def mean_saltation_flux(A, k, u_threshold):
    """<q> over a Weibull(A, k) wind speed distribution [kg/m/s]. Exact."""
    if A <= 0 or k <= 0:
        return 0.0
    ut = max(u_threshold, 0.0)
    x = (ut / A) ** k
    g3 = upper_incomplete_gamma(1.0 + 3.0 / k, x)
    g1 = upper_incomplete_gamma(1.0 + 1.0 / k, x)
    val = A ** 3 * g3 - ut ** 2 * A * g1
    return max(0.0, SALT_C * (RHO_AIR / G) * USTAR_RATIO ** 3 * val)


def flux_at_wind(u, u_threshold):
    """Bagnold flux at ONE wind speed. The thing you must not use on a mean."""
    ustar = u * USTAR_RATIO
    ustar_t = u_threshold * USTAR_RATIO
    if ustar <= ustar_t:
        return 0.0
    return SALT_C * (RHO_AIR / G) * ustar ** 3 * (1 - (ustar_t / ustar) ** 2)


def weibull_pdf(u, A, k):
    return (k / A) * (u / A) ** (k - 1) * np.exp(-((u / A) ** k))


def weibull_mean(A, k):
    return A * math.gamma(1 + 1 / k)


# --------------------------------------------------------------------------
# Near-field transport, dustTransport.ts
# --------------------------------------------------------------------------

def settling_velocity(d, C1=18.0, C2=1.0):
    """Ferguson & Church (2004), one expression across Stokes and turbulent."""
    R = (RHO_SAND - RHO_AIR) / RHO_AIR
    nu = 1.5e-5
    return R * G * d ** 2 / (C1 * nu + math.sqrt(0.75 * C2 * R * G * d ** 3))


def capture_fraction(distance_m, wind_ms, bins=40):
    """Fraction of saltating mass still airborne after travelling `distance_m`.

    Each size bin is released from the 1 m saltation layer and asked whether its
    ballistic range beats the distance. Deliberately an UPPER bound: it ignores
    repeated re-launch, which extends real transport, and it ignores turbulence.
    """
    lo, hi = MEAN_PHI - 3 * SORTING_PHI, MEAN_PHI + 3 * SORTING_PHI
    phis = np.linspace(lo, hi, bins)
    weights = np.exp(-0.5 * ((phis - MEAN_PHI) / SORTING_PHI) ** 2)
    weights /= weights.sum()

    carried = 0.0
    for phi, w in zip(phis, weights):
        d = 2 ** -phi / 1000
        if not (60e-6 <= d <= 2000e-6):      # creep or suspension, not saltation
            continue
        reach = wind_ms * (SALTATION_LAYER_M / settling_velocity(d))
        if reach >= distance_m:
            carried += w
    return carried


def drift_from_sectors(q):
    """Fryberger DP/RDP/RDD/UDI from per-sector drift potential."""
    n = len(q)
    dp = vx = vy = 0.0
    for i, qi in enumerate(q):
        if qi <= 0:
            continue
        dp += qi
        toward = math.radians((i * 360.0 / n + 180.0) % 360.0)
        vx += qi * math.sin(toward)
        vy += qi * math.cos(toward)
    rdp = math.hypot(vx, vy)
    rdd = (math.degrees(math.atan2(vx, vy)) % 360.0) if rdp > 0 else float("nan")
    return {"DP": dp, "RDP": rdp, "RDD": rdd, "UDI": (rdp / dp) if dp > 0 else 0.0}


# --------------------------------------------------------------------------
# Figures
# --------------------------------------------------------------------------

def figures():
    figs = []
    ut0 = threshold(GRAIN_D_M) / USTAR_RATIO          # as a 10 m wind speed

    # 1) Why the average wind is the wrong input.
    #    Abu Dhabi in July from the fitted climatology: A = 5.2, k = 2.4.
    A, k = 5.2, 2.4
    u = np.linspace(0.01, 22, 600)
    pdf = weibull_pdf(u, A, k)
    q_of_u = np.array([flux_at_wind(x, ut0) for x in u])
    contribution = pdf * q_of_u

    u_mean = weibull_mean(A, k)
    q_naive = flux_at_wind(u_mean, ut0)
    q_true = mean_saltation_flux(A, k, ut0)

    fig1, ax1 = plt.subplots()
    ax1.fill_between(u, pdf / pdf.max(), color=TEAL, alpha=0.35,
                     label="how often the wind blows this hard")
    ax1.fill_between(u, contribution / contribution.max(), color=ORANGE, alpha=0.55,
                     label="where the sand actually moves")
    ax1.axvline(u_mean, color=MAROON, ls="--", lw=1.6)
    ax1.axvline(ut0, color=ASH, ls=":", lw=1.6)
    ax1.annotate(f"average wind\n{u_mean:.1f} m/s", (u_mean, 0.92), color=MAROON,
                 ha="right", fontsize=9, xytext=(-8, 0), textcoords="offset points")
    ax1.annotate(f"sand starts moving\n{ut0:.1f} m/s", (ut0, 0.60), color=ASH,
                 ha="left", fontsize=9, xytext=(6, 0), textcoords="offset points")
    ax1.set_xlabel("wind speed at 10 m [m/s]")
    ax1.set_ylabel("relative")
    ax1.set_title("Almost all the sand moves on the windiest few days")
    ax1.legend(frameon=False, fontsize=9, loc="upper right")
    verdict = (f"the average understates it by {q_true / q_naive:.1f}x"
               if q_naive > 0 else
               "the average wind predicts no sand movement at all")
    ax1.text(0.02, 0.02,
             f"flux at the average wind: {q_naive:.2e} kg/m/s\n"
             f"true average flux:        {q_true:.2e} kg/m/s\n"
             f"{verdict}",
             transform=ax1.transAxes, fontsize=8.5, family="monospace", va="bottom")
    fig1.tight_layout()
    figs.append((fig1, "exposure-1.png"))

    # 2) What treatment changes, and how little of it travels.
    dist = np.logspace(0, 3, 60)
    fig2, (ax2, ax3) = plt.subplots(1, 2, figsize=(10.6, 4.3))

    for wind, colour in ((5.0, TEAL), (10.0, ORANGE), (15.0, ROSE)):
        ax2.plot(dist, [capture_fraction(d, wind) * 100 for d in dist],
                 color=colour, lw=2, label=f"{wind:.0f} m/s wind")
    ax2.set_xscale("log")
    ax2.set_xlabel("distance downwind [m]")
    ax2.set_ylabel("sand still airborne [%]")
    ax2.set_title("Saltating sand lands within tens of metres")
    ax2.legend(frameon=False, fontsize=9)

    cohesions = np.linspace(0, 0.006, 60)
    q0 = mean_saltation_flux(A, k, ut0)
    cut = [
        (1 - mean_saltation_flux(A, k, threshold(GRAIN_D_M, c) / USTAR_RATIO) / q0) * 100
        if q0 > 0 else 0.0
        for c in cohesions
    ]
    ax3.plot(cohesions * 1000, cut, color=MAROON, lw=2.2)
    ax3.set_xlabel("crust cohesion added [mN/m]")
    ax3.set_ylabel("sand transport prevented [%]")
    ax3.set_title("One measured number carries the whole product")
    fig2.tight_layout()
    figs.append((fig2, "exposure-2.png"))

    return figs


def _self_test():
    from math import isclose

    # The closed form must equal brute-force integration of the same integrand.
    # This is the check that matters: everything else rests on it.
    A, k = 5.2, 2.4
    ut = threshold(GRAIN_D_M) / USTAR_RATIO
    u = np.linspace(1e-6, 60, 400_000)
    numeric = float(np.trapezoid(weibull_pdf(u, A, k) *
                                 np.array([flux_at_wind(x, ut) for x in u]), u)) \
        if hasattr(np, "trapezoid") else \
        float(np.trapz(weibull_pdf(u, A, k) *
                       np.array([flux_at_wind(x, ut) for x in u]), u))
    closed = mean_saltation_flux(A, k, ut)
    assert isclose(closed, numeric, rel_tol=2e-4), (closed, numeric)
    print(f"closed form {closed:.6e} vs numerical {numeric:.6e} kg/m/s: OK")

    # The whole point of the module, asserted rather than left in prose.
    naive = flux_at_wind(weibull_mean(A, k), ut)
    assert closed > naive, (closed, naive)
    if naive == 0:
        print(f"the average wind ({weibull_mean(A, k):.1f} m/s) is below the "
              f"{ut:.1f} m/s threshold, so it predicts ZERO transport while the "
              f"real average is {closed:.2e} kg/m/s: OK")
    else:
        print(f"flux at the mean wind understates the mean flux by "
              f"{closed / naive:.1f}x: OK")

    # Treatment can only reduce transport, never raise it.
    q0 = closed
    qt = mean_saltation_flux(A, k, threshold(GRAIN_D_M, 2e-3) / USTAR_RATIO)
    assert qt < q0
    print(f"2 mN/m of cohesion cuts transport by {(1 - qt / q0) * 100:.1f}%: OK")

    # Near-field capture must fall away with distance.
    near, far = capture_fraction(1, 10.0), capture_fraction(100, 10.0)
    assert near > far and far < 0.01
    print(f"capture at 1 m {near * 100:.0f}%, at 100 m {far * 100:.1f}%: OK")

    # A purely north-westerly regime must drift southeast.
    q_sect = [0.0] * 16
    q_sect[14] = 100.0
    d = drift_from_sectors(q_sect)
    assert isclose(d["RDD"], 135.0, abs_tol=1e-9) and isclose(d["UDI"], 1.0, rel_tol=1e-12)
    print(f"NW regime drifts to {d['RDD']:.0f} deg (SE), UDI {d['UDI']:.2f}: OK")


if __name__ == "__main__":
    _self_test()
    for fig, name in figures():
        fig.savefig(name, bbox_inches="tight")
        print("wrote", name)
