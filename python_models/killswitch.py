"""
MazE/MazF kill switch dynamics - NYUAD iGEM 2026 Dunelock toolkit
=================================================================
Reproduces the "Kill Switch" module: a Type II toxin-antitoxin (MazE/MazF) circuit.
The stable MazF toxin (cleaves mRNA -> translation arrest -> death) is neutralised by
the labile MazE antitoxin. An aTc-inducible extra mazF copy tips the balance on demand;
plasmid dilution removes plasmid-borne antitoxin and self-limits.

Exact port of the ODE in src/lib/physics/killswitch.ts (RK4).
  dA/dt = sigmaA - deltaA A - kOn A T + kOff C
  dT/dt = sigmaT - deltaT T - kOn A T + kOff C
  dC/dt = kOn A T - kOff C - deltaC C
  net growth mu(T) = muMax (1 - h) - deathMax h,  h = T^n/(toxK^n + T^n)   (Hill)
  d/dt log10(N) = mu / ln10
sigmaT rises with aTc (Tet-promoter Hill); sigmaA falls as the plasmid dilutes.

Parameters are the DEFAULT_KILLSWITCH set in killswitch.ts. Units are nondimensional
(relative dynamics), consistent with the module: nothing here is a measured value.
Run:  python killswitch.py
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

P = dict(atc=100, atcKd=20, tetLeak=0.02, sigmaTconst=0.3, sigmaTmax=6.0,
         sigmaAconst=0.4, sigmaAplasmid=3.0, deltaA=1.0, deltaT=0.25, deltaC=0.1,
         kOn=2.0, kOff=1.0, toxK=1.0, toxN=3, muMax=0.9, deathMax=1.6,
         genTime=0.75, plasmidLossPerGen=0.1, induce=True, induceAt=6.0)


def tet_output(atc_now, p=P):
    h = 2
    hill = atc_now ** h / (p["atcKd"] ** h + atc_now ** h) if atc_now > 0 else 0.0
    return p["tetLeak"] + (1 - p["tetLeak"]) * hill


def plasmid_copy(t, p=P):
    generations = t / max(1e-6, p["genTime"])
    return (1 - p["plasmidLossPerGen"]) ** generations


def net_growth(toxin, p=P):
    t = max(0.0, toxin)
    x = t ** p["toxN"]
    kn = p["toxK"] ** p["toxN"]
    frac = x / (kn + x) if (kn + x) > 0 else 0.0
    return p["muMax"] * (1 - frac) - p["deathMax"] * frac


def derivs(state, t, p=P):
    A, T, C, _ = state
    atc_now = p["atc"] if (p["induce"] and t >= p["induceAt"]) else 0.0
    sigmaT = p["sigmaTconst"] + p["sigmaTmax"] * tet_output(atc_now, p)
    sigmaA = p["sigmaAconst"] + p["sigmaAplasmid"] * plasmid_copy(t, p)
    bind = p["kOn"] * A * T
    unbind = p["kOff"] * C
    dA = sigmaA - p["deltaA"] * A - bind + unbind
    dT = sigmaT - p["deltaT"] * T - bind + unbind
    dC = bind - unbind - p["deltaC"] * C
    dLogN = net_growth(T, p) / np.log(10)
    return np.array([dA, dT, dC, dLogN])


def simulate(p=P, final_time=48.0, dt=0.02):
    steps = int(round(final_time / dt))
    s = np.array([3.0, 0.1, 2.0, 0.0])   # near pre-induction steady state
    t = np.zeros(steps + 1)
    hist = np.zeros((steps + 1, 4))
    for i in range(steps + 1):
        t[i], hist[i] = i * dt, s
        k1 = derivs(s, t[i], p)
        k2 = derivs(s + 0.5 * dt * k1, t[i] + dt / 2, p)
        k3 = derivs(s + 0.5 * dt * k2, t[i] + dt / 2, p)
        k4 = derivs(s + dt * k3, t[i] + dt, p)
        s = s + (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4)
        s[:3] = np.clip(s[:3], 0, 1e6)
        s[3] = max(-12, s[3])
    return t, hist


def figures():
    figs = []
    t, h = simulate()

    # 1) Toxin / antitoxin / complex dynamics after the aTc trigger.
    fig1, ax1 = plt.subplots()
    ax1.plot(t, h[:, 0], color=TEAL, lw=2, label="antitoxin MazE")
    ax1.plot(t, h[:, 1], color=MAROON, lw=2.4, label="free toxin MazF")
    ax1.plot(t, h[:, 2], color=ORANGE, lw=2, label="MazE.MazF complex")
    ax1.axvline(P["induceAt"], color=ASH, ls="--", lw=1.2)
    ax1.text(P["induceAt"] + 0.5, ax1.get_ylim()[1] * 0.85, "aTc added", color=ASH, fontsize=9)
    ax1.set_xlabel("time (h)")
    ax1.set_ylabel("level (a.u.)")
    ax1.set_title("Toxin-antitoxin dynamics on induction")
    ax1.legend(frameon=False)
    fig1.tight_layout()
    figs.append((fig1, "killswitch-1.png"))

    # 2) Population viability collapse (log10 N/N0).
    fig2, ax2 = plt.subplots()
    ax2.plot(t, h[:, 3], color=MAROON, lw=2.6)
    for logs in (3, 6):
        ax2.axhline(-logs, color=ROSE, ls="--", lw=1)
        idx = np.argmax(h[:, 3] <= -logs)
        if h[idx, 3] <= -logs:
            ax2.text(t[idx] + 0.3, -logs + 0.2, f"{logs}-log kill @ {t[idx]:.1f} h",
                     color=ROSE, fontsize=9)
    ax2.set_xlabel("time (h)")
    ax2.set_ylabel("viability  log$_{10}$(N/N$_0$)")
    ax2.set_title("Kill-switch viability collapse")
    fig2.tight_layout()
    figs.append((fig2, "killswitch-2.png"))
    return figs


if __name__ == "__main__":
    for fig, name in figures():
        fig.savefig(name, bbox_inches="tight")
        print("wrote", name)
