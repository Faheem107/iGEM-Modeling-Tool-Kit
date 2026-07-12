"""
Ionic cross-linking biophysics - NYUAD iGEM 2026 Dunelock toolkit
=================================================================
Reproduces the "Cross-Linking Biophysics" module: divalent Ca2+ cross-linking of a
carboxylated biopolymer (gamma-PGA) into a load-bearing hydrogel, via a Langmuir
binding isotherm feeding affine rubber-elasticity network theory.

Exact port of src/lib/physics/crosslink.ts.
  theta = [C2+] / (Kd + [C2+])                 fractional site saturation (Langmuir)
  nu    = rho_polymer * theta * (1 - 2 Mx/Mn)  effective network density
  G     = nu * R * T                            shear modulus [Pa]

Constants from CROSSLINK_CALIB in src/lib/physics/constants.ts:
  KdPGA = 4.0 mM. R = 8.314462618 J/mol/K (PHYS.R). Run:  python crosslink.py
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

R = 8.314462618      # PHYS.R  J/mol/K
KD_PGA = 4.0         # CROSSLINK_CALIB.KdPGA  mM
T = 298.15           # 25 C reference


def saturation(ca_mM, Kd=KD_PGA):
    ca = np.asarray(ca_mM, dtype=float)
    return np.where(ca > 0, ca / (Kd + ca), 0.0)


def crosslink_density(rho_polymer, theta, Mx, Mn):
    end_correction = 1 - 2 * Mx / Mn
    return np.maximum(0.0, rho_polymer * theta * end_correction)


def shear_modulus(rho_polymer, ca_mM, Mx=2000.0, Mn=100000.0, temperature=T):
    theta = saturation(ca_mM)
    nu = crosslink_density(rho_polymer, theta, Mx, Mn)
    return nu * R * temperature   # Pa


def figures():
    ca = np.linspace(0, 40, 200)
    figs = []

    # 1) Langmuir saturation of carboxylate sites vs Ca2+.
    fig1, ax1 = plt.subplots()
    ax1.plot(ca, saturation(ca), color=TEAL, lw=2.4)
    ax1.axvline(KD_PGA, color=ROSE, ls="--", lw=1.3)
    ax1.text(KD_PGA + 0.6, 0.15, f"Kd = {KD_PGA} mM", color=ROSE, fontsize=9)
    ax1.set_xlabel("[Ca$^{2+}$]  (mM)")
    ax1.set_ylabel(r"site saturation $\theta$")
    ax1.set_title("Langmuir Ca$^{2+}$ binding to gamma-PGA carboxylates")
    ax1.set_ylim(0, 1)
    fig1.tight_layout()
    figs.append((fig1, "crosslink-1.png"))

    # 2) Shear modulus vs Ca2+ at several polymer network densities.
    fig2, ax2 = plt.subplots()
    for rho, c in zip([2.0, 4.0, 8.0], [ROSE, ORANGE, MAROON]):
        ax2.plot(ca, shear_modulus(rho, ca), color=c, lw=2.2,
                 label=f"rho_polymer = {rho:.0f} kg/m$^3$")
    ax2.set_xlabel("[Ca$^{2+}$]  (mM)")
    ax2.set_ylabel("shear modulus G  (Pa)")
    ax2.set_title("Calcium turns polymer goo into a gel (G = nu R T)")
    ax2.legend(frameon=False)
    fig2.tight_layout()
    figs.append((fig2, "crosslink-2.png"))
    return figs


if __name__ == "__main__":
    for fig, name in figures():
        fig.savefig(name, bbox_inches="tight")
        print("wrote", name)
