|     |     | Dry | Lab | Modeling |     |     | Approaches |     |     |
| --- | --- | --- | --- | -------- | --- | --- | ---------- | --- | --- |
NYUAD iGEM 2026: Stabilizing Dry Sand using Bacteria-Produced Biopolymers
|     |     |     | Modeling |     | &   | Dry Lab | Subteam |     |     |
| --- | --- | --- | -------- | --- | --- | ------- | ------- | --- | --- |
1. Approach 1: Metabolic Kinetics & Gene Overexpression Optimization
Summary: This approach establishes an intracellular deterministic model to optimize γ-PGA
production. By tracking transcription, translation, and precursor availability, the model identi-
fies metabolic bottlenecks. Crucially, it models the knockout of degradation pathways (e.g., ggt
or pgcA genes) by setting the biopolymer degradation rate constant to zero, thereby maximizing
| cumulative | yield | per cell unit. |     |     |     |     |     |     |     |
| ---------- | ----- | -------------- | --- | --- | --- | --- | --- | --- | --- |
How to execute: Use standard Ordinary Differential Equations (ODEs) to model the concen-
tration changes of mRNA (M), enzymatic complexes (E), and the final polymer (P). Calibrate
synthesis coefficients using real-time qPCR data and spectrophotometric yields obtained from
the wet lab.
| Mathematical |     | Framework: |     |     |     |     |     |     |     |
| ------------ | --- | ---------- | --- | --- | --- | --- | --- | --- | --- |
The rate of change of mRNA transcription and stability over time is governed by:
d[M]
|     |     |     |     | =   | α ·[DNA |          | ]−β | [M] | (1) |
| --- | --- | --- | --- | --- | ------- | -------- | --- | --- | --- |
|     |     |     | dt  |     | m       | promoter |     | m   |     |
The translation and accumulation of the γ-PGA synthesizing enzyme complex is modeled as:
d[E]
|     |     |     |     |     | =   | α [M]−β | [E] |     | (2) |
| --- | --- | --- | --- | --- | --- | ------- | --- | --- | --- |
|     |     |     |     |     |     | e       | e   |     |     |
dt
The extracellular accumulation of the biopolymer, assuming successful knockout of the native
| degradation | machinery | (k  | → 0), | is  | expressed | as: |     |     |     |
| ----------- | --------- | --- | ----- | --- | --------- | --- | --- | --- | --- |
deg
|     |     |     |     | d[P] | k cat | [E][S] |     |     |     |
| --- | --- | --- | --- | ---- | ----- | ------ | --- | --- | --- |
|     |     |     |     |      | =     |        | −k  | [P] | (3) |
deg
|     |     |     |     | dt  | K   | m +[S] |     |     |     |
| --- | --- | --- | --- | --- | --- | ------ | --- | --- | --- |
Where:
| • α | ,α are | the transcription |     | and | translation |     | rate constants. |     |     |
| --- | ------ | ----------------- | --- | --- | ----------- | --- | --------------- | --- | --- |
| m   | e      |                   |     |     |             |     |                 |     |     |
•
β m ,β e are the natural intracellular degradation rates of mRNA and enzymes.
•
k cat and K m represent the Michaelis-Menten kinetic constants of the biopolymer synthase.
•
[S] represents the concentration of available intracellular L-glutamate precursor.
1

