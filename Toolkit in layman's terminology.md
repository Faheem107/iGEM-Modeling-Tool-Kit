**Toolkit in layman's terminology** 

* (I’m thinking we can add these comments to each bolded word I put. What do you think?)  
* Some of the tabs are redundant and found in all 3, maybe we can combine that into a common space? 

**Prong 1 and common Y-PGA**

1. **Flux Balance analysis**  

**Overview (Maybe towards the end of the page):** This dashboard models how bacteria distribute nutrients between growth and γ-PGA production. We control glucose and oxygen availability, choose whether the cell should prioritize growth or γ-PGA, and then the model predicts the best possible metabolic behavior. The main graph shows that there is a tradeoff: faster growth usually means lower γ-PGA production, while higher γ-PGA production means slower growth. The model also lets us test gene knockouts virtually, so we can see whether removing certain pathways would reduce wasted carbon and redirect more resources toward γ-PGA. Instead of testing every condition in the lab first, the model helps us predict what the cell is likely to do under different limits. This helped us choose better engineering strategies before testing them out experimentally. 

**Constraint bounds and objectives:**   
The sliders on the left control the environment of the cell. The glucose slider controls how much sugar the bacteria can take in, and the oxygen slider controls how much oxygen is available for respiration. These limits matter because the cell has to decide how to distribute its carbon and energy. Some carbon can go toward biomass, meaning growth, and some carbon can go toward making γ-PGA.

**The objective button** tells the model what we want the bacteria to prioritize. So if the model is set to maximize γ-PGA, it is asking: “What is the highest amount of γ-PGA the cell can make under these conditions?”

The **Production Envelope — Growth ↔ γ-PGA Pareto Front** graph shows the tradeoff between bacterial growth and γ-PGA production.

The x-axis shows the growth rate. The y-axis shows γ-PGA production. The downward line means the bacteria cannot maximize both at the same time. If more resources go toward growth, fewer resources are available for γ-PGA. If more resources go toward γ-PGA, growth becomes slower.

The orange point shows the current predicted operating point. If the model is set to **Max γ-PGA**, the point is closer to the high-production side of the graph.

The **Optimal Flux Distribution (PFBA)** graph shows how carbon is predicted to flow through different metabolic pathways.

“Flux” means the rate at which material moves through a reaction or pathway. Larger bars mean that pathway is being used more heavily. This graph helps us see which parts of metabolism are most active when the model is trying to maximize γ-PGA.

**PFBA**, or parsimonious flux balance analysis, gives the most efficient solution by finding a flux pattern that achieves the objective while avoiding unnecessary metabolic activity.

The **Flux Variability (At Optimum)** panel shows how flexible each pathway is while still achieving the same optimal result.

If a pathway has a wide range, it means the cell has multiple possible ways to use that pathway and still reach the objective. If the range is very narrow, it means the pathway is fixed and may be important or limiting.

The **In-Silico Gene Knockouts** section lets us simulate genetic changes. A gene knockout means removing or disabling a gene so that a specific metabolic pathway is reduced or blocked.

For example, **Δpta** is linked to acetate overflow. Acetate overflow is a pathway where carbon can be wasted as acetate instead of being used for growth or γ-PGA production. By simulating this knockout, we can test whether blocking that pathway helps keep more carbon available for the desired product.

This is useful because it lets us compare different engineering strategies computationally before deciding which ones are worth testing in the lab.

The **Max Growth μ** card shows the highest possible growth rate under the current glucose and oxygen limits.

The **Max γ-PGA Flux** card shows the highest predicted γ-PGA production rate.

The **Precursor → ODE \[S\]** card shows the predicted precursor concentration that can be passed into the kinetic model. This connects the metabolic model to a more dynamic model of γ-PGA production.

The **Acetate Overflow** card shows whether carbon is being wasted as acetate. In this screenshot, acetate overflow is 0.000, which suggests that the model is not predicting carbon loss through acetate under this condition.

