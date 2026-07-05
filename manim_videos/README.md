# Module explainer videos (Manim)

Short, narrated, 3Blue1Brown-style animations — one per simulation module. They are opened in the
toolkit from each module's **Video Explanation** toggle (or by dropping Sandyx on it), rendered by
the `GlossaryProvider` video window in `src/components/GlossaryTerm.tsx`.

## Toolchain

- **Manim Community** (animation) + **manim-voiceover**.
- **Narration voice: macOS `Samantha`** via `_style.py::MacSayService` — offline, free, and far less
  monotone than gTTS (it inflects on commas, em-dashes and question marks, so punctuate scripts for
  life). It shells out to `say` → AIFF → `ffmpeg` → mp3. **gTTS is only a fallback** if `say` is
  unavailable, so rendering no longer needs the internet. Subtitles are still produced automatically
  by `VoiceoverScene` at the voiceover-block level (no whisper needed).
  - To swap to an expressive/emotional neural voice later, replace `MacSayService` in
    `IGemScene.setup` with manim-voiceover's `OpenAIService` / `ElevenLabsService` and set the API key
    in an env var (never commit it).
- **Real protein backbones, no PyMOL:** `_style.py::load_ca_trace` reads `ATOM … CA …` records
  straight from a `.pdb` and `ribbon()` renders a smooth 3-D gradient trace; `resid_point()` locates a
  real residue so active sites are marked honestly. See `protein3d.py`.
- **LaTeX look without a TeX install:** there is no TeX toolchain here, so `MathTex` is unavailable —
  but every `Text` is set in **Latin Modern** (the OpenType heir of Computer Modern, i.e. the exact
  serif LaTeX renders with). `_style.py` calls `Text.set_default(font="Latin Modern Roman")` so all
  text picks it up; `IGemScene.eqn` renders unicode "equations" in `Latin Modern Mono`. Install the
  fonts once into `~/Library/Fonts` from CTAN (they register as `Latin Modern Roman` / `Latin Modern
  Mono`):

  ```bash
  BASE="https://mirrors.ctan.org/fonts/lm/fonts/opentype/public/lm"
  for f in lmroman10-regular lmroman10-bold lmroman10-italic lmroman10-bolditalic \
           lmmono10-regular lmmonolt10-bold; do
    curl -sSL -o "$HOME/Library/Fonts/$f.otf" "$BASE/$f.otf"; done
  ```
- **Seamless transitions:** `_style.py::IGemScene.smooth_clear` / `swap` fade beats into one another
  with a gentle, staggered `smooth` rate instead of hard cuts; every scene ends on `smooth_clear()`.
- Runs in the dedicated conda env **`manimenv`** (base anaconda lacks the cairo/pango stack):

  ```bash
  conda activate manimenv
  pip install "manim-voiceover[gtts]" gtts      # once, into manimenv
  ```

## Build

```bash
conda run -n manimenv python build.py                 # all modules listed in build.py
conda run -n manimenv python build.py fba caco3        # just these
conda run -n manimenv python build.py --quality h fba  # 1080p60 (default is m = 720p30)
```

`build.py` renders the scene, converts the auto-generated `.srt` subtitles to WebVTT, and copies
`<module-id>.mp4` + `<module-id>.en.vtt` into `../public/videos/`. After a module's files exist,
flip its `ready` flag to `true` in `src/lib/moduleVideos.ts` so the app embeds the video instead of
the "rendering soon" placeholder.

## Files

- `_style.py` — shared palette (mirrors the app's dark theme) + `IGemScene` base (dark bg, Samantha
  voice, Latin Modern default font, `say()` sync helper, `smooth_clear()`/`swap()` transitions,
  `eqn()`/`chip()`/`title_card()`/`mini_axes()`).
- One scene file per module (`fba.py`, `caco3.py`, `metabolic.py`, `crosslink.py`, `ca_anchoring.py`,
  `alginate.py`, `thermal.py`, `ecological.py`, `aeolian.py`, `wetlab.py`, `grainsize.py`,
  `curing.py`, `economic.py`, `composite.py`, `protein3d.py`) — one `VoiceoverScene` each.
- `build.py` — render + subtitle + copy orchestrator; the `MODULES` map is the source of truth for
  module-id → (script, Scene).

## Status

**All 15 module videos are rendered & live** (Samantha voice, Latin Modern / LaTeX-look type,
seamless `smooth_clear` transitions). Every id in `MODULES` has a matching `<id>.mp4` + `<id>.en.vtt`
in `../public/videos/`, and every `ready` flag in `src/lib/moduleVideos.ts` is `true`. Re-render any
one with `python build.py <id>`; re-render all with `python build.py`.

### .pdb files needed (protein/DNA scenes)

The user chose **real structures**. Three scenes trace a real Cα backbone; drop these `.pdb` files
in `manim_videos/pdb/` before rendering them:

| Scene         | Protein                         | Suggested PDB | Notes |
|---------------|---------------------------------|---------------|-------|
| `protein-3d`  | Carbonic anhydrase II           | `1CA2`        | Classic CA fold, Zn active site. |
| `ca-anchoring`| Carbonic anhydrase (displayed)  | `1CA2`        | Reuse; highlight the C-terminal anchor. |
| `metabolic`   | γ-PGA synthase complex (PgsBCA) | best available| If no full structure, a representative synthetase or a stylized DNA→enzyme motif is used. |

Download from RCSB, e.g. `https://files.rcsb.org/download/1CA2.pdb`. The scene reads only `ATOM …
CA …` records (Cα trace) — **PyMOL is not required**.
