"""
Link the retrieved datasets and papers to a UAE-specific parameter set.

Every number printed here is either (a) read from a dataset file in references/,
(b) read from a table in a paper in references/, or (c) computed from those by an
equation that is named. Nothing is estimated. Provenance is printed with each value.

Run:  python3 scripts/link_uae_parameters.py
Writes: public/data/uae_parameters.json
"""

import json
import math
import os

import h5py
import numpy as np

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EMIT = os.path.join(REPO, "references", "EMIT_L3_ASA_001.nc")
OUT = os.path.join(REPO, "public", "data", "uae_parameters.json")

# --- constants, mirrored from src/lib/physics/constants.ts -------------------
G = 9.80665           # PHYS.g
RHO_AIR = 1.225       # PHYS.RHO_AIR
RHO_SAND = 2650.0     # PHYS.RHO_SAND, quartz
KAPPA = 0.40          # von Karman, log law
A_BAGNOLD = 0.11      # AEOLIAN_CALIB.A, range [0.08, 0.14]

MINERALS = ["Calcite", "Chlorite", "Dolomite", "Goethite", "Gypsum",
            "Hematite", "Illite+Muscovite", "Kaolinite", "Montmorillonite",
            "Vermiculite"]

# --- Benaafi et al., Arab J Geosci, Table 1 ----------------------------------
# Statistical size parameters of dune sands, ten locations in Saudi Arabia, in phi.
# references/sedimentological_saudiarabia.md, DOI 10.1007/s12517-015-1970-9
# OCR note: skewness for Central Arabia, Eastern Province and Qassim floated out
# of the table in extraction. Those three are marked None and must be read from
# the PDF before use. Mean and sorting are unambiguous.
BENAAFI_TABLE1 = {
    #  location            n   mean_phi  sorting_phi  skew    kurt
    "Central Arabia":     ( 5,   1.710,     0.880,   None,   1.080),
    "Eastern Province":   ( 9,   1.999,     0.740,   None,   0.960),
    "Rub' Al-Khali":      (12,   1.460,     0.863,   0.131,  0.936),
    "Hail":               ( 7,   0.861,     0.767,   0.098,  0.960),
    "Najran":             ( 3,   2.433,     0.740,   0.074,  4.063),
    "Qassim":             ( 2,   1.475,     0.810,   None,   1.115),
    "Red Sea":            ( 6,   2.513,     1.008,   0.112,  0.997),
    "Sakaka":             (12,   2.290,     0.802,   0.001,  1.014),
    "Tabuk":              ( 4,   1.735,     0.738,   0.015,  1.004),
    "Tayma":              ( 7,   0.746,     0.846,   0.140,  0.972),
}

# The paper's own stated link to the UAE, quoted from the Discussion:
# the fine-grained dune sands of the eastern part of the UAE (citing Al-Sayed 1999)
# are similar to dune sands of the Rub' Al-Khali and Sakaka.
UAE_ANALOGUES = ["Rub' Al-Khali", "Sakaka"]

# --- Tian et al. 2018, Land Degrad. Dev., doi 10.1002/ldr.3176 ---------------
# Measured in a wind tunnel, anemometer at 0.6 m above the sample.
TIAN_THRESHOLD_U_AT_0P6M = 5.73  # m/s, UNTREATED aeolian sandy soil

# UAE study windows
BOXES = {
    "UAE + N Oman":      (51.0, 57.0, 22.0, 27.0),
    "Rub al Khali":      (45.0, 56.0, 17.0, 23.0),
    "Tigris-Euphrates":  (42.0, 49.0, 29.0, 36.0),
}


def phi_to_metres(phi):
    """Krumbein phi to grain diameter. d[mm] = 2**(-phi)."""
    return (2.0 ** (-phi)) / 1000.0


def threshold_untreated(d, A=A_BAGNOLD):
    """aeolian.ts thresholdUntreated, Eq 7. u*t0 = A*sqrt((rho_s-rho_a)/rho_a * g * d)."""
    return A * math.sqrt(((RHO_SAND - RHO_AIR) / RHO_AIR) * G * d)


def ustar_to_wind(u_star, z, z0):
    """Log law. U(z) = (u*/kappa) * ln(z/z0)."""
    return (u_star / KAPPA) * math.log(z / z0)


def wind_to_ustar(u, z, z0):
    return u * KAPPA / math.log(z / z0)


