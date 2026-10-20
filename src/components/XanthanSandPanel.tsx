"use client";

/**
 * Xanthan gum on sand, as our wet lab measured it. The carrier alone, no cells, blown by a
 * hairdryer and weighed. Every number comes from src/lib/xanthanSand.ts.
 */

import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
} from "recharts";

import { DUNE } from "@/src/lib/palette";
import { Panel, StatCard, Note, chartColors, tooltipStyle } from "@/src/components/simulation/_shared";
import {
  CARRIER_RUNS,
  CARRIER_CONCENTRATIONS,
  CARRIER_BLOW_SECONDS,
  CARRIER_TEST_WIND,
  dishesAt,
  maxLoss,
  type CarrierDish,
} from "@/src/lib/xanthanSand";

const toPoints = (run: readonly CarrierDish[]) => run.map(([c, m]) => ({ c, m }));

const formatDishes = (masses: number[] | null) =>
  masses ? masses.map((m) => m.toFixed(3)).join(", ") : "not run";

export default function XanthanSandPanel({ isLightMode }: { isLightMode: boolean }) {
  const c = chartColors(isLightMode);
  const bareLow = Math.min(...CARRIER_RUNS.bare);
  const bareHigh = Math.max(...CARRIER_RUNS.bare);

  return (
    <Panel title="9 · On Sand: Measured by Our Wet Lab" isLightMode={isLightMode}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          isLightMode={isLightMode}
          label="Untreated sand lost"
          value={`${bareLow.toFixed(1)} and ${bareHigh.toFixed(1)}`}
          unit="g"
          sub="two dishes, 8 October"
          accent="text-dune-rose"
        />
        <StatCard
          isLightMode={isLightMode}
          label="Most lost by a treated dish, 14 Oct"
          value={maxLoss(CARRIER_RUNS.oct14).toFixed(2)}
          unit="g"
          sub="0.005 to 0.5% xanthan, no cells"
          accent="text-dune-orange"
          emphasize
        />
        <StatCard
          isLightMode={isLightMode}
          label="Wind speed at the dish"
          value={CARRIER_TEST_WIND === null ? null : CARRIER_TEST_WIND.toFixed(1)}
          unit="m/s"
          sub="not recorded in the notebook"
          accent="text-dune-teal"
        />
      </div>

      <p className="mt-6 max-w-[var(--measure)] text-[length:var(--text-caption)] leading-snug text-muted-foreground">
        Sand loss per dish after {CARRIER_BLOW_SECONDS} seconds of hairdryer wind, against the
        xanthan concentration of the solution put on it. Each point is one dish. The shaded band
        is the two untreated dishes. Both axes are logarithmic.
      </p>

      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 8, right: 16, left: 4, bottom: 24 }}>
          <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
          <ReferenceArea
            y1={bareLow}
            y2={bareHigh}
            fill={DUNE.ash}
            fillOpacity={0.22}
            stroke="none"
            ifOverflow="extendDomain"
          />
          <XAxis
            dataKey="c"
            type="number"
            scale="log"
            domain={[0.002, 1]}
            ticks={[0.002, 0.005, 0.01, 0.05, 0.1, 0.5, 1]}
            stroke={c.axis}
            tick={{ fontSize: 12 }}
            label={{
              value: "xanthan in solution (% w/w)",
              position: "insideBottom",
              offset: -14,
              fontSize: 12,
              fill: c.axis,
            }}
          />
          <YAxis
            dataKey="m"
            type="number"
            scale="log"
            domain={[0.01, 100]}
            ticks={[0.01, 0.1, 1, 10, 100]}
            stroke={c.axis}
            tick={{ fontSize: 12 }}
            width={48}
            label={{
              value: "sand lost (g)",
              angle: -90,
              position: "insideLeft",
              fontSize: 12,
              fill: c.axis,
            }}
          />
          <Tooltip
            contentStyle={tooltipStyle(isLightMode)}
            formatter={(v: number, name: string) =>
              name === "c" ? [`${v}%`, "xanthan"] : [`${v} g`, "lost"]
            }
          />
          <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
          <Scatter name="14 Oct" data={toPoints(CARRIER_RUNS.oct14)} fill={DUNE.orange} />
          <Scatter name="8 Oct" data={toPoints(CARRIER_RUNS.oct8)} fill={DUNE.teal} />
          <Scatter name="11 Oct" data={toPoints(CARRIER_RUNS.oct11)} fill={isLightMode ? DUNE.maroon : DUNE.rose} />
        </ScatterChart>
      </ResponsiveContainer>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-[length:var(--text-micro)]">
          <thead>
            <tr className="caption">
              <th className="py-2 pr-4">Xanthan (% w/w)</th>
              <th className="py-2 pr-4">8 Oct (g)</th>
              <th className="py-2 pr-4">11 Oct (g)</th>
              <th className="py-2 pr-4">14 Oct (g)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border">
              <td className="py-2 pr-4 font-mono">0 (untreated)</td>
              <td className="py-2 pr-4 font-mono">{formatDishes([...CARRIER_RUNS.bare])}</td>
              <td className="py-2 pr-4 font-mono">not run</td>
              <td className="py-2 pr-4 font-mono">not run</td>
            </tr>
            {CARRIER_CONCENTRATIONS.map((conc) => (
              <tr key={conc} className="border-t border-border">
                <td className="py-2 pr-4 font-mono">{conc}</td>
                <td className="py-2 pr-4 font-mono">{formatDishes(dishesAt(CARRIER_RUNS.oct8, conc))}</td>
                <td className="py-2 pr-4 font-mono">{formatDishes(dishesAt(CARRIER_RUNS.oct11, conc))}</td>
                <td className="py-2 pr-4 font-mono">{formatDishes(dishesAt(CARRIER_RUNS.oct14, conc))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 max-w-[var(--measure)] text-[length:var(--text-caption)] leading-snug text-muted-foreground">
        The 11 October run disagrees with 14 October at 0.005 and 0.01%. Both are shown.
      </p>

      <div className="mt-4 space-y-2">
        <Note label="How it was measured">
          Xanthan solutions were made up in 50 g of deionised water, put on dried, sifted sand about
          1 cm deep in petri dishes, and left uncovered to dry. There were no cells. Each dish was
          weighed, blown for {CARRIER_BLOW_SECONDS} seconds with a hairdryer on its cold setting,
          and weighed again. Dish and sand together weighed 88 to 91 g. The notebook&apos;s 14
          October table repeats the 8 October values as one of the two dishes for 0.05 to 0.5% and
          for the control; here they are listed under the day they were measured.
        </Note>
        <Note label="Why it matters for the model">
          Every crust model in this toolkit gives the carrier no cohesion. These dishes held sand
          with the carrier alone, so a crust with cells has to be compared against carrier-only
          sand, not bare sand, or the carrier&apos;s effect is credited to the cells. Once the wind
          speed at the dish is known, the inverse of Equation 8 in the aeolian module gives a lower
          bound on the carrier&apos;s cohesion at each concentration that held.
        </Note>
        <Note label="What would make this wrong">
          The wind speed and the volume of solution per dish were not recorded, so the result cannot
          yet be turned into a cohesion or a dose per square metre. A hairdryer jet slows with
          distance and has no settled boundary layer, so converting even a measured jet speed into a
          friction velocity is an assumption. The untreated dishes were blown on 8 October only, so
          the 14 October dishes have no same-day control. At 0.005 and 0.01% the 11 October dishes
          lost 21.3 and 71.1 g against under 0.2 g on 14 October, and we do not know why. One
          difference is that the 11 October solutions were weighed out directly, 2.5 mg of powder
          for 0.005%, while the 14 October ones were made by dilution. Each dish was blown once, so
          this says nothing about how long the hold lasts once the sand is wetted and dried.
        </Note>
      </div>
    </Panel>
  );
}