2. **Intracellular γ-PGA Kinetics**

**Overview:** The Intracellular γ-PGA Kinetics page models how γ-PGA production changes over time inside the bacteria. It follows the biological steps from transcription to translation, to enzyme activity, and finally to γ-PGA accumulation. The sliders let us control how fast mRNA is made, how quickly it degrades, how much enzyme is produced, how stable that enzyme is, and how efficiently the enzyme converts L-glutamate into γ-PGA. The Real-Time Concentration Dynamics graph shows that mRNA appears first, enzyme builds up after that, and γ-PGA accumulates more strongly once enough enzyme is present. The Gene Knockout Status section lets us simulate removing genes that may reduce product accumulation. Finally, the Wet Lab Calibration Interface allows experimental γ-PGA yield to be used to adjust the model, so the dry-lab prediction becomes closer to the actual wet-lab result.

 **Intracellular Kinetic Control Unit**   
 The **Intracellular Kinetic Control Unit** lets us control the biological steps that lead to γ-PGA production.

The **Transcription Rate (α\_m)** controls how quickly the gene is copied into mRNA. In simple terms, it controls how strongly the cell is “turning on” the γ-PGA production instructions.

The **mRNA Degradation Rate (β\_m)** controls how quickly that mRNA breaks down. If mRNA breaks down too fast, the cell has less time to use it to make enzymes.

The **Enzyme Translation Rate (α\_e)** controls how quickly the cell turns mRNA into enzyme. This matters because enzymes are what actually drive the production of γ-PGA.

The **Enzyme Degradation Rate (β\_e)** controls how quickly the enzyme breaks down inside the cell. If the enzyme is stable for longer, it can keep producing γ-PGA for more time.

The **Catalytic Efficiency (k\_cat)** controls how fast the enzyme converts the precursor into γ-PGA. A higher **k\_cat** means the enzyme is more efficient.

The **L-Glutamate Precursor (\[S\])** slider controls how much starting material is available. γ-PGA is made from glutamate units, so the amount of available L-glutamate affects how much γ-PGA can be produced.

**Gene Knockout Status**

The **Gene Knockout Status** section shows which genes are being removed or turned off in the simulation. This allows us to test whether stopping certain breakdown pathways helps the bacteria keep more of the product we want.

**Real-Time Concentration Dynamics**

The **Real-Time Concentration Dynamics** graph shows how mRNA, enzyme, and γ-PGA change over 48 hours.

The **mRNA** curve rises first because the cell has to make the genetic message before it can make the enzyme.

The **Enzyme Complex** curve rises after that because enzyme production depends on mRNA being present.

The **γ-PGA Output** curve starts slowly, then increases more rapidly later. This makes sense biologically: the cell cannot produce much γ-PGA until enough enzyme has accumulated.

**iGEM Wet Lab Calibration Interface**

The **iGEM Wet Lab Calibration Interface** connects the dry-lab model to wet-lab experimental results.

The experimental yield value lets us enter the amount of γ-PGA measured in the lab. Then the **Calibrate k\_cat** button adjusts the model’s enzyme efficiency so that the simulation better matches the real experimental data.

3. **Protein Thermal Stability**

**Overview**

 This page checks whether the protein or enzyme system would stay functional under soil-like environmental conditions. In simple terms, even if the bacteria can make γ-PGA, the proteins involved still need to keep their correct shape. If the temperature, pH, or salinity becomes too stressful, the protein can unfold, lose activity, and stop supporting γ-PGA production or soil binding. 

This model uses **two-state folding thermodynamics**, meaning it simplifies the protein into two main states: folded and active, or unfolded and inactive. The goal is to predict whether the protein scaffold is still stable enough to work in the target environment.

Soil Micro-Climate Inputs

The **Soil Micro-Climate Inputs** panel lets us adjust the environmental conditions that the protein would experience in soil.

Operative Folding Curve  
 The **Operative Folding Curve** shows how much of the protein remains folded as temperature increases.

