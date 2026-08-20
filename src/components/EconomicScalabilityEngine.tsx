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
import { Coins, TrendingDown, Sprout, Award } from "lucide-react";
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
        icon={Coins}
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
          value={`$${Math.round(cost.costPerHa).toLocaleString()}`}
          accent={isLightMode ? "text-dune-orange" : "text-dune-orange"}
          emphasize
          sub={combinationLabel(selected)}
        />
        <StatCard
          isLightMode={isLightMode}
          label="Total project cost"
          value={`$${Math.round(cost.totalCost).toLocaleString()}`}
          accent={isLightMode ? "text-foreground" : "text-foreground"}
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
          value={`${savingsVsChemical.toFixed(0)}%`}
          accent={
            savingsVsChemical > 0
              ? isLightMode
                ? "text-dune-teal"
                : "text-dune-teal"
              : isLightMode
                ? "text-dune-rose"
                : "text-dune-rose"
          }
        />
        <StatCard
          isLightMode={isLightMode}
          label={<GlossaryTerm term="co2-sequestration">Net CO₂</GlossaryTerm>}
          value={`${(cost.co2Total / 1000).toFixed(1)}`}
          unit="t"
          accent={
            cost.co2Total <= 0
              ? isLightMode
                ? "text-dune-teal"
                : "text-dune-teal"
              : isLightMode
                ? "text-muted-foreground"
                : "text-muted-foreground"
          }
          sub={cost.co2Total < 0 ? "sequestered" : "neutral"}
        />
      </div>

      <ModuleActions moduleId="economic" isLightMode={isLightMode} />
    </>
  );

  return (
    <div
      className={`grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 rounded-[6px] border transition-colors ${
        isLightMode
          ? "bg-card border-dune-orange/10 shadow-[0_4px_24px_rgba(139,94,26,0.06)]"
          : "bg-dune-ink border-border "
      }`}
    >
      <div className="lg:col-span-5 space-y-6">{controls}</div>

      <div className="lg:col-span-7 space-y-6">
        <Panel
          title="Cost per Hectare, Combination Comparison"
          icon={TrendingDown}
          isLightMode={isLightMode}
          right={
            <span
              className={`text-[length:var(--text-caption)] font-mono ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
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
                tick={{ fontSize: 10 }}
                angle={-30}
                textAnchor="end"
                interval={0}
                height={50}
              />
              <YAxis
                stroke={c.axis}
                tick={{ fontSize: 10 }}
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
            className={`mt-1 text-[length:var(--text-caption)] flex items-center gap-2 ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
          >
            <Award className="w-3 h-3 text-dune-orange" /> Indigo = your selected
            combination. Every biological combination sits far below the
            conventional chemical (blue) and concrete (red) baselines.
          </p>
        </Panel>

        <Panel
          title="Per-Prong Cost Basis"
          icon={Sprout}
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
                      className={`text-[length:var(--text-micro)] font-bold ${isLightMode ? "text-foreground" : "text-foreground"}`}
                    >
                      {label}
                    </span>
                    <span
                      className={`block text-[length:var(--text-caption)] ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
                    >
                      {note}
                    </span>
                  </div>
                  <span
                    className={`font-mono font-black text-[length:var(--text-micro)] shrink-0 ${isLightMode ? "text-dune-orange" : "text-dune-orange"}`}
                  >
                    ${Math.round(single.opexPerHa).toLocaleString()}/ha
                  </span>
                </div>
              );
            })}
            <p
              className={`text-[length:var(--text-caption)] ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
            >
              Plus a shared ${Math.round(cost.applicationPerHa)}/ha
              field-application pass
              {cost.capex > 0
                ? ` and a one-time $${cost.capex.toLocaleString()} bioprocess capex`
                : ""}
              . Break-even vs chemical spray at ~
              {Number.isFinite(cost.breakEvenHaVsChemical)
                ? Math.ceil(cost.breakEvenHaVsChemical)
                : ", "}{" "}
              ha.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
