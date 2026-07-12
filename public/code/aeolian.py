"""
Aeolian sand transport - NYUAD iGEM 2026 Dunelock toolkit
=========================================================
Reproduces the "Aeolian Wind Tunnel" module: Bagnold sand-transport physics. Wind must
exceed a threshold friction velocity to move grains; the engineered crust adds an
interparticle cohesion gamma that raises that threshold, and any excess wind drives a
cubic saltation mass flux.

Exact port of src/lib/physics/aeolian.ts (Eqs 7-9).
  u*t0 = A sqrt((rho_s - rho_a)/rho_a g d)                       untreated threshold
  u*t  = A sqrt((rho_s - rho_a)/rho_a g d + gamma/(rho_a d))     cohesion-enhanced
  q    = C (rho_a/g) u*^3 (1 - u*t^2/u*^2),  u* > u*t            Bagnold flux

Constants: PHYS (rho_air 1.225, rho_sand 2650, g 9.80665) and AEOLIAN_CALIB
(A 0.11, saltationC 1.8, uStarRatio 0.03). Run:  python aeolian.py
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

RHO_AIR, RHO_SAND, G = 1.225, 2650.0, 9.80665
A, SALT_C, USTAR_RATIO = 0.11, 1.8, 0.03


def ustar_to_freestream(ustar):
    return ustar / USTAR_RATIO


def threshold(grain_d_m, cohesion=0.0):
    buoyancy = (RHO_SAND - RHO_AIR) / RHO_AIR * G * grain_d_m
    cohesion_term = np.maximum(0.0, cohesion) / (RHO_AIR * grain_d_m)
    return A * np.sqrt(np.maximum(0.0, buoyancy + cohesion_term))


def saltation_flux(ustar, ustar_t):
    ustar = np.asarray(ustar, float)
    safe = np.where(ustar > 0, ustar, 1.0)
    ratio2 = (ustar_t ** 2) / (safe ** 2)
    q = SALT_C * (RHO_AIR / G) * ustar ** 3 * (1 - ratio2)
    return np.where(ustar > ustar_t, np.maximum(0.0, q), 0.0)


def figures():
    figs = []
    d = 200e-6   # 200 micron UAE dune sand

    # 1) Mass flux vs freestream wind, untreated vs treated crust.
    U = np.linspace(0, 25, 300)
    ustar = U * USTAR_RATIO
    ut0 = threshold(d, 0.0)
    ut1 = threshold(d, 6e-4)   # engineered crust cohesion [N/m]
    fig1, ax1 = plt.subplots()
    ax1.plot(U, saltation_flux(ustar, ut0) * 1000, color=ROSE, lw=2.4, label="untreated")
    ax1.plot(U, saltation_flux(ustar, ut1) * 1000, color=MAROON, lw=2.4, label="treated crust")
    for ut, c in [(ut0, ROSE), (ut1, MAROON)]:
        ax1.axvline(ustar_to_freestream(ut), color=c, ls="--", lw=1)
    ax1.set_xlabel("freestream wind U  (m/s)")
    ax1.set_ylabel("saltation flux q  (g m$^{-1}$ s$^{-1}$)")
    ax1.set_title("Cohesion raises the threshold and cuts erosion")
    ax1.legend(frameon=False)
    fig1.tight_layout()
    figs.append((fig1, "aeolian-1.png"))

    # 2) Threshold wind speed vs cohesion.
    gamma = np.linspace(0, 2e-3, 200)
    Ut = ustar_to_freestream(threshold(d, gamma))
    fig2, ax2 = plt.subplots()
    ax2.plot(gamma * 1000, Ut, color=ORANGE, lw=2.4)
    ax2.axhspan(16, 20, color=TEAL, alpha=0.2)
    ax2.text(0.05, 18, "UAE design winds 16-20 m/s", color=ASH, fontsize=9)
    ax2.set_xlabel("interparticle cohesion gamma  (mN/m)")
    ax2.set_ylabel("threshold wind speed  (m/s)")
    ax2.set_title("Threshold wind rises with engineered cohesion")
    fig2.tight_layout()
    figs.append((fig2, "aeolian-2.png"))
    return figs


if __name__ == "__main__":
    for fig, name in figures():
        fig.savefig(name, bbox_inches="tight")
        print("wrote", name)
