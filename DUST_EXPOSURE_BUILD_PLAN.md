# Dust Exposure Toolkit, build plan

How to build the Seasonal Forecast and Live Feed modules. Written so a future session can
pick up without re-deriving anything.

Read in this order:

1. `README.md`, what the repository is.
2. `DUST_EXPOSURE_DATA_SOURCES.md`, the data compilation. **Section 8 is the verified
   part and overrides anything above it.** Section 5 lists the numbers no public dataset
   supplies.
3. `DUST_EXPOSURE_KNOWLEDGE_GRAPH.md`, how each dataset connects to a number the model
   uses, the UAE parameter chain, and the weak links. Read it before writing any physics.
4. `DUST_EXPOSURE_TRANSPORT_AND_VALUE.md`, the transport decision (made), the scale
   mismatch that shapes the whole UI, and the pricing chain.
5. `DUST_EXPOSURE_MODULE_SPEC.md`, **the standing spec for Modules 1 and 2**, the three
   coupled scales, the damage functions and their evidence grades, and the UI rules.
5. This file, how the pieces fit together and in what order to build them.
6. `DESIGN.md` §14 to §16 and `CLAUDE.md`, the component rules. Follow them.

---

## 1. What the two modules actually compute

Both modules answer the same question with different wind inputs.

> Given a target site, how much wind-blown dust reaches it, where did that dust come
> from, and how much less would reach it if our product treated the source.

The chain is the same in both cases:

```
  wind statistics          source map            transport            receptor
  ───────────────          ──────────            ─────────            ────────
  ERA5 monthly Weibull  →  Ginoux FoO polygons →  attribution      →  fraction at site
  or Open-Meteo live       (+ EMIT mineralogy)    (choice pending)     × product effect
       │                        │                                          │
       └── u*  ────────────────►└── saltation flux per source cell ────────┘
                                     via the EXISTING aeolian module
```

The only difference between Seasonal and Live is where the wind comes from and over what
averaging window. Build one engine, feed it two ways. Do not write two models.

---

## 2. What already exists in this repository

Stack: Next.js 15 App Router, React 19, TypeScript, Tailwind 4, Radix UI, Recharts,
Mol\*, GSAP and Lenis for the landing animation.

| Thing | Where | Note |
| --- | --- | --- |
| Physics kernels, TypeScript | `src/lib/physics/*.ts` | The browser-side models |
| Physics kernels, Python | `python_models/*.py` | The mirror used for plots and code export |
| **Aeolian model** | `src/lib/physics/aeolian.ts`, `python_models/aeolian.py` | **The kernel both new modules need** |
| Scheme constants | `src/lib/physics/constants.ts`, `AEOLIAN_CALIB` | See §5.5 of the data doc |
| Module UI shells | `src/components/simulation/modules/*.tsx` | Copy the existing pattern |
| Workspace and shared primitives | `src/components/simulation/SimulationWorkspace.tsx`, `_shared.tsx` | `Panel`, `ModuleShell`, `StatCard` |
| Module metadata | `src/lib/moduleSources.ts`, `moduleMath.ts`, `moduleCode.ts`, `moduleVideos.ts` | Sources, LaTeX, code export and video toggles |
| Retrieved papers | `references/` | Prospero 2002, Ginoux 2012, Bullard 2011, Marticorena and Bergametti 1995 |
| **Ginoux source polygons** | `references/rog1742-sup-0002-sfts01/` | 8 regional KML files, see §4 |

### The key point about `aeolian.ts`

It already does the hard physics. `solveAeolian({ grainDiameter, frictionVelocity,
cohesion })` returns `uStarT0`, `uStarT`, `fluxUntreated`, `fluxTreated`,
`protectionFactor` and `fluxReduction`. The threshold equations and the Bagnold flux law
are implemented and the product effect enters as a single cohesion term γ.

**The new modules add no new erosion physics.** They add two wrappers around what is
already there:

