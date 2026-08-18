# Dust Exposure Toolkit, Phase 1 data compilation

Scope: candidate public data for the two planned modules.

1. **Seasonal Forecast**: multi-month wind climatology, sand hotspots, target markets,
   fraction of sand reaching a site, product effect on that fraction.
2. **Live Feed**: same interface driven by a real-time wind or dust API.

## Verification status, read this first

Most of this document is written from prior knowledge and is **not** confirmed. Treat
each unmarked entry as a lead with a URL to confirm, not as a verified fact. Product
names, versions, grid resolutions, licence terms, and free-tier limits all change, so
confirm before any of it goes on the wiki. Items marked **VERIFY** are ones I am least
sure of.

`DUST_EXPOSURE_KNOWLEDGE_GRAPH.md` carries the reasoning layer: how each source below
connects to a number the model uses, and where those connections are too weak to carry one.

A verification pass ran on 2026-08-18 and resolved five entries: 1.7, 2.2, 2.7, 3.1 and
3.2. Those five were read from primary sources and are logged in full in section 8, which
is the authoritative text where it disagrees with the entry above it. Everything else in
this document is still unchecked.

No numeric values appear in this document by design. Where a number is needed and no
public dataset supplies it, that gap is listed in section 5 instead of being filled in.

---

## 1. Wind velocity and direction

### 1.1 ERA5 global reanalysis (ECMWF, via Copernicus Climate Data Store)

- Datasets: `reanalysis-era5-single-levels` (hourly) and
  `reanalysis-era5-single-levels-monthly-means`.
- Variables of interest: `10m_u_component_of_wind`, `10m_v_component_of_wind`,
  `10m_wind_gust_since_previous_post_processing`, `friction_velocity` (VERIFY that
  friction velocity is exposed on the single-levels stream and not only in ERA5-Land
  or the forecast stream).
- Access: free account on the Climate Data Store, then the `cdsapi` Python client.
  Licence is the Copernicus product licence, which permits reuse with attribution.
- **Directly usable** for: monthly and seasonal mean wind direction, wind roses,
  seasonal cycle of wind speed, spatial maps.
- **Requires an assumption** for: anything involving sand flux. Saltation flux goes as
  roughly the cube of friction velocity, so a flux computed from a monthly mean wind is
  not the monthly mean flux. Either compute flux at hourly resolution and average
  afterwards, or integrate the flux over a fitted wind speed distribution. This is the
  single most important correctness point in the whole tool, see section 5.1.
- Also note: averaging the u and v components gives the vector mean wind, whose
  magnitude is smaller than the mean scalar wind speed whenever direction varies. Pick
  one deliberately and say which in the UI.

### 1.2 ERA5-Land

- Higher resolution land-only version of ERA5, same CDS access route.
- Useful if the 10 m wind over a specific dune field looks too smoothed in ERA5.
- VERIFY which wind variables ERA5-Land carries, it is not a full copy of ERA5.

### 1.3 ERA5 ensemble members

- ERA5 ships an ensemble of data assimilations alongside the deterministic product, at
  coarser resolution and lower output frequency, plus an ensemble spread field.
- Relevant because the brief says "ensemble wind data". If the intent is uncertainty
  bars on the seasonal forecast, this is the honest source of them.
- VERIFY member count, resolution, and CDS dataset name before relying on it.

### 1.4 ECMWF Open Data real-time forecasts

- Open licensed real-time forecast output from ECMWF, including the ensemble, served
  without an API key. Python client `ecmwf-opendata`.
- Best candidate for a genuinely free ensemble driver for the Live Feed module.
- VERIFY current licence, retention window (recent runs only), variable list, and grid
  spacing.

### 1.5 NOAA GFS

- Global forecast model, wind at 10 m, free. Two access routes: NOMADS (GRIB or
  OPeNDAP subsetting) and the NOAA Open Data Dissemination buckets on AWS
  (`noaa-gfs-bdp-pds`), which need no key.
- Also GEFS for the ensemble version.
- **Directly usable** for live and short-range forecast wind.

### 1.6 MERRA-2 (NASA GMAO)

- Reanalysis with hourly surface fields and, importantly, an interactive aerosol
  component. Carries dust surface mass concentration, dust column mass, dust extinction
  optical depth, and dust emission and deposition fluxes as native output.
- Access: NASA GES DISC with a free Earthdata Login. OPeNDAP available.
- Strategically important: MERRA-2 already contains a dust emission, transport, and
  deposition model. Using it as the transport backbone is far more defensible to judges
  than a hand-rolled dispersion estimate, and it lets the toolkit focus on the part that
  is genuinely yours, the change in threshold friction velocity from the crust.
- VERIFY exact collection names for the aerosol diagnostics.

### 1.7 Global Wind Atlas (DTU Wind Energy and the World Bank)

- Downscaled wind climatology at several heights, distributed as GeoTIFF, including
  fitted Weibull scale and shape parameters.
- **Directly usable** and unusually valuable here: the Weibull parameters let you
  integrate a cubic flux law over the wind speed distribution analytically instead of
  guessing a gustiness factor. That turns section 5.1 from an assumption into a method.
