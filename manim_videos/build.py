#!/usr/bin/env python3
"""
Build orchestrator for the NYUAD iGEM module explainer videos.
==============================================================
Renders the requested Manim scene(s), converts the auto-generated .srt subtitles to WebVTT,
and copies the mp4 + .en.vtt into ../public/videos/<module-id>.* so the toolkit can serve them.

Usage:
    python build.py                 # build every module in MODULES
    python build.py fba caco3       # build just these module ids
    python build.py --quality h ...  # override quality (l/m/h); default m (720p30)

Each module id maps to (script file, Scene class). Add rows here as new scenes are written.
"""
import subprocess
import sys
import shutil
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
PUBLIC = HERE.parent / "public" / "videos"

# module-id -> (script.py, SceneClassName)
MODULES = {
    "fba": ("fba.py", "FbaExplainer"),
    "caco3": ("caco3.py", "Caco3Explainer"),
    "composite": ("composite.py", "CompositeExplainer"),
    "protein-3d": ("protein3d.py", "Protein3dExplainer"),
    "metabolic": ("metabolic.py", "MetabolicExplainer"),
    "crosslink": ("crosslink.py", "CrosslinkExplainer"),
    "ca-anchoring": ("ca_anchoring.py", "CaAnchoringExplainer"),
    "alginate": ("alginate.py", "AlginateExplainer"),
    "thermal": ("thermal.py", "ThermalExplainer"),
    "ecological": ("ecological.py", "EcologicalExplainer"),
    "aeolian": ("aeolian.py", "AeolianExplainer"),
    "wetlab": ("wetlab.py", "WetlabExplainer"),
    "grainsize": ("grainsize.py", "GrainsizeExplainer"),
    "curing": ("curing.py", "CuringExplainer"),
    "economic": ("economic.py", "EconomicExplainer"),
}

QUALITY_DIR = {"l": "480p15", "m": "720p30", "h": "1080p60"}


def srt_to_vtt(srt_path: Path, vtt_path: Path) -> None:
    text = srt_path.read_text(encoding="utf-8")
    # SRT timestamps use a comma for the millisecond separator; VTT uses a dot.
    text = re.sub(r"(\d\d:\d\d:\d\d),(\d\d\d)", r"\1.\2", text)
    vtt_path.write_text("WEBVTT\n\n" + text, encoding="utf-8")


def build(module_id: str, quality: str) -> bool:
    if module_id not in MODULES:
        print(f"  !! unknown module id: {module_id}")
        return False
    script, scene = MODULES[module_id]
    print(f"== {module_id}: rendering {script}::{scene} (-q{quality}) ==")
    r = subprocess.run(
        ["manim", f"-q{quality}", "--media_dir", str(HERE / "media"), script, scene],
        cwd=HERE,
    )
    if r.returncode != 0:
        print(f"  !! render failed for {module_id}")
        return False

    qdir = QUALITY_DIR[quality]
    mp4 = HERE / "media" / "videos" / Path(script).stem / qdir / f"{scene}.mp4"
    srt = mp4.with_suffix(".srt")
    if not mp4.exists():
        print(f"  !! expected mp4 not found: {mp4}")
        return False

    PUBLIC.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(mp4, PUBLIC / f"{module_id}.mp4")
    if srt.exists():
        srt_to_vtt(srt, PUBLIC / f"{module_id}.en.vtt")
    else:
        print(f"  .. no subtitle srt for {module_id} (subtitles will be absent)")
    print(f"  -> public/videos/{module_id}.mp4  (+ .en.vtt)")
    return True


def main(argv):
    quality = "m"
    ids = []
    it = iter(argv)
    for a in it:
        if a in ("--quality", "-q"):
            quality = next(it)
        elif a.startswith("--quality="):
            quality = a.split("=", 1)[1]
        else:
            ids.append(a)
    quality = quality[0].lower()
    if quality not in QUALITY_DIR:
        quality = "m"
    if not ids:
        ids = list(MODULES.keys())
    ok = all(build(m, quality) for m in ids)
    print("\nDONE" if ok else "\nDONE (with failures)")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main(sys.argv[1:])
