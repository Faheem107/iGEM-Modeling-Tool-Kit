import { MECHANISM } from "@/content/copy";

/**
 * The engineering design cycle, as it actually ran.
 * ==========================================================================
 * One paragraph per beat, told the way you would say it out loud: what we were
 * trying to answer, what happened, and what it changed. It used to be three
 * separately labelled blocks, Asked / Ran / Changed, five times over, which is
 * a lab report rather than a story. The labels are gone because each paragraph
 * already opens with the question and closes with the consequence.
 *
 * The third part is the one a narrative usually leaves out, and it is the only
 * thing that makes a loop a loop. A stage that changed nothing was not a turn
 * of the cycle, so every body below has to end somewhere different from where
 * it started.
 */

export type CycleStage = "Design" | "Build" | "Test" | "Learn";

export const CYCLE_STAGES: CycleStage[] = ["Design", "Build", "Test", "Learn"];

export interface CycleBeat {
  stage: CycleStage;
  /** Which pass through the loop this belongs to. */
  turn: 1 | 2;
  title: string;
  /** The whole beat, in two to four sentences. */
  body: string;
}

export const CYCLE_BEATS: CycleBeat[] = [
  {
    stage: "Design",
    turn: 1,
    title: "Wind moves the sand",
    body:
      "We started with how strong a crust has to be before the wind stops lifting grains. That meant putting numbers on the grain sizes in UAE dune sand, the wind speeds those grains see, and the threshold friction velocity that separates a still surface from a moving one. " +
      MECHANISM +
      " Every module built after this was aimed at that same target.",
  },
  {
    stage: "Build",
    turn: 1,
    title: "Three prongs",
    body:
      "With a target to hit, the question became which biological route could reach it. We built three of them separately: γ-PGA overexpression as a sticky matrix, carbonic anhydrase for calcium-carbonate cement, and sodium alginate as an applied binder. Modelling them apart is what made them comparable, because no route was flattered by being averaged with another.",
  },
  {
    stage: "Test",
    turn: 1,
    title: "One route drops out, one layer goes on",
    body:
      "Running all three did not leave all three standing. Alginate absorbs water the cells need and depends on a calcium supply the site does not guarantee, so it stopped being a prong. Separately we worked out what releasing a live engineered strain would take to be reversible, and added a MazE/MazF kill switch over both remaining prongs. The deployment can now be ended, not only started.",
  },
  {
    stage: "Learn",
    turn: 1,
    title: "From cell to crust",
    body:
      "Next we checked whether a change inside the cell reaches the surface. Flux balance analysis feeds polymer kinetics, kinetics feeds cross-linking, and cross-linking feeds the cohesion the wind model reads, so one grain can be traced from metabolism to cured crust. The two prongs turned out to be complementary rather than redundant. Calcite covers the 63 to 125 µm band well and γ-PGA closes the coarse and fine gaps, which is why they are deployed together.",
  },
  {
    stage: "Design",
    turn: 2,
    title: "From bench to field",
    body:
      "The second turn asks which experiment is worth doing next. We ran the same chain backwards: the wind target sets the cohesion needed, cohesion sets the polymer yield, and yield sets the glutamate and OD600 the bench has to hit. The model names the assay instead of waiting for one, and when a measurement comes back it replaces an assumed parameter and the loop runs again.",
  },
];
