import type { WikiLink } from "@/src/lib/wikiLinks";

/**
 * The engineering cycle of the models themselves: five turns on the models and
 * one on teaching them.
 * ==========================================================================
 * The same six iterations the wiki's Model page shows, kept here so the
 * toolkit and the wiki do not drift apart. Each stage is a sentence or two
 * because it is read inside a card beside the cycle diagram, and each
 * iteration links to where it is written up in full.
 *
 * This is the long view. `designCycle.ts` is the scroll-scrubbed story of the
 * first two turns, told in paragraphs; this is all six, told in stages.
 */

export type ModelCycleStageKey = "design" | "build" | "test" | "learn";

export type ModelCycleIteration = {
  short: string;
  title: string;
  summary: string;
  wiki: WikiLink;
  cycle: Record<ModelCycleStageKey, string>;
};

export const MODEL_CYCLE_STAGES: readonly { key: ModelCycleStageKey; name: string }[] = [
  { key: "design", name: "Design" },
  { key: "build", name: "Build" },
  { key: "test", name: "Test" },
  { key: "learn", name: "Learn" },
];

/** Shown beside the cycle while the wet lab side of each turn is still open. */
export const MODEL_CYCLE_STATUS = "Experiments are ongoing!";

export const MODEL_CYCLE_STATUS_NOTE =
  "The carrier turn rests on our own wet lab measurement. The others were closed with modelling, literature and public data, and our measurements will reopen them as they come in.";

export const MODEL_CYCLE: readonly ModelCycleIteration[] = [
  {
    short: "Routes",
    title: "Choosing the routes",
    summary:
      "We set one target from the wind, modelled three ways to reach it, and kept two.",
    wiki: { path: "/model#model-prongs", label: "The routes" },
    cycle: {
      design:
        "We worked out how much cohesion a crust needs before a 30 m/s wind stops lifting UAE dune sand, and aimed every model at that target.",
      build:
        "We modelled three routes separately: γ-PGA cross-linked by calcium, calcium carbonate from displayed carbonic anhydrase, and purchased sodium alginate.",
      test: "Alginate took calcium the other routes needed and held water the cells need. The other two covered different grain sizes.",
      learn:
        "We dropped alginate and kept the two routes together. Separately, we added a MazE/MazF kill switch over both.",
    },
  },
  {
    short: "Audit",
    title: "Auditing the crust and containment models",
    summary:
      "The models produced plots, so we recomputed every number they reported from their own constants.",
    wiki: { path: "/model/both", label: "Both routes together" },
    cycle: {
      design:
        "The models ran, but nobody had recomputed their results from the constants. We re-derived every number the toolkit reported.",
      build:
        "We fixed three errors: a missing molar mass in the cross-link density, carbonic anhydrase setting an equilibrium where it should set a rate, and a plasmid loss rate of 10% per generation.",
      test: "With the lower loss rate, the untriggered kill switch control survives a two-day run, so the trigger is what does the killing.",
      learn:
        "A model that runs is not a model that is right. The carbonate strength law is still used below its fitted range, and the plasmid loss rate is not measured in our strain.",
    },
  },
  {
    short: "Flux model",
    title: "Rebuilding the flux balance model",
    summary:
      "The audit showed the flux model could not support its own knockout claims, so we rebuilt the network.",
    wiki: { path: "/model/both#both-cell", label: "Where the carbon goes" },
    cycle: {
      design:
        "Five of seven showcased knockouts came out lethal. Deleting odhAB, a known glutamate over-producer, killed the model cell.",
      build:
        "We rebuilt the network around a biomass equation derived from cell composition, and added the non-oxidative pentose phosphate branch and malic enzyme.",
      test: "All 26 checks pass and the Python and website versions agree. Growth is 0.717 per hour, a 58 minute doubling, inside the measured range.",
      learn:
        "Two copies of a model drift apart unless something compares them. The γ-PGA flux is a stoichiometric ceiling, and only a measurement can replace it.",
    },
  },
  {
    short: "Wind",
    title: "Testing the wind model against data",
    summary:
      "We tested the sand transport model against a year it had not seen and against airport records.",
    wiki: { path: "/model/exposure", label: "Dust and the business case" },
    cycle: {
      design:
        "The sand transport model rests on a Weibull fit to ERA5 wind. We wrote five tests and set the pass criteria before seeing a result.",
      build:
        "A hold-out year, a goodness-of-fit test, a comparison with three UAE airport records, a sensitivity ranking and a dune-orientation worksheet.",
      test: "Direction agrees with the airports to within 6.3°. Flux is off by a median 18.8% out of sample, and the fit fails its own tolerance in winter.",
      learn:
        "The drift direction is well supported and the transport magnitude is not. No predicted sand flux has been compared with a measured one.",
    },
  },
  {
    short: "Carrier",
    title: "Testing the carrier on sand",
    summary:
      "The crust models give the carrier no cohesion, so our wet lab put it on sand without any cells.",
    wiki: { path: "/model/both#both-carrier", label: "The carrier on its own" },
    cycle: {
      design:
        "Dropping alginate left xanthan gum as the carrier. Every crust model assumed it adds no cohesion, and nobody had checked.",
      build:
        "Our wet lab put xanthan solutions from 0.005 to 0.5 percent on dried sand, blew each dish for 5 seconds with a hairdryer at 8 m/s, and weighed it before and after.",
      test: "Untreated dishes lost 6.7 and 14.2 g. On 14 October every treated dish lost under 0.25 g. An earlier run disagrees at the two lowest concentrations.",
      learn:
        "The carrier is not neutral. Cells have to be compared with carrier-only sand, and the crust models miss a carrier cohesion that this test cannot size.",
    },
  },
  {
    short: "Teaching",
    title: "Teaching the models",
    summary:
      "Readers outside the lab found the models too technical, so we changed how a reader reaches them.",
    wiki: { path: "/model/toolbox", label: "Modelling toolbox" },
    cycle: {
      design:
        "People outside dry lab and wet lab research read the models and told us where they got stuck. We kept the science and changed the way in.",
      build:
        "A 136-term glossary with a mascot that explains any keyword, 18 narrated videos, an arcade game built on the two routes, and a redesigned interface.",
      test: "We went back to reviewers after each round. They understood the terms, then lost interest, then finished the game but missed the way back to the model.",
      learn:
        "Clarity, attention and navigation were separate problems, and fixing one exposed the next.",
    },
  },
];
