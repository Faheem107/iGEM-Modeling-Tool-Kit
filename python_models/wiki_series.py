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
for route, key in ((1, "maturation_pga"), (2, "maturation_caco3")):
    out[key] = series(hours, curing.maturation_fraction(route, hours))
months = np.linspace(0, 18, 145)
for route, key in ((1, "weathering_pga"), (2, "weathering_caco3")):
    out[key] = series(months, curing.field_retention(route, months))
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

# -- spread, containment, heat, and the cement's polymorphs ----------------
ecological = load("ecological")

# Colony front speed. Calcium slows how the cells slide.
ca_local = np.linspace(0, 20, 81)
out["front_speed"] = series(
    ca_local, ecological.fisher_speed(ecological.MU_MAX, ecological.expansion_D(ca_local)) * 24
)

# Chance of at least one escapee over 1 m2, against the per-cell escape rate.
# x is log10(p), so the wiki can plot it on a linear axis.
patch_cells = float(ecological.deployed_population(span_mm=1000.0))
p_escape = np.logspace(-14, -6, 81)
out["escape_probability"] = series(
    np.log10(p_escape), ecological.p_at_least_one(p_escape, patch_cells)
)
out["_escape"] = {
    "cells_per_m2": patch_cells,
    "nih_target": ecological.NIH_TARGET,
    "expected_at_nih": round(patch_cells * ecological.NIH_TARGET, 1),
}

# Toxin and antitoxin, from the same run as the viability curve.
out["kill_antitoxin"] = series(*thin(tk, hist[:, 0], 40))
out["kill_toxin"] = series(*thin(tk, hist[:, 1], 40))

# Melting point across pH, at three salinities.
ph_axis = np.linspace(5.5, 9.0, 71)
for salt, key in ((0.5, "tm_salt_low"), (1.2, "tm_salt_opt"), (2.0, "tm_salt_high")):
    out[key] = series(ph_axis, [thermal.operative_tm(float(v), salt) for v in ph_axis])

# Vaterite forms first, then turns into calcite.
tc, cal, vat, _, _ = caco3.simulate()
out["polymorph_calcite"] = series(*thin(tc, cal * 1000.0, 2))
out["polymorph_vaterite"] = series(*thin(tc, vat * 1000.0, 2))
out["_polymorph"] = {
    "calcite_48h_mM": round(float(cal[-1] * 1000.0), 2),
    "vaterite_48h_mM": round(float(vat[-1] * 1000.0), 2),
    "vaterite_peak_mM": round(float(vat.max() * 1000.0), 2),
    "vaterite_peak_h": round(float(tc[int(np.argmax(vat))]), 1),
}

# -- one plot per equation: the curves the pages did not yet draw -----------
aeolian = load("aeolian")
grainsize = load("grainsize")
exposure = load("exposure")

# gamma-PGA route, Eq 3. The saturating term of the rate law on its own, as a
# share of the enzyme's top speed. K_m is 1 in the model's units, so the x axis
# is glutamate counted in multiples of K_m.
km = metabolic.PARAMS["k_m"]
s_axis = np.linspace(0, 10, 101)
out["mm_rate"] = series(s_axis, s_axis / (km + s_axis))
_s_op = metabolic.PARAMS["s_precursor"]
out["_mm"] = {"k_m": km, "s_operating": _s_op, "rate_at_operating": round(_s_op / (km + _s_op), 3)}

# gamma-PGA route, Eq 4. The occupied share of binding sites against calcium.
out["occupancy"] = series(ca, crosslink.saturation(ca))
out["_occupancy"] = {
    "kd_mM": crosslink.KD_PGA,
    "at_2mM": round(float(crosslink.saturation(2.0)), 3),
    "at_10mM": round(float(crosslink.saturation(10.0)), 3),
    "at_40mM": round(float(crosslink.saturation(40.0)), 3),
}

# Carbonic anhydrase route, Eq 2. All three forms of dissolved carbon, from the
# same two dissociation constants alpha2() uses, so the three sum to one.
ph_wide = np.linspace(4.0, 12.0, 161)
_H = 10.0 ** (-ph_wide)
_Ka1, _Ka2 = 10.0 ** (-caco3.pKa1), 10.0 ** (-caco3.pKa2)
_den = _H * _H + _Ka1 * _H + _Ka1 * _Ka2
out["species_co2"] = series(ph_wide, _H * _H / _den)
out["species_hco3"] = series(ph_wide, _Ka1 * _H / _den)
out["species_co3"] = series(ph_wide, caco3.alpha2(ph_wide))
out["_species"] = {"pKa1": caco3.pKa1, "pKa2": caco3.pKa2}