The y-axis represents the fraction of protein that is folded and active. The x-axis represents temperature. At lower temperatures, the curve stays near the top, meaning the protein is mostly folded and active. As temperature gets closer to the melting point, the curve drops sharply, meaning the protein begins to unfold and lose function.

**Folding Half-Life State**  
 The **Folding Half-Life State** shows the predicted percentage of protein that remains folded and functional under the selected conditions.

4. **3D Crystallographic Protein Imager**

**Overview**  
 This page is a 3D protein structure viewer. It lets us visually inspect the shape of the enzyme or protein scaffold used in the system. Instead of only looking at equations or production numbers, this page shows the actual folded structure of the protein in space.

The main purpose is to understand whether the protein has the structural features needed for function, such as folded helices, beta sheets, connecting loops, and possible active-site regions. This helps connect the model to the real biological structure of the enzyme.

The **3D Crystallographic Protein Imager** is the main viewing window. It displays the protein as a folded 3D structure that can be rotated and zoomed into.

**Load PDB File**  
 The **Load PDB File** button allows us to upload a protein structure file.

A **PDB file** is a standard file format used to store the 3D structure of a protein. It tells the viewer where different parts of the protein are located in space. Once loaded, the protein can be displayed and inspected.

The **Cartoon Mode Enabled** setting means the protein is shown as a simplified ribbon model instead of showing every atom.

**Viewer Customization**  
 The **Viewer Customization** panel controls how the protein is displayed.

The **Color Theme** setting changes how different parts of the protein are colored.

The **Backbone Style** setting changes how the protein backbone is represented. 

The **Docked Active-Site Ligands** option would show or hide small molecules bound to the protein, such as a substrate, cofactor, or simulated ligand. 

**Secondary Residue Folds**  
 The **Secondary Residue Folds** section explains the main structural features shown in the protein.

**Enzymatic Alpha-Helix Coils** are spiral-shaped regions of the protein. These are common structural elements that can help stabilize the protein and may contain important catalytic residues.

**Pleated Beta-Sheet Arrows** are flatter, arrow-like regions. Beta sheets often form stable protein cores and can help maintain the overall scaffold.

**Active Site Connective Loops** are flexible connecting regions between helices and sheets. Loops are often important because they can help shape the active site or position residues needed for enzyme activity.

5. **γ-PGA Ca²⁺ Cross-Linking**

**Overview**  
This **γ-PGA Ca²⁺ Cross-Linking** page models how the γ-PGA made by bacteria can stabilize sand after it is secreted. γ-PGA has negatively charged groups along its polymer chain, and calcium ions, **Ca²⁺**, can bridge these chains together. This creates a cross-linked gel network around quartz or SiO₂ sand grains. The **Bio-Cementation Cross-Link Settings** let us control calcium availability, calcium-binding strength, polymer concentration, temperature, polymer length, and cross-linking properties. The **Quartz/SiO₂ Sand Gels Undergoing Coordinate Chelation** visual shows how calcium-linked γ-PGA chains can trap sand particles inside a flexible matrix. The **Lattice Telemetry** panel then converts this molecular binding into material outputs, such as cross-link density and shear stiffness.

**Shear Modulus G \= νRT**

The page connects network density to material strength using **Shear Modulus G \= νRT**.

Here, **G** is the shear modulus, or stiffness of the gel. **ν** represents the density of cross-links in the network. **R** is the gas constant, and **T** is temperature.

**Bio-Cementation Cross-Link Settings**  
 The **Bio-Cementation Cross-Link Settings** panel controls the main physical and chemical inputs that affect how strongly the γ-PGA network forms.

The **Interconnect With Secretion Yield** option connects this page to the earlier γ-PGA production model. When this is turned on, the polymer concentration used here depends on how much γ-PGA the bacteria are predicted to secrete.

The **Soil Cation Saturation (\[Ca²⁺\])** slider controls how much calcium is available in the soil. Calcium is needed because it acts as the molecular bridge between γ-PGA chains. If there is too little calcium, fewer bridges form, and the gel network is weaker.

