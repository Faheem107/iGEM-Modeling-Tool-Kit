"""
Keep public/code in step with python_models.

Every module that offers a "Code & Plots" window serves its script from
public/code/<id>.py, and those files were byte-identical hand copies of
python_models/<id>.py with nothing enforcing it. Two directories holding the
same code with no check between them drift, and the copy a reader downloads is
the one that would drift silently.

This copies each id the site actually offers, and reports anything missing or
out of step. `--check` makes it read-only, so it can gate a commit without
touching the tree.

Run:
    python scripts/sync_code.py            # copy anything that has drifted
    python scripts/sync_code.py --check    # report only, exit 1 if out of step
"""

import argparse
import hashlib
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "python_models"
DST = ROOT / "public" / "code"
REGISTRY = ROOT / "src" / "lib" / "moduleCode.ts"


def offered_ids():
    """The module ids MODULE_CODE actually offers, read from the registry.

    Parsed rather than duplicated: a hardcoded list here is the same failure
    one level up.
    """
    text = REGISTRY.read_text()
    body = text[text.index("export const MODULE_CODE"):]
    return re.findall(r'^\s{2}"?([a-z0-9-]+)"?:\s*entry\(', body, re.M)


def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true",
                    help="report only, do not copy")
    args = ap.parse_args()

    ids = offered_ids()
    if not ids:
        print("could not read any module ids from moduleCode.ts")
        return 1

    DST.mkdir(parents=True, exist_ok=True)
    missing, drifted, copied, ok = [], [], [], []

    for mod_id in ids:
        src = SRC / f"{mod_id}.py"
        dst = DST / f"{mod_id}.py"
        if not src.exists():
            missing.append(mod_id)
            continue
        if dst.exists() and digest(src) == digest(dst):
            ok.append(mod_id)
            continue
        drifted.append(mod_id)
        if not args.check:
            dst.write_bytes(src.read_bytes())
            copied.append(mod_id)

    print(f"{len(ids)} modules offer code")
    print(f"  in step   {len(ok)}")
    if copied:
        print(f"  copied    {len(copied)}: {', '.join(copied)}")
    elif drifted:
        print(f"  OUT OF STEP {len(drifted)}: {', '.join(drifted)}")
    if missing:
        print(f"  MISSING in python_models: {', '.join(missing)}")

    # Scripts that exist but nothing serves. Not an error: wind_stats.py and
    # damage.py are libraries the module scripts port, not modules themselves.
    extra = sorted(
        p.stem for p in SRC.glob("*.py")
        if p.stem not in ids and p.stem != "render_all"
    )
    if extra:
        print(f"  not offered on the site: {', '.join(extra)}")

    if missing or (args.check and drifted):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
