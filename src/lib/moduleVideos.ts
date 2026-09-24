/**
 * Module video registry
 * =====================
 * The short 3Blue1Brown-style explainer video behind every simulation module, keyed by ModuleId.
 * Rendered by the "Video Explanation" window (opened from the module toolbar, or by dropping Sandyx
 * on the Video Explanation toggle). Each video is a narrated Manim animation with subtitles.
 *
 * Videos live in /public/videos/<id>.mp4 with a matching /public/videos/<id>.en.vtt subtitle track,
 * produced by the Manim project in /manim_videos (see manim_videos/README.md). `ready:false` means
 * the render does not exist yet. The window then shows the layman explanation and says there is no
 * video for that module, rather than a broken <video>. Flip to true once the file exists.
 */

import type { ModuleId } from "./prongs";

/**
 * The keys the video registry accepts. Every simulation module, plus the two
 * standalone pages that also have an explainer video: the exposure model already
 * uses its ModuleId "exposure", and the Xanthan Flow page is not a ModuleId, so
 * it is added here. Keeping this separate from ModuleId means MODULE_MATH and
 * MODULE_SOURCES, which are per-module, do not need a Xanthan entry.
 */
export type VideoId = ModuleId | "xanthan-flow";

export interface ModuleVideo {
  /** Window heading. */
  title: string;
  /** Layman, spoken-style explanation shown beside/under the video (mirrors the narration). */
  plain: string;
  /** Human-readable length label, matching the rendered duration. */
  length: string;
  /** Whether the rendered mp4 exists in /public/videos yet. */
  ready: boolean;
}

const VIDEO_DIR = "/videos";

/** Absolute public path to a module's rendered mp4. */
export const videoSrc = (id: VideoId) => `${VIDEO_DIR}/${id}.mp4`;
/** Absolute public path to a module's WebVTT subtitle track. */
export const videoVtt = (id: VideoId) => `${VIDEO_DIR}/${id}.en.vtt`;

