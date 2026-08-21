"""
Photovoltaic yield, and the capacity factor the money chain needs.

Turning a light loss into an energy loss needs a capacity factor, and the
toolkit did not have one: it sat in transport_model.py's NEEDS_SOURCE dict.
A single published national figure cannot vary by site or by season, while
everything else in this module does, so it is computed here instead and checked
against published anchors in scripts/fetch_pv_climatology.py.

Carries NO soiling loss. Soiling is what the rest of the exposure module
computes; applying it here too would count it twice.

A yield model, not a plant model: no module type, row spacing, inverter loading,
curtailment or outages.

Mirror of src/lib/physics/pv.ts. Keep the two in step.

Sources: Duffie & Beckman for solar position and extraterrestrial irradiance;
Reindl, Beckman & Duffie (1990) for HDKR transposition; King, Boyson &
Kratochvil (2004) SAND2004-3535 for module temperature.
"""

import math
from dataclasses import dataclass
from typing import Optional, Sequence

# Generic crystalline-silicon values, not a measurement of any UAE plant.
# The validation in scripts/fetch_pv_climatology.py says whether they suffice.

#: Power temperature coefficient, per degree C, crystalline silicon.
GAMMA_PMP_PER_C = -0.0035

#: Sandia module temperature coefficients for a glass/cell/polymer module in an
#: open rack. King et al. 2004 Table 12.
SANDIA_A = -3.56
SANDIA_B = -0.0750
#: Cell above back-surface temperature at 1000 W/m2, same table.
SANDIA_DELTA_T = 3.0

#: Ground reflectance. Desert sand is brighter than the 0.2 assumed for grass.
ALBEDO = 0.3

#: Losses between DC nameplate and meter, as fractions kept. No soiling term.
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
    """Solar zenith and azimuth in degrees. Cooper's declination plus the
    standard equation of time, good to a few tenths of a degree."""
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
    """Rotation of a horizontal north-south-axis tracker, as (tilt, azimuth).

    The panel leans only east or west and lies flat at solar noon. The east
    component is sin(zenith)*sin(azimuth), positive in the morning. Inverting
    that sign points the array away from the sun and costs half the yield.

    No backtracking, so this overstates a row-spaced array at low sun.
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

    Not the isotropic sky: over a desert with a high direct fraction that
    understates a tilted plane by several percent, straight into the CF.
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
    """Cell temperature, King et al. 2004 Eq 11 and 12.

    The wind term is why wind speed is fetched alongside irradiance: at 45 C a
    still day and a breezy one differ by several degrees.
    """
    back = poa * math.exp(SANDIA_A + SANDIA_B * wind_ms) + air_temp_c
    return back + (poa / 1000.0) * SANDIA_DELTA_T


def dc_fraction(poa, cell_temp_c):
    """Fraction of nameplate DC before system losses. Linear in irradiance and
    in temperature about 25 C. No low-light fall-off: those hours carry little
    energy in this climate."""
    if poa <= 0.0:
        return 0.0
    return (poa / 1000.0) * (1.0 + GAMMA_PMP_PER_C * (cell_temp_c - 25.0))


def optimal_tilt(lat_deg: float) -> float:
    """Fixed tilt for maximum annual yield. Below latitude at low latitudes,
    where a shallower tilt collects more of the strong summer sun."""
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
    """Run the chain over an hourly series. `years` divides the totals."""
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


# Money. The tariff a site earns is not one number: see PPA versus retail in
# damage.py.

def energy_loss_mwh(capacity_mw: float, capacity_factor: float, loss_percent: float,
                    hours: float = 8760.0) -> float:
    """Generation lost to a light loss. Assumes it passes to power one for one,
    which is a lower bound: a series string follows its worst cell."""
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