1. A statistical wrapper that turns an instantaneous flux into a monthly mean flux, §5.
2. A geographic wrapper that turns a per-source flux into a fraction arriving at a site,
   §6.

Frame the work that way and the scope stays small.

---

## 3. Data layer, what to fetch and how

### 3.1 Already in the repository, nothing to fetch

**Ginoux 2012 dust source polygons**, `references/rog1742-sup-0002-sfts01/`. Eight KML files. Full
description in §8.4 of the data doc. What matters here:

- The value is **frequency of occurrence (FoO)**, the percentage of days in the season on
  which MODIS Deep Blue dust optical depth at 550 nm exceeds 0.2, on a 0.1 degree grid.
- Polygons are nested contour bands at FoO thresholds 10, 20, 40 and 60, each tagged
  `natural_dust`, `anthro_dust` or `hydro_dust`.
- `Middle_East_MAM.kml` covers 35 to 60 E and 0 to 49 N, 4,084 polygons, dense over the
  Gulf.
- **It is March to May only.** There is no Middle East file for the other three seasons.

Build step: convert KML to GeoJSON once, at build time, not in the browser.

```
scripts/prepare_sources.py
  read references/references/rog1742-sup-0002-sfts01/Middle_East_MAM.kml
  for each Folder: parse name -> (source_type, foo_threshold)
  emit Feature per Polygon with properties {source_type, foo_threshold}
  simplify geometry (Douglas-Peucker, tolerance chosen and RECORDED)
  write public/data/ginoux_middle_east_mam.geojson
```

18 MB of raw KML must not reach a browser. Record the simplification tolerance in the
output file's metadata so the map's geometry is reproducible.

### 3.2 To fetch, keyless

**Open-Meteo Air Quality**, the Live Feed backend. Settled, see §8.2 of the data doc.

```
GET https://air-quality-api.open-meteo.com/v1/air-quality
    ?latitude=..&longitude=..
    &hourly=dust,pm10,aerosol_optical_depth
    &domains=cams_global
    &forecast_days=5
```

- `dust` is in μg/m³ at 10 m. Verified live over Abu Dhabi.
- **Always pass `domains=cams_global`.** The default `auto` may pick the European domain,
  which does not cover the Gulf and is not coupled to the global one.
- Free tier is 10,000 calls per day and is non-commercial. Cache aggressively server side
  so the number of upstream calls does not scale with the number of visitors.
- Attribution is required, to both CAMS and Open-Meteo. Put it in the module footer, not
  buried in a sources drawer.

**Do not use Windy.** Its terms forbid both shipping the free tier and deriving any work
or database from the data on any tier. See §8.3 of the data doc. It is not a matter of
budget.

### 3.3 To fetch, free account required

**ERA5**, via the Copernicus Climate Data Store and the `cdsapi` client. This is the
seasonal wind driver and the only source of wind **direction**.

Fetch `reanalysis-era5-single-levels`, hourly, variables `10m_u_component_of_wind` and
`10m_v_component_of_wind`, over the Gulf and its upwind fetch, for a stated multi-year
period. Fit the Weibull parameters offline, §5. Ship only the fitted parameter grid.

**EMIT L3 ASA**, **already downloaded** to `references/EMIT_L3_ASA_001.nc`.
`EMITL3ASA.001`, DOI `10.5067/EMIT/EMITL3ASA.001`. One global NetCDF on a 0.5 degree grid,
ten minerals including **Calcite** and **Dolomite**, each with an uncertainty layer.

The coverage check has been run. Coverage over the UAE and northern Oman box is 44%, over
the Rub al Khali 82%. Usable per hotspot, not as a continuous raster. Values are
**fractions, not percent**, despite what the LP DAAC page says, and the ten of them do not
sum to 1. Read §Chain F of the knowledge graph before putting any of it on screen.

