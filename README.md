# iGEM Modeling Tool Kit

The dry-lab modelling toolkit for NYU Abu Dhabi iGEM 2026. It is a Next.js and
TypeScript application that runs every model in the browser: aeolian transport,
crust mechanics, the metabolic and kill-switch models, and a dust exposure
module that prices soiling at real UAE solar sites.

Nothing here is a mock-up. Every constant traces to a cited source or to a
labelled wet-lab measurement, and the modules say where a number is uncertain.

## Local development

Use Node.js 22 LTS.

```bash
npm ci
npm run dev
```

Run the same checks CI runs, without starting a server:

```bash
npm run verify
```

That is `tsc --noEmit`, ESLint, a production build, and the content-integrity
audit. The audit refuses to pass on placeholder copy, an em dash, or an AI
credit, which are the three house rules easiest to break by accident.

## Repository structure

```text
app/            Next.js routes and the global stylesheet
components/     Chrome, providers, and the Mol* viewer
src/
  components/   Module UI, grouped by area (exposure/, simulation/, landing/)
  lib/          Physics, calibration constants, glossary, module registries
public/
  data/         Built datasets the app fetches at runtime
  code/         Runnable Python mirrored from python_models by sync_code.py
  videos/       Narrated Manim explainers
scripts/        Dataset builders and repository checks
python_models/  Reference implementations of the module physics
manim_videos/   Sources for the explainer animations
```

## Rebuilding the datasets

The files in `public/data/` are committed, so the app runs without any of this.
Rebuild one only when its source updates. Each script writes its own provenance
block, and the dust and wind builders refuse to write a field that contradicts
the literature they cite.

```bash
python3 scripts/fetch_boundaries.py              # coastline and country outlines
python3 scripts/prepare_sources.py               # Ginoux 2012 dust source polygons
python3 scripts/fetch_target_sites.py            # UAE assets the exposure module prices
python3 scripts/fetch_cams_dust_climatology.py   # seasonal Gulf dust, CAMS 2020-2024
python3 scripts/fit_era5_weibull.py              # monthly wind climatology
python3 scripts/fetch_pv_climatology.py          # PV capacity factor grid
python3 scripts/fetch_soilgrids_clay.py          # ISRIC SoilGrids clay content
python3 scripts/sync_code.py                     # mirror python_models into public/code
```

`scripts/verify_weibull_flux.py` checks the closed-form saltation flux against
brute-force integration and is worth running after any change to the wind
physics.

## Contributing

`CLAUDE.md` carries the house rules for anything a reader sees: writing style,
tone, information order, and the design language. `AGENTS.md` covers how to
work: what to reuse, what to verify, and what never to invent. Read
`.claude/RESPONSIBLE_AI_USE.md` before using an assistant on this repository.

## License

Apache License 2.0. See [LICENSE](LICENSE).
