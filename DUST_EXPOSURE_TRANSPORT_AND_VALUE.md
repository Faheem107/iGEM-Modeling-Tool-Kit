# Transport backbone and the value model

The transport decision, made and implemented, plus what it means for the pricing story.

Read `DUST_EXPOSURE_KNOWLEDGE_GRAPH.md` first for the parameter chain. Code is in
`scripts/transport_model.py`. Nothing here is estimated. Parameters with no source are
listed as such and the code refuses to invent them.

---

## 1. The decision

**Separate saltation from suspension. Model saltation as a near-field settling problem.
Take suspension from CAMS as a background the product does not reduce, except where it is
generated on a treated patch.**

No HYSPLIT. No FLEXPART. Those tools exist for long-range suspension, and the analysis
below shows that the mass this product acts on does not travel far enough to need them.

### Why, in one chain

Marticorena and Bergametti 1995, which is in `references/`, defines the regimes and gives
the numbers this rests on:

- Grains of **60 to 2000 um** move by **saltation**. The saltation layer is **of order 1 m**
  high.
- Grains **above 2000 um** creep and stay put.
- Finer material goes into **suspension** and can travel very far. Crucially, that
  suspension flux `F` is **produced by** saltation through sandblasting, and its size
  relative to the horizontal flux `G` is set by the soil clay content (their Figure 4,
  after Gillette 1979).

Apply the measured UAE-relevant grain size distribution from Benaafi et al. Table 1:

| Substrate | creep >2 mm | **saltation 60 to 2000 um** | suspension <60 um |
| --- | --- | --- | --- |
| Rub al Khali (n = 12) | 0.22% | **99.65%** | 0.130% |
| Eastern Province (n = 9) | 0.00% | **99.73%** | 0.269% |
| Sakaka (n = 12) | 0.00% | **98.63%** | 1.371% |

Then apply Ferguson and Church 2004 settling velocities and release the grains from the
1 m saltation layer. The fraction still airborne after travelling downwind:

| wind | 1 m | 5 m | 10 m | 25 m | 50 m | 100 m | 1 km |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 5 m/s | 95.8% | 7.6% | 1.1% | 0.0% | 0.0% | 0.0% | 0.0% |
| 10 m/s | 100% | 35.4% | 7.6% | 0.5% | 0.0% | 0.0% | 0.0% |
| 15 m/s | 100% | 66.3% | 19.9% | 1.9% | 0.1% | 0.0% | 0.0% |

**Essentially all of the mass is saltating, and saltating mass lands within tens of
metres.** That is the whole answer. A dispersion model for this material would be
answering a question the physics does not pose.

### Three things this resolves at once

1. **The Hennen conflict disappears.** Hennen 2017 found the Tigris and Euphrates flood
   plain producing 37% of Middle East dust emission events and very few from the southern
   Arabian Peninsula. That is a statement about **suspension** dust. Dune sand is quartz
   dominated with almost no clay, so its `F/G` is low: a dune sea is a strong sand mover
   and a weak dust emitter. A clay-rich flood plain is the opposite. The satellite
   observation and the grain size physics agree, from two independent directions.
2. **Ginoux's source tags become physically meaningful.** `natural_dust` over sand seas is
   the coarse, near-field, addressable regime. `hydro_dust` over ephemeral water bodies is
   the fine, far-field regime. The tag is a proxy for addressability.
3. **The business plan's own caveat is now quantified.** It already says the claim must be
   "we reduce local sand transport and abrasion", not "we eliminate soiling". The numbers
   above are why.

---

> **Superseded in part.** Section 2 below states the scale mismatch correctly but drew
> too strong a conclusion from it. The mismatch applies only to saltation. Suspension dust
> and the multi-year sand drift pathway both connect a regional hotspot to a target site
> legitimately, and both are now implemented. See `DUST_EXPOSURE_MODULE_SPEC.md` section 2.

## 2. The scale mismatch, which is the most important finding here

Every UAE utility-scale solar asset has a Ginoux natural dust source nearby. Measured from
`references/rog1742-sup-0002-sfts01/Middle_East_MAM.kml` against OpenStreetMap asset
locations:

