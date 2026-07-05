'use client';

/**
 * Flux Balance Analysis. Solves a genuine LP (max cᵀv s.t. S·v=0, lb≤v≤ub) on a mass-balanced
 * core network and surfaces the analyses that make FBA a decision tool: the production envelope
 * (growth↔product Pareto front), parsimonious flux map, flux variability, and in-silico knockouts.
 *
 * Prong-aware: with Prong 1 the product is γ-PGA (feeds the kinetics ODE); with Prong 2 the
 * product is secreted carbonic anhydrase (feeds the CaCO₃ display). Selecting both offers either.
 */

import React, { useMemo, useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceDot, Cell,
} from 'recharts';
import { Workflow, GitBranch, Sigma, Beaker, Dna } from 'lucide-react';
import GlossaryTerm from '../../GlossaryTerm';
import {
  buildCoreNetwork, OBJ_GROWTH, OBJ_PGA, OBJ_CA, KNOCKOUTS,
  solveFBA, parsimoniousFBA, productionEnvelope, fluxVariability, fbaPrecursorToConc,
  FBA_CALIB, cval,
} from '../../../lib/physics';
import type { ProngId } from '../../../lib/prongs';
import { ModuleShell, Panel, Slider, StatCard, ModuleActions, chartColors, tooltipStyle, Themed } from '../_shared';
import { GlossaryText } from '../../GlossaryTerm';

interface Props extends Themed {
  /** Bacterial prongs present (subset of {1,2}); decides the FBA objective. */
  prongs?: ProngId[];
  onUpdatePrecursorFlux?: (concMillimolar: number) => void;
}

type Obj = 'growth' | 'pga' | 'ca';

