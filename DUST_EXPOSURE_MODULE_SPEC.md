# Dust Exposure Toolkit, module specification

The standing spec for Module 1 (Seasonal Forecast) and Module 2 (Live Feed). Written so a
future session can build the UI without re-deriving the science.

Companion documents:

- `DUST_EXPOSURE_DATA_SOURCES.md`, what each dataset is and whether it is verified.
- `DUST_EXPOSURE_KNOWLEDGE_GRAPH.md`, how each source connects to a number, and the weak
  links.
- `DUST_EXPOSURE_TRANSPORT_AND_VALUE.md`, the transport decision and the value chain.
- `DUST_EXPOSURE_BUILD_PLAN.md`, build order and repo layout.

---

## 1. What the two modules are

**Module 1, Seasonal Forecast.** A wind map for 2 to 3 month seasonal windows, with sand
hotspots and target sites marked. A dropdown selects a market, which highlights the target
sites relevant to that market. For the selected site the model outputs the estimated
fraction of sand from each hotspot that reaches it, and the estimated reduction our
product would achieve.

**Module 2, Live Feed.** The same interface and the same model, driven by a live wind and
dust API instead of a seasonal climatology. Supports dynamic pricing and deployment timing.

Module 2 is Module 1 with a different wind source. Build one engine.

---

## 2. The three scales, and why the hotspot map is legitimate

An earlier session raised an objection: regional hotspots sit 7 to 15 km from every UAE
solar asset, while saltating sand lands within tens of metres, so how can a hotspot be the
source? The objection is real but it applies to **one** of three mechanisms. The other two
make the hotspot map correct.

| # | Mechanism | Hotspot to target | Time | What arrives | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | **Suspension dust** `F` | Direct, 10 to 1000 km | hours to days | fine dust, soiling | **Implemented**, Chappell Eq 3 |
| 2 | **Sand drift pathway** | Indirect, the hotspot feeds the local sand supply | years to millennia | the dune field itself | **Implemented**, Fryberger drift potential |
| 3 | **Near-field saltation** `Q` | Treated patch to asset, metres | seconds | sand grains, abrasion and burial | **Implemented**, near-field settling |

So a sand hotspot really is where the sand originates. It reaches a target site either as
suspended dust in days (1), or as the sand sea that migrated to sit next to the asset over
centuries (2). What it does **not** do is fling saltating grains 7 km through the air. The
UI must not imply that, and section 7 says how.

### The equation that closes mechanism 1

Chappell, Hennen, Schepanski, Dhital and Tong (2024), *Geophys. Res. Lett.*,
doi `10.1029/2023GL106540`, Equation 3, quoting Marticorena and Bergametti (1995):

```
F = A_f · A_s · M · Q · 10^(0.134·clay% − 6.0),   0% < clay% < 20%,   M = 0.87
```

so the sandblasting efficiency is `alpha = F/Q = 10^(0.134·clay − 6.0)` in m⁻¹.

Verified: 0 to 20% clay spans a factor of 479, and the paper states the efficiency
"increases by nearly 3 orders of magnitude". Dimensionally `Q [kg/m/s] · alpha [1/m] =
F [kg/m²/s]`. Implemented in `scripts/transport_model.py`.

### The equation that closes mechanism 2

Fryberger (1979), ch. 5 of *A Study of Global Sand Seas*, USGS PP 1052. The working form,
quoted in text by Khalaf and Al-Ajmi (1993) because the USGS scan has no text layer:

```
Q = V²(V − Vt)·t          V in knots, giving drift potential in vector units
```

`DP`, `RDP`, `RDD` and the unidirectionality index are implemented in
`python_models/wind_stats.py` and `src/lib/physics/windStats.ts`. The resultant drift
direction gives the arrows that connect a hotspot to a target on the map, which is exactly
the "where does the sand come from" visual the brief asks for.

---

## 3. Wind, the shared input

All three mechanisms run off the same seasonal wind statistics.

- **Source.** ERA5 hourly 10 m u and v, via the Copernicus CDS. Fit Weibull `(A_m, k_m)`
  per cell per month plus a directional rose. Global Wind Atlas 4 is annual only and
  carries **no direction at all**, so it cannot drive either module on its own.