| Asset | MW | nearest Ginoux source |
| --- | --- | --- |
| Mohammed bin Rashid Al Maktoum Solar Park | 2427 | 7.3 km |
| Al-Dhafra Solar Power Plant | 2000 | 9.6 km |
| Noor Abu Dhabi | 1177 | 14.5 km |
| Shams 1 | 100 | 10.0 km |
| Masdar City | 10 | 26.1 km |
| Sir Bani Yas Island | 14 | 58.5 km |

All nearest sources are tagged `natural`, consistent with dune-sea substrate.

**But saltating sand lands within tens of metres, and Ginoux's grid is 0.1 degrees, about
11 km.** The two scales differ by roughly three orders of magnitude. A source 7 km upwind
delivers no saltating sand to a panel. It delivers suspension only.

So:

- **The sand that abrades and buries a solar farm comes from the ground at and immediately
  upwind of the farm itself.** Tens to hundreds of metres.
- **No global dataset resolves that.** Not Ginoux, not EMIT at 0.5 degrees, not ERA5.
- Site-scale source mapping needs high resolution imagery or land cover, per site.

This is not a flaw to hide. It is the finding that tells you what the tool is for.

### What the two modules should therefore claim

| Layer | Scale | Data | Honest claim |
| --- | --- | --- | --- |
| Regional map, hotspots plus targets plus wind | 10 to 1000 km | Ginoux, ERA5, CAMS | Where regional dust comes from and when. Context and site screening. |
| Site value calculation | 10 to 500 m | Grain size, treated patch geometry, local wind | What the product prevents at this asset. |

The UI must not let a user read a regional hotspot as the source of the sand hitting their
panels. That is the one way this tool could mislead a judge or a customer.

---

## 3. The model, as implemented

```
ERA5 monthly Weibull (A_m, k_m)          scripts/fit_era5_weibull.py   TO BUILD
   |
   v  u* = 0.03 * U10                    AEOLIAN_CALIB.uStarRatio, 10 m reference
Eq 7 / Eq 8  u*t0, u*t                   aeolian.ts, gamma from wet lab
   |
   v  closed-form incomplete gamma       windStats.ts, verified to 3e-12
<G>  monthly mean horizontal flux [kg/m/s]
   |
   +--> saltation, 99.7% of mass
   |      near_field_capture_fraction(distance, U, grain)   transport_model.py  DONE
   |      -> mass arriving at the receptor -> abrasion + encroachment
   |
   +--> suspension, F = (F/G) * G
          F/G from clay content          Marticorena Fig 4 / Eq 43   COEFFICIENTS NEEDED
          -> soiling, far field
          background from CAMS via Open-Meteo `dust`, cams_global    VERIFIED
```

`near_field_capture_fraction` is the function the brief calls "fraction of sand reaching
the target site". It integrates the grain size distribution and asks, per size bin,
whether that grain's ballistic range from the 1 m saltation layer exceeds the source to
receptor distance.

It is deliberately an **upper bound**. It ignores repeated re-launch, which extends net
transport, and it ignores turbulence. Say so in the UI.

The product effect is the same integral run twice, with `u*t0` and then `u*t`. One
parameter, gamma, moves through one equation. That is the cleanest part of the model and
it should be the centrepiece of the explanation.

---

## 4. Target markets, actual UAE locations

Pulled live from OpenStreetMap via Overpass on 2026-08-18, UAE bounding box, filtered to
plants of 10 MW and above, Qatar and Oman excluded, Mohammed bin Rashid phases collapsed
into the parent relation.

Six assets, **5,728 MW** total. Table in section 2. Licence is ODbL, which requires
attribution and carries share-alike obligations on a derived database, so read that before
publishing a derived layer.

The business plan leads with solar, keeps roads and industrial as fast follows, and treats
government as the credibility channel. That ordering survives this analysis, but the
**basis of the solar claim has to change**, see section 5.

Other receptor layers to pull the same way when needed: `highway=motorway|trunk` for road
corridors, `landuse=industrial` and `man_made=works` for industrial sites, `aeroway` for
airports. All ODbL.

---

## 5. The value model, and an honest problem with the current framing

### The chain