- **Verified 2026-08-18, see section 8.1 for the full manifest and the consequences.**
  Global Wind Atlas 4, DOI `10.11583/DTU.28955267.v1`, CC BY 4.0, about 250 m, cloud
  optimised GeoTIFF. Weibull layers are `weib_A_combined_cog_{h}.tif` and
  `weib_k_combined_cog_{h}.tif` at 10, 50, 100, 150 and 200 m.
- **Annual only. There are no monthly layers, and no wind direction layers either.**
  "Combined" means all direction sectors combined. GWA cannot drive the seasonal module.
- Section 5.1 option 2 still survives. GWA supplies the spatial dimension and ERA5
  supplies the monthly one. Section 8.1 sets out the split and the assumption it costs.

### 1.8 Station observations, NOAA Integrated Surface Database

- Hourly and sub-hourly surface observations from airports and synoptic stations
  worldwide, including wind speed, wind direction, visibility, and present weather
  codes. Free.
- Two uses. First, validating reanalysis wind roses at the actual target sites, which is
  the kind of check judges reward. Second, the present weather codes and visibility are
  a real observed proxy for blowing dust and dust storms at a receptor, see section 3.7.
- **Directly usable**, with the normal caveats about station gaps, anemometer height,
  and calm reporting thresholds.

### Other reanalyses worth naming for completeness

NCEP/NCAR, NCEP CFSR and CFSv2, JRA-55 and its successor, and MERRA-2 above. Listing
more than one and stating why you chose yours is cheap and looks rigorous.

---

## 2. Dust source regions, area, and composition

### 2.1 Prospero et al. 2002, Review of Geophysics

- "Environmental characterization of global sources of atmospheric soil dust identified
  with the NIMBUS 7 TOMS absorbing aerosol product."
- The classic source identification paper. Defines the major global source regions,
  including the Arabian Peninsula ones relevant to a UAE deployment.
- Use for: naming and justifying your hotspot list.
- Access: possibly paywalled, see section 6.

### 2.2 Ginoux et al. 2012, Review of Geophysics

- "Global-scale attribution of anthropogenic and natural dust sources and their emission
  rates based on MODIS Deep Blue aerosol products."
- Provides gridded dust source frequency at fine resolution and splits natural from
  anthropogenic sources.
- Use for: a defensible, citable hotspot mask rather than hand-drawn polygons.
- **Requires an assumption** if you convert source frequency into an emission weight.
  Frequency of activation is not emitted mass.
- **Resolved 2026-08-18. The gridded data is public and is now in the repository at
  `references/rog1742-sup-0002-sfts01/`**, as eight regional KML files of FoO contour polygons. See
  section 8.4 for what the polygons mean, the Gulf coverage counts, and the one real
  catch, which is that the Middle East file covers MAM only.

### 2.3 Schepanski et al., dust source activation frequency from MSG SEVIRI

- Geostationary infrared dust product used to log where and when dust plumes first
  appear, at high temporal resolution, over North Africa and the Arabian Peninsula.
- Very well matched to a seasonal module, because activation frequency has a strong
  seasonal cycle you could show directly.
- VERIFY whether the derived dataset is publicly downloadable or only published as
  figures. If only figures, it is a citation, not a data source.

### 2.4 Geomorphic source classification

- Bullard et al. 2011 proposed a preferential dust source scheme based on land surface
  units, for example ephemeral lakes, alluvial deposits, sand seas, and stony surfaces.
- Baddock and colleagues published dust source mapping work in the same vein.
- Use for: explaining *why* a hotspot is a hotspot, which is the "where it originates"
  half of your brief.
- Access: mixed, some journals paywalled.

### 2.5 Satellite aerosol products for validating the hotspot map

- MODIS Deep Blue aerosol optical depth (Terra and Aqua), designed to work over bright
  desert surfaces, which normal Dark Target retrievals cannot do.
- VIIRS Deep Blue as the continuation.
- MISR for aerosol type and plume height, CALIPSO for the vertical distribution, which
  matters because dust that travels far is dust that got lofted high.
- All free through NASA archives with an Earthdata Login.
- **Requires an assumption** to go from optical depth to a surface dust concentration or
  a deposited mass. That conversion needs a mass extinction efficiency and a vertical
  profile assumption. Do not present optical depth as deposition.

### 2.6 Soil texture, the closest public thing to "sand composition"

- **SoilGrids** (ISRIC), global gridded predictions of sand, silt, and clay fractions
  by depth interval, with uncertainty layers, free under a Creative Commons licence.
- **FAO Harmonized World Soil Database**, updated in recent years, mapping unit based
  rather than a fine grid.
- **Directly usable** for a per-hotspot sand fraction, with an honest caveat: SoilGrids
  values are machine learning predictions, not measurements, and desert coverage in the
  training data is sparse. Show the uncertainty layer, do not hide it.
- **Not available anywhere public, as far as I know**: a global map of aeolian grain
  size distribution per dune field. Your grain size module needs that distribution and
  it will have to come from published local sampling or your own measurements. See 5.4.

### 2.7 Surface mineralogy, EMIT (NASA)

- Imaging spectrometer on the ISS, purpose built to map the surface mineralogy of the
  world's arid dust source regions. Produces mineral identification and abundance
  products including carbonates, clays, iron oxides, and sulfates.
- Free through the NASA LP DAAC with an Earthdata Login.
- Directly relevant to your project specifically, not just generically: your calcium
  carbonate prong cares about the carbonate content of the substrate, and Gulf dune
  sands are carbonate rich. A mineralogy layer ties the aeolian module to the wet lab
  in a way judges will notice.
