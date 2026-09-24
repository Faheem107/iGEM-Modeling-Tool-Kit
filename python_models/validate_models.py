"""
Cross-tier validation: does the Python mirror still agree with the website?
===========================================================================
Run with:  python3 python_models/validate_models.py

The website solves the metabolic network in TypeScript and these scripts solve it
again in Python. Two implementations of the same model are only useful if they
are actually the same model, and nothing enforces that on its own: the Python
mirror once drifted far enough to lose pyruvate kinase entirely, which made every
solve infeasible while the TypeScript carried on returning sensible numbers.

This runs scripts/validate-models.ts, reads the JSON it prints, and compares it
against the Python. Any disagreement beyond the tolerance is a failure, because
it means one of the two tiers is wrong and the wiki is quoting whichever one it
happened to read.

Exits non-zero if the two disagree.
"""
import importlib.util
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# Relative tolerance. The two tiers solve the same linear program with different
# solvers, so they agree to solver precision rather than to the bit.
TOL = 1e-6


def load(name):
    path = os.path.join(HERE, f"{name}.py")
    spec = importlib.util.spec_from_file_location(name.replace("-", "_"), path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def typescript_report():
    """Run the TypeScript validator and return the JSON block it prints."""
    proc = subprocess.run(
        ["npx", "tsx", "scripts/validate-models.ts"],
        capture_output=True, cwd=ROOT, text=True,
    )

    if "---JSON---" not in proc.stdout:
        print("Could not read the TypeScript report. Its output was:")
        print(proc.stdout[-2000:])
        print(proc.stderr[-2000:])
        sys.exit(1)

    if proc.returncode != 0:
        print("The TypeScript validator itself failed. Fix that before comparing tiers.")
        sys.exit(1)

    return json.loads(proc.stdout.split("---JSON---", 1)[1])


failures = []


def compare(name, ts_value, py_value, tol=TOL):
    """Report one comparison, and record it if the two tiers disagree."""
    if ts_value == 0:
        ok = abs(py_value) <= tol
        rel = abs(py_value)
    else:
        rel = abs(py_value - ts_value) / abs(ts_value)
        ok = rel <= tol

    if not ok:
        failures.append(name)

    print(
        f"{'pass' if ok else 'FAIL'}  {name}\n"
        f"        TypeScript {ts_value!r}\n"
        f"        Python     {py_value!r}"
        + ("" if ok else f"\n        relative difference {rel:.3e}, tolerance {tol:g}")
    )


def main():
    print("Running the TypeScript validator to read what the website computes...\n")
    ts = typescript_report()
    fba = load("fba")
    ref = fba.reference()

    print("Biomass equation")
    compare("biomass carbon drawn", ts["biomass"]["carbonDrawn"], fba.BIO_CARBON)
    compare("biomass nitrogen drawn", ts["biomass"]["nitrogenDrawn"], fba.BIO_NITROGEN)
    for met, coeff in sorted(ts["biomass"]["stoich"].items()):
        compare(f"biomass coefficient {met}", coeff, fba.BIOMASS.get(met, 0.0))

    print("\nWild type at the calibrated bounds")
    compare("growth rate", ts["wildType"]["mu"], ref["mu"])
    compare("biomass yield", ts["wildType"]["yield"], ref["yield_gdcw_per_g"])
    compare("oxygen uptake", ts["wildType"]["qO2"], ref["qO2"])
    compare("CO2 evolution", ts["wildType"]["qCO2"], ref["qCO2"])

    print("\nSingle deletions")
    # Product capacity is compared at matched growth, which is what both tiers do.
    # Comparing at each mutant's own optimum would conflate a deletion that
    # redirects carbon with one that merely grows more slowly.
    mu_wt = ref["mu"]
    target = 0.6 * mu_wt
    _, pga_wt, _ = fba.solve("EX_PGA", fix_growth=target)
    gene_to_id = {gene: rid for gene, rid in fba.KNOCKOUTS}
    for gene, result in ts["knockouts"].items():
        rid = gene_to_id.get(gene)

        if rid is None:
            failures.append(f"knockout {gene} is missing from the Python mirror")
            print(f"FAIL  knockout {gene} is in the TypeScript but not in Python")
            continue

        _, mu_ko, _ = fba.solve(knockouts=(rid,))
        _, pga_ko, _ = fba.solve("EX_PGA", fix_growth=target, knockouts=(rid,))
        compare(f"knockout {gene} growth fraction", result["muFrac"], mu_ko / mu_wt)
        compare(f"knockout {gene} product fraction", result["pgaFrac"], pga_ko / pga_wt)

    print("\nProduction envelope")
    growth, product, _ = fba.production_envelope(n=len(ts["envelope"]))
    for i, point in enumerate(ts["envelope"]):
        compare(f"envelope point {i} growth", point["mu"], float(growth[i]))
        compare(f"envelope point {i} product", point["pga"], float(product[i]))

    print()
    if failures:
        print(f"{len(failures)} comparison(s) disagree between the two tiers:")
        for name in failures:
            print(f"  - {name}")
        sys.exit(1)

    print("The Python mirror and the TypeScript the website runs agree on every value.")


if __name__ == "__main__":
    main()
