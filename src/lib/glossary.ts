/**
 * Sandyx Glossary — plain-language explanations
 * =============================================
 * Every complex term or concept surfaced in the toolkit is explained here in the
 * layman voice of "Toolkit in layman's terminology.md". The Sandyx companion reads from
 * this single source: underline a term anywhere with <Term k="..."> and dropping Sandyx on
 * it (or tapping it) opens the matching explanation.
 *
 * Keep definitions short, plain, and scientifically honest — they render inside a pop-up.
 */

export interface GlossaryEntry {
  /** Display heading for the pop-up. */
  title: string;
  /** Plain-language explanation (1–3 short sentences). */
  plain: string;
  /** Grouping label shown as a chip. */
  category: string;
  /** Optional: which module the concept lives in. */
  module?: string;
}

/**
 * Canonical entries keyed by a stable slug. Prefer lowercase-hyphen slugs, but human-readable
 * keys are fine too — lookups are normalized (case/space/punctuation-insensitive) and the
 * ALIASES map below routes alternate spellings to a canonical key.
 */
export const GLOSSARY: Record<string, GlossaryEntry> = {
  // ---- Prong 1 · γ-PGA & shared metabolism ---------------------------------
  'flux-balance-analysis': {
    title: 'Flux Balance Analysis (FBA)',
    plain:
      'A way to predict how bacteria split their nutrients between growing and making γ-PGA. Instead of testing every condition in the lab, the model solves the steady-state balance S·v = 0 (what goes into each reaction must come out) and tells us the best the cell can do under the glucose and oxygen limits we set.',
    category: 'Metabolic Modeling',
    module: 'Flux Balance Analysis',
  },
  flux: {
    title: 'Flux',
    plain:
      'The rate at which material moves through a metabolic reaction or pathway. In the flux charts, bigger bars mean that pathway is carrying more traffic.',
    category: 'Metabolic Modeling',
  },
  pfba: {
    title: 'Parsimonious FBA (pFBA)',
    plain:
      'The most efficient FBA solution: it hits the objective (say, maximum γ-PGA) while using the least total metabolic activity, so the cell isn\'t predicted to waste effort on unnecessary reactions.',
    category: 'Metabolic Modeling',
  },
  fva: {
    title: 'Flux Variability Analysis (FVA)',
    plain:
      'Shows how much wiggle-room each pathway has while still reaching the same optimal result. A wide range means the cell has several ways to use that pathway; a narrow range means it is pinned down and probably important or limiting.',
    category: 'Metabolic Modeling',
  },
  'objective-function': {
    title: 'Objective',
    plain:
      'What we ask the model to prioritize. "Maximize γ-PGA" asks: what is the most γ-PGA the cell could make under these conditions? "Maximize growth" asks the same for biomass.',
    category: 'Metabolic Modeling',
  },
  'production-envelope': {
    title: 'Production Envelope (Pareto Front)',
    plain:
      'The trade-off curve between growth and γ-PGA. It slopes downward because the cell cannot maximize both at once — more carbon toward growth means less toward γ-PGA, and vice-versa. The orange dot is the current predicted operating point.',
    category: 'Metabolic Modeling',
  },
  'growth-rate': {
    title: 'Growth Rate (μ)',
    plain:
      'How fast the bacterial population expands, in units of per-hour. Higher μ means faster growth, which usually leaves fewer resources for γ-PGA.',
    category: 'Metabolic Modeling',
  },
  biomass: {
    title: 'Biomass',
    plain:
      'The material the cell builds to grow and divide (new cells). Carbon spent on biomass is carbon not spent on γ-PGA.',
    category: 'Metabolic Modeling',
  },
  'gene-knockout': {
    title: 'In-Silico Gene Knockout',
    plain:
      'Removing or disabling a gene in the model so a specific pathway is blocked. It lets us test an engineering strategy on the computer before deciding whether it is worth trying in the lab.',
    category: 'Genetics',
  },
  'acetate-overflow': {
    title: 'Acetate Overflow',
    plain:
      'A pathway where carbon is "wasted" as acetate instead of going to growth or γ-PGA. Knocking out Δpta blocks it, keeping more carbon for the product we want. A value of 0 means no carbon is being lost this way.',
    category: 'Metabolic Modeling',
  },
  precursor: {
    title: 'Precursor [S]',
    plain:
      'The starting material the enzyme turns into product. Here it is L-glutamate, the building block of γ-PGA. The FBA model hands a predicted precursor concentration to the time-based kinetic model.',
    category: 'Metabolic Modeling',
  },
  'gamma-pga': {
    title: 'Poly-γ-Glutamic Acid (γ-PGA)',
    plain:
      'An eco-friendly, sticky, water-soluble bio-glue secreted by Bacillus subtilis. Its negatively charged chains, bridged by calcium, net sand grains together into a moisture-holding crust that resists windstorms.',
    category: 'Biopolymer',
  },
  'bacillus-subtilis': {
    title: 'Bacillus subtilis',
    plain:
      'A harmless, robust soil bacterium. We engineer its pathways to turn glucose and glutamate feeds into sand-stabilizing γ-PGA (Prong 1) or surface-displayed carbonic anhydrase (Prong 2).',
    category: 'Microorganism',
  },

  // ---- Intracellular kinetics ----------------------------------------------
  'transcription-rate': {
    title: 'Transcription Rate (α_m)',
    plain:
      'How quickly the gene is copied into mRNA — essentially how strongly the cell is "turning on" the γ-PGA instructions.',
    category: 'Gene Expression',
  },
  'mrna-degradation': {
    title: 'mRNA Degradation Rate (β_m)',
    plain:
      'How fast the mRNA message breaks down. If it degrades too quickly, the cell has less time to use it to build enzymes.',
    category: 'Gene Expression',
  },
  'enzyme-translation': {
    title: 'Enzyme Translation Rate (α_e)',
    plain:
      'How quickly the cell reads mRNA to build the enzyme. Enzymes are what actually drive γ-PGA production, so this sets how fast the machinery is assembled.',
    category: 'Gene Expression',
  },
  'enzyme-degradation': {
    title: 'Enzyme Degradation Rate (β_e)',
    plain:
      'How quickly the enzyme breaks down inside the cell. A more stable enzyme keeps making γ-PGA for longer.',
    category: 'Gene Expression',
  },
  'k-cat': {
    title: 'Catalytic Efficiency (k_cat)',
    plain:
      'How fast one enzyme converts precursor into γ-PGA — its top speed. A higher k_cat means each enzyme is more productive per second.',
    category: 'Enzyme Kinetics',
  },
  'l-glutamate': {
    title: 'L-Glutamate Precursor [S]',
    plain:
      'The raw building block of γ-PGA. γ-PGA is literally a chain of glutamate units, so how much L-glutamate is available caps how much γ-PGA can be made.',
    category: 'Enzyme Kinetics',
  },
  ggt: {
    title: 'γ-Glutamyltransferase (GGT)',
    plain:
      'An enzyme that naturally chews up γ-PGA. Knocking out its gene stops the cell from digesting its own bio-glue, letting the culture pile up large, stable yields.',
    category: 'Genetics',
  },
  pgca: {
    title: 'pgcA Gene',
    plain:
      'An enzyme that routes glucose toward building cell walls. Knocking it out redirects those precursors away from plain growth and into γ-PGA synthesis.',
    category: 'Genetics',
  },
  'wet-lab-calibration': {
    title: 'Wet-Lab Calibration',
    plain:
      'Feeding a real measured γ-PGA yield back into the model so it tunes the enzyme efficiency (k_cat) until the simulation matches the experiment — making later predictions more trustworthy.',
    category: 'Modeling',
  },

  // ---- Protein stability & structure ---------------------------------------
  'two-state-folding': {
    title: 'Two-State Folding Thermodynamics',
    plain:
      'A simplification that treats a protein as being in one of two states: folded-and-working, or unfolded-and-inactive. It lets us predict whether the protein stays functional in hot, salty, soil-like conditions.',
    category: 'Biophysics',
  },
  'folding-curve': {
    title: 'Operative Folding Curve',
    plain:
      'A graph of how much protein stays folded as temperature rises. It sits high (mostly folded) at low temperature, then drops sharply near the melting point where the protein unfolds and loses function.',
    category: 'Biophysics',
  },
  'melting-point': {
    title: 'Melting Point (Tm)',
    plain:
      'The temperature at which half the protein has unfolded. Above it, function falls off quickly.',
    category: 'Biophysics',
  },
  'pdb-file': {
    title: 'PDB File (.pdb)',
    plain:
      'A standard file that stores the 3D coordinates of every atom in a protein, so a viewer can draw the folded structure and let you rotate and zoom into it.',
    category: 'Structural Biology',
  },
  'alpha-helix': {
    title: 'Alpha-Helix',
    plain:
      'A spiral-shaped stretch of the protein backbone. Helices help stabilize the fold and often carry catalytic residues.',
    category: 'Structural Biology',
  },
  'beta-sheet': {
    title: 'Beta-Sheet',
    plain:
      'Flat, arrow-like stretches of backbone that pack together into a stable protein core.',
    category: 'Structural Biology',
  },
  'active-site': {
    title: 'Active Site',
    plain:
      'The pocket of the enzyme where the chemistry happens — where the substrate binds and is converted to product.',
    category: 'Structural Biology',
  },

  // ---- Cross-linking / material --------------------------------------------
  'shear-modulus': {
    title: 'Shear Modulus (G = νRT)',
    plain:
      'A measure of the gel\'s stiffness. It rises with the density of cross-links (ν) times the gas constant (R) times temperature (T). A stiffer sand-polymer network resists erosion and movement better.',
    category: 'Biophysics',
  },
  'cross-linking': {
    title: 'Ionic Cross-Linking',
    plain:
      'Calcium ions (Ca²⁺) act as bridges that tie many γ-PGA chains together into a net. More bridges make a denser, stronger gel around the sand grains — γ-PGA is the net, calcium is the knots, sand is caught inside.',
    category: 'Biochemistry',
  },
  kd: {
    title: 'Dissociation Constant (Kd)',
    plain:
      'How tightly calcium sticks to γ-PGA. A lower Kd means stronger binding, which usually means a more stable cross-linked network.',
    category: 'Biochemistry',
  },
  'calcium-ion': {
    title: 'Calcium Ion (Ca²⁺)',
    plain:
      'The positively charged mineral that bridges negatively charged polymer chains (γ-PGA or alginate) together, turning loose gel into a firm binder.',
    category: 'Biochemistry',
  },
  saturation: {
    title: 'Saturation Density (θ)',
    plain:
      'The fraction of the available calcium-binding sites that are actually occupied right now. Full saturation gives the maximum possible hardening.',
    category: 'Chemical Physics',
  },

  // ---- Ecology / biosafety -------------------------------------------------
  'cellular-automata': {
    title: 'Cellular Automata',
    plain:
      'A grid-based simulation where each cell spreads into neighboring squares based on local rules — moisture, nutrients, and survival probabilities — mimicking how a colony would creep across sand.',
    category: 'Computation',
  },
  'kill-switch': {
    title: 'Kill Switch (Biocontainment)',
    plain:
      'An engineered safety circuit: when moisture drops below a safe threshold, the bacteria lose viability and stop growing. This keeps the engineered strain from spreading beyond the treated area.',
    category: 'Biocontainment',
  },
  'fisher-kpp': {
    title: 'Fisher–KPP Front Speed',
    plain:
      'The speed at which a growing bacterial colony pushes its edge outward. When cells both grow (rate µ) and spread (diffusivity D), the front travels at c = 2·√(D·µ) — the classic Fisher–Kolmogorov travelling wave. Dosing calcium lowers D (it disables the surfactin-driven sliding), so the colony spreads more slowly.',
    category: 'Ecology',
  },
  'moisture-spread': {
    title: 'Moisture Spread Probability',
    plain:
      'How likely bacterial activity and moisture are to pass from one patch of sand to the next. Bacteria need water to stay active, so higher spread lets them cover more ground before the kill switch triggers.',
    category: 'Ecology',
  },
  biofilm: {
    title: 'Biofilm',
    plain:
      'A dense community of bacteria embedded in the polymer they secrete. A good biofilm both holds moisture and lays down the γ-PGA crust.',
    category: 'Microbiology',
  },

  // ---- Aeolian / wind ------------------------------------------------------
  'aeolian-transport': {
    title: 'Aeolian Transport',
    plain:
      'The way wind lifts, carries, and erodes loose sand. Strengthening soil cohesion is about stopping this transport before it kicks up a dust storm.',
    category: 'Geodynamics',
  },
  saltation: {
    title: 'Saltation',
    plain:
      'The main wind-erosion mechanism: loose grains bounce repeatedly along the ground under wind shear, knocking more grains loose and building up airborne dust as they collide.',
    category: 'Wind Mechanics',
  },
  'friction-velocity': {
    title: 'Friction Velocity (u*)',
    plain:
      'A measure of the wind\'s shearing force at the sand surface. If it climbs above the sand\'s critical threshold, grains start to move and erode.',
    category: 'Wind Mechanics',
  },
  'threshold-velocity': {
    title: 'Threshold Velocity (u*t)',
    plain:
      'The wind speed at which sand just begins to move. The bio-crust raises this threshold, so it takes a stronger wind to erode treated sand than bare sand.',
    category: 'Wind Mechanics',
  },
  'bagnold-threshold': {
    title: 'Bagnold Threshold',
    plain:
      'The classic sand-transport relationship linking grain size, air and sand density, and cohesion to the wind speed needed to start erosion. It underlies the wind-tunnel prediction.',
    category: 'Wind Mechanics',
  },

  // ---- Prong 2 · CaCO₃ ------------------------------------------------------
  'carbonic-anhydrase': {
    title: 'Carbonic Anhydrase (CA)',
    plain:
      'An enzyme that speeds up turning CO₂ and water into bicarbonate/carbonate. Displayed on the cell surface, it seeds calcium-carbonate cement without producing toxic ammonia.',
    category: 'Enzyme',
  },
  sortase: {
    title: 'Sortase-Mediated Ligation',
    plain:
      'A method to covalently staple carbonic anhydrase onto the bacterial surface. In the model it displays slightly more active enzyme than the binding-motif route, making it the preferred anchoring strategy.',
    category: 'Protein Display',
  },
  'cwbd-binding': {
    title: 'LytE-CWBD Binding',
    plain:
      'An alternative anchor that uses a cell-wall-binding motif to attach carbonic anhydrase to the surface, instead of the sortase staple.',
    category: 'Protein Display',
  },
  micp: {
    title: 'Biomineralization (MICP)',
    plain:
      'Microbially-induced carbonate precipitation: bacteria drive the chemistry that grows calcium-carbonate crystals, cementing sand grains together.',
    category: 'Biomineralization',
  },
  'carbonate-speciation': {
    title: 'Carbonate Speciation (Bjerrum)',
    plain:
      'How the dissolved carbon splits between CO₂, bicarbonate, and carbonate depending on pH. Higher pH favors carbonate ions, which are the form needed to precipitate CaCO₃.',
    category: 'Geochemistry',
  },
  'saturation-index': {
    title: 'Saturation Index (Ω / SI)',
    plain:
      'A measure of how strongly the solution "wants" to precipitate calcium carbonate. Above saturation it forms crystals; undersaturated conditions dissolve them instead.',
    category: 'Geochemistry',
  },
  calcite: {
    title: 'Calcite',
    plain:
      'The stable crystalline form of calcium carbonate that cements the sand. More calcite content means a stronger, more cemented crust.',
    category: 'Mineralogy',
  },
  ucs: {
    title: 'Unconfined Compressive Strength (UCS)',
    plain:
      'How much crushing load the cemented sand can take before failing. It grows with calcite content — the standard strength metric for bio-cement.',
    category: 'Geomechanics',
  },
  'co2-sequestration': {
    title: 'CO₂ Sequestration',
    plain:
      'Locking carbon dioxide into solid mineral (calcium carbonate) so it is captured rather than released — a climate co-benefit of the cementing pathway.',
    category: 'Sustainability',
  },
  'maze-mazf': {
    title: 'MazE/MazF Kill-Switch',
    plain:
      'A toxin–antitoxin safety system. MazF is a toxin that shreds the cell’s RNA; MazE is the short-lived antitoxin that neutralises it. While the engineered bacteria stay in place they keep making antitoxin, but as the plasmid dilutes out over generations (or conditions change), the toxin wins and the cells self-limit — stopping overspread and gene transfer to wild microbes.',
    category: 'Biosafety',
  },
  'prong-interaction': {
    title: 'Inter-Prong Interaction',
    plain:
      'The prongs are not independent. Combined, they interact: all three compete for the same soil calcium, γ-PGA and carbonic anhydrase compete for the same cell’s energy budget when co-expressed, and some pairs help each other (γ-PGA seeds calcite; alginate keeps things damp). The model accounts for both the competition and the cooperation.',
    category: 'Systems',
  },
  'chemical-spray': {
    title: 'Chemical Dust Suppressant',
    plain:
      'The conventional way to hold down dust: spraying petrochemical polymers or salts over the ground. It works, but it is costly per hectare, needs re-applying, and is not biodegradable — the baseline our biological approach is measured against.',
    category: 'Economics',
  },
  dic: {
    title: 'Dissolved Inorganic Carbon (DIC)',
    plain:
      'The total pool of dissolved carbon (CO₂ + bicarbonate + carbonate) available to be turned into solid carbonate cement.',
    category: 'Geochemistry',
  },

  // ---- Prong 3 · Alginate ---------------------------------------------------
  'sodium-alginate': {
    title: 'Sodium Alginate',
    plain:
      'A ready-made, plant/seaweed-derived biopolymer sprayed straight onto sand — no bacteria needed. Calcium cross-links it into a gel that holds grains and moisture, though it can weaken after repeated rain.',
    category: 'Biopolymer',
  },
  'egg-box': {
    title: 'Egg-Box Gelation',
    plain:
      'The way calcium ions slot between alginate chains like eggs in a carton, locking them into a gel. Adding calcium sharply increases strength until the binding sites fill up and the curve levels off.',
    category: 'Biochemistry',
  },
  'moisture-retention': {
    title: 'Moisture Retention',
    plain:
      'How much water the gel can hold at a given humidity. Retained moisture keeps the crust flexible and helps bind the sand.',
    category: 'Material Property',
  },
  'rain-washout': {
    title: 'Rain Washout Durability',
    plain:
      'How well the alginate treatment survives repeated wetting. Each wet cycle can dissolve a little of the gel, so durability tracks how many storms it can take.',
    category: 'Material Property',
  },

  // ---- Composite / macro ----------------------------------------------------
  'composite-cohesion': {
    title: 'Composite Cohesion',
    plain:
      'The combined sand-binding strength when more than one prong is used. It adds each material\'s contribution, then corrects for how they help or slightly interfere with each other.',
    category: 'Composite Mechanics',
  },
  synergy: {
    title: 'Synergy / Interaction Term',
    plain:
      'Whether the materials reinforce each other (positive) or compete slightly (negative) when combined. A small negative synergy means the mix performs just below the simple sum of its parts.',
    category: 'Composite Mechanics',
  },
  'failure-mode': {
    title: 'Failure-Mode Robustness',
    plain:
      'How well each strategy holds up against different stresses — drought/heat, flood/rain, bacterial death, high wind, and long-term wear. Combining prongs covers each other\'s weak points.',
    category: 'Reliability',
  },
  lca: {
    title: 'Life-Cycle Assessment (LCA)',
    plain:
      'An accounting of the environmental cost and benefit across the whole process — here, the CO₂ avoided by skipping cement kilns plus the carbon trapped in the crust.',
    category: 'Sustainability',
  },

  // ---- Wet lab -------------------------------------------------------------
  od600: {
    title: 'Cell Density (OD600)',
    plain:
      'A quick optical reading of how cloudy the culture is, used to estimate how many bacterial cells are present. Higher OD600 can support a denser biofilm — as long as cells stay viable and fed.',
    category: 'Wet Lab',
  },
  inoculation: {
    title: 'Inoculation',
    plain:
      'Adding the starter bacterial culture to the sand or medium. The pattern (center, corners, random) sets where growth begins in the spread simulation.',
    category: 'Wet Lab',
  },
  anaplerosis: {
    title: 'Anaplerosis',
    plain:
      'The cell\'s "top-up" reactions (like pyruvate carboxylase) that refill central metabolism when γ-PGA production siphons off building blocks — so the engine doesn\'t stall while making product.',
    category: 'Metabolic Modeling',
  },
  oxaloacetate: {
    title: 'Oxaloacetate',
    plain:
      'A hub molecule of the TCA cycle. Making γ-PGA drains it, so the model adds a top-up (anaplerotic) reaction to keep it from running dry.',
    category: 'Metabolic Modeling',
  },
  gdcw: {
    title: 'gDCW (grams dry cell weight)',
    plain:
      'How much bacteria you have once the water is removed. Metabolic rates are quoted "per gram dry cell weight per hour" so they don\'t depend on culture volume.',
    category: 'Metabolic Modeling',
  },
  aerobiosis: {
    title: 'Aerobiosis',
    plain:
      'Growing with oxygen. The oxygen-uptake ceiling sets how much the cell can respire; starve it of O₂ and it switches to less-efficient fermentation.',
    category: 'Metabolic Modeling',
  },
  fermentation: {
    title: 'Fermentation',
    plain:
      'Energy metabolism without enough oxygen. It wastes carbon by dumping overflow by-products like acetate instead of routing it to growth or product.',
    category: 'Metabolic Modeling',
  },
  'stoichiometric-matrix': {
    title: 'Stoichiometric Matrix (S)',
    plain:
      'The table of how every reaction consumes and produces each metabolite. FBA enforces S·v = 0 (mass balance), so at steady state nothing piles up inside the cell.',
    category: 'Metabolic Modeling',
  },
  'constraint-based': {
    title: 'Constraint-Based Modelling',
    plain:
      'Predicting cell behaviour without knowing every reaction speed — you just set bounds on each reaction and find the best flux pattern allowed. FBA is the classic example.',
    category: 'Metabolic Modeling',
  },
  'tca-cycle': {
    title: 'TCA Cycle',
    plain:
      'The tricarboxylic-acid (Krebs) cycle — central metabolism\'s hub that burns carbon for energy and hands out building blocks for growth and products.',
    category: 'Metabolic Modeling',
  },
  chemostat: {
    title: 'Chemostat',
    plain:
      'A continuous culture kept at steady state by constant feed and outflow. Running it at several feed rates lets the lab measure constants like maintenance energy.',
    category: 'Wet Lab',
  },
  simplex: {
    title: 'Simplex Method',
    plain:
      'The classic algorithm for solving linear programs exactly. The FBA here uses a two-phase primal simplex to find the optimal flux vector.',
    category: 'Metabolic Modeling',
  },
  vaterite: {
    title: 'Vaterite',
    plain:
      'A less-stable crystal form of calcium carbonate that often precipitates first in microbial systems before slowly converting to calcite. Desert MICP frequently makes vaterite.',
    category: 'Material Science',
  },
  guluronate: {
    title: 'Guluronate (G-blocks)',
    plain:
      'One of the two sugar blocks in alginate. Long stretches of G-blocks are what grab calcium and zip the chains into the rigid "egg-box" gel.',
    category: 'Material Science',
  },
  supersaturation: {
    title: 'Supersaturation (Ω)',
    plain:
      'When water holds more dissolved mineral than it can keep in solution (Ω > 1), crystals start to form. It is the driving force for CaCO₃ precipitation.',
    category: 'Material Science',
  },
  langmuir: {
    title: 'Langmuir Binding',
    plain:
      'A simple saturating-binding model: sites fill up as you add more of something, then level off. Used here for calcium binding to γ-PGA and alginate.',
    category: 'Material Science',
  },
  'grain-size-distribution': {
    title: 'Grain-Size Distribution',
    plain:
      'Sand is a mix of grain sizes, not one. UAE dune sand is mostly 100–300 µm (median ≈ 200 µm). This matters because no single binder grips every size — calcite cements fine-medium grains best, so we track how much of the whole size distribution is actually held.',
    category: 'Aeolian Physics',
    module: 'Grain-Size Coverage',
  },
  'grain-size-coverage': {
    title: 'Grain-Size Coverage',
    plain:
      'The fraction of the sand\'s mass that is actually bound once you account for every grain size. MICP (CaCO₃) works best at 63–125 µm; γ-PGA and alginate close the coarse and fine gaps it misses, so together the three prongs cover far more of the size range than any one alone.',
    category: 'Aeolian Physics',
    module: 'Grain-Size Coverage',
  },
  curing: {
    title: 'Curing (Maturation)',
    plain:
      'The time the sprayed crust needs to reach full strength. The protocol sprays at 0, 8, 16, 24 and 32 hours to keep the biofilm hydrated; it is "fully mature" at 32 h. Alginate gels instantly, γ-PGA sets within hours, and the calcite cement ripens slowly over the whole 32 h.',
    category: 'Deployment',
    module: 'Curing & Deployment Timeline',
  },
  reapplication: {
    title: 'Re-application',
    plain:
      'The crust slowly weathers, so the spray cycle is repeated about every 6 months. In the model, re-application is "due" when the surviving cohesion drops below the level needed to withstand the design wind. A durable calcite floor stretches this interval.',
    category: 'Deployment',
    module: 'Curing & Deployment Timeline',
  },
  'ostwald-ripening': {
    title: 'Ostwald Ripening',
    plain:
      'When a less-stable crystal (like vaterite) slowly re-dissolves and re-grows as the more stable form (calcite). It is why a vaterite-rich crust stiffens over time as the vaterite converts to stronger calcite.',
    category: 'Material Science',
  },
};

