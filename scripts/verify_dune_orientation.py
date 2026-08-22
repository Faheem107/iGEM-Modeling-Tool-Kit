"""
Check the model's drift direction against the shape of the dunes themselves.

The claim under test
--------------------
Sand does not need an instrument to record where it has been going. Dune crest
orientation is a multi-decade integral of the drift direction and it is visible
in satellite imagery. Fryberger's convention is that transverse dune crests sit
roughly perpendicular to the resultant drift, so the crest bearing should fall
near (RDD + 90) mod 180.

This is the cheapest external check available to this project and it needs no
data request. It does need a human, because measuring a ridge line off imagery
is not something this script can do, and a number that looks measured but was
not would be worse than no number at all.

How to use it
-------------
1. Run it. It prints the five sites, the model's prediction for each, and stops.
2. Fill in `measured_crest_bearing_deg` in scripts/dune_crest_bearings.json,
   following the how_to_measure steps in that file.
3. Run it again. It compares and reports.

It refuses to print a result while any bearing is still null, the same way
scripts/transport_model.py raises on its NEEDS_SOURCE entries rather than
guessing.

What a failure means
--------------------
The model predicts the drift rotates about 43 degrees across these five cells.
If the measured crests do not rotate with it, the sector weighting in
src/lib/physics/windStats.ts is wrong, and every drift arrow on the /exposure
map is wrong with it. A constant offset at all five sites is a different and
milder problem: it points at the convention, not at the weighting.

Run:  python3 scripts/verify_dune_orientation.py
No network. Reads the worksheet and the shipped climatology.
"""

import json
import pathlib
import sys

WORKSHEET = pathlib.Path(__file__).resolve().parent / "dune_crest_bearings.json"

#: A transverse crest is not a protractor. Fryberger's own relation is
#: approximate, real dune fields carry oblique and linear forms alongside
#: transverse ones, and reading a ridge off imagery is worth a few degrees on
#: its own. This is the band inside which the model is doing its job.
TOLERANCE_DEG = 25.0


def axial_diff(a, b):
    """Smallest angle between two undirected lines, in [0, 90].

    Crest bearings are axes, not directions: a ridge at 10 degrees and one at
    190 are the same ridge. Treating them as directions would report a 180
    degree error for a perfect match.
    """
    d = abs((a - b) % 180.0)
    return min(d, 180.0 - d)


def main():
    if not WORKSHEET.exists():
        raise SystemExit(f"{WORKSHEET} not found.")
    doc = json.loads(WORKSHEET.read_text())
    sites = doc.get("sites", [])
    if not sites:
        raise SystemExit("The worksheet lists no sites.")

    pending = [s for s in sites if s.get("measured_crest_bearing_deg") is None]

    if pending:
        print("Dune crest orientation check: NOT YET MEASURED\n")
        print(doc["what"] + "\n")
        print(f"{'site':<24}{'measure at':>16}{'model drift':>13}"
              f"{'predicted crest':>17}{'one-way':>9}")
        print("-" * 79)
        for s in sites:
            at = s["measure_at"]
            got = s.get("measured_crest_bearing_deg")
            where = f"{at['lon']}E {at['lat']}N"
            line = (f"{s['id']:<24}{where:>16}{s['model_rdd_deg']:12.1f}"
                    f"\u00b0{s['model_predicted_crest_bearing_deg']:16.1f}"
                    f"\u00b0{s['model_udi']:9.2f}")
            if got is not None:
                line += f"   measured {got:.1f}"
            print(line)
        print()
        print(doc["why_these_five"] + "\n")
        print("To measure:")
        for i, step in enumerate(doc["how_to_measure"], 1):
            print(f"  {i}. {step}")
        print()
        print(f"FAIL  {len(pending)} of {len(sites)} sites have no measured crest "
              f"bearing yet.", file=sys.stderr)
        raise SystemExit(
            "Refusing to report a result from an unmeasured worksheet. Fill in "
            f"{WORKSHEET.name} and run again."
        )

    print("Dune crest orientation check\n")
    print(f"{'site':<24}{'model drift':>13}{'predicted crest':>17}"
          f"{'measured':>11}{'off by':>9}{'verdict':>10}")
    print("-" * 84)
    offs, deviations = [], 0
    for s in sites:
        pred = float(s["model_predicted_crest_bearing_deg"])
        meas = float(s["measured_crest_bearing_deg"])
        off = axial_diff(pred, meas)
        offs.append((s["id"], pred, meas, off))
        bad = off > TOLERANCE_DEG
        deviations += bad
        print(f"{s['id']:<24}{s['model_rdd_deg']:12.1f}°{pred:16.1f}°"
              f"{meas:10.1f}°{off:8.1f}°{'OFF' if bad else 'ok':>10}")

    # A constant offset everywhere is a convention problem. A varying one is a
    # weighting problem. They are worth separating, because the fixes differ.
    signed = [((m - p + 90) % 180) - 90 for _i, p, m, _o in offs]
    mean_signed = sum(signed) / len(signed)
    spread = max(signed) - min(signed)

    print(f"\n  mean signed offset {mean_signed:+.1f}°, spread across sites {spread:.1f}°")
    print(f"  worst single site   {max(o for _i, _p, _m, o in offs):.1f}°, "
          f"tolerance {TOLERANCE_DEG:.0f}°")

    problems = []
    if deviations > len(sites) / 2:
        problems.append(
            f"{deviations} of {len(sites)} crests sit more than "
            f"{TOLERANCE_DEG:.0f} degrees off the predicted orientation")
    if abs(mean_signed) > TOLERANCE_DEG and spread < TOLERANCE_DEG:
        problems.append(
            f"every site is off by about the same {mean_signed:+.0f} degrees. "
            f"A constant offset points at the convention in windStats.ts, not at "
            f"the sector weighting")
    elif spread > 2 * TOLERANCE_DEG:
        problems.append(
            f"the offset varies by {spread:.0f} degrees across the five cells, so "
            f"the model's spatial rotation does not match the landform's. That is "
            f"the sector weighting in windStats.ts")

    if problems:
        print()
        for p in problems:
            print(f"FAIL  {p}", file=sys.stderr)
        raise SystemExit("The drift direction does not match the dunes. Report it.")
    print("\nPASS, the crests sit where the modelled drift says they should.")


if __name__ == "__main__":
    main()