- **Verified 2026-08-18, see section 8.5.** Ten minerals are delivered, each with an
  uncertainty layer: Calcite, Chlorite, Dolomite, Goethite, Gypsum, Hematite,
  Illite+Muscovite, Kaolinite, Montmorillonite, Vermiculite. Calcite is in the list, so
  the carbonate link to your wet lab is real and measured.
- Use **EMIT L3 ASA** (`EMITL3ASA.001`), a single global 0.5 degree NetCDF with abundance
  in percent, not the per-scene 60 m L2B product. Coverage gaps over the Gulf are the one
  thing still to check, and section 8.5 gives the exact recipe.

### 2.8 Earlier mineralogical compilations

- Claquin et al. and the later Nickovic et al. soil mineralogy databases for dust
  models, built by mapping soil types to mineral fractions.
- **Requires a large assumption**: these are derived from soil taxonomy lookup tables,
  not direct measurement. Say so if you use them.

### 2.9 Land cover, as a bare-ground proxy

- ESA CCI Land Cover, Copernicus Global Land Service land cover, MODIS MCD12Q1.
- Use for: masking out vegetated areas that will not emit.
- **Requires an assumption**: bare ground is not the same as an active dust source.
  Surface crusting, soil moisture, and the supply of loose fine material all matter.

### 2.10 Hotspot area

- There is no single authoritative free polygon layer of the world's sand seas and dune
  fields that I can point you to with confidence. Areas quoted for named ergs in the
  literature vary with the definition used.
- Practical route: derive polygons yourself by thresholding a source dataset (2.2 or
  2.5) or a land cover plus soil texture combination, then report the derived area and
  state the threshold. A derived number with a stated rule is defensible. A number
  copied from an encyclopaedia is not.

---

## 3. Live wind and dust APIs

### 3.1 Windy

- Windy publishes several distinct products. The embeddable map forecast API, a point
  forecast API, and a webcams API. They are licensed and rate limited differently, and
  the free tiers historically restrict commercial use and require the Windy logo.
- Since your module is framed around dynamic pricing, meaning commercial use, **read
  the terms before building on it**. This is the item most likely to cause a licensing
  problem later.
- **Verified 2026-08-18, and the answer is no. Drop Windy entirely, see section 8.3.**
  The Trial Version is development-only and may not be integrated into a shipped
  application at all, so it cannot even power the wiki demo. More decisively, Article 9
  of the terms forbids creating weather works or databases derived from the data on
  every tier, paid included, and this toolkit is exactly that. Windy is removed from the
  architecture rather than kept as an option.

### 3.2 Open-Meteo

- Free non-commercial weather API, no key required for the basic endpoints, with a
  forecast endpoint, a historical archive endpoint backed by reanalysis, and a separate
  air quality endpoint.
- The air quality endpoint is the interesting one: it serves the Copernicus atmosphere
  service fields, and I believe that includes a dust variable and particulate matter,
  which is much closer to what you actually want than raw wind speed.
- Strong candidate for the default Live Feed backend precisely because it needs no key,
  which keeps the wiki demo working for judges without your credentials.
- A `dust` variable is listed in the Air
  Quality API parameter set alongside `pm10` and `pm2_5`. The returned **data** is
  offered under CC BY 4.0, which carries no non-commercial clause. The **API service**
  is a separate matter: free use is non-commercial only with attribution, and commercial
  use requires a paid subscription tier.
- That split matters for you. It means the licensing risk is about how you call the
  service, not about what you may do with numbers you have already retrieved.
- **Verified 2026-08-18, see section 8.2.** The variable is `dust`, in μg/m³, and it is
  global. A live call over Abu Dhabi returned a full series, so the Gulf is covered. The
  global domain is CAMS global at 0.4 degrees, 3-hourly. Pass `domains=cams_global`
  explicitly rather than relying on `auto`. Free tier is 10,000 calls per day.
- Confirmed as the Live Feed default.

### 3.3 Copernicus Atmosphere Monitoring Service, CAMS

- Global near-real-time forecasts of aerosols including dust optical depth and dust mass
  mixing ratios in size bins, plus the EAC4 reanalysis for the historical side.
- Free with registration, accessed through the Copernicus data store API.
- This is the authoritative version of what Open-Meteo repackages. Consider Open-Meteo
  for the demo and CAMS direct for the defensible analysis.

### 3.4 OpenWeatherMap

- Free tier with a key, wind speed, direction and gust, plus a separate air pollution
  endpoint carrying particulate matter.
- Widely used, simple, and its particulate matter field is a usable dust proxy in
  arid regions where the main coarse aerosol is mineral dust.
- **Requires an assumption**: particulate matter is not all dust.

### 3.5 NASA GEOS forecast products

- The GEOS forecast system produces global aerosol forecasts including dust. Free.
- VERIFY the current public access route and latency.

### 3.6 US National Weather Service API

- Free and key-less, but United States only. **Not usable for a Gulf deployment.**
  Listed so nobody wastes time on it.

### 3.7 Iowa Environmental Mesonet, METAR and ASOS archive

- Free, no key, bulk downloadable surface observations including wind, visibility, and
  the coded present weather, which distinguishes blowing dust, dust storms, and haze.
