/**
 * Business model copy.
 *
 * Written to match what the model can actually defend. Where a number is not
 * sourced the text says so rather than rounding to something plausible.
 * House style: see the "Writing style" and "Writing tone" sections of CLAUDE.md.
 *
 * Kept short on purpose. This opens from a bookmark at the edge of /exposure,
 * next to the model it describes, so it is a short read that points at the
 * numbers rather than an essay that restates them. Two or three sentences per
 * section is the budget.
 */
import { MECHANISM } from "@/content/copy";

export interface BusinessSection {
  id: string;
  label: string;
  heading: string;
  body: string[];
}

export const BUSINESS_SUMMARY =
  "The model estimates how much sand a patch of ground sends to an asset in a given " +
  "season, and how much less it would send after treatment. Whether that difference is " +
  "worth what treatment costs is a separate question, and the parts we cannot answer yet " +
  "are marked as such.";

export const BUSINESS_SECTIONS: BusinessSection[] = [
  {
    id: "problem",
    label: "The question",
    heading: "What a patch of ground sends to an asset",
    body: [
      "Wind-blown sand reaches solar farms, roads and industrial yards across the Gulf. The responses in use are at the receiving end: panels washed on a schedule, carriageways cleared by municipal crews, filters replaced on an interval. They work, and they are budgeted for as recurring maintenance.",
      "What interested us is the step before that. If the sand comes from identifiable ground upwind, treating that ground is a different intervention with a different cost profile. Pricing it needs a number the maintenance approach never has to compute: how much of the sand at this asset came from that patch.",
    ],
  },
  {
    id: "product",
    label: "The intervention",
    heading: "Cohesion at the source, in one parameter",
    body: [
      "Engineered Bacillus subtilis binds loose surface sand into a crust, which raises the wind speed at which a grain first lifts. Below that speed the surface does not move.",
      "The effect concentrates into a single measured parameter. " + MECHANISM + " So the same calculation runs twice, untreated and treated, and the difference is the result. That is a clean structure and also a narrow one: it inherits whatever the cohesion measurement gets wrong, and it assumes the crust holds for the period being priced.",
    ],
  },
  {
    id: "who",
    label: "Receptors",
    heading: "Four receptors, and how far the evidence reaches",
    body: [
      "Utility solar is the easiest to quantify, because the relation between dust on glass and lost transmittance is published and measured. Roads fit the physics better: sand on a carriageway is exactly the short-range transport the crust acts on, and no extra conversion step is needed. The blocker on roads is that we could not find a published cost of clearing a cubic metre in the Gulf.",
      "Industrial sites and farmland follow the same logic with thinner cost evidence again. They are modelled here so the comparison is on one basis, and labelled as lacking a cost coefficient rather than given one.",
    ],
  },
  {
    id: "pricing",
    label: "Pricing basis",
    heading: "Why a flat rate per hectare loses the information",
    body: [
      "Two hectares of the same size can differ by an order of magnitude in what they deliver to a particular asset, because delivery depends on the wind distribution, the distance and the grain size, and transport goes roughly as the cube of friction velocity above a threshold. A flat price treats them as equivalent, which discards the part the model is for.",
      "So the basis is the modelled difference: sand arriving now, against sand arriving after treatment. It is only as good as the transport model behind it, and the near-field figure is deliberately an upper bound.",
    ],
  },
  {
    id: "limits",
    label: "Limits",
    heading: "Where the model stops, including against us",
    body: [
      "Treating ground reduces transport from that ground. It does not reduce dust arriving from elsewhere, and most of the fine dust settling on a UAE panel starts hundreds of kilometres upwind over clay-rich ground we are not treating. Published work traces roughly 60 percent of the dust in the air over the UAE back to Iraq and 25 percent to the Afghanistan, Pakistan and Iran border region, against about 15 percent from the Empty Quarter. None of that first 85 percent is ours to treat.",
      "What is ours is the sand that moves near the ground. In Abu Dhabi dune soils, 70 to 92 percent of sand movement is saltation and only 2 to 8 percent is suspension: the sand here hops, and it mostly does not fly. That is why the crust acts on encroachment and burial rather than on haze.",
      "That works against the receptor easiest to quantify. Soiling is driven by fine material, and only about a tenth of a percent of the dune sand measured here is finer than 60 micrometres, so treating a dune patch removes very little of it. Sand encroachment and burial is the effect the physics supports best.",
      "Three inputs are still missing before this becomes a quotable price: the cost of clearing a cubic metre of sand in the Gulf, a relation between blowing sand and glass wear, and the fraction of arriving mass that stays on tilted glass. They are marked unsourced and left blank.",
    ],
  },
];
