"""
Carbonic anhydrase surface display - NYUAD iGEM 2026 Dunelock toolkit
====================================================================
Reproduces the "CA Surface Anchoring" module: the fraction of catalytically active
carbonic anhydrase (CA) displayed on the B. subtilis cell wall is the product of the
independent efficiencies along the secretion-and-anchoring route, compared for the two
routes the wet lab is deciding between (Sortase-mediated ligation vs cell-wall binding
motif).

Port of src/components/simulation/modules/CaAnchoringModule.tsx and the CA activity
scaling in src/lib/physics/caco3.ts.
  eta_display = eta_export * eta_dimer * eta_anchor          (every step must work)
  a_CA        = log10(1 + f E) / log10(1 + E)               normalised CA activity

E = caRateEnhancement = 1e6 (CACO3_CALIB), CA kcat ~ 1e6 /s vs kuncat ~ 0.04 /s.
Component defaults: export 0.70, dimer 0.65, sortase 0.60, motif 0.50.
Run:  python ca-anchoring.py
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

E_ENH = 1.0e6      # CACO3_CALIB.caRateEnhancement
EXPORT, DIMER, SORTASE, MOTIF = 0.70, 0.65, 0.60, 0.50


def display_efficiency(export, dimer, anchor):
    return export * dimer * anchor


def ca_activity(f):
    f = np.clip(f, 0, 1)
    return np.log10(1 + f * E_ENH) / np.log10(1 + E_ENH)


def figures():
    figs = []

    # 1) Stacked multiplicative efficiency for both anchoring routes.
    routes = ["Sortase\nligation", "Binding\nmotif"]
    export = [EXPORT, EXPORT]
    after_dimer = [EXPORT * DIMER, EXPORT * DIMER]
    final = [display_efficiency(EXPORT, DIMER, SORTASE),
             display_efficiency(EXPORT, DIMER, MOTIF)]
    x = np.arange(len(routes))
    fig1, ax1 = plt.subplots()
    ax1.bar(x, export, color=TEAL, edgecolor=ASH, label="after export")
    ax1.bar(x, after_dimer, color=ORANGE, edgecolor=ASH, label="x dimerisation")
    ax1.bar(x, final, color=MAROON, edgecolor=ASH, label="x anchoring (display)")
    for xi, fv in zip(x, final):
        ax1.text(xi, fv + 0.01, f"{fv*100:.0f}%", ha="center", fontsize=9, color=MAROON)
    ax1.set_xticks(x)
    ax1.set_xticklabels(routes)
    ax1.set_ylabel("fraction of cells")
    ax1.set_ylim(0, 1)
    ax1.set_title("Display efficiency = export x dimer x anchor")
    ax1.legend(frameon=False, fontsize=9)
    fig1.tight_layout()
    figs.append((fig1, "ca-anchoring-1.png"))

    # 2) Log-scaled normalised CA activity vs realised rate-enhancement fraction.
    f = np.linspace(0, 1, 200)
    fig2, ax2 = plt.subplots()
    ax2.plot(f, ca_activity(f), color=ORANGE, lw=2.4)
    ax2.set_xlabel("realised enhancement fraction f")
    ax2.set_ylabel("normalised CA activity a$_{CA}$")
    ax2.set_title("CA activity is log-scaled (E spans ~10$^6$)")
    ax2.set_ylim(0, 1)
    fig2.tight_layout()
    figs.append((fig2, "ca-anchoring-2.png"))
    return figs


if __name__ == "__main__":
    for fig, name in figures():
        fig.savefig(name, bbox_inches="tight")
        print("wrote", name)
