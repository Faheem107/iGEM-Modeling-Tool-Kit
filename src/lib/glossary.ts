/**
 * Sandyx Glossary, plain-language explanations
 * =============================================
 * Every complex term or concept surfaced in the toolkit is explained here in the
 * layman voice of "Toolkit in layman's terminology.md". The Sandyx companion reads from
 * this single source: underline a term anywhere with <Term k="..."> and dropping Sandyx on
 * it (or tapping it) opens the matching explanation.
 *
 * Keep definitions short, plain, and scientifically honest, they render inside a pop-up.
 */

export interface GlossaryEntry {
  /** Display heading for the pop-up. */
  title: string;
  /** Plain-language explanation (1–3 short sentences), "what this means". */
  plain: string;
  /** Grouping label shown as a chip. */
  category: string;
  /** Optional: which module the concept lives in. */
  module?: string;
  /** Optional: "how we got it", the concentrations + calculation behind a headline value. */
  derivation?: string;
  /**
   * Optional: module ids to jump to (rendered as a button in the pop-up). The first id whose
   * `#mod-<id>` section exists on the page wins, so a single value can fall back across
   * combination-specific modules.
   */
  jumpTo?: string[];
  /** Optional: label for the jump button. */
  jumpLabel?: string;
}

/**
 * Canonical entries keyed by a stable slug. Prefer lowercase-hyphen slugs, but human-readable
 * keys are fine too, lookups are normalized (case/space/punctuation-insensitive) and the
 * ALIASES map below routes alternate spellings to a canonical key.
 */
