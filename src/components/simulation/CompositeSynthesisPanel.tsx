"use client";

/**
 * Composite Strength Synthesis (shown only for ≥2 prongs).
 * Two outputs: (1) composite cohesion via rule-of-mixtures + pairwise synergy, and
 * (2) a failure-mode robustness radar showing how the combination covers each prong's
 * weaknesses, the central thesis of the three-pronged design.
 */

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";
import { ModuleActions } from "./_shared";
import GlossaryTerm from "../GlossaryTerm";
import {
  compositeCohesion,
  robustnessMatrix,
  limitingScenario,
  PRONG_LABEL,
  SCENARIOS,
  type ProngContribution,
  type ProngId,
  type InteractionEffect,
} from "../../lib/physics";
import { Panel, StatCard, chartColors, tooltipStyle, Themed } from "./_shared";
import { DUNE, STATUS } from "@/src/lib/palette";

interface Props extends Themed {
  prongs: ProngId[];
  contributions: ProngContribution[];
  interactions?: InteractionEffect[];
}

const PRONG_COLOR: Record<ProngId, string> = {
  1: STATUS.warn,
  2: DUNE.rose,
  3: DUNE.rose,
};
const toMilli = (n: number) => n * 1000; // N/m → mN/m

export default function CompositeSynthesisPanel({
  isLightMode,
  prongs,
  contributions,
  interactions = [],
}: Props) {
  const c = chartColors(isLightMode);
  const comp = useMemo(() => compositeCohesion(contributions), [contributions]);
  const robustness = useMemo(() => robustnessMatrix(prongs), [prongs]);
  const limiting = useMemo(() => limitingScenario(prongs), [prongs]);

  const radarData = useMemo(
    () =>
      robustness.map((row) => {
        const entry: Record<string, number | string> = {
          scenario: row.scenario,
        };
        prongs.forEach((p) => {
          entry[PRONG_LABEL[p]] = +(row.perProng[p] * 100).toFixed(0);
        });
        entry["Combined"] = +(row.combined * 100).toFixed(0);
        return entry;
      }),
    [robustness, prongs],
  );

  const cohesionBars = useMemo(
    () =>
      contributions.map((ct) => ({
        name: PRONG_LABEL[ct.prong],
        value: +toMilli(ct.cohesion).toFixed(2),
        prong: ct.prong,
      })),
    [contributions],
  );

  const synergyPct = (comp.synergyRatio - 1) * 100;

  return (
    <div
      className={`p-6 rounded-[6px] border space-y-6 transition-colors duration-300 ${
        isLightMode
          ? "bg-white/70 border-dune-orange "
          : "bg-card/70 border-border "
      }`}
    >
      <ModuleActions moduleId="composite" isLightMode={isLightMode} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          isLightMode={isLightMode}
          label="Additive cohesion"
          value={toMilli(comp.additiveCohesion).toFixed(1)}
          unit="mN/m"
          accent={isLightMode ? "text-foreground" : "text-foreground"}
          sub="Σ individual"
        />
        <StatCard
          isLightMode={isLightMode}
          label="Interaction term"
          value={`${comp.interactionCohesion >= 0 ? "+" : ""}${toMilli(comp.interactionCohesion).toFixed(1)}`}
          unit="mN/m"
          accent={
            comp.interactionCohesion >= 0
              ? isLightMode
                ? "text-dune-teal"
                : "text-dune-teal"
              : isLightMode
                ? "text-dune-rose"
                : "text-dune-rose"
          }
          sub={comp.interactionCohesion >= 0 ? "synergistic" : "competitive"}
        />
        <StatCard
          isLightMode={isLightMode}
          label="Composite cohesion"
          value={toMilli(comp.totalCohesion).toFixed(1)}
          unit="mN/m"
          emphasize
          accent={isLightMode ? "text-dune-orange" : "text-dune-orange"}
          sub="→ feeds wind threshold"
        />
        <StatCard
          isLightMode={isLightMode}
          label={<GlossaryTerm term="synergy">Synergy</GlossaryTerm>}
          value={`${synergyPct >= 0 ? "+" : ""}${synergyPct.toFixed(0)}`}
          unit="%"
          accent={
            synergyPct >= 0
              ? isLightMode
                ? "text-dune-teal"
                : "text-dune-teal"
              : isLightMode
                ? "text-dune-rose"
                : "text-dune-rose"
          }
          sub="vs simple sum"
        />
      </div>

      <Panel
        title={
          <>
            <GlossaryTerm term="prong-interaction">
              Inter-Prong Interactions
            </GlossaryTerm>: what happens when they share a chassis & soil
          </>
        }
        isLightMode={isLightMode}
      >
        {interactions.length === 0 ? (
          <p
            className={`text-[length:var(--text-caption)] ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
          >
            No cross-prong interactions for this combination.
          </p>
        ) : (
          <div className="space-y-2">
            {interactions.map((e, i) => {
              const neg = e.percent < 0;
              const tone =
                e.kind === "synergy"
                  ? isLightMode
                    ? "text-dune-teal bg-dune-teal/10 border-dune-teal"
                    : "text-dune-teal bg-dune-teal/20 border-dune-teal/40"
                  : e.kind === "burden"
                    ? isLightMode
                      ? "text-dune-orange bg-dune-orange/10 border-dune-orange"
                      : "text-dune-orange bg-dune-orange/20 border-dune-orange/40"
                    : isLightMode
                      ? "text-dune-rose bg-dune-rose/10 border-dune-rose"
                      : "text-dune-rose bg-dune-rose/20 border-dune-rose/40";
              return (
                <div key={i} className={`p-4 rounded-[6px] border ${tone}`}>
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <span className="flex items-center gap-2 text-[length:var(--text-caption)] font-bold">
                          {e.prongs.map((p) => PRONG_LABEL[p]).join(" ↔ ")} ·{" "}
                      {e.mechanism}
                    </span>
                    <span className="font-mono font-black text-[length:var(--text-micro)] shrink-0">
                      {neg ? "" : "+"}
                      {e.percent.toFixed(0)}%
                    </span>
                  </div>
                  <p
                    className={`text-[length:var(--text-caption)] leading-relaxed ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
                  >
                    {e.description}
                  </p>
                </div>
              );
            })}
            <p
              className={`text-[length:var(--text-caption)] leading-relaxed pt-1 ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
            >
              Competition (Ca²⁺) and metabolic burden are applied to each
              prong's cohesion <b>before</b> the synergy term above, so the
              composite total already reflects them.
            </p>
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel
          title={
            <GlossaryTerm term="failure-mode">
              Failure-Mode Robustness
            </GlossaryTerm>
          }
          isLightMode={isLightMode}
        >
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData} outerRadius="72%">
              <PolarGrid stroke={c.grid} />
              <PolarAngleAxis
                dataKey="scenario"
                tick={{ fontSize: 10, fill: c.axis }}
              />
              <PolarRadiusAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: c.axis }}
                angle={90}
              />
              {prongs.map((p) => (
                <Radar
                  key={p}
                  name={PRONG_LABEL[p]}
                  dataKey={PRONG_LABEL[p]}
                  stroke={PRONG_COLOR[p]}
                  fill={PRONG_COLOR[p]}
                  fillOpacity={0.08}
                  strokeWidth={1.5}
                />
              ))}
              <Radar
                name="Combined"
                dataKey="Combined"
                stroke={DUNE.orange}
                fill={DUNE.orange}
                fillOpacity={0.3}
                strokeWidth={2.5}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={tooltipStyle(isLightMode)}
                formatter={(v: number) => [`${v}%`, ""]}
              />
            </RadarChart>
          </ResponsiveContainer>
          <div
            className={`mt-2 p-2 rounded-[4px] text-[length:var(--text-caption)] flex items-center gap-2 ${isLightMode ? "bg-dune-orange/10 text-dune-orange" : "bg-dune-orange/20 text-dune-orange"}`}
          >
            <span>
              Limiting scenario: <b>{limiting.scenario}</b> at{" "}
              {(limiting.resilience * 100).toFixed(0)}% combined resilience.
            </span>
          </div>
        </Panel>

        <Panel
          title="Cohesion Contribution by Prong"
          isLightMode={isLightMode}
        >
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={cohesionBars}
              layout="vertical"
              margin={{ top: 4, right: 12, left: 8, bottom: 0 }}
            >
              <CartesianGrid
                stroke={c.grid}
                strokeDasharray="3 3"
                horizontal={false}
              />
              <XAxis
                type="number"
                stroke={c.axis}
                tick={{ fontSize: 10 }}
                unit=" mN/m"
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke={c.axis}
                tick={{ fontSize: 10 }}
                width={64}
              />
              <Tooltip
                contentStyle={tooltipStyle(isLightMode)}
                formatter={(v: number) => [`${v} mN/m`, "cohesion"]}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {cohesionBars.map((d, i) => (
                  <Cell key={i} fill={PRONG_COLOR[d.prong]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p
            className={`mt-2 text-[length:var(--text-caption)] leading-relaxed ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
          >
            Each binder reduces to an interparticle cohesion (γ-PGA &amp;
            alginate via shear modulus G; CaCO₃ via UCS). The combined radar
            uses 1 − Π(1 − rᵢ): the crust survives a scenario if <b>any</b>{" "}
            active mechanism survives it.
          </p>
        </Panel>
      </div>
    </div>
  );
}
