import React from "react";

export interface StoryBeat {
  id: string;
  /** Roughly how wide the frame is here. The story is one continuous zoom. */
  scale: string;
  line: React.ReactNode;
}

export const BEATS: StoryBeat[] = [
  {
    id: "lift",
    scale: "~10 m",
    line: "Past a threshold wind speed, sand lifts, and the finest grains stay in the air.",
  },
  {
    id: "grain",
    scale: "~100 µm",
    line: (
      <>
        A single grain, and a living <i>Bacillus subtilis</i> cell.
      </>
    ),
  },
  {
    id: "enzyme",
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
    scale: "~100 nm",
    line: "γ-PGA chains cross-link through calcium and lock grain to grain.",
  },
  {
    id: "crust",
    scale: "~10 m",
    line: "A crust a few millimetres thick, holding grains a tenth of a millimetre wide.",
  },
];