**Global Wind Atlas 4**, CC BY 4.0, DOI `10.11583/DTU.28955267.v1`. Optional, see §5.3.
The files are 14 to 15 GB each. They are cloud optimised GeoTIFFs, so read a window over
the Gulf by HTTP range request. Never download the whole file.

```python
# windowed read, no full download
import rasterio
from rasterio.windows import from_bounds
url = ".../weib_A_combined_cog_10m.tif"
with rasterio.open(url) as src:
    win = from_bounds(51, 22, 57, 27, src.transform)
    A = src.read(1, window=win)
```

---

## 4. Directory layout to add

```
scripts/                          run offline, outputs committed to public/data
  verify_weibull_flux.py          EXISTS, validates the §5.2 closed form
  link_uae_parameters.py          EXISTS, builds public/data/uae_parameters.json
  prepare_sources.py              Ginoux KML -> simplified GeoJSON
  fit_era5_weibull.py             ERA5 hourly -> monthly (A, k) grid
  check_emit_coverage.py          the §8.5 fill-cell check
  fetch_gwa_window.py             optional GWA windowed read

public/data/
  uae_parameters.json             EXISTS, the chain A to F parameter set
  ginoux_middle_east_mam.geojson
  era5_weibull_monthly.json       or a small binary, whichever is smaller
  emit_calcite_gulf.json
  targets.geojson                 market locations, §7

src/lib/physics/
  windStats.ts                    Weibull integration of the flux law, §5
  dustTransport.ts                source to receptor attribution, §6

src/lib/
  dustSources.ts                  typed loaders for public/data
  liveFeed.ts                     Open-Meteo client + cache

src/components/simulation/modules/
  SeasonalForecastModule.tsx
  LiveFeedModule.tsx

python_models/
  wind_stats.py                   mirror of windStats.ts
  dust_transport.py               mirror of dustTransport.ts
```

Keep the TypeScript and Python mirrors in step, the way the existing modules do. The code
export toggle in `moduleCode.ts` reads from `python_models/`.

---

## 5. The seasonal statistics problem, and its closed-form solution

This is the single most important correctness point in the project. §5.1 of the data doc
states it. Here is the resolution.

### 5.1 The problem

Saltation flux goes roughly as the cube of friction velocity and only above a threshold.
So the flux of the mean wind is not the mean of the flux. Computing a flux from a monthly
mean wind speed is wrong, and it is wrong in a direction that flatters nobody: it
understates the flux, and it understates it more at gustier sites.

### 5.2 The solution, integrate the flux law over the wind speed distribution

Model the wind speed at a cell as Weibull with scale `A` and shape `k`:

```
f(u) = (k/A)·(u/A)^(k−1)·exp(−(u/A)^k)
```

The Bagnold law already in `aeolian.ts` is

```
q(u*) = C·(ρa/g)·u*³·(1 − u*t²/u*²)   for u* > u*t,  else 0
```

With the linear coupling `u* = r·u` that `aeolian.ts` already uses via
`AEOLIAN_CALIB.uStarRatio`, write the threshold as a freestream speed `ut = u*t / r`.
Then the mean flux is

```
⟨q⟩ = C·(ρa/g)·r³ · ∫_{ut}^{∞} ( u³ − ut²·u )·f(u) du
```

Both moments of a truncated Weibull are upper incomplete gamma functions. Substituting
`t = (u/A)^k` gives `f(u)du = e^{−t}dt`, so

```
∫_{ut}^{∞} u^n f(u) du = A^n · Γ(1 + n/k, x),    x = (ut/A)^k
```

and therefore

```
⟨q⟩ = C·(ρa/g)·r³ · [ A³·Γ(1 + 3/k, x) − ut²·A·Γ(1 + 1/k, x) ]
```

where `Γ(s, x)` is the upper incomplete gamma function. This is **exact**, not an
approximation. No numerical integration and no gustiness fudge factor.

This has been checked. `scripts/verify_weibull_flux.py` evaluates the closed form against
brute-force Simpson integration of the same Bagnold law over the same Weibull, across five
parameter sets including the no-threshold limit. Worst relative error is about 3e-12. Run
it before trusting any change to `windStats.ts`.

