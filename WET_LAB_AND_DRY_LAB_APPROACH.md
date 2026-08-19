# NYUAD iGEM 2026 — Wet Lab and Dry Lab Approach

**Project:** Stabilizing dry desert sand using bacteria-produced biopolymers.
**Chassis:** *Bacillus subtilis* (lab strain 168), deployed as freeze-dried spores.

This document is the full technical description of two things:

1. The **Wet Lab** approach: exactly how we engineer *B. subtilis*, what genes and
   constructs we add or modify, how the two engineered functions work, and how we contain
   the organism after it has done its job.
2. The **Dry Lab** modeling approach: every model in the toolkit, the math behind it, and
   the wet-lab measurement each model is calibrated by or predicts.

A note on honesty. Everything below describes a **design and a model**. Where a number is a
literature value it is cited. Where a number is a modeling assumption or a
sensitivity range awaiting our own bench data, it is labelled "to calibrate". Nothing here
should be read as an experimental result unless the wet lab has actually measured it.

---

## Part 0 — The system in one page

We do not use one trick. We stack complementary functions so the crust survives different
failure modes (drought, rain, wind, cell death), and we wrap them in a genetic safety layer.

| Element | What it is | Engineered? | What it produces | Binds sand by |
|---|---|---|---|---|
| **Prong 1** | γ-PGA overexpression | Yes (improvement) | poly-γ-glutamic acid | flexible Ca²⁺ cross-linked gel |
| **Prong 2** | Carbonic anhydrase surface display | Yes (addition) | calcium carbonate | rigid biocement (non-ureolytic MICP) |
| **Third element** | MazE/MazF biocontainment kill switch + faster spore germination (gerB\*) | Yes (control) | none (safety layer) | not a binder |

**Why this shape.** iGEM rewards demonstrating engineering through genetic design. The three
elements map onto the three classic engineering moves:

- **Prong 1 = improvement** — overexpress a gene *B. subtilis* already has.
- **Prong 2 = addition** — add a new enzyme (carbonic anhydrase) and a display system.
- **Third element = control** — make sure every cell does the wanted job and can be cleared.

**Grain-size logic.** The two binders are grain-size complementary. Microbially induced
calcite (Prong 2) works best in the ~63–125 µm band; γ-PGA gel (Prong 1) closes the coarse
and fine gaps. Covering the whole UAE dune-sand size distribution is the point of running
the prongs together.

### An important design-history note

An earlier version of the project used **sodium alginate** as a third prong (an externally
sprayed hydrogel binder). It was **dropped** for three reasons:

1. It is highly water-absorbent, so as a hydrogel it can starve the cells of water and limit
   nutrient diffusion, working against Prong 2.
2. It depends on a steady external Ca²⁺ supply for good calcite; without it, poorly formed
   polymorphs result.
3. It is not a synthetic-biology solution. A core prong that is just an applied material makes
   the whole system feel less integrated.

Alginate is now an **archived comparison** (still fully modeled so its trade-offs stay
quantifiable), and its slot as the "third element" is filled by the genetically encoded kill
switch. The modeling code still carries alginate as Prong 3 in some registries for that
archived comparison; the deployed design is **two engineered prongs plus the kill switch**.

---

# PART A — WET LAB APPROACH

## A1. Chassis and deployment format

- **Organism:** *Bacillus subtilis* 168. Chosen because it is a well-characterized,
  genetically tractable, GRAS-status soil bacterium that naturally forms robust biofilms and
  natively produces γ-PGA, and because it sporulates, which is what makes long-term
  desert deployment feasible.
- **Deployment format:** the strain is grown and induced to sporulate in the lab, then
  **freeze-dried as spores** for storage and transport. In the field the spores are
  rehydrated (sprayed as a suspension), germinate into vegetative cells, form biofilm, and
  carry out the engineered functions.
- **The dormancy trade-off:** spores are what let the product survive shipping and the desert,
  but they are also the hardest thing to contain, because a dormant spore does nothing and
  cannot be killed by a translation-dependent toxin. This tension drives the whole third
  element (see A4).

**Life cycle we engineer around:**

```
freeze-dried spore  →  rehydrate + germinate  →  vegetative cell (does the work)
        ↑                                                 |
        └──────── re-sporulation when nutrients run out ──┘   (the containment problem)
```

