import { moduleHref } from "./modelIndex";

/**
 * The engineering design cycle, as it actually ran.
 * ==========================================================================
 * Each beat carries four things rather than one paragraph: what we were trying
 * to answer, what we ran, what the result changed in the project, and where the
 * evidence lives. The third of those is the one a narrative usually leaves out,
 * and it is the only thing that makes a loop a loop. A stage that changed
 * nothing was not a turn of the cycle.
 */

export type CycleStage = "Design" | "Build" | "Test" | "Learn";

export const CYCLE_STAGES: CycleStage[] = ["Design", "Build", "Test", "Learn"];

export interface CycleBeat {
  stage: CycleStage;
  /** Which pass through the loop this belongs to. */
  turn: 1 | 2;
  title: string;
  /** What we were trying to answer. */
  question: string;
  /** What we ran. */
  did: string;
  /** What the answer changed. */
  changed: string;
  evidence?: { label: string; href: string };
}

export const CYCLE_BEATS: CycleBeat[] = [
  {
    stage: "Design",
    turn: 1,
    title: "Wind moves the sand",
    question: "How strong does a crust have to be before the wind stops lifting grains?",
    did: "Turned the question into numbers: the grain sizes in UAE dune sand, the wind speeds those grains see, and the threshold friction velocity that separates a still surface from a moving one.",
    changed:
      "Gave every later module the same target. Cohesion raises the threshold, and transport climbs steeply above it, so that one number is what all three routes were later judged against.",
    evidence: { label: "Aeolian Wind Tunnel", href: moduleHref("1,2", "aeolian") },
  },
  {
    stage: "Build",
    turn: 1,
    title: "Three prongs",
    question: "Which biological route can reach that threshold?",
    did: "Built three separately: γ-PGA overexpression as a sticky matrix, carbonic anhydrase for calcium-carbonate cement, and sodium alginate as an applied binder. Each got its own model rather than a shared score.",
    changed:
      "Modelling them apart is what made them comparable. The same wind target, three independent paths to it, no route flattered by being averaged with another.",
    evidence: { label: "Grain-Size Coverage", href: moduleHref("1,2", "grainsize") },
  },
  {
    stage: "Test",
    turn: 1,
    title: "One route drops out, one layer goes on",
    question: "Do all three hold up when you run them?",
    did: "Ran the three. Alginate absorbs water the cells need and needs a calcium supply the site does not guarantee. Separately, we worked out what releasing a live engineered strain would require to be reversible.",
    changed:
      "Two decisions, taken for unrelated reasons. Alginate stopped being a prong. A MazE/MazF kill switch was added over both engineered prongs, so the deployment can be ended rather than only started.",
    evidence: { label: "Biocontainment Kill Switch", href: moduleHref("1,2", "killswitch") },
  },
  {
    stage: "Learn",
    turn: 1,
    title: "From cell to crust",
    question: "Does a change inside the cell reach the surface?",
    did: "Chained the modules: flux balance analysis into polymer kinetics, kinetics into cross-linking, cross-linking into the cohesion the wind model reads. One grain can be traced from metabolism to cured crust.",
    changed:
      "The prongs turned out to be complementary rather than redundant. Calcite covers the 63 to 125 µm band well and γ-PGA closes the coarse and fine gaps, which is why they are deployed together.",
    evidence: { label: "Composite Strength", href: moduleHref("1,2", "composite") },
  },
  {
    stage: "Design",
    turn: 2,
    title: "From bench to field",
    question: "Which experiment is worth doing next?",
    did: "Ran the chain backwards. The wind target sets the cohesion needed, cohesion sets the polymer yield, and yield sets the glutamate and OD600 the bench has to hit.",
    changed:
      "The model now names the assay instead of waiting for one. Measurements come back from the lab, replace an assumed parameter, and the loop runs again.",
    evidence: { label: "Wet-Lab Sandbox", href: moduleHref("1", "wetlab") },
  },
];