Implement with `scipy.special.gammaincc` in Python (note it returns the *regularised*
form, so multiply by `gamma(s)`) and a series or continued-fraction implementation in
TypeScript, since the browser has no gamma function.

### 5.3 Where A and k come from

Global Wind Atlas 4 publishes `weib_A_combined_cog_10m.tif` and
`weib_k_combined_cog_10m.tif` at 250 m, but **annual only, all direction sectors
combined**, and with **no direction layers at all**. Verified, §8.1 of the data doc. It
cannot drive a seasonal module.

So fit A and k yourself, per grid cell per month, from ERA5 hourly 10 m wind. Cache the
result as a static grid. This is cheap, it is done once, and it is the defensible route.

GWA then has an optional second role: a 250 m spatial correction. Compute the ERA5 annual
Weibull `A_era` on the same coarse cell and apply `A_gwa / A_era` as a terrain speedup
factor to each month's `A_m`.

Two honest caveats to state in the UI if you do this:

- It assumes the terrain speedup ratio does not vary with season. Nothing supports or
  refutes that.
- GWA 4 is itself downscaled from ERA5 for 2008 to 2017, so the two are not independent.
  Good for a ratio, useless as validation.

And one judgement call: WAsP downscaling exists to resolve terrain. Over the flat Rub al
Khali the correction will be near 1. Check whether it earns its complexity before building
it. It will matter near the Oman mountains and along the coast.

### 5.4 Why this is worth doing properly

The gap between the two approaches is not small, and it is arithmetic you can show. For a
Rayleigh distribution (`k = 2`) the identity `⟨u³⟩ = A³·Γ(1 + 3/k)` gives `⟨u³⟩ ≈ 1.329·A³`
while the cube of the mean, `(A·Γ(1 + 1/k))³`, is about `0.696·A³`. Flux from the mean wind
would be low by roughly a factor of 1.9 before the threshold is even considered.

Those figures are printed by `scripts/verify_weibull_flux.py`. They are derived arithmetic
from the Weibull identity, not measured values and not a claim about any real site.
Present them as what they are, a demonstration of why the method matters. The real numbers
come out of the fitted `k` at each cell.

---

## 6. The transport problem, still undecided

**This is the decision that blocks the architecture. Settle it before writing
`dustTransport.ts`.** §5.2 of the data doc lists the three options. Restated with what is
now known:

| Option | What it is | Cost | Defensibility |
| --- | --- | --- | --- |
| A. Reuse a published dust model | Read MERRA-2 or CAMS dust fields, which already contain emission, transport and deposition | Low, both are free | Highest. You are reporting a published model, not guessing |
| B. Trajectories | HYSPLIT or FLEXPART backward trajectories to attribute air arriving at a site to upwind sources | Medium, both free, HYSPLIT ships free meteorology | High. This is the textbook method for exactly this question |
| C. Sector weighting | Wind rose sector weights times an explicit distance decay | Lowest | Only acceptable if the decay function is shown as an assumption with a sensitivity slider |

A blended answer is legitimate and probably right: **use A or B for the attribution and C
only as the interactive layer in the UI**, with the honest label that the slider explores
sensitivity rather than measuring anything.

Whatever is chosen, the UI must name the method that produced the number on screen. A
slider must never imply a measurement.

---

## 7. Target markets

All directly usable, all listed in §4 of the data doc. Practical picks:

- **OurAirports**, public domain, and the **Iowa Environmental Mesonet** METAR archive.
  These pair up: airport locations plus an observed record of blowing dust and visibility
  at those same airports. That gives the receptor side something real to validate against
  instead of comparing one model with another.
- **Global solar asset datasets** for the strongest market story, since panel soiling from
  dust is well documented.
- **Natural Earth** or **GeoNames** for the basemap and place labels.

