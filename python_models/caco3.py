"""
CaCO3 precipitation and biocement strength - NYUAD iGEM 2026 Dunelock toolkit
============================================================================
Reproduces the "CaCO3 Precipitation" module: a geochemical Ca-CO2-H2O precipitation
model with an explicit ACC -> vaterite -> calcite polymorph cascade (non-ureolytic
carbonic-anhydrase MICP), and the calcite-to-strength (UCS) power law.

Exact port of src/lib/physics/caco3.ts.
  carbonate speciation alpha2 at pH (Bjerrum), Omega = [Ca][CO3]/Ksp, SI = log10 Omega
  ACC precipitates when Omega_ACC > 1 (TST rate ~ Omega-1), ripens (k_r) mostly to
  vaterite (fraction f_v) which slowly recrystallises to calcite (k_vc),
  UCS = kUcs * (load-bearing wt%)^nUcs.

Constants from CACO3_CALIB in src/lib/physics/constants.ts (pKa1 6.35, pKa2 10.33,
pKspCalcite 8.48, pKspACC 6.4, kPrecip 0.12, kAccToCalcite 0.05, vateriteFraction 0.6,
kVateriteToCalcite 0.02, vateriteStrengthFactor 0.55, kUcs 31.6, nUcs 1.5).
Run:  python caco3.py
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

pKa1, pKa2 = 6.35, 10.33
pKspCal, pKspACC = 8.48, 6.4
kPrecip, kRipen = 0.12, 0.05
fVaterite, kVatToCal, vatStrength = 0.6, 0.02, 0.55
kUcs, nUcs = 31.6, 1.5
M_CaCO3 = 100.0869


def alpha2(pH):
    H = 10.0 ** (-pH)
    Ka1, Ka2 = 10.0 ** (-pKa1), 10.0 ** (-pKa2)
    return Ka1 * Ka2 / (H * H + Ka1 * H + Ka1 * Ka2)


def sat_ratio(ca_M, co3_M, pKsp):
    return ca_M * co3_M / (10.0 ** (-pKsp))


def simulate(ca_mM=20.0, dic_max_mM=25.0, pH=9.5, ca_activity=0.9,
             hours=48.0, dt=0.25, sand_g_per_L=1500.0):
    steps = int(round(hours / dt))
    a2 = alpha2(np.clip(pH, 8.5, 10.5))
    dic_target = dic_max_mM * np.clip(ca_activity, 0, 1) / 1000.0
    kDic = 0.6
    ca, dic, acc, vaterite, calcite = ca_mM / 1000.0, 0.0, 0.0, 0.0, 0.0
    t = np.zeros(steps + 1)
    cal_series, vat_series, si_series = (np.zeros(steps + 1) for _ in range(3))
    for i in range(steps + 1):
        co3 = a2 * dic
        omegaCal = sat_ratio(ca, co3, pKspCal)
        omegaACC = sat_ratio(ca, co3, pKspACC)
        t[i] = i * dt
        cal_series[i], vat_series[i] = calcite, vaterite
        si_series[i] = np.log10(omegaCal) if omegaCal > 0 else -np.inf
        dDic = kDic * (dic_target - dic)
        accDrive = max(0.0, omegaACC - 1)
        rAcc = min(kPrecip * accDrive, ca / dt, dic / dt)
        rRipen = kRipen * acc
        rVat = kVatToCal * vaterite
        ca = max(0.0, ca - rAcc * dt)
        dic = max(0.0, dic + (dDic - rAcc) * dt)
        acc = max(0.0, acc + (rAcc - rRipen) * dt)
        vaterite = max(0.0, vaterite + (rRipen * fVaterite - rVat) * dt)
        calcite = max(0.0, calcite + (rRipen * (1 - fVaterite) + rVat) * dt)
    cal_wt = cal_series * M_CaCO3 / sand_g_per_L * 100
    vat_wt = vat_series * M_CaCO3 / sand_g_per_L * 100
    load_wt = cal_wt + vatStrength * vat_wt
    return t, cal_series, vat_series, si_series, load_wt


def calcite_to_ucs(wt_percent):
    wt = np.maximum(0.0, wt_percent)
    return kUcs * np.power(wt, nUcs)


def figures():
    figs = []

    # 1) Polymorph cascade over time.
    t, cal, vat, si, load = simulate()
    fig1, ax1 = plt.subplots()
    ax1.plot(t, vat * 1000, color=ROSE, lw=2.2, label="vaterite (metastable)")
    ax1.plot(t, cal * 1000, color=MAROON, lw=2.4, label="calcite (durable)")
    ax1.set_xlabel("time (h)")
    ax1.set_ylabel("carbonate  (mmol/L)")
    ax1.set_title("ACC -> vaterite -> calcite polymorph cascade")
    ax1.legend(frameon=False)
    fig1.tight_layout()
    figs.append((fig1, "caco3-1.png"))

    # 2) Biocement strength (UCS) power law vs load-bearing carbonate wt%.
    wt = np.linspace(0, 12, 200)
    fig2, ax2 = plt.subplots()
    ax2.plot(wt, calcite_to_ucs(wt) / 1000.0, color=ORANGE, lw=2.4)
    ax2.set_xlabel("load-bearing carbonate  (wt%)")
    ax2.set_ylabel("UCS  (MPa)")
    ax2.set_title(r"Biocement strength  UCS = $k\,w^{\,n}$  (n = 1.5)")
    fig2.tight_layout()
    figs.append((fig2, "caco3-2.png"))
    return figs


if __name__ == "__main__":
    for fig, name in figures():
        fig.savefig(name, bbox_inches="tight")
        print("wrote", name)
