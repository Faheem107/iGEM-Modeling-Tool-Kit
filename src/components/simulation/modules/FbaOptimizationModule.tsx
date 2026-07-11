"use client";

/**
 * Flux Balance Analysis. Solves a genuine LP (max cᵀv s.t. S·v=0, lb≤v≤ub) on a mass-balanced
 * core network and surfaces the analyses that make FBA a decision tool: a live pathway flow map,
 * the production envelope (growth↔product Pareto front), parsimonious flux map, flux variability,
 * shadow prices, and in-silico knockouts.
 *
 * Prong-aware: with Prong 1 the product is γ-PGA (feeds the kinetics ODE); with Prong 2 the
 * product is secreted carbonic anhydrase (feeds the CaCO₃ display). Selecting both offers either.
 */

import React, { useMemo, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  Cell,
} from "recharts";
import { Workflow, GitBranch, Sigma, Beaker, Dna, Network } from "lucide-react";
import GlossaryTerm from "../../GlossaryTerm";
import {
  buildCoreNetwork,
  OBJ_GROWTH,
  OBJ_PGA,
  OBJ_CA,
  KNOCKOUTS,
  solveFBA,
  parsimoniousFBA,
  productionEnvelope,
  fluxVariability,
  fbaPrecursorToConc,
  FBA_CALIB,
  cval,
} from "../../../lib/physics";
import type { ProngId } from "../../../lib/prongs";
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
import { GlossaryText } from "../../GlossaryTerm";

interface Props extends Themed {
  /** Bacterial prongs present (subset of {1,2}); decides the FBA objective. */
  prongs?: ProngId[];
  onUpdatePrecursorFlux?: (concMillimolar: number) => void;
}

type Obj = "growth" | "pga" | "ca";

// ---------------------------------------------------------------------------
// Live metabolic pathway flow map
// ---------------------------------------------------------------------------
/**
 * A dynamic flowchart of the core-carbon network. Each arrow is one reaction; its thickness,
 * opacity and animated flow speed scale with the pFBA flux carried by that reaction, so moving a
 * slider or toggling a knockout visibly re-routes the traffic. This is the same flux vector that
 * drives the bar chart and the ODE coupling — the picture and the numbers cannot disagree.
 */
type ColorKey = "spine" | "tca" | "ppp" | "ana" | "over" | "bio" | "pga" | "ca";

interface FlowEdge {
  id: string; // reaction id whose flux sets the width
  rxn: string; // subsystem/gene tag shown on hover
  from: [number, number];
  to: [number, number];
  color: ColorKey;
}

const NODE: Record<string, { x: number; y: number; label: string }> = {
  glc: { x: 150, y: 26, label: "Glucose" },
  G6P: { x: 150, y: 78, label: "G6P" },
  R5P: { x: 264, y: 60, label: "R5P" },
  PEP: { x: 150, y: 128, label: "PEP" },
  PYR: { x: 150, y: 182, label: "Pyruvate" },
  ACCOA: { x: 150, y: 236, label: "Acetyl-CoA" },
  OAA: { x: 264, y: 198, label: "OAA" },
  CIT: { x: 302, y: 250, label: "Citrate" },
  AKG: { x: 258, y: 304, label: "α-KG" },
  GLU: { x: 168, y: 372, label: "L-Glu" },
  lac: { x: 52, y: 150, label: "Lactate" },
  OVF: { x: 52, y: 236, label: "Acetate" },
  BIO: { x: 56, y: 304, label: "Biomass" },
  PGA: { x: 100, y: 436, label: "γ-PGA" },
  CA: { x: 236, y: 436, label: "CA enz." },
};

