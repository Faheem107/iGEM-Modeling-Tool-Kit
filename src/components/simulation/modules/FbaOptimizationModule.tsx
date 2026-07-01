'use client';

/**
 * Approach 5 — Flux Balance Analysis (rigorous). Solves a genuine LP (max cᵀv s.t. S·v=0,
 * lb≤v≤ub) on a mass-balanced core network, and surfaces the analyses that make FBA a
 * decision tool: the production envelope (growth↔γ-PGA Pareto front), parsimonious flux map,
 * flux variability, and in-silico knockouts that reroute carbon. Feeds the ODE precursor.
 */

import React, { useMemo, useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceDot, Cell,
} from 'recharts';
import { Workflow, GitBranch, Sigma, Beaker, Dna } from 'lucide-react';
import {
  buildCoreNetwork, OBJ_GROWTH, OBJ_PGA, KNOCKOUTS,
  solveFBA, parsimoniousFBA, productionEnvelope, fluxVariability, fbaPrecursorToConc,
  FBA_CALIB, cval,
} from '../../../lib/physics';
import { ModuleShell, Panel, Slider, StatCard, MathDisclosure, chartColors, tooltipStyle, Themed } from '../_shared';

interface Props extends Themed {
  onUpdatePrecursorFlux?: (concMillimolar: number) => void;
}

const FLUX_DISPLAY = ['EX_GLC', 'GLY', 'PYK', 'PDH', 'TCA', 'GDH', 'PGS', 'BIO', 'RESP', 'OVF', 'EX_PGA', 'EX_BIOM'];