- Genuinely valuable for you: it is an *observed* record of dust reaching a specific
  airport, which is the receptor side of your model. It gives you something to validate
  against rather than a model you can only compare with another model.
- VERIFY station coverage in the Gulf, since coding practice varies by country.

### 3.8 National meteorological services

- The UAE National Center of Meteorology publishes observations and forecasts. Whether
  there is a documented public API with usable terms, I do not know.
- VERIFY, and consider simply writing to ask. A named local data agreement is a strong
  thing to put in front of judges.

---

## 4. Target market locations

- **Natural Earth**: populated places and administrative boundaries, public domain, low
  resolution, ideal as a basemap layer.
- **GeoNames**: global place names with coordinates and population, Creative Commons
  attribution licence.
- **GADM**: administrative boundaries, high quality, but the licence restricts
  commercial use. Check it before shipping, given the pricing framing.
- **OpenStreetMap**, queried through Overpass: the best source for the actual assets
  that suffer from dust. Solar plants, roads, railways, airports, and quarries all carry
  standard tags. Licensed under the Open Database Licence, which requires attribution
  and has share-alike obligations on derived databases. Read that before publishing a
  derived dataset.
- **OurAirports**: airport locations, public domain.
- **Global Energy Monitor solar tracker** and the published global solar asset dataset
  derived from satellite imagery: candidate solar farm locations, which is probably your
  strongest market story, since panel soiling from dust is a well documented and
  quantified loss.
- **WorldPop** and the **Global Human Settlement Layer**: gridded population, free, for
  weighting markets by exposed population.
- All of the above are **directly usable** as locations. None of them tell you anything
  about willingness to pay, so keep the pricing logic separate and clearly labelled as
  your own assumption.

---

## 5. Numbers that no public dataset will give you

This section exists so nothing gets quietly invented later. Each item needs a decision
from the team.

### 5.1 Sand flux from a monthly mean wind

Not obtainable. Flux depends on roughly the cube of the friction velocity above a
threshold, so the mean of the flux is not the flux of the mean, and the gap grows with
how gusty the site is. Three honest options, in decreasing order of rigour:

1. Compute flux at hourly resolution from ERA5, then average to the season. Heaviest,
   most defensible.
2. Integrate the flux law over a fitted Weibull wind speed distribution, using the
   Global Wind Atlas parameters or parameters fitted from ERA5. Cheap and defensible.
3. Apply a single correction factor to the mean wind. Only acceptable if the factor is
   derived and shown, never asserted.

### 5.2 Fraction of sand from source X that reaches site Y

Not obtainable from any lookup table. It is a transport and deposition result. Options:

1. Use MERRA-2 or CAMS dust fields, which already contain transport and deposition.
   You then are reporting a published model's output, not your own guess.
2. Run backward trajectories with HYSPLIT (free, NOAA, with free meteorological input
   files) or a Lagrangian dispersion model such as FLEXPART, to attribute the air
   arriving at a site to upwind sources. This is the textbook method for the exact
   question you are asking, and it is free.
3. A simplified sector weighting from the wind rose plus an explicit distance decay.
   Acceptable only if the decay function is stated as an assumption in the UI, with a
   sensitivity slider.

Whichever you pick, the UI should say which one is running. Do not let a slider imply
measurement.

### 5.3 Efficiency of your product at reducing dust reaching a site

Not obtainable from public data, and it should not be. It is your result. The chain is:
your wet lab measures the increase in threshold friction velocity for treated versus
untreated sand, that feeds the aeolian module already in the repository, and the flux
reduction propagates through whichever transport choice you made in 5.2. Published wind
tunnel studies on microbially induced calcite and on biological soil crusts can bracket
the expected range and belong in the write-up as context, but the headline number has to
be yours and labelled as either measured or to calibrate, exactly as the wet lab and dry
lab document already does.

### 5.4 Grain size distribution per source region

Not available globally. SoilGrids gives sand, silt, and clay fractions, not a size
distribution within the sand fraction. Your grain size module needs the distribution.
Either cite published sampling for the specific ergs you model, or measure, or state the
assumed distribution prominently.

### 5.5 Emission scheme constants

The empirical constants in the threshold and flux relations, for example the values
already sitting in `python_models/aeolian.py`, are scheme specific and come from
particular wind tunnel and field campaigns. They are literature values, not universal
constants. Keep the citation next to each one and do not mix constants from different
schemes.

---

## 6. Papers, what we now hold and what is still missing

Updated 2026-08-18. Four papers have been retrieved and are in `references/`, as both the
original PDF where available and a text extraction for searching.

**Held:**

| Paper | In repo | Use |
| --- | --- | --- |
| Prospero et al. 2002, *Rev. Geophys.*, TOMS dust source identification | `references/prospero2002.md`, PDF | Naming and justifying the hotspot list |
| Ginoux et al. 2012, *Rev. Geophys.*, dust source attribution | `references/ginoux2012.md`, PDF, **plus the gridded supplement in `references/rog1742-sup-0002-sfts01/`** | The hotspot mask itself, see 8.4 |
| Bullard et al. 2011, *JGR Earth Surface*, preferential dust source classification | `references/bullard2011.md` | Explaining why a hotspot is a hotspot |
| Marticorena and Bergametti 1995, *JGR*, soil-derived dust emission scheme | `references/marticorena1995.md` | The threshold and flux formulation, and the constants in 5.5 |