export const GLOSSARY: Record<string, GlossaryEntry> = {
  // ---- Prong 1 · γ-PGA & shared metabolism ---------------------------------
  "flux-balance-analysis": {
    title: "Flux Balance Analysis (FBA)",
    plain:
      "A way to predict how bacteria split their nutrients between growing and making γ-PGA. Instead of testing every condition in the lab, the model solves the steady-state balance S·v = 0 (what goes into each reaction must come out) and tells us the best the cell can do under the glucose and oxygen limits we set.",
    category: "Metabolic Modeling",
    module: "Flux Balance Analysis",
  },
  flux: {
    title: "Flux",
    plain:
      "The rate at which material moves through a metabolic reaction or pathway. In the flux charts, bigger bars mean that pathway is carrying more traffic.",
    category: "Metabolic Modeling",
  },
  pfba: {
    title: "Parsimonious FBA (pFBA)",
    plain:
      "The most efficient FBA solution: it hits the objective (say, maximum γ-PGA) while using the least total metabolic activity, so the cell isn't predicted to waste effort on unnecessary reactions.",
    category: "Metabolic Modeling",
  },
  fva: {
    title: "Flux Variability Analysis (FVA)",
    plain:
      "Shows how much wiggle-room each pathway has while still reaching the same optimal result. A wide range means the cell has several ways to use that pathway. A narrow range means it is pinned down, which usually means it matters.",
    category: "Metabolic Modeling",
  },
  "objective-function": {
    title: "Objective",
    plain:
      'What we ask the model to prioritize. "Maximize γ-PGA" asks: what is the most γ-PGA the cell could make under these conditions? "Maximize growth" asks the same for biomass.',
    category: "Metabolic Modeling",
  },
  "production-envelope": {
    title: "Production Envelope (Pareto Front)",
    plain:
      "The trade-off curve between growth and γ-PGA. It slopes downward because the cell cannot maximize both at once, more carbon toward growth means less toward γ-PGA, and vice-versa. The orange dot is the current predicted operating point.",
    category: "Metabolic Modeling",
  },
  "growth-rate": {
    title: "Growth Rate (µ)",
    plain:
      "How fast the bacterial population expands, in units of per-hour. Higher µ means faster growth, which usually leaves fewer resources for γ-PGA.",
    category: "Metabolic Modeling",
  },
  biomass: {
    title: "Biomass",
    plain:
      "The material the cell builds to grow and divide (new cells). Carbon spent on biomass is carbon not spent on γ-PGA.",
    category: "Metabolic Modeling",
  },
  "gene-knockout": {
    title: "In-Silico Gene Knockout",
    plain:
      "Removing or disabling a gene in the model so a specific pathway is blocked. It lets us test an engineering strategy on the computer before deciding whether it is worth trying in the lab.",
    category: "Genetics",
  },
  "acetate-overflow": {
    title: "Acetate Overflow",
    plain:
      'A pathway where carbon is "wasted" as acetate instead of going to growth or γ-PGA. Knocking out Δpta blocks it, keeping more carbon for the product we want. A value of 0 means no carbon is being lost this way.',
    category: "Metabolic Modeling",
  },
  precursor: {
    title: "Precursor [S]",
    plain:
      "The starting material the enzyme turns into product. Here it is L-glutamate, the building block of γ-PGA. The FBA model hands a predicted precursor concentration to the time-based kinetic model.",
    category: "Metabolic Modeling",
  },
  "gamma-pga": {
    title: "Poly-γ-Glutamic Acid (γ-PGA)",
    plain:
      "An eco-friendly, sticky, water-soluble bio-glue secreted by Bacillus subtilis. Its negatively charged chains, bridged by calcium, net sand grains together into a moisture-holding crust that resists windstorms.",
    category: "Biopolymer",
  },
  "bacillus-subtilis": {
    title: "Bacillus subtilis",
    plain:
      "A soil bacterium that survives heat and drought. It is a Risk Group 1 organism, non-pathogenic and long used in industrial fermentation. We engineer its pathways so a glucose and glutamate feed comes out as γ-PGA (Prong 1) or as carbonic anhydrase held on the cell wall (Prong 2).",
    category: "Microorganism",
  },

  // ---- Intracellular kinetics ----------------------------------------------
  "transcription-rate": {
    title: "Transcription Rate (α_m)",
    plain:
      'How quickly the gene is copied into mRNA, essentially how strongly the cell is "turning on" the γ-PGA instructions.',
    category: "Gene Expression",
  },
  "mrna-degradation": {
    title: "mRNA Degradation Rate (β_m)",
    plain:
      "How fast the mRNA message breaks down. If it degrades too quickly, the cell has less time to use it to build enzymes.",
    category: "Gene Expression",
  },
  "enzyme-translation": {
    title: "Enzyme Translation Rate (α_e)",
    plain:
      "How quickly the cell reads mRNA to build the enzyme. Enzymes are what actually drive γ-PGA production, so this sets how fast the machinery is assembled.",
    category: "Gene Expression",
  },
  "enzyme-degradation": {
    title: "Enzyme Degradation Rate (β_e)",
    plain:
      "How quickly the enzyme breaks down inside the cell. A more stable enzyme keeps making γ-PGA for longer.",
    category: "Gene Expression",
  },
  "k-cat": {
    title: "Catalytic Efficiency (k_cat)",
    plain:
      "How fast one enzyme converts precursor into γ-PGA, its top speed. A higher k_cat means each enzyme is more productive per second.",
    category: "Enzyme Kinetics",
  },
  "l-glutamate": {
    title: "L-Glutamate Precursor [S]",
    plain:
      "The raw building block of γ-PGA. γ-PGA is literally a chain of glutamate units, so how much L-glutamate is available caps how much γ-PGA can be made.",
    category: "Enzyme Kinetics",
  },
  ggt: {
    title: "γ-Glutamyltransferase (GGT)",
    plain:
      "An enzyme that naturally chews up γ-PGA. Knocking out its gene stops the cell from digesting its own bio-glue, letting the culture pile up large, stable yields.",
    category: "Genetics",
  },
  pgca: {
    title: "pgcA Gene",
    plain:
      "An enzyme that routes glucose toward building cell walls. Knocking it out redirects those precursors away from plain growth and into γ-PGA synthesis.",
    category: "Genetics",
  },
  "wet-lab-calibration": {
    title: "Wet-Lab Calibration",
    plain:
      "Feeding a real measured γ-PGA yield back into the model so it tunes the enzyme efficiency (k_cat) until the simulation matches the experiment, making later predictions more trustworthy.",
    category: "Modeling",
  },

  // ---- Protein stability & structure ---------------------------------------
  "two-state-folding": {
    title: "Two-State Folding Thermodynamics",
    plain:
      "A simplification that treats a protein as being in one of two states: folded-and-working, or unfolded-and-inactive. It lets us predict whether the protein stays functional in hot, salty, soil-like conditions.",
    category: "Biophysics",
  },
  "folding-curve": {
    title: "Operative Folding Curve",
    plain:
      "A graph of how much protein stays folded as temperature rises. It sits high (mostly folded) at low temperature, then drops sharply near the melting point where the protein unfolds and loses function.",
    category: "Biophysics",
  },
  "melting-point": {
    title: "Melting Point (Tm)",
    plain:
      "The temperature at which half the protein has unfolded. Above it, function falls off quickly.",
    category: "Biophysics",
  },
  "pdb-file": {
    title: "PDB File (.pdb)",
    plain:
      "A standard file that stores the 3D coordinates of every atom in a protein, so a viewer can draw the folded structure and let you rotate and zoom into it.",
    category: "Structural Biology",
  },
  "alpha-helix": {
    title: "Alpha-Helix",
    plain:
      "A spiral-shaped stretch of the protein backbone. Helices help stabilize the fold and often carry catalytic residues.",
    category: "Structural Biology",
  },
  "beta-sheet": {
    title: "Beta-Sheet",
    plain:
      "Flat, arrow-like stretches of backbone that pack together into a stable protein core.",
    category: "Structural Biology",
  },
  "active-site": {
    title: "Active Site",
    plain:
      "The pocket of the enzyme where the chemistry happens, where the substrate binds and is converted to product.",
    category: "Structural Biology",
  },

  // ---- Cross-linking / material --------------------------------------------
  "shear-modulus": {
    title: "Shear Modulus (G = νRT)",
    plain:
      "A measure of the gel's stiffness. It rises with the density of cross-links (ν) times the gas constant (R) times temperature (T). A stiffer sand-polymer network resists erosion and movement better.",
    category: "Biophysics",
  },
  "cross-linking": {
    title: "Ionic Cross-Linking",
    plain:
      "Calcium ions (Ca²⁺) act as bridges that tie many γ-PGA chains together into a net. More bridges make a denser, stronger gel around the sand grains, γ-PGA is the net, calcium is the knots, sand is caught inside.",
    category: "Biochemistry",
  },
  kd: {
    title: "Dissociation Constant (Kd)",
    plain:
      "How tightly calcium sticks to γ-PGA. A lower Kd means stronger binding, which usually means a more stable cross-linked network.",
    category: "Biochemistry",
  },
  "calcium-ion": {
    title: "Calcium Ion (Ca²⁺)",
    plain:
      "The positively charged mineral that bridges negatively charged polymer chains (γ-PGA or alginate) together, turning loose gel into a firm binder.",
    category: "Biochemistry",
  },
  saturation: {
    title: "Saturation Density (θ)",
    plain:
      "The fraction of the available calcium-binding sites that are actually occupied right now. Full saturation gives the maximum possible hardening.",
    category: "Chemical Physics",
  },

  // ---- Ecology / biosafety -------------------------------------------------
  "cellular-automata": {
    title: "Cellular Automata",
    plain:
      "A grid-based simulation where each cell spreads into neighboring squares based on local rules, moisture, nutrients, and survival probabilities, mimicking how a colony would creep across sand.",
    category: "Computation",
  },
  "kill-switch": {
    title: "Biocontainment Kill Switch",
    plain:
      "A genetically-encoded safety circuit built on the MazE/MazF toxin–antitoxin pair. Adding the aTc trigger (or letting the plasmid dilute out over generations) tips the balance so the MazF toxin shreds the cell's RNA and the engineered bacteria self-limit. A second, E. coli-derived copy kills any wild microbe that picks up the genes by horizontal transfer, keeping the strain from spreading beyond the treated area.",
    category: "Biocontainment",
  },
  "fisher-kpp": {
    title: "Fisher–KPP Front Speed",
    plain:
      "The speed at which a growing bacterial colony pushes its edge outward. When cells both grow (rate µ) and spread (diffusivity D), the front travels at c = 2·√(D·µ), the classic Fisher–Kolmogorov travelling wave. Dosing calcium lowers D (it disables the surfactin-driven sliding), so the colony spreads more slowly.",
    category: "Ecology",
  },
  "moisture-spread": {
    title: "Moisture Spread Probability",
    plain:
      "How likely bacterial activity and moisture are to pass from one patch of sand to the next. Bacteria need water to stay active, so higher spread lets them cover more ground before the kill switch triggers.",
    category: "Ecology",
  },
  biofilm: {
    title: "Biofilm",
    plain:
      "A dense community of bacteria embedded in the polymer they secrete. A good biofilm both holds moisture and lays down the γ-PGA crust.",
    category: "Microbiology",
  },

  // ---- Aeolian / wind ------------------------------------------------------
  "aeolian-transport": {
    title: "Aeolian Transport",
    plain:
      "The way wind lifts, carries, and erodes loose sand. Strengthening soil cohesion is about stopping this transport before it kicks up a dust storm.",
    category: "Geodynamics",
  },
  saltation: {
    title: "Saltation",
    plain:
      "The main wind-erosion mechanism: loose grains bounce repeatedly along the ground under wind shear, knocking more grains loose and building up airborne dust as they collide.",
    category: "Wind Mechanics",
  },
  "friction-velocity": {
    title: "Friction Velocity (u*)",
    plain:
      "A measure of the wind's shearing force at the sand surface. If it climbs above the sand's critical threshold, grains start to move and erode.",
    category: "Wind Mechanics",
  },
  "threshold-velocity": {
    title: "Threshold Velocity (u*t)",
    plain:
      "The wind speed at which sand just begins to move. The bio-crust raises this threshold, so it takes a stronger wind to erode treated sand than bare sand.",
    category: "Wind Mechanics",
  },
  "bagnold-threshold": {
    title: "Bagnold Threshold",
    plain:
      "The classic sand-transport relationship linking grain size, air and sand density, and cohesion to the wind speed needed to start erosion. It underlies the wind-tunnel prediction.",
    category: "Wind Mechanics",
  },
  "untreated-threshold": {
    title: "Untreated Threshold",
    plain:
      "The wind speed at which bare, untreated desert sand starts to blow. Below it the dune sits still. Above it grains lift into saltation and the surface erodes. It is the control the treated crust is measured against.",
    derivation:
      "Bagnold's baseline threshold (Eq 7): the friction velocity u*t0 = A·√[((ρs−ρa)/ρa)·g·d] for loose quartz grains of diameter d (≈0.25 mm here) with no binder, so cohesion γ = 0. We then convert u* to a 10-m free-stream wind through the log-law surface coupling u* = ratio·U∞.",
    category: "Wind Mechanics",
    jumpTo: ["aeolian"],
    jumpLabel: "Open the Aeolian Wind Tunnel",
  },
  "treated-threshold": {
    title: "Treated Threshold",
    plain:
      "The wind speed the engineered crust withstands before grains move. The gap above the untreated threshold is exactly what the bacteria buy you.",
    derivation:
      "Cohesion-modified threshold (Eq 8): u*t = A·√[((ρs−ρa)/ρa)·g·d + γ/(ρa·d)]. The extra γ/(ρa·d) term is the interparticle cohesion the binder adds. γ is the composite cohesion (built from the active prong's binder, the Ca²⁺-crosslinked γ-PGA gel modulus at 10 mM Ca²⁺, the calcite UCS, or the alginate egg-box modulus), converted here into a survivable wind speed.",
    category: "Wind Mechanics",
    jumpTo: ["aeolian"],
    jumpLabel: "Open the Aeolian Wind Tunnel",
  },
  "erosion-reduction": {
    title: "Erosion Reduction",
    plain:
      "How much less sand is carried away once the crust is in place, the headline protection the treatment delivers at the current wind.",
    derivation:
      "From Bagnold's saltation flux (Eq 9): q = C·(ρa/g)·u*³·(1 − u*t²/u*²) for winds above threshold. We compute the transported mass for the untreated bed and the treated bed at the same wind and report 1 − q_treated/q_untreated. Raising the threshold cuts the flux sharply because q scales with how far the wind sits above u*t.",
    category: "Wind Mechanics",
    jumpTo: ["aeolian"],
    jumpLabel: "Open the Aeolian Wind Tunnel",
  },

  // ---- Prong 2 · CaCO₃ ------------------------------------------------------
  "carbonic-anhydrase": {
    title: "Carbonic Anhydrase (CA)",
    plain:
      "An enzyme that speeds up turning CO₂ and water into bicarbonate/carbonate. Displayed on the cell surface, it seeds calcium-carbonate cement without producing toxic ammonia.",
    category: "Enzyme",
  },
  sortase: {
    title: "Sortase-Mediated Ligation",
    plain:
      "A method to covalently staple carbonic anhydrase onto the bacterial surface. In the model it displays slightly more active enzyme than the binding-motif route, making it the preferred anchoring strategy.",
    category: "Protein Display",
  },
  "cwbd-binding": {
    title: "LytE-CWBD Binding",
    plain:
      "An alternative anchor that uses a cell-wall-binding motif to attach carbonic anhydrase to the surface, instead of the sortase staple.",
    category: "Protein Display",
  },
  micp: {
    title: "Biomineralization (MICP)",
    plain:
      "Microbially-induced carbonate precipitation: bacteria drive the chemistry that grows calcium-carbonate crystals, cementing sand grains together.",
    category: "Biomineralization",
  },
  "carbonate-speciation": {
    title: "Carbonate Speciation (Bjerrum)",
    plain:
      "How the dissolved carbon splits between CO₂, bicarbonate, and carbonate depending on pH. Higher pH favors carbonate ions, which are the form needed to precipitate CaCO₃.",
    category: "Geochemistry",
  },
  "saturation-index": {
    title: "Saturation Index (Ω / SI)",
    plain:
      'A measure of how strongly the solution "wants" to precipitate calcium carbonate. Above saturation it forms crystals; undersaturated conditions dissolve them instead.',
    category: "Geochemistry",
  },
  calcite: {
    title: "Calcite",
    plain:
      "The stable crystalline form of calcium carbonate that cements the sand. More calcite content means a stronger, more cemented crust.",
    category: "Mineralogy",
  },
  ucs: {
    title: "Unconfined Compressive Strength (UCS)",
    plain:
      "How much crushing load the cemented sand can take before failing. It grows with calcite content, the standard strength metric for bio-cement.",
    category: "Geomechanics",
  },
  "co2-sequestration": {
    title: "CO₂ Sequestration",
    plain:
      "Locking carbon dioxide into solid mineral (calcium carbonate) so it is captured rather than released, a climate co-benefit of the cementing pathway.",
    category: "Sustainability",
  },
  "maze-mazf": {
    title: "MazE/MazF Kill-Switch",
    plain:
      "A toxin–antitoxin safety system. MazF is a toxin that shreds the cell’s RNA. MazE is the short-lived antitoxin that blocks it. While the engineered bacteria stay in place they keep making antitoxin, but as the plasmid dilutes out over generations (or conditions change), the toxin wins and the cells self-limit, stopping overspread and gene transfer to wild microbes.",
    category: "Biosafety",
  },
  "prong-interaction": {
    title: "Inter-Prong Interaction",
    plain:
      "The prongs are not independent. Combined, they interact: all three compete for the same soil calcium, γ-PGA and carbonic anhydrase compete for the same cell’s energy budget when co-expressed, and some pairs help each other, since γ-PGA seeds calcite and alginate keeps things damp. The model accounts for both the competition and the cooperation.",
    category: "Systems",
  },
  "chemical-spray": {
    title: "Chemical Dust Suppressant",
    plain:
      "The conventional way to hold down dust: spraying petrochemical polymers or salts over the ground. It works, but it is costly per hectare, needs re-applying, and is not biodegradable, the baseline our biological approach is measured against.",
    category: "Economics",
  },
  dic: {
    title: "Dissolved Inorganic Carbon (DIC)",
    plain:
      "The total pool of dissolved carbon (CO₂ + bicarbonate + carbonate) available to be turned into solid carbonate cement.",
    category: "Geochemistry",
  },

  // ---- Prong 3 · Alginate ---------------------------------------------------
  "sodium-alginate": {
    title: "Sodium Alginate",
    plain:
      "A ready-made, plant/seaweed-derived biopolymer sprayed straight onto sand, no bacteria needed. Calcium cross-links it into a gel that holds grains and moisture, though it can weaken after repeated rain.",
    category: "Biopolymer",
  },
  "egg-box": {
    title: "Egg-Box Gelation",
    plain:
      "The way calcium ions slot between alginate chains like eggs in a carton, locking them into a gel. Adding calcium sharply increases strength until the binding sites fill up and the curve levels off.",
    category: "Biochemistry",
  },
  "moisture-retention": {
    title: "Moisture Retention",
    plain:
      "How much water the gel can hold at a given humidity. Retained moisture keeps the crust flexible and helps bind the sand.",
    category: "Material Property",
  },
  "rain-washout": {
    title: "Rain Washout Durability",
    plain:
      "How well the alginate treatment survives repeated wetting. Each wet cycle can dissolve a little of the gel, so durability tracks how many storms it can take.",
    category: "Material Property",
  },

  // ---- Composite / macro ----------------------------------------------------
  "composite-cohesion": {
    title: "Composite Cohesion",
    plain:
      "The single number for how strongly the engineered crust holds sand grains together, the interparticle cohesion γ (in mN/m) that every prong ultimately feeds into the wind-erosion result.",
    derivation:
      "Each active prong's binder is first converted to a standalone cohesion: γ-PGA and alginate through their Ca²⁺-crosslinked gel shear modulus G (10 mM Ca²⁺ default), and CaCO₃ through the calcite unconfined compressive strength (UCS). Each is then knocked down by inter-prong competition (shared Ca²⁺ + co-expression metabolic burden) and its yield factor, and finally combined with a physicochemical synergy term into one composite γ. That γ is what raises the treated wind threshold.",
    category: "Composite Mechanics",
    jumpTo: ["composite", "crosslink", "caco3", "alginate"],
    jumpLabel: "Open the module that computes it",
  },
  synergy: {
    title: "Synergy / Interaction Term",
    plain:
      "Whether the materials reinforce each other (positive) or compete slightly (negative) when combined. A small negative synergy means the mix performs just below the simple sum of its parts.",
    category: "Composite Mechanics",
  },
  "failure-mode": {
    title: "Failure-Mode Robustness",
    plain:
      "How well each strategy holds up against different stresses, drought/heat, flood/rain, bacterial death, high wind, and long-term wear. Combining prongs covers each other's weak points.",
    category: "Reliability",
  },
  lca: {
    title: "Life-Cycle Assessment (LCA)",
    plain:
      "An accounting of the environmental cost and benefit across the whole process, here, the CO₂ avoided by skipping cement kilns plus the carbon trapped in the crust.",
    category: "Sustainability",
  },

  // ---- Wet lab -------------------------------------------------------------
  od600: {
    title: "Cell Density (OD600)",
    plain:
      "A quick optical reading of how cloudy the culture is, used to estimate how many bacterial cells are present. Higher OD600 can support a denser biofilm, as long as cells stay viable and fed.",
    category: "Wet Lab",
  },
  inoculation: {
    title: "Inoculation",
    plain:
      "Adding the starter bacterial culture to the sand or medium. The pattern (center, corners, random) sets where growth begins in the spread simulation.",
    category: "Wet Lab",
  },
  anaplerosis: {
    title: "Anaplerosis",
    plain:
      "The cell's \"top-up\" reactions (like pyruvate carboxylase) that refill central metabolism when γ-PGA production siphons off building blocks, so the engine doesn't stall while making product.",
    category: "Metabolic Modeling",
  },
  oxaloacetate: {
    title: "Oxaloacetate",
    plain:
      "A hub molecule of the TCA cycle. Making γ-PGA drains it, so the model adds a top-up (anaplerotic) reaction to keep it from running dry.",
    category: "Metabolic Modeling",
  },
  gdcw: {
    title: "gDCW (grams dry cell weight)",
    plain:
      'How much bacteria you have once the water is removed. Metabolic rates are quoted "per gram dry cell weight per hour" so they don\'t depend on culture volume.',
    category: "Metabolic Modeling",
  },
  aerobiosis: {
    title: "Aerobiosis",
    plain:
      "Growing with oxygen. The oxygen-uptake ceiling sets how much the cell can respire. Starve it of O₂ and it switches to fermentation, which yields less.",
    category: "Metabolic Modeling",
  },
  fermentation: {
    title: "Fermentation",
    plain:
      "Energy metabolism without enough oxygen. It wastes carbon by dumping overflow by-products like acetate instead of routing it to growth or product.",
    category: "Metabolic Modeling",
  },
  "stoichiometric-matrix": {
    title: "Stoichiometric Matrix (S)",
    plain:
      "The table of how every reaction consumes and produces each metabolite. FBA enforces S·v = 0 (mass balance), so at steady state nothing piles up inside the cell.",
    category: "Metabolic Modeling",
  },
  "constraint-based": {
    title: "Constraint-Based Modelling",
    plain:
      "Predicting cell behaviour without knowing every reaction speed. You set bounds on each reaction and find the best flux pattern those bounds allow. FBA is the standard example.",
    category: "Metabolic Modeling",
  },
  "tca-cycle": {
    title: "TCA Cycle",
    plain:
      "The tricarboxylic-acid (Krebs) cycle, central metabolism's hub that burns carbon for energy and hands out building blocks for growth and products.",
    category: "Metabolic Modeling",
  },
  chemostat: {
    title: "Chemostat",
    plain:
      "A continuous culture kept at steady state by constant feed and outflow. Running it at several feed rates lets the lab measure constants like maintenance energy.",
    category: "Wet Lab",
  },
  simplex: {
    title: "Simplex Method",
    plain:
      "The classic algorithm for solving linear programs exactly. The FBA here uses a two-phase primal simplex to find the optimal flux vector.",
    category: "Metabolic Modeling",
  },
  vaterite: {
    title: "Vaterite",
    plain:
      "A less-stable crystal form of calcium carbonate that often precipitates first in microbial systems before slowly converting to calcite. Desert MICP frequently makes vaterite.",
    category: "Material Science",
  },
  guluronate: {
    title: "Guluronate (G-blocks)",
    plain:
      'One of the two sugar blocks in alginate. Long stretches of G-blocks are what grab calcium and zip the chains into the rigid "egg-box" gel.',
    category: "Material Science",
  },
  supersaturation: {
    title: "Supersaturation (Ω)",
    plain:
      "When water holds more dissolved mineral than it can keep in solution (Ω > 1), crystals start to form. It is the driving force for CaCO₃ precipitation.",
    category: "Material Science",
  },
  langmuir: {
    title: "Langmuir Binding",
    plain:
      "A simple saturating-binding model: sites fill up as you add more of something, then level off. Used here for calcium binding to γ-PGA and alginate.",
    category: "Material Science",
  },
  "grain-size-distribution": {
    title: "Grain-Size Distribution",
    plain:
      "Sand is a mix of grain sizes, not one. UAE dune sand is mostly 100–300 µm (median ≈ 200 µm). This matters because no single binder grips every size, calcite cements fine-medium grains best, so we track how much of the whole size distribution is actually held.",
    category: "Aeolian Physics",
    module: "Grain-Size Coverage",
  },
  "grain-size-coverage": {
    title: "Grain-Size Coverage",
    plain:
      "The fraction of the sand's mass that is actually bound once you account for every grain size. MICP (CaCO₃) works best at 63–125 µm. γ-PGA and alginate close the coarse and fine gaps it misses, so together they cover more of the size range than any one alone.",
    category: "Aeolian Physics",
    module: "Grain-Size Coverage",
  },
  curing: {
    title: "Curing (Maturation)",
    plain:
      'The time the sprayed crust needs to reach full strength. The protocol sprays at 0, 8, 16, 24 and 32 hours to keep the biofilm hydrated; it is "fully mature" at 32 h. Alginate gels instantly, γ-PGA sets within hours, and the calcite cement ripens slowly over the whole 32 h.',
    category: "Deployment",
    module: "Curing & Deployment Timeline",
  },
  reapplication: {
    title: "Re-application",
    plain:
      'The crust slowly weathers, so the spray cycle is repeated about every 6 months. In the model, re-application is "due" when the surviving cohesion drops below the level needed to withstand the design wind. A durable calcite floor stretches this interval.',
    category: "Deployment",
    module: "Curing & Deployment Timeline",
  },
  "ostwald-ripening": {
    title: "Ostwald Ripening",
    plain:
      "When a less-stable crystal (like vaterite) slowly re-dissolves and re-grows as the more stable form (calcite). It is why a vaterite-rich crust stiffens over time as the vaterite converts to stronger calcite.",
    category: "Material Science",
  },

  // ---- Exposure · wind, transport and the commercial case -------------------
  "weibull-distribution": {
    title: "Weibull Distribution",
    plain:
      "A way of writing down not just how windy a place is, but how the wind is spread out across calm days and rough ones. Two numbers do it: the scale A, roughly the typical wind, and the shape k, roughly how gusty. We fit them to real hourly weather, month by month.",
    category: "Wind and Exposure",
    module: "Exposure and the commercial case",
    derivation:
      "Fitted by maximum likelihood to ERA5 hourly 10 m wind for 2022 to 2024, on a 1 degree grid, by scripts/fit_era5_weibull.py.",
  },
  "weibull-scale": {
    title: "Weibull Scale (A)",
    plain:
      "Roughly how windy a place is. Higher A means stronger winds across the board. It is not quite the average: the average is A times a factor that depends on how gusty the place is.",
    category: "Wind and Exposure",
  },
  "weibull-shape": {
    title: "Weibull Shape (k)",
    plain:
      "How gusty the wind is. A low k means a place with many calm days and a few violent ones. A high k means the wind is much the same every day. Low k matters to us, because the violent days are when almost all the sand moves.",
    category: "Wind and Exposure",
  },
  "flux-of-the-mean": {
    title: "Why the Average Wind Is the Wrong Input",
    plain:
      "Sand does not move until the wind passes a threshold, and above it the amount carried climbs as roughly the cube of the wind. So a month that is calm for 28 days and fierce for 2 moves nearly all its sand on those 2 days. Feeding that month's average wind into the equation can predict no sand movement at all. We add up the sand across the whole spread of wind speeds instead.",
    category: "Wind and Exposure",
    module: "Exposure and the commercial case",
    derivation:
      "The Bagnold flux integrated over the fitted Weibull has an exact closed form, so no gustiness fudge factor is needed. Verified against brute-force integration by scripts/verify_weibull_flux.py.",
  },
  "wind-rose": {
    title: "Wind Rose",
    plain:
      "A circular chart of which direction the wind comes from and how often. Each petal is one compass sector, and the longer the petal the more of the year the wind blows from there.",
    category: "Wind and Exposure",
  },
  "drift-potential": {
    title: "Drift Potential (DP)",
    plain:
      "How much sand a place's wind regime is capable of moving over a period. It is the standard measure in this field, from Fryberger's survey of the world's sand seas. Bigger DP means more sand on the move.",
    category: "Wind and Exposure",
    module: "Exposure and the commercial case",
    derivation:
      "Q = V²(V − Vt)·t per direction sector, with V in knots and Vt the 5.4 m/s Gulf threshold measured by Khalaf and Al-Ajmi in Kuwait. Summed hour by hour, not from a sector average.",
  },
  "resultant-drift-direction": {
    title: "Resultant Drift Direction (RDD)",
    plain:
      "Where the sand actually ends up once you add together every direction the wind blows from, as arrows rather than as amounts. It is not the same as the windiest direction: a place can be windiest from the north and still move its sand southeast.",
    category: "Wind and Exposure",
  },
  "unidirectionality-index": {
    title: "Unidirectionality Index (UDI)",
    plain:
      "How one-way a place's wind is, from 0 to 1. Near 1 and the sand marches steadily in one direction, so there is one obvious patch of ground to treat. Near 0 and the winds cancel out, and the sand mostly sloshes back and forth without arriving anywhere.",
    category: "Wind and Exposure",
    module: "Exposure and the commercial case",
  },
  shamal: {
    title: "Shamal",
    plain:
      "The strong, steady northwesterly wind that blows down the Gulf, hardest in summer. It is the wind that moves most of the region's sand, and it is why sand transport and the value of stopping it both peak between May and August.",
    category: "Wind and Exposure",
  },
  suspension: {
    title: "Suspension",
    plain:
      "The finest dust, under about 60 micrometres, which floats on the wind and can travel hundreds of kilometres. It is what settles on a solar panel. Dune sand is only about 0.1 percent this fine, which is why treating a dune does little for panel soiling.",
    category: "Wind and Exposure",
  },
  creep: {
    title: "Creep",
    plain:
      "Grains bigger than about 2 mm, too heavy to hop, that just roll along the ground and stay put. The least of our worries.",
    category: "Wind and Exposure",
  },
  "sandblasting-efficiency": {
    title: "Sandblasting Efficiency",
    plain:
      "How much fine floating dust gets knocked loose by hopping sand grains hammering the surface. It depends almost entirely on how much clay is in the soil: clean dune sand is a strong sand mover and a weak dust maker, while clay-rich flood plain is the opposite.",
    category: "Wind and Exposure",
    module: "Exposure and the commercial case",
  },
  "capture-fraction": {
    title: "Capture Fraction",
    plain:
      "The share of sand leaving a patch of ground that is still in the air by the time it reaches a given distance downwind. It drops away fast: at 10 m/s about 8 percent of the sand is still airborne after 10 metres, and essentially none after 50.",
    category: "Wind and Exposure",
    module: "Exposure and the commercial case",
  },
  "transmittance-loss": {
    title: "Transmittance Loss",
    plain:
      "How much less light gets through a solar panel's glass once dust has settled on it. This is the step that turns arriving dust into lost electricity, and lost electricity into money.",
    category: "Wind and Exposure",
    derivation:
      "Elminir et al. 2006 measured it against deposited mass in grams per square metre, and against panel tilt. Implemented in src/lib/physics/damage.ts.",
  },
  soiling: {
    title: "Soiling",
    plain:
      "Dust settling on a solar panel and cutting its output. Mostly caused by far-travelling fine dust rather than local sand, which is why we do not lead with it: treating a dune next door removes almost no soiling-capable material.",
    category: "Wind and Exposure",
  },
  encroachment: {
    title: "Sand Encroachment",
    plain:
      "Blown sand piling up against panel rows, roads, fences and machinery until somebody has to clear it. This is the effect our model supports most strongly, because it is caused by exactly the short-range hopping sand a crust stops.",
    category: "Wind and Exposure",
  },
  reanalysis: {
    title: "Reanalysis",
    plain:
      "A reconstruction of past weather made by feeding decades of real observations into a weather model, so you get a complete, gap-free record everywhere rather than only where there happened to be a weather station.",
    category: "Wind and Exposure",
  },
  era5: {
    title: "ERA5",
    plain:
      "The European weather reconstruction we take our wind from. It gives hourly wind for every point on Earth going back decades, which is what makes fitting a month-by-month wind distribution possible.",
    category: "Wind and Exposure",
    module: "Exposure and the commercial case",
  },
  cams: {
    title: "CAMS",
    plain:
      "The European atmosphere monitoring service, which forecasts dust in the air worldwide. It drives the live view's surface dust reading.",
    category: "Wind and Exposure",
  },
  climatology: {
    title: "Climatology",
    plain:
      "What the weather usually does at a place and time of year, averaged over many years. Not a forecast for a particular day, and it should never be read as one.",
    category: "Wind and Exposure",
  },
  hotspot: {
    title: "Sand hotspot",
    plain:
      "A patch of ground that satellites see raising dust often. A global survey mapped them across the Middle East on a grid of about 10 km, and those are the coloured areas on the map. A hotspot is where sand and dust leave the ground, not where they land.",
    category: "Wind and Exposure",
    module: "Exposure and the commercial case",
  },
  plume: {
    title: "Plume",
    plain:
      "The cloud of dust travelling away from a hotspot. It spreads sideways as it goes and drops material the whole way, so a site far downwind gets a thin share of what left.",
    category: "Wind and Exposure",
    module: "Exposure and the commercial case",
  },
  sabkha: {
    title: "Sabkha",
    plain:
      "A flat salt crust near the coast, left behind where salty groundwater evaporates. When the crust breaks up it gives off fine dust, so sabkha counts as a source even though it is not a dune.",
    category: "Wind and Exposure",
  },
  "flood-plain": {
    title: "Flood plain",
    plain:
      "The flat land a river floods and leaves silt on. That silt is fine and clay-rich, which makes it a far better dust source than dune sand. The Tigris and Euphrates plain is the biggest one near us.",
    category: "Wind and Exposure",
  },
  "frequency-of-occurrence": {
    title: "Frequency of Occurrence",
    plain:
      "How often satellites see dust over a given patch of ground, as a share of days. It is how the source areas on the map are mapped, and darker shading means dust is seen there more often.",
    category: "Wind and Exposure",
  },

  // ---- Exposure - the money side ------------------------------------------
  // Written for a reader with no background in energy or economics. Each one
  // says what the word means and why it changes a number on this page.
  ppa: {
    title: "PPA, the price the plant sells at",
    plain:
      "Short for power purchase agreement. Before a big solar plant is built, the owner signs a contract to sell its electricity at one fixed price for the next 20 or 25 years. That price is the PPA. It is usually far lower than the price a home or a shop pays, so the same lost unit of electricity is worth very different amounts depending on who lost it. That is why this page asks you to pick.",
    category: "Money",
    module: "Exposure and the commercial case",
  },
  tariff: {
    title: "Tariff, the price a customer pays",
    plain:
      "The price on an electricity bill, set by the utility. In Dubai an industrial customer pays roughly ten times what a solar plant earns for the same unit under its PPA. Neither number is wrong. They answer different questions: what does it cost to buy power, and what does it earn to sell it.",
    category: "Money",
  },
  "kilowatt-hour": {
    title: "Kilowatt-hour (kWh)",
    plain:
      "One unit of electricity, the amount a 1,000 watt kettle uses in an hour. Prices are quoted per kilowatt-hour. A megawatt-hour (MWh) is a thousand of them.",
    category: "Money",
  },
  "capacity-factor": {
    title: "Capacity Factor",
    plain:
      "A solar plant almost never runs at its full rated size, because of night, cloud and heat. The capacity factor is the fraction it manages on average across a year, typically around a fifth for solar in this region. It is how we turn a plant's size into the electricity it actually produces.",
    category: "Money",
  },
  "nameplate-capacity": {
    title: "Nameplate Capacity",
    plain:
      "The size a plant is advertised at, in megawatts. It is the most the plant could produce at one instant in ideal conditions, not what it produces in practice. We need it to work out how much electricity a percentage loss actually costs, which is why sites with no published capacity show a blank here instead of a number.",
    category: "Money",
  },
  "deposit-retention": {
    title: "How much dust sticks",
    plain:
      "Solar panels are tilted, so some dust that lands slides or blows off again and only a fraction stays. That fraction is this number. Nobody has published a value we could use, so it is a slider rather than a measurement, and every money figure on the page scales straight up and down with it.",
    category: "Money",
  },
  "evidence-grade": {
    title: "Evidence grade",
    plain:
      "A label next to each result saying how well we can back it up. Measured means our own lab or a dataset measured it. Literature means a published paper gives it. Unsourced means the physics is sound but no published number exists, and in that case we show a blank rather than something we made up.",
    category: "Method",
  },

  // ---- Exposure - two different fluxes, kept apart on purpose --------------
  // Before these existed the bare word "flux" auto-linked to the metabolic
  // definition, so a reader on the wind page was shown something from a
  // completely different model.
  "saltation-flux": {
    title: "Sand flux",
    plain:
      "How much sand is hopping past, per metre of ground, per second. This is the coarse material that bounces along near the surface, piles against panel rows and scours glass. It is the part a crust on the ground can actually stop.",
    category: "Wind and Exposure",
    module: "Exposure and the commercial case",
  },
  "suspension-flux": {
    title: "Dust flux",
    plain:
      "How much fine dust is being lifted off the ground into the air, per square metre, per second. Unlike hopping sand this material floats and can travel hundreds of kilometres, which is what settles on panels far from where it started.",
    category: "Wind and Exposure",
    module: "Exposure and the commercial case",
  },

  // ---- Exposure - the datasets, named on screen ---------------------------
  ginoux: {
    title: "Ginoux dust source map",
    plain:
      "A published map of where on Earth dust gets lifted off the ground, built from satellite observations. We use it to draw the coloured source areas. It covers March to May only, which is why that layer does not change when you switch season.",
    category: "Wind and Exposure",
  },
  soilgrids: {
    title: "SoilGrids",
    plain:
      "A free global map of what soil is made of. We use its clay content, with a caution: over UAE dune fields it reads about 20 percent clay where studies of the actual sand grains say nearer 2 percent. We show the value and the contradiction rather than quietly using it.",
    category: "Wind and Exposure",
  },
  "sand-sea": {
    title: "Sand sea",
    plain:
      "A desert region large enough to be covered in dunes rather than scattered patches of sand. The Rub al Khali, the Empty Quarter, is one. Sand seas move a great deal of sand and make surprisingly little floating dust, because their grains are too coarse to stay airborne.",
    category: "Wind and Exposure",
  },
  "grid-cell": {
    title: "Grid cell",
    plain:
      "Weather data comes on a grid of squares, not for exact points. Ours is about 31 km across, so everything inside one square gets the same wind. Abu Dhabi and Dubai airports fall in the same square, which is a fair warning about how finely these numbers can be read.",
    category: "Method",
  },

  // ---- Exposure - how the model was tested --------------------------------
  // A reader meets these three for the first time in the validation section,
  // where the whole point is that they can check our reasoning rather than
  // take a verdict on trust.
  "bagnold-coefficient": {
    title: "Bagnold coefficient A",
    plain:
      "A plain number, around 1.5 to 2.8, that sits in the sand-transport equation and sets how much sand a given wind actually carries. It is not derived from anything; it was fitted to wind-tunnel measurements in the 1940s and every model since has borrowed it. We take ours from published values rather than measuring it.",
    category: "Wind Mechanics",
  },
  bias: {
    title: "Reading high or low",
    plain:
      "An instrument or a model has a bias when it is wrong in the same direction every time, rather than scattering either side of the truth. A thermometer that always reads two degrees warm has a bias. Bias matters more than scatter here, because scatter averages out over thousands of hours and bias does not.",
    category: "Method",
  },
  median: {
    title: "The middle value",
    plain:
      "Line every result up smallest to largest and take the one in the middle. Half are better, half are worse. We report medians rather than averages because one very wrong month can drag an average a long way, and the median tells you what a typical month looked like.",
    category: "Method",
  },
  "wind-tail": {
    title: "The windiest hours",
    plain:
      "The small number of hours in a season when the wind is at its strongest. They are called the tail because they sit at the far end of the graph of how often each wind speed happens. Almost no sand moves on an ordinary day, so nearly all of a season's sand is carried in these few hours. Getting the tail slightly wrong gets the sand very wrong.",
    category: "Wind and Exposure",
    module: "Exposure and the commercial case",
  },
  anemometer: {
    title: "Anemometer",
    plain:
      "The instrument that measures wind speed, usually spinning cups or a small propeller on a mast. Airports keep one on open ground and report what it reads about once an hour. It measures the wind at one point, which is why it does not agree exactly with a model that averages the wind over 31 kilometres.",
    category: "Wind and Exposure",
  },
  "crest-bearing": {
    title: "Which way a dune ridge points",
    plain:
      "A long dune has a ridge line running along the top of it. Its bearing is the compass direction that ridge runs in, measured in degrees from north. Dunes line up with the wind that built them, so the direction of the ridges is a record of the wind, written in the ground, that we can check our model against.",
    category: "Wind and Exposure",
    module: "Exposure and the commercial case",
  },
  "held-out-test": {
    title: "Holding a year back",
    plain:
      "A way of testing a model that stops it marking its own homework. You hide part of the data, build the model on what is left, then ask it to predict the part you hid. A model that only works on the years it was shown has memorised them rather than learned anything. Ours was built on 2022 and 2023 and asked to predict 2024.",
    category: "Method",
    module: "Exposure and the commercial case",
  },
  elasticity: {
    title: "How hard an input moves the answer",
    plain:
      "Change one input by one percent and see how many percent the answer moves. That ratio is the elasticity. It is a way of ranking which numbers are worth arguing about: an input with an elasticity of 11 will wreck the result if it is slightly wrong, and one near zero will not.",
    category: "Method",
    module: "Exposure and the commercial case",
  },
  metar: {
    title: "Airport weather reports",
    plain:
      "Every airport files a short weather report about once an hour, wind speed and direction included, measured by an instrument on the ground. The Iowa Environmental Mesonet keeps an archive of them and gives it away. We used three UAE airports, about 75,000 paired hours, as the first real instrument this model has been compared against.",
    category: "Method",
    module: "Exposure and the commercial case",
  },
};

