"use client";

/**
 * Prong 2, Carbonic Anhydrase surface-display strategy comparison.
 * Compares the two anchoring routes the wet lab is deciding between, Sortase-mediated
 * ligation vs LytE-CWBD binding motif, across the three failure modes they flagged:
 * signal-peptide export, CA dimerization, and the anchoring step itself.
 *
 * Display efficiency = export × dimerization × anchoring (multiplicative, every step must work).
 * This is a decision-support comparison; the sub-efficiencies are wet-lab measurable
 * (see WETLAB_TODO.md §4). Overall display ⇒ realized CA activity for the CaCO₃ module.
 */

import React, { useMemo, useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import { FlaskConical, Anchor, Link2, CheckCircle2 } from "lucide-react";
import GlossaryTerm, { GlossaryText } from "../../GlossaryTerm";
import { STATUS, TINT } from "@/src/lib/palette";
import {
  ModuleShell,
  Panel,
  Slider,
  StatCard,
  ModuleActions,
  chartColors,
  tooltipStyle,
  Themed,
} from "../_shared";

interface Props extends Themed {
  onUpdate?: (out: { displayEfficiency: number }) => void;
}

export default function CaAnchoringModule({ isLightMode, onUpdate }: Props) {
  const c = chartColors(isLightMode);
  // Shared bacterial physiology (both routes use the Sec pathway and need CA dimers).
  const [exportEff, setExportEff] = useState(0.7); // signal-peptide export success
  const [dimerEff, setDimerEff] = useState(0.65); // CA dimerization fraction
  // Route-specific anchoring step.
  const [sortaseEff, setSortaseEff] = useState(0.6); // sortase ligation efficiency
  const [motifEff, setMotifEff] = useState(0.5); // LytE-CWBD cell-wall binding

  const sortaseDisplay = exportEff * dimerEff * sortaseEff;
  const motifDisplay = exportEff * dimerEff * motifEff;
  const best = Math.max(sortaseDisplay, motifDisplay);
  const recommend =
    sortaseDisplay >= motifDisplay
      ? "Sortase-mediated ligation"
      : "LytE-CWBD binding motif";

  useEffect(() => {
    onUpdate?.({ displayEfficiency: best });
  }, [best, onUpdate]);

  const data = useMemo(
    () => [
      {
        stage: "Export",
        Sortase: +(exportEff * 100).toFixed(0),
        Motif: +(exportEff * 100).toFixed(0),
      },
      {
        stage: "Dimerize",
        Sortase: +(dimerEff * 100).toFixed(0),
        Motif: +(dimerEff * 100).toFixed(0),
      },
      {
        stage: "Anchor",
        Sortase: +(sortaseEff * 100).toFixed(0),
        Motif: +(motifEff * 100).toFixed(0),
      },
      {
        stage: "Overall",
        Sortase: +(sortaseDisplay * 100).toFixed(0),
        Motif: +(motifDisplay * 100).toFixed(0),
      },
    ],
    [exportEff, dimerEff, sortaseEff, motifEff, sortaseDisplay, motifDisplay],
  );

  const controls = (
    <>
      <Panel
        title="Anchoring & Display Efficiencies"
        icon={FlaskConical}
        isLightMode={isLightMode}
      >
        <div className="space-y-4">
          <span
            className={`text-[length:var(--text-caption)] font-bold uppercase tracking-wider ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
          >
            Shared (Sec pathway physiology)
          </span>
          <Slider
            isLightMode={isLightMode}
            accent="accent-dune-teal"
            label="Signal-peptide export"
            value={exportEff}
            min={0}
            max={1}
            step={0.02}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            onChange={setExportEff}
            hint="Periplasmic-fractionation assay (does CA leave the membrane?)."
          />
          <Slider
            isLightMode={isLightMode}
            accent="accent-dune-orange"
            label="CA dimerization"
            value={dimerEff}
            min={0}
            max={1}
            step={0.02}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            onChange={setDimerEff}
            hint="Measured by the pNPA esterase assay. Active CA requires dimers."
          />
          <div
            className={`pt-2 border-t ${isLightMode ? "border-dune-orange/10" : "border-border"}`}
          />
          <span
            className={`text-[length:var(--text-caption)] font-bold uppercase tracking-wider ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
          >
            Route-specific anchoring
          </span>
          <Slider
            isLightMode={isLightMode}
            accent="accent-dune-teal"
            label="Sortase ligation"
            value={sortaseEff}
            min={0}
            max={1}
            step={0.02}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            onChange={setSortaseEff}
            hint="GFP-on-PDL/PLL bead retention (YhcS transfer to amine)."
          />
          <Slider
            isLightMode={isLightMode}
            accent="accent-dune-orange"
            label="LytE-CWBD binding"
            value={motifEff}
            min={0}
            max={1}
            step={0.02}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            onChange={setMotifEff}
            hint="Cell-wall binding domain affinity / display density."
          />
        </div>
      </Panel>

      <div
        className={`p-4 rounded-[6px] border flex items-center gap-4 ${
          isLightMode
            ? "bg-dune-teal/60 border-dune-teal"
            : "bg-dune-teal/15 border-dune-teal/40"
        }`}
      >
        <CheckCircle2
          className={`w-7 h-7 shrink-0 ${isLightMode ? "text-dune-teal" : "text-dune-teal"}`}
        />
        <div>
          <span
            className={`block text-[length:var(--text-caption)] font-bold uppercase tracking-wider ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
          >
            Recommended route
          </span>
          <span
            className={`font-black text-[length:var(--text-micro)] ${isLightMode ? "text-dune-teal" : "text-dune-teal"}`}
          >
            {recommend}
          </span>
          <span
            className={`block text-[length:var(--text-caption)] font-mono mt-1 ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
          >
            {(best * 100).toFixed(1)}% functional CA displayed
          </span>
        </div>
      </div>

      <ModuleActions moduleId="ca-anchoring" isLightMode={isLightMode} />
    </>
  );

  return (
    <ModuleShell isLightMode={isLightMode} controls={controls}>
      <Panel
        title={
          <>
            Route Comparison: {" "}
            <GlossaryTerm term="sortase">Sortase</GlossaryTerm> vs{" "}
            <GlossaryTerm term="cwbd-binding">Binding Motif</GlossaryTerm>
          </>
        }
        icon={Anchor}
        isLightMode={isLightMode}
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
          >
            <CartesianGrid
              stroke={c.grid}
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis dataKey="stage" stroke={c.axis} tick={{ fontSize: 10 }} />
            <YAxis
              stroke={c.axis}
              tick={{ fontSize: 10 }}
              unit="%"
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={tooltipStyle(isLightMode)}
              formatter={(v: number) => [`${v}%`, ""]}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar
              dataKey="Sortase"
              radius={[4, 4, 0, 0]}
              name="Sortase ligation"
            >
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.stage === "Overall" ? TINT.roseDeep : TINT.roseLight}
                />
              ))}
            </Bar>
            <Bar dataKey="Motif" radius={[4, 4, 0, 0]} name="LytE-CWBD motif">
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.stage === "Overall" ? STATUS.warn : TINT.orangeLight}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <div className="grid grid-cols-2 gap-4">
        <StatCard
          isLightMode={isLightMode}
          label="Sortase overall"
          value={(sortaseDisplay * 100).toFixed(1)}
          unit="%"
          accent={isLightMode ? "text-dune-teal" : "text-dune-teal"}
          emphasize={sortaseDisplay >= motifDisplay}
        />
        <StatCard
          isLightMode={isLightMode}
          label="Binding motif overall"
          value={(motifDisplay * 100).toFixed(1)}
          unit="%"
          accent={isLightMode ? "text-dune-orange" : "text-dune-orange"}
          emphasize={motifDisplay > sortaseDisplay}
        />
      </div>
      <p
        className={`text-[length:var(--text-caption)] flex items-start gap-2 ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
      >
        <Link2 className="h-3.5 w-3.5 text-dune-teal mt-1 shrink-0" />
        <GlossaryText>
          Display efficiency is the product of three independent steps, export
          times dimerization times anchoring, so it can never exceed the worst
          of them. The winning route sets the carbonic anhydrase activity that
          feeds the precipitation model. Each stage is its own wet-lab assay.
        </GlossaryText>
      </p>
    </ModuleShell>
  );
}