The extractions are OCR of two-column PDFs, so the text is broken in places, particularly
in equations and tables. Read the PDF when a number or an equation matters. Never lift a
constant out of the OCR text without checking it against the PDF.

Also retrieved on 2026-08-18, all open access, all fetched directly:

| Paper | In repo | Why it matters |
| --- | --- | --- |
| Hennen 2017, PhD thesis, University of Reading, "Identifying mineral dust emission sources in the Middle East using remote sensing techniques" | `references/hennen2017_middle_east_dust_sources_thesis.pdf` | **The single most relevant document found.** See below. |
| Schepanski, Tegen et al. 2014, *Atmos. Chem. Phys.* 14, 8983, on depressions and mobile cyclones as dust emitters | `references/schepanski2014_acp_cyclones_dust.pdf` | The synoptic driver side of dust emission |
| Schepanski et al. 2017, *Atmos. Chem. Phys.* 17, 10223, Harmattan and Saharan heat low modulation of dust sources | `references/schepanski2017_acp_harmattan_dust.pdf` | Worked example of seasonal source modulation |

### Why the Hennen thesis changes the model

It is a Middle East dust emission inventory of more than 27,000 individual emission events
for 2006 to 2013, built by visual inspection of the SEVIRI dust RGB product at 4 to 5 km
and 15 minute resolution. Three of its stated results bear directly on the toolkit.

1. **It records emission events, not optical depth maxima.** The thesis makes exactly the
   criticism that applies to using Ginoux FoO as an emission proxy, that daily AOD maxima
   do not necessarily coincide with the place the dust left the ground. This is the
   published version of the caveat already in entry 2.2, and it should be cited there.
2. **It reports strong seasonality in activation.** That is the gap the Ginoux MAM-only
   file leaves, see 8.4. This is the most promising route to a genuinely seasonal source
   layer for the Gulf.
3. **It reports the Tigris and Euphrates flood plain as the most active dust region,
   producing 37% of all recorded events, and very few emission observations over the
   southern Arabian Peninsula.**

Point 3 deserves attention before any architecture is fixed. It is at odds with an
intuitive design that treats the Rub al Khali as the dominant source for a UAE receptor.
If the dominant regional source is a flood plain roughly a thousand kilometres to the
northwest, then the transport step is not a local dune-field problem, it is a long-range
Shamal transport problem, and the wind direction data that GWA does not carry becomes the
central input rather than a nicety. Read the thesis chapters on seasonality and on the
Tigris-Euphrates sources before choosing the transport backbone in section 7.

These are the thesis's own reported results for 2006 to 2013, not a value derived here.
Verify against the thesis body before any of them reaches the wiki.

**Still to retrieve:**

Two are open access but their hosts refused automated download. Both are a browser click
and both are high value, because Kerstin Schepanski co-authors them and they are the
modern continuation of the SEVIRI activation frequency work.

1. **Chappell, Webb, Hennen, Schepanski, Ciais, Balkanski (2023), "Satellites reveal
   Earth's seasonally shifting dust emission sources", *Sci. Total Environ.*,
   doi `10.1016/j.scitotenv.2023.163452`.** Free copies at
   `https://orca.cardiff.ac.uk/id/eprint/159029/4/1-s2.0-S0048969723020715-main.pdf` and
   `https://hal.science/hal-04087300/document`. The title is the exact gap this project
   has. Get this one first.
2. **Chappell, Hennen, Schepanski, Dhital, Tong (2024), "Reducing resolution dependency of
   dust emission modeling using albedo-based wind friction", *Geophys. Res. Lett.*,
   doi `10.1029/2023GL106540`.** Free at
   `https://orca.cardiff.ac.uk/id/eprint/166809/1/2023GL106540.pdf`. Relevant because
   resolution dependency is exactly the ERA5 versus GWA tension in 8.1.

Genuinely paywalled, needing library access:

3. **Gulf or Arabian dune sand characterisation**, for grain size distribution and
   carbonate content. Closest identified candidate is a sedimentological, mineralogical
   and geochemical characterisation of Saudi Arabian sand dunes, *Arab. J. Geosci.*,
   doi `10.1007/s12517-015-1970-9`. Still the largest gap, see 5.4.
4. **Wind tunnel erosion resistance for microbially induced calcite**, for bracketing 5.3.
   Identified candidates, most relevant first:
   - `10.1016/j.jrmge.2021.12.008`, mitigating wind erosion of **calcareous desert sand**
     by MICP spray. Diamond open access, and calcareous desert sand is the Gulf case.
   - `10.1016/j.aeolia.2019.06.001`, biocementation of a crustal sand layer for wind
     erosion control, *Aeolian Research*. Paywalled.
   - `10.1002/ldr.3176`, MICP increasing wind erosion resistance of aeolian sandy soil.
     Paywalled.
   - `10.3390/su14031770`, cementation solution optimisation for wind erosion. Gold open
     access, MDPI refused automated download.
5. **Wind tunnel work on biological soil crusts**, for the other half of the 5.3 bracket.
   Candidates: `10.1006/jare.1998.0388` on biocrust vulnerability to wind erosion, and
   `10.1016/j.geoderma.2005.06.008` on microbiotic crust microstructure and wind erosion.
   Both paywalled.
