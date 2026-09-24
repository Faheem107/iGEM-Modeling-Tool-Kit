"""
Series for the wiki's model pages.

The wiki draws its plots as SVG from plain number arrays rather than shipping
images, because the wiki artifact is capped at 5 MB and line work stays sharp at
any width. This script produces those arrays by calling the model functions in
this directory directly, so every point on the wiki is model output and re-running
this reproduces it.

    python3 python_models/wiki_series.py > /tmp/wiki-series.json

The output is consumed by model-wiki/scripts/write-series.mjs, which formats it
into the TypeScript the wiki imports.
"""
import importlib.util
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))


def load(name):
    """Import a model module by filename, including the hyphenated ones."""
    path = os.path.join(HERE, f"{name}.py")
    spec = importlib.util.spec_from_file_location(name.replace("-", "_"), path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def series(xs, ys, places=4):
    """Pair two arrays into [x, y] points, rounded to keep the payload small."""
    xs = np.asarray(xs, dtype=float)
    ys = np.asarray(ys, dtype=float)
    return [[round(float(x), places), round(float(y), places)] for x, y in zip(xs, ys)]


def thin(xs, ys, step):
    return np.asarray(xs)[::step], np.asarray(ys)[::step]


out = {}

# -- the gamma-PGA route -------------------------------------------------
metabolic = load("metabolic")
crosslink = load("crosslink")

t, both_ko = metabolic.simulate(metabolic.PARAMS, ggt_ko=True, pgca_ko=True)
_, no_ko = metabolic.simulate(metabolic.PARAMS, ggt_ko=False, pgca_ko=False)
_, one_ko = metabolic.simulate(metabolic.PARAMS, ggt_ko=True, pgca_ko=False)

# The cascade, each species on its own scale so the shapes can be compared.
out["cascade_mrna"] = series(*thin(t, both_ko[:, 0] / both_ko[:, 0].max(), 4))
out["cascade_enzyme"] = series(*thin(t, both_ko[:, 1] / both_ko[:, 1].max(), 4))
out["cascade_polymer"] = series(*thin(t, both_ko[:, 2] / both_ko[:, 2].max(), 4))

out["knockout_none"] = series(*thin(t, no_ko[:, 2], 4))
out["knockout_one"] = series(*thin(t, one_ko[:, 2], 4))
out["knockout_both"] = series(*thin(t, both_ko[:, 2], 4))
out["_knockout_final"] = {
    "none": round(float(no_ko[-1, 2]), 1),
    "ggt": round(float(one_ko[-1, 2]), 1),
    "both": round(float(both_ko[-1, 2]), 1),
}

ca = np.linspace(0, 40, 121)
for rho, key in ((6.0, "modulus_low"), (12.0, "modulus_mid"), (20.0, "modulus_high")):
    out[key] = series(ca, crosslink.shear_modulus(rho, ca))
out["_modulus_note"] = {
    "half_saturation_mM": crosslink.KD_PGA,
    "at_10mM_mid_Pa": round(float(crosslink.shear_modulus(12.0, 10.0)), 1),
}

# -- the carbonic anhydrase route ----------------------------------------
anchoring = load("ca-anchoring")
caco3 = load("caco3")

# The running product along each anchoring route, step by step. Step 0 is the
# enzyme the cell made, and each later step is what survives that stage.
sortase = [1.0, anchoring.EXPORT, anchoring.EXPORT * anchoring.DIMER,
           anchoring.display_efficiency(anchoring.EXPORT, anchoring.DIMER, anchoring.SORTASE)]
motif = [1.0, anchoring.EXPORT, anchoring.EXPORT * anchoring.DIMER,
         anchoring.display_efficiency(anchoring.EXPORT, anchoring.DIMER, anchoring.MOTIF)]
steps = [0, 1, 2, 3]
out["display_sortase"] = series(steps, sortase)
out["display_motif"] = series(steps, motif)
out["_display_final"] = {
    "sortase": round(sortase[-1], 4),
    "motif": round(motif[-1], 4),
    "ratio": round(sortase[-1] / motif[-1], 3),
}

pH = np.linspace(6.0, 11.0, 201)
out["carbonate_fraction"] = series(pH, caco3.alpha2(pH))
out["_carbonate_at"] = {str(p): round(float(caco3.alpha2(p)), 4) for p in (7.0, 8.5, 9.5, 10.5)}

wt = np.linspace(0, 8, 161)
out["ucs_vs_carbonate"] = series(wt, caco3.calcite_to_ucs(wt))
out["_ucs_at"] = {str(w): round(float(caco3.calcite_to_ucs(w)), 1) for w in (1, 2, 4, 6)}

# -- what is true whichever route runs -----------------------------------
fba = load("fba")
thermal = load("thermal")
killswitch = load("killswitch")
curing = load("curing")
composite = load("composite")

growth, product, mu_max = fba.production_envelope(n=41)
out["production_envelope"] = series(growth, product)
out["_envelope"] = {
    "mu_max": round(float(mu_max), 4),
    "product_at_zero_growth": round(float(product[0]), 3),
    "doubling_min": round(60 * 0.693147 / float(mu_max), 1),
}

temps = np.linspace(20, 80, 241)
out["folded_fraction"] = series(temps, thermal.folded_fraction(temps))
out["_folded"] = {
    "tm": round(float(thermal.operative_tm()), 1),
    "at_45": round(float(thermal.folded_fraction(45.0)), 3),
    "at_50": round(float(thermal.folded_fraction(50.0)), 3),
}

tk, hist = killswitch.simulate()
out["kill_viability"] = series(*thin(tk, hist[:, 3], 40))
no_atc = dict(killswitch.P)
no_atc["atc"] = 0.0
tk2, hist2 = killswitch.simulate(no_atc)
out["kill_viability_no_atc"] = series(*thin(tk2, hist2[:, 3], 40))
out["_kill"] = {
    "with_atc_48h": round(float(hist[-1, 3]), 2),
    "without_atc_48h": round(float(hist2[-1, 3]), 2),
}

hours = np.linspace(0, 48, 193)
for prong, key in ((1, "maturation_pga"), (2, "maturation_caco3")):
    out[key] = series(hours, curing.maturation_fraction(prong, hours))
months = np.linspace(0, 18, 145)
for prong, key in ((1, "weathering_pga"), (2, "weathering_caco3")):
    out[key] = series(months, curing.field_retention(prong, months))
out["_curing"] = {
    "tau_pga_h": curing.TAU[1],
    "tau_caco3_h": curing.TAU[2],
    "halflife_pga_mo": curing.HALFLIFE[1],
    "halflife_caco3_mo": curing.HALFLIFE[2],
    "reapply_months": curing.REAPPLY_MONTHS,
}

# What the two binders are worth together, as the polymer's own contribution is
# swept and the cement is held at its operating value. Three curves, because the
# gap between them is the answer: what they would be worth if they ignored each
# other, what competing for one soil's calcium leaves, and what the nucleation
# gain puts back.
CACO3_BASE = 9e-4                     # N/m, the cement's standalone cohesion
pga_base = np.linspace(0.0, 1.5e-3, 76)
naive, after_competition, with_synergy = [], [], []
for g1 in pga_base:
    base = {1: float(g1), 2: CACO3_BASE}
    additive, combined, _ = composite.composite_cohesion([1, 2], base)
    naive.append((g1 + CACO3_BASE) * 1000.0)        # N/m to mN/m
    after_competition.append(additive * 1000.0)
    with_synergy.append(combined * 1000.0)
out["composite_naive"] = series(pga_base * 1000.0, naive)
out["composite_competed"] = series(pga_base * 1000.0, after_competition)
out["composite_combined"] = series(pga_base * 1000.0, with_synergy)
_at = 40   # the operating point, gamma-PGA at about 0.8 mN/m
out["_composite"] = {
    "supply_mM": composite.CA_SUPPLY,
    "burden": composite.BURDEN,
    "eta_1_2": composite.ETA[(1, 2)],
    "at_pga_mNm": round(float(pga_base[_at] * 1000.0), 3),
    "naive_mNm": round(naive[_at], 3),
    "competed_mNm": round(after_competition[_at], 3),
    "combined_mNm": round(with_synergy[_at], 3),
}

# -- dust and the business case ------------------------------------------
damage = load("damage")
economic = load("economic")

# Held inside Elminir's fitted range. The model extrapolates past it but flags
# the result out of range, and a wiki plot is the wrong place to show that.
q = np.linspace(0, damage.ELMINIR_Q_MAX, 181)
out["transmittance_loss"] = series(q, [damage.transmittance_loss_percent(v).value for v in q])
out["_soiling"] = {
    str(v): round(float(damage.transmittance_loss_percent(v).value), 2) for v in (1, 2, 5, 9)
}
out["_soiling_range_max"] = damage.ELMINIR_Q_MAX

# Starts at 5 ha rather than 1: below that the amortised setup dominates so
# steeply that the rest of the curve is unreadable on a shared axis.
area = np.linspace(5, 300, 296)
per_ha = []
for a in area:
    _, _, total = economic.combination_cost([1, 2], float(a))
    per_ha.append(total / a)
out["cost_per_hectare"] = series(area, per_ha)
capex, recurring, _ = economic.combination_cost([1, 2], 1.0)
out["cost_chemical"] = series(area, [economic.CHEM_HA] * len(area))
out["_cost"] = {
    "capex": capex,
    "recurring_per_ha": round(recurring, 1),
    "chemical_per_ha": economic.CHEM_HA,
    "break_even_ha": (
        round(capex / (economic.CHEM_HA - recurring), 1)
        if economic.CHEM_HA > recurring else None
    ),
}

json.dump(out, sys.stdout)