export default function FbaOptimizationModule({ isLightMode, onUpdatePrecursorFlux }: Props) {
  const c = chartColors(isLightMode);
  const [glucoseUb, setGlucoseUb] = useState(cval(FBA_CALIB.vGlcMax));
  const [o2Ub, setO2Ub] = useState(cval(FBA_CALIB.vO2Max));
  const [objective, setObjective] = useState<'growth' | 'pga'>('pga');
  const [knockouts, setKnockouts] = useState<Set<string>>(new Set());

  const analysis = useMemo(() => {
    const ko = [...knockouts];
    const { network } = buildCoreNetwork({ glucoseUb, o2Ub, knockouts: ko });
    const objId = objective === 'growth' ? OBJ_GROWTH : OBJ_PGA;
    const sol = parsimoniousFBA(network, objId);
    const growthMax = solveFBA(network, OBJ_GROWTH).objectiveValue;
    const pgaMax = solveFBA(network, OBJ_PGA).objectiveValue;
    const envelope = productionEnvelope(network, OBJ_GROWTH, OBJ_PGA, 12);
    const fva = fluxVariability(network, objId, 0.999, ['GLY', 'TCA', 'GDH', 'PGS', 'OVF']);
    return {
      sol, growthMax, pgaMax, envelope, fva,
      growth: sol.fluxes[OBJ_GROWTH] ?? 0,
      pga: sol.fluxes[OBJ_PGA] ?? 0,
      acetate: sol.fluxes['EX_AC'] ?? 0,
      precursorFlux: sol.fluxes['GDH'] ?? 0,
    };
  }, [glucoseUb, o2Ub, objective, knockouts]);

  // FBA → ODE coupling: optimal glutamate-precursor flux → intracellular [S].
  useEffect(() => { onUpdatePrecursorFlux?.(fbaPrecursorToConc(analysis.precursorFlux)); }, [analysis.precursorFlux, onUpdatePrecursorFlux]);

  const envelopeData = useMemo(() => analysis.envelope.map((p) => ({ growth: +p.growth.toFixed(2), pga: +p.productMax.toFixed(2) })), [analysis.envelope]);
  const fluxData = useMemo(() => FLUX_DISPLAY.map((id) => ({ id, flux: +(analysis.sol.fluxes[id] ?? 0).toFixed(2) })), [analysis.sol]);

  const toggleKO = (id: string) => setKnockouts((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const controls = (
    <>
      <Panel title="Constraint Bounds & Objective" icon={Workflow} isLightMode={isLightMode}>
        <div className="space-y-4">
          <Slider isLightMode={isLightMode} accent="accent-amber-500" label="Glucose uptake bound" value={glucoseUb} min={2} max={25} step={0.5} unit="mmol/gDCW/h"
            onChange={setGlucoseUb} hint="Upper bound on EX_glc — measured in the bioreactor." />
          <Slider isLightMode={isLightMode} accent="accent-cyan-500" label="O₂ uptake bound" value={o2Ub} min={0} max={40} step={1} unit="mmol/gDCW/h"
            onChange={setO2Ub} hint="Aerobiosis ceiling; low O₂ forces fermentation." />
          <div>
            <span className={`text-[11px] font-semibold block mb-1.5 ${isLightMode ? 'text-stone-700' : 'text-slate-300'}`}>Objective cᵀv</span>
            <div className={`flex gap-1 p-1 rounded-lg border ${isLightMode ? 'bg-stone-50 border-stone-200' : 'bg-slate-900 border-slate-800'}`}>
              {([['growth', 'Max Growth'], ['pga', 'Max γ-PGA']] as const).map(([k, lbl]) => (
                <button key={k} onClick={() => setObjective(k)}
                  className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition ${objective === k ? (isLightMode ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white') : (isLightMode ? 'text-stone-600' : 'text-slate-400')}`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="In-Silico Gene Knockouts" icon={GitBranch} isLightMode={isLightMode}>
        <div className="grid grid-cols-2 gap-2">
          {KNOCKOUTS.map((k) => (
            <label key={k.id} className={`flex items-center gap-2 p-2 rounded-lg border text-[11px] cursor-pointer transition ${
              knockouts.has(k.id) ? (isLightMode ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-rose-900/50 bg-rose-950/20 text-rose-300') : (isLightMode ? 'border-stone-200 bg-stone-50 text-stone-600' : 'border-slate-800 bg-slate-900/40 text-slate-400')
            }`}>
              <input type="checkbox" checked={knockouts.has(k.id)} onChange={() => toggleKO(k.id)} className="accent-rose-500" />
              <span className="font-mono font-bold">{k.label}</span>
            </label>
          ))}
        </div>
        <p className={`mt-2 text-[10px] ${isLightMode ? 'text-stone-500' : 'text-slate-500'}`}>The LP genuinely reroutes carbon (lb=ub=0); watch the production envelope and acetate respond.</p>
      </Panel>

      <div className="grid grid-cols-2 gap-3">
        <StatCard isLightMode={isLightMode} label="Max growth µ" value={analysis.growthMax.toFixed(2)} unit="h⁻¹" accent={isLightMode ? 'text-emerald-700' : 'text-emerald-400'} />
        <StatCard isLightMode={isLightMode} label="Max γ-PGA flux" value={analysis.pgaMax.toFixed(2)} unit="mmol/gDCW/h" emphasize accent={isLightMode ? 'text-amber-700' : 'text-amber-400'} />
        <StatCard isLightMode={isLightMode} label="Precursor → ODE [S]" value={fbaPrecursorToConc(analysis.precursorFlux).toFixed(2)} unit="mM" accent={isLightMode ? 'text-violet-700' : 'text-violet-400'} sub="couples to kinetic model" />
        <StatCard isLightMode={isLightMode} label="Acetate overflow" value={analysis.acetate.toFixed(2)} unit="mmol/gDCW/h" accent={isLightMode ? 'text-stone-700' : 'text-slate-300'} sub="carbon wasted" />
      </div>

      <MathDisclosure isLightMode={isLightMode}>
        <p>maximize cᵀv &nbsp; s.t. &nbsp; S·v = 0 , &nbsp; lb ≤ v ≤ ub</p>
        <p className="mt-1">Solved by two-phase simplex; flux map shown is the parsimonious (min Σ|v|) optimum.</p>
        <p className="mt-1">Production envelope = max γ-PGA at each fixed growth → the growth↔product Pareto front.</p>
        <p className="mt-1">Precursor coupling: [S] = {cval(FBA_CALIB.fluxToConc)} · v(GDH) mM.</p>
      </MathDisclosure>
    </>
  );

  return (
    <ModuleShell isLightMode={isLightMode} controls={controls}>
      <Panel title="Production Envelope — Growth ↔ γ-PGA Pareto Front" icon={Sigma} isLightMode={isLightMode}>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={envelopeData} margin={{ top: 6, right: 12, left: -12, bottom: 2 }}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="growth" stroke={c.axis} tick={{ fontSize: 9 }} label={{ value: 'growth µ (h⁻¹)', position: 'insideBottom', offset: -2, fontSize: 9, fill: c.axis }} />
            <YAxis stroke={c.axis} tick={{ fontSize: 9 }} label={{ value: 'γ-PGA flux', angle: -90, position: 'insideLeft', fontSize: 9, fill: c.axis }} />
            <Tooltip contentStyle={tooltipStyle(isLightMode)} formatter={(v: number) => [v, 'γ-PGA']} labelFormatter={(l) => `µ = ${l} h⁻¹`} />
            <Line type="monotone" dataKey="pga" stroke="#6366f1" strokeWidth={2.5} dot={false} />
            <ReferenceDot x={+analysis.growth.toFixed(2)} y={+analysis.pga.toFixed(2)} r={6} fill={objective === 'pga' ? '#f59e0b' : '#10b981'} stroke={isLightMode ? '#fff' : '#000'} />
          </LineChart>
        </ResponsiveContainer>
        <p className={`mt-1 text-[10px] flex items-center gap-1.5 ${isLightMode ? 'text-stone-500' : 'text-slate-500'}`}>
          <Beaker className="w-3 h-3" /> Marker = current objective's operating point. Trading growth for product moves along the front.
        </p>
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Panel title="Optimal Flux Distribution (pFBA)" icon={Dna} isLightMode={isLightMode}>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={fluxData} layout="vertical" margin={{ top: 4, right: 12, left: 6, bottom: 0 }}>
              <CartesianGrid stroke={c.grid} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" stroke={c.axis} tick={{ fontSize: 9 }} />
              <YAxis type="category" dataKey="id" stroke={c.axis} tick={{ fontSize: 9 }} width={56} />
              <Tooltip contentStyle={tooltipStyle(isLightMode)} formatter={(v: number) => [`${v} mmol/gDCW/h`, 'flux']} />
              <Bar dataKey="flux" radius={[0, 3, 3, 0]}>
                {fluxData.map((d) => <Cell key={d.id} fill={d.id === 'EX_PGA' ? '#f59e0b' : d.id === 'EX_BIOM' ? '#10b981' : d.id === 'OVF' ? '#ef4444' : (isLightMode ? '#6366f1' : '#818cf8')} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Flux Variability (at optimum)" icon={GitBranch} isLightMode={isLightMode}>
          <div className="space-y-2.5 mt-1">
            {Object.entries(analysis.fva).map(([id, range]) => {
              const lo = Number.isFinite(range.min) ? range.min : 0;
              const hi = Number.isFinite(range.max) ? range.max : 0;
              const span = Math.max(...Object.values(analysis.fva).map((r) => (Number.isFinite(r.max) ? r.max : 0)), 1);
              return (
                <div key={id}>
                  <div className="flex justify-between text-[10px] font-mono mb-0.5">
                    <span className={isLightMode ? 'text-stone-600 font-bold' : 'text-slate-400'}>{id}</span>
                    <span className={isLightMode ? 'text-stone-500' : 'text-slate-500'}>[{lo.toFixed(1)}, {hi.toFixed(1)}]</span>
                  </div>
                  <div className={`h-2 rounded-full relative ${isLightMode ? 'bg-stone-200' : 'bg-slate-800'}`}>
                    <div className="absolute h-2 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500"
                      style={{ left: `${(lo / span) * 100}%`, width: `${Math.max(2, ((hi - lo) / span) * 100)}%` }} />
                  </div>
                </div>
              );
            })}
            <p className={`text-[10px] mt-2 ${isLightMode ? 'text-stone-500' : 'text-slate-500'}`}>Wide bars = flexible reactions; pinpoints = rigid, rate-limiting steps.</p>
          </div>
        </Panel>
      </div>
    </ModuleShell>
  );
}