6. **Baddock et al. dust source mapping.** No usable hits from an automated search on that
   phrasing. Deprioritise it, since Bullard 2011 is already held and covers the geomorphic
   classification, and the Hennen thesis covers the Middle East mapping.

Items 1 and 3 matter most. Item 1 is a free download that may resolve the seasonality gap.
Item 3 is the one place where the project has no public data at all and the numbers must
come from published sampling or from your own bench.

## 7. Decisions, updated after the verification pass

Three of the four open questions are now closed by section 8.

1. **Live Feed backend: settled.** Open-Meteo Air Quality with `domains=cams_global`, no
   key, `dust` in μg/m³. Windy is out, on its own terms, see 8.3. CAMS direct stays as the
   route for the historical and defensible analysis.
2. **Hotspot source: settled.** Ginoux 2012 FoO polygons, already in the repository. The
   MAM-only limitation for the Middle East is the thing to design around, see 8.4.
3. **Seasonal wind statistics: settled in shape.** Monthly Weibull fitted from ERA5 hourly,
   with GWA 4 used only as a 250 m spatial correction, see 8.1. What is still open is
   whether the GWA correction earns its complexity over flat sand seas.
4. **Transport backbone: still open, and still the decision that drives the architecture.**
   Reuse a published dust model (MERRA-2 or CAMS), run trajectories (HYSPLIT or FLEXPART),
   or a stated simplified scheme. Settle this before any modelling code is written.
5. **Licence audit: narrowed.** Windy is resolved by dropping it. GWA 4 is CC BY 4.0 with
   no commercial restriction. Open-Meteo data is CC BY 4.0 but the free service tier is
   non-commercial, see 8.2. Still to check: GADM non-commercial and the OpenStreetMap
   share-alike obligation.

---

## 8. Verification log, 2026-08-18

Five entries were queued for checking. All five are now resolved. Sources were read from
primary pages, from the figshare API behind the DTU record, and from one live API call.
Where something is still open it says so.

### 8.1 Global Wind Atlas, monthly Weibull parameters (entry 1.7)

**Answer: annual only. There are no monthly layers.** The bulk release cannot drive the
seasonal module.

The full file manifest of Global Wind Atlas 4, read from the figshare API record behind
`data.dtu.dk/articles/dataset/Global_Wind_Atlas_4/28955267`, is 31 GeoTIFFs and every one
of them is an annual climatology. The Weibull layers are `weib_A_combined_cog_{h}.tif` and
`weib_k_combined_cog_{h}.tif` at heights 10, 50, 100, 150 and 200 m. Also present are
`wind_speed`, `power_density`, `air_density`, `site_elev`, `rix`, and four capacity factor
layers.

- DOI `10.11583/DTU.28955267.v1`, cite as Floors, R. et al. (2025), Global Wind Atlas v4.
- Licence is **CC BY 4.0**. No commercial restriction. Attribution required.
- Published 2025-07-09. Resolution 0.0025 degrees, about 250 m, WGS84, cloud optimised
  GeoTIFF with overview pyramids.
- Provenance, which matters: ERA5 for 2008 to 2017 dynamically downscaled to 3 km with
  WRF, generalised with the DTU methodology, then downscaled to 250 m with WAsP. So GWA is
  a ten year annual climatology **derived from ERA5**, not an independent observation.

Two details that settle the earlier guess. "Combined" means all direction sectors
combined, so the split dimension really is direction and not month. And the dataset
description carries its own warning, that the combined parameters should be used with
caution where wind arrives from multiple directions, because the per-sector distributions
can look quite different from the combined one. A dust source problem is exactly that
case, so take the warning seriously.

**What this means for section 5.1.** Option 2 survives, but GWA supplies the space
dimension, not the time dimension. The workable design is a split:

- ERA5 hourly gives the time dimension. Fit Weibull `(A_m, k_m)` per grid cell per month
  from the 10 m wind. Cache as a static grid, computed once.
- GWA gives the space dimension. Compute the ERA5 annual Weibull `A_era` on the same
  coarse cell, then apply the ratio `A_gwa / A_era` as a terrain speedup correction to
  each month's `A_m`.
- The assumption you are buying, and must state: the terrain speedup ratio does not vary
  with season. Nothing in the data supports or refutes that, so label it.
- Because GWA is itself built from ERA5 2008 to 2017, the two are not independent. That is
  a virtue for a ratio correction and a limitation for validation. Do not present GWA as
  independent confirmation of ERA5.

Three practical points before anyone writes a download script:

1. Use the 10 m layers. `weib_A_combined_cog_10m.tif` exists, so there is no need to
   extrapolate a 100 m hub height wind down to the saltation layer.
2. The files are enormous. `weib_A_combined_cog_10m.tif` is about 15 GB and
   `weib_k_combined_cog_10m.tif` about 14 GB. Do not download them. They are cloud
   optimised GeoTIFFs, so read a windowed subset over the Gulf by HTTP range request,
   with `rasterio` windowed reads or `gdal_translate -projwin` against the URL.
3. **GWA carries no wind direction in this release.** There are no per-sector files in the
   manifest. Every wind rose and every source attribution direction has to come from
   ERA5. Plan for that.