# Carbonic anhydrase route, Eq 3. Saturation index against pH at the calcium and
# dissolved carbon the precipitation run starts from, for the crystal the crust
# ends as (calcite) and the amorphous solid that has to form first (ACC).
SI_CA_M, SI_DIC_M = 0.020, 0.025
ph_si = np.linspace(7.0, 11.0, 161)
_co3 = caco3.alpha2(ph_si) * SI_DIC_M
si_cal = np.log10(caco3.sat_ratio(SI_CA_M, _co3, caco3.pKspCal))
si_acc = np.log10(caco3.sat_ratio(SI_CA_M, _co3, caco3.pKspACC))
out["si_calcite"] = series(ph_si, si_cal)
out["si_acc"] = series(ph_si, si_acc)
out["_si"] = {
    "ca_mM": SI_CA_M * 1000, "dic_mM": SI_DIC_M * 1000,
    "acc_crosses_zero_pH": round(float(np.interp(0.0, si_acc, ph_si)), 2),
    "calcite_at_9.5": round(float(np.interp(9.5, ph_si, si_cal)), 2),
    "acc_at_9.5": round(float(np.interp(9.5, ph_si, si_acc)), 2),
}

# Carbonic anhydrase route, Eq 6. One mole of carbonate holds one mole of CO2,
# whichever solid it is in, so this counts calcite, vaterite and ACC together,
# as caco3.ts does.
M_CO2 = 44.0095
tq, calq, vatq, _, _, accq = caco3.simulate(return_acc=True)
co2_g = (calq + vatq + accq) * M_CO2
# Only the first six hours are drawn: the run has used all of its calcium by
# then and the curve is flat for the remaining forty-two.
_six = tq <= 6.0
_ceiling = 0.020 * M_CO2          # every mole of the 20 mM calcium, as carbonate
out["co2_locked"] = series(tq[_six], co2_g[_six])
out["co2_ceiling"] = series([0.0, 6.0], [_ceiling, _ceiling])
out["_co2"] = {
    "ceiling_g_per_L": round(_ceiling, 3),
    "at_1h_g_per_L": round(float(np.interp(1.0, tq, co2_g)), 3),
    "at_48h_g_per_L": round(float(co2_g[-1]), 3),
    "hours_to_ceiling": round(float(tq[int(np.argmax(co2_g >= 0.999 * _ceiling))]), 2),
}

# Both routes, Eqs 3 and 4. The threshold friction velocity against grain size,
# bare and under the same 0.6 mN/m crust the landing page plots.
# Starts at 80 microns: finer than that, real sand also sticks to itself, which
# Eq 3 leaves out, so the curve would be drawn where it is known not to hold.
CRUST = 6e-4                      # N/m
d_um = np.linspace(80, 600, 131)
out["ustar_bare"] = series(d_um, aeolian.threshold(d_um * 1e-6, 0.0))
out["ustar_treated"] = series(d_um, aeolian.threshold(d_um * 1e-6, CRUST))
out["_ustar"] = {
    "crust_mNm": CRUST * 1000,
    "bare_100um": round(float(aeolian.threshold(100e-6, 0.0)), 3),
    "treated_100um": round(float(aeolian.threshold(100e-6, CRUST)), 3),
    "bare_400um": round(float(aeolian.threshold(400e-6, 0.0)), 3),
    "treated_400um": round(float(aeolian.threshold(400e-6, CRUST)), 3),
}

# Both routes, Eq 5. Sand flux against the wind at ten metres, for 200 micron
# sand, bare and under the same crust.
D_SAND = 200e-6
U10 = np.linspace(0, 25, 126)
ut_bare, ut_crust = aeolian.threshold(D_SAND, 0.0), aeolian.threshold(D_SAND, CRUST)
out["flux_untreated"] = series(U10, aeolian.saltation_flux(U10 * aeolian.USTAR_RATIO, ut_bare) * 1000)
out["flux_treated"] = series(U10, aeolian.saltation_flux(U10 * aeolian.USTAR_RATIO, ut_crust) * 1000)
out["_flux"] = {
    "threshold_bare_ms": round(float(aeolian.ustar_to_freestream(ut_bare)), 2),
    "threshold_crust_ms": round(float(aeolian.ustar_to_freestream(ut_crust)), 2),
    "at_15ms_untreated": round(float(aeolian.saltation_flux(15 * aeolian.USTAR_RATIO, ut_bare) * 1000), 2),
    "at_15ms_treated": round(float(aeolian.saltation_flux(15 * aeolian.USTAR_RATIO, ut_crust) * 1000), 2),
}

# Both routes, Eq 6. How well each binder holds a grain of a given size.
d_log = np.exp(np.linspace(np.log(20), np.log(600), 90))
out["coverage_pga"] = series(d_log, grainsize.pga_cover(d_log), 3)
out["coverage_micp"] = series(d_log, grainsize.micp_eff(d_log), 3)
out["coverage_both"] = series(d_log, grainsize.combined(d_log, [1, 2]), 3)