The **Dissociation Affinity Constant (Kd)** describes how tightly calcium binds to γ-PGA. A lower **Kd** means stronger binding. Stronger binding usually means a more stable cross-linked network.

The **Polymer Matrix Concentration (ρ\_poly)** shows how much γ-PGA polymer is present in the material. Higher polymer concentration usually means more chains are available to connect, so the gel network can become denser and stronger.

The **Environmental Temp (T)** slider controls temperature. Temperature matters because molecular motion and material stiffness depend on temperature.

The **Cross-Link Wt (Mx)** and **Polymer Length (Mn)** values describe properties of the polymer network. These affect how many connections can form and how the γ-PGA chains behave mechanically.

**Quartz/SiO₂ Sand Gels Undergoing Coordinate Chelation**  
 The **Quartz/SiO₂ Sand Gels Undergoing Coordinate Chelation** section explains the mechanism visually.

The brown spheres represent quartz or SiO₂ sand grains. The blue and green lines represent γ-PGA polymer chains around the sand. The small connection points represent calcium-mediated links between chains. So γ-PGA acts like the net, calcium acts like the knots, and the sand grains get held inside the net.

**Lattice Telemetry**  
 The **Lattice Telemetry** panel summarizes the predicted structure and strength of the gel network.

The **Saturation Density (θ)** the fraction of the possible calcium-binding sites occupied under the current settings.

The **Peptidic Crosslinks** value estimates how many γ-PGA cross-links are present in the network. 

The **Shear Stiffness (Gs)** Shear stiffness measures how resistant the material is to deformation. So a higher shear stiffness suggests the sand-polymer structure may better resist erosion or movement.

6. **Ecological Spread & Kill Switch**

**Overview**  
 This page models how engineered bacteria might spread through sand, produce γ-PGA bio-cement, and then stop growing once the environment becomes unsuitable. In simpler terms, it is asking: “Can the bacteria cover enough sand to form a stabilizing crust, while still being biologically contained?”

This page connects the production model to environmental behavior. The bacteria do not just make γ-PGA inside a flask; they would need to survive briefly in sand, spread through available moisture, secrete the biopolymer, and then shut down when the moisture becomes too low.

**Biosafety & Spread Controls**  
 The **Biosafety & Spread Controls** panel sets the rules for bacterial movement, secretion, and containment.

The **Link Growth Speed to Secretion** option connects bacterial spread to γ-PGA production. When this is turned on, bacteria that produce more γ-PGA are also modeled as spreading moisture or colonizing sand more effectively. This matters because γ-PGA can help retain moisture and support local biofilm formation.

**Inoculation Pattern**

 The **Inoculation Pattern** controls where the bacteria are first placed in the sand simulation.

**Center** means bacteria begin from the middle and spread outward.

**Corners** means bacteria begin from multiple edges.  
**Random** means bacteria are placed in scattered locations.

**Moisture Spread Probability**  
The **Moisture Spread Probability** controls how likely moisture and bacterial activity are to spread from one area of sand to nearby areas.

Moisture is important because bacteria need water to remain active. If moisture spreads well, bacteria can continue producing γ-PGA across a larger area. If moisture is limited, growth slows down and the kill switch becomes more relevant.

**Water Consumption Efficiency**

The **Water Consumption Efficiency** setting controls how quickly the system uses up available water.

**Simulation Grid Density**

The **Simulation Grid Density** controls the resolution of the simulation.

**Genetic Containment Validation**  
 The **Genetic Containment Validation** section represents the biosafety logic of the system.

The model assumes that when moisture drops below a safe threshold, the engineered bacteria lose viability.

The **Active Population** value shows the percentage of bacteria that are still active. 

The **Biofilm Sand Crust** value shows how much crust has formed.

**Microscopic Population Sandbox**  
 The **Microscopic Population Sandbox** is the main simulation area. It visually shows how bacteria spread through the sand grid over time.