2. Approach 2: Polymer Physics & Intermolecular Cross-linking Thermody-
namics
Summary: This model transitions from the molecular to the physical scale. It quantifies
how secreted γ-PGA polymers interact with moisture and divalent metal cations (Ca2+, Mg2+)
naturally embedded within desert sand to form a structural bio-cement hydrogel matrix.
How to execute: Model the binding mechanics as a surface-binding equilibrium (Langmuir
Isotherm) to determine cross-linking density. Pair this with affine network elasticity theories to
mathematically calculate how polymer concentration influences the material’s bulk resistance to
| structural   |     | shear | stress.    |     |     |     |     |     |
| ------------ | --- | ----- | ---------- | --- | --- | --- | --- | --- |
| Mathematical |     |       | Framework: |     |     |     |     |     |
The fractional saturation (θ) of coordination sites along the biopolymer chain by desert mineral
| cations |     | is modeled | via thermodynamic |     |     | equilibrium: |     |     |
| ------- | --- | ---------- | ----------------- | --- | --- | ------------ | --- | --- |
[C2+]
|     |     |     |     |     |     | θ =      |     | (4) |
| --- | --- | --- | --- | --- | --- | -------- | --- | --- |
|     |     |     |     |     |     | K +[C2+] |     |     |
d
The effective volumetric cross-link density (ν) of the newly formed biopolymer network inside
| the | porous | sand | matrix is | calculated | by: |          |          |     |
| --- | ------ | ---- | --------- | ---------- | --- | -------- | -------- | --- |
|     |        |      |           |            |     | (cid:18) | (cid:19) |     |
2M x
|     |     |     |     |     | ν = ρ | ·θ· | 1−  | (5) |
| --- | --- | --- | --- | --- | ----- | --- | --- | --- |
polymer
M n
Using classical rubber elasticity and polymer network mechanics, the theoretical shear modulus
(G) representing the mechanical structural integrity of the treated sand crust is evaluated as:
|     |     |     |     |     |     | G = νRT |     | (6) |
| --- | --- | --- | --- | --- | --- | ------- | --- | --- |
Where:
• [C2+]
|     |     | is the | local molar | concentration |     | of soil | divalent cations. |     |
| --- | --- | ------ | ----------- | ------------- | --- | ------- | ----------------- | --- |
•
K d isthedissociationconstantrepresentingthemolecularbindingaffinitybetweenγ-PGA
|     | and | the ions. |               |      |         |             |          |     |
| --- | --- | --------- | ------------- | ---- | ------- | ----------- | -------- | --- |
|     | • ρ | is        | the localized | mass | density | of secreted | polymer. |     |
polymer
• M and M represent the molecular weight between cross-links and the total number-
|     |         | x         | n      |     |             |        |     |     |
| --- | ------- | --------- | ------ | --- | ----------- | ------ | --- | --- |
|     | average | molecular | weight | of  | the polymer | chain. |     |     |
• R is the ideal gas constant, and T is the ambient desert surface temperature in Kelvin.
3. Approach 3: Aeolian Fluid Dynamics & Sand Erosion Thresholds
Summary: This model evaluates the macro-scale impact of the synthetic biology intervention
on wind erosion. It integrates fluid dynamics with soil physics to simulate how increasing sand
surface cohesion via the engineered biofilm raises the threshold wind speed required to initiate
a dust storm.
How to execute: Utilize a modified threshold friction velocity model derived from aeolian
physics. The dry lab inputs the cohesive forces calculated in Approach 2 (or measured by the
wetlab’spenetrationassays)tosimulateavirtualwindtunnel, provingthebiologicalmitigation
efficiency.
2