/** Alternate spellings / keys used in code, routed to a canonical GLOSSARY key. */
export const ALIASES: Record<string, string> = {
  "gamma-pga": "gamma-pga",
  "γ-pga": "gamma-pga",
  "poly-γ-glutamic acid": "gamma-pga",
  "flux balance analysis": "flux-balance-analysis",
  fba: "flux-balance-analysis",
  "bacillus subtilis": "bacillus-subtilis",
  "shear modulus": "shear-modulus",
  gs: "shear-modulus",
  "aeolian transport": "aeolian-transport",
  // Hyphenated spellings used in the landing copy, routed to the same entries so
  // they auto-underline like the space forms.
  "carbonic-anhydrase": "carbonic-anhydrase",
  "sodium-alginate": "sodium-alginate",
  "cross-linking": "cross-linking",
  crosslinking: "cross-linking",
  k_cat: "k-cat",
  kcat: "k-cat",
  "l-glutamate": "l-glutamate",
  "stochastic growth ca": "cellular-automata",
  "arid apoptosis": "kill-switch",
  "pdb file": "pdb-file",
  od600: "od600",
  "u*": "friction-velocity",
  "u*t": "threshold-velocity",
  δpta: "acetate-overflow",
  pta: "acetate-overflow",
  "overflow metabolism": "acetate-overflow",
  "acetate overflow": "acetate-overflow",
  tca: "tca-cycle",
  "tca cycle": "tca-cycle",
  "krebs cycle": "tca-cycle",
  "g-blocks": "guluronate",
  "g blocks": "guluronate",
  "egg-box": "egg-box",
  "dry cell weight": "gdcw",
  "constraint based": "constraint-based",
  "stoichiometric matrix": "stoichiometric-matrix",
  "primal simplex": "simplex",
  // Exposure
  weibull: "weibull-distribution",
  "scale a": "weibull-scale",
  "shape k": "weibull-shape",
  dp: "drift-potential",
  rdd: "resultant-drift-direction",
  udi: "unidirectionality-index",
  "sand drift": "drift-potential",
  "drift direction": "resultant-drift-direction",
  "suspended dust": "suspension",
  "fine dust": "suspension",
  "near field": "capture-fraction",
  "near-field": "capture-fraction",
  fryberger: "drift-potential",
  "wind climatology": "climatology",
  "dust source": "frequency-of-occurrence",
  "source areas": "frequency-of-occurrence",
  // Money. A reader with no economics background meets these cold.
  "power purchase agreement": "ppa",
  "contracted ppa": "ppa",
  "capacity factor": "capacity-factor",
  "nameplate capacity": "nameplate-capacity",
  nameplate: "nameplate-capacity",
  kwh: "kilowatt-hour",
  "kilowatt hour": "kilowatt-hour",
  mwh: "kilowatt-hour",
  "evidence grade": "evidence-grade",
  // The two fluxes. These are longer than the bare "flux" that used to win, so
  // longest-first matching sends them to the right model.
  "saltation flux": "saltation-flux",
  "sand flux": "saltation-flux",
  "suspension flux": "suspension-flux",
  "dust flux": "suspension-flux",
  "sand sea": "sand-sea",
  "sand seas": "sand-sea",
  "grid cell": "grid-cell",
  // How the model was tested.
  "windiest few hours": "wind-tail",
  "wind to surface shear ratio": "friction-velocity",
  "bagnold coefficient a": "bagnold-coefficient",
  "bagnold coefficient": "bagnold-coefficient",
  "crust cohesion": "composite-cohesion",
  "the tail": "wind-tail",
  "windiest hours": "wind-tail",
  tail: "wind-tail",
  "crest bearing": "crest-bearing",
  "crest bearings": "crest-bearing",
  "ridge lines": "crest-bearing",
  biased: "bias",
  anemometers: "anemometer",
  "held-out": "held-out-test",
  "held out": "held-out-test",
  "holding a year back": "held-out-test",
  "held back": "held-out-test",
  "year we held back": "held-out-test",
  "threshold wind": "threshold-velocity",
  "airport record": "metar",
  "airport records": "metar",
  "airport wind records": "metar",
  // The words this page uses for the things it draws.
  hotspots: "hotspot",
  "sand hotspot": "hotspot",
  "sand hotspots": "hotspot",
  "dust hotspot": "hotspot",
  "crust strength": "composite-cohesion",
  "strength the crust adds": "composite-cohesion",
  cohesion: "composite-cohesion",
  "flood plain": "flood-plain",
  "settles out": "plume",
  saltation: "saltation-flux",
  saltating: "saltation-flux",
  "hopping sand": "saltation-flux",
  "in suspension": "suspension",
};