- **Reference height is 10 m and this is load-bearing.** `AEOLIAN_CALIB.uStarRatio = 0.03`
  corresponds to a 10 m wind, which is what ERA5 and Open-Meteo both report. The constant
  is now annotated in `constants.ts`. Substituting a 2 m or 50 m wind source silently
  breaks the model.
- **Monthly mean flux must be integrated, not evaluated at the mean wind.** Flux goes as
  roughly the cube of friction velocity above a threshold, so the flux of the mean is not
  the mean of the flux. The exact closed form is
  `⟨q⟩ = C(ρa/g)r³[A³Γ(1+3/k, x) − ut²AΓ(1+1/k, x)]`, `x = (ut/A)^k`, implemented in both
  `windStats.ts` and `wind_stats.py` and verified against brute-force integration to
  3e-12 by `scripts/verify_weibull_flux.py`.

### Gulf validation targets

Khalaf and Al-Ajmi (1993), *Geomorphology* 6, 111–134, measured in Kuwait:

- saltation begins at about **5.4 m/s** at 10 m,
- average annual sand drift **about 20 m³ per metre width per year**, mostly May to August,
  toward the southeast,
- barchans about 3 m high migrate **about 20 m in nine months**,
- suspension dust over Kuwait is "usually initiated in southern Iraq".

That last point independently confirms Hennen 2017's finding that the Tigris and Euphrates
flood plain dominates regional dust, from a paper written 24 years earlier. The drift rate
and the threshold are the two numbers to validate the model against before it ships.

---

## 4. Markets and damage functions

One transport core, pluggable receptors. Every damage function carries an evidence grade
and the UI renders it. Implemented in `src/lib/physics/damage.ts` and
`python_models/damage.py`.

| Market | Mechanism | Damage function | Grade |
| --- | --- | --- | --- |
| Utility solar, soiling | 1, suspension | Elminir 2006 Eq 1 and Table 1 | `literature` |
| Utility solar, abrasion | 3, saltation | none found | `unsourced` |
| Roads | 3, saltation | drift rate sourced, clearing cost missing | `unsourced` |
| Industrial and logistics | 1 and 3 | lead: `10.3390/su11010200` | `unsourced` |
| Construction | 3 | none | `unsourced` |
| Agriculture | 1 | lead: `10.1065/espr2006.08.327` | `unsourced` |

`unsourced` functions return `null`, never a number. That is deliberate. A grade badge
next to a blank is honest; a fabricated coefficient is not.

### The one implemented damage function, and its caveats

Elminir et al. 2006, `10.1016/j.enconman.2006.02.014`, relates dust deposition density
`q` in g/m² to glass transmittance loss. Verified against the PDF, not just an extraction.

Three things were found on inspection and are handled in code:

1. The published quartic is **non-monotonic** on `[1, 2]`, dipping to 5.80% at q = 1.68
   after 7.31% at q = 1. A quartic artifact. Removed by a running maximum on a fixed grid.
2. It is **meaningless outside `[1, 9]` g/m²**, the range of its Fig 6: it gives 16.77% at
   zero dust and 252% at 15 g/m². Below 1 we ramp linearly from the origin; above 9 we
   extrapolate at the endpoint slope and set `outOfRange`.
3. The abstract's `15.84 g/m² → 52.54%` and `4.48 g/m² → 12.38%` are **cumulative
   seven-month exposure endpoints**, a different quantity from the Fig 6 correlation. They
   are not pooled with it. Use them only as an order-of-magnitude cross-check.

Tilt matters and is sourced: Elminir Table 1 gives 27.62% at 0° falling to 6.32% at 90° for
the same accumulation, implemented as a normalised `tiltFactor`.

### Money

`DEWA_slabtariff.pdf`, official, August 2026. Industrial 0.230 AED/kWh to 10,000 kWh per
month and 0.380 above, plus a 0.060 AED/kWh fuel surcharge, plus 5% VAT. At the pegged
3.6725 AED/USD that is **0.1258 USD/kWh** on the high industrial slab.

**A warning that changes the business case.** That is the *retail consumption* tariff. A
utility-scale solar plant earns the PPA price it sold at, which in the UAE has been roughly
an order of magnitude below retail. The retail tariff is right for a customer who offsets
consumption; it is wrong for a generator. The PPA price is deliberately not hard-coded, and
tariff and capacity factor are both **user inputs with sourced defaults**, so the business
team can run scenarios rather than inherit an assumption.