| Mathematical |     | Framework: |     |     |     |     |     |     |     |     |
| ------------ | --- | ---------- | --- | --- | --- | --- | --- | --- | --- | --- |
The baseline threshold friction velocity (u ) required to dislodge an untreated, completely dry
∗t0
| sand grain | of diameter |     | d   | is given | by the | classical | expression: |     |     |     |
| ---------- | ----------- | --- | --- | -------- | ------ | --------- | ----------- | --- | --- | --- |
(cid:114)
|     |     |     |     |     |     |       | ρ −ρ |      |     |     |
| --- | --- | --- | --- | --- | --- | ----- | ---- | ---- | --- | --- |
|     |     |     |     |     |     | u = A | s    | a gd |     | (7) |
∗t0
ρ
a
When the engineered B. subtilis biofilm introduces an added interparticle adhesive force, the
modified threshold friction velocity (u ) scales up according to the expanded cohesive-force
∗t
balance equation:
|     |     |     |     |     |     | (cid:114) ρ | −ρ  | γ       |     |     |
| --- | --- | --- | --- | --- | --- | ----------- | --- | ------- | --- | --- |
|     |     |     |     |     |     | s           | a   | biofilm |     |     |
|     |     |     |     |     | u = | A           | gd+ |         |     | (8) |
|     |     |     |     |     | ∗t  |             | ρ   | ρ d     |     |     |
|     |     |     |     |     |     |             | a   | a       |     |     |
The total mass flux (q) of sand saltation (lateral movement) swept up by crosswinds exceeding
| this threshold |     | is modeled |     | via the | fluid    | transport | equation:   |       |     |     |
| -------------- | --- | ---------- | --- | ------- | -------- | --------- | ----------- | ----- | --- | --- |
|                |     |            |     |         | (cid:40) | (cid:16)  | u2 (cid:17) |       |     |     |
|                |     |            |     |         | Cρau3    | 1−        | ∗t          | for u | > u |     |
|                |     |            |     |         |          | g ∗       | u2          | ∗     | ∗t  |     |
|                |     |            |     | q       | =        |           | ∗           |       |     | (9) |
|                |     |            |     |         | 0        |           |             | for u | ≤ u |     |
|                |     |            |     |         |          |           |             | ∗     | ∗t  |     |
Where:
• A is an empirical dimensionless parameter (≈ 0.11 for aerodynamic transport).
• ρ and ρ are the densities of the sand particles and ambient desert air respectively.
| s   |     | a   |     |     |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
• g is the acceleration due to gravity, and u is the actual friction velocity exerted by a
∗
| desert | wind | storm. |     |     |     |     |     |     |     |     |
| ------ | ---- | ------ | --- | --- | --- | --- | --- | --- | --- | --- |
• γ is the added cohesive parameter directly generated by the cross-linked γ-PGA
biofilm
network.
4. Approach 4: Ecological Spatial Dynamics & Biosafety Population Model-
ing
Summary: This model ensures ecological viability and safety. It simulates how the engineered
bacteria expand spatially through the porous sand network under real-world environmental
stressors (water loss, extreme heat) and incorporates a mathematical verification of the biocon-
| tainment | mechanism |     | (kill | switch). |     |     |     |     |     |     |
| -------- | --------- | --- | ----- | -------- | --- | --- | --- | --- | --- | --- |
How to execute: Build a macro-scale Reaction-Diffusion partial differential equation (PDE)
or an agent-based model. It tracks the physical expansion of the bacterial colony alongside
resource depletion and predicts population self-limitation once nutrients or specific induction
| factors      | run out. |            |     |     |     |     |     |     |     |     |
| ------------ | -------- | ---------- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mathematical |          | Framework: |     |     |     |     |     |     |     |     |
The spatial and temporal expansion of the engineered B. subtilis biomass (B) across a two-
| dimensional | sand | crust | environment |     | is  | defined | by:        |          |     |     |
| ----------- | ---- | ----- | ----------- | --- | --- | ------- | ---------- | -------- | --- | --- |
|             |      |       | ∂B          |     |     |         | (cid:18) N | (cid:19) |     |     |
∇2B+µ
|     |     |     |     | = D |     |     |      | B−K | (t)·B | (10) |
| --- | --- | --- | --- | --- | --- | --- | ---- | --- | ----- | ---- |
|     |     |     | ∂t  |     | B   | max | K +N |     | kill  |      |
N
Concurrently, the diffusion and localized consumption of the critical limiting desert nutrient or
| moisture | resource | (N) | is  | modeled | as:     |     |     |          |          |      |
| -------- | -------- | --- | --- | ------- | ------- | --- | --- | -------- | -------- | ---- |
|          |          |     |     |         |         |     |     | (cid:18) | (cid:19) |      |
|          |          |     |     | ∂N      |         |     | 1   | N        |          |      |
|          |          |     |     |         | = D ∇2N | −   | µ   |          | B        | (11) |
|          |          |     |     |         | N       |     | max |          |          |      |
|          |          |     |     | ∂t      |         | Y   |     | K        | +N       |      |
|          |          |     |     |         |         |     | B/N | N        |          |      |
3

