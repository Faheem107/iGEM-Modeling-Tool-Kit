"""
Near-field aeolian transport and value model for the Dust Exposure Toolkit.

This is the "transport backbone" decision, implemented. See
DUST_EXPOSURE_TRANSPORT_AND_VALUE.md for the reasoning.

Summary of the decision:
  Saltation and suspension are separated, because they have different length
  scales, different receptor damage, and different addressability.

    G  horizontal saltation flux  [kg/m/s]   aeolian.ts saltationFlux
    F  vertical dust flux         [kg/m2/s]  F = (F/G) * G, Marticorena & Bergametti
                                             1995 Fig 4 / Eq 43, set by clay content

  Mass in the saltation range travels metres, not kilometres, so it is a
  near-field problem solved by settling, not a dispersion problem needing
  HYSPLIT or FLEXPART. Suspension is taken from CAMS as a non-reducible
  background except where it is generated on a treated patch.

Every constant is sourced or flagged NEEDS_SOURCE. Nothing is invented.
Run:  python3 scripts/transport_model.py
"""

import json
import math
import os

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# --- physical constants, mirrored from src/lib/physics/constants.ts ----------
G_ACC = 9.80665
RHO_AIR = 1.225
RHO_SAND = 2650.0
MU_AIR = 1.81e-5                 # Pa s, dynamic viscosity of air at ~20 C
NU_AIR = MU_AIR / RHO_AIR
KAPPA = 0.40

# --- sourced parameters ------------------------------------------------------
# Marticorena & Bergametti 1995, references/marticorena1995.md, doi 10.1029/95JD00690
SALTATION_MIN_M = 60e-6          # "soil grains in the range of 60 to 2000 um"
SALTATION_MAX_M = 2000e-6        # "particles ... (> 2000 um) roll and creep"
SALTATION_LAYER_H_M = 1.0        # "maximum height of the saltation layer ... order of 1 m"

# Benaafi et al., Arab J Geosci, Table 1, doi 10.1007/s12517-015-1970-9
# phi statistics of dune sands. UAE transfer justified by the paper's own text.
GRAIN = {
    "Rub al Khali":     {"mean_phi": 1.460, "sorting_phi": 0.863, "n": 12},
    "Eastern Province": {"mean_phi": 1.999, "sorting_phi": 0.740, "n": 9},
    "Sakaka":           {"mean_phi": 2.290, "sorting_phi": 0.802, "n": 12},
}

# --- parameters we do NOT have a source for. Do not fill these in silently. ---
NEEDS_SOURCE = {
    "uae_electricity_tariff": "DEWA / ADDC / EWEC industrial tariff, USD per kWh. "
                              "Needed to convert energy loss to money.",
    "solar_capacity_factor":  "UAE utility-scale PV capacity factor. Needed to turn "
                              "nameplate MW into annual MWh.",
    "abrasion_to_power_loss": "Glass haze or transmittance loss per unit saltation "
                              "impact. No source found yet. This is the weakest link "
                              "in the whole value chain.",
    "deposition_to_transmittance": "Elminir et al. 2006, Energy Convers. Manag. 47, "
                                   "3192, doi 10.1016/j.enconman.2006.02.014. "
                                   "PAYWALLED, needs library download.",
    "encroachment_clearing_cost": "Municipal or O&M sand-clearing cost per km or per "
                                  "hectare in the Gulf. Business team flagged this as "
                                  "undocumented.",
}


def settling_velocity(d, C1=18.0, C2=1.0):
    """Ferguson & Church (2004), J. Sediment. Res. 74, 933-937.
    w = R g d^2 / (C1 nu + sqrt(0.75 C2 R g d^3)). Valid across Stokes and turbulent."""
    R = (RHO_SAND - RHO_AIR) / RHO_AIR
    return R * G_ACC * d * d / (C1 * NU_AIR + math.sqrt(0.75 * C2 * R * G_ACC * d ** 3))


def phi_to_m(phi):
    return (2.0 ** (-phi)) / 1000.0


