"use client";

import { DUNE, INK, MUTED_INK, TINT, pick } from "@/src/lib/palette";
import { cardinal, type DriftPotential } from "@/src/lib/physics/windStats";

/**
 * A directional wind rose with the Fryberger resultant drawn on it.
 *
 * Two things are plotted and they are not the same quantity, so they are drawn
 * differently on purpose:
 *
 *  - The petals are how OFTEN the wind blows from each sector, tinted by how
 *    hard. That is a picture of the wind.
 *  - The arrow is the resultant drift direction: where the SAND ends up once
 *    every sector's drift potential is vector-summed. A place can be windiest
 *    from the north and still move its sand southeast.
 *
 * Petals point the way the wind comes FROM, which is the meteorological
 * convention every rose in the literature uses. The arrow points the way the
 * sand GOES. The legend under it says so, because the two conventions being
 * opposite is exactly the kind of thing that gets misread.
 */

const R = 62;
const CX = 78;
const CY = 78;

export default function WindRose({
  /** Fraction of the period per sector, 16 sectors from north. */
  frequency,
  /** Mean speed per sector, m/s. */
  speed,
  drift,
  isLightMode,
}: {
  frequency: number[];
  speed: number[];
  drift: DriftPotential;
  isLightMode: boolean;
}) {
  const n = frequency.length || 16;
  const max = Math.max(...frequency, 0.0001);
  const ink = pick(INK, isLightMode);
  const muted = pick(MUTED_INK, isLightMode);
  const ring = isLightMode ? "rgb(0 0 0 / 0.13)" : "rgb(255 255 255 / 0.15)";

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg
        viewBox="0 0 156 156"
        className="h-[156px] w-[156px] shrink-0"
        role="img"
        aria-label={
          `Wind rose. Sand drifts toward ${cardinal(drift.RDD)}` +
          (Number.isFinite(drift.RDD) ? `, ${drift.RDD.toFixed(0)} degrees.` : ".")
        }
      >
        {/* two reference rings, at half and full of the busiest sector */}
        {[0.5, 1].map((f) => (
          <circle key={f} cx={CX} cy={CY} r={R * f} fill="none" stroke={ring} strokeWidth={1} />
        ))}

        {/* petals: radius is frequency, tint is mean speed */}
        {frequency.map((f, i) => {
          if (f <= 0) return null;
          const a0 = ((i * 360) / n - 180 / n - 90) * (Math.PI / 180);
          const a1 = ((i * 360) / n + 180 / n - 90) * (Math.PI / 180);
          const r = (f / max) * R;
          const hot = Math.min(1, (speed[i] ?? 0) / 12);
          return (
            <path
              key={i}
              d={
                `M${CX},${CY} L${CX + Math.cos(a0) * r},${CY + Math.sin(a0) * r} ` +
                `A${r},${r} 0 0 1 ${CX + Math.cos(a1) * r},${CY + Math.sin(a1) * r} Z`
              }
              fill={hot > 0.5 ? DUNE.orange : DUNE.teal}
              fillOpacity={0.28 + hot * 0.45}
              stroke={isLightMode ? TINT.sandWash : DUNE.ink}
              strokeWidth={0.6}
            />
          );
        })}

        {/* the resultant: where the sand goes */}
        {Number.isFinite(drift.RDD) && (
          <g>
            <defs>
              <marker id="rose-rdd" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
                <path d="M0,0 L7,3.5 L0,7 Z" fill={DUNE.maroon} />
              </marker>
            </defs>
            <line
              x1={CX}
              y1={CY}
              x2={CX + Math.sin((drift.RDD * Math.PI) / 180) * R * 0.92}
              y2={CY - Math.cos((drift.RDD * Math.PI) / 180) * R * 0.92}
              stroke={DUNE.maroon}
              strokeWidth={2.4}
              markerEnd="url(#rose-rdd)"
            />
          </g>
        )}

        <g fontSize={10} fill={muted} textAnchor="middle">
          <text x={CX} y={12}>N</text>
          <text x={CX} y={152}>S</text>
          <text x={150} y={CY + 4}>E</text>
          <text x={6} y={CY + 4}>W</text>
        </g>
      </svg>

      <dl className="min-w-[11rem] flex-1 space-y-2">
        <Row
          term="Sand drifts toward"
          value={
            Number.isFinite(drift.RDD)
              ? `${cardinal(drift.RDD)}, ${drift.RDD.toFixed(0)}°`
              : "nothing above threshold"
          }
          ink={ink}
        />
        <Row term="Drift potential" value={`${drift.DP.toFixed(0)} vector units`} ink={ink} />
        <Row
          term="How one-way"
          value={
            drift.DP > 0
              ? `${(drift.UDI * 100).toFixed(0)}% of it pulls one way`
              : "n/a"
          }
          ink={ink}
        />
      </dl>
    </div>
  );
}

function Row({ term, value, ink }: { term: string; value: string; ink: string }) {
  return (
    // No rule: these sit inside an open Fold, where a stack of hairlines reads
    // as three stray lines rather than as a table.
    <div>
      <dt className="caption">{term}</dt>
      <dd className="text-[length:var(--text-micro)] tabular-nums" style={{ color: ink }}>
        {value}
      </dd>
    </div>
  );
}