Two licence items still open: GADM restricts commercial use, and OpenStreetMap's ODbL has
share-alike obligations on a derived database. Check both before publishing anything
derived from them.

None of these say anything about willingness to pay. Keep the pricing logic in its own
module, clearly labelled as the team's assumption.

---

## 8. Build order

Each phase should end with something visible. Do not build the whole data layer before
anything renders.

**Phase 1, the source map.** `scripts/prepare_sources.py`, then a map in
`SeasonalForecastModule.tsx` showing the Ginoux polygons coloured by FoO band and
filterable by source type. No modelling yet. This alone is a defensible deliverable and it
proves the data pipeline.

**Phase 2, the wind statistics.** `scripts/fit_era5_weibull.py` and `windStats.ts`
implementing §5.2. The Python side is already validated by
`scripts/verify_weibull_flux.py`. Port the same check to the TypeScript implementation,
since the browser has no gamma function and the series you write for it is the part most
likely to be wrong. Show a monthly flux curve per source cell.

**Phase 3, the product effect.** Wire `solveAeolian` in. The cohesion γ from the wet lab
raises `u*t`, which raises `ut`, which raises `x` in the incomplete gamma, which drops
`⟨q⟩`. The whole product story is one parameter moving through the integral. Show treated
against untreated monthly flux.

**Phase 4, transport.** Only after §6 is decided. This produces the headline "fraction
reaching the site".

**Phase 5, the Live Feed.** `liveFeed.ts` against Open-Meteo. Same UI, same components,
live wind and live CAMS dust in place of the monthly climatology. If phases 1 to 4 built
one engine, this phase is small.

**Phase 6, mineralogy.** EMIT calcite over the hotspots, as the link from the aeolian
module to the wet lab. Run the coverage check first.

---

## 9. Rules that keep this defensible

These are not style preferences. They are what makes the tool survive a judge asking where
a number came from.

1. **Never invent a number.** §5 of the data doc lists every quantity no public dataset
   supplies. If a new one appears, add it to that list rather than filling it in.
2. **Label every derived quantity with its method.** FoO is a frequency of activation, not
   an emitted mass. Optical depth is not deposition. A sector weight is not a measurement.
3. **Show uncertainty where the source ships it.** EMIT has an uncertainty layer per
   mineral. SoilGrids has one. Use them rather than hiding them.
4. **Keep scheme constants with their citations.** The values in `AEOLIAN_CALIB` come from
   specific wind tunnel and field campaigns. Do not mix constants from different schemes.
   `references/marticorena1995.md` is the source for the threshold formulation, but read
   the PDF rather than the OCR text when a constant matters.
5. **The product efficiency number is yours.** It comes from the wet lab measurement of γ,
   propagated through the model. Published wind tunnel work on microbially induced calcite
   and biological soil crusts belongs in the write-up as context, never as your result.
6. **State the Ginoux MAM limitation wherever a season selector appears.** The source map
   does not vary by season in this dataset. If the map looks seasonal, the UI is lying.
7. **Attribution in the UI, not only in a README.** CAMS and Open-Meteo require it. GWA and
   Ginoux deserve it.

---

## 10. Still open

| Item | Blocks | Owner |
| --- | --- | --- |
| Transport backbone, §6 | `dustTransport.ts`, phase 4 | Team decision |
| EMIT coverage over the Gulf, §8.5 of the data doc | Phase 6 | One script, an afternoon |
| Grain size distribution per erg, §5.4 of the data doc | Accuracy of `grainsize` and the aeolian threshold | Literature or the bench |
| Gulf dune sand carbonate content | Cross-check on EMIT calcite | Literature |
| Wind tunnel bracketing for MICP and biocrusts | Context for the efficiency claim | Literature |
| GADM and OpenStreetMap licence check | Publishing anything derived | Before the wiki freeze |
| Whether the GWA 250 m correction earns its complexity, §5.3 | Scope of phase 2 | Try it on one hotspot and compare |