**Coarse Desert Sand** represents untreated sand.  
 **Active Bacillus** represents living bacteria that are still growing or secreting γ-PGA.  
 **PGA Bio-cement** represents areas where γ-PGA has accumulated and helped form a crust.  
 **Terminated** represents cells that are no longer active because the containment condition has been triggered.

The **Re-seed** button restarts the simulation with a new bacterial placement.  
 The **Step** button advances the simulation one frame at a time.  
 The **Start Growth** button runs the spread simulation continuously.

The **Moisture Level** bar shows how much water is still available in the simulated sand environment.

**Crust Formation**  
 The **Crust Formation** bar shows how much of the sand grid has been stabilized by γ-PGA bio-cement.

7. **Aeolian Wind Tunnel**

**Overview**  
 This page tests whether the γ-PGA bio-crust can protect sand from wind erosion. It compares untreated sand with bio-crusted sand under a simulated wind storm. The goal is to see whether the crust increases the wind speed needed to move sand particles.

**Boundary Configuration Presets**  
 The **Boundary Configuration Presets** control the wind tunnel conditions.

The **Simulated Wind Speed** sets how strong the wind is. 

The **Bio-Crust Thickness** controls how thick the protective γ-PGA sand crust is. A thicker crust should usually make the sand harder to dislodge.

The **Polymer Shear Modulus (Gs)** measures how stiff the γ-PGA material is. Higher stiffness means the crust should resist deformation and erosion better.

The **Intrinsic Biophysics Link Active** means this page is connected to the earlier protein and cross-linking models, so the crust strength is not random; it depends on the predicted material properties.

**Aeolian Shear Profile**  The **Aeolian Shear Profile** summarizes whether the wind is strong enough to move the sand.

The **Untreated Lift** value is the wind speed needed to move untreated sand.

The **Biodegradable Threshold** is the wind speed needed to move the treated bio-crusted sand.

**Interactive Cumulative Erosion Tracker** The **Interactive Cumulative Erosion Tracker** compares erosion over a 15-second simulated storm.

The untreated sand is the control group. The bio-crusted sand is the treated group. When the **Initiate Wind Tunnel Test** button is pressed, the graph should show which sample loses more particles over time.

**Particle Boundary Aerodynamics Viewport** The **Particle Boundary Aerodynamics Viewport** visually shows how sand particles behave under wind flow.

**Panel B // Wet Lab Directives** turns the model results into experimental instructions.

The **Cultivation Period** is 72 hours, meaning the bacteria should be grown or allowed to produce γ-PGA for this amount of time before testing.

The **Required Spray Density** is 424 mL/m², indicating the predicted amount of treatment needed per square meter of sand.

The **Wind Survival Rating** says **Micro-Erosion Active**, meaning small-scale erosion may still happen, but the treated sand is more resistant than the control.

8. **Wet-Lab Parameter Registry & Storm Simulation**

Overview   
This page takes wet-lab values and translates them into a wind-erosion prediction. The **Lab Parameter Registry** sets the biological inputs, including cell density, glutamate, calcium, and temperature. These values predict γ-PGA yield and gel stiffness. The **Storm Simulation** then compares bare sand with bio-stabilized sand under wind stress. In this example, bare sand shows 8% erosion, while treated sand shows 0% erosion, suggesting that the γ-PGA-calcium matrix improves sand stability.

**Lab Parameter Registry**  
 The **Lab Parameter Registry** controls the experimental conditions.

**Inoculum Cell Density (OD600)** estimates how many bacterial cells are added. Higher OD600 generally means more cells, which can increase biofilm and γ-PGA production.

**Inoculation Volume** controls how much bacterial culture is added to the soil.

**L-Glutamate Substrate Feed** provides the building block for γ-PGA production. More available glutamate can increase predicted γ-PGA yield.

**Ca²⁺ Salinity Additive** provides calcium ions. Calcium helps cross-link γ-PGA chains, making the polymer network stronger.

