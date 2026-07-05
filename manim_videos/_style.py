"""
Shared visual language for the NYUAD iGEM 2026 module explainer videos.
====================================================================
Every module video is a single narrated VoiceoverScene (Samantha + subtitles) that matches the
toolkit's dark UI: near-black background, teal/cyan primary, amber/rose/fuchsia prong accents.

Typography: there is no TeX install on this machine, so MathTex is unavailable — but to get the
LaTeX *look*, all text is set in **Latin Modern** (the OpenType descendant of Computer Modern,
i.e. the exact serif LaTeX renders with). `Text.set_default(font=SERIF)` below routes every Text
through it; "equations" are unicode Text in Latin Modern Mono. So the videos read like LaTeX
without needing a TeX toolchain.

3b1b-flavoured, but honest: the visuals only illustrate mechanisms that are already in the
models (src/lib/physics/*). Nothing here invents data.
"""

import os
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from manim import *

# --- Typography: LaTeX look via Latin Modern (Computer Modern's OpenType heir) -
# Installed into ~/Library/Fonts as lmroman*/lmmono* (see manim_videos/README.md). Pango exposes
# them under these family names. Setting Text's default font routes EVERY Text through the LaTeX
# serif, so scenes don't need to pass font= everywhere.
SERIF = "Latin Modern Roman"
MONO = "Latin Modern Mono"
try:
    Text.set_default(font=SERIF)
except Exception:
    pass
from manim_voiceover import VoiceoverScene
from manim_voiceover.services.base import (
    SpeechService,
    initialize_speech_service,
    path_to_string,
)
from manim_voiceover.helper import remove_bookmarks


