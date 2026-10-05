import React from "react";
import type { WikiLink } from "@/src/lib/wikiLinks";

export interface StoryBeat {
  id: string;
  /** Roughly how wide the frame is here. The story is one continuous zoom. */
  scale: string;
  line: React.ReactNode;
  /** The wiki section that discusses this scale of the problem. */
  wiki: WikiLink;
}

export const BEATS: StoryBeat[] = [
  {
    id: "lift",
    wiki: { path: "/model/both#both-field", label: "The wind model" },
    scale: "~10 m",
    line: "Past a threshold wind speed, sand lifts, and the finest grains stay in the air.",
  },
  {
    id: "grain",
    wiki: { path: "/model/both#both-cell", label: "Inside the cell" },
    scale: "~100 µm",
    line: (
      <>
        A single grain, and a living <i>Bacillus subtilis</i> cell.
      </>
    ),
  },
  {
    id: "enzyme",
    wiki: { path: "/model/prong-2", label: "The carbonic anhydrase models" },
    scale: "~5 nm",
    line: (
      <>
        Carbonic anhydrase on the cell wall turns CO<sub>2</sub> into CaCO
        <sub>3</sub> cement.
      </>
    ),
  },
  {
    id: "mesh",
    wiki: { path: "/model/prong-1", label: "The γ-PGA models" },
    scale: "~100 nm",
    line: "γ-PGA chains cross-link through calcium and lock grain to grain.",
  },
  {
    id: "crust",
    wiki: { path: "/model/both#both-crust-results", label: "What the crust models say" },
    scale: "~10 m",
    line: "A crust a few millimetres thick, holding grains a tenth of a millimetre wide.",
  },
];
