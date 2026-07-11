/**
 * Module video registry
 * =====================
 * The short 3Blue1Brown-style explainer video behind every simulation module, keyed by ModuleId.
 * Rendered by the "Video Explanation" window (opened from the module toolbar, or by dropping Sandyx
 * on the Video Explanation toggle). Each video is a narrated Manim animation with subtitles.
 *
 * Videos live in /public/videos/<id>.mp4 with a matching /public/videos/<id>.en.vtt subtitle track,
 * produced by the Manim project in /manim_videos (see manim_videos/README.md). `ready:false` means
 * the render hasn't been produced yet, the window then shows the layman explanation + a
 * "coming soon" note instead of a broken <video>. Flip to true once the file exists.
 */

import type { ModuleId } from "./prongs";

export interface ModuleVideo {
  /** Window heading. */
  title: string;
  /** Layman, spoken-style explanation shown beside/under the video (mirrors the narration). */
  plain: string;
  /** 45–75 s. Human-readable length label. */
  length: string;
  /** Whether the rendered mp4 exists in /public/videos yet. */
  ready: boolean;
}

const VIDEO_DIR = "/videos";

/** Absolute public path to a module's rendered mp4. */
export const videoSrc = (id: ModuleId) => `${VIDEO_DIR}/${id}.mp4`;
/** Absolute public path to a module's WebVTT subtitle track. */
export const videoVtt = (id: ModuleId) => `${VIDEO_DIR}/${id}.en.vtt`;

export const MODULE_VIDEOS: Record<ModuleId, ModuleVideo> = {
  fba: {
    title: "How the cell decides where carbon goes",
    plain:
      "Imagine the cell as a city of pipes carrying sugar. Flux Balance Analysis asks: with a fixed sugar supply and no carbon allowed to pile up anywhere, which routing sends the most flow toward the product we want? It is just picking the best traffic plan on a fixed road network, the answer tells the rest of the models how much precursor the cell can spare.",
    length: "~47 s",
    ready: true,
  },
  metabolic: {
    title: "From gene to glue, step by step",
    plain:
      'A gene is a recipe. First it is copied into a short-lived message (mRNA), that message is read to build the enzyme, and the enzyme then stitches glutamate into long γ-PGA chains. We follow all three in time, and show how knocking out the "scissors" genes that chew γ-PGA back up lets it pile up instead.',
    length: "~55 s",
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
    length: "~55 s",
    ready: true,
  },
  caco3: {
    title: "Turning CO₂ and calcium into rock",
    plain:
      "The enzyme grabs CO₂ from the air and turns it into carbonate. Carbonate meets calcium in the sand and, once the water is over-saturated, they crystallise into solid calcium carbonate that glues grains together. The twist: it does not become hard limestone instantly. It first forms a softer crystal called vaterite, which slowly rearranges into strong calcite, so the crust literally gets stronger as it ages.",
    length: "~85 s",
    ready: true,
  },
  alginate: {
    title: "The egg-box that holds sand together",
    plain:
      "Alginate is seaweed sugar. Certain stretches of the chain (the G-blocks) line up in pairs and cradle calcium ions between them, it looks exactly like eggs sitting in an egg carton. Those junctions lock the gel together. The honest catch: alginate is water-soluble, so every rain shower washes a little away.",
    length: "~50 s",
    ready: true,
  },
  thermal: {
    title: "Why heat can switch a protein off",
    plain:
      'A protein is only useful when it is folded into the right shape. Heat is a tug-of-war between order and disorder; past a certain temperature the disorder wins and the protein unfolds. We track the folded fraction, the "how alive is this enzyme" dial that gates every downstream rate.',
    length: "~50 s",
    ready: true,
  },
  "protein-3d": {
    title: "A look inside the real enzymes",
    plain:
      "These are the actual 3-D shapes of the two proteins we engineer, γ-PGA synthase for Prong 1 and carbonic anhydrase for Prong 2, traced from real deposited structures. Following the backbone shows where the chemistry happens: the active-site pocket that does all the work.",
    length: "~46 s",
    ready: true,
  },
  ecological: {
    title: "Spreading safely, the kill switch",
    plain:
      "Living crust is powerful but must not spread where it should not. The bacteria grow and diffuse across the sand like ink in water, but we engineer a kill switch: cross an environmental trigger and a toxin gene shuts the colony down. We watch growth and containment fight it out on a resource grid.",
    length: "~55 s",
    ready: true,
  },
  aeolian: {
    title: "What it takes to stop sand from blowing",
    plain:
      "Wind only moves sand once it blows harder than a threshold. Below it, nothing happens; just above it, sand transport explodes as the cube of the wind speed. Our crust adds stickiness between grains, which raises that threshold, so the same wind that used to strip bare sand now slides harmlessly over the treated surface.",
    length: "~60 s",
    ready: true,
  },
  wetlab: {
    title: "From the bench to the dune",
    plain:
      "This connects real lab numbers, how dense the culture is, how much glutamate we feed, how salty the water is, straight into the same wind-erosion physics. Change a bench dial and watch the virtual dune hold or erode, so an experiment on Monday becomes a field prediction on Tuesday.",
    length: "~50 s",
    ready: true,
  },
  grainsize: {
    title: "No single glue fits every grain",
    plain:
      "Sand is a mixture of grain sizes, and each binder has a size it is good at. Cementing (CaCO₃) loves fine-to-medium grains but fails on coarse and ultra-fine ones; γ-PGA and alginate cover exactly the sizes cementing misses. Overlap all three and every grain size gets held, that is the whole point of using three prongs.",
    length: "~60 s",
    ready: true,
  },
  composite: {
    title: "Why three prongs beat one",
    plain:
      "Combining prongs is not simple addition. They fight over the same calcium, they share one cell's energy budget, but their chemistries can also help each other, and if one mechanism fails a storm, another still holds. We add up the cooperation, subtract the competition, and show why the team is tougher than any single prong alone.",
    length: "~82 s",
    ready: true,
  },
  curing: {
    title: "How the crust sets, ages, and is renewed",
    plain:
      "Spray the crust and it does not harden all at once: alginate gels in minutes, γ-PGA in hours, and calcite ripens over the full 32-hour protocol. Then months of sun and wind slowly wear it down. Because each binder sets and fades on its own clock, the fast polymers give early strength while the durable calcite floor stretches out how long until you must re-spray.",
    length: "~65 s",
    ready: true,
  },
  economic: {
    title: "Does it actually pencil out?",
    plain:
      "We build the cost from the ground up for each prong, fermentation for γ-PGA, feedstock plus enzyme for cementing, purchased alginate, then compare against conventional chemical sprays and concrete matting. The crossover point is the treated area where the biological option becomes the cheaper one, carbon credit included.",
    length: "~55 s",
    ready: true,
  },
  killswitch: {
    title: "How the bacteria are switched off",
    plain:
      "Every engineered cell makes two proteins: a toxin (MazF) that shreds its own RNA, and a short-lived antitoxin (MazE) that keeps the toxin in check. While the colony is working, antitoxin wins. Add the aTc trigger, or just wait for the antitoxin-carrying plasmid to dilute away over generations, and the toxin wins, so the cells self-limit. A second copy borrowed from E. coli kills any wild microbe that steals the genes, because the stolen toxin has no matching antitoxin.",
    length: "~60 s",
    ready: false,
  },
};