export const MODULE_VIDEOS: Record<VideoId, ModuleVideo> = {
  fba: {
    title: "How the cell decides where carbon goes",
    plain:
      "Imagine the cell as a city of pipes carrying sugar. Flux Balance Analysis asks: with a fixed sugar supply and no carbon allowed to pile up anywhere, which routing sends the most flow toward the product we want? It is a traffic plan on a fixed road network. The answer tells the rest of the models how much precursor the cell can spare.",
    length: "~47 s",
    ready: true,
  },
  metabolic: {
    title: "From gene to glue, step by step",
    plain:
      'A gene is a recipe. First it is copied into a short-lived message (mRNA), that message is read to build the enzyme, and the enzyme then stitches glutamate into long γ-PGA chains. We follow all three in time, and show how knocking out the "scissors" genes that chew γ-PGA back up lets it pile up instead.',
    length: "~54 s",
    ready: true,
  },
  crosslink: {
    title: "Why calcium turns goo into gel",
    plain:
      "γ-PGA on its own is a floppy tangle of negatively-charged chains. Add calcium, which carries two positive charges, and each ion clamps two chains together. Enough clamps and the tangle becomes a springy solid. We count the clamps with a binding curve and turn that count into a stiffness.",
    length: "~50 s",
    ready: true,
  },
  "ca-anchoring": {
    title: "Bolting an enzyme to the cell wall",
    plain:
      "To speed up cementing, we put the enzyme carbonic anhydrase on the OUTSIDE of the bacterium. Getting it there is a relay: export it, fold it, and staple it down. Each step only works part of the time, so the final active fraction is those chances multiplied together, and the enzyme itself speeds the key reaction about a million-fold.",
    length: "~40 s",
    ready: true,
  },
  caco3: {
    title: "Turning CO₂ and calcium into rock",
    plain:
      "The enzyme grabs CO₂ from the air and turns it into carbonate. Carbonate meets calcium in the sand and, once the water is over-saturated, they crystallise into solid calcium carbonate that glues grains together. The twist: it does not become hard limestone instantly. It first forms a softer crystal called vaterite, which slowly rearranges into strong calcite, so the crust literally gets stronger as it ages.",
    length: "~63 s",
    ready: true,
  },
  alginate: {
    title: "The egg-box that holds sand together",
    plain:
      "Alginate is seaweed sugar. Certain stretches of the chain (the G-blocks) line up in pairs and cradle calcium ions between them, it looks exactly like eggs sitting in an egg carton. Those junctions lock the gel together. The honest catch: alginate is water-soluble, so every rain shower washes a little away.",
    length: "~45 s",
    ready: true,
  },
  thermal: {
    title: "Why heat can switch a protein off",
    plain:
      'A protein is only useful when it is folded into the right shape. Heat is a tug-of-war between order and disorder; past a certain temperature the disorder wins and the protein unfolds. We track the folded fraction, the "how alive is this enzyme" dial that gates every downstream rate.',
    length: "~40 s",
    ready: true,
  },
  "protein-3d": {
    title: "A look inside the real enzymes",
    plain:
      "These are the actual 3-D shapes of the two proteins we engineer, γ-PGA synthase for Route 1 and carbonic anhydrase for Route 2, traced from real deposited structures. Following the backbone shows where the chemistry happens: the active-site pocket that does all the work.",
    length: "~46 s",
    ready: true,
  },
  ecological: {
    title: "Spreading safely, the kill switch",
    plain:
      "A living crust keeps repairing itself, which is the point, and also the risk. The bacteria grow and diffuse across the sand like ink in water, but we engineer a kill switch: cross an environmental trigger and a toxin gene shuts the colony down. We watch growth and containment fight it out on a resource grid.",
    length: "~36 s",
    ready: true,
  },
  aeolian: {
    title: "What it takes to stop sand from blowing",
    plain:
      "Wind only moves sand once it blows harder than a threshold. Below it, nothing happens. Just above it, sand transport climbs as the cube of the wind speed. Our crust adds stickiness between grains, which raises that threshold, so the same wind that used to strip bare sand now slides harmlessly over the treated surface.",
    length: "~45 s",
    ready: true,
  },
  wetlab: {
    title: "From the bench to the dune",
    plain:
      "This connects real lab numbers, how dense the culture is, how much glutamate we feed, how salty the water is, straight into the same wind-erosion physics. Change a bench dial and watch the virtual dune hold or erode, so an experiment on Monday becomes a field prediction on Tuesday.",
    length: "~39 s",
    ready: true,
  },
  grainsize: {
    title: "No single glue fits every grain",
    plain:
      "Sand is a mixture of grain sizes, and each binder has a size it is good at. Cementing (CaCO₃) peaks on fine-to-medium grains and fails on the coarsest and the very finest ones. γ-PGA gel is strongest at the fine end, exactly where cementing cannot reach. Overlap the two and fine through medium sand is held; the coarse tail is the honest weak point they share.",
    length: "~51 s",
    ready: true,
  },
  composite: {
    title: "Why two routes beat one",
    plain:
      "Combining the two routes is not simple addition. They compete for the same calcium, and because calcite is the greedier sink, γ-PGA loses most. They share one cell's energy budget, so each titre drops. But the polymer's acidic groups also seed tougher calcite, a real synergy. Add the cooperation, subtract the competition and burden, and the combined crust still beats either route, and each covers the other's failure modes.",
    length: "~72 s",
    ready: true,
  },
  curing: {
    title: "How the crust sets, ages, and is renewed",
    plain:
      "Spray the crust and it does not harden all at once. γ-PGA firms up within hours for early grip, while calcite ripens over the full 32-hour protocol and ends up stronger. Over months the polymer biodegrades first, then the calcite slowly wears. Because the calcite lasts longest, it sets the re-application cadence, roughly six months, which is where the field trial stopped observing rather than a measured service life.",
    length: "~45 s",
    ready: true,
  },
  economic: {
    title: "Does it actually pencil out?",
    plain:
      "We build the cost from the ground up: fermentation for γ-PGA, feedstock plus enzyme for cementing, and one shared bioprocess setup. Chemical spray is a flat rate per hectare; our crust carries an upfront cost that spreads out as the treated area grows, so past a break-even of a few tens of hectares it is the cheaper option. Concrete matting sits far above, for scale. The CO₂ credit is real but only a few dollars a hectare, so the captured tonnage is the result, not what pays for the crust.",
    length: "~64 s",
    ready: true,
  },
  killswitch: {
    title: "A switch that fails safe",
    plain:
      "Each engineered cell carries a stable toxin (MazF) that chops up its own RNA, held in check by a fragile antidote (MazE) it must keep remaking. A cell that leaves the patch dilutes away the antidote, on a plasmid, over about twenty generations and shuts down; an inducer can force the toxin too. One switch escapes in about one cell in a hundred million, which meets the target per cell, but a hectare holds around 10¹⁵ cells, so that still leaves about 10⁷ escapees. Two independent switches multiply, 10⁻¹⁶, dropping expected escapees below one. The open gap: the toxin cannot kill a dormant spore until it wakes.",
    length: "~102 s",
    ready: true,
  },
  exposure: {
    title: "Where the sand comes from",
    plain:
      "A solar plant loses output to sand and dust; the model asks which of it a crust can stop. We fit three years of wind and integrate the sand flux over the whole spread, because flux climbs as the cube of wind speed and a few strong days do most of the work. Summing drift over sixteen sectors gives the direction sand moves. Then the split that matters: hopping sand travels metres and a crust holds it, while fine dust rides hundreds of kilometres from sources over Iraq and Iran and no local crust touches it. So the crust addresses encroachment and burial, not haze. The weakest link, blowing sand to lost power, has no measured coefficient yet.",
    length: "~77 s",
    ready: true,
  },
  "xanthan-flow": {
    title: "Thick until it moves",
    plain:
      "Xanthan gum is a shear-thinning fluid: stress equals a constant times the strain rate raised to a power n of about a quarter, so the faster you push it, the thinner it gets. At rest it is thick and does not drip; under pressure it flows. For a straight tube we solve the generalized Hagen-Poiseuille law to get the pressure a given flow needs. Dilute it and n climbs toward one, so it thins and needs far less pressure. Every number on the page comes from these equations. The limit: one straight, smooth, isothermal tube in laminar flow, with no bends, fittings or temperature swings.",
    length: "~74 s",
    ready: true,
  },
};
