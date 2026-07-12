"""
Composite strength synthesis - NYUAD iGEM 2026 Dunelock toolkit
===============================================================
Reproduces the "Composite Synthesis" module: when two or more prongs act together their
cohesions combine (rule of mixtures plus a labelled synergy term), after each prong is
knocked down by the interactions it takes part in (shared-Ca2+ competition, co-expression
burden). Redundancy is scored as: the crust survives a scenario if at least one mechanism
survives it.

Port of src/lib/physics/composite.ts and interactions.ts.
  competitive Langmuir Ca2+: supply = c_f + sum_p B_p c_f/(Kd_p + c_f)   (solved by bisection)
  phi_Ca,p = theta_shared / theta_alone       burden beta for co-expressed P1 & P2
  gamma_total = sum_i g_i phi_i + sum_{i<j} eta_ij sqrt(g_i g_j)
  robustness  = 1 - prod_p (1 - r_p)

Constants: INTERACTION_CALIB (caSupply 2.6, demands 1.0/2.0/1.2, KdCalcite 0.05,
coexpressionBurden 0.78), CROSSLINK KdPGA 4.0, ALGINATE KdCa 1.0, COMPOSITE eta
(1-2 0.2, 1-3 0.05, 2-3 0.1). Run:  python composite.py
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

CA_SUPPLY = 2.6
CA_DEMAND = {1: 1.0, 2: 2.0, 3: 1.2}
CA_KD = {1: 4.0, 2: 0.05, 3: 1.0}   # KdPGA, KdCalcite (sink), KdCa
BURDEN = 0.78
ETA = {(1, 2): 0.2, (1, 3): 0.05, (2, 3): 0.1}
SCENARIOS = ["Drought/Heat", "Flood/Rain", "Bacterial Death", "High Wind", "Durability"]
RESILIENCE = {
    1: [0.7, 0.2, 0.15, 0.6, 0.35],
    2: [0.85, 0.8, 0.7, 0.9, 0.9],
    3: [0.75, 0.2, 0.95, 0.55, 0.4],
}


def occupancy(free_ca, kd):
    return free_ca / (kd + free_ca)


def solve_free_ca(prongs, supply=CA_SUPPLY):
    def bound(c):
        return sum(CA_DEMAND[p] * occupancy(c, CA_KD[p]) for p in prongs)
    lo, hi = 0.0, supply
    for _ in range(60):
        mid = 0.5 * (lo + hi)
        if mid + bound(mid) > supply:
            hi = mid
        else:
            lo = mid
    return 0.5 * (lo + hi)


def yield_factors(prongs):
    free_shared = solve_free_ca(prongs)
    out = {}
    for p in prongs:
        theta_shared = occupancy(free_shared, CA_KD[p])
        theta_alone = occupancy(solve_free_ca([p]), CA_KD[p])
        f = min(1.0, theta_shared / theta_alone) if theta_alone > 0 else 1.0
        if p in (1, 2) and (1 in prongs and 2 in prongs):
            f *= BURDEN
        out[p] = f
    return out


def composite_cohesion(prongs, base_cohesion):
    yf = yield_factors(prongs)
    g = {p: base_cohesion[p] * yf[p] for p in prongs}
    additive = sum(g.values())
    interaction = 0.0
    for i in range(len(prongs)):
        for j in range(i + 1, len(prongs)):
            a, b = sorted((prongs[i], prongs[j]))
            interaction += ETA.get((a, b), 0.0) * np.sqrt(g[a] * g[b])
    return additive, additive + interaction, yf


def robustness(prongs):
    out = []
    for k in range(len(SCENARIOS)):
        miss = 1.0
        for p in prongs:
            miss *= 1 - RESILIENCE[p][k]
        out.append(1 - miss)
    return out


def figures():
    figs = []
    base = {1: 5e-4, 2: 9e-4, 3: 4e-4}   # per-prong standalone cohesion [N/m]

    # 1) Additive vs composite cohesion across combinations (competition + synergy).
    combos = [[1], [2], [3], [1, 2], [2, 3], [1, 2, 3]]
    labels = ["P1", "P2", "P3", "P1+P2", "P2+P3", "all"]
    add_vals, tot_vals = [], []
    for c in combos:
        a, t, _ = composite_cohesion(c, base)
        add_vals.append(a * 1000)
        tot_vals.append(t * 1000)
    x = np.arange(len(combos))
    fig1, ax1 = plt.subplots()
    ax1.bar(x - 0.2, add_vals, 0.4, color=ASH, label="additive (no interaction)")
    ax1.bar(x + 0.2, tot_vals, 0.4, color=MAROON, label="composite (competition + synergy)")
    ax1.set_xticks(x)
    ax1.set_xticklabels(labels)
    ax1.set_ylabel("cohesion  (mN/m)")
    ax1.set_title("Composite cohesion: shared-Ca$^{2+}$ competition vs synergy")
    ax1.legend(frameon=False, fontsize=9)
    fig1.tight_layout()
    figs.append((fig1, "composite-1.png"))

    # 2) Redundancy: per-scenario resilience, single best prong vs full combination.
    combined_all = robustness([1, 2, 3])
    best_single = [max(RESILIENCE[p][k] for p in (1, 2, 3)) for k in range(len(SCENARIOS))]
    x = np.arange(len(SCENARIOS))
    fig2, ax2 = plt.subplots()
    ax2.bar(x - 0.2, best_single, 0.4, color=ROSE, label="best single prong")
    ax2.bar(x + 0.2, combined_all, 0.4, color=TEAL, label="all three (redundant)")
    ax2.set_xticks(x)
    ax2.set_xticklabels(SCENARIOS, rotation=20, ha="right", fontsize=9)
    ax2.set_ylabel("resilience  (0-1)")
    ax2.set_ylim(0, 1)
    ax2.set_title("Prongs cover each other's failure modes")
    ax2.legend(frameon=False, fontsize=9)
    fig2.tight_layout()
    figs.append((fig2, "composite-2.png"))
    return figs


if __name__ == "__main__":
    for fig, name in figures():
        fig.savefig(name, bbox_inches="tight")
        print("wrote", name)
