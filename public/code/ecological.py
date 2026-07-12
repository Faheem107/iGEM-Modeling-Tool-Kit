"""
Ecological spread and biocontainment - NYUAD iGEM 2026 Dunelock toolkit
=======================================================================
Reproduces the "Ecological Spread" module: how fast the engineered colony expands
(Fisher-KPP travelling wave) and how well the MazE/MazF kill switch contains it
(per-cell escape statistics over the deployed population).

Exact port of src/lib/physics/ecology.ts.
  D(Ca) = D0 / (1 + [Ca]/K)                 Ca2+ suppresses sliding expansion
  c     = 2 sqrt(D mu)                       Fisher front speed [mm/h]
  N     = area_cm2 * density * live_fraction deployed viable cells
  P(>=1 escapee) = 1 - (1-p)^N

Constants from ECOLOGY_CALIB (constants.ts): muMax 1.0 /h, motilityD0 0.012 mm2/h,
caSuppressHalf 1.0 mM, fieldViableDensity 1e7 cells/cm2, NIH escape target 1e-8.
Run:  python ecological.py
"""

import numpy as np
import matplotlib.pyplot as plt

ORANGE, TEAL, ROSE, MAROON, ASH = "#D6884A", "#8FB3AC", "#C28A7C", "#6E1E18", "#8A7E75"
plt.rcParams.update({
    "figure.figsize": (7.2, 4.3), "font.size": 11, "figure.dpi": 130,
    "axes.spines.top": False, "axes.spines.right": False, "axes.edgecolor": ASH,
    "axes.grid": True, "grid.color": "#E7D8C4", "grid.linewidth": 0.8,
    "axes.titleweight": "bold", "figure.facecolor": "#FBF7F0", "axes.facecolor": "#FBF7F0",
})

MU_MAX = 1.0          # /h
D0 = 0.012            # mm2/h
CA_HALF = 1.0         # mM
DENSITY = 1.0e7       # cells/cm2
NIH_TARGET = 1.0e-8


def expansion_D(ca_mM):
    return D0 / (1 + np.maximum(0.0, ca_mM) / CA_HALF)


def fisher_speed(mu, D):
    return 2 * np.sqrt(np.maximum(0.0, D) * np.maximum(0.0, mu))


def deployed_population(span_mm, live_fraction=1.0):
    area_cm2 = (span_mm / 10.0) ** 2
    return area_cm2 * DENSITY * np.clip(live_fraction, 0, 1)


def p_at_least_one(p, N):
    # 1 - (1-p)^N, stable for tiny p via expm1/log1p.
    return -np.expm1(N * np.log1p(-p))


def figures():
    figs = []

    # 1) Ca2+ dosed by prongs 1-2 slows colony expansion (front speed, mm/day).
    ca = np.linspace(0, 20, 200)
    speed_day = fisher_speed(MU_MAX, expansion_D(ca)) * 24
    fig1, ax1 = plt.subplots()
    ax1.plot(ca, speed_day, color=TEAL, lw=2.4)
    ax1.axvline(CA_HALF, color=ROSE, ls="--", lw=1.2)
    ax1.text(CA_HALF + 0.4, speed_day.max() * 0.8,
             "half-suppression\n~1 mM Ca$^{2+}$", color=ROSE, fontsize=9)
    ax1.set_xlabel("local [Ca$^{2+}$]  (mM)")
    ax1.set_ylabel("Fisher front speed  (mm/day)")
    ax1.set_title("Cross-linking calcium also limits colony spread")
    fig1.tight_layout()
    figs.append((fig1, "ecological-1.png"))

    # 2) Escape probability vs single-cell escape frequency, at deployment scale.
    p = np.logspace(-12, -3, 200)
    N = deployed_population(span_mm=1000.0)   # 1 m patch
    fig2, ax2 = plt.subplots()
    ax2.loglog(p, p_at_least_one(p, N), color=MAROON, lw=2.4)
    ax2.axvline(NIH_TARGET, color=ORANGE, ls="--", lw=1.4)
    ax2.text(NIH_TARGET * 1.3, 1e-3, "NIH < 10$^{-8}$\ntarget", color=ORANGE, fontsize=9)
    ax2.set_xlabel("per-cell escape frequency p")
    ax2.set_ylabel(r"P($\geq$1 escapee) over 1 m$^2$")
    ax2.set_title("Kill-switch containment at deployment scale")
    fig2.tight_layout()
    figs.append((fig2, "ecological-2.png"))
    return figs


if __name__ == "__main__":
    for fig, name in figures():
        fig.savefig(name, bbox_inches="tight")
        print("wrote", name)