## A2. Prong 1 — γ-PGA overexpression (the flexible binder)

**Goal.** Make *B. subtilis* secrete far more **poly-γ-glutamic acid (γ-PGA)** than wild type,
so that once secreted it forms a sticky, water-retaining biopolymer that glues loose sand
grains into a flexible living crust and holds the moisture the colony needs.

**How γ-PGA binds sand.** γ-PGA is an anionic polymer (carboxylate groups along the chain).
Divalent cations already present in desert sand and dust (Ca²⁺, Mg²⁺) bridge neighbouring
chains, forming a cross-linked hydrogel network around the quartz (SiO₂) grains. γ-PGA is the
net, Ca²⁺ is the knots, the sand grains are trapped inside.

**Genetic strategy:**

1. **Overexpress the synthetase operon.** γ-PGA is made by the membrane synthetase complex
   encoded by the *pgs* operon (**pgsB / pgsC / pgsAA**, historically *capB/capC/capA*). We
   drive this with a strong promoter to raise synthesis flux.
2. **Knock out degradation.** *B. subtilis* also degrades its own γ-PGA. The two degradation
   routes we target are:
   - **Δggt** — removes the γ-glutamyltransferase that trims/depolymerizes γ-PGA.
   - **ΔpgcA** — removes a further degradation/turnover contribution.
   Removing both is what lets secreted polymer accumulate instead of being recycled. In the
   model this is "set the biopolymer degradation constant toward zero".
3. **Feed the precursor.** γ-PGA is polymerized from **L-glutamate**. Precursor supply
   (endogenous glutamate pool plus any feed) is a direct lever on yield, so glutamate is both a
   media parameter and a modeled input.

**Key wet-lab measurements for Prong 1:**

- γ-PGA yield (g/L) by spectrophotometric / gravimetric assay, used to calibrate the kinetic
  model's `k_cat`.
- OD600 (cell density), glutamate feed, Ca²⁺ (salinity), and incubation temperature, all fed
  into the wet-lab sandbox and cross-linking models.
- Crust mechanical response (penetration / shear assays on treated sand) to validate the
  predicted shear modulus.

## A3. Prong 2 — Carbonic anhydrase display for non-ureolytic MICP (the rigid binder)

**Goal.** Cement sand grains with **calcium carbonate (CaCO₃)** through microbially induced
calcite precipitation (MICP), but **without urease**, to avoid the ammonia byproduct that the
conventional ureolytic route releases.

**The chemistry.** Carbonic anhydrase (CA) massively accelerates the hydration of CO₂:

```
CO₂ + H₂O  --CA-->  H⁺ + HCO₃⁻   (then, at high pH, HCO₃⁻ ⇌ H⁺ + CO₃²⁻)
Ca²⁺ + CO₃²⁻  ⇌  CaCO₃ (s)
```

CA raises the dissolved inorganic carbon (and thus carbonate ion) far faster than the
uncatalyzed reaction, pushing the solution to supersaturation so calcium carbonate
precipitates and cements grains together. Because it is CA-driven rather than urea-driven,
there is **no ammonia**. Using CA-MICP also tends to crystallize a large fraction of
metastable **vaterite** first, which slowly recrystallizes to **calcite**.

**Genetic strategy — get active CA onto the cell surface.** For CA to nucleate carbonate at
the grain surface it must be displayed on the outside of the cell in its active form. That is a
three-step chain, and every step must work (efficiency is multiplicative):

