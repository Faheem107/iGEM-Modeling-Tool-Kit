"""
Receptor damage functions for the Dust Exposure Toolkit.

One transport core feeds several markets. Each market has its own damage function
and each carries an EVIDENCE GRADE that the UI must render, because the evidence
behind them is very uneven and hiding that would be dishonest.

    measured    a published measurement we hold and can quote
    literature  a published relation, but transferred from another site or context
    unsourced   the physics is sound but no cost or response coefficient exists yet.
                These return None, never a number.

Mirror of src/lib/physics/damage.ts. Keep the two in step.
"""

from dataclasses import dataclass
from typing import Optional

MEASURED, LITERATURE, UNSOURCED = "measured", "literature", "unsourced"


@dataclass
class DamageResult:
    value: Optional[float]
    unit: str
    grade: str
    source: str
    notes: str = ""
    out_of_range: bool = False


# =============================================================================
# Solar, soiling.  Elminir et al. (2006), Energy Convers. Manag. 47, 3192-3203,
# doi 10.1016/j.enconman.2006.02.014.  references/elminir_etal.pdf
# =============================================================================
# Their Eq (1), verified against the PDF (not just the OCR):
#   Dtau[%] = 0.0381 q^4 - 0.8626 q^3 + 6.4143 q^2 - 15.051 q + 16.769
# fitted to Fig 6, whose axes run q = 1 to 9 g/m2 and Dtau = 4 to 24 %.
# Reported fit quality: R = 0.98, MBE = -0.05 %, RMSE = 6.68 %.
#
# Two honest problems with using it raw, both confirmed numerically:
#   * it is NON-MONOTONIC on [1, 2], dipping to 5.80 % at q = 1.68 after 7.31 %
#     at q = 1. That is a quartic artifact, not a physical effect.
#   * outside [1, 9] it is meaningless: 16.77 % at q = 0, 252 % at q = 15.
# So the published polynomial is used only inside its fitted range, monotonicity
# is enforced by a running maximum, and below 1 g/m2 we ramp linearly from the
# origin, which is the only physically admissible behaviour at zero dust.
#
# NOTE on the abstract's numbers. Elminir's abstract quotes 15.84 g/m2 -> 52.54 %
# and 4.48 g/m2 -> 12.38 %. Those are CUMULATIVE seven-month exposure endpoints,
# a different quantity from the Fig 6 correlation, and they are NOT pooled here.
# Treated as an independent order-of-magnitude cross-check only.
ELMINIR_Q_MIN, ELMINIR_Q_MAX = 1.0, 9.0
_ELMINIR_COEFFS = (0.0381, -0.8626, 6.4143, -15.051, 16.769)


def _elminir_raw(q):
    a, b, c, d, e = _ELMINIR_COEFFS
    return a * q ** 4 + b * q ** 3 + c * q ** 2 + d * q + e


# Precomputed monotone envelope of Eq 1 on a FIXED grid over [1, 9]. A running
# maximum on a q-dependent grid is not itself monotonic, so the grid is fixed once
# and interpolated, which guarantees a monotonic non-decreasing result.
_ENV_N = 2000
_ENV_Q = [ELMINIR_Q_MIN + (ELMINIR_Q_MAX - ELMINIR_Q_MIN) * i / _ENV_N
          for i in range(_ENV_N + 1)]
_ENV_Y = []
_running = float("-inf")
for _q in _ENV_Q:
    _running = max(_running, _elminir_raw(_q))
    _ENV_Y.append(_running)


def _elminir_monotone(q):
    """Eq 1 with the quartic's non-physical dip removed, monotone by construction."""
    if q <= ELMINIR_Q_MIN:
        return _ENV_Y[0]
    if q >= ELMINIR_Q_MAX:
        return _ENV_Y[-1]
    pos = (q - ELMINIR_Q_MIN) / (ELMINIR_Q_MAX - ELMINIR_Q_MIN) * _ENV_N
    i = int(pos)
    f = pos - i
    return _ENV_Y[i] + f * (_ENV_Y[i + 1] - _ENV_Y[i])


def transmittance_loss_percent(deposition_g_m2, tilt_deg=0.0):
    """Reduction in glass normal transmittance [%] for a dust deposition density.

    deposition_g_m2 : accumulated dust on the glass, g/m2
    tilt_deg        : panel tilt. Elminir Table 1 measured the tilt dependence at
                      about 8.5 g/m2; see TILT_TABLE below.
    """
    q = max(0.0, deposition_g_m2)
    oor = q > ELMINIR_Q_MAX
    if q < ELMINIR_Q_MIN:
        # linear ramp from the origin to the first valid point
        val = _elminir_monotone(ELMINIR_Q_MIN) * (q / ELMINIR_Q_MIN)
        note = "below Elminir's fitted range, linear ramp from origin"
    elif not oor:
        val = _elminir_monotone(q)
        note = "inside Elminir Fig 6 fitted range"
    else:
        # hold the endpoint slope rather than let the quartic explode
        h = 0.01
        slope = (_elminir_monotone(ELMINIR_Q_MAX) -
                 _elminir_monotone(ELMINIR_Q_MAX - h)) / h
        val = _elminir_monotone(ELMINIR_Q_MAX) + slope * (q - ELMINIR_Q_MAX)
        note = ("ABOVE Elminir's fitted range of 9 g/m2, linear extrapolation at the "
                "endpoint slope. Treat as indicative only.")
    val *= tilt_factor(tilt_deg)
    return DamageResult(
        value=min(val, 100.0), unit="% transmittance loss", grade=LITERATURE,
        source=("Elminir et al. 2006, Energy Convers. Manag. 47, 3192, Eq 1 and Table 1. "
                "Measured in Egypt, transferred to the Gulf."),
        notes=note, out_of_range=oor)