Where:
•
D B ,D N are the diffusion coefficients of the bacterial cells and nutrients through porous
| sand | media. |     |     |     |     |     |     |     |
| ---- | ------ | --- | --- | --- | --- | --- | --- | --- |
• µ is the maximum specific growth rate of the engineered strain under optimal desert
max
conditions.
• Y is the yield coefficient of biomass produced per unit of nutrient consumed.
B/N
• K (t) is a time- or concentration-dependent death function representing the activation
kill
kinetics of the genetic safety kill switch when the bacteria escape the designated target
| application |     | zone. |     |     |     |     |     |     |
| ----------- | --- | ----- | --- | --- | --- | --- | --- | --- |
5. Metabolic Network Optimization via Flux Balance Analysis (FBA)
To rationally engineer Bacillus subtilis for optimal poly-gamma-glutamate (PGA) production,
we implemented a constraint-based mathematical modeling approach known as Flux Balance
Analysis (FBA). Unlike dynamic kinetic models that require complex, difficult-to-measure en-
zymatic rate constants, FBA calculates the steady-state flow of metabolites through a cellular
network to determine the absolute theoretical maximum yield of a target product.
| 5.1 Mathematical |     |     | Formulation |     |     |     |     |     |
| ---------------- | --- | --- | ----------- | --- | --- | --- | --- | --- |
The metabolic network is conceptualized as a system of interconnected reactions. The funda-
mental assumption of FBA is that the cell is operating at a pseudo-steady state, meaning the
concentration of internal metabolites does not change over time (production equals consump-
| tion). This | is             | represented | by     | the core | linear      | algebra | equation: |      |
| ----------- | -------------- | ----------- | ------ | -------- | ----------- | ------- | --------- | ---- |
|             |                |             |        |          | S           | ·v = 0  |           | (12) |
| Where       | the components |             | of the | system   | are defined | as      | follows:  |      |
•
S (Stoichiometric Matrix): An m×n matrix representing the biochemical blueprint
of the cell, where m is the number of metabolites and n is the number of reactions. Each
entry S represents the stoichiometric coefficient of metabolite i in reaction j.
ij
• v (Flux Vector): Ann×1columnvectorrepresentingtheunknownreactionrates(fluxes)
through every pathway in the network, measured in mmol·gDCW−1·h−1.
| 5.2 Defining |     | Constraints |     | and | the Objective |     | Function |     |
| ------------ | --- | ----------- | --- | --- | ------------- | --- | -------- | --- |
Becausethesystemisbiologicallyunderdetermined(therearemorereactionsthanmetabolites),
thereisaninfinitenumberofmathematicalsolutionstoS·v = 0. Tofindthebiologicallyrelevant
solution, we apply Linear Programming (LP) to optimize for a specific biological goal, such as
maximizing the synthesis of our target bio-glue precursor, L-glutamate.
| The complete |     | optimization | problem |     | is formulated | as:  |        |      |
| ------------ | --- | ------------ | ------- | --- | ------------- | ---- | ------ | ---- |
|              |     |              |         |     | Maximize      | Z =  | cTv    | (13) |
|              |     |              |         |     | Subject to    | S ·v | = 0    | (14) |
|              |     |              |         |     |               | lb ≤ | v ≤ ub | (15) |
4

Here, c is a vector of weights defining the objective function (e.g., placing a weight of 1 on
the precursor flux and 0 on all others). The variables lb and ub represent the lower and upper
| bounds of the | fluxes. |                 |     |                    |
| ------------- | ------- | --------------- | --- | ------------------ |
| 5.3 Bridging  | Dry     | Lab Predictions | and | Wet Lab Operations |
The true power of this FBA framework lies in its symbiosis with our wet lab experiments. The
bounds (lb and ub) are not arbitrary; they are physically constrained by empirical wet lab data:
1. Inputting Physical Constraints: The wet lab measures baseline external parameters,
such as the maximum glucose uptake rate or oxygen consumption rate in our bioreactors.
ThesevaluesarepluggedintotheFBAastheupperbounds(ub)oftheexchangereactions.
2. In Silico Gene Knockouts: By mathematically constraining specific internal reaction
| fluxes to | 0 (lb = ub | = 0), the FBA | simulates | a genetic knockout. |
| --------- | ---------- | ------------- | --------- | ------------------- |
3. Outputting actionable targets: The solver reroutes the metabolic flux to bypass the
knockout, revealing whether deleting a competing pathway (e.g., acetate overflow via
pta/ackA) mathematically forces the cell to redirect energy into PGA production.
Ultimately, this solver acts as a predictive compass, preventing months of trial-and-error in the
wet lab by providing precise, mathematically verified gene-editing targets that maximize our
| bio-cement yield. |     |     |     |     |
| ----------------- | --- | --- | --- | --- |
5