def emit_window(f, lat, lon, box):
    lo0, lo1, la0, la1 = box
    yi = np.where((lat >= la0) & (lat <= la1))[0]
    xi = np.where((lon >= lo0) & (lon <= lo1))[0]
    ys, ye = yi.min(), yi.max() + 1
    xs, xe = xi.min(), xi.max() + 1
    ref = f["Calcite"][ys:ye, xs:xe]
    valid = ref != -9999.0
    out = {"cells_total": int(ref.size), "cells_valid": int(valid.sum())}
    out["coverage_fraction"] = round(float(valid.sum() / ref.size), 4)
    per = {}
    for m in MINERALS:
        a = f[m][ys:ye, xs:xe][valid]
        per[m] = {"mean": round(float(a.mean()), 5),
                  "median": round(float(np.median(a)), 5),
                  "max": round(float(a.max()), 5)}
    out["minerals"] = per
    tot = sum(per[m]["mean"] for m in MINERALS)
    out["sum_of_ten_means"] = round(tot, 5)
    out["calcite_share_of_retrieved"] = round(per["Calcite"]["mean"] / tot, 4) if tot else None
    return out


def main():
    print("=" * 78)
    print("STEP 1  Grain size for the UAE, transferred from Saudi analogues")
    print("=" * 78)
    print("Source: Benaafi et al., Arab J Geosci, Table 1 (references/, DOI 10.1007/s12517-015-1970-9)")
    print("Transfer basis: the paper states eastern UAE dune sands resemble Rub' Al-Khali and Sakaka.\n")
    print(f"{'location':<20}{'n':>4}{'mean phi':>10}{'d [um]':>10}{'sorting phi':>13}{'d16 [um]':>10}{'d84 [um]':>10}")
    grain = {}
    for loc, (n, mphi, sphi, sk, ku) in BENAAFI_TABLE1.items():
        d = phi_to_metres(mphi)
        d16 = phi_to_metres(mphi + sphi)   # coarser phi = finer grain
        d84 = phi_to_metres(mphi - sphi)
        grain[loc] = {"n": n, "mean_phi": mphi, "sorting_phi": sphi,
                      "d_m": d, "d16_m": d16, "d84_m": d84,
                      "skewness": sk, "kurtosis": ku}
        star = " <-- UAE analogue" if loc in UAE_ANALOGUES else ""
        print(f"{loc:<20}{n:>4}{mphi:>10.3f}{d*1e6:>10.1f}{sphi:>13.3f}{d16*1e6:>10.1f}{d84*1e6:>10.1f}{star}")

    print("\nNote: sorting in phi is the standard deviation of a log2-normal grain size")
    print("distribution. This IS the distribution the grain size module needed (gap 5.4).")

    print("\n" + "=" * 78)
    print("STEP 2  Threshold friction velocity, aeolian.ts Eq 7")
    print("=" * 78)
    print("u*t0 = A * sqrt((rho_s - rho_a)/rho_a * g * d),  A = 0.11 [0.08, 0.14]\n")
    print(f"{'location':<20}{'d [um]':>10}{'u*t0 [m/s]':>12}{'lo A=0.08':>11}{'hi A=0.14':>11}")
    for loc in UAE_ANALOGUES + ["Eastern Province"]:
        d = grain[loc]["d_m"]
        u = threshold_untreated(d)
        grain[loc]["ustar_t0"] = u
        print(f"{loc:<20}{d*1e6:>10.1f}{u:>12.4f}{threshold_untreated(d,0.08):>11.4f}{threshold_untreated(d,0.14):>11.4f}")

    print("\n" + "=" * 78)
    print("STEP 3  Consistency check against an independent wind tunnel measurement")
    print("=" * 78)
    print(f"Tian et al. 2018 (doi 10.1002/ldr.3176) measured the threshold wind velocity of")
    print(f"UNTREATED aeolian sandy soil as {TIAN_THRESHOLD_U_AT_0P6M} m/s, anemometer at z = 0.6 m.")
    print("Converting our u*t0 to a 0.6 m wind speed needs a roughness length z0.")
    print("Bagnold's z0 = d/30 is used here and is an ASSUMPTION, not a measurement.\n")
    print(f"{'location':<20}{'z0 [um]':>10}{'U(0.6m) [m/s]':>15}{'vs Tian 5.73':>14}")
    for loc in UAE_ANALOGUES:
        d = grain[loc]["d_m"]; z0 = d / 30.0
        u06 = ustar_to_wind(grain[loc]["ustar_t0"], 0.6, z0)
        grain[loc]["U_0p6m_pred"] = u06
        print(f"{loc:<20}{z0*1e6:>10.2f}{u06:>15.2f}{u06/TIAN_THRESHOLD_U_AT_0P6M:>13.2f}x")
    # inverse: what grain size does Tian's 5.73 m/s imply under the same assumptions?
    print("\nInverse check. Solving for the d that reproduces Tian's 5.73 m/s at 0.6 m,")
    print("under the same A and z0 = d/30 assumptions:")
    lo, hi = 1e-5, 2e-3
    for _ in range(200):
        mid = 0.5 * (lo + hi)
        if ustar_to_wind(threshold_untreated(mid), 0.6, mid / 30.0) < TIAN_THRESHOLD_U_AT_0P6M:
            lo = mid
        else:
            hi = mid
    d_tian = 0.5 * (lo + hi)
    print(f"  implied d = {d_tian*1e6:.1f} um  ({-math.log2(d_tian*1000):.2f} phi)")
    print("  Tian's soil is a Chinese aeolian sandy soil, so a finer grain size than the")
    print("  Rub' Al-Khali is expected. Agreement to this level supports the equation chain.")

    print("\n" + "=" * 78)
    print("STEP 4  Surface mineralogy over the UAE, EMIT L3 ASA")
    print("=" * 78)
    with h5py.File(EMIT, "r") as f:
        lat = f["latitude"][:].astype("f8")
        lon = f["longitude"][:].astype("f8")
        emit = {}
        for name, box in BOXES.items():
            emit[name] = emit_window(f, lat, lon, box)
            e = emit[name]
            print(f"\n{name}  ({e['cells_valid']}/{e['cells_total']} cells valid, "
                  f"{100*e['coverage_fraction']:.0f}% coverage)")
            print(f"   Calcite mean {e['minerals']['Calcite']['mean']:.4f}   "
                  f"Dolomite mean {e['minerals']['Dolomite']['mean']:.4f}")
            print(f"   sum of the ten retrieved means = {e['sum_of_ten_means']:.4f} "
                  f"(NOT 1.0, quartz and feldspar are spectrally invisible)")
            print(f"   calcite share of what EMIT retrieves = {e['calcite_share_of_retrieved']:.3f}")

    print("\n" + "=" * 78)
    print("STEP 5  Cross-check EMIT against the petrography in the same Saudi paper")
    print("=" * 78)
    print("Benaafi et al. state, for coastal Arabian dune sands: quartz dominates, with a")
    print("significant amount (<10%) of calcite and low feldspar. EMIT reports calcite as a")
    print("fraction of the ten retrievable minerals only, so the two are NOT directly")
    print("comparable. See the knowledge graph for how to reconcile them.")

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    payload = {
        "provenance": {
            "grain_size": "Benaafi et al., Arab J Geosci, Table 1, doi 10.1007/s12517-015-1970-9",
            "grain_size_uae_transfer": "paper's own statement that eastern UAE dune sands resemble Rub' Al-Khali and Sakaka (citing Al-Sayed 1999)",
            "threshold_equation": "src/lib/physics/aeolian.ts thresholdUntreated (Eq 7), A = 0.11",
            "wind_tunnel_check": "Tian et al. 2018, doi 10.1002/ldr.3176, 5.73 m/s at z = 0.6 m, untreated",
            "mineralogy": "EMIT L3 ASA, DOI 10.5067/EMIT/EMITL3ASA.001, 0.5 deg grid, fractions not percent",
            "assumptions": [
                "z0 = d/30 (Bagnold) for the log-law conversion, not measured",
                "grain size transferred from Saudi analogues to the UAE on the paper's stated similarity",
                "EMIT abundances are spectral, over ten minerals only, and exclude quartz and feldspar",
            ],
        },
        "grain_size": {k: {kk: vv for kk, vv in v.items()} for k, v in grain.items()},
        "emit": emit,
        "tian2018_threshold_U_0p6m_ms": TIAN_THRESHOLD_U_AT_0P6M,
    }
    with open(OUT, "w") as fh:
        json.dump(payload, fh, indent=2)
    print(f"\nwrote {os.path.relpath(OUT, REPO)}")


if __name__ == "__main__":
    main()