# Elminir Table 1, reduction in transmittance by tilt at about 8.5 g/m2 accumulation.
# Normalised to the 0 deg case to give a dimensionless tilt factor.
TILT_TABLE = {0: 27.62, 15: 20.18, 30: 18.47, 45: 15.96, 60: 13.62, 75: 10.82, 90: 6.32}


def tilt_factor(tilt_deg):
    """Linear interpolation of Elminir Table 1, normalised to tilt = 0."""
    t = min(max(tilt_deg, 0.0), 90.0)
    keys = sorted(TILT_TABLE)
    for lo, hi in zip(keys, keys[1:]):
        if lo <= t <= hi:
            f = (t - lo) / (hi - lo)
            return (TILT_TABLE[lo] + f * (TILT_TABLE[hi] - TILT_TABLE[lo])) / TILT_TABLE[0]
    return TILT_TABLE[90] / TILT_TABLE[0]


# =============================================================================
# Markets whose physics is sound but whose cost coefficient has no source.
# These return None on purpose. Do not fill them in without a citation.
# =============================================================================
def solar_abrasion(saltation_mass_kg_m2_yr):
    return DamageResult(
        None, "% power loss per year", UNSOURCED,
        "No published relation found linking saltation flux to PV glass haze.",
        "Physics is sound and the length scale is right. Candidate for own bench work.")


def road_encroachment(saltation_mass_kg_m_yr):
    return DamageResult(
        None, "USD per km per year", UNSOURCED,
        "Khalaf & Al-Ajmi 1993 measure the Gulf drift RATE (about 20 m3 per metre "
        "width per year in Kuwait) but publish no clearing cost.",
        "The mass side is sourced; only the cost per cubic metre cleared is missing.")


def industrial_hse(deposition_g_m2):
    return DamageResult(
        None, "USD per site per year", UNSOURCED,
        "Lead to mine: Economic Impact and Risk Assessment of SDS on the Oil and Gas "
        "Industry, Sustainability 2019, doi 10.3390/su11010200, gold OA.")


def agriculture_yield(deposition_g_m2):
    return DamageResult(
        None, "% yield loss", UNSOURCED,
        "Lead to mine: Effects of inert dust on olive leaf physiological parameters, "
        "doi 10.1065/espr2006.08.327.",
        "Business plan cites ~28% cotton yield loss, unverified against primary source.")


# =============================================================================
# Tariff.  Official, from references/DEWA_slabtariff.pdf, retrieved August 2026.
# =============================================================================
AED_PER_USD = 3.6725  # UAE dirham is pegged to the US dollar
DEWA_TARIFF_AED_PER_KWH = {
    "industrial_low": 0.230,     # 0 to 10,000 kWh per month
    "industrial_high": 0.380,    # above 10,000 kWh per month
    "commercial_high": 0.380,    # above 6,000 kWh per month
}
DEWA_FUEL_SURCHARGE_AED_PER_KWH = 0.060  # August 2026
DEWA_VAT = 0.05


def dewa_tariff_usd_per_kwh(slab="industrial_high", include_surcharge=True, include_vat=True):
    """Delivered retail electricity price, USD per kWh, from the official DEWA sheet.

    WARNING, and it matters a great deal for the business model:
    this is the RETAIL CONSUMPTION tariff. A utility-scale solar plant earns the
    PPA price it sold at, which in the UAE has been roughly an order of magnitude
    lower than retail. Use this tariff only for a customer who OFFSETS retail
    consumption. For a generator, the PPA price is the correct input and it is not
    in this file.
    """
    aed = DEWA_TARIFF_AED_PER_KWH[slab]
    if include_surcharge:
        aed += DEWA_FUEL_SURCHARGE_AED_PER_KWH
    if include_vat:
        aed *= (1 + DEWA_VAT)
    return aed / AED_PER_USD


def _self_test():
    print("Elminir transmittance loss, tilt 0")
    print(f"  {'q [g/m2]':>10}{'loss %':>9}  note")
    for q in [0, 0.5, 1, 1.68, 2, 4, 6, 9, 12]:
        r = transmittance_loss_percent(q)
        print(f"  {q:>10.2f}{r.value:>9.2f}  {'OUT OF RANGE' if r.out_of_range else ''}")
    vals = [transmittance_loss_percent(q).value for q in [i / 10 for i in range(0, 121)]]
    assert all(vals[i] <= vals[i + 1] + 1e-9 for i in range(len(vals) - 1)), "not monotonic"
    assert abs(transmittance_loss_percent(0).value) < 1e-12, "must be zero at zero dust"
    print("  monotonic on [0, 12] and zero at q=0: OK")

    print("\nTilt factor, Elminir Table 1")
    for t in [0, 15, 24, 30, 45, 90]:
        print(f"  tilt {t:>3} deg -> factor {tilt_factor(t):.3f}")
    assert abs(tilt_factor(0) - 1.0) < 1e-12

    print("\nUnsourced markets return None, as intended")
    for fn, arg in [(solar_abrasion, 1.0), (road_encroachment, 1.0),
                    (industrial_hse, 1.0), (agriculture_yield, 1.0)]:
        r = fn(arg)
        assert r.value is None and r.grade == UNSOURCED
        print(f"  {fn.__name__:<20} -> None [{r.grade}]")

    print("\nDEWA tariff, official sheet August 2026")
    for slab in DEWA_TARIFF_AED_PER_KWH:
        print(f"  {slab:<18} {dewa_tariff_usd_per_kwh(slab):.4f} USD/kWh "
              f"(incl. surcharge and VAT)")


if __name__ == "__main__":
    _self_test()
