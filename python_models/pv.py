"""
Photovoltaic yield, and the capacity factor the money chain was missing.

Why this exists
---------------
The exposure module could estimate how much sand arrives at a solar plant and
how much light that sand costs the glass, and then it stopped. Turning a
transmittance loss into an energy loss needs a capacity factor, the fraction of
its nameplate rating a plant actually averages over a year, and the toolkit did
not have one. It was carried in scripts/transport_model.py's NEEDS_SOURCE dict,
which raises rather than inventing a number, so the UI printed "no source yet"
where the money should have been.

The obvious fix is to quote one published figure. That was rejected for two
reasons. A single national number cannot distinguish Abu Dhabi from Ras Al
Khaimah, and more importantly it cannot vary through the year, while everything
else in this module does: the sand arrives seasonally, so the loss is seasonal,
so the capacity factor it multiplies has to be seasonal too or the two are
being combined at different time resolutions.

So the capacity factor is computed from irradiance the same way the wind
statistics are computed from ERA5, through the same keyless Open-Meteo archive,
and then checked against two independent published anchors. The checks live in
scripts/fetch_pv_climatology.py and they refuse to write a file that fails.

What this is not
----------------
This is a yield model, not a plant model. It does not know about a specific
plant's module type, row spacing, inverter loading ratio, curtailment, or
outages. It carries no soiling loss at all, deliberately: soiling is what the
rest of the exposure module computes, and applying it here as well would count
the same effect twice. So the capacity factor here is the clean-panel one, and
the sand is subtracted from it downstream.

Mirror of src/lib/physics/pv.ts. Keep the two in step.

Sources
-------
Duffie and Beckman, Solar Engineering of Thermal Processes, for the solar
position, the extraterrestrial irradiance and the HDKR transposition.
  Reindl, Beckman and Duffie (1990), Solar Energy 45, 9, is the HDKR form used.
King, Boyson and Kratochvil (2004), SAND2004-3535, Sandia PV Array Performance
Model, for the module temperature relation and its a, b coefficients.
"""

import math
from dataclasses import dataclass
from typing import Optional, Sequence

# -----------------------------------------------------------------------------
# Module and system constants.
#
# These are the generic crystalline-silicon values, not a measurement of any
# particular UAE plant. They are stated here rather than buried so that a reader
# can see exactly what the capacity factor rests on, and the validation in
# scripts/fetch_pv_climatology.py is what says whether they are good enough.
# -----------------------------------------------------------------------------

#: Power temperature coefficient, per degree C, crystalline silicon.
GAMMA_PMP_PER_C = -0.0035

#: Sandia module temperature coefficients for a glass/cell/polymer module in an
#: open rack. King et al. 2004 Table 12.
SANDIA_A = -3.56
SANDIA_B = -0.0750
#: Cell above back-surface temperature at 1000 W/m2, same table.
SANDIA_DELTA_T = 3.0

#: Ground reflectance. Desert sand is brighter than the 0.2 usually assumed for
#: grass, which matters for a tilted plane and matters more for bifacial modules
#: that this model does not otherwise represent.
ALBEDO = 0.3

#: Losses between DC nameplate and the meter, as fractions kept. No soiling
#: term: see the module docstring.
LOSS_INVERTER = 0.975
LOSS_DC_WIRING = 0.98
LOSS_MISMATCH = 0.98
LOSS_AVAILABILITY = 0.98

SOLAR_CONSTANT = 1367.0


@dataclass
class PvResult:
    """Annual and monthly yield for one location."""
    capacity_factor: float
    specific_yield_kwh_per_kwp: float
    monthly_capacity_factor: list
    monthly_poa_kwh_m2: list
    ghi_kwh_m2_yr: float
    tilt_deg: float
    tracking: str


def _system_loss() -> float:
    return LOSS_INVERTER * LOSS_DC_WIRING * LOSS_MISMATCH * LOSS_AVAILABILITY


