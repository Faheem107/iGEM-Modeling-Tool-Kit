"""
Protein thermal stability - NYUAD iGEM 2026 Dunelock toolkit
============================================================
Reproduces the "Protein Thermal Stability" module: a two-state folding equilibrium
sets the fraction of the enzyme/scaffold that is folded and active at a given
temperature. That folded fraction is the viability multiplier gating every downstream
rate. The operative melting temperature Tm is penalised away from the pH and salinity
optima.

Port of src/components/ProteinThermalDecay.tsx and the thermodynamic form in
src/lib/moduleMath.ts.
  Tm(pH, salt) = Tm0 - 3.2 (pH-7.4)^2 - 4.5 (salt-1.2)^2      (floored at 25 C)
  f_folded     = 1 / (1 + exp((T - Tm) / w))                   Boltzmann two-state
  (equivalently dG(T) = dH - T dS and f = 1/(1 + exp(-dG/RT)); the melt is where f = 1/2)

Constants: Tm0 = 52 C, transition width w = 4.5 C, pH optimum 7.4, salinity optimum 1.2%.
Run:  python thermal.py
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

TM_BASE = 52.0        # baseline denaturation midpoint (C)
WIDTH = 4.5           # Boltzmann transition width (C)


def operative_tm(pH=7.4, salinity=1.2):
    tm = TM_BASE - 3.2 * (pH - 7.4) ** 2 - 4.5 * (salinity - 1.2) ** 2
    return max(25.0, tm)


def folded_fraction(temp_C, pH=7.4, salinity=1.2):
    tm = operative_tm(pH, salinity)
    return 1.0 / (1.0 + np.exp((np.asarray(temp_C, float) - tm) / WIDTH))


def figures():
    figs = []
    T = np.linspace(0, 70, 300)

    # 1) Folded fraction vs temperature at three pH values.
    fig1, ax1 = plt.subplots()
    for pH, c in zip([7.4, 6.5, 8.5], [MAROON, ORANGE, TEAL]):
        ff = folded_fraction(T, pH=pH)
        ax1.plot(T, ff * 100, color=c, lw=2.2, label=f"pH {pH}")
        ax1.axvline(operative_tm(pH=pH), color=c, ls=":", lw=1)
    ax1.axhline(50, color=ASH, ls="--", lw=1)
    ax1.set_xlabel("temperature (C)")
    ax1.set_ylabel("folded / active enzyme (%)")
    ax1.set_title("Two-state folding: melt point shifts with pH")
    ax1.legend(frameon=False)
    fig1.tight_layout()
    figs.append((fig1, "thermal-1.png"))

    # 2) Operative melting temperature surface over pH and salinity.
    pH = np.linspace(5.5, 9.0, 120)
    salt = np.linspace(0, 3.0, 120)
    PH, SALT = np.meshgrid(pH, salt)
    TM = np.maximum(25.0, TM_BASE - 3.2 * (PH - 7.4) ** 2 - 4.5 * (SALT - 1.2) ** 2)
    fig2, ax2 = plt.subplots()
    cs = ax2.contourf(PH, SALT, TM, levels=12, cmap="YlOrBr")
    ax2.contour(PH, SALT, TM, levels=[40, 45, 50], colors=MAROON, linewidths=1)
    ax2.plot(7.4, 1.2, "o", color=TEAL, ms=9, label="optimum")
    ax2.set_xlabel("pH")
    ax2.set_ylabel("salinity (%)")
    ax2.set_title("Operative melting temperature Tm (C)")
    ax2.legend(frameon=False, loc="upper right")
    fig2.colorbar(cs, ax=ax2, label="Tm (C)")
    fig2.tight_layout()
    figs.append((fig2, "thermal-2.png"))
    return figs


if __name__ == "__main__":
    for fig, name in figures():
        fig.savefig(name, bbox_inches="tight")
        print("wrote", name)
