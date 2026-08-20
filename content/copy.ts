/**
 * The canonical home for every name and one-liner that appears on more than one
 * screen.
 *
 * The audit found the same claim written seven times in seven files, each copy
 * drifted slightly from the last, and four different names for one portal. A
 * reader moving through the site was told the same thing repeatedly, in wording
 * that never quite matched. Everything here is defined once and imported.
 *
 * The line this file draws:
 *
 *   - **Names and one-liners live here.** A prong title, a portal name, the
 *     sentence that states the mechanism. These are labels, and a label that
 *     varies by file is a bug.
 *   - **Explanation stays where it is used.** The `whatItIs` paragraphs, the
 *     business-model sections, the Asked / Ran / Changed bodies. Those are not
 *     restatements, they are the same mechanism argued for a different reader,
 *     and flattening them into one string would lose the argument.
 *
 * If you find yourself typing a name that already appears below, import it.
 */

// ---------------------------------------------------------------------------
// The project
// ---------------------------------------------------------------------------

/** The wordmark line. Appears once, on the hero. */
export const PROJECT_TITLE = "Locking down the dunes";

export const PROJECT_TEAM = "NYUAD iGEM 2026";

/**
 * What the project is, in one sentence.
 *
 * This is the thesis. It is stated on the hero and nowhere else on the landing.
 * Page metadata and the arcade intro reuse it rather than inventing a sixth
 * phrasing.
 */
export const PROJECT_ONE_LINER =
  "Loose sand starts moving at a threshold wind speed. Two engineered routes bind the grains into a crust and raise that threshold. A kill switch ends the strain when the work is done.";

/** The metadata description. The one-liner, trimmed to what a search result shows. */
export const PROJECT_META_DESCRIPTION =
  "An interactive dry lab for Dunelock: engineered Bacillus subtilis binds loose sand into a crust and raises the wind speed needed to move it. Metabolism, cross-linking, aeolian transport, protein structure and biocontainment, each one modelled.";

/**
 * The mechanism, stated once.
 *
 * Cohesion raises the threshold friction velocity, and because transport climbs
 * steeply above that threshold, a modest gain in cohesion removes a large share
 * of the sand that moves. Every module on the site is judged against this one
 * number, so where a screen needs to name it, it names it from here.
 */
export const MECHANISM =
  "Cohesion raises the threshold friction velocity, and transport climbs steeply above it, so a modest gain in cohesion removes a large share of the sand that moves.";

// ---------------------------------------------------------------------------
// The prongs
// ---------------------------------------------------------------------------

/**
 * One name per prong. `prongs.ts` used to carry a second, mechanism-flavoured
 * set ("γ-PGA Overexpression", "Carbonic Anhydrase → CaCO₃"), which meant the
 * same route was called two different things depending on which screen you
 * reached it from.
 */
export const PRONG_TITLES = {
  1: "Polymer Overexpression",
  2: "Carbonic Anhydrase & Sortase",
  3: "Sodium Alginate",
} as const;

/** One lede per prong. Previously four to five phrasings each. */
export const PRONG_SHORTS = {
  1: "γ-PGA, a sticky biopolymer the cells secrete",
  2: "Cement grown between grains, without ammonia",
  3: "A gel you spread on. Modelled, not deployed",
} as const;

/** The molecule each prong turns on, for chart labels and stat units. */
export const PRONG_MOLECULES = {
  1: "poly-γ-glutamic acid",
  2: "calcium carbonate",
  3: "alginate biopolymer",
} as const;

// ---------------------------------------------------------------------------
// The kill switch
// ---------------------------------------------------------------------------

export const KILL_SWITCH_TITLE = "Biocontainment Kill Switch";

export const KILL_SWITCH_SHORT = "A toxin the cells hold in check, until they cannot";

/** How the kill switch is framed relative to the prongs. Was five phrasings. */
export const KILL_SWITCH_ROLE = "Biosafety layer over both prongs";

// ---------------------------------------------------------------------------
// Alginate
// ---------------------------------------------------------------------------

/** The archived prong's status. Was five copies and three label variants. */
export const ALGINATE_STATUS = "Modelled for comparison, not carried forward";

export const ALGINATE_RATIONALE =
  "Dropped as a prong on the evidence, still modelled in full so its trade-offs against the engineered pair stay quantifiable.";

// ---------------------------------------------------------------------------
// Portals
//
// Each of these had three to five names across its card, its intro modal, its
// page heading and the module registry.
// ---------------------------------------------------------------------------

export const PORTAL_NAMES = {
  wetlab: "Wet Lab Sandbox",
  pipeline: "Flux Balance Analysis",
  protein: "Protein Structure Explorer",
  xanthan: "Xanthan Gum Flow Model",
} as const;

// ---------------------------------------------------------------------------
// Navigation
//
// One label per destination. The audit found three labels for skipToModels(),
// five for /exposure and five for the trip home.
// ---------------------------------------------------------------------------

export const NAV = {
  /** Leaves the story and lands on the model index. */
  toModels: "Explore the models",
  /** Shown only while the story is playing itself. */
  skipStory: "Skip the story",
  backToOverview: "Back to the overview",
  backToPortals: "Back to the portals",
  revealMath: "Show the math",
  /** Prefix for a link from a story beat to the model that quantifies it. */
  modelLink: "Model",
} as const;