function PathwayFlowMap({
  fluxes,
  has1,
  has2,
  objective,
  knockouts,
  isLightMode,
}: {
  fluxes: Record<string, number>;
  has1: boolean;
  has2: boolean;
  objective: Obj;
  knockouts: Set<string>;
  isLightMode: boolean;
}) {
  const edges: FlowEdge[] = [
    {
      id: "GLT",
      rxn: "Glucose uptake — PTS (ptsG)",
      from: [NODE.glc.x, NODE.glc.y],
      to: [NODE.G6P.x, NODE.G6P.y],
      color: "spine",
    },
    {
      id: "GLY",
      rxn: "Glycolysis (pfkA)",
      from: [NODE.G6P.x, NODE.G6P.y],
      to: [NODE.PEP.x, NODE.PEP.y],
      color: "spine",
    },
    {
      id: "ZWF",
      rxn: "Oxidative pentose-P pathway (zwf) → NADPH",
      from: [NODE.G6P.x, NODE.G6P.y],
      to: [NODE.R5P.x, NODE.R5P.y],
      color: "ppp",
    },
    {
      id: "PYK",
      rxn: "Pyruvate kinase (pyk)",
      from: [NODE.PEP.x, NODE.PEP.y],
      to: [NODE.PYR.x, NODE.PYR.y],
      color: "spine",
    },
    {
      id: "PDH",
      rxn: "Pyruvate dehydrogenase (pdhA)",
      from: [NODE.PYR.x, NODE.PYR.y],
      to: [NODE.ACCOA.x, NODE.ACCOA.y],
      color: "spine",
    },
    {
      id: "PYC",
      rxn: "Pyruvate carboxylase — anaplerosis (pycA)",
      from: [NODE.PYR.x, NODE.PYR.y],
      to: [NODE.OAA.x, NODE.OAA.y],
      color: "ana",
    },
    {
      id: "CS",
      rxn: "Citrate synthase (citZ): AcCoA + OAA",
      from: [NODE.ACCOA.x, NODE.ACCOA.y],
      to: [NODE.CIT.x, NODE.CIT.y],
      color: "tca",
    },
    {
      id: "ICDH",
      rxn: "Isocitrate dehydrogenase (citC) → NADPH",
      from: [NODE.CIT.x, NODE.CIT.y],
      to: [NODE.AKG.x, NODE.AKG.y],
      color: "tca",
    },
    {
      id: "AKGD",
      rxn: "2-oxoglutarate DH → OAA, cycle closure (odhAB)",
      from: [NODE.AKG.x, NODE.AKG.y],
      to: [NODE.OAA.x, NODE.OAA.y],
      color: "tca",
    },
    {
      id: "GOGAT",
      rxn: "GS–GOGAT glutamate synthesis (glnA/gltAB)",
      from: [NODE.AKG.x, NODE.AKG.y],
      to: [NODE.GLU.x, NODE.GLU.y],
      color: "spine",
    },
    {
      id: "LDH",
      rxn: "Lactate overflow — NADH sink (ldh)",
      from: [NODE.PYR.x, NODE.PYR.y],
      to: [NODE.lac.x, NODE.lac.y],
      color: "over",
    },
    {
      id: "OVF",
      rxn: "Acetate overflow (pta/ackA)",
      from: [NODE.ACCOA.x, NODE.ACCOA.y],
      to: [NODE.OVF.x, NODE.OVF.y],
      color: "over",
    },
    {
      id: "BIO",
      rxn: "Biomass assembly — multi-precursor drain (growth)",
      from: [NODE.ACCOA.x, NODE.ACCOA.y],
      to: [NODE.BIO.x, NODE.BIO.y],
      color: "bio",
    },
  ];
  if (has1)
    edges.push({
      id: "EX_PGA",
      rxn: "γ-PGA synthase + secretion (capBCA)",
      from: [NODE.GLU.x, NODE.GLU.y],
      to: [NODE.PGA.x, NODE.PGA.y],
      color: "pga",
    });
  if (has2)
    edges.push({
      id: "EX_CA",
      rxn: "Carbonic anhydrase display (can)",
      from: [NODE.GLU.x, NODE.GLU.y],
      to: [NODE.CA.x, NODE.CA.y],
      color: "ca",
    });

  const activeNodes = new Set<string>([
    "glc",
    "G6P",
    "R5P",
    "PEP",
    "PYR",
    "ACCOA",
    "OAA",
    "CIT",
    "AKG",
    "GLU",
    "lac",
    "OVF",
    "BIO",
  ]);
  if (has1) activeNodes.add("PGA");
  if (has2) activeNodes.add("CA");

  const vals = edges.map((e) => Math.abs(fluxes[e.id] ?? 0));
  const maxFlux = Math.max(1e-6, ...vals);

  const HEX: Record<ColorKey, string> = {
    spine: isLightMode ? "#d6884a" : "#e0a878",
    tca: isLightMode ? "#4a8f86" : "#8fb3ac",
    ppp: isLightMode ? "#a88f6f" : "#b9a07f",
    ana: isLightMode ? "#a88f6f" : "#c4a988",
    over: "#ef4444",
    bio: isLightMode ? "#b07568" : "#cf9d90",
    pga: isLightMode ? "#d97706" : "#fbbf24",
    ca: isLightMode ? "#0d9488" : "#2dd4bf",
  };
  const muted = isLightMode ? "#c4bcae" : "#3a475c";
  const inkNode = isLightMode ? "#fdfaf3" : "#1c1512";
  const nodeStroke = isLightMode ? "#57534e" : "#8a7e75";
  const nodeText = isLightMode ? "#1c1917" : "#f3e9db";

  // Trim an edge back from both node centres so the arrowhead lands cleanly on the target rim.
  const geom = (from: [number, number], to: [number, number]) => {
    const dx = to[0] - from[0],
      dy = to[1] - from[1];
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len,
      uy = dy / len;
    return {
      x1: from[0] + ux * 21,
      y1: from[1] + uy * 15,
      x2: to[0] - ux * 24,
      y2: to[1] - uy * 17,
      mx: (from[0] + to[0]) / 2,
      my: (from[1] + to[1]) / 2,
    };
  };

  return (
    <div className="w-full">
      <style>{`@keyframes fbaflow { to { stroke-dashoffset: -20; } }`}</style>
      <svg
        viewBox="0 0 340 470"
        className="w-full"
        style={{ maxHeight: 470 }}
        role="img"
        aria-label="Live metabolic pathway flow map: arrow thickness scales with metabolic flux."
      >
        <defs>
          {/* userSpaceOnUse keeps arrowheads a fixed size regardless of the (flux-scaled) stroke width. */}
          {(Object.keys(HEX) as ColorKey[]).map((k) => (
            <marker
              key={k}
              id={`fba-arrow-${k}`}
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerUnits="userSpaceOnUse"
              markerWidth="11"
              markerHeight="11"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill={HEX[k]} />
            </marker>
          ))}
          <marker
            id="fba-arrow-muted"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerUnits="userSpaceOnUse"
            markerWidth="8"
            markerHeight="8"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill={muted} />
          </marker>
        </defs>

        {/* edges */}
        {edges.map((e) => {
          const flux = Math.abs(fluxes[e.id] ?? 0);
          const norm = flux / maxFlux;
          const ko = knockouts.has(e.id);
          const dead = ko || norm < 0.008;
          const col = dead ? muted : HEX[e.color];
          const w = dead ? 1.4 : 1.8 + 6.5 * norm;
          const op = dead ? 0.5 : 0.4 + 0.55 * norm;
          const g = geom(e.from, e.to);
          const dur = Math.min(6, Math.max(0.7, 2.4 / (norm + 0.06)));
          return (
            <g key={e.id}>
              <title>{`${e.rxn}\nflux = ${flux.toFixed(2)} mmol·gDCW⁻¹·h⁻¹`}</title>
              <line
                x1={g.x1}
                y1={g.y1}
                x2={g.x2}
                y2={g.y2}
                stroke={col}
                strokeWidth={w}
                strokeLinecap="round"
                opacity={op}
                strokeDasharray={ko ? "3 4" : undefined}
                markerEnd={`url(#fba-arrow-${dead ? "muted" : e.color})`}
              />
              {!dead && norm > 0.04 && (
                <line
                  x1={g.x1}
                  y1={g.y1}
                  x2={g.x2}
                  y2={g.y2}
                  stroke={isLightMode ? "#ffffff" : "#f3e9db"}
                  strokeWidth={Math.min(2.4, w * 0.45)}
                  strokeLinecap="round"
                  opacity={0.85}
                  strokeDasharray="1.5 8.5"
                  style={{ animation: `fbaflow ${dur}s linear infinite` }}
                />
              )}
              {flux > 0.05 && (
                <text
                  x={g.mx + (e.color === "spine" ? 12 : 0)}
                  y={g.my - 2}
                  fontSize="7.5"
                  fill={dead ? muted : col}
                  fontWeight="700"
                  textAnchor="middle"
                  style={{
                    paintOrder: "stroke",
                    stroke: inkNode,
                    strokeWidth: 2.4,
                  }}
                >
                  {flux.toFixed(1)}
                </text>
              )}
            </g>
          );
        })}

        {/* nodes */}
        {Object.entries(NODE).map(([key, n]) => {
          if (!activeNodes.has(key)) return null;
          const isProduct = key === "PGA" || key === "CA";
          const isObjNode =
            (objective === "pga" && key === "PGA") ||
            (objective === "ca" && key === "CA") ||
            (objective === "growth" && key === "BIO");
          const accent =
            key === "PGA"
              ? HEX.pga
              : key === "CA"
                ? HEX.ca
                : key === "BIO"
                  ? HEX.bio
                  : key === "OVF" || key === "lac"
                    ? HEX.over
                    : key === "R5P"
                      ? HEX.ppp
                      : key === "OAA" || key === "CIT" || key === "AKG"
                        ? HEX.tca
                        : HEX.spine;
          return (
            <g key={key}>
              <ellipse
                cx={n.x}
                cy={n.y}
                rx={isProduct ? 27 : 22}
                ry={15}
                fill={inkNode}
                stroke={isObjNode ? accent : nodeStroke}
                strokeWidth={isObjNode ? 2.6 : 1.3}
                opacity={0.98}
              />
              <text
                x={n.x}
                y={n.y + 3}
                fontSize={isProduct ? 8.5 : 8.2}
                fill={nodeText}
                fontWeight={isObjNode ? 800 : 600}
                textAnchor="middle"
              >
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function FbaOptimizationModule({
  isLightMode,
  prongs = [1],
  onUpdatePrecursorFlux,
}: Props) {
  const c = chartColors(isLightMode);
  const has1 = prongs.includes(1);
  const has2 = prongs.includes(2);

  const [glucoseUb, setGlucoseUb] = useState(cval(FBA_CALIB.vGlcMax));
  const [o2Ub, setO2Ub] = useState(cval(FBA_CALIB.vO2Max));
  const [objective, setObjective] = useState<Obj>(has1 ? "pga" : "ca");
  const [knockouts, setKnockouts] = useState<Set<string>>(new Set());

  // Which flux ids to plot — drop the pathway that isn't active.
  const fluxDisplay = useMemo(() => {
    const base = [
      "EX_GLC",
      "GLY",
      "ZWF",
      "PDH",
      "PYC",
      "CS",
      "ICDH",
      "AKGD",
      "GOGAT",
      "BIO",
      "RESP",
      "OVF",
      "LDH",
      "EX_BIOM",
    ];
    if (has1) base.splice(9, 0, "PGS", "EX_PGA");
    if (has2) base.splice(has1 ? 11 : 9, 0, "CAS", "EX_CA");
    return base;
  }, [has1, has2]);

  // The product axis for the envelope / operating point.
  const productObj =
    objective === "ca"
      ? OBJ_CA
      : objective === "pga"
        ? OBJ_PGA
        : has1
          ? OBJ_PGA
          : OBJ_CA;
  const productLabel = productObj === OBJ_PGA ? "γ-PGA" : "Carbonic Anhydrase";

  const analysis = useMemo(() => {
    const ko = [...knockouts];
    const { network } = buildCoreNetwork({ glucoseUb, o2Ub, knockouts: ko });
    const objId = objective === "growth" ? OBJ_GROWTH : productObj;
    const sol = parsimoniousFBA(network, objId);
    const growthMax = solveFBA(network, OBJ_GROWTH).objectiveValue;
    const pgaMax = has1 ? solveFBA(network, OBJ_PGA).objectiveValue : 0;
    const caMax = has2 ? solveFBA(network, OBJ_CA).objectiveValue : 0;
    const envelope = productionEnvelope(network, OBJ_GROWTH, productObj, 12);
    const fva = fluxVariability(network, objId, 0.999, [
      "GLY",
      "ZWF",
      "ICDH",
      "AKGD",
      "GOGAT",
      has1 ? "PGS" : "CAS",
      "OVF",
    ]);

    // Shadow prices (marginal value of a resource) via a genuine finite difference of the LP
    // optimum: dz*/d(cap). A positive glucose price means the feed is the binding constraint.
    const base = sol.objectiveValue;
    const eps = 0.5;
    const objAt = (g: number, o: number) =>
      parsimoniousFBA(
        buildCoreNetwork({ glucoseUb: g, o2Ub: o, knockouts: ko }).network,
        objId,
      ).objectiveValue;
    const glucoseShadow =
      glucoseUb > 0
        ? Math.max(0, (objAt(glucoseUb + eps, o2Ub) - base) / eps)
        : 0;
    const o2Shadow =
      o2Ub > 0 ? Math.max(0, (objAt(glucoseUb, o2Ub + eps) - base) / eps) : 0;

    return {
      sol,
      growthMax,
      pgaMax,
      caMax,
      envelope,
      fva,
      status: sol.status,
      glucoseShadow,
      o2Shadow,
      growth: sol.fluxes[OBJ_GROWTH] ?? 0,
      product: sol.fluxes[productObj] ?? 0,
      acetate: sol.fluxes["EX_AC"] ?? 0,
      co2: sol.fluxes["EX_CO2"] ?? 0,
      precursorFlux: sol.fluxes["GOGAT"] ?? 0,
    };
  }, [glucoseUb, o2Ub, objective, knockouts, productObj, has1, has2]);

  // FBA → ODE coupling only matters for γ-PGA (Prong 1).
  useEffect(() => {
    if (has1)
      onUpdatePrecursorFlux?.(fbaPrecursorToConc(analysis.precursorFlux));
  }, [analysis.precursorFlux, onUpdatePrecursorFlux, has1]);

  const envelopeData = useMemo(
    () =>
      analysis.envelope.map((p) => ({
        growth: +p.growth.toFixed(2),
        product: +p.productMax.toFixed(2),
      })),
    [analysis.envelope],
  );
  const fluxData = useMemo(
    () =>
      fluxDisplay.map((id) => ({
        id,
        flux: +(analysis.sol.fluxes[id] ?? 0).toFixed(2),
      })),
    [analysis.sol, fluxDisplay],
  );

  // Carbon accounting: what fraction of the fixed glucose feed lands where (carbon-mole basis).
  const carbonToProduct = useMemo(() => {
    const inC = 6 * (analysis.sol.fluxes["EX_GLC"] ?? 0); // 6 C per glucose
    if (inC < 1e-6) return { product: 0, acetate: 0, co2: 0 };
    const prodC =
      productObj === OBJ_PGA ? 5 * analysis.product : 1 * analysis.product; // γ-PGA monomer ~5 C
    return {
      product: Math.min(100, Math.max(0, (prodC / inC) * 100)),
      acetate: Math.min(100, Math.max(0, ((2 * analysis.acetate) / inC) * 100)),
      co2: Math.min(100, Math.max(0, (analysis.co2 / inC) * 100)),
    };
  }, [analysis, productObj]);

  const toggleKO = (id: string) =>
    setKnockouts((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const objButtons: [Obj, string][] = [["growth", "Max Growth"]];
  if (has1) objButtons.push(["pga", "Max γ-PGA"]);
  if (has2) objButtons.push(["ca", "Max CA"]);

  const controls = (
    <>
      <Panel
        title={
          <>
            <GlossaryTerm term="constraint-based">Constraint</GlossaryTerm>{" "}
            Bounds &amp;{" "}
            <GlossaryTerm term="objective-function">Objective</GlossaryTerm>
          </>
        }
        icon={Workflow}
        isLightMode={isLightMode}
      >
        <div className="space-y-4">
          <Slider
            isLightMode={isLightMode}
            accent="accent-amber-500"
            label="Glucose uptake bound"
            value={glucoseUb}
            min={2}
            max={25}
            step={0.5}
            unit="mmol/gDCW/h"
            onChange={setGlucoseUb}
            hint="Upper bound on EX_glc — the measured substrate uptake flux that scales the whole linear program."
          />
          <Slider
            isLightMode={isLightMode}
            accent="accent-teal-500"
            label="O₂ uptake bound"
            value={o2Ub}
            min={0}
            max={40}
            step={1}
            unit="mmol/gDCW/h"
            onChange={setO2Ub}
            hint="Aerobiosis ceiling; low oxygen forces fermentation and acetate overflow."
          />
          <div>
            <span
              className={`text-[11px] font-semibold block mb-1.5 ${isLightMode ? "text-stone-700" : "text-slate-300"}`}
            >
              Objective cᵀv
            </span>
            <div
              className={`flex gap-1 p-1 rounded-lg border ${isLightMode ? "bg-stone-50 border-stone-200" : "bg-slate-900 border-slate-800"}`}
            >
              {objButtons.map(([k, lbl]) => (
                <button
                  key={k}
                  onClick={() => setObjective(k)}
                  className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition ${objective === k ? (isLightMode ? "bg-amber-600 text-white" : "bg-amber-500 text-white") : isLightMode ? "text-stone-600" : "text-slate-400"}`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <Panel
        title={
          <>
            In-Silico{" "}
            <GlossaryTerm term="gene-knockout">Gene Knockouts</GlossaryTerm>
          </>
        }
        icon={GitBranch}
        isLightMode={isLightMode}
      >
        <div className="grid grid-cols-2 gap-2">
          {KNOCKOUTS.map((k) => (
            <label
              key={k.id}
              className={`flex items-center gap-2 p-2 rounded-lg border text-[11px] cursor-pointer transition ${
                knockouts.has(k.id)
                  ? isLightMode
                    ? "border-rose-300 bg-rose-50 text-rose-800"
                    : "border-rose-900/50 bg-rose-950/20 text-rose-300"
                  : isLightMode
                    ? "border-stone-200 bg-stone-50 text-stone-600"
                    : "border-slate-800 bg-slate-900/40 text-slate-400"
              }`}
            >
              <input
                type="checkbox"
                checked={knockouts.has(k.id)}
                onChange={() => toggleKO(k.id)}
                className="accent-rose-500"
              />
              <span className="font-mono font-bold">{k.label}</span>
            </label>
          ))}
        </div>
        <p
          className={`mt-2 text-[10px] ${isLightMode ? "text-stone-500" : "text-slate-500"}`}
        >
          <GlossaryText>
            Setting lb=ub=0 forces the LP to reroute carbon; watch the flow map,
            the production envelope and the acetate overflow respond in
            lock-step.
          </GlossaryText>
        </p>
      </Panel>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          isLightMode={isLightMode}
          label="Max growth µ"
          value={analysis.growthMax.toFixed(2)}
          unit="h⁻¹"
          accent={isLightMode ? "text-teal-700" : "text-teal-400"}
        />
        {has1 && (
          <StatCard
            isLightMode={isLightMode}
            label="Max γ-PGA flux"
            value={analysis.pgaMax.toFixed(2)}
            unit="mmol/gDCW/h"
            emphasize
            accent={isLightMode ? "text-amber-700" : "text-amber-400"}
          />
        )}
        {has2 && (
          <StatCard
            isLightMode={isLightMode}
            label="Max CA flux"
            value={analysis.caMax.toFixed(2)}
            unit="mmol/gDCW/h"
            emphasize
            accent={isLightMode ? "text-teal-700" : "text-teal-400"}
          />
        )}
        {has1 && (
          <StatCard
            isLightMode={isLightMode}
            label="Precursor → ODE [S]"
            value={fbaPrecursorToConc(analysis.precursorFlux).toFixed(2)}
            unit="mM"
            accent={isLightMode ? "text-amber-700" : "text-amber-400"}
            sub="couples to kinetic model"
          />
        )}
        <StatCard
          isLightMode={isLightMode}
          label={
            <>
              Acetate{" "}
              <GlossaryTerm term="acetate-overflow">overflow</GlossaryTerm>
            </>
          }
          value={analysis.acetate.toFixed(2)}
          unit="mmol/gDCW/h"
          accent={isLightMode ? "text-stone-700" : "text-slate-300"}
          sub="carbon wasted"
        />
        <StatCard
          isLightMode={isLightMode}
          label="Glucose shadow price"
          value={analysis.glucoseShadow.toFixed(2)}
          unit="Δobj/Δcap"
          accent={isLightMode ? "text-amber-700" : "text-amber-400"}
          sub={
            analysis.glucoseShadow > 0.01
              ? "feed is binding"
              : "feed not limiting"
          }
        />
        <StatCard
          isLightMode={isLightMode}
          label="O₂ shadow price"
          value={analysis.o2Shadow.toFixed(2)}
          unit="Δobj/Δcap"
          accent={isLightMode ? "text-teal-700" : "text-teal-400"}
          sub={analysis.o2Shadow > 0.01 ? "O₂ is binding" : "O₂ not limiting"}
        />
      </div>

      <ModuleActions moduleId="fba" isLightMode={isLightMode} />
    </>
  );

  const legendDot = (hex: string, label: string) => (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-block w-2.5 h-2.5 rounded-full"
        style={{ background: hex }}
      />{" "}
      {label}
    </span>
  );

  return (
    <ModuleShell isLightMode={isLightMode} controls={controls}>
      <Panel
        title={
          <>
            <GlossaryTerm term="flux">Live Pathway Flow Map</GlossaryTerm> —
            carbon routing at the optimum
          </>
        }
        icon={Network}
        isLightMode={isLightMode}
        right={
          analysis.status !== "optimal" ? (
            <span className="text-[10px] font-semibold text-dune-maroon dark:text-dune-rose">
              Solver could not reach an optimum
            </span>
          ) : undefined
        }
      >
        <PathwayFlowMap
          fluxes={analysis.sol.fluxes}
          has1={has1}
          has2={has2}
          objective={objective}
          knockouts={knockouts}
          isLightMode={isLightMode}
        />
        <div
          className={`mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[9px] ${isLightMode ? "text-stone-500" : "text-slate-400"}`}
        >
          {legendDot(isLightMode ? "#d6884a" : "#e0a878", "glycolysis")}
          {legendDot(isLightMode ? "#4a8f86" : "#8fb3ac", "TCA cycle")}
          {legendDot(isLightMode ? "#a88f6f" : "#b9a07f", "pentose-P (NADPH)")}
          {legendDot(isLightMode ? "#a88f6f" : "#c4a988", "anaplerosis")}
          {has1 && legendDot(isLightMode ? "#d97706" : "#fbbf24", "γ-PGA")}
          {has2 && legendDot(isLightMode ? "#0d9488" : "#2dd4bf", "CA enzyme")}
          {legendDot(isLightMode ? "#b07568" : "#cf9d90", "biomass")}
          {legendDot("#ef4444", "overflow (acetate/lactate)")}
        </div>
        <p
          className={`mt-1.5 text-[10px] ${isLightMode ? "text-stone-500" : "text-slate-500"}`}
        >
          <GlossaryText>
            Arrow thickness and flow speed track each reaction&apos;s pFBA flux;
            the bold-ringed node is the current objective. Every arrow obeys the
            steady-state mass balance, so what leaves α-KG toward the product is
            carbon taken away from the TCA cycle and growth.
          </GlossaryText>
        </p>
      </Panel>

      <Panel
        title={
          <>
            <GlossaryTerm term="production-envelope">
              Production Envelope
            </GlossaryTerm>{" "}
            — Growth ↔ {productLabel}{" "}
            <GlossaryTerm term="production-envelope">Pareto Front</GlossaryTerm>
          </>
        }
        icon={Sigma}
        isLightMode={isLightMode}
      >
        <ResponsiveContainer width="100%" height={200}>
          <LineChart
            data={envelopeData}
            margin={{ top: 6, right: 12, left: -12, bottom: 2 }}
          >
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis
              dataKey="growth"
              stroke={c.axis}
              tick={{ fontSize: 9 }}
              label={{
                value: "growth µ (h⁻¹)",
                position: "insideBottom",
                offset: -2,
                fontSize: 9,
                fill: c.axis,
              }}
            />
            <YAxis
              stroke={c.axis}
              tick={{ fontSize: 9 }}
              label={{
                value: `${productLabel} flux`,
                angle: -90,
                position: "insideLeft",
                fontSize: 9,
                fill: c.axis,
              }}
            />
            <Tooltip
              contentStyle={tooltipStyle(isLightMode)}
              formatter={(v: number) => [v, productLabel]}
              labelFormatter={(l) => `µ = ${l} h⁻¹`}
            />
            <Line
              type="monotone"
              dataKey="product"
              stroke="#d6884a"
              strokeWidth={2.5}
              dot={false}
            />
            <ReferenceDot
              x={+analysis.growth.toFixed(2)}
              y={+analysis.product.toFixed(2)}
              r={6}
              fill={objective === "growth" ? "#c28a7c" : "#f59e0b"}
              stroke={isLightMode ? "#fff" : "#000"}
            />
          </LineChart>
        </ResponsiveContainer>
        <p
          className={`mt-1 text-[10px] flex items-center gap-1.5 ${isLightMode ? "text-stone-500" : "text-slate-500"}`}
        >
          <Beaker className="w-3 h-3" /> Marker = current objective&apos;s
          operating point. The downward slope is the growth that must be traded
          away per unit of product.
        </p>
      </Panel>

      <Panel
        title={<>Carbon Fate — where the fixed feed lands</>}
        icon={Sigma}
        isLightMode={isLightMode}
      >
        <div className="space-y-2.5">
          {(
            [
              [
                "To product",
                carbonToProduct.product,
                isLightMode ? "#d97706" : "#fbbf24",
              ],
              ["Wasted as acetate", carbonToProduct.acetate, "#ef4444"],
              [
                "Released as CO₂",
                carbonToProduct.co2,
                isLightMode ? "#8a7e75" : "#94a3b8",
              ],
            ] as [string, number, string][]
          ).map(([lbl, pct, hex]) => (
            <div key={lbl}>
              <div className="flex justify-between text-[10px] font-mono mb-0.5">
                <span
                  className={
                    isLightMode ? "text-stone-600 font-bold" : "text-slate-300"
                  }
                >
                  {lbl}
                </span>
                <span
                  className={isLightMode ? "text-stone-500" : "text-slate-500"}
                >
                  {pct.toFixed(0)}% of feed C
                </span>
              </div>
              <div
                className={`h-2 rounded-full overflow-hidden ${isLightMode ? "bg-stone-200" : "bg-slate-800"}`}
              >
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${pct}%`, background: hex }}
                />
              </div>
            </div>
          ))}
        </div>
        <p
          className={`text-[10px] mt-2 ${isLightMode ? "text-stone-500" : "text-slate-500"}`}
        >
          <GlossaryText>
            Carbon-mole balance on the fixed glucose feed. Deleting acetate
            overflow visibly shifts the red bar into the product bar.
          </GlossaryText>
        </p>
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Panel
          title={
            <>
              Optimal <GlossaryTerm term="flux">Flux</GlossaryTerm> Distribution
              (<GlossaryTerm term="pfba">pFBA</GlossaryTerm>)
            </>
          }
          icon={Dna}
          isLightMode={isLightMode}
        >
          <ResponsiveContainer width="100%" height={210}>
            <BarChart
              data={fluxData}
              layout="vertical"
              margin={{ top: 4, right: 12, left: 6, bottom: 0 }}
            >
              <CartesianGrid
                stroke={c.grid}
                strokeDasharray="3 3"
                horizontal={false}
              />
              <XAxis type="number" stroke={c.axis} tick={{ fontSize: 9 }} />
              <YAxis
                type="category"
                dataKey="id"
                stroke={c.axis}
                tick={{ fontSize: 9 }}
                width={56}
              />
              <Tooltip
                contentStyle={tooltipStyle(isLightMode)}
                formatter={(v: number) => [`${v} mmol/gDCW/h`, "flux"]}
              />
              <Bar dataKey="flux" radius={[0, 3, 3, 0]}>
                {fluxData.map((d) => (
                  <Cell
                    key={d.id}
                    fill={
                      d.id === "EX_PGA"
                        ? "#f59e0b"
                        : d.id === "EX_CA"
                          ? "#cf9d90"
                          : d.id === "EX_BIOM"
                            ? "#c28a7c"
                            : d.id === "OVF"
                              ? "#ef4444"
                              : isLightMode
                                ? "#d6884a"
                                : "#e0a878"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title={
            <>
              <GlossaryTerm term="fva">Flux Variability</GlossaryTerm> (at
              optimum)
            </>
          }
          icon={GitBranch}
          isLightMode={isLightMode}
        >
          <div className="space-y-2.5 mt-1">
            {Object.entries(analysis.fva).map(([id, range]) => {
              const lo = Number.isFinite(range.min) ? range.min : 0;
              const hi = Number.isFinite(range.max) ? range.max : 0;
              const span = Math.max(
                ...Object.values(analysis.fva).map((r) =>
                  Number.isFinite(r.max) ? r.max : 0,
                ),
                1,
              );
              return (
                <div key={id}>
                  <div className="flex justify-between text-[10px] font-mono mb-0.5">
                    <span
                      className={
                        isLightMode
                          ? "text-stone-600 font-bold"
                          : "text-slate-400"
                      }
                    >
                      {id}
                    </span>
                    <span
                      className={
                        isLightMode ? "text-stone-500" : "text-slate-500"
                      }
                    >
                      [{lo.toFixed(1)}, {hi.toFixed(1)}]
                    </span>
                  </div>
                  <div
                    className={`h-2 rounded-full relative ${isLightMode ? "bg-stone-200" : "bg-slate-800"}`}
                  >
                    <div
                      className="absolute h-2 rounded-full bg-gradient-to-r from-teal-500 to-amber-500"
                      style={{
                        left: `${(lo / span) * 100}%`,
                        width: `${Math.max(2, ((hi - lo) / span) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
            <p
              className={`text-[10px] mt-2 ${isLightMode ? "text-stone-500" : "text-slate-500"}`}
            >
              Wide bars = flexible reactions with alternate optima; pinpoints =
              rigid, rate-limiting steps.
            </p>
          </div>
        </Panel>
      </div>

      <div
        className={`px-4 py-3 rounded-xl border text-[10px] font-mono leading-relaxed ${
          isLightMode
            ? "bg-[#fcfaf5] border-amber-900/10 text-stone-600"
            : "bg-[#1c1512] border-slate-850 text-slate-400"
        }`}
      >
        <GlossaryText>
          {`Solved as a real linear program: maximise cᵀv subject to the stoichiometric-matrix balance S·v = 0 and lb ≤ v ≤ ub, using a two-phase simplex. 21 balanced metabolites, 27 reactions spanning glycolysis, the oxidative pentose-phosphate pathway, a closed TCA cycle, GS–GOGAT glutamate synthesis, pyruvate-carboxylase anaplerosis and fermentative overflow. pFBA then breaks ties by minimising total flux; FVA and the shadow prices are separate LPs on the same network.`}
        </GlossaryText>
      </div>
    </ModuleShell>
  );
}