**Incubation Temperature** controls the growth and production environment.

**Storm Simulation**  
 The **Storm Simulation** tests whether the treated sand can resist wind stress.

**Custom Wind Friction Speed (u\*)** represents the wind force acting on the sand surface. If this value is higher than the sand’s critical threshold, erosion is expected.

**Control vs Treated Map**  
 The visual grid compares bare sand and bio-stabilized sand.

**Control (Bare Sand)** shows 8% erosion, meaning untreated sand is losing particles.

**Treated (Bio-Stabilized)** shows 0% erosion, meaning the γ-PGA-treated area is predicted to stay protected under this condition.

**Output Values**  
 **Calculated Modulus (Gs)** \= 1072 Pa. This means the treated sand matrix is predicted to be relatively stiff.

**Yield Target (PGA)** \= 59.5 g/L. This is the predicted γ-PGA production target.

**Critical Friction (u\*t)** \= 0.19 m/s. This is the wind-friction limit where sand begins to move.

**Wet-Lab Context**  
 The **Wet-Lab Context** explains the biological logic: engineered Bacillus subtilis produces γ-PGA, L-glutamate supports γ-PGA yield, and calcium helps γ-PGA form a stronger cross-linked matrix.

“Higher OD600 guarantees dense biofilm” can be changed to “higher OD600 can support denser biofilm formation, assuming cells remain viable and nutrients are sufficient.”

**Bio-Physical Math Models**  
 The **Temperature Viability** model reduces predicted yield when the temperature moves away from the ideal 37°C.

The **Salinity Saturation** model estimates how much calcium binding occurs. More calcium increases cross-linking until the binding sites start to saturate.

The **Sand Shear Modulus Gs** model converts γ-PGA yield and calcium cross-linking into material stiffness.

The **Threshold Windspeed u\*t** model estimates the wind force needed before the treated sand starts eroding.

**Prong 2** 

**Calcium carbonate** 

**2\. Carbonic Anhydrase Display**

**Overview** 

This Carbonic Anhydrase Display page compares two methods for displaying carbonic anhydrase on the bacterial surface: Sortase-mediated ligation and LytE-CWBD binding. The model checks whether CA is exported, whether it forms its active enzyme structure, and whether it successfully anchors to the cell surface. The Route Comparison graph shows that sortase-mediated ligation gives a higher overall display efficiency, 27.3% compared with 22.7%. This means sortase is predicted to place more functional CA on the surface, making it the better route for supporting CaCO₃ precipitation.

**Anchoring & Display Efficiencies**

**Signal-peptide export** shows how well CA is moved out of the cell and toward the surface. Here, export efficiency is 70%.

**CA dimerization** shows how much CA forms the active enzyme structure. This matters because CA needs the correct form to function well.

**Sortase ligation** shows how efficiently CA is attached using the sortase-mediated surface anchoring route.

**LytE-CWBD binding** shows how efficiently CA attaches using a cell-wall binding motif instead.

**Route Comparison — Sortase vs Binding Motif**  
 The **Route Comparison — Sortase vs Binding Motif** graph compares both display strategies across each step: export, dimerization, anchoring, and overall success.

**5\. CaCO₃ Precipitation → UCS**

**Overview** 

This CaCO₃ Precipitation → UCS page models whether calcium carbonate can form in the treated sand and whether it improves strength. The Geochemical Reactor Controls set calcium, dissolved carbon, pH, and carbonic anhydrase activity. The Carbonate Speciation graph shows how pH controls the carbonate forms available for precipitation. The Precipitation Kinetics graph shows calcite forming over 48 hours, while the Biocement Strength Curve connects calcite content to sand strength. In this example, calcite content is still very low, so the model predicts little compressive strength, even though some CO₂ is being captured.

**Geochemical Reactor Controls**  
 The **Geochemical Reactor Controls** set the chemical environment.

**Dissolved Ca²⁺** controls how much calcium is available. Calcium is one of the main ingredients needed to form CaCO₃.