One caveat on value. WAsP downscaling exists to resolve terrain speedup. Over a flat sand
sea like the Rub al Khali the correction will be close to 1 and GWA will add little. It
will matter near escarpments, along the coast, and in the mountains of Oman. Consider
whether the 250 m layer earns its complexity for your specific hotspots.

### 8.2 Open-Meteo dust variable and commercial terms (entry 3.2)

**Answer: the variable is `dust`, it is global, and it covers the Gulf. Confirmed by a
live call.**

From the Air Quality API documentation:

- Variable name is `dust`, units μg/m³, instantaneous, described as dust particles close
  to surface level at 10 m above ground. Note the docs word it as "Saharan dust", which is
  loose. The underlying field is the CAMS global dust field, not a Sahara-only product.
- The global domain is **CAMS Global Atmospheric Composition Forecasts**, 0.4 degrees,
  about 45 km, 3-hourly, August 2022 onwards, updated every 12 hours with 5 day forecast.
  The European domain is separate, 0.1 degrees, and the docs state the two domains are not
  coupled and may disagree.
- The `domains` parameter takes `auto`, `cams_europe` or `cams_global`. **Set it to
  `cams_global` explicitly** for the Gulf rather than relying on `auto`.
- `dust` carries no Europe-only asterisk. The Europe-only variables are ammonia and the
  six pollen species.
- `past_days` accepts up to 92 and `forecast_days` up to 7. Also `aerosol_optical_depth`
  and `pm10` are available, which give you two independent cross-checks on the dust field.

A live call to `air-quality-api.open-meteo.com/v1/air-quality` for Abu Dhabi at 24.45 N,
54.38 E returned a full 24 hour `dust` series in μg/m³ alongside `pm10`. The Gulf is
covered. This is settled.

Licence and limits, from the terms page:

- Free tier: **non-commercial only**, under 10,000 calls per day, 5,000 per hour, 600 per
  minute, and 300,000 per month. Data under CC BY 4.0.
- Open-Meteo defines non-commercial by the Creative Commons meaning and gives examples.
  Explicitly listed as qualifying: non-profit sites and apps with no subscriptions or
  advertising, public research at public institutions, and educational content. Explicitly
  listed as commercial: sites or apps with subscriptions or advertising, and integration
  into commercial products.
- Commercial tiers require an API key and the `customer-` server prefix.
- Attribution must credit both the CAMS ENSEMBLE data providers and Open-Meteo.

**Read on your case.** An iGEM wiki demo that charges nobody and shows nothing to buy sits
inside the "educational content" and "public research at public institutions" examples. A
dynamic pricing tool that a customer pays for does not. The honest split is to ship the
judge-facing demo on the free tier with attribution, and treat any real commercial
deployment as a separate licensing decision. There is also a third route worth knowing:
Open-Meteo is open source and offers a self-hosted option, which removes the service terms
from the question entirely, since the data itself is CC BY 4.0 with no NC clause.

### 8.3 Windy free tier (entry 3.1)

**Answer: unusable, and not only on the free tier. Drop Windy.**

Read from the Specific Terms of Use of the Windy Map and Point Forecast API Services, in
force 5 May 2020 and last updated 1 September 2023. Four clauses decide it.

1. **The Trial Version cannot be shipped at all.** The terms define it as "the
   subscription-free version of the Services intended for development purpose only", and
   Article 3 states the user "is not allowed to use it for production, i.e. to integrate
   it into the User Application". That rules out the judge-facing wiki demo, not just the
   commercial use. Trial is capped at 500 sessions per day, Professional at 10,000.
2. **Deriving anything from the data is prohibited on every tier.** Article 9 forbids the
   user to "store, extract, modify, distribute, use the weather data or other content of
   the Services, create any weather works or databases derived therefrom". A dust exposure
   model is a derived weather work built on a derived database. This is the clause that
   kills the project use case even with a paid subscription.
3. **The ECMWF models are fenced off further.** Restricted Models are limited to Private
   Applications and may not be used to generate Value Added Services, which the terms
   define as meteorological services derived from the Services and conceived for specific
   user needs. That is a definition of this toolkit.
4. Attribution, if it ever came up, requires the Windy logo present, unscaled, clickable
   and at 100% opacity, plus a data source statement.

There is no configuration of Windy that supports this project. Remove it from the
architecture rather than leaving it as an optional backend, because leaving it in invites
someone to switch it on later.

### 8.4 Ginoux et al. 2012 gridded source data (entry 2.2)

**Answer: downloadable, and now sitting in the repository at
`references/rog1742-sup-0002-sfts01/`.** This is the strongest single find of the pass.

The auxiliary material for 2012RG000388 is eight KML files, one per continental region,
corresponding to Figures 7 to 14 of the paper, created by Paul Ginoux at NOAA GFDL.

What each polygon means, from the supplement readme:

- The quantity is **frequency of occurrence (FoO)**, the percentage of days per season on
  which MODIS Deep Blue dust optical depth at 550 nm exceeds 0.2.
- It is computed on a 0.1 by 0.1 degree grid, restricted to cells whose Deep Blue surface
  reflectivity at 550 nm exceeds 0.15. That reflectivity mask is a bright-surface filter,
  so the product is blind to dust sources on dark surfaces by construction.