```
mass arriving at receptor [kg/m2/yr]        from section 3
   -> deposition density on glass [g/m2]    needs a retention fraction
   -> transmittance loss [%]                Elminir 2006, PAYWALLED
   -> energy loss [MWh/yr]  = MW * CF * 8760 * loss%
   -> revenue loss [USD/yr] = energy loss * tariff
   -> product benefit       = revenue loss * flux reduction from Eq 8
   -> net value             = benefit - treatment cost (economic.ts, already built)
```

`src/lib/physics/economic.ts` already computes the cost side per hectare for every prong
combination, so only the loss side is new.

### The problem

**The business plan's lead argument is solar soiling. The physics says local sand
stabilisation does not do much for soiling.**

Soiling on PV glass is dominated by fine dust that settles and sticks. Rub al Khali dune
sand is **0.13% finer than 60 um**. Treating a dune patch next to a solar farm removes
almost no soiling-capable material, because there was almost none there to begin with. The
fine dust that soils panels in the UAE arrives from far-field, clay-rich sources, which is
exactly what Hennen measured.

Zeedan et al. 2021 does not rescue this. It correlates power output to **ambient air dust
density in mg/m3**, not to deposited mass in g/m2. Their headline slope of 43.79 W per
mg/m3 is specific to one panel under a narrow band of conditions, and it is an air
concentration relation. It cannot be driven by a deposition flux model. Their own
Section 2.2 points at the right relation, transmittance loss against **g/m2**, and cites
Elminir et al. 2006 for it. That is the paper the chain needs.

### What the value case should be instead

Three mechanisms, in order of how well the physics supports them:

1. **Sand encroachment and burial.** Saltating mass piling against panel rows, access
   roads and perimeter. Directly proportional to the mass the model computes, at the right
   length scale. Strongest claim. The cost side is O&M clearing, which the business plan
   already flags as undocumented in the Gulf.
2. **Abrasion and sandblasting of glass.** A real, documented degradation mechanism and the
   right length scale. But no source has been found linking saltation flux to haze or
   transmittance loss. This is the single weakest link in the value chain.
3. **Soiling.** Only defensible for treated patches that are themselves clay-rich enough to
   emit suspension dust, which dune sand is not. Do not lead with it.

Roads may in fact be the better lead market on physics alone. Sand encroachment on a
highway is exactly near-field saltation deposition, the receptor is linear and lies
directly downwind of treatable shoulders, and the mechanism needs no extra conversion
step. The blocker there is cost data, not physics.

**This is worth taking back to the business team before pricing is built.**

---

## 6. Parameters with no source, which the code refuses to invent

`scripts/transport_model.py` carries these in a `NEEDS_SOURCE` dict and raises rather than
guessing.

| Parameter | Needed for | Where to get it |
| --- | --- | --- |
| Soil clay fraction over treated patches | `F/G`, the suspension split | SoilGrids, free, not yet downloaded |
| Marticorena Eq 43 coefficients | `F/G` | Read off the PDF in `references/`, the OCR lost them |
| Deposition to transmittance | Soiling value | Elminir 2006, `10.1016/j.enconman.2006.02.014`, paywalled |
| Saltation flux to glass abrasion | Abrasion value | No source found. May not exist. Candidate for your own bench work. |
| UAE electricity tariff | Money | DEWA / ADDC / EWEC published tariff |
| UAE utility PV capacity factor | Money | IRENA or project documents |
| Gulf sand-clearing cost per km | Encroachment value | Business team primary research |
| Retention fraction on tilted glass | Deposition to soiling | Tilt-angle dependence is in the literature, needs a source |

---

## 7. Next actions

1. **Take section 5 to the business team.** The lead-market basis may need to move from
   soiling to encroachment, or from solar to roads. That is their call, but it should be
   made on this evidence rather than discovered later.
2. Read the Eq 43 coefficients off Marticorena in `references/`, then implement
   `fg_ratio_from_clay`.
3. Pull ERA5 and build `fit_era5_weibull.py`. The CDS key is in place.
4. Download SoilGrids clay over the Gulf.
5. Decide the site-scale source layer, since no global dataset resolves it. Sentinel-2 or
   a national land cover product is the likely answer.
