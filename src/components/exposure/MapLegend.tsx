"use client";

import { DUNE } from "@/src/lib/palette";
import { FOO_ALPHA, FOO_BANDS, sourceColor } from "./ExposureMap";

/**
 * A key for every mark on the map.
 *
 * The rule this exists to enforce: nothing is drawn on the map that is not
 * named here.
 */

const MARKETS: [string, string, string][] = [
  ["solar", "M0,-5 L4.3,2.5 L-4.3,2.5 Z", "Utility solar"],
  ["industrial", "M-4,-4 H4 V4 H-4 Z", "Industrial and logistics"],
  ["aviation", "M0,-5 L5,4 L0,1.5 L-5,4 Z", "Airports"],
  ["agriculture", "M0,-5 A5,5 0 1,1 -0.01,-5 Z", "Farmland"],
];

/**
 * Colours and the opacity ramp come from ExposureMap rather than being repeated
 * here. They were duplicated as hex literals before and drifted apart, so the
 * legend described a map that was no longer being drawn.
 */
const SOURCE_KINDS: [string, string][] = [
  ["natural", "Natural, mostly sand seas"],
  ["anthro", "Anthropogenic"],
  ["hydro", "Hydrologic, ephemeral water"],
];

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
  const glyphFill = isLightMode ? "#3d332c" : "#e9dccb";
  return (
    <div className="grid grid-cols-1 gap-6 border-t border-border pt-4 sm:grid-cols-3">
      <div>
        <p className="caption mb-3">Target sites</p>
        <ul className="space-y-2">
          {MARKETS.map(([id, d, label]) => (
            <li key={id} className="flex items-center gap-3">
              <svg width={16} height={16} viewBox="-8 -8 16 16" aria-hidden className="shrink-0">
                <path d={d} fill={glyphFill} />
              </svg>
              <span className="text-[length:var(--text-caption)] text-muted-foreground">
                {label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <label className="caption mb-3 flex items-center gap-2">
          <input
            type="checkbox"
            checked={showSources}
            onChange={(e) => onToggleSources(e.target.checked)}
          />
          Sand hotspots
        </label>
        <ul className="space-y-2">
          {SOURCE_KINDS.map(([id, label]) => (
            <li key={id} className="flex items-center gap-3">
              <span
                className="h-3 w-6 shrink-0 rounded-[2px]"
                style={{ background: sourceColor(id, isLightMode), opacity: 0.62 }}
                aria-hidden
              />
              <span className="text-[length:var(--text-caption)] text-muted-foreground">
                {label}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center gap-2">
          <span className="flex shrink-0" aria-hidden>
            {FOO_BANDS.map((band) => (
              <span
                key={band}
                className="h-3 w-3"
                style={{
                  background: sourceColor("natural", isLightMode),
                  opacity: FOO_ALPHA[band],
                }}
              />
            ))}
          </span>
          <span className="text-[length:var(--text-caption)] text-muted-foreground">
            Darker means dust is seen there more often, 10 to 60 percent of days
          </span>
        </div>
      </div>

      <div>
        <p className="caption mb-3">Wind</p>
        <div className="flex items-center gap-3">
          <svg width={26} height={10} aria-hidden className="shrink-0">
            <line x1={0} y1={3} x2={11} y2={3} stroke={DUNE.teal} strokeWidth={1.4} />
            <line x1={13} y1={7} x2={26} y2={7} stroke={DUNE.orange} strokeWidth={1.4} />
          </svg>
          <span className="text-[length:var(--text-caption)] text-muted-foreground">
            {windLabel}
          </span>
        </div>
        <p className="mt-3 text-[length:var(--text-caption)] leading-snug text-muted-foreground">
          Teal is calm, orange is strong. The tracers run faster than real wind
          so the flow reads on screen.
        </p>
      </div>
    </div>
  );
}