| 6. Model |     | Scope for | Calcium | Carbonate |     | Precipitation |     |     |     |     |     |     |
| -------- | --- | --------- | ------- | --------- | --- | ------------- | --- | --- | --- | --- | --- | --- |
Based on Lassin et al.the calcium carbonate model should be treated as a geochemical precipi-
tation model rather than a full biological or atomistic crystal-growth model. The paper is useful
because it represents calcium carbonate formation as a two-step process:
|     |     | aqueous | ions → amorphous |     | calcium | carbonate |     | (ACC) |     | → calcite |     |     |
| --- | --- | ------- | ---------------- | --- | ------- | --------- | --- | ----- | --- | --------- | --- | --- |
The model developed in the paper combines transition state theory (TST) with surface com-
plexation modeling (SCM) to describe the successive precipitation of ACC and calcite. In this
framework, ACC forms first and provides surface sites that can later support calcite formation.
| 6.1 Features |         | That | Can Be   | Included |        |     |     |     |     |     |     |     |
| ------------ | ------- | ---- | -------- | -------- | ------ | --- | --- | --- | --- | --- | --- | --- |
| Model        | Feature |      | Include? |          | Reason |     |     |     |     |     |     |     |
Calcium ion concentra- Yes The model should track dissolved calcium be-
| tion, | Ca2+ |     |     |     | cause | changes   | in  | Ca2+           | are | directly | linked | to cal- |
| ----- | ---- | --- | --- | --- | ----- | --------- | --- | -------------- | --- | -------- | ------ | ------- |
|       |      |     |     |     | cium  | carbonate |     | precipitation. |     |          |        |         |
Carbonate chemistry Yes Themodelcanincludethecarbonatesystem,in-
|     |     |     |     |     | cluding | dissolved |     | CO  | , bicarbonate |     | HCO−, | and |
| --- | --- | --- | --- | --- | ------- | --------- | --- | --- | ------------- | --- | ----- | --- |
|     |     |     |     |     |         |           |     |     | 2             |     |       | 3   |
CO2−.
carbonate
3
pH effects Yes, but pH can be included because it controls carbon-
|     |     |     | limited |     | ate    | speciation. |             | However,     |     | the model | should  | stay   |
| --- | --- | --- | ------- | --- | ------ | ----------- | ----------- | ------------ | --- | --------- | ------- | ------ |
|     |     |     |         |     | within | the         | approximate |              | pH  | range     | studied | in the |
|     |     |     |         |     | paper, | around      |             | pH 8.5–10.5. |     |           |         |        |
Supersaturation Yes The likelihood of precipitation depends on
|     |     |     |     |     | whether |     | the solution |            | is supersaturated |     |     | with re- |
| --- | --- | --- | --- | --- | ------- | --- | ------------ | ---------- | ----------------- | --- | --- | -------- |
|     |     |     |     |     | spect   | to  | calcium      | carbonate. |                   |     |     |          |
Amorphous calcium Yes ACC should be included as an intermediate
| carbonate |     | (ACC) |     |     | phase  | because |            | the paper | models |     | ACC | formation |
| --------- | --- | ----- | --- | --- | ------ | ------- | ---------- | --------- | ------ | --- | --- | --------- |
|           |     |       |     |     | before | calcite | formation. |           |        |     |     |           |
Calcite formation after Yes The model can represent calcite growth as a
| ACC |     |     |     |     | later | step | following |     | ACC | precipitation. |     |     |
| --- | --- | --- | --- | --- | ----- | ---- | --------- | --- | --- | -------------- | --- | --- |
ACC redissolution Yes ACC can redissolve if calcite precipitation con-
|     |     |     |     |     | sumes | dissolved |     | material |     | quickly | enough. |     |
| --- | --- | --- | --- | --- | ----- | --------- | --- | -------- | --- | ------- | ------- | --- |
Time-dependent precip- Yes Thepaperusesakineticmodel,sotheamountof
| itation |     |     |     |     | precipitated |     | calcium |       | carbonate |     | can be | modeled |
| ------- | --- | --- | --- | --- | ------------ | --- | ------- | ----- | --------- | --- | ------ | ------- |
|         |     |     |     |     | as changing  |     | over    | time. |           |     |        |         |
PHREEQC implemen- Yes PHREEQC can be used to simulate coupled so-
| tation |     |     |     |     | lution | chemistry, |     | kinetic | precipitation, |     |     | and sur- |
| ------ | --- | --- | --- | --- | ------ | ---------- | --- | ------- | -------------- | --- | --- | -------- |
|        |     |     |     |     | face   | reactions. |     |         |                |     |     |          |
Simple flow or pore- Maybe Flow can be included only in a simplified way,
scale transport especially if the model is being applied to sand
|     |     |     |     |     | pores | or  | microfluidic-style |     |     | systems. |     |     |
| --- | --- | --- | --- | --- | ----- | --- | ------------------ | --- | --- | -------- | --- | --- |
Table 1: Features that can be included in the calcium carbonate precipitation model based on
| Lassin et | al.   |           |     |     |     |     |     |     |     |     |     |     |
| --------- | ----- | --------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 6.2       | Model | Structure |     |     |     |     |     |     |     |     |     |     |
| The model | can   | be framed | as: |     |     |     |     |     |     |     |     |     |
6

