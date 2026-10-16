"""
Economic scalability - NYUAD iGEM 2026 Dunelock toolkit
=======================================================
Reproduces the "Economic Scalability" module: deployment cost per combination,
benchmarked against a conventional chemical spray, plus the break-even area.

Exact port of src/lib/physics/economic.ts.
  Routes 1 and 2 (bacterial): one flat treatment cost per hectare, 1750 USD, the business
                              team's estimate with field application included
  Route 3 (alginate)        : purchased commodity biopolymer + crosslinker
  Bacterial routes share one bioprocess capex; alginate needs none.

Constants from ECONOMIC_CALIB (constants.ts): treatment 1750 USD/ha, capex 25000 USD,
application 180 USD/ha (alginate alone only), chemical baseline 2800 USD/ha, concrete
300000 USD/ha (30 USD/m2), alginate 10.5 USD/kg x 400 kg/ha. Run:  python economic.py
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

# ECONOMIC_CALIB
TREATMENT_HA = 1750.0
ALG_KG, ALG_DOSE_HA = 10.5, 400.0
CAPEX, APPLICATION_HA = 25000.0, 180.0
CHEM_HA, CONCRETE_HA = 2800.0, 300000.0


def recurring_lines(routes):
    """Per-hectare cost lines: (bacterial treatment, alginate, application pass)."""
    bacterial = any(p in (1, 2) for p in routes)
    treatment = TREATMENT_HA if bacterial else 0.0
    alginate = ALG_DOSE_HA * ALG_KG if 3 in routes else 0.0
    # The treatment figure already pays for the spray pass.
    application = 0.0 if bacterial else APPLICATION_HA
    return treatment, alginate, application


def combination_cost(routes, area_ha):
    capex = CAPEX if any(p in (1, 2) for p in routes) else 0.0
    recurring = sum(recurring_lines(routes))
    total = capex + recurring * area_ha
    return capex, recurring, total


def figures():
    figs = []

    # 1) All-in cost per hectare vs area (amortised capex) against baselines.
    area = np.linspace(1, 500, 300)
    fig1, ax1 = plt.subplots()
    for combo, lab, c in [([1, 2], "gamma-PGA + CaCO3", MAROON),
                          ([3], "alginate only (modelled, not deployed)", TEAL)]:
        capex, recurring, _ = combination_cost(combo, 1.0)
        cost_per_ha = capex / area + recurring
        ax1.plot(area, cost_per_ha, color=c, lw=2.2, label=lab)
    ax1.axhline(CHEM_HA, color=ROSE, ls="--", lw=1.4)
    ax1.text(320, CHEM_HA + 120, "chemical spray baseline", color=ROSE, fontsize=9)
    ax1.set_xlabel("treated area (ha)")
    ax1.set_ylabel("all-in cost  (USD/ha)")
    ax1.set_title("Cost per hectare against treated area")
    ax1.set_ylim(0, 5000)
    ax1.legend(frameon=False, fontsize=9, loc="upper right", bbox_to_anchor=(1.0, 0.84))
    fig1.tight_layout()
    figs.append((fig1, "economic-1.png"))

    # 2) Cost breakdown per combination at 100 ha.
    combos = [[1], [2], [3], [1, 2], [1, 2, 3]]
    labels = ["P1", "P2", "P3*", "P1+P2", "all*"]
    area = 100.0
    treat_ha, alg_ha, app_ha, capex_ha = [], [], [], []
    for c in combos:
        treatment, alginate, application = recurring_lines(c)
        capex, _, _ = combination_cost(c, area)
        treat_ha.append(treatment)
        alg_ha.append(alginate)
        app_ha.append(application)
        capex_ha.append(capex / area)
    x = np.arange(len(combos))
    fig2, ax2 = plt.subplots()
    bottom = np.zeros(len(combos))
    for vals, col, lab in [(treat_ha, MAROON, "bacterial treatment (incl. application)"),
                           (alg_ha, ROSE, "alginate"),
                           (app_ha, ORANGE, "field application"),
                           (capex_ha, TEAL, "amortised capex (100 ha)")]:
        ax2.bar(x, vals, bottom=bottom, color=col, label=lab)
        bottom += np.array(vals)
    ax2.set_xticks(x)
    ax2.set_xticklabels(labels)
    for i, c in enumerate(combos):          # hatch anything that leans on alginate
        if 3 in c:
            for container in ax2.containers:
                container[i].set_hatch("//")
    ax2.set_ylabel("cost  (USD/ha)")
    ax2.set_title("Cost breakdown at 100 hectares")
    ax2.legend(frameon=False, fontsize=9)
    ax2.text(0, -0.16, "* includes alginate, modelled for comparison and not deployed",
             transform=ax2.transAxes, fontsize=8, color=ASH, va="top")
    fig2.tight_layout()
    figs.append((fig2, "economic-2.png"))
    return figs


if __name__ == "__main__":
    for fig, name in figures():
        fig.savefig(name, bbox_inches="tight")
        print("wrote", name)