/** Normalize a lookup key: lowercase, collapse whitespace, trim symbols we route on. */
function normalize(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Resolve any human/alias key to a canonical GLOSSARY entry (or undefined). */
export function lookupTerm(
  key: string,
): { id: string; entry: GlossaryEntry } | undefined {
  const n = normalize(key);
  // direct hit on canonical slug (hyphenated)
  const slug = n.replace(/\s+/g, "-");
  if (GLOSSARY[slug]) return { id: slug, entry: GLOSSARY[slug] };
  if (GLOSSARY[n]) return { id: n, entry: GLOSSARY[n] };
  // alias route
  const aliased = ALIASES[n] || ALIASES[slug];
  if (aliased && GLOSSARY[aliased])
    return { id: aliased, entry: GLOSSARY[aliased] };
  return undefined;
}

/**
 * Linkable phrases for auto-underlining dense prose (see <GlossaryText>). Drawn from aliases,
 * entry titles, and slugs; each maps to its canonical id, sorted longest-first so multi-word
 * phrases win over their substrings.
 */
export function glossaryPhrases(): { phrase: string; key: string }[] {
  const seen = new Map<string, { phrase: string; key: string }>();
  const add = (phrase: string, key: string) => {
    const p = phrase.trim();
    const l = p.toLowerCase();
    // ≥3 chars so we don't linkify noise; keep first (there may be dup phrases).
    if (p.length >= 3 && !seen.has(l)) seen.set(l, { phrase: p, key });
  };
  for (const [alias, canon] of Object.entries(ALIASES)) add(alias, canon);
  for (const [id, entry] of Object.entries(GLOSSARY)) {
    add(id.replace(/-/g, " "), id);
    const title = entry.title.replace(/\s*\([^)]*\)\s*/g, " ").trim();
    add(title, id);
    const paren = entry.title.match(/\(([^)]+)\)/);
    if (paren) add(paren[1], id);
  }
  return [...seen.values()].sort((a, b) => b.phrase.length - a.phrase.length);
}