export default function FbaOptimizationModule({ isLightMode, prongs = [1], onUpdatePrecursorFlux }: Props) {
  const c = chartColors(isLightMode);
  const has1 = prongs.includes(1);
  const has2 = prongs.includes(2);

  const [glucoseUb, setGlucoseUb] = useState(cval(FBA_CALIB.vGlcMax));
  const [o2Ub, setO2Ub] = useState(cval(FBA_CALIB.vO2Max));
  const [objective, setObjective] = useState<Obj>(has1 ? 'pga' : 'ca');
  const [knockouts, setKnockouts] = useState<Set<string>>(new Set());

  // Which flux ids to plot — drop the pathway that isn't active.
  const fluxDisplay = useMemo(() => {
    const base = ['EX_GLC', 'GLY', 'PYK', 'PDH', 'TCA', 'GDH', 'BIO', 'RESP', 'OVF', 'EX_BIOM'];
    if (has1) base.splice(7, 0, 'PGS', 'EX_PGA');
    if (has2) base.splice(has1 ? 9 : 7, 0, 'CAS', 'EX_CA');
    return base;
  }, [has1, has2]);

  // The product axis for the envelope / operating point.
  const productObj = objective === 'ca' ? OBJ_CA : objective === 'pga' ? OBJ_PGA : (has1 ? OBJ_PGA : OBJ_CA);
  const productLabel = productObj === OBJ_PGA ? 'γ-PGA' : 'Carbonic Anhydrase';

  const analysis = useMemo(() => {
    const ko = [...knockouts];
    const { network } = buildCoreNetwork({ glucoseUb, o2Ub, knockouts: ko });
    const objId = objective === 'growth' ? OBJ_GROWTH : productObj;
    const sol = parsimoniousFBA(network, objId);
    const growthMax = solveFBA(network, OBJ_GROWTH).objectiveValue;
    const pgaMax = has1 ? solveFBA(network, OBJ_PGA).objectiveValue : 0;
    const caMax = has2 ? solveFBA(network, OBJ_CA).objectiveValue : 0;
    const envelope = productionEnvelope(network, OBJ_GROWTH, productObj, 12);
    const fva = fluxVariability(network, objId, 0.999, ['GLY', 'TCA', 'GDH', has1 ? 'PGS' : 'CAS', 'OVF']);
    return {
      sol, growthMax, pgaMax, caMax, envelope, fva,
      growth: sol.fluxes[OBJ_GROWTH] ?? 0,
      product: sol.fluxes[productObj] ?? 0,
      acetate: sol.fluxes['EX_AC'] ?? 0,
      precursorFlux: sol.fluxes['GDH'] ?? 0,
    };
  }, [glucoseUb, o2Ub, objective, knockouts, productObj, has1, has2]);

  // FBA → ODE coupling only matters for γ-PGA (Prong 1).
  useEffect(() => {
    if (has1) onUpdatePrecursorFlux?.(fbaPrecursorToConc(analysis.precursorFlux));
  }, [analysis.precursorFlux, onUpdatePrecursorFlux, has1]);

  const envelopeData = useMemo(() => analysis.envelope.map((p) => ({ growth: +p.growth.toFixed(2), product: +p.productMax.toFixed(2) })), [analysis.envelope]);
  const fluxData = useMemo(() => fluxDisplay.map((id) => ({ id, flux: +(analysis.sol.fluxes[id] ?? 0).toFixed(2) })), [analysis.sol, fluxDisplay]);

  const toggleKO = (id: string) => setKnockouts((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const objButtons: [Obj, string][] = [['growth', 'Max Growth']];
  if (has1) objButtons.push(['pga', 'Max γ-PGA']);
  if (has2) objButtons.push(['ca', 'Max CA']);

  const controls = (
    <>
      <Panel title={<><GlossaryTerm term="constraint-based">Constraint</GlossaryTerm> Bounds &amp; <GlossaryTerm term="objective-function">Objective</GlossaryTerm></>} icon={Workflow} isLightMode={isLightMode}>
        <div className="space-y-4">
          <Slider isLightMode={isLightMode} accent="accent-amber-500" label="Glucose uptake bound" value={glucoseUb} min={2} max={25} step={0.5} unit="mmol/gDCW/h"
            onChange={setGlucoseUb} hint="Upper bound on EX_glc — measured in the bioreactor." />
          <Slider isLightMode={isLightMode} accent="accent-cyan-500" label="O₂ uptake bound" value={o2Ub} min={0} max={40} step={1} unit="mmol/gDCW/h"
            onChange={setO2Ub} hint="Aerobiosis ceiling; low O₂ forces fermentation." />
          <div>
            <span className={`text-[11px] font-semibold block mb-1.5 ${isLightMode ? 'text-stone-700' : 'text-slate-300'}`}>Objective cᵀv</span>
            <div className={`flex gap-1 p-1 rounded-lg border ${isLightMode ? 'bg-stone-50 border-stone-200' : 'bg-slate-900 border-slate-800'}`}>
              {objButtons.map(([k, lbl]) => (
                <button key={k} onClick={() => setObjective(k)}
                  className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition ${objective === k ? (isLightMode ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white') : (isLightMode ? 'text-stone-600' : 'text-slate-400')}`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <Panel title={<>In-Silico <GlossaryTerm term="gene-knockout">Gene Knockouts</GlossaryTerm></>} icon={GitBranch} isLightMode={isLightMode}>
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
        <p className={`mt-2 text-[10px] ${isLightMode ? 'text-stone-500' : 'text-slate-500'}`}><GlossaryText>The LP reroutes carbon (lb=ub=0); watch the production envelope and acetate overflow respond.</GlossaryText></p>
      </Panel>

      <div className="grid grid-cols-2 gap-3">
        <StatCard isLightMode={isLightMode} label="Max growth µ" value={analysis.growthMax.toFixed(2)} unit="h⁻¹" accent={isLightMode ? 'text-emerald-700' : 'text-emerald-400'} />
        {has1 && <StatCard isLightMode={isLightMode} label="Max γ-PGA flux" value={analysis.pgaMax.toFixed(2)} unit="mmol/gDCW/h" emphasize accent={isLightMode ? 'text-amber-700' : 'text-amber-400'} />}
        {has2 && <StatCard isLightMode={isLightMode} label="Max CA flux" value={analysis.caMax.toFixed(2)} unit="mmol/gDCW/h" emphasize accent={isLightMode ? 'text-emerald-700' : 'text-emerald-400'} />}
        {has1 && <StatCard isLightMode={isLightMode} label="Precursor → ODE [S]" value={fbaPrecursorToConc(analysis.precursorFlux).toFixed(2)} unit="mM" accent={isLightMode ? 'text-violet-700' : 'text-violet-400'} sub="couples to kinetic model" />}
        <StatCard isLightMode={isLightMode} label={<>Acetate <GlossaryTerm term="acetate-overflow">overflow</GlossaryTerm></>} value={analysis.acetate.toFixed(2)} unit="mmol/gDCW/h" accent={isLightMode ? 'text-stone-700' : 'text-slate-300'} sub="carbon wasted" />
      </div>

      <ModuleActions moduleId="fba" isLightMode={isLightMode} />
    </>
  );

  return (
    <ModuleShell isLightMode={isLightMode} controls={controls}>
      <Panel title={<><GlossaryTerm term="production-envelope">Production Envelope</GlossaryTerm> — Growth ↔ {productLabel} <GlossaryTerm term="production-envelope">Pareto Front</GlossaryTerm></>} icon={Sigma} isLightMode={isLightMode}>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={envelopeData} margin={{ top: 6, right: 12, left: -12, bottom: 2 }}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="growth" stroke={c.axis} tick={{ fontSize: 9 }} label={{ value: 'growth µ (h⁻¹)', position: 'insideBottom', offset: -2, fontSize: 9, fill: c.axis }} />
            <YAxis stroke={c.axis} tick={{ fontSize: 9 }} label={{ value: `${productLabel} flux`, angle: -90, position: 'insideLeft', fontSize: 9, fill: c.axis }} />
            <Tooltip contentStyle={tooltipStyle(isLightMode)} formatter={(v: number) => [v, productLabel]} labelFormatter={(l) => `µ = ${l} h⁻¹`} />
            <Line type="monotone" dataKey="product" stroke="#6366f1" strokeWidth={2.5} dot={false} />
            <ReferenceDot x={+analysis.growth.toFixed(2)} y={+analysis.product.toFixed(2)} r={6} fill={objective === 'growth' ? '#10b981' : '#f59e0b'} stroke={isLightMode ? '#fff' : '#000'} />
          </LineChart>
        </ResponsiveContainer>
        <p className={`mt-1 text-[10px] flex items-center gap-1.5 ${isLightMode ? 'text-stone-500' : 'text-slate-500'}`}>
          <Beaker className="w-3 h-3" /> Marker = current objective's operating point. Trading growth for product moves along the front.
        </p>
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Panel title={<>Optimal <GlossaryTerm term="flux">Flux</GlossaryTerm> Distribution (<GlossaryTerm term="pfba">pFBA</GlossaryTerm>)</>} icon={Dna} isLightMode={isLightMode}>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={fluxData} layout="vertical" margin={{ top: 4, right: 12, left: 6, bottom: 0 }}>
              <CartesianGrid stroke={c.grid} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" stroke={c.axis} tick={{ fontSize: 9 }} />
              <YAxis type="category" dataKey="id" stroke={c.axis} tick={{ fontSize: 9 }} width={56} />
              <Tooltip contentStyle={tooltipStyle(isLightMode)} formatter={(v: number) => [`${v} mmol/gDCW/h`, 'flux']} />
              <Bar dataKey="flux" radius={[0, 3, 3, 0]}>
                {fluxData.map((d) => <Cell key={d.id} fill={d.id === 'EX_PGA' ? '#f59e0b' : d.id === 'EX_CA' ? '#34d399' : d.id === 'EX_BIOM' ? '#10b981' : d.id === 'OVF' ? '#ef4444' : (isLightMode ? '#6366f1' : '#818cf8')} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title={<><GlossaryTerm term="fva">Flux Variability</GlossaryTerm> (at optimum)</>} icon={GitBranch} isLightMode={isLightMode}>
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
