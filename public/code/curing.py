"""
Curing and deployment timeline - NYUAD iGEM 2026 Dunelock toolkit
=================================================================
Reproduces the "Curing Timeline" module: the crust is neither instant nor permanent.
It MATURES over the first ~32 h (each binder cures on its own timescale) and then
WEATHERS over months until it must be re-applied. A fast-setting polymer buys early-age
strength while the durable calcite floor extends the re-application interval.

Exact port of src/lib/physics/curing.ts.
  maturation: gamma_p(t) = gamma_p_mature * (1 - exp(-t/tau_p))
  field life : gamma_p(m) = gamma_p_mature * 2^(-m/H_p)

Constants from CURING_CALIB (constants.ts):
  tau [h]  : gamma-PGA 4, CaCO3 11, alginate 0.5
  H [months]: gamma-PGA 5, CaCO3 30, alginate 3
Run:  python curing.py
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

TAU = {1: 4.0, 2: 11.0, 3: 0.5}          # maturation time constants [h]
HALFLIFE = {1: 5.0, 2: 30.0, 3: 3.0}     # field half-lives [months]
LABEL = {1: "gamma-PGA", 2: "CaCO3", 3: "alginate"}
COLOR = {1: ORANGE, 2: MAROON, 3: TEAL}
REAPPLY_MONTHS = 6.0


def maturation_fraction(prong, hours):
    return np.where(hours <= 0, 0.0, 1 - np.exp(-hours / TAU[prong]))


def field_retention(prong, months):
    return np.where(months <= 0, 1.0, np.power(2.0, -months / HALFLIFE[prong]))


def figures():
    figs = []
    mature = {1: 5e-4, 2: 9e-4, 3: 4e-4}   # mature per-prong cohesion [N/m]

    # 1) Maturation over the 0-48 h spray protocol (per prong + total).
    h = np.linspace(0, 48, 300)
    fig1, ax1 = plt.subplots()
    total = np.zeros_like(h)
    for p in (1, 2, 3):
        v = mature[p] * maturation_fraction(p, h)
        total += v
        ax1.plot(h, v * 1000, color=COLOR[p], lw=1.8, alpha=0.8, label=LABEL[p])
    ax1.plot(h, total * 1000, color=ASH, lw=2.6, ls="--", label="total")
    for spray in (0, 8, 16, 24, 32):
        ax1.axvline(spray, color=ROSE, ls=":", lw=0.8)
    ax1.set_xlabel("cure time (h)")
    ax1.set_ylabel("cohesion  (mN/m)")
    ax1.set_title("Maturation: alginate sets fast, calcite ripens slowly")
    ax1.legend(frameon=False, fontsize=9)
    fig1.tight_layout()
    figs.append((fig1, "curing-1.png"))

    # 2) Field weathering over months + re-application cadence.
    m = np.linspace(0, 18, 300)
    fig2, ax2 = plt.subplots()
    total = np.zeros_like(m)
    for p in (1, 2, 3):
        v = mature[p] * field_retention(p, m)
        total += v
        ax2.plot(m, v * 1000, color=COLOR[p], lw=1.8, alpha=0.8, label=LABEL[p])
    ax2.plot(m, total * 1000, color=ASH, lw=2.6, ls="--", label="total")
    ax2.axvline(REAPPLY_MONTHS, color=MAROON, lw=1.4)
    ax2.text(REAPPLY_MONTHS + 0.2, (total.max() * 1000) * 0.8,
             "re-apply\n~6 months", color=MAROON, fontsize=9)
    ax2.set_xlabel("field age (months)")
    ax2.set_ylabel("surviving cohesion  (mN/m)")
    ax2.set_title("Field life: calcite persists, polymers weather")
    ax2.legend(frameon=False, fontsize=9)
    fig2.tight_layout()
    figs.append((fig2, "curing-2.png"))
    return figs


if __name__ == "__main__":
    for fig, name in figures():
        fig.savefig(name, bbox_inches="tight")
        print("wrote", name)
