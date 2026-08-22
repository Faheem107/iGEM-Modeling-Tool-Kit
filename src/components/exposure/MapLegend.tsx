"use client";

import { DUNE } from "@/src/lib/palette";
import {
  DUST_ALPHA,
  DUST_BREAKS,
  FOO_ALPHA,
  FOO_BANDS,
  dustColor,
  sourceColor,
} from "./ExposureMap";

/**
 * A key for every mark on the map.
 *
 * The rule this exists to enforce: nothing is drawn on the map that is not
 * named here. Four marker shapes, three source colours, an opacity ramp, two
 * different dashed lines and a moving particle field were all previously
 * unexplained, and two of them are easy to misread in a way that matters. The
 * dashed orange line is NOT the path saltating sand takes; saltating grains
 * land within tens of metres. See DUST_EXPOSURE_MODULE_SPEC.md section 7.
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
  showDust,
  onToggleDust,
  isLightMode,
  windLabel,
  seasonLabel,
}: {
  showSources: boolean;
  onToggleSources: (v: boolean) => void;
  showDust: boolean;
  onToggleDust: (v: boolean) => void;
  isLightMode: boolean;
  /** What the moving field currently shows, so the caption never lies. */
  windLabel: string;
  /** The months the dust layer is averaged over, so the key names them. */
  seasonLabel: string;
}) {
  const glyphFill = isLightMode ? "#3d332c" : "#e9dccb";
  return (
    <div className="grid grid-cols-1 gap-6 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <p className="caption mb-3">Sites</p>
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
            checked={showDust}
            onChange={(e) => onToggleDust(e.target.checked)}
          />
          Dust in the air
        </label>
        <div className="flex items-center gap-2">
          <span className="flex shrink-0" aria-hidden>
            {DUST_ALPHA.map((a, i) => (
              <span
                key={i}
                className="h-3 w-3"
                style={{ background: dustColor(isLightMode), opacity: a }}
              />
            ))}
          </span>
          <span className="text-[length:var(--text-caption)] text-muted-foreground">
            Under {DUST_BREAKS[0]} to over {DUST_BREAKS[DUST_BREAKS.length - 1]} µg/m³
          </span>
        </div>
        <p className="mt-3 text-[length:var(--text-caption)] leading-snug text-muted-foreground">
          Where dust is measured in the air across {seasonLabel}, not where it
          was raised. This is the one layer that changes with the season.
        </p>
      </div>

      <div>
        <label className="caption mb-3 flex items-center gap-2">
          <input
            type="checkbox"
            checked={showSources}
            onChange={(e) => onToggleSources(e.target.checked)}
          />
          Dust source areas
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
        <p className="caption mb-3">Lines and motion</p>
        <ul className="space-y-2">
          <li className="flex items-center gap-3">
            <svg width={26} height={10} aria-hidden className="shrink-0">
              <line x1={0} y1={5} x2={26} y2={5} stroke={DUNE.orange}
                    strokeWidth={2} strokeDasharray="6 4" />
            </svg>
            <span className="text-[length:var(--text-caption)] text-muted-foreground">
              Where the drifting sand and suspended dust arriving here come from.
              Not the path of saltating grains, which land within tens of metres.
            </span>
          </li>
          <li className="flex items-center gap-3">
            <svg width={26} height={10} aria-hidden className="shrink-0">
              <line x1={0} y1={5} x2={20} y2={5} stroke={DUNE.teal}
                    strokeWidth={1.4} strokeDasharray="3 3" />
              <circle cx={23} cy={5} r={3} fill="none" stroke={DUNE.teal} strokeWidth={1.4} />
            </svg>
            <span className="text-[length:var(--text-caption)] text-muted-foreground">
              Distance to the nearest mapped source. Regional context only.
            </span>
          </li>
          <li className="flex items-center gap-3">
            <svg width={26} height={10} aria-hidden className="shrink-0">
              <line x1={0} y1={3} x2={11} y2={3} stroke={DUNE.teal} strokeWidth={1.4} />
              <line x1={13} y1={7} x2={26} y2={7} stroke={DUNE.orange} strokeWidth={1.4} />
            </svg>
            <span className="text-[length:var(--text-caption)] text-muted-foreground">
              {windLabel}. Teal is calm, orange to rose is strong. The tracers
              run faster than real wind so the flow reads; speed is the colour.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
