# Wind pattern tests: next steps

Written 2026-08-22, at the end of the session that shipped the CAMS dust layer
and the information-order pass. Everything below is work not yet started.

Read this with `DUST_EXPOSURE_MODULE_SPEC.md` section 7 open. The recurring
failure mode in this module is not a wrong number, it is a right number
answering a different question than the label claims.

## Where the wind model stands today

| Piece | State | File |
|---|---|---|
| ERA5 Weibull fit, monthly, per grid cell | Built and read | `scripts/fit_era5_weibull.py`, `public/data/era5_wind_climatology.json` |
| 16-sector wind rose and drift direction | Built and read | `src/lib/physics/windStats.ts` |
| Closed-form Weibull-integrated saltation flux | Built, checked against brute force | `scripts/verify_weibull_flux.py` |
| Animated 10 m wind field over the map | Built | `src/lib/windField.ts`, `src/components/exposure/WindFieldCanvas.tsx` |
| Source attribution driven by wind run per sector | Built | `src/lib/physics/attribution.ts` |
| Live feed | Built | `app/api/live-dust/route.ts` |

Two things the wind model has never been tested against: a measured wind record
at a specific UAE site, and a measured sand flux. Every check so far has been
internal consistency or a literature comparison at regional scale.

## The tests worth running, most valuable first

### 1. Hold out a year and see if the fit still predicts it

The Weibull parameters are fitted on ERA5 2022 to 2024 and then used to predict
transport for those same years. That is not a test, it is a description.

Refit on 2022 to 2023 only, predict 2024, and compare the predicted seasonal
flux against the flux computed directly from 2024 hourly winds. Report the
error as a percentage of the predicted value, per season, per site.

What would make this fail honestly: if the held-out error is larger than the
difference between two adjacent seasons, the season buttons are not resolving
anything real and should say so.

### 2. Check the Weibull assumption itself, per cell

A two-parameter Weibull cannot represent a bimodal wind regime, and the Gulf has
one: the summer Shamal against the winter frontal winds. A single fit over a
three-month window may be averaging two distinct populations into a shape that
matches neither.

Run a Kolmogorov-Smirnov test of the fitted Weibull against the empirical hourly
distribution for every cell and month. Map the cells where it fails. If failures
cluster in the transition months, the fix is to fit per month and aggregate the
flux, not to fit the season.

This matters more than it sounds because saltation flux goes as roughly the cube
of shear velocity above threshold, so the tail is doing almost all of the work.
A fit that matches the median and misses the tail will be confidently wrong.

### 3. Compare against a measured station record

ERA5 is a reanalysis at about 31 km. A solar plant sits in one spot inside that
cell, often on modified ground.

Candidate sources, in order of how easy they are to get:

- NCM (UAE National Center of Meteorology) station data. Needs a request; no
  open bulk endpoint found so far.
- METAR from OMAA (Abu Dhabi), OMDB (Dubai), OMAL (Al Ain). Free, hourly, long
  record, but airport-sited and wind is reported to 10 degrees and whole knots.
- Any tower data the wet lab or a partner can obtain.

Report bias and RMSE in speed, and the circular difference in direction. A known
result to expect: reanalysis usually underestimates gusts and overestimates the
calm tail. If our bias goes the other way, something is wrong in the fit rather
than in ERA5.

### 4. Validate the drift direction against a landform

Sand does not need an instrument to record where it has been going. Dune crest
orientation and slipface aspect are a multi-decade integral of the drift
direction, and both are visible in satellite imagery.

Pick five sites in the Liwa and Al Dhafra dune fields, measure the dune crest
bearing from imagery, and compare against the resultant drift direction the
model computes for that cell. Fryberger's convention is that transverse dune
crests sit roughly perpendicular to the resultant drift.

This is the cheapest external check available and it needs no data request.
If the model's RDD is 90 degrees off the crest normal at several sites, the
sector weighting in `windStats.ts` is wrong.

### 5. Sensitivity, so the reader knows which input to distrust

Run the flux chain while sweeping each input across its plausible range and
report the elasticity of the output to each one. Expected ordering, to be
confirmed rather than assumed: threshold shear velocity first, then the Weibull
shape parameter k, then the scale parameter A, then grain size.

The point is to publish the ranking. The exposure page currently says the crust
cohesion is the weakest input; that claim should be backed by a number.

## Things to be careful about

- **Do not fit anything to the validation data.** The source-attribution result
  that Kuwait draws 93 percent from the northern plain in July is credible
  precisely because nothing was tuned to it. Keep that property.
- **A passing test on a regional average is not a passing test at a site.** Most
  of the checks already in the repo are regional. Sections 3 and 4 above are the
  first site-level ones.
- **Report the failures.** `scripts/fetch_cams_dust_climatology.py` refuses to
  write a field that contradicts the literature. Wind tests should follow the
  same pattern: a test that cannot fail is not worth running, and a test that
  failed and was quietly dropped is worse than no test.

## Suggested order of work

1. Section 4, the dune-orientation check. No data request, one afternoon, and it
   either validates the drift direction or invalidates it outright.
2. Section 1, the held-out year. Uses data already downloaded.
3. Section 2, the Weibull goodness of fit. Same data again.
4. Section 5, sensitivity. Pure computation.
5. Section 3, station comparison. Start the NCM request early because it is the
   long pole, and fall back to METAR if it does not come through.

## Files a new session should read first

- `src/lib/physics/windStats.ts` — the rose, the drift, the sector weighting
- `scripts/fit_era5_weibull.py` — how the fit is produced
- `scripts/verify_weibull_flux.py` — the existing internal check, and the
  pattern any new check should follow
- `src/lib/physics/aeolian.ts` — threshold and flux
- `DUST_EXPOSURE_MODULE_SPEC.md` section 7 — the misreadings to avoid