pH+[Ca2+]+[CO2−] → saturation index → ACC precipitation → calcite formation
3
| The main | precipitation | reaction | is:              |     |
| -------- | ------------- | -------- | ---------------- | --- |
|          |               |          | Ca2++CO2− ⇌ CaCO | (s) |
3
3
| The saturation | ratio can | be written | as: |     |
| -------------- | --------- | ---------- | --- | --- |
[Ca2+][CO2−]
|     |     |     | Ω = | 3   |
| --- | --- | --- | --- | --- |
K
sp
| The saturation | index | is: |              |     |
| -------------- | ----- | --- | ------------ | --- |
|                |       |     | SI = log (Ω) |     |
10
where:
SI < 0
| indicates | that calcite | tends to dissolve, |     |     |
| --------- | ------------ | ------------------ | --- | --- |
SI = 0
| indicates | equilibrium, | and |     |     |
| --------- | ------------ | --- | --- | --- |
SI > 0
| indicates | that calcite | precipitation | is thermodynamically | possible. |
| --------- | ------------ | ------------- | -------------------- | --------- |
| 6.3 Model | Limitation   | Statement     |                      |           |
This model can represent the geochemical side of calcium carbonate precipitation, including
pH-dependent carbonate speciation, calcium availability, supersaturation, ACC formation, and
later calcite growth. However, based on Lassin et al., the model should be limited to simplified
Ca–Na–Cl–CO 2 –H 2 OchemistryaroundpH8.5–10.5(tbhmostcalciteformsatthisphanyway..)
and approximately 25◦C. It should not be treated as a complete biological MICP model be-
cause it does not include bacterial metabolism, EPS effects, carbonic anhydrase kinetics, biofilm
| transport, | or mechanical | sand-crust | strength. |     |
| ---------- | ------------- | ---------- | --------- | --- |
| 6.4 Use    | in the DryLab |            |           |     |
For the DryLab model, this paper is best used as the calcium carbonate precipitation chemistry
layer. The output of the geochemical model can then be connected to graphics. CrystalMaker/
CrystalGen can be used to visualize the final calcite structure, but it should not be used as the
| main tool  | for calculating | pH-dependent | precipitation. |     |
| ---------- | --------------- | ------------ | -------------- | --- |
| PHREEQC-V3 | was used        | for the      | calcualtions   |     |
https://www.sciencedirect.com/science/article/pii/S0016703718304770
7

https://www.nature.com/articles/s41598-025-15531-6
https://web.stanford.edu/ wyun/Digital ibrary/11−6−2017 actors
L F
https://journals.asm.org/doi/10.1128/aem.01794-22?utm ource = chatgpt.com
s
8
