"use client";

import { DUNE } from "@/src/lib/palette";
import { sourceColor } from "./ExposureMap";

/**
 * One row: the hotspot layer, which is a control as well as a key, and what the
 * moving field is. The three-column key that used to sit here named four site
 * glyphs, three source colours and an opacity ramp, none of which a reader
 * needs before they have clicked a site.
 */
export default function MapLegend({
  showSources,
  onToggleSources,
  isLightMode,
  windLabel,
}: {
  showSources: boolean;
  onToggleSources: (v: boolean) => void;
  isLightMode: boolean;
  /** What the moving field currently shows, so the caption never lies. */
  windLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-4">
      <label className="caption flex items-center gap-2">
        <input
          type="checkbox"
          checked={showSources}
          onChange={(e) => onToggleSources(e.target.checked)}
        />
        <span
          className="h-3 w-6 shrink-0 rounded-[2px]"
          style={{ background: sourceColor("natural", isLightMode), opacity: 0.62 }}
          aria-hidden
        />
        Sand hotspots
      </label>

      <span className="caption flex items-center gap-2">
        <svg width={26} height={10} aria-hidden className="shrink-0">
          <line x1={0} y1={3} x2={11} y2={3} stroke={DUNE.teal} strokeWidth={1.4} />
          <line x1={13} y1={7} x2={26} y2={7} stroke={DUNE.orange} strokeWidth={1.4} />
        </svg>
        {windLabel}, teal calm to orange strong
      </span>
    </div>
  );
}
