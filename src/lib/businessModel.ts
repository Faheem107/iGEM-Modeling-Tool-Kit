/**
 * Business model copy.
 *
 * Written to match what the model can actually defend. Where a number is not
 * sourced the text says so rather than rounding to something plausible.
 * House style: see the "Writing style" and "Writing tone" sections of CLAUDE.md.
 * This is body copy, so it takes the tone rule: reflective rather than
 * declarative, no pitch-deck rhythm, and existing practice described neutrally.
 *
 * Rendered inside a dialog opened from the bookmark at the edge of /exposure,
 * so each section should read as continuous prose rather than as slides.
 */
import { MECHANISM } from "@/content/copy";

export interface BusinessSection {
  id: string;
  label: string;
  heading: string;
  body: string[];
}

export const BUSINESS_SUMMARY =
  "The model estimates how much sand a given patch of ground sends to a given asset in a " +
  "given season, and how much less it would send after treatment. Whether that difference " +
  "is worth what treatment costs is a separate question, and the parts of it we cannot yet " +
  "answer are marked as such throughout.";

export const BUSINESS_SECTIONS: BusinessSection[] = [
  {
    id: "problem",
    label: "The question",
    heading: "What a patch of ground sends to an asset",
    body: [
      "Wind-blown sand reaches solar farms, roads, industrial yards and farmland across the Gulf. The responses in use are mostly at the receiving end. Panels are washed on a schedule, carriageways are cleared by municipal crews, filters are replaced on an interval. These work, they are well understood by the operators who run them, and they are budgeted for as recurring maintenance.",
      "What interested us is the step before that. If the sand arriving at an asset comes from identifiable ground upwind, then treating that ground is a different intervention with a different cost profile. Pricing it needs a number the maintenance approach never has to compute: how much of the sand at this asset came from that patch, and how much less would arrive if the patch were stabilised.",
      "This module is an attempt at that number. It is a model, not a measurement, and how far it can be trusted varies by mechanism. The sections below try to be specific about which is which.",
    ],
  },
  {
    id: "product",
    label: "The intervention",
    heading: "Cohesion at the source, and why it reduces to one parameter",
    body: [
      "Engineered Bacillus subtilis binds loose surface sand into a crust. The crust adds cohesion between grains, which raises the wind speed at which a grain first lifts. Below that speed the surface does not move at all.",
      "The reason this is worth modelling rather than just measuring is that the effect concentrates into a single parameter. " + MECHANISM + " So the wet lab measures cohesion, that value moves the lower limit of one integral, and the same calculation run twice, once untreated and once treated, gives the difference.",
      "That is a clean structure, and it is also a narrow one. The model inherits whatever the cohesion measurement gets wrong, and it assumes the crust holds over the period being priced. Neither of those is established yet.",
    ],
  },
  {
    id: "who",
    label: "Receptors",
    heading: "Four receptors, and how far the evidence reaches for each",
    body: [
      "Utility solar is the easiest to quantify, because the relationship between dust on glass and lost transmittance is published and measured. The UAE has close to six gigawatts of utility-scale solar built. That said, the physics gives solar a complication we did not expect, which the last section describes.",
      "Roads fit the physics better. Sand piling on a carriageway is exactly the short-range transport the crust acts on, the receptor is a line lying directly downwind of shoulders that could be treated, and no extra conversion step is needed between the modelled mass and the effect. The drift rate is measured, about twenty cubic metres per metre of width per year in Kuwait. What we could not find published is the cost of clearing a cubic metre in the Gulf, so the value side stays open.",
      "Industrial sites and farmland follow the same logic with thinner cost evidence again. They are modelled here so the comparison across receptors is on the same basis, and they are labelled as lacking a cost coefficient rather than given one.",
    ],
  },
  {
    id: "pricing",
    label: "Pricing basis",
    heading: "Why a flat rate per hectare would lose the information",
    body: [
      "Two hectares of the same size can differ by an order of magnitude in how much sand they deliver to a particular asset, because delivery depends on the wind distribution, the distance and the grain size, and transport goes roughly as the cube of friction velocity above a threshold. A flat price per hectare treats those two hectares as equivalent, which discards the part the model is for.",
      "So the basis we propose is the modelled difference: the sand arriving at a chosen site now, against the sand arriving after the upwind ground is treated. That framing is only as good as the transport model behind it, and the near-field figure it produces is deliberately an upper bound, since it ignores repeated grain re-launch and turbulence.",
      "Season matters too. Sand transport in the Gulf peaks in the Shamal months, so both the mass avoided and the sensible time to apply move through the year. Whether a buyer would accept a seasonally varying price rather than an annual one is a commercial question we have not tested.",
    ],
  },
  {
    id: "limits",
    label: "Limits",
    heading: "Where the model stops, including where it argues against us",
    body: [
      "Treating ground reduces sand transport from that ground. It does not reduce dust arriving from elsewhere. Most of the fine dust that settles on a UAE panel starts hundreds of kilometres upwind over clay-rich ground, and a local crust does not change that.",
      "This turns out to work against the receptor that is easiest to quantify. Panel soiling is driven by fine material that settles and sticks, and the dune sand measured for this region is about 0.13 percent finer than 60 micrometres. Treating a dune patch removes very little soiling-capable material, because there was very little there. So the soiling figures in this tool are real, but they are a small part of what treatment does, and leading with them would misrepresent the mechanism. Sand encroachment and burial is the effect the physics supports best.",
      "Three inputs are still missing before any of this becomes a quotable price: the cost of clearing a cubic metre of sand in the Gulf, a relationship between blowing sand and glass wear, which we looked for and did not find in the literature, and the fraction of arriving mass that actually stays on tilted glass. Those are marked in the tool as unsourced and left blank rather than filled with an estimate, because a price resting on invented constants stops being defensible the moment anyone asks where a number came from.",
    ],
  },
];