---

## 5. Pipeline

```
ERA5 hourly 10 m u,v                       scripts/fit_era5_weibull.py     TO BUILD
  -> monthly Weibull (A_m, k_m) + rose
  -> u* = 0.03 · U10                       AEOLIAN_CALIB.uStarRatio, 10 m
  -> Eq 7 / Eq 8 thresholds                aeolian.ts, gamma from wet lab
  -> closed-form integral                  windStats.ts                    DONE
<Q>  monthly mean horizontal flux
  |
  +-- (1) F = alpha(clay)·Q                transport_model.py              DONE
  |       clay from SoilGrids              fetch_soilgrids_clay.py         TO BUILD
  |       -> regional dust at target       cross-check vs Open-Meteo dust
  |
  +-- (2) DP, RDP, RDD from the rose       windStats.ts                    DONE
  |       -> drift pathway arrows
  |
  +-- (3) near-field capture fraction      transport_model.py              DONE
          -> abrasion and encroachment
  |
  +-- product effect: rerun with u*t       one parameter, one integral
```

---

## 6. Known weak links

| Link | Problem | Handling |
| --- | --- | --- |
| SoilGrids clay over UAE dunes | **Measured this session, and it is worse than a cap problem.** SoilGrids returns 20.0% at Al-Dhafra, 20.4% at MBR, 12.5 to 16.6% across the other UAE points, against 33.7% for the Tigris and Euphrates plain. The floodplain value is credible. The dune values are not: Benaafi classifies these sands as quartz arenite, which is nearer 2% clay. Because Eq 3 is exponential in clay, that bias **compresses the source contrast by a factor of about 85**: 3x between floodplain and dune instead of roughly 258x. Taken at face value it would paint UAE dune fields as strong dust emitters and understate the floodplain, the exact opposite of what Hennen 2017 and Khalaf & Al-Ajmi 1993 both observed. | Do not feed raw SoilGrids clay into Eq 3 over dune fields. Show the value, the cap flag and the contradiction. Prefer a substrate-class lookup (dune sand vs floodplain vs sabkha) anchored on Benaafi petrography, with SoilGrids used only for relative ranking. |
| `z0 = d/30` | An assumption, shared by the validation and the production path | State once, one constant, sensitivity slider |
| Saudi to UAE grain transfer | Rests on one sentence in Benaafi | Cite it, show all three analogues as the spread |
| EMIT to bulk carbonate | Broken, the ten fractions do not close | Ordinal ranking only |
| Ginoux MAM only | No other season exists for the Middle East | Fixed source mask, seasonality from the wind |
| Elminir range | See section 4 | `outOfRange` flag surfaced to the UI |
| Retail tariff vs PPA | Order of magnitude apart | User input, warning in the tooltip |

---

## 7. UI rules

1. **Never imply mechanism 3 at regional range.** A hotspot 7 km upwind may be drawn as an
   origin for suspension dust and for the drift pathway. It must not be drawn as the source
   of saltating sand hitting the asset. Label the arrows by mechanism.
2. **Render the evidence grade** next to every output. `unsourced` shows a badge and a
   blank, not a zero.
3. **Name the method that produced the number on screen.** A slider must never imply a
   measurement.
4. **Show the `outOfRange` flag** whenever a damage function is extrapolated.
5. **Attribution is required in the module footer**, not buried: CAMS and Open-Meteo for
   live dust, Ginoux for hotspots, OpenStreetMap ODbL for target sites, GWA and ERA5 for
   wind.
6. Follow `CLAUDE.md`: no em dashes, the workspace renders the module title so the module
   must not, and use the shared `Panel` / `ModuleShell` / `StatCard` primitives with
   `rounded-[6px]`.

---

## 8. Still open

- ERA5 pull and the monthly Weibull fit. The CDS key is in place.
- SoilGrids clay grid over the Gulf, and resolving the 20% contradiction.
- Cost coefficients for the four `unsourced` markets. Roads is closest: the mass side is
  measured by Khalaf and Al-Ajmi, only the cost per cubic metre cleared is missing.
- A saltation-flux-to-glass-abrasion relation. May not exist in the literature, in which
  case it is a candidate for the team's own bench work.
- UAE PPA prices and utility PV capacity factor from primary sources.