**Max DIC Capacity** controls dissolved inorganic carbon, which represents the available carbon source for carbonate formation.

**Solution pH** controls which carbonate species are present. Higher pH usually favors carbonate ions, which are needed for CaCO₃ precipitation.

**Carbonic Anhydrase Activity** represents how strongly the enzyme helps convert CO₂ into bicarbonate/carbonate forms. Higher activity can support faster carbonate chemistry.

**Carbonate Speciation (Bjerrum)**  
 The **Carbonate Speciation (Bjerrum)** graph shows which carbon forms are dominant at different pH values.

The **Precipitation Kinetics** graph shows how calcium, amorphous calcium carbonate, and calcite change over 48 hours.

The **Biocement Strength Curve** links calcite percentage to material strength.

As calcite content increases, the predicted **UCS** increases. This means more calcite should make the sand more cemented and mechanically stronger.

**Output Summary Cards**  
 **Calcite Content** is 0.15 wt%, meaning only a small amount of calcite is predicted.

**Saturation Index** says undersaturated, meaning the current chemical conditions are not strongly favorable for precipitation.

**Unconfined Compressive Strength** is 0.00 MPa, so the current calcite amount is too low to give meaningful strength.

**CO₂ Sequestered** is 1.10 g/L, meaning the model predicts some CO₂ capture through the carbonate pathway.

**Prong 3** 

**Sodium Alginate**

**Overview**

This page models an alginate-based sand treatment. This uses commercial sodium alginate sprayed directly onto sand, so no bacteria are required. Calcium ions, **Ca²⁺**, cross-link the alginate chains and turn them into a gel-like network. This gel can help hold sand particles together, retain moisture, and reduce erosion, but it may weaken after repeated rain or wetting cycles.

The **Applied Alginate Treatment** panel controls the material conditions.

**Applied Alginate** controls how much alginate polymer is sprayed onto the sand. More alginate usually means more gel-forming material is available.

**Ca²⁺ Crosslinker** controls how much calcium is added. Calcium connects alginate chains together through “egg-box” junctions, which makes the gel stronger.

**Egg-Box Gelation vs Ca²⁺**  
 The **Egg-Box Gelation vs Ca²⁺** graph shows how gel strength changes as calcium increases.

adding more calcium greatly increases cross-linking and gel formation. After a certain point, the curve levels off because most available binding sites are already occupied. This means extra calcium gives smaller improvements once the gel is close to saturation.

The **Moisture Retention vs Humidity** graph shows how much water the alginate gel can hold at different humidity levels.

The **Rain Washout Durability** graph shows how the alginate treatment weakens over repeated wet cycles.

**12\. Composite Strength Synthesis**

**Overview**

The model calculates the simple added cohesion, subtracts any negative interaction between materials, and gives a final Composite Cohesion of 66.3 mN/m. The Cohesion Contribution by Prong graph shows that alginate and γ-PGA provide most of the stabilization, while CaCO₃ contributes little in this condition. The Failure-Mode Robustness chart shows that the combined treatment is more reliable because different materials protect the sand under different failure scenarios.

**Additive Cohesion** is the simple total strength if we add the individual contributions from each material. 

**Interaction Term** shows whether the materials help or interfere with each other. There is slight competition between components rather than perfect synergy.

**Composite Cohesion** is the final predicted cohesion after accounting for both individual strength and interactions. 

**Synergy** is **\-4%**, meaning the combined system performs slightly below the simple sum of its parts. The materials overlap or compete slightly in how they strengthen the sand.

**Cohesion Contribution by Prong** shows which material contributes most to sand binding. In this example, **alginate** contributes the most, **γ-PGA** also contributes strongly, and **CaCO₃** contributes very little or none under the current conditions. CHANGE THIS TO \- CaCO3 contributes the most. 

**Failure-Mode Robustness** shows how well each strategy performs under different stresses, such as **drought/heat**, **flood/rain**, **bacterial death**, **high wind**, and **long-term durability**.

