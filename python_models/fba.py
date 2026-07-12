"""
Flux Balance Analysis (FBA) - NYUAD iGEM 2026 Dunelock toolkit
==============================================================
Reproduces the "Flux Balance Analysis" module. FBA maximises a linear objective
c.v subject to the steady-state mass balance S.v = 0 and flux bounds lb <= v <= ub.

Port of src/lib/physics/fba.ts (solveFBA / productionEnvelope). The website solves a
full user-supplied network with a two-phase simplex; here we solve the same linear
program on a compact, illustrative B. subtilis central-carbon network with SciPy's
linprog, and trace the growth-vs-precursor production envelope.

Uptake bounds are from FBA_CALIB in src/lib/physics/constants.ts:
  vGlcMax = 15 mmol/gDCW/h, non-growth ATP maintenance = 1 mmol/gDCW/h.

No fabricated data: the network is a reduced teaching model; every bound traces to
constants.ts. Run:  python fba.py
"""

import numpy as np
import matplotlib.pyplot as plt
from scipy.optimize import linprog

ORANGE, TEAL, ROSE, MAROON, ASH = "#D6884A", "#8FB3AC", "#C28A7C", "#6E1E18", "#8A7E75"
plt.rcParams.update({
    "figure.figsize": (7.2, 4.3), "font.size": 11, "figure.dpi": 130,
    "axes.spines.top": False, "axes.spines.right": False,
    "axes.edgecolor": ASH, "axes.grid": True, "grid.color": "#E7D8C4",
    "grid.linewidth": 0.8, "axes.titleweight": "bold", "figure.facecolor": "#FBF7F0",
    "axes.facecolor": "#FBF7F0",
})

# --- Reduced central-carbon network -----------------------------------------
# Reactions: v = [EX_GLC, GLYC, RESP, BIOMASS, PRECURSOR]
#   EX_GLC   : -> glc                         (uptake, bound 0..15)
#   GLYC     : glc -> 2 pyr + 2 atp
#   RESP     : pyr -> 3 atp                    (lumped TCA + oxidative phosphorylation)
#   BIOMASS  : 1.5 pyr + 20 atp ->            (growth objective)
#   PRECURSOR: 1 pyr ->                        (glutamate / gamma-PGA precursor export)
# Metabolites (rows of S): glc, pyr, atp. A fixed maintenance ATP drain of 1 is folded
# into the atp balance as a constant.
RXNS = ["EX_GLC", "GLYC", "RESP", "BIOMASS", "PRECURSOR"]
VGLC_MAX = 15.0      # FBA_CALIB.vGlcMax
ATP_MAINT = 1.0      # FBA_CALIB.atpMaintenance

# S.v = b, with b encoding the constant maintenance drain on ATP.
S = np.array([
    [1, -1,  0,   0,    0],   # glc:  EX_GLC - GLYC = 0
    [0,  2, -1, -1.5,  -1],   # pyr:  2*GLYC - RESP - 1.5*BIOMASS - PRECURSOR = 0
    [0,  2,  3, -20,    0],   # atp:  2*GLYC + 3*RESP - 20*BIOMASS - maint = 0
], dtype=float)
B = np.array([0.0, 0.0, ATP_MAINT])
BOUNDS = [(0, VGLC_MAX), (0, None), (0, None), (0, None), (0, None)]


def solve_fba(objective_idx, maximize=True, extra_eq=None):
    """Solve one FBA LP; extra_eq is an optional (row, rhs) equality to pin a flux."""
    c = np.zeros(len(RXNS))
    c[objective_idx] = -1.0 if maximize else 1.0  # linprog minimises
    A_eq, b_eq = S.copy(), B.copy()
    if extra_eq is not None:
        row, rhs = extra_eq
        A_eq = np.vstack([A_eq, row])
        b_eq = np.append(b_eq, rhs)
    res = linprog(c, A_eq=A_eq, b_eq=b_eq, bounds=BOUNDS, method="highs")
    return res


def production_envelope(n=25):
    """Growth vs precursor Pareto front: sweep biomass, maximise precursor at each."""
    bio_idx, prec_idx = RXNS.index("BIOMASS"), RXNS.index("PRECURSOR")
    mu_max = -solve_fba(bio_idx, maximize=True).fun
    mus = np.linspace(0, mu_max, n)
    prec_max = []
    for mu in mus:
        pin = (np.eye(len(RXNS))[bio_idx], mu)
        r = solve_fba(prec_idx, maximize=True, extra_eq=pin)
        prec_max.append(-r.fun if r.success else 0.0)
    return mus, np.array(prec_max), mu_max


def figures():
    figs = []

    # 1) Optimal flux distribution at maximum growth.
    r = solve_fba(RXNS.index("BIOMASS"), maximize=True)
    fig1, ax1 = plt.subplots()
    colors = [ORANGE, TEAL, TEAL, MAROON, ROSE]
    ax1.bar(RXNS, r.x, color=colors, edgecolor=ASH)
    ax1.set_ylabel("Flux  (mmol gDCW$^{-1}$ h$^{-1}$)")
    ax1.set_title("FBA optimal flux distribution (max growth)")
    ax1.tick_params(axis="x", rotation=20)
    fig1.tight_layout()
    figs.append((fig1, "fba-1.png"))

    # 2) Production envelope: growth vs precursor trade-off.
    mus, prec, mu_max = production_envelope()
    fig2, ax2 = plt.subplots()
    ax2.plot(mus, prec, color=MAROON, lw=2.4)
    ax2.fill_between(mus, prec, color=ORANGE, alpha=0.28)
    ax2.set_xlabel("Growth flux  (h$^{-1}$)")
    ax2.set_ylabel("Max precursor flux  (mmol gDCW$^{-1}$ h$^{-1}$)")
    ax2.set_title("Production envelope: growth vs precursor")
    ax2.annotate("carbon is split between\ngrowth and product",
                 xy=(mu_max * 0.5, prec[len(prec)//2]), xytext=(mu_max*0.12, prec.max()*0.35),
                 fontsize=9, color=ASH)
    fig2.tight_layout()
    figs.append((fig2, "fba-2.png"))
    return figs


if __name__ == "__main__":
    for fig, name in figures():
        fig.savefig(name, bbox_inches="tight")
        print("wrote", name)
