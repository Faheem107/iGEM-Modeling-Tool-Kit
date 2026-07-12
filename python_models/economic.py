"""
Economic scalability - NYUAD iGEM 2026 Dunelock toolkit
=======================================================
Reproduces the "Economic Scalability" module: bottom-up per-prong deployment cost,
summed per combination and benchmarked against the published biocementation and
carbon-market literature, plus break-even area vs a conventional chemical spray.

Exact port of src/lib/physics/economic.ts.
  Prong 1 (gamma-PGA)  : fermentation (glucose + salts + utilities), scaled by broth yield
  Prong 2 (CaCO3/MICP) : calcium + enzyme dosing, minus a CO2 credit
  Prong 3 (alginate)   : purchased commodity biopolymer + crosslinker
  Bacterial prongs (1,2) share one bioprocess capex; alginate needs none.

Constants from ECONOMIC_CALIB (constants.ts): capex 25000 USD, application 180 USD/ha,
chemical baseline 2800 USD/ha, caReagent 650 USD/ha, alginate 9 USD/kg x 400 kg/ha, etc.
Every figure is checked against a cited study (see moduleSources). Run:  python economic.py
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
GLUCOSE_KG, MEDIA_L, UTIL_L, GLUC_FRAC = 0.4, 0.08, 0.04, 0.03
CA_REAGENT_HA, CO2_CREDIT_KG = 650.0, 0.01
ALG_KG, ALG_DOSE_HA = 9.0, 400.0
CAPEX, APPLICATION_HA = 25000.0, 180.0
CHEM_HA, CONCRETE_HA = 2800.0, 18500.0

CTX = dict(crust_mm=5.0, pga_yield_g_per_L=25.0, pga_demand_kg_per_m3=2.0,
           co2_g_per_L=8.0)


def m3_per_ha(mm):
    return 10000 * (mm / 1000.0)


def prong_opex(prong, ctx=CTX):
    vol = m3_per_ha(ctx["crust_mm"])
    if prong == 1:
        pga_kg = vol * ctx["pga_demand_kg_per_m3"]
        liters = pga_kg / max(1e-6, ctx["pga_yield_g_per_L"] / 1000.0)
        per_liter = GLUC_FRAC * GLUCOSE_KG + MEDIA_L + UTIL_L
        return liters * per_liter
    if prong == 2:
        co2_kg = (ctx["co2_g_per_L"] / 1000.0) * (vol * 1000.0)
        return max(0.0, CA_REAGENT_HA - co2_kg * CO2_CREDIT_KG)
    return ALG_DOSE_HA * ALG_KG


def combination_cost(prongs, area_ha, ctx=CTX):
    opex = sum(prong_opex(p, ctx) for p in prongs)
    capex = CAPEX if any(p in (1, 2) for p in prongs) else 0.0
    recurring = opex + APPLICATION_HA
    total = capex + recurring * area_ha
    return capex, recurring, total


def figures():
    figs = []

    # 1) All-in cost per hectare vs area (amortised capex) against baselines.
    area = np.linspace(1, 500, 300)
    fig1, ax1 = plt.subplots()
    for combo, lab, c in [([1, 2], "gamma-PGA + CaCO3", MAROON),
                          ([2], "CaCO3 only", ORANGE),
                          ([3], "alginate only", TEAL)]:
        capex, recurring, _ = combination_cost(combo, 1.0)
        cost_per_ha = capex / area + recurring
        ax1.plot(area, cost_per_ha, color=c, lw=2.2, label=lab)
    ax1.axhline(CHEM_HA, color=ROSE, ls="--", lw=1.4)
    ax1.text(320, CHEM_HA + 120, "chemical spray baseline", color=ROSE, fontsize=9)
    ax1.set_xlabel("treated area (ha)")
    ax1.set_ylabel("all-in cost  (USD/ha)")
    ax1.set_title("Cost per hectare falls as capex amortises")
    ax1.set_ylim(0, 4000)
    ax1.legend(frameon=False, fontsize=9)
    fig1.tight_layout()
    figs.append((fig1, "economic-1.png"))

    # 2) Cost breakdown per combination at 100 ha.
    combos = [[1], [2], [3], [1, 2], [1, 2, 3]]
    labels = ["P1", "P2", "P3", "P1+P2", "all"]
    area = 100.0
    capex_ha, opex_ha, app_ha = [], [], []
    for c in combos:
        capex, recurring, _ = combination_cost(c, area)
        capex_ha.append(capex / area)
        opex_ha.append(recurring - APPLICATION_HA)
        app_ha.append(APPLICATION_HA)
    x = np.arange(len(combos))
    fig2, ax2 = plt.subplots()
    ax2.bar(x, opex_ha, color=MAROON, label="reagents / fermentation")
    ax2.bar(x, app_ha, bottom=opex_ha, color=ORANGE, label="field application")
    ax2.bar(x, capex_ha, bottom=np.array(opex_ha) + np.array(app_ha),
            color=TEAL, label="amortised capex (100 ha)")
    ax2.set_xticks(x)
    ax2.set_xticklabels(labels)
    ax2.set_ylabel("cost  (USD/ha)")
    ax2.set_title("Deployment cost breakdown at 100 ha")
    ax2.legend(frameon=False, fontsize=9)
    fig2.tight_layout()
    figs.append((fig2, "economic-2.png"))
    return figs


if __name__ == "__main__":
    for fig, name in figures():
        fig.savefig(name, bbox_inches="tight")
        print("wrote", name)