def mass_finer_than(d, mean_phi, sorting_phi):
    """Mass fraction of a log2-normal grain size distribution finer than diameter d."""
    phi_c = -math.log2(d * 1000.0)
    z = (phi_c - mean_phi) / sorting_phi
    return 0.5 * (1 - math.erf(z / math.sqrt(2)))


def lognormal_mass_fraction(d_small, d_large, mean_phi, sorting_phi):
    """Mass fraction between d_small and d_large. Pass None for an open bound."""
    lo = 0.0 if d_small is None else mass_finer_than(d_small, mean_phi, sorting_phi)
    hi = 1.0 if d_large is None else mass_finer_than(d_large, mean_phi, sorting_phi)
    return hi - lo


def saltation_travel_distance(d, wind_speed, release_h=SALTATION_LAYER_H_M):
    """Ballistic settling range. x = U * h / w_s.
    An upper bound: it ignores the fact that a saltating grain is repeatedly
    re-launched, which extends net downwind transport, and ignores turbulence."""
    return wind_speed * release_h / settling_velocity(d)


def near_field_capture_fraction(distance_m, wind_speed, mean_phi, sorting_phi,
                                n_bins=200):
    """Fraction of the SALTATING mass emitted at a source that is still airborne
    (that is, has not yet settled) after travelling `distance_m` downwind.

    This is the quantity the brief calls 'fraction of sand reaching the target'.
    It is computed by integrating the grain size distribution and asking, per
    size bin, whether that grain's ballistic range exceeds the distance.
    """
    lo_phi = -math.log2(SALTATION_MAX_M * 1000.0)
    hi_phi = -math.log2(SALTATION_MIN_M * 1000.0)
    step = (hi_phi - lo_phi) / n_bins
    reaching = 0.0
    total = 0.0
    for i in range(n_bins):
        p0, p1 = lo_phi + i * step, lo_phi + (i + 1) * step
        d0, d1 = phi_to_m(p1), phi_to_m(p0)          # p1 finer
        w = lognormal_mass_fraction(d0, d1, mean_phi, sorting_phi)
        total += w
        d_mid = phi_to_m(0.5 * (p0 + p1))
        if saltation_travel_distance(d_mid, wind_speed) >= distance_m:
            reaching += w
    return (reaching / total) if total > 0 else 0.0


# Chappell, Hennen, Schepanski, Dhital & Tong (2024), Geophys. Res. Lett.,
# doi 10.1029/2023GL106540, Equation 3. references/2023GL106540.pdf.
# They quote the Marticorena & Bergametti (1995) sandblasting relation with its
# coefficients, which the OCR of the 1995 paper lost:
#
#   F = A_f * A_s * M * Q * 10^(0.134*clay% - 6.0),   0% < clay% < 20%,   M = 0.87
#
# so the sandblasting efficiency is  alpha = F/Q = 10^(0.134*clay - 6.0)  [m^-1].
# Self-consistency: 0% to 20% clay spans a factor of 479, and the paper states the
# efficiency "increases by nearly 3 orders of magnitude" over that range.
# Dimensions: Q [kg/m/s] * alpha [1/m] = F [kg/m2/s]. Correct.
CLAY_CAP_PERCENT = 20.0          # Chappell Eq 3 / Marticorena, fit invalid above this
EMITTED_DUST_FRACTION_M = 0.87   # Zender et al. 2003, for 0.1 < d < 10 um


def fg_ratio_from_clay(clay_percent, cap=True):
    """Sandblasting efficiency alpha = F/Q in m^-1.

    Chappell et al. 2024 GRL Eq 3, quoting Marticorena & Bergametti 1995.
    The fit is only valid for 0 to 20% clay because soils above that are crusted
    and emit by abrasion rather than saltation. With cap=True the value is clamped
    at 20%, which is what the paper does; the caller is told via the returned flag.

    Returns (alpha, was_capped).
    """
    if clay_percent < 0:
        raise ValueError("clay_percent must be non-negative")
    capped = clay_percent > CLAY_CAP_PERCENT
    if capped and not cap:
        raise ValueError(
            f"clay_percent={clay_percent} exceeds the {CLAY_CAP_PERCENT}% validity limit "
            "of Chappell Eq 3. Pass cap=True to clamp, and say so in the UI."
        )
    c = min(clay_percent, CLAY_CAP_PERCENT) if cap else clay_percent
    return 10.0 ** (0.134 * c - 6.0), capped