1. **Export.** Fuse CA to a **Sec-pathway signal peptide** so the cell secretes it across the
   membrane. Wet-lab check: periplasmic / supernatant fractionation ("did CA leave the
   membrane?").
2. **Dimerize.** Active CA requires the correct fold and, for the relevant isozyme,
   dimerization. Wet-lab check: **pNPA esterase assay** (functional CA has esterase activity).
3. **Anchor to the surface.** Two candidate routes are being compared on the bench:
   - **Sortase-mediated ligation** — a sortase (e.g. YhcS) covalently attaches CA carrying a
     sorting signal to the cell wall / an amine-presenting surface. Wet-lab check: GFP-on-bead
     (PDL/PLL) retention.
   - **LytE-CWBD binding motif** — a non-covalent cell-wall-binding domain that docks CA onto
     the wall. Wet-lab check: binding-domain affinity / display density.

   The modeling (see B3) favours sortase because covalent attachment gives higher retained,
   functional display, but the decision is left to the assay.

**Key wet-lab measurements for Prong 2:**

- The three sub-efficiencies above (export, dimerization, anchoring) per route.
- Calcite content (wt%), polymorph fraction (vaterite vs calcite) by XRD, and unconfined
  compressive strength (UCS) of treated sand cores.
- CO₂ captured (a climate co-benefit: 1 mol CaCO₃ fixes 1 mol CO₂).

## A4. The third element — biocontainment kill switch and spore control

This is the biosafety layer that replaced the alginate prong. It answers two containment
problems and one hard corner case.

### Problem 1 — Do not let the engineered *B. subtilis* over-spread

We use the native **MazE/MazF type II toxin–antitoxin (TA)** system:

- **MazF** = toxin, a stable endoribonuclease that cleaves mRNA (at ACA sites), halting
  translation and killing the cell.
- **MazE** = antitoxin, a labile protein that binds and neutralizes MazF. MazE + MazF together
  = safe.

*B. subtilis* already carries chromosomal MazE (YdcD) and MazF (YdcE), always on, balanced. We
add **one extra copy of mazF under a Tet-inducible (aTc) promoter on the chromosome**:

```
[constitutive] → mazE   (antitoxin, always on)     already in B. subtilis
[constitutive] → mazF   (toxin, always on)         already in B. subtilis
[Tet-inducible] → mazF  (toxin, off until aTc)     the part we add
```

**Trigger:** add **anhydrotetracycline (aTc)** → the extra mazF turns on → free MazF exceeds
what MazE can sequester → the cell dies on demand. Because this copy is **on the chromosome**,
it still works after the plasmid has diluted out (see below). Even with no trigger, the
plasmid-borne antitoxin dilutes over generations, so the strain is **self-limiting**.

### Problem 2 — Do not let the engineered genes spread by horizontal gene transfer (HGT)

HGT usually moves the **plasmid**. So the anti-HGT design lives on the plasmid, and exploits
**cognate specificity** (a "lock and key": an antitoxin only neutralizes its *own species'*
toxin):

- **On the plasmid:** *E. coli* **mazF** (toxin).
- **On the chromosome:** *E. coli* **mazE** (antitoxin).

Our engineered cell has both, so it is fine. But if the plasmid jumps to a wild desert microbe,
that recipient gets *E. coli* MazF **without** *E. coli* MazE. Its own native MazE (wrong lock)
cannot neutralize the foreign toxin, so **the recipient self-eliminates**.

**Coupling the payload to the toxin.** The plasmid construct puts the biofilm genes and mazF in
the **same transcriptional unit**:

```
Promoter → Biofilm Gene 1 → Biofilm Gene 2 → mazF
```

This ties functionality to containment: if a recipient can express the useful genes it also
expresses MazF (and dies); if it cannot express MazF it also cannot meaningfully express the
payload (so nothing dangerous spread).

**Closing the rescue routes.** The one way HGT containment fails is if a recipient also acquires
a functional *E. coli* mazE (rare chromosome-fragment transfer, or an *E. coli*-like recipient
that already carries cognate mazE). Two hardening measures:

- **Split mazE** — put the two halves far apart on the chromosome; a recipient would need both.
- **Codon-optimize mazE with rare codons** so most recipients cannot translate it even if
  acquired.

**Known limitation, stated honestly.** If the plasmid reaches an actual *E. coli* (which can
make cognate MazE), the HGT switch could fail. *E. coli* is not a typical desert soil organism,
but livestock feces near a deployment site could introduce it. Mitigation is careful site
selection plus pre/post environmental monitoring, and the fact that HGT is naturally rare and
the plasmid is lost after ~20 generations anyway.

### The hard corner case — spores

MazF **only works in metabolically active (translating) cells**. A dormant spore has shut down
translation, so the kill switch cannot touch it. Since we deploy *as spores*, and germinated
cells can re-sporulate when nutrients run out, a naive kill switch leaves a persistent spore
population. Our approach:

1. **Germinate-then-kill.** Wake the spores first, then let MazF clear the vegetative cells.
2. **Raise germination completeness with gerB\*.** Over-express the mutant germinant receptor
   **gerB\***, which lowers the germination threshold so spores wake faster and more uniformly.
3. **Use multiple, distinct germinants.** Different germinant receptors respond to different
   cues (e.g. L-alanine via GerA; the AGFK mixture needs GerB and GerK). Co-applying several
   recruits more of the dormant pool per round.
4. **Accept a superdormant floor.** A small fraction of spores have very low germinant-receptor
   levels and stay dormant (Ghosh et al. 2012, on our exact 168 strain). We model this as a
   hard floor rather than pretending it is zero.
5. **Verify by outgrowth, not optics.** Confirm killing with CFU / outgrowth assays, not just
   OD or microscopy, because a spore can start early germination changes yet still be viable.

**Alternative under evaluation:** *thymineless death* (disrupt **thyA** and **thyB**) so
germinated cells die when externally supplied thymine/thymidine runs out (a published
*B. subtilis* system reported ~5-log vegetative loss in ~5 h after thymine removal). More
automatic than spraying aTc across a desert, but like MazF it acts only after germination.

### Ecological framing

- The switch only affects cells that acquire the engineered DNA; native microbes that do not
  receive the plasmid are unaffected. It is targeted, not broadly toxic.
- HGT is naturally rare, and the plasmid (hence the whole HGT-protection window) is expected to
  be gone after ~20 generations, roughly a months-scale, self-terminating risk window.

## A5. Field deployment and curing

- Spores are sprayed as a suspension. On rehydration they germinate, form biofilm, and secrete
  the binders.
- The crust is built up over a staged **spray/curing protocol** (application at roughly
  0 / 8 / 16 / 24 / 32 h), then weathers over months until re-application. Fast-setting polymer
  (Prong 1) buys early strength; the calcite floor (Prong 2) buys longevity.

## A6. Wet-lab assay summary (what feeds the models)

| Measurement | Method | Feeds which model |
|---|---|---|
| γ-PGA yield (g/L) | spectrophotometric / gravimetric | Metabolic kinetics (`k_cat` calibration) |
| OD600, glutamate, Ca²⁺, temp | culture + media control | Wet-lab sandbox, cross-linking |
| CA export | periplasmic / supernatant fractionation | CA display module |
| CA activity | pNPA esterase assay | CA display → CaCO₃ module |
| Surface display retention | GFP-on-PDL/PLL bead retention | CA display (sortase route) |
| Calcite wt%, polymorph | XRD | CaCO₃ → UCS |
| UCS, penetration/shear | compressive / penetration assay | CaCO₃ UCS, cross-link shear modulus |
| Glucose/O₂ uptake | bioreactor off-gas / consumption | FBA exchange bounds |
| Viable-cell / spore log-reduction | CFU / outgrowth after treatment | Kill switch, spore clearance |

---

# PART B — DRY LAB MODELING APPROACH

The Dry Lab is a browser-based modeling toolkit. It is **prong-aware**: pick any non-empty
subset of the prongs and it surfaces exactly the models that apply, from the genetic scale up to
the macro scale, ending in a combined synthesis. Each model is a pure function so the UI and any
test compute identical numbers, and each carries a `wetlab` field naming the measurement it is
calibrated by or predicts (the "digital twin" loop iGEM judges reward).

**Scale ordering:** genetic → molecular → protein → material → ecology → macro → synthesis →
deployment → economic.

## B1. Flux Balance Analysis (FBA) — genetic scale

**Question:** given glucose and oxygen limits, what is the absolute maximum the cell can make,
and which genes should we knock out?

- **Method:** constraint-based, steady-state metabolism. The stoichiometric matrix **S** and
  flux vector **v** satisfy **S · v = 0** (internal metabolites neither accumulate nor deplete).
  The system is under-determined, so linear programming maximizes an objective
  **Z = cᵀv** (e.g. flux to the L-glutamate precursor or to CA), subject to **lb ≤ v ≤ ub**.
- **Wet-lab coupling:** the bounds are not arbitrary. Measured glucose uptake and oxygen
  consumption set the exchange-reaction upper bounds. In-silico knockouts set a reaction's
  flux to zero (lb = ub = 0).
- **Actionable output:** whether deleting a competing pathway (e.g. acetate overflow via
  **pta / ackA**) mathematically forces carbon toward the product. The optimum also exports a
  precursor concentration **[S]** into the kinetic model (B2).
- **Views:** production envelope (growth ↔ product Pareto front), parsimonious FBA flux
  distribution (pFBA), flux variability at the optimum, and knockout toggles.
- **Implementation note:** the deeper FBA work uses a COBRA-style constraint model
  (the repo carries cobrapy references).

## B2. Intracellular γ-PGA kinetics — molecular scale (Prong 1)

**Question:** how does γ-PGA build up over time inside the cell, and what is rate-limiting?

Deterministic ODEs integrated with classic 4th-order Runge–Kutta (RK4):

```
d[M]/dt = α_m·[DNA] − β_m·[M]                     (transcription)
d[E]/dt = α_e·[M]   − β_e·[E]                     (translation)
d[P]/dt = k_cat·[E]·[S]/(K_m + [S]) − k_deg·[P]   (polymer synthesis − degradation)
```

- **M** mRNA, **E** synthetase complex, **P** γ-PGA, **[S]** L-glutamate precursor.
- **Knockouts:** Δggt reduces k_deg strongly, ΔpgcA further; both together drive **k_deg → 0**,
  so accumulation becomes unbounded (the point of the double knockout).
- **Behavior:** mRNA rises first, enzyme after it, γ-PGA slowly then steeply once enough enzyme
  is present. A closed-form steady state exists only while k_deg > 0.
- **Wet-lab coupling:** a "Calibrate k_cat" step rescales the enzyme turnover so the simulated
  final yield matches the measured spectrophotometric g/L. A local sensitivity (elasticity)
  analysis flags the rate-limiting step.
- **Cross-link to FBA:** [S] can be supplied by hand or taken from the FBA precursor flux.

## B3. Carbonic anhydrase surface display — protein scale (Prong 2)

**Question:** which anchoring route puts the most *functional* CA on the surface?

- **Model:** display efficiency = export × dimerization × anchoring (multiplicative, so the
  chain is only as strong as its weakest link).
- **Compared routes:** sortase-mediated ligation vs LytE-CWBD binding motif, sharing the same
  export and dimerization physiology and differing only in the anchoring step.
- **Every sub-efficiency is a separate wet-lab assay** (fractionation, pNPA, bead retention).
- **Output:** the winning route sets the realized CA activity that feeds the precipitation
  model (B4). Default parameters favour the sortase route.

## B4. CaCO₃ precipitation → UCS — material scale (Prong 2)

**Question:** will calcite form, and how much does it stiffen the sand?

A **geochemical** precipitation model (after Lassin et al. 2018), deliberately scoped to
simplified Ca–CO₂–H₂O chemistry, pH ~8.5–10.5, ~25 °C. It is **not** a full biological MICP
model (no cell metabolism, EPS, or biofilm transport inside this layer).

```
pH + DIC → carbonate speciation (α0, α1, α2) → [CO₃²⁻]
Ω = [Ca²⁺][CO₃²⁻]/Ksp,   SI = log₁₀ Ω
aqueous ions → ACC → vaterite → calcite     (two/three-step ripening)
calcite wt% → UCS (empirical power law)
mol CaCO₃ → mol CO₂ captured
```

- **CA activity** (from B3) raises the quasi-equilibrium DIC, hence carbonate ion and
  supersaturation.
- **Polymorphs matter:** CA-MICP crystallizes mostly metastable vaterite first (softer, more
  soluble), which slowly recrystallizes to calcite. The crust is weak while vaterite-rich and
  stiffens as it converts; UCS is driven by a load-bearing weighted carbonate wt%.
- **Outputs:** calcite/vaterite wt%, saturation index, UCS (kPa), CO₂ sequestered (g/L).
- **Honesty:** the strength curve and vaterite fraction are labelled to-calibrate against our
  own XRD and UCS data; one supporting crust study used *S. pasteurii*, so *B. subtilis* may
  need more cycles.

## B5. γ-PGA Ca²⁺ cross-linking → shear modulus — material scale (Prong 1)

**Question:** how does secreted γ-PGA plus soil calcium translate into gel stiffness?

- **Binding:** Langmuir isotherm for the fractional saturation of coordination sites,
  **θ = [C²⁺] / (K_d + [C²⁺])**.
- **Network density:** **ν = ρ_polymer · θ · (1 − 2M_x/M_n)** (rubber-elasticity network model).
- **Stiffness:** **G = ν R T** (shear modulus of the cross-linked gel).
- **Inputs:** soil Ca²⁺, binding affinity K_d, polymer concentration (optionally piped from the
  secretion yield in B2), temperature, and the polymer molecular weights.
- **Output:** saturation density θ, cross-link density, and shear stiffness G, which feed the
  aeolian and composite models.

## B6. Protein thermal stability — protein scale (both engineered prongs)

**Question:** does the enzyme/scaffold stay folded and active across desert temperature swings?

- **Model:** two-state folding thermodynamics (folded-active vs unfolded-inactive), giving the
  folded fraction vs temperature (and pH/salinity micro-climate inputs).
- **Output:** the operative folding curve and the fraction still folded, which gates enzyme
  viability in the other modules.

## B7. 3D protein explorer — protein scale

- A Mol\*-based structural viewer that renders the **real deposited PDB structures** for the
  engineered proteins (γ-PGA machinery for Prong 1, carbonic anhydrase such as 1CA2 for
  Prong 2), with cartoon/backbone styles and confidence-aware coloring.
- Pairs the structure with the thermal-decay curve (B6) so the fold and its stability are seen
  together.

## B8. Ecological spread — ecology scale (any engineered prong)

**Question:** can the colony cover enough sand to form a crust while staying self-limiting?

- **Model:** reaction-diffusion (Fisher–KPP style) colony growth across a 2-D sand grid, with
  moisture as the limiting resource. Bacterial biomass **B** diffuses and grows logistically on
  nutrient/moisture **N**, which itself diffuses and is consumed; a death term represents loss
  of viability when moisture drops below threshold.
- **Front speed** scales as c = 2√(Dµ).
- **Outputs:** active population %, crust coverage %, and a visual sandbox (untreated sand,
  active *Bacillus*, γ-PGA biocement, terminated cells).

## B9. Biocontainment kill switch — ecology scale

Three coupled analyses, all normalized/nondimensional (qualitative dynamics and relative
comparisons, since we have no measured TA rate constants yet, so nothing is presented as a
measured value):

1. **TA ODE + population viability (RK4).** Free antitoxin **A**, free toxin **T**, complex
   **C**, and log-viability. The aTc-inducible extra mazF is a Hill function of aTc; the
   plasmid-borne antitoxin decays by segregational dilution (~loss per generation). Antitoxin
   is protective because sequestered toxin leaves only via slow complex turnover; when antitoxin
   production cannot keep up (aTc spike, or plasmid dilution starving σ_A), free toxin rises and
   a Hill switch flips net growth to net death. Reports time-to-3-log kill.
2. **HGT containment.** Probability a wild recipient that acquired the plasmid self-eliminates,
   accounting for cognate-carrier rescue, rare chromosomal mazE acquisition, mazE splitting, and
   codon optimization. Outputs containment efficiency, escape probability, and escape per
   exposure, with a breakdown of escape routes.
3. **Spore clearance over rounds.** Germinate → kill → (re-sporulate), iterated. Per-round
   germination completeness combines the gerB\* threshold boost, the number of distinct
   germinants, and a permanent **superdormant floor**, so viability approaches an asymptote
   rather than zero. Outputs viable-spore fraction and log-reduction per round.

- **Grounding:** Kamada et al. 2003 (MazEF complex, PDB 1UB4); *B. subtilis* EndoA/MazF
  (4MDX, 4ME7); Yamaguchi et al. 2011 (cognate specificity); Ghosh et al. 2012 (superdormancy).

## B10. Aeolian wind tunnel — macro scale (all prongs)

**Question:** how much harder is it to erode the treated crust?

- **Baseline threshold friction velocity** (bare dry sand, Bagnold):
  **u\*t0 = A · √((ρ_s − ρ_a)/ρ_a · g d)**, with A ≈ 0.11.
- **With the biofilm's added cohesion γ_biofilm** the threshold scales up:
  **u\*t = A · √((ρ_s − ρ_a)/ρ_a · g d + γ_biofilm/(ρ_a d))**.
- **Saltation mass flux** above threshold: **q = C(ρ_a/g) u\*³ (1 − u\*t²/u\*²)** for u\* > u\*t,
  else 0.
- **Inputs:** the cohesion comes from the cross-linking (B5) and CaCO₃ (B4) outputs, or from the
  wet lab's penetration assays. **Outputs:** untreated vs treated threshold wind speed and a
  cumulative-erosion comparison, plus a spray-density directive (mL/m²).
- **Provenance:** A = 0.11 checked against Bagnold 1941 and Shao & Lu 2000.

## B11. Wet-lab sandbox (2-D) — macro scale (Prong 1)

- A 2-D dune-erosion assay that takes **real lab parameters** (OD600, inoculation volume,
  L-glutamate feed, Ca²⁺ salinity, incubation temp), predicts γ-PGA yield and gel stiffness
  (via temperature-viability and salinity-saturation sub-models), and simulates bare vs
  bio-stabilized sand under a chosen wind friction velocity.
- **Outputs:** calculated shear modulus (Pa), γ-PGA yield target (g/L), critical friction
  velocity u\*t (m/s), and a control-vs-treated erosion map. This is the direct mirror of the
  bench assay: glutamate substrate → γ-PGA yield → dune crust.

## B12. Grain-size coverage — macro scale (all prongs)

- Shows how each binder covers the UAE dune-sand grain-size distribution: MICP's ~63–125 µm
  sweet spot versus the coarse and fine gaps that γ-PGA (and archived alginate) close.
- **Provenance:** UCS-vs-grain-size anchors from Erdmann et al. 2024, *Discover Materials*
  (doi:10.1007/s43939-024-00108-3). The fine-side fall-off (cells cannot penetrate below
  ~40 µm) is a mechanism-based extrapolation below the tested range, labelled to-calibrate,
  **not** a measured Erdmann result.

## B13. Composite strength synthesis — synthesis scale (multi-prong only)

- Combines the per-prong cohesion, subtracts an interaction term (materials can slightly
  compete rather than perfectly synergize), and reports composite cohesion plus a synergy
  percentage.
- A **failure-mode robustness** chart shows why stacking prongs is more reliable: different
  binders protect under drought/heat, flood/rain, bacterial death, high wind, and long-term
  durability. Appears only for combinations of two or more prongs.

## B14. Curing & deployment timeline — deployment scale (all prongs)

- Models crust maturation over the staged 0/8/16/24/32 h spray protocol, then months-scale
  weathering and a re-application cadence. Fast-setting polymer gives early strength; the
  calcite floor gives longevity. Makes the early-strength vs durability trade-off explicit.

## B15. Economic scalability — economic scale (all prongs)

- Per-prong cost basis and break-even against conventional soil stabilizers, so the biological
  result is tied to a deployment cost story.

## B16. How the models chain together (the digital twin)

```
FBA (max precursor, knockout targets)
   → Metabolic kinetics (γ-PGA yield, k_cat calibrated to lab g/L)
      → Cross-linking (shear modulus G = νRT)
CA display (best anchoring route → realized CA activity)
   → CaCO₃ precipitation (calcite wt% → UCS, CO₂ captured)
Thermal stability gates enzyme viability throughout
Ecological spread + kill switch bound the population in space and time
   → Aeolian tunnel (threshold wind speed, erosion) ← cohesion from cross-link + CaCO₃
      → Grain-size coverage + Composite synthesis (combined crust)
         → Curing timeline → Economic scalability
```

Every arrow that crosses into the physical world is anchored to a wet-lab measurement, and
every constant in the model carries its value, units, source, sensitivity range, and the
specific bench experiment that would tighten it.

---

## Part C — Honest limitations (kept visible on purpose)

- **No measured TA constants yet.** The kill-switch numbers are normalized dynamics and
  relative comparisons, not measured molar values.
- **CaCO₃ layer is geochemical, not biological.** It excludes cell metabolism, EPS, and biofilm
  transport, and is valid only in the pH 8.5–10.5, ~25 °C window.
- **Grain-size fine-side fall-off** is a mechanism-based extrapolation below the tested range.
- **CA-MICP crust strength** is calibrated partly from an *S. pasteurii* study; *B. subtilis*
  may need more cycles.
- **HGT switch has one failure mode:** an *E. coli*-like recipient carrying cognate MazE.
  Mitigated by site selection and monitoring, not eliminated.
- **Spores are never driven fully to zero** because of the superdormant floor; the model shows
  an asymptote, not extinction.

Everything labelled "to calibrate" is exactly that: a prediction waiting for our own data.
Judges evaluate the team's work, so every claim above should be backed by our attributions and
our bench results before it reaches the wiki.
