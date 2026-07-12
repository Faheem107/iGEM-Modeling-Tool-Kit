"""
Alginate egg-box gel - NYUAD iGEM 2026 Dunelock toolkit
=======================================================
Reproduces the "Alginate Gel" module: sodium alginate gels when Ca2+ bridges
guluronate (G) blocks of neighbouring chains into "egg-box" junctions. Only G-blocks
bear load, so junction density scales with the guluronate fraction F_G. Alginate's
honest limitation (water solubility / rain washout) is modelled too.

Exact port of src/lib/physics/alginate.ts.
  rho_polymer = concToRho * C_applied
  theta       = [Ca]/(Kd + [Ca])
  nu          = rho_polymer * theta * F_G * (1 - 2 Mx/Mn)
  G           = nu R T
  R(n)        = (1 - k)^n                          residual after n rain cycles

Constants from ALGINATE_CALIB (constants.ts): guluronateFraction 0.55, KdCa 1.0 mM,
concToRho 9.0 kg/m3 per %w/v, washoutRatePerCycle 0.15. Mx 6000, Mn 200000 g/mol.
Run:  python alginate.py
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

R = 8.314462618
F_G = 0.55            # guluronateFraction
KD_CA = 1.0           # KdCa mM
CONC_TO_RHO = 9.0     # kg/m3 per %w/v
WASHOUT_K = 0.15      # per rain cycle
MX, MN = 6000.0, 200000.0
T = 298.15


def egg_box_saturation(ca_mM, Kd=KD_CA):
    ca = np.asarray(ca_mM, dtype=float)
    return np.where(ca > 0, ca / (Kd + ca), 0.0)


def gel_modulus(applied_percent, ca_mM, temperature=T):
    rho = np.maximum(0.0, applied_percent) * CONC_TO_RHO
    theta = egg_box_saturation(ca_mM)
    end_correction = max(0.0, 1 - 2 * MX / MN)
    nu = rho * theta * F_G * end_correction
    return nu * R * temperature   # Pa


def washout_residual(cycles):
    return np.power(1 - WASHOUT_K, np.maximum(0.0, cycles))


def figures():
    figs = []

    # 1) Gel modulus vs Ca2+ at several applied alginate loadings.
    ca = np.linspace(0, 20, 200)
    fig1, ax1 = plt.subplots()
    for pct, c in zip([1.0, 2.0, 3.0], [ROSE, ORANGE, MAROON]):
        ax1.plot(ca, gel_modulus(pct, ca), color=c, lw=2.2, label=f"{pct:.0f} %w/v")
    ax1.set_xlabel("[Ca$^{2+}$]  (mM)")
    ax1.set_ylabel("gel shear modulus G  (Pa)")
    ax1.set_title("Egg-box gelation: G rises with Ca$^{2+}$ and loading")
    ax1.legend(frameon=False, title="applied alginate")
    fig1.tight_layout()
    figs.append((fig1, "alginate-1.png"))

    # 2) Rain washout: residual alginate over wet cycles (honest solubility limit).
    n = np.arange(0, 21)
    half_life = np.log(0.5) / np.log(1 - WASHOUT_K)
    fig2, ax2 = plt.subplots()
    ax2.plot(n, washout_residual(n) * 100, "o-", color=TEAL, lw=2)
    ax2.axhline(50, color=ROSE, ls="--", lw=1.2)
    ax2.axvline(half_life, color=ROSE, ls="--", lw=1.2)
    ax2.text(half_life + 0.3, 60, f"half gone by\n{half_life:.1f} cycles", color=ROSE, fontsize=9)
    ax2.set_xlabel("rain / wet cycles")
    ax2.set_ylabel("alginate remaining  (%)")
    ax2.set_title("Alginate is soluble: it washes out over rain cycles")
    ax2.set_ylim(0, 100)
    fig2.tight_layout()
    figs.append((fig2, "alginate-2.png"))
    return figs


if __name__ == "__main__":
    for fig, name in figures():
        fig.savefig(name, bbox_inches="tight")
        print("wrote", name)