def solar_position(day_of_year: int, hour_utc: float, lat_deg: float, lon_deg: float):
    """Solar zenith and azimuth, in degrees.

    Cooper's declination and the standard equation of time. Accurate to a few
    tenths of a degree, which is far finer than a 0.25 degree reanalysis grid
    warrants.
    """
    b = math.radians(360.0 / 365.0 * (day_of_year - 81))
    eot_min = 9.87 * math.sin(2 * b) - 7.53 * math.cos(b) - 1.5 * math.sin(b)
    decl = math.radians(23.45) * math.sin(math.radians(360.0 / 365.0 * (284 + day_of_year)))

    solar_time = hour_utc + lon_deg / 15.0 + eot_min / 60.0
    hour_angle = math.radians(15.0 * (solar_time - 12.0))

    lat = math.radians(lat_deg)
    cos_z = (math.sin(lat) * math.sin(decl)
             + math.cos(lat) * math.cos(decl) * math.cos(hour_angle))
    cos_z = max(-1.0, min(1.0, cos_z))
    zenith = math.degrees(math.acos(cos_z))

    sin_z = math.sqrt(max(0.0, 1.0 - cos_z * cos_z))
    if sin_z < 1e-6:
        azimuth = 180.0
    else:
        cos_a = (math.sin(decl) * math.cos(lat)
                 - math.cos(decl) * math.sin(lat) * math.cos(hour_angle)) / sin_z
        cos_a = max(-1.0, min(1.0, cos_a))
        azimuth = math.degrees(math.acos(cos_a))
        if hour_angle > 0:
            azimuth = 360.0 - azimuth
    return zenith, azimuth


def _cos_incidence(zenith, azimuth, tilt, surface_azimuth):
    z, a = math.radians(zenith), math.radians(azimuth)
    t, sa = math.radians(tilt), math.radians(surface_azimuth)
    return (math.cos(z) * math.cos(t)
            + math.sin(z) * math.sin(t) * math.cos(a - sa))


def tracker_tilt(zenith, azimuth, max_angle_deg=60.0):
    """Rotation of a horizontal single-axis tracker with a north-south axis.

    The axis runs north to south, so the panel can only lean east or west. It
    follows the east-west component of the sun vector and lies flat at solar
    noon, when the sun is due south and there is nothing for it to lean toward.

    With azimuth measured clockwise from north, that component is
    sin(zenith)*sin(azimuth): positive in the morning, when the sun is east, so
    the panel faces east. Getting that sign backwards points the array away from
    the sun all day and costs about half the annual yield, which is how this was
    caught.

    Returns (tilt, surface_azimuth) in degrees. Backtracking is not modelled, so
    at low sun this overstates what a real row-spaced array collects.
    """
    z, a = math.radians(zenith), math.radians(azimuth)
    east = math.sin(z) * math.sin(a)
    up = math.cos(z)
    rot = math.degrees(math.atan2(east, up))
    rot = max(-max_angle_deg, min(max_angle_deg, rot))
    return abs(rot), (90.0 if rot >= 0 else 270.0)


