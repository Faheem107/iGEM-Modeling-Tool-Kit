"""
Metabolic gene-expression cascade - NYUAD iGEM 2026 Dunelock toolkit
====================================================================
Reproduces the "Metabolic Model" module: a three-stage transcription -> translation
-> catalysis ODE for gamma-PGA (poly-gamma-glutamate) production, integrated with RK4.

Exact port of src/lib/physics/metabolic.ts.
  d[M]/dt = alpha_m       - beta_m [M]                       (DNA normalised to 1)
  d[E]/dt = alpha_e [M]   - beta_e [E]
  d[P]/dt = k_cat [E] [S]/(K_m + [S]) - k_deg [P]

Degradation-pathway knockouts (dggt, dpgcA) drive k_deg -> 0: dggt gives a 90%
reduction, dpgcA a further 80%, both together set k_deg = 0 so gamma-PGA accumulates.

Defaults match the workspace (MetabolicParams in src/components/...). Run:
  python metabolic.py
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

PARAMS = dict(alpha_m=0.12, beta_m=0.02, alpha_e=0.08, beta_e=0.01,
              k_cat=4.5, s_precursor=2.5, k_m=1.0, k_deg=0.05)


def effective_kdeg(ggt_ko, pgca_ko, k_deg):
    if ggt_ko and pgca_ko:
        return 0.0
    k = k_deg
    if ggt_ko:
        k *= 0.1
    if pgca_ko:
        k *= 0.2
    return k


def derivs(p, k_deg, m, e, pga):
    dm = p["alpha_m"] * 1.0 - p["beta_m"] * m
    de = p["alpha_e"] * m - p["beta_e"] * e
    dp = p["k_cat"] * e * p["s_precursor"] / (p["k_m"] + p["s_precursor"]) - k_deg * pga
    return np.array([dm, de, dp])


def simulate(p, ggt_ko=False, pgca_ko=False, final_time=48.0, dt=0.25):
    k_deg = effective_kdeg(ggt_ko, pgca_ko, p["k_deg"])
    steps = int(round(final_time / dt))
    y = np.zeros(3)  # [mRNA, enzyme, PGA]
    t = np.zeros(steps + 1)
    out = np.zeros((steps + 1, 3))
    for i in range(steps + 1):
        out[i], t[i] = y, i * dt
        k1 = derivs(p, k_deg, *y)
        k2 = derivs(p, k_deg, *(y + 0.5 * dt * k1))
        k3 = derivs(p, k_deg, *(y + 0.5 * dt * k2))
        k4 = derivs(p, k_deg, *(y + dt * k3))
        y = y + (dt / 6.0) * (k1 + 2 * k2 + 2 * k3 + k4)
    return t, out


def figures():
    figs = []

    # 1) Time-courses of mRNA, enzyme, PGA for the double-knockout strain.
    t, y = simulate(PARAMS, ggt_ko=True, pgca_ko=True)
    fig1, ax1 = plt.subplots()
    ax1.plot(t, y[:, 0], color=TEAL, lw=2, label="mRNA [M]")
    ax1.plot(t, y[:, 1], color=ORANGE, lw=2, label="enzyme [E]")
    ax1.plot(t, y[:, 2], color=MAROON, lw=2.4, label="gamma-PGA [P]")
    ax1.set_xlabel("time (h)")
    ax1.set_ylabel("concentration (a.u.)")
    ax1.set_title("Gene -> mRNA -> enzyme -> gamma-PGA  (dggt dpgcA)")
    ax1.legend(frameon=False)
    fig1.tight_layout()
    figs.append((fig1, "metabolic-1.png"))

    # 2) Final gamma-PGA yield across knockout strategies.
    strategies = [("wild type", False, False), ("dggt", True, False),
                  ("dpgcA", False, True), ("dggt dpgcA", True, True)]
    yields = [simulate(PARAMS, g, p)[1][-1, 2] for _, g, p in strategies]
    fig2, ax2 = plt.subplots()
    ax2.bar([s[0] for s in strategies], yields,
            color=[ASH, TEAL, ROSE, MAROON], edgecolor=ASH)
    ax2.set_ylabel("final gamma-PGA (a.u.)")
    ax2.set_title("Knocking out the degradation pathways lifts yield")
    fig2.tight_layout()
    figs.append((fig2, "metabolic-2.png"))
    return figs


if __name__ == "__main__":
    for fig, name in figures():
        fig.savefig(name, bbox_inches="tight")
        print("wrote", name)
