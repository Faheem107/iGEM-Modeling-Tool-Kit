# iGEM Modeling Tool Kit

The dry lab of NYUAD iGEM 2026 (Dunelock). We engineer *Bacillus subtilis* to
bind loose desert sand into a thin crust, so that sand stops moving and the fine
fraction does not become airborne dust. This repository is the interactive
website that holds every model, the Python version of each model, the scripts
that build its data, and the narrated video that explains it.

Two routes to a crust are modelled:

1. **γ-PGA.** The cell over-produces poly-γ-glutamic acid, and Ca²⁺ cross-links
   it between grains.
2. **CaCO₃.** Carbonic anhydrase displayed on the cell wall precipitates calcium
   carbonate without urea, so no ammonia is released.

A MazE/MazF kill switch is modelled for containment. Alginate was modelled as a
third route and dropped; it stays on the site as a comparison.

## The models

Each model has its logic in `src/lib/physics/` (what the website runs), a Python
version in `python_models/` (what the plots come from), and a video in
`public/videos/<id>.mp4`.

| Model | Website logic | Python |
|---|---|---|
| Flux balance analysis of *B. subtilis* | `fba.ts`, `network.ts` | `fba.py` |
| Intracellular γ-PGA kinetics | `metabolic.ts` | `metabolic.py` |
| γ-PGA Ca²⁺ cross-linking | `crosslink.ts` | `crosslink.py` |
| Carbonic anhydrase display | `constants.ts` (`CA_DISPLAY_CALIB`) | `ca-anchoring.py` |
| CaCO₃ precipitation to crust strength | `caco3.ts` | `caco3.py` |
| Protein thermal stability | `constants.ts` (`THERMAL_CALIB`) | `thermal.py` |
| Protein structures (Mol\*) | `public/pdb/` | none |
| Colony spread | `ecology.ts` | `ecological.py` |
| Kill switch escape | `killswitch.ts` | `killswitch.py` |
| Wind erosion threshold and sand flux | `aeolian.ts` | `aeolian.py` |
| Grain-size coverage | `grainsize.ts` | `grainsize.py` |
| Composite strength | `composite.ts`, `interactions.ts` | `composite.py` |
| Curing and re-application | `curing.ts` | `curing.py` |
| Cost per hectare | `economic.ts` | `economic.py` |
| Exposure: where a site's sand and dust come from | `windStats.ts`, `hotspotTransport.ts`, `dustTransport.ts`, `damage.ts` | `exposure.py`, `wind_stats.py`, `damage.py`, `pv.py` |
| Xanthan gum flow in a tube | `src/lib/xanthanFlow.ts` | none |
| Alginate gel (dropped route) | `alginate.ts` | `alginate.py` |

Every constant lives in `src/lib/physics/constants.ts` with its unit, its source
and the range it is allowed to take. The sources shown on the site for each
model are in `src/lib/moduleSources.ts`.

## Running it

```
npm ci
npm run dev          # http://localhost:3000
npm run verify       # type check, lint, production build, content audit
```

The Python models need numpy and matplotlib (and scipy for `fba.py`):

```
pip install -r python_models/requirements.txt
python python_models/render_all.py      # writes public/code/plots/
python scripts/sync_code.py --check     # public/code matches python_models
```

## Data

Everything in `public/data/` is written by a script in `scripts/`, so it can be
rebuilt.

| File | Script | Source |
|---|---|---|
| `era5_wind_climatology.json` | `fit_era5_weibull.py` | ERA5 hourly wind, via Open-Meteo |
| `wind_validation.json` | `write_wind_validation.py` | ERA5 against airport METAR and Kuwait drift data |
| `uae_pv_climatology.json` | `fetch_pv_climatology.py` | ERA5 irradiance, via Open-Meteo |
| `uae_target_sites.json`, `uae_emirates.geojson` | `fetch_target_sites.py` | OpenStreetMap, Natural Earth |
| `ginoux_middle_east_mam.geojson` | `prepare_sources.py` | Ginoux et al. 2012 dust source map |
| `gulf_boundaries.geojson` | `fetch_boundaries.py` | Natural Earth |
| `soilgrids_clay.json` | `fetch_soilgrids_clay.py` | ISRIC SoilGrids |
| `transport_model.json` | `transport_model.py` | constants only |
| `uae_parameters.json` | `link_uae_parameters.py` | literature values |

Licences of the inputs: ERA5 under the Copernicus licence and Open-Meteo under
CC BY 4.0; OpenStreetMap under ODbL 1.0; Natural Earth public domain; SoilGrids
CC BY 4.0.

## Videos

The videos are Manim scenes in `manim_videos/`, narrated offline. To render one,
or all of them:

```
conda run -n manimenv python manim_videos/build.py              # all
conda run -n manimenv python manim_videos/build.py killswitch   # one
```

`build.py` writes `public/videos/<id>.mp4` and its subtitle track
`public/videos/<id>.en.vtt`.

## House style

Text on the site is plain and short, with no em dashes. Nothing in the code,
the content or the commit history carries an AI signature or credit.
`npm run audit:content` fails the build on either.

## Licence

Apache License 2.0. See [LICENSE](LICENSE).