def poa_irradiance(ghi, dni, dhi, zenith, azimuth, tilt, surface_azimuth,
                   day_of_year, albedo=ALBEDO):
    """Plane-of-array irradiance by HDKR transposition.

    HDKR (Reindl, Beckman and Duffie 1990) rather than the isotropic sky,
    because it carries the circumsolar brightening and the horizon band. Over a
    desert with a high direct fraction, the isotropic model understates a tilted
    plane by several percent, which would propagate straight into the capacity
    factor.
    """
    if zenith >= 90.0 or ghi <= 0.0:
        return 0.0
    cos_i = max(0.0, _cos_incidence(zenith, azimuth, tilt, surface_azimuth))
    cos_z = max(0.0871557, math.cos(math.radians(zenith)))   # cap at 85 deg

    beam = dni * cos_i

    # Anisotropy index and the horizon-brightening factor.
    e0 = SOLAR_CONSTANT * (1 + 0.033 * math.cos(math.radians(360.0 * day_of_year / 365.0)))
    extra_horizontal = e0 * cos_z
    ai = min(1.0, dni / extra_horizontal) if extra_horizontal > 0 else 0.0
    f = math.sqrt(max(0.0, beam / ghi)) if ghi > 0 else 0.0

    t = math.radians(tilt)
    sky = dhi * (
        (1 - ai) * (1 + math.cos(t)) / 2 * (1 + f * math.sin(t / 2) ** 3)
        + ai * cos_i / cos_z
    )
    ground = ghi * albedo * (1 - math.cos(t)) / 2
    return max(0.0, beam + sky + ground)


def cell_temperature(poa, air_temp_c, wind_ms):
    """Cell temperature from the Sandia array performance model.

    King et al. 2004 Eq 11 and 12. The wind term is why wind speed is pulled
    alongside the irradiance: at 45 C ambient a still day and a breezy one
    differ by several degrees of cell temperature, and the power coefficient is
    -0.35 percent per degree.
    """
    back = poa * math.exp(SANDIA_A + SANDIA_B * wind_ms) + air_temp_c
    return back + (poa / 1000.0) * SANDIA_DELTA_T


def dc_fraction(poa, cell_temp_c):
    """Output as a fraction of nameplate DC, before system losses.

    Linear in irradiance and linear in temperature about 25 C. Low-light
    efficiency fall-off is not modelled; in this climate the hours it would
    affect carry very little energy.
    """
    if poa <= 0.0:
        return 0.0
    return (poa / 1000.0) * (1.0 + GAMMA_PMP_PER_C * (cell_temp_c - 25.0))


def optimal_tilt(lat_deg: float) -> float:
    """Fixed tilt for maximum annual yield, as a function of latitude.

    The usual rule of thumb is tilt equals latitude. In the Gulf the optimum
    sits below that, because a shallower tilt collects more of the very strong
    summer sun and there is almost no winter cloud to compensate for. This is
    the standard low-latitude correction, and the resulting yield is what the
    Global Solar Atlas check in the fetch script actually tests.
    """
    lat = abs(lat_deg)
    return round(0.87 * lat + 3.1, 1)


def annual_yield(
    times: Sequence,        # (day_of_year, hour_utc) pairs
    ghi: Sequence,
    dni: Sequence,
    dhi: Sequence,
    temp_c: Sequence,
    wind_ms: Sequence,
    lat: float,
    lon: float,
    tilt: Optional[float] = None,
    tracking: str = "fixed",
    years: float = 1.0,
) -> PvResult:
    """Run the chain over an hourly series and return the yield.

    `years` divides the totals, so a multi-year series returns an annual
    average rather than a sum.
    """
    if tilt is None:
        tilt = optimal_tilt(lat)

    monthly_dc = [0.0] * 12
    monthly_poa = [0.0] * 12
    monthly_hours = [0] * 12
    total_ghi = 0.0

    for i, (doy, hour) in enumerate(times):
        g = ghi[i] or 0.0
        month = _month_of(doy)
        monthly_hours[month] += 1
        total_ghi += g
        if g <= 0.0:
            continue

        zenith, azimuth = solar_position(doy, hour, lat, lon)
        if tracking == "single-axis":
            surf_tilt, surf_az = tracker_tilt(zenith, azimuth)
        else:
            surf_tilt, surf_az = tilt, 180.0

        poa = poa_irradiance(g, dni[i] or 0.0, dhi[i] or 0.0,
                             zenith, azimuth, surf_tilt, surf_az, doy)
        tc = cell_temperature(poa, temp_c[i] or 25.0, wind_ms[i] or 1.0)
        monthly_dc[month] += dc_fraction(poa, tc)
        monthly_poa[month] += poa

    loss = _system_loss()
    monthly_cf = []
    for m in range(12):
        hours = monthly_hours[m]
        monthly_cf.append((monthly_dc[m] * loss / hours) if hours else 0.0)

    total_hours = sum(monthly_hours)
    cf = (sum(monthly_dc) * loss / total_hours) if total_hours else 0.0

    return PvResult(
        capacity_factor=cf,
        specific_yield_kwh_per_kwp=cf * 8760.0,
        monthly_capacity_factor=monthly_cf,
        monthly_poa_kwh_m2=[p / 1000.0 / years for p in monthly_poa],
        ghi_kwh_m2_yr=total_ghi / 1000.0 / years,
        tilt_deg=tilt,
        tracking=tracking,
    )


