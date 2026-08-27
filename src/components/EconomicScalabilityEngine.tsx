"use client";

/**
 * Economic Scalability, combination-aware deployment cost.
 * Costs the SELECTED prong combination (γ-PGA fermentation, CaCO₃ feedstock+enzyme, and/or
 * purchased alginate), then compares every possible combination and the conventional
 * chemical-spray / concrete baselines on one chart. Physics lives in lib/physics/economic.ts.
 */

import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from "recharts";
import GlossaryTerm from "./GlossaryTerm";
import {
  combinationCost,
  allProngCombinations,
  conventionalCostPerHa,
  type EconContext,
} from "../lib/physics";
import { combinationLabel, type ProngId } from "../lib/prongs";
import type { ProngContribution } from "../lib/physics";
import { DUNE, STATUS, TINT } from "@/src/lib/palette";
import {
  Panel,
  Slider,
  StatCard,
  Note,
  ModuleActions,
  chartColors,
  tooltipStyle,
} from "./simulation/_shared";

interface Props {
  isLightMode: boolean;
  prongs?: ProngId[];
  contributions?: ProngContribution[];
  polymerYield?: number; // g/L (Prong 1)
  alginateModulus?: number; // Pa (Prong 3, informational)
  caco3?: { ucs: number; calcitePct: number; co2: number };
  requiredCrustThickness?: number; // mm
}