def vertical_dust_flux(horizontal_flux_Q, clay_percent, bare_fraction=1.0,
                       snow_free_fraction=1.0):
    """F [kg/m2/s] from Q [kg/m/s]. Chappell et al. 2024 GRL Eq 3.

    bare_fraction (A_f) and snow_free_fraction (A_s) default to 1, which is correct
    for a bare desert surface with no snow. Returns (F, was_capped).
    """
    alpha, capped = fg_ratio_from_clay(clay_percent)
    F = bare_fraction * snow_free_fraction * EMITTED_DUST_FRACTION_M * horizontal_flux_Q * alpha
    return F, capped


def report():
    print("=" * 76)
    print("NEAR-FIELD TRANSPORT MODEL, UAE parameters")
    print("=" * 76)
    print("Grain statistics: Benaafi et al. Table 1. Size classes and saltation")
    print("layer height: Marticorena & Bergametti 1995. Settling: Ferguson & Church 2004.\n")

    print("Size-class mass split")
    print(f"  {'site':<20}{'creep >2mm':>12}{'saltation':>12}{'susp <60um':>12}")
    for name, g in GRAIN.items():
        creep = lognormal_mass_fraction(SALTATION_MAX_M, None, g["mean_phi"], g["sorting_phi"])
        salt = lognormal_mass_fraction(SALTATION_MIN_M, SALTATION_MAX_M, g["mean_phi"], g["sorting_phi"])
        susp = lognormal_mass_fraction(None, SALTATION_MIN_M, g["mean_phi"], g["sorting_phi"])
        tot = creep + salt + susp
        print(f"  {name:<20}{creep*100:>11.2f}%{salt*100:>11.2f}%{susp*100:>11.3f}%"
              f"   (sums to {tot*100:.2f}%)")

    print("\nFraction of saltating mass still airborne after distance x")
    print("(this is the 'fraction reaching the target site', for the addressable mass)")
    g = GRAIN["Rub al Khali"]
    dists = [1, 5, 10, 25, 50, 100, 500, 1000]
    for U in (5.0, 10.0, 15.0):
        row = "".join(f"{near_field_capture_fraction(x, U, g['mean_phi'], g['sorting_phi'])*100:>8.1f}%"
                      for x in dists)
        print(f"  U={U:>4.0f} m/s " + row)
    print("  distance m " + "".join(f"{x:>9}" for x in dists))

    print("\nParameters with no source yet. The model will not invent these.")
    for k, v in NEEDS_SOURCE.items():
        print(f"  - {k}: {v}")

    out = os.path.join(REPO, "public", "data", "transport_model.json")
    payload = {
        "sources": {
            "size_classes_and_layer_height": "Marticorena & Bergametti 1995, doi 10.1029/95JD00690",
            "settling_velocity": "Ferguson & Church 2004, J Sediment Res 74, 933-937",
            "grain_statistics": "Benaafi et al., Arab J Geosci, Table 1, doi 10.1007/s12517-015-1970-9",
        },
        "saltation_range_m": [SALTATION_MIN_M, SALTATION_MAX_M],
        "saltation_layer_height_m": SALTATION_LAYER_H_M,
        "grain": GRAIN,
        "capture_curve": {
            f"U_{U}": {str(x): round(near_field_capture_fraction(
                x, U, GRAIN["Rub al Khali"]["mean_phi"], GRAIN["Rub al Khali"]["sorting_phi"]), 5)
                for x in dists}
            for U in (5.0, 10.0, 15.0)
        },
        "needs_source": NEEDS_SOURCE,
    }
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(payload, open(out, "w"), indent=2)
    print(f"\nwrote {os.path.relpath(out, REPO)}")


if __name__ == "__main__":
    report()