_MONTH_ENDS = (31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365)


def _month_of(day_of_year: int) -> int:
    for m, end in enumerate(_MONTH_ENDS):
        if day_of_year <= end:
            return m
    return 11


# =============================================================================
# Money.
#
# The tariff a site earns is not one number, and treating it as one is the
# single easiest way to overstate the value of this product by an order of
# magnitude. See the note on PPA versus retail in damage.py.
# =============================================================================

def energy_loss_mwh(capacity_mw: float, capacity_factor: float, loss_percent: float,
                    hours: float = 8760.0) -> float:
    """Annual generation lost to a transmittance loss.

    Assumes the transmittance loss passes straight through to power, one for
    one. That is the usual assumption and it is an approximation: a partly
    shaded or non-uniformly soiled module loses more than its average
    transmittance suggests, because the series string follows its worst cell.
    So this is a lower bound on the electrical loss for a given deposit.
    """
    return capacity_mw * capacity_factor * hours * (loss_percent / 100.0)


def revenue_loss_usd(energy_mwh: float, tariff_usd_per_kwh: float) -> float:
    return energy_mwh * 1000.0 * tariff_usd_per_kwh


def _self_test():
    # Solar noon at the equator on an equinox puts the sun overhead.
    z, _ = solar_position(81, 12.0, 0.0, 0.0)
    assert z < 2.0, z

    # A horizontal plane sees GHI, whatever the transposition does elsewhere.
    poa = poa_irradiance(800, 700, 150, 30.0, 180.0, 0.0, 180.0, 172)
    assert abs(poa - 800) / 800 < 0.06, poa

    # Hot cells lose power, cold cells gain it.
    assert dc_fraction(1000, 25.0) == 1.0
    assert dc_fraction(1000, 65.0) < 0.87
    assert dc_fraction(1000, 15.0) > 1.0

    # Wind cools, so a breezy hour outperforms a still one at equal irradiance.
    assert cell_temperature(900, 40.0, 6.0) < cell_temperature(900, 40.0, 0.5)

    # Optimal tilt in the Gulf sits below latitude.
    assert optimal_tilt(24.5) < 24.5

    # A north-south tracker leans toward the sun, not away from it. Morning sun
    # in the east means the panel faces east. The first version had this
    # backwards and lost half the annual yield.
    _, morning_az = tracker_tilt(60.0, 100.0)
    _, evening_az = tracker_tilt(60.0, 260.0)
    assert morning_az == 90.0, morning_az
    assert evening_az == 270.0, evening_az
    # And it lies flat at solar noon, because a north-south axis cannot lean
    # south.
    noon_tilt, _ = tracker_tilt(20.0, 180.0)
    assert noon_tilt < 0.5, noon_tilt

    # A 100 MW plant at 20 percent losing 5 percent of its light.
    mwh = energy_loss_mwh(100.0, 0.20, 5.0)
    assert abs(mwh - 8760.0) < 1.0, mwh
    assert abs(revenue_loss_usd(mwh, 0.0135) - 118260.0) < 10.0

    print("pv.py self-test passed")


if __name__ == "__main__":
    _self_test()