/** Alternate spellings / keys used in code, routed to a canonical GLOSSARY key. */
export const ALIASES: Record<string, string> = {
  'gamma-pga': 'gamma-pga',
  'γ-pga': 'gamma-pga',
  'poly-γ-glutamic acid': 'gamma-pga',
  'flux balance analysis': 'flux-balance-analysis',
  fba: 'flux-balance-analysis',
  'bacillus subtilis': 'bacillus-subtilis',
  'shear modulus': 'shear-modulus',
  gs: 'shear-modulus',
  'aeolian transport': 'aeolian-transport',
  'cross-linking': 'cross-linking',
  crosslinking: 'cross-linking',
  'k_cat': 'k-cat',
  kcat: 'k-cat',
  'l-glutamate': 'l-glutamate',
  'stochastic growth ca': 'cellular-automata',
  'arid apoptosis': 'kill-switch',
  'pdb file': 'pdb-file',
  'od600': 'od600',
  'u*': 'friction-velocity',
  'u*t': 'threshold-velocity',
  'δpta': 'acetate-overflow',
  pta: 'acetate-overflow',
  'overflow metabolism': 'acetate-overflow',
  'acetate overflow': 'acetate-overflow',
  tca: 'tca-cycle',
  'tca cycle': 'tca-cycle',
  'krebs cycle': 'tca-cycle',
  'g-blocks': 'guluronate',
  'g blocks': 'guluronate',
  'egg-box': 'egg-box',
  'dry cell weight': 'gdcw',
  'constraint based': 'constraint-based',
  'stoichiometric matrix': 'stoichiometric-matrix',
  'primal simplex': 'simplex',
};

/** Normalize a lookup key: lowercase, collapse whitespace, trim symbols we route on. */
function normalize(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Resolve any human/alias key to a canonical GLOSSARY entry (or undefined). */
export function lookupTerm(key: string): { id: string; entry: GlossaryEntry } | undefined {
  const n = normalize(key);
  // direct hit on canonical slug (hyphenated)
  const slug = n.replace(/\s+/g, '-');
  if (GLOSSARY[slug]) return { id: slug, entry: GLOSSARY[slug] };
  if (GLOSSARY[n]) return { id: n, entry: GLOSSARY[n] };
  // alias route
  const aliased = ALIASES[n] || ALIASES[slug];
  if (aliased && GLOSSARY[aliased]) return { id: aliased, entry: GLOSSARY[aliased] };
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
    add(id.replace(/-/g, ' '), id);
    const title = entry.title.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
    add(title, id);
    const paren = entry.title.match(/\(([^)]+)\)/);
    if (paren) add(paren[1], id);
  }
  return [...seen.values()].sort((a, b) => b.phrase.length - a.phrase.length);
}
