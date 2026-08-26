"""
Grain-size coverage - NYUAD iGEM 2026 Dunelock toolkit
======================================================
Reproduces the "Grain-Size Coverage" module: sand is a distribution of grain sizes and
no single binder works at every size. MICP (CaCO3) cements a mid-fine sweet spot;
gamma-PGA bridges fine/medium contacts; alginate coats grains broadly. A grain is held
if AT LEAST ONE mechanism binds it, and coverage is integrated over the site's
log-normal grain-size distribution.

Exact port of src/lib/physics/grainsize.ts.
  e_MICP(d) = exp(-0.5 (ln(d/d_pk)/sigma)^2) * logistic(k ln(d/d_pen))
  e_PGA(d)  = 1 - logistic(k ln(d/d_half))
  e_Alg(d)  = floor + boost * logistic(2 ln(d/d_half))
  C(d)      = 1 - prod_p (1 - e_p(d))
  f_bound   = integral C(d) phi(ln d) d ln d,  phi ~ LogNormal(D50, sigma_g)

Constants from GRAINSIZE_CALIB (constants.ts).

What would make this wrong: phi is read as a mass distribution, which holds only because
GRAINSIZE_CALIB.uaeD50 comes from a sieve/laser PSD and those are reported by mass. Read
the same curve as a count of grains and the answer moves, because the fine tail carries
many grains and little mass. Alginate is included for comparison only; the deployed
product is P1 + P2.

Run:  python grainsize.py
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

# GRAINSIZE_CALIB
MICP_PEAK, MICP_W = 90.0, 0.85
MICP_PEN_D50, MICP_PEN_STEEP = 40.0, 6.0
PGA_HALF, PGA_STEEP = 320.0, 2.5
ALG_FLOOR, ALG_BOOST, ALG_HALF = 0.45, 0.35, 300.0
UAE_D50, UAE_SIGMA = 200.0, 1.35


def logistic(x):
    return 1.0 / (1.0 + np.exp(-x))


def micp_eff(d):
    d = np.maximum(1.0, d)
    z = np.log(d / MICP_PEAK) / MICP_W
    sweet = np.exp(-0.5 * z * z)
    pen = logistic(MICP_PEN_STEEP * np.log(d / MICP_PEN_D50))
    return np.clip(sweet * pen, 0, 1)


def pga_cover(d):
    d = np.maximum(1.0, d)
    return np.clip(1 - logistic(PGA_STEEP * np.log(d / PGA_HALF)), 0, 1)


def alginate_cover(d):
    d = np.maximum(1.0, d)
    coarse = logistic(2 * np.log(d / ALG_HALF))
    return np.clip(ALG_FLOOR + ALG_BOOST * coarse, 0, 1)


def combined(d, prongs):
    fns = {1: pga_cover, 2: micp_eff, 3: alginate_cover}
    miss = np.ones_like(np.asarray(d, float))
    for p in prongs:
        miss = miss * (1 - np.clip(fns[p](d), 0, 1))
    return 1 - miss


def grain_pdf(d, d50=UAE_D50, sigma_g=UAE_SIGMA):
    ln_sigma = np.log(sigma_g)
    z = np.log(d / d50) / ln_sigma
    return np.exp(-0.5 * z * z) / (ln_sigma * np.sqrt(2 * np.pi))


def bound_fraction(prongs, d50=UAE_D50, sigma_g=UAE_SIGMA):
    d = np.exp(np.linspace(np.log(20), np.log(600), 400))
    w = grain_pdf(d, d50, sigma_g)
    w /= w.sum()
    return float(np.sum(w * combined(d, prongs)))


def figures():
    figs = []
    d = np.exp(np.linspace(np.log(20), np.log(600), 400))

    # 1) Per-prong coverage vs grain diameter + the site PSD. Two unions are drawn: the
    # deployed pair, and the same with alginate added. Alginate is modelled for
    # comparison and is not carried forward, so its union is the fainter line.
    fig1, ax1 = plt.subplots()
    ax1b = ax1.twinx()
    psd = ax1b.fill_between(d, grain_pdf(d), color=ROSE, alpha=0.18,
                            label="sand at the site, by mass")
    ax1b.set_yticks([])
    ax1.plot(d, micp_eff(d), color=MAROON, lw=2.2, label="CaCO3 / MICP (P2)")
    ax1.plot(d, pga_cover(d), color=ORANGE, lw=2.2, label="gamma-PGA (P1)")
    ax1.plot(d, alginate_cover(d), color=TEAL, lw=2.2, ls=":",
             label="alginate (P3), modelled only")
    ax1.plot(d, combined(d, [1, 2]), color=ASH, lw=2.6, ls="--",
             label="union, P1 + P2 (deployed)")
    ax1.plot(d, combined(d, [1, 2, 3]), color=ASH, lw=1.4, ls="-.", alpha=0.6,
             label="union with alginate")
    ax1.set_xscale("log")
    ax1.set_xticks([20, 50, 100, 200, 500])
    ax1.get_xaxis().set_major_formatter(plt.ScalarFormatter())
    ax1.set_xlim(d[0], d[-1])
    ax1.set_xlabel("grain diameter  (micron)")
    ax1.set_ylabel("binding effectiveness")
    ax1.set_ylim(0, 1.08)
    ax1.set_title("Binding effectiveness against grain size")
    handles, labels = ax1.get_legend_handles_labels()
    ax1.legend(handles + [psd], labels + ["sand at the site, by mass"],
               frameon=False, fontsize=8, loc="lower center", ncol=2)
    fig1.tight_layout()
    figs.append((fig1, "grainsize-1.png"))

    # 2) Effective bound mass fraction per prong combination.
    combos = [[1], [2], [3], [1, 2], [1, 2, 3]]
    labels = ["P1", "P2", "P3*", "P1+P2", "P1+P2+P3*"]
    vals = [bound_fraction(c) * 100 for c in combos]
    # Alginate-containing bars are hatched: it is modelled for comparison, not deployed.
    hatch = ["", "", "//", "", "//"]
    fig2, ax2 = plt.subplots()
    bars = ax2.bar(labels, vals, color=[ORANGE, MAROON, TEAL, ROSE, ASH], edgecolor=ASH)
    for b, h in zip(bars, hatch):
        b.set_hatch(h)
    for i, v in enumerate(vals):
        ax2.text(i, v + 1, f"{v:.0f}%", ha="center", fontsize=9)
    ax2.set_ylabel("site sand held, by mass (%)")
    ax2.set_title("Sand held by prong combination")
    ax2.set_ylim(0, 100)
    ax2.text(0.0, -0.20, "* includes alginate, which is modelled for comparison and not deployed",
             transform=ax2.transAxes, fontsize=8, color=ASH)
    fig2.tight_layout()
    figs.append((fig2, "grainsize-2.png"))
    return figs


if __name__ == "__main__":
    for fig, name in figures():
        fig.savefig(name, bbox_inches="tight")
        print("wrote", name)
