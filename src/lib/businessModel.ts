/**
 * Business model copy.
 *
 * Written to match what the model can actually defend. Where a number is not
 * sourced the text says so rather than rounding to something plausible.
 * House style: no em dashes, short sentences, no filler.
 */
import { MECHANISM } from "@/content/copy";

export interface BusinessSection {
  id: string;
  label: string;
  heading: string;
  body: string[];
}

export const BUSINESS_SUMMARY =
  "We treat the ground the sand comes from instead of cleaning the asset it lands on. " +
  "The model turns a site and a season into an estimate of how much sand arrives and how " +
  "much less would arrive after treatment. That estimate is what we price against.";

export const BUSINESS_SECTIONS: BusinessSection[] = [
  {
    id: "problem",
    label: "Problem",
    heading: "Everyone pays for sand after it has already arrived",
    body: [
      "In the Gulf, wind-blown sand reaches solar farms, roads, industrial yards and farmland. The standard responses are all downstream. Panels get washed, highways get swept, filters get replaced. Each of those is a recurring cost that treats the symptom.",
      "Nobody is charging for the upstream fix, because until now there was no way to say how much sand a particular patch of ground sends to a particular asset.",
    ],
  },
  {
    id: "product",
    label: "Product",
    heading: "A biological crust on the source, not a coating on the asset",
    body: [
      "Our engineered Bacillus subtilis binds loose surface sand into a crust. The crust raises the wind speed needed to lift a grain. Below that speed the surface does not move.",
      "One number carries the whole effect. The wet lab measures the cohesion the crust adds. " + MECHANISM,
    ],
  },
  {
    id: "who",
    label: "Buyers",
    heading: "Four receptors, ranked by how well the evidence holds",
    body: [
      "Utility solar is the clearest case to quantify. Dust on glass cuts transmittance, and that relationship is published and measured. The UAE has close to six gigawatts of utility-scale solar already built.",
      "Roads are the stronger physical fit. Sand piling on a carriageway is exactly the short-range transport the crust prevents, the receptor sits directly downwind of treatable shoulders, and Gulf municipalities already run continuous clearing crews. The drift rate is measured. What is missing is a published cost per cubic metre cleared.",
      "Industrial sites and farmland follow the same logic with weaker cost evidence. Both are modelled here so the comparison is honest, and both are labelled as lacking a cost coefficient.",
    ],
  },
  {
    id: "pricing",
    label: "Pricing",
    heading: "Price the sand you stop, not the area you spray",
    body: [
      "A flat price per hectare ignores the thing that actually varies. Two identical hectares can differ by an order of magnitude in how much sand they send to an asset, depending on the wind and the distance.",
      "The model gives a defensible basis instead. For a chosen site it returns the fraction of sand arriving now and the fraction arriving after treatment. The difference is what the buyer is paying for.",
      "The live view makes that dynamic. Sand transport peaks in the Shamal season, so both the value delivered and the best time to deploy shift through the year. The same model that sets the price also tells a buyer when to apply.",
    ],
  },
  {
    id: "limits",
    label: "What we do not claim",
    heading: "The boundary of the claim, stated up front",
    body: [
      "We reduce sand transport from the ground we treat. We do not reduce dust that arrives from far away. Most of the fine dust that settles on a panel in the UAE starts hundreds of kilometres upwind, over clay-rich ground we are not treating, and no local crust will change that.",
      "So the honest claim is a reduction in local sand arrival and the abrasion and burial it causes, plus the dust generated on the patches we treat. Anyone promising to end panel soiling is describing a different product.",
      "Three inputs are still missing before a price can be quoted: the cost per cubic metre of sand clearing in the Gulf, the relationship between blowing sand and glass wear, and the price a given site actually earns for its electricity. Those gaps are marked in the tool rather than filled with estimates.",
    ],
  },
];