# --- Narration voice ----------------------------------------------------------
class MacSayService(SpeechService):
    """
    Narrate with a macOS system voice (offline, free) instead of the flat gTTS robot.

    Shells out to `say` to synthesise an AIFF, then transcodes to mp3 with ffmpeg. Samantha
    inflects on commas, em-dashes and question marks, so well-punctuated scripts read with far
    more life than gTTS. Subtitles are still produced automatically by VoiceoverScene at the
    voiceover-block level (no whisper needed).
    """

    def __init__(self, voice: str = "Samantha", rate: int = 178, **kwargs: object) -> None:
        initialize_speech_service(self, kwargs)
        self.voice = voice
        self.rate = rate  # words/min; a touch under Samantha's default for clarity.

    def generate_from_text(self, text, cache_dir=None, path=None, **kwargs):
        if cache_dir is None:
            cache_dir = self.cache_dir
        input_text = remove_bookmarks(text)
        input_data = {
            "input_text": input_text,
            "service": "mac-say",
            "voice": self.voice,
            "rate": self.rate,
        }
        cached = self.get_cached_result(input_data, cache_dir)
        if cached is not None:
            return cached

        audio_path = (
            self.get_audio_basename(input_data) + ".mp3" if path is None else path_to_string(path)
        )
        final_mp3 = Path(cache_dir) / audio_path

        with tempfile.NamedTemporaryFile(suffix=".aiff", delete=False) as tf:
            aiff = tf.name
        try:
            subprocess.run(
                ["say", "-v", self.voice, "-r", str(self.rate), "-o", aiff, input_text],
                check=True,
            )
            subprocess.run(
                ["ffmpeg", "-y", "-i", aiff, "-codec:a", "libmp3lame", "-qscale:a", "2",
                 str(final_mp3)],
                check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
        finally:
            if os.path.exists(aiff):
                os.remove(aiff)

        return {"input_text": text, "input_data": input_data, "original_audio": audio_path}

# --- Palette (mirrors src/index.css / the app's dark theme) -------------------
BG = "#0a0f18"
INK = "#e2e8f0"
MUTED = "#94a3b8"
TEAL = "#2dd4bf"
CYAN = "#22d3ee"
INDIGO = "#818cf8"
AMBER = "#fbbf24"      # Prong 1 — γ-PGA
EMERALD = "#34d399"    # Prong 2 — CaCO3
ROSE = "#fb7185"       # Prong 3 — alginate
FUCHSIA = "#e879f9"
GRID = "#16233a"

PRONG_COLORS = {1: AMBER, 2: EMERALD, 3: ROSE}


class IGemScene(VoiceoverScene):
    """Base scene: sets the dark background + gTTS voice, and offers small helpers."""

    def setup(self):
        super().setup()
        self.camera.background_color = BG
        # Offline macOS voice (Samantha). Falls back to gTTS only if `say` is unavailable.
        try:
            self.set_speech_service(MacSayService(voice="Samantha"))
        except Exception:
            from manim_voiceover.services.gtts import GTTSService
            self.set_speech_service(GTTSService(lang="en"))

    # -- helpers ---------------------------------------------------------------
    def say(self, text, *anims, run_time=None, hold=0.4, **kwargs):
        """
        Narrate `text` while playing `anims`, keeping picture and voice in sync.
        The animation fills the spoken duration; any spare narration is padded with a wait
        so the subtitle stays on screen until the sentence finishes.
        """
        with self.voiceover(text=text) as tracker:
            if anims:
                rt = run_time if run_time is not None else max(0.5, tracker.duration - hold)
                self.play(*anims, run_time=rt)
            remaining = tracker.get_remaining_duration()
            if remaining > 0:
                self.wait(remaining)

    def title_card(self, headline, subtitle, accent=TEAL):
        """A clean opening/closing card."""
        head = Text(headline, font_size=46, color=INK, weight="BOLD")
        sub = Text(subtitle, font_size=24, color=accent, weight="MEDIUM")
        sub.next_to(head, DOWN, buff=0.35)
        g = VGroup(head, sub).move_to(ORIGIN)
        return g, head, sub

    def eqn(self, s, color=INK, size=30):
        """Render a compact 'equation' as unicode Text in the Latin Modern Mono (LaTeX-mono) face."""
        return Text(s, font=MONO, font_size=size, color=color)

    # -- transitions -----------------------------------------------------------
    def smooth_clear(self, run_time=0.9, shift=UP * 0.25):
        """
        Seamlessly retire everything on screen with a gentle, slightly-staggered fade-and-drift.
        Used between beats so sections dissolve into one another instead of hard-cutting.
        """
        mobs = [m for m in self.mobjects if m is not None]
        if not mobs:
            return
        self.play(
            LaggedStart(*[FadeOut(m, shift=shift) for m in mobs], lag_ratio=0.06),
            run_time=run_time, rate_func=smooth,
        )

    def swap(self, out_mobs, in_anim, run_time=0.9):
        """Cross-fade: fade `out_mobs` away while `in_anim` fades in, on one smooth timeline."""
        self.play(
            AnimationGroup(
                *[FadeOut(m, shift=UP * 0.2) for m in out_mobs],
                in_anim,
            ),
            run_time=run_time, rate_func=smooth,
        )

    def chip(self, label, color, width=2.6, height=0.9):
        box = RoundedRectangle(corner_radius=0.14, width=width, height=height,
                               stroke_color=color, stroke_width=2.5,
                               fill_color=color, fill_opacity=0.12)
        txt = Text(label, font_size=22, color=INK, weight="BOLD").move_to(box)
        return VGroup(box, txt)

    def mini_axes(self, x_range, y_range, x_len=5.4, y_len=3.0, color=MUTED):
        """A clean, number-free pair of axes for the little inline curves (no TeX, no ticks)."""
        return Axes(
            x_range=x_range, y_range=y_range, x_length=x_len, y_length=y_len, tips=False,
            axis_config={"color": color, "stroke_width": 2.5, "include_ticks": False},
        )

    def axis_labels(self, ax, x, y, color=MUTED, size=20):
        """Latin-Modern axis captions placed just off the ends of a `mini_axes`."""
        xl = Text(x, font_size=size, color=color).next_to(ax.x_axis.get_end(), DOWN, buff=0.2)
        yl = Text(y, font_size=size, color=color).next_to(ax.y_axis.get_end(), LEFT, buff=0.2)
        return VGroup(xl, yl)

    def caption(self, text, size=26, color=MUTED, to=DOWN, buff=0.6):
        """A lower-third caption that sits out of the way of the main figure."""
        t = Text(text, font_size=size, color=color, weight="MEDIUM")
        t.to_edge(to, buff=buff)
        return t


PDB_DIR = Path(__file__).resolve().parent / "pdb"


def load_ca_trace(pdb_filename, chain=None, target_height=4.4, return_resids=False):
    """
    Parse the Cα backbone out of a real .pdb file (ATOM … CA … records) and return an ordered
    (N,3) array of points, centred on the origin and scaled to `target_height`. No PyMOL / Biopython
    needed — we read the fixed-column ATOM records directly. If `chain` is None the first chain seen
    is used (keeps single-domain reveals clean). With `return_resids=True` also returns the list of
    integer residue numbers, so callers can honestly locate real active-site residues on the trace.
    """
    pts, resids = [], []
    picked_chain = chain
    for line in (PDB_DIR / pdb_filename).read_text().splitlines():
        if not line.startswith("ATOM"):
            continue
        if line[12:16].strip() != "CA":
            continue
        ch = line[21]
        if picked_chain is None:
            picked_chain = ch
        if ch != picked_chain:
            continue
        try:
            x, y, z = float(line[30:38]), float(line[38:46]), float(line[46:54])
            resid = int(line[22:26])
        except ValueError:
            continue
        pts.append((x, y, z))
        resids.append(resid)
    if not pts:
        raise ValueError(f"No Cα atoms found in {pdb_filename} (chain {picked_chain}).")

    arr = np.array(pts, dtype=float)
    arr -= arr.mean(axis=0)
    span = float(np.ptp(arr, axis=0).max()) or 1.0
    arr *= target_height / span
    return (arr, resids) if return_resids else arr


def resid_point(arr, resids, target):
    """Return the (scaled, centred) Cα position of a given residue number, or None if absent."""
    for i, r in enumerate(resids):
        if r == target:
            return arr[i]
    return None


def ribbon(points, color_a=CYAN, color_b=INDIGO, stroke_width=7):
    """
    Turn a Cα point cloud into a smooth glowing backbone ribbon (a Catmull-Rom-smoothed VMobject
    with a colour gradient along the chain). Reads as a 3b1b-style protein trace and animates with a
    clean Create() draw-on. Shade-in-3d so it looks solid as the camera orbits.
    """
    curve = VMobject()
    curve.set_points_smoothly([np.array([p[0], p[1], p[2]]) for p in points])
    curve.set_stroke(width=stroke_width, opacity=1.0)
    curve.set_color_by_gradient(color_a, color_b)
    curve.set_shade_in_3d(True)
    return curve