- Each polygon is tagged with an origin: `hydro_dust` if the ephemeral water body fraction
  exceeds 10%, otherwise `anthro_dust` if the land use fraction exceeds 30% and
  `natural_dust` if it is below 30%.
- Polygons are grouped into nested FoO contour bands. The style and folder names encode
  the threshold, so `natural_dust_20` is the set of polygons where natural-origin dust
  exceeds the 0.2 optical depth threshold on more than 20% of days in the season.

Coverage of your region, measured from `Middle_East_MAM.kml` directly:

- Bounding box 35 to 60 E, 0 to 49 N. 4,406 placemarks, 4,084 polygons, 57,530 vertices.
- Bands present are 10, 20, 40 and 60 for all three origin types.
- Counting polygons by centroid: 3,007 over the Arabian Peninsula box, 401 over the Rub al
  Khali box, 457 over the Tigris and Euphrates box, and 124 over the UAE and northern Oman
  box. Coverage is dense where you need it.

**The constraint you must design around: the Middle East file is MAM only.** Ginoux
published one season per region, chosen as that region's dust season, and only North
Africa got an annual file. So this dataset gives you spring for the Gulf and nothing else.
It cannot by itself populate a four-season selector. Either restrict the Ginoux layer to
the MAM view and say so in the UI, or use it as a fixed source mask and let the seasonal
variation come entirely from the wind side, which is the more honest option.

Two further honest notes for the write-up. FoO is a frequency of activation, not an
emitted mass, so any conversion to an emission weight is your assumption and must be
labelled, as entry 2.2 already said. And the `anthro` and `hydro` tags are threshold rules
on land use and water body fraction, not observations of causation.

Practical: these are KML with nested contour rings. Convert to GeoJSON, keep the folder
name as a `foo_threshold` and `source_type` attribute pair, and simplify the geometry for
the web map. 18 MB of KML is far too much to ship to a browser unsimplified.

### 8.5 EMIT mineral list and coverage (entry 2.7)

**Answer: ten minerals delivered, calcite and dolomite among them, and there is a gridded
global product that is far easier to use than the per-scene one.**

Two products matter, not one.

**EMIT L2B MIN**, `EMITL2BMIN.001`, DOI `10.5067/EMIT/EMITL2BMIN.001`, Green (2023). Per
scene NetCDF at 60 m, named
`EMIT_L2B_MIN_001_{YYYYMMDDTHHMMSS}_{orbit}_{scene}.nc`. Variables include
`group_1_mineral_id` and `group_2_mineral_id` as int16 over 0 to 294, with
`group_n_band_depth`, `group_n_band_depth_unc` and `group_n_fit` on 0 to 1, plus `glt_x`,
`glt_y`, `lat`, `lon` and `elev`. Two spectral groups, roughly the 1 μm and 2 μm regions.

**EMIT L3 ASA**, `EMITL3ASA.001`, DOI `10.5067/EMIT/EMITL3ASA.001`, Brodrick et al.
(2023). This is the one to build on. A **single global file**, `EMIT_L3_ASA_001.nc`, on a
**0.5 degree grid**, giving aggregated mineral spectral abundance in **percent** with a
matching `_uncert` layer for every mineral. No mosaicking of scenes required.

The delivered mineral list, confirmed from the L3 variable table and from the EMIT
spectral grouping matrix in `emit-sds/emit-sds-l2b`, is exactly ten:

Calcite, Chlorite, Dolomite, Goethite, Gypsum, Hematite, Illite+Muscovite, Kaolinite,
Montmorillonite, Vermiculite.

Each with an uncertainty layer. The underlying library is 294 records drawn from USGS
splib06 and sprlb06, split 95 in spectral group 1 and 199 in group 2, mapped onto those
ten output categories.

**Why this lands for your project.** Calcite is a delivered layer with a stated
uncertainty, on a global grid, in percent. Your calcium carbonate prong is about adding
carbonate cement to a substrate, and here is a public measurement of how much carbonate
the substrate already carries. That is a real link between the aeolian module and the wet
lab, and it is measured rather than inferred from a soil taxonomy lookup, which is exactly
the weakness of the Claquin and Nickovic databases in entry 2.8.

One nuance to state accurately. The grouping matrix also has a `Carbonate` aggregate
column, but it flags eight *other* carbonates in the library that are not delivered as
output layers: aragonite, magnesite, siderite, rhodochrosite, witherite, strontianite,
azurite and malachite. So the delivered carbonate signal is Calcite plus Dolomite. Do not
describe the product as reporting total carbonate.

**Still open, and it is a small one.** Actual EMIT coverage over the Arabian Peninsula was
not measured. EMIT flies on the ISS and does not see everything, so the L3 grid will carry
the `-9999` fill value where nothing was acquired. This is cheap to settle rather than
argue about: download `EMIT_L3_ASA_001.nc`, read the `Calcite` layer over a 22 to 27 N,
51 to 57 E window, and count fill cells. Do that before the mineralogy layer goes into the
UI. If coverage is patchy at 0.5 degrees, fall back to L2B scenes over the specific
hotspots instead of a continuous layer.

### 8.6 Method note

Entries 8.1 to 8.5 were read from primary sources. Section 8.2 includes one live API call.
Section 8.4 was measured directly from the KML files in the repository, not read from the
paper. No numeric value anywhere in this document was estimated or inferred.