# Both routes, Eq 7. The grain-size distribution, and the part of it the pair
# holds. The area between the two curves is the sand left loose.
pdf = grainsize.grain_pdf(d_log)
out["grain_pdf"] = series(d_log, pdf, 3)
out["grain_pdf_held"] = series(d_log, pdf * grainsize.combined(d_log, [1, 2]), 3)
out["_grain"] = {
    "d50_um": grainsize.UAE_D50, "sigma_g": grainsize.UAE_SIGMA,
    "bound_pga": round(grainsize.bound_fraction([1]), 3),
    "bound_micp": round(grainsize.bound_fraction([2]), 3),
    "bound_both": round(grainsize.bound_fraction([1, 2]), 3),
}

# Dust and the business case, Eqs 1 and 2. The fitted wind at one plant, in its
# windiest and calmest months, and where in that distribution the sand moves.
_data = exposure.load_data()
_clim = _data["era5_wind_climatology.json"]
_drift = json.load(open(os.path.join(HERE, "..", "public", "data", "pv_site_drift.json")))
_site = next(s for s in _drift["sites"] if s["project"].startswith("Mohammed Bin Rashid"))
_wind = exposure.Wind(_clim, list(range(1, 13)))
_cell = _clim["cells"][_wind.nearest_key(_site["lat"], _site["lon"])]
_fits = {int(m): (f["A"], f["k"]) for m, f in _cell["months"].items()}
_windy = max(_fits, key=lambda m: _fits[m][0])
_calm = min(_fits, key=lambda m: _fits[m][0])
_grain_d = _data["uae_parameters.json"]["grain_size"]["Rub' Al-Khali"]["d_m"]
_ut = exposure.threshold(_grain_d) / exposure.USTAR_RATIO
u_axis = np.linspace(0.0, 16.0, 161)
out["weibull_windy"] = series(u_axis, exposure.weibull_pdf(np.maximum(u_axis, 1e-9), *_fits[_windy]))
out["weibull_calm"] = series(u_axis, exposure.weibull_pdf(np.maximum(u_axis, 1e-9), *_fits[_calm]))

# The integrand of Eq 2 for the windy month: how often each wind blows times
# the sand it moves. Both curves are drawn against their own maximum, because
# one is a probability density and the other a flux density.
_A, _k = _fits[_windy]
_pdf = exposure.weibull_pdf(np.maximum(u_axis, 1e-9), _A, _k)
_q = np.array([exposure.flux_at_wind(float(u), _ut) for u in u_axis])
_work = _pdf * _q
out["transport_wind"] = series(u_axis, _pdf / _pdf.max())
out["transport_work"] = series(u_axis, _work / _work.max())
_mean_u = exposure.weibull_mean(_A, _k)
out["_weibull"] = {
    "site": _site["project"], "cell": _wind.nearest_key(_site["lat"], _site["lon"]),
    "windy_month": _windy, "windy_A": _A, "windy_k": _k,
    "calm_month": _calm, "calm_A": _fits[_calm][0], "calm_k": _fits[_calm][1],
    "grain_d_um": _grain_d * 1e6, "threshold_ms": round(_ut, 2),
    "mean_wind_ms": round(_mean_u, 2),
    "share_of_hours_above_threshold": round(float(np.exp(-((_ut / _A) ** _k))), 4),
    "flux_of_mean_wind_g_m_s": round(exposure.flux_at_wind(_mean_u, _ut) * 1000, 4),
    "mean_of_flux_g_m_s": round(exposure.mean_saltation_flux(_A, _k, _ut) * 1000, 4),
    "work_peak_ms": round(float(u_axis[int(np.argmax(_work))]), 1),
}

# Dust and the business case, Eq 3. Fryberger drift by the direction the wind
# blows from, in 16 sectors, at the same plant. x is the bearing in degrees.
_sectors = _site["sector_q_vu"]
out["drift_rose"] = series([i * 360.0 / len(_sectors) for i in range(len(_sectors))], _sectors, 2)
out["_drift"] = {k: _site[k] for k in ("project", "dp_vu", "rdp_vu", "rdd_toward_deg",
                                        "drift_from_deg", "udi", "hours_above_threshold",
                                        "share_of_drift_from_prior_sector")}

# Dust and the business case, Eq 4. The sandblasting efficiency against clay,
# as log10 so the wiki can draw it on a linear axis.
clay = np.linspace(0, 20, 81)
out["sandblasting_log10"] = series(clay, [np.log10(exposure.sandblasting_alpha(float(c))) for c in clay])
out["_sandblasting"] = {
    "clay_percent": exposure.SUBSTRATE_CLAY_PERCENT,
    "ratio_floodplain_to_dune": round(
        exposure.sandblasting_alpha(exposure.SUBSTRATE_CLAY_PERCENT["hydro"])
        / exposure.sandblasting_alpha(exposure.SUBSTRATE_CLAY_PERCENT["natural"]), 1),
}

json.dump(out, sys.stdout)
