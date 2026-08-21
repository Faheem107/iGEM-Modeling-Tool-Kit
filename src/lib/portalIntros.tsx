import { PRONGS } from "./portalsData";
import { PORTAL_NAMES, KILL_SWITCH_TITLE } from "@/content/copy";

// The three-part explainer shown when a portal (or a prong combination) is
// opened: what it is, how it works, what it reports. Those used to be printed
// as labels above each paragraph, which announced the paragraph instead of
// being it. The paragraphs say it themselves now. See DESIGN.md §5.

export interface IntroStep {
  body: string;
}

export interface PortalIntroContent {
  /** localStorage key so a per-portal "don't show again" choice can be remembered. */
  storageKey: string;
  title: string;
  steps: [IntroStep, IntroStep, IntroStep];
}

export const PORTAL_INTROS: Record<
  "pipeline" | "wet-lab" | "protein" | "xanthan-flow",
  PortalIntroContent
> = {
  pipeline: {
    storageKey: "portal-intro:pipeline-fba",
    title: PORTAL_NAMES.pipeline,
    steps: [
      {
        body: "A constraint-based model of the engineered B. subtilis metabolism, the mathematical core that decides how the cell splits its carbon between growing and making bio-adhesive.",
      },
      {
        body: "It solves a real linear program on the mass-balanced reaction network (S·v = 0, subject to the glucose and oxygen limits you set) to find the best the cell can do, then lets you knock out genes and watch the carbon re-route.",
      },
      {
        body: "It reports the optimal flux distribution: the maximum γ-PGA or carbonic-anhydrase yield, the growth trade-off, and which reactions are the true bottlenecks.",
      },
    ],
  },
  "wet-lab": {
    storageKey: "portal-intro:wet-lab",
    title: PORTAL_NAMES.wetlab,
    steps: [
      {
        body: "A 2-D sandbox running the same assays the wet-lab team runs on treated sand.",
      },
      {
        body: "It simulates the engineered biopolymer spreading across a sand bed so you can watch a cohesive crust form under conditions you set.",
      },
      {
        body: "It reports surface coverage, propagation rate and crust cohesion, driven by the same γ-PGA yield and shear-modulus values the pipeline computes.",
      },
    ],
  },
  protein: {
    storageKey: "portal-intro:protein",
    title: PORTAL_NAMES.protein,
    steps: [
      {
        body: "A structural viewer for the two enzymes the design turns on: carbonic anhydrase, and the sortase that pins it to the cell wall.",
      },
      {
        body: "It draws the deposited PDB structures in 3-D and shows the fold coming apart as temperature climbs.",
      },
      {
        body: "It reports the thermal stability of the enzyme: the fraction of protein that stays correctly folded and active across the desert's temperature swings.",
      },
    ],
  },
  "xanthan-flow": {
    storageKey: "portal-intro:xanthan-flow",
    title: PORTAL_NAMES.xanthan,
    steps: [
      {
        body: "A power-law (Ostwald–de Waele) rheology model for how a xanthan gum solution, the shear-thinning carrier fluid used to pump the biopolymer mix, moves through the tubing that delivers it to the dune.",
      },
      {
        body: "It relates mean flow speed to the pressure drop across a straight cylindrical tube, and shows how diluting the gum with water changes both numbers, using the consistency index K and flow-behaviour index n measured for the solution.",
      },
      {
        body: "It reports the pressure required to hit a target flow speed, how strongly dilution loosens the flow, and whether the flow stays laminar, via the Metzner–Reed Reynolds number.",
      },
    ],
  },
};

/** The biocontainment kill switch, modelled on its own (the biosafety element). */
export const KILL_SWITCH_INTRO: PortalIntroContent = {
  storageKey: "portal-intro:killswitch",
  title: KILL_SWITCH_TITLE,
  steps: [
    {
      body: "A MazE/MazF toxin and antitoxin pair, carried by the engineered B. subtilis. MazF cuts the cell's own RNA and kills it. MazE binds MazF and stops that, but breaks down fast, so the cell has to keep making more to stay alive.",
    },
    {
      body: "Add the aTc trigger and the toxin wins, so the cells die. Even with no trigger, the antitoxin plasmid dilutes out over generations and the strain limits itself. A second copy kills any wild microbe that picks up the genes.",
    },
    {
      body: "It reports the kill dynamics and time to clear the population, how well horizontal gene transfer is contained, and how many rounds of germination it takes to clear dormant spores.",
    },
  ],
};

/**
 * Build the explainer for a prong-tailored /model run by composing each selected
 * prong's own summary, plus a combined "what we model together" line.
 */
export function buildModelIntro(prongIds: number[]): PortalIntroContent {
  const chosen = PRONGS.filter((p) => prongIds.includes(p.id));
  const key = prongIds.slice().sort().join(",");

  const names = chosen.map((p) => p.title);
  const namesJoined =
    names.length <= 1
      ? names[0] ?? "your selection"
      : names.slice(0, -1).join(", ") + " and " + names[names.length - 1];

  return {
    storageKey: `portal-intro:model:${key}`,
    // Title carries the selected prong(s), e.g. "Tailored Simulation of γ-PGA …".
    title:
      chosen.length === 0
        ? "Tailored Simulation"
        : `Tailored Simulation of ${namesJoined}`,
    steps: [
      {
        body:
          chosen.length === 0
            ? "A workspace built around the prongs you picked."
            : `A simulation workspace tailored to ${namesJoined}.`,
      },
      {
        // The biological job the prong(s) do in the desert during deployment.
        body:
          chosen.length === 0
            ? "It stabilises the dune surface by binding loose sand grains into a cohesive crust."
            : chosen.map((p) => p.inDesert).join(" "),
      },
      {
        body:
          chosen.length > 1
            ? "It reports how the selected prongs combine: the total crust strength, CO₂ captured, and wind resistance you get when they work together."
            : (chosen[0]?.impact ??
              "The strength the crust reaches, and how long it holds."),
      },
    ],
  };
}
