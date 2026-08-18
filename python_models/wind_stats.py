"""
Seasonal wind statistics for the Dust Exposure Toolkit.

Two things live here, both driven by the same seasonal wind data:

1. Weibull-integrated saltation flux. The exact closed form of the Bagnold law
   integrated over a Weibull wind speed distribution. Backs Module 1's monthly
   mean flux. Proven exact by scripts/verify_weibull_flux.py.

2. Fryberger drift potential. The standard aeolian measure of how much sand a
   wind regime can move and in what direction. Backs the "sand hotspots feed the
   local sand supply" pathway and the drift arrows on the map.

Mirror of src/lib/physics/windStats.ts. Keep the two in step.

Sources
-------
Bagnold flux law and thresholds : src/lib/physics/aeolian.ts (Eq 7-9)
Fryberger drift potential       : Fryberger (1979), "Dune forms and wind regime",
                                  ch. 5 of A Study of Global Sand Seas, USGS PP 1052.
                                  The working equation is quoted in text by
                                  Khalaf & Al-Ajmi (1993), Geomorphology 6, 111-134,
                                  references/kuwait_sandenroachment.pdf:
                                    Q = V^2 (V - Vt) t
                                  "a modified form of the Lettau equation", V the
                                  average wind velocity at 10 m, Vt the impact
                                  threshold wind velocity, t the fraction of time
                                  the wind blew.
Gulf impact threshold Vt        : Khalaf & Al-Ajmi (1993) report saltation in Kuwait
                                  "whenever wind speed reaches 5.4 m/s" at 10 m.
Validation target               : Khalaf & Al-Ajmi (1993) measured an average annual
                                  sand drift rate in Kuwait of about 20 m3 per metre
                                  width per year, mostly May-August, toward the SE.
"""

import math

# --- Fryberger unit convention ------------------------------------------------
# Fryberger's tables are built with V in KNOTS, which yields drift potential in
# "vector units" (VU). The number is only comparable to published DP values in that
# convention, so the unit is carried explicitly rather than assumed.
KNOTS_PER_MS = 1.943844

# Khalaf & Al-Ajmi (1993), Kuwait, 10 m impact threshold for saltation.
GULF_IMPACT_THRESHOLD_MS = 5.4


def _upper_incomplete_gamma(s, x, terms=600):
    """Gamma(s, x) = integral_x^inf t^(s-1) e^-t dt.

    Computed as Gamma(s) - gamma(s, x) using the standard lower-incomplete series
    gamma(s,x) = x^s e^-x sum_{k>=0} x^k / (s(s+1)...(s+k)), which converges well
    for the moderate x this model produces.
    """
    if x <= 0:
        return math.gamma(s)
    if x > 60:
        return 0.0
    term = 1.0 / s
    total = term
    for k in range(1, terms):
        term *= x / (s + k)
        total += term
        if abs(term) < 1e-17 * abs(total):
            break
    lower = math.exp(-x + s * math.log(x)) * total
    return math.gamma(s) - lower


def mean_saltation_flux(A, k, u_threshold, ustar_ratio, C, rho_air, g):
    """Mean Bagnold flux over a Weibull(A, k) wind speed distribution [kg/m/s].

        <q> = C (rho_a/g) r^3 [ A^3 Gamma(1+3/k, x) - ut^2 A Gamma(1+1/k, x) ],
        x = (ut/A)^k

    A, u_threshold in m/s at the SAME reference height as ustar_ratio (10 m for
    AEOLIAN_CALIB.uStarRatio = 0.03). Exact, not an approximation.
    """
    if A <= 0 or k <= 0:
        return 0.0
    x = (max(u_threshold, 0.0) / A) ** k
    g3 = _upper_incomplete_gamma(1.0 + 3.0 / k, x)
    g1 = _upper_incomplete_gamma(1.0 + 1.0 / k, x)
    val = A ** 3 * g3 - (u_threshold ** 2) * A * g1
    return max(0.0, C * (rho_air / g) * ustar_ratio ** 3 * val)


def drift_potential(wind_rose, threshold_ms=GULF_IMPACT_THRESHOLD_MS):
    """Fryberger (1979) drift potential from a directional wind rose.

    wind_rose: iterable of (direction_deg_from_north, speed_ms, time_fraction).
               Directions are the direction the wind blows FROM, meteorological
               convention, matching how ERA5 and station roses are reported.
               time_fraction values should sum to 1 over the period.

    Returns a dict with:
      DP   drift potential, the scalar sum, in vector units
      RDP  resultant drift potential, the vector sum magnitude, in vector units
      RDD  resultant drift direction, degrees, the direction sand moves TOWARD
      UDI  RDP/DP, Fryberger's unidirectionality index, 0 to 1

    Q = V^2 (V - Vt) t with V in knots, per Fryberger's convention.
    """
    Vt = threshold_ms * KNOTS_PER_MS
    dp = 0.0
    vec_x = 0.0
    vec_y = 0.0
    for direction_from, speed_ms, t in wind_rose:
        V = speed_ms * KNOTS_PER_MS
        if V <= Vt or t <= 0:
            continue
        q = V * V * (V - Vt) * t
        dp += q
        # sand moves TOWARD the direction the wind is heading, 180 deg from "from"
        toward = math.radians((direction_from + 180.0) % 360.0)
        vec_x += q * math.sin(toward)
        vec_y += q * math.cos(toward)
    rdp = math.hypot(vec_x, vec_y)
    rdd = (math.degrees(math.atan2(vec_x, vec_y)) % 360.0) if rdp > 0 else float("nan")
    return {"DP": dp, "RDP": rdp, "RDD": rdd, "UDI": (rdp / dp) if dp > 0 else 0.0}


def _self_test():
    from math import isclose
    # incomplete gamma against known values
    assert isclose(_upper_incomplete_gamma(1.0, 0.0), 1.0, rel_tol=1e-12)
    assert isclose(_upper_incomplete_gamma(1.0, 2.0), math.exp(-2), rel_tol=1e-10)
    assert isclose(_upper_incomplete_gamma(2.5, 0.0), math.gamma(2.5), rel_tol=1e-12)
    print("incomplete gamma: OK")

    # flux must match the verified reference implementation in scripts/
    q = mean_saltation_flux(A=6.0, k=2.0, u_threshold=4.0,
                            ustar_ratio=0.045, C=1.8, rho_air=1.225, g=9.81)
    print(f"mean_saltation_flux(A=6,k=2,ut=4) = {q:.6e} kg/m/s")
    assert isclose(q, 4.267736e-03, rel_tol=1e-5), q
    print("flux matches scripts/verify_weibull_flux.py reference: OK")

    # Fryberger: a purely unidirectional rose must give UDI = 1
    r = drift_potential([(315.0, 10.0, 1.0)])
    assert isclose(r["UDI"], 1.0, rel_tol=1e-12)
    assert isclose(r["RDD"], 135.0, abs_tol=1e-9), r["RDD"]
    print(f"unidirectional NW wind -> RDD {r['RDD']:.1f} deg (SE), UDI {r['UDI']:.3f}: OK")

    # two opposing equal winds must cancel: RDP ~ 0, UDI ~ 0
    r2 = drift_potential([(0.0, 10.0, 0.5), (180.0, 10.0, 0.5)])
    assert r2["UDI"] < 1e-12, r2
    print(f"opposed roses cancel, UDI {r2['UDI']:.2e}: OK")

    # below threshold contributes nothing
    r3 = drift_potential([(315.0, 4.0, 1.0)])
    assert r3["DP"] == 0.0
    print("sub-threshold wind contributes zero drift: OK")


if __name__ == "__main__":
    _self_test()
