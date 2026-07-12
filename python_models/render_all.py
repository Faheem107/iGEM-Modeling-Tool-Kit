"""
Render every module's preview plots into public/code/plots/.
Run from anywhere:  python python_models/render_all.py

Imports each module script, calls its figures() and saves the PNGs the website serves
as "preliminary plots". The same scripts are downloadable per-module and reproduce these
exact figures when run directly.
"""

import importlib.util
import pathlib
import matplotlib
matplotlib.use("Agg")

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent / "public" / "code" / "plots"
OUT.mkdir(parents=True, exist_ok=True)

MODULES = [
    "fba", "metabolic", "crosslink", "caco3", "ca-anchoring", "alginate", "thermal",
    "ecological", "killswitch", "aeolian", "grainsize", "composite", "curing", "economic",
]


def load(mod_id):
    spec = importlib.util.spec_from_file_location(
        mod_id.replace("-", "_"), HERE / f"{mod_id}.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main():
    total = 0
    for mod_id in MODULES:
        mod = load(mod_id)
        figs = mod.figures()
        for fig, name in figs:
            fig.savefig(OUT / name, bbox_inches="tight")
            matplotlib.pyplot.close(fig)
            total += 1
        print(f"  {mod_id}: {len(figs)} plots")
    print(f"wrote {total} plots to {OUT}")


if __name__ == "__main__":
    main()