const sameSet = (a: ProngId[], b: ProngId[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

export default function EconomicScalabilityEngine({
  isLightMode,
  prongs,
  polymerYield = 35,
  caco3,
  requiredCrustThickness = 15,
}: Props) {
  const c = chartColors(isLightMode);
  const selected =
    prongs && prongs.length
      ? ([...prongs].sort() as ProngId[])
      : ([1] as ProngId[]);

  const [targetArea, setTargetArea] = useState(100); // hectares
  const [pgaDensity, setPgaDensity] = useState(1.5); // kg/m³ polymer loading

  const ctx: EconContext = useMemo(
    () => ({
      areaHa: targetArea,
      crustThicknessMm: requiredCrustThickness,
      pgaYieldGPerL: polymerYield,
      pgaDemandKgPerM3: pgaDensity,
      co2SequesteredGPerL: caco3?.co2 ?? 0,
    }),
    [targetArea, requiredCrustThickness, polymerYield, pgaDensity, caco3?.co2],
  );

  const cost = useMemo(() => combinationCost(selected, ctx), [selected, ctx]);

  // Every combination's per-hectare cost + the two conventional baselines, for comparison.
  const comparison = useMemo(() => {
    const combos = allProngCombinations().map((combo) => ({
      label: combinationLabel(combo),
      costPerHa: Math.round(combinationCost(combo, ctx).costPerHa),
      kind: sameSet(combo, selected) ? "selected" : ("combo" as const),
    }));
    return [
      ...combos,
      {
        label: "Chemical spray",
        costPerHa: Math.round(conventionalCostPerHa.chemical),
        kind: "chemical" as const,
      },
      {
        label: "Concrete blanket",
        costPerHa: Math.round(conventionalCostPerHa.concrete),
        kind: "concrete" as const,
      },
    ];
  }, [ctx, selected]);

  const savingsVsChemical =
    conventionalCostPerHa.chemical > 0
      ? ((conventionalCostPerHa.chemical - cost.costPerHa) /
          conventionalCostPerHa.chemical) *
        100
      : 0;

  // The closing read of the module: what the numbers above imply, in one place.
  // Every figure is taken from `cost` so the sentence cannot drift from the chart.
  const breakEvenHa = Number.isFinite(cost.breakEvenHaVsChemical)
    ? Math.ceil(cost.breakEvenHaVsChemical)
    : null;
  const co2Tonnes = cost.co2Total < 0 ? Math.abs(cost.co2Total) / 1000 : 0;

  const takeaway = [
    `Treating one hectare costs about $${Math.round(cost.costPerHa).toLocaleString()}.`,
    `Spraying the same hectare with the conventional chemical costs about $${Math.round(conventionalCostPerHa.chemical).toLocaleString()}.`,
    breakEvenHa === null
      ? "At these settings the treatment costs more per hectare than spraying does, however large the area, so there is no size at which it pays for itself."
      : `The setup is bought once, so the treatment only works out cheaper past about ${breakEvenHa.toLocaleString()} hectares, and the area set here is ${targetArea >= breakEvenHa ? "past" : "below"} that point.`,
    co2Tonnes > 0
      ? `The calcite route also stores about ${co2Tonnes.toFixed(0)} tonnes of CO\u2082 over the ${targetArea.toLocaleString()} hectares set here.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const takeawayNote = [
    "None of these prices is a supplier quote yet. They are our own estimates, and the calcium and enzyme cost is the one that moves the answer most.",
    "The comparison is also one treatment against one spray, not the same length of service: our crust is resprayed about every six months, and we have no figure for how long the chemical lasts.",
    selected.includes(3)
      ? "The alginate route is priced so it can be compared, not because it is carried forward."
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const barColor = (kind: string) =>
    kind === "selected"
      ? DUNE.orange
      : kind === "chemical"
        ? DUNE.teal
        : kind === "concrete"
          ? STATUS.bad
          : isLightMode
            ? TINT.sandLight
            : DUNE.ash;

  const controls = (
    <>
      <Panel
        title="Scale Specifications"
        isLightMode={isLightMode}
      >
        <div className="space-y-4">
          <Slider
            isLightMode={isLightMode}
            accent="accent-dune-orange"
            label="Stabilization area"
            value={targetArea}
            min={1}
            max={1000}
            step={5}
            unit="ha"
            onChange={(v) => setTargetArea(Math.round(v))}
            hint="1 ha dune spur → 1,000 ha regreening corridor."
          />
          {selected.includes(1) && (
            <Slider
              isLightMode={isLightMode}
              accent="accent-dune-teal"
              label="γ-PGA loading density"
              value={pgaDensity}
              min={0.5}
              max={5}
              step={0.1}
              unit="kg/m³"
              onChange={setPgaDensity}
              hint="Polymer mass per m³ of treated soil (Prong 1 only)."
            />
          )}
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-4">
        <StatCard
          isLightMode={isLightMode}
          label="All-in cost / ha"
          value={Math.round(cost.costPerHa).toLocaleString()}
          unit="USD"
          accent="text-dune-orange"
          emphasize
          sub={combinationLabel(selected)}
        />
        <StatCard
          isLightMode={isLightMode}
          label="Total project cost"
          value={Math.round(cost.totalCost).toLocaleString()}
          unit="USD"
          accent="text-foreground"
          sub={`${targetArea} ha + capex`}
        />
        <StatCard
          isLightMode={isLightMode}
          label={
            <>
              Savings vs{" "}
              <GlossaryTerm term="chemical-spray">chemical</GlossaryTerm>
            </>
          }
          value={savingsVsChemical.toFixed(0)}
          unit="%"
          accent={
            savingsVsChemical > 0
              ? "text-dune-teal"
              : "text-dune-rose"
          }
        />
        <StatCard
          isLightMode={isLightMode}
          label={<GlossaryTerm term="co2-sequestration">Net CO₂</GlossaryTerm>}
          value={(cost.co2Total / 1000).toFixed(1)}
          unit="t"
          accent={
            cost.co2Total <= 0
              ? "text-dune-teal"
              : "text-muted-foreground"
          }
          sub={
            cost.co2Total < 0
              ? "locked into the crust"
              : cost.co2Total > 0
                ? "released, not locked away"
                : "breaks even"
          }
        />
      </div>

      <ModuleActions moduleId="economic" isLightMode={isLightMode} />
    </>
  );

  return (
    <div
      className={`grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 rounded-[6px] border transition-colors ${
        isLightMode
          ? "bg-card border-dune-orange/10"
          : "bg-dune-ink border-border "
      }`}
    >
      <div className="lg:col-span-5 space-y-6">{controls}</div>

      <div className="lg:col-span-7 space-y-6">
        <Panel
          title="Cost per Hectare, Combination Comparison"
          isLightMode={isLightMode}
          right={
            <span
              className={`text-[length:var(--text-caption)] font-mono text-muted-foreground`}
            >
              USD · log scale
            </span>
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={comparison}
              margin={{ top: 8, right: 8, left: 4, bottom: 40 }}
            >
              <CartesianGrid
                stroke={c.grid}
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                stroke={c.axis}
                tick={{ fontSize: 12 }}
                angle={-30}
                textAnchor="end"
                interval={0}
                height={50}
              />
              <YAxis
                stroke={c.axis}
                tick={{ fontSize: 12 }}
                scale="log"
                domain={["auto", "auto"]}
                tickFormatter={(v) =>
                  `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
                }
              />
              <Tooltip
                contentStyle={tooltipStyle(isLightMode)}
                formatter={(v: number) => [`$${v.toLocaleString()}/ha`, "cost"]}
              />
              <Bar dataKey="costPerHa" radius={[4, 4, 0, 0]}>
                {comparison.map((d, i) => (
                  <Cell key={i} fill={barColor(d.kind)} />
                ))}
              </Bar>
              <ReferenceLine
                y={conventionalCostPerHa.chemical}
                stroke={DUNE.teal}
                strokeDasharray="4 3"
              />
            </BarChart>
          </ResponsiveContainer>
          <p
            className={`mt-1 text-[length:var(--text-caption)] flex items-center gap-2 text-muted-foreground`}
          >
            Each bar is one combination&apos;s cost for a hectare. The last two
            are what the conventional options cost for the same hectare.
          </p>
        </Panel>

        <Panel
          title="Per-Prong Cost Basis"
          isLightMode={isLightMode}
        >
          <div className="space-y-2">
            {selected.map((p) => {
              const single = combinationCost([p], ctx);
              const label = combinationLabel([p]);
              const note =
                p === 1
                  ? "fermentation: glucose + salts + utilities"
                  : p === 2
                    ? "calcium + carbonic-anhydrase dosing (− CO₂ credit)"
                    : "purchased sodium alginate + crosslinker";
              return (
                <div
                  key={p}
                  className={`flex items-center justify-between p-4 rounded-[6px] border ${isLightMode ? "bg-white border-dune-orange/10" : "bg-dune-ink border-border"}`}
                >
                  <div className="min-w-0">
                    <span
                      className={`text-[length:var(--text-micro)] font-bold text-foreground`}
                    >
                      {label}
                    </span>
                    <span
                      className={`block text-[length:var(--text-caption)] text-muted-foreground`}
                    >
                      {note}
                    </span>
                  </div>
                  <span
                    className={`font-mono font-black text-[length:var(--text-micro)] shrink-0 text-dune-orange`}
                  >
                    ${Math.round(single.opexPerHa).toLocaleString()}/ha
                  </span>
                </div>
              );
            })}
            <p
              className={`text-[length:var(--text-caption)] text-muted-foreground`}
            >
              Plus a shared ${Math.round(cost.applicationPerHa)}/ha
              field-application pass
              {cost.capex > 0
                ? ` and a one-time $${cost.capex.toLocaleString()} bioprocess capex`
                : ""}
              .{" "}
              {Number.isFinite(cost.breakEvenHaVsChemical)
                ? `Break-even vs chemical spray at about ${Math.ceil(cost.breakEvenHaVsChemical)} ha.`
                : "At these settings the treatment never breaks even against chemical spray, however large the area."}
            </p>
          </div>
        </Panel>

        <Panel
          title="What this adds up to"
          isLightMode={isLightMode}
        >
          <div className="space-y-2">
            <p
              className={`text-[length:var(--text-micro)] leading-relaxed text-muted-foreground`}
            >
              {takeaway}
            </p>
            <Note label="What would make this wrong">{takeawayNote}</Note>
          </div>
        </Panel>
      </div>
    </div>
  );
}
