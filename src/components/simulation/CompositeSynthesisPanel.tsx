'use client';

/**
 * Composite Strength Synthesis (shown only for ≥2 prongs).
 * Two outputs: (1) composite cohesion via rule-of-mixtures + pairwise synergy, and
 * (2) a failure-mode robustness radar showing how the combination covers each prong's
 * weaknesses — the central thesis of the three-pronged design.
 */

import React, { useMemo } from 'react';
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
} from 'recharts';
import { Combine, ShieldAlert, TrendingUp, GitCompareArrows, ArrowDownRight, ArrowUpRight, Activity } from 'lucide-react';
import { ShowMathToggle } from './_shared';
import GlossaryTerm from '../GlossaryTerm';
import {
  compositeCohesion, robustnessMatrix, limitingScenario, PRONG_LABEL, SCENARIOS,
  type ProngContribution, type ProngId, type InteractionEffect,
} from '../../lib/physics';
import { Panel, StatCard, chartColors, tooltipStyle, Themed } from './_shared';

interface Props extends Themed {
  prongs: ProngId[];
  contributions: ProngContribution[];
  interactions?: InteractionEffect[];
}

const PRONG_COLOR: Record<ProngId, string> = { 1: '#f59e0b', 2: '#10b981', 3: '#f43f5e' };
const toMilli = (n: number) => n * 1000; // N/m → mN/m

export default function CompositeSynthesisPanel({ isLightMode, prongs, contributions, interactions = [] }: Props) {
  const c = chartColors(isLightMode);
  const comp = useMemo(() => compositeCohesion(contributions), [contributions]);
  const robustness = useMemo(() => robustnessMatrix(prongs), [prongs]);
  const limiting = useMemo(() => limitingScenario(prongs), [prongs]);

  const radarData = useMemo(() => robustness.map((row) => {
    const entry: Record<string, number | string> = { scenario: row.scenario };
    prongs.forEach((p) => { entry[PRONG_LABEL[p]] = +(row.perProng[p] * 100).toFixed(0); });
    entry['Combined'] = +(row.combined * 100).toFixed(0);
    return entry;
  }), [robustness, prongs]);

  const cohesionBars = useMemo(() => contributions.map((ct) => ({
    name: PRONG_LABEL[ct.prong], value: +toMilli(ct.cohesion).toFixed(2), prong: ct.prong,
  })), [contributions]);

  const synergyPct = (comp.synergyRatio - 1) * 100;

  return (
    <div className={`p-6 rounded-2xl border space-y-6 transition-colors duration-300 ${
      isLightMode ? 'bg-gradient-to-br from-white to-indigo-50/40 border-indigo-200 shadow-lg' : 'bg-gradient-to-br from-[#06080d] to-indigo-950/20 border-slate-800 shadow-2xl'
    }`}>
      <div className="flex items-center gap-3 border-b pb-4 border-slate-200/60 dark:border-slate-800">
        <div className={`p-2.5 rounded-xl ${isLightMode ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-950/40 text-indigo-400'}`}>
          <Combine className="w-5 h-5" />
        </div>
        <div>
          <h3 className={`text-sm font-black uppercase tracking-wider ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Composite Strength Synthesis</h3>
          <p className={`text-[11px] ${isLightMode ? 'text-stone-500' : 'text-slate-400'}`}>How {prongs.map((p) => PRONG_LABEL[p]).join(' + ')} combine — mechanically and as redundant failsafes.</p>
        </div>
      </div>

      <ShowMathToggle moduleId="composite" isLightMode={isLightMode} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard isLightMode={isLightMode} label="Additive cohesion" value={toMilli(comp.additiveCohesion).toFixed(1)} unit="mN/m" accent={isLightMode ? 'text-slate-700' : 'text-slate-300'} sub="Σ individual" />
        <StatCard isLightMode={isLightMode} label="Interaction term" value={`${comp.interactionCohesion >= 0 ? '+' : ''}${toMilli(comp.interactionCohesion).toFixed(1)}`} unit="mN/m" accent={comp.interactionCohesion >= 0 ? (isLightMode ? 'text-emerald-700' : 'text-emerald-400') : (isLightMode ? 'text-rose-600' : 'text-rose-400')} sub={comp.interactionCohesion >= 0 ? 'synergistic' : 'competitive'} />
        <StatCard isLightMode={isLightMode} label="Composite cohesion" value={toMilli(comp.totalCohesion).toFixed(1)} unit="mN/m" emphasize accent={isLightMode ? 'text-indigo-700' : 'text-indigo-400'} sub="→ feeds wind threshold" />
        <StatCard isLightMode={isLightMode} label={<GlossaryTerm term="synergy">Synergy</GlossaryTerm>} value={`${synergyPct >= 0 ? '+' : ''}${synergyPct.toFixed(0)}`} unit="%" accent={synergyPct >= 0 ? (isLightMode ? 'text-emerald-700' : 'text-emerald-400') : (isLightMode ? 'text-rose-600' : 'text-rose-400')} sub="vs simple sum" />
      </div>

      <Panel title={<><GlossaryTerm term="prong-interaction">Inter-Prong Interactions</GlossaryTerm> — what happens when they share a chassis & soil</>} icon={GitCompareArrows} isLightMode={isLightMode}>
        {interactions.length === 0 ? (
          <p className={`text-[11px] ${isLightMode ? 'text-stone-500' : 'text-slate-500'}`}>No cross-prong interactions for this combination.</p>
        ) : (
          <div className="space-y-2.5">
            {interactions.map((e, i) => {
              const neg = e.percent < 0;
              const Icon = e.kind === 'synergy' ? ArrowUpRight : e.kind === 'burden' ? Activity : ArrowDownRight;
              const tone = e.kind === 'synergy'
                ? (isLightMode ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-emerald-300 bg-emerald-950/20 border-emerald-900/40')
                : e.kind === 'burden'
                ? (isLightMode ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-amber-300 bg-amber-950/20 border-amber-900/40')
                : (isLightMode ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-rose-300 bg-rose-950/20 border-rose-900/40');
              return (
                <div key={i} className={`p-3 rounded-xl border ${tone}`}>
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold">
                      <Icon className="w-3.5 h-3.5" />
                      {e.prongs.map((p) => PRONG_LABEL[p]).join(' ↔ ')} · {e.mechanism}
                    </span>
                    <span className="font-mono font-black text-xs shrink-0">{neg ? '' : '+'}{e.percent.toFixed(0)}%</span>
                  </div>
                  <p className={`text-[10px] leading-relaxed ${isLightMode ? 'text-stone-600' : 'text-slate-400'}`}>{e.description}</p>
                </div>
              );
            })}
            <p className={`text-[10px] leading-relaxed pt-1 ${isLightMode ? 'text-stone-500' : 'text-slate-500'}`}>
              Competition (Ca²⁺) and metabolic burden are applied to each prong's cohesion <b>before</b> the synergy term above, so the composite total already reflects them.
            </p>
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title={<GlossaryTerm term="failure-mode">Failure-Mode Robustness</GlossaryTerm>} icon={ShieldAlert} isLightMode={isLightMode}>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData} outerRadius="72%">
              <PolarGrid stroke={c.grid} />
              <PolarAngleAxis dataKey="scenario" tick={{ fontSize: 9, fill: c.axis }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 8, fill: c.axis }} angle={90} />
              {prongs.map((p) => (
                <Radar key={p} name={PRONG_LABEL[p]} dataKey={PRONG_LABEL[p]} stroke={PRONG_COLOR[p]} fill={PRONG_COLOR[p]} fillOpacity={0.08} strokeWidth={1.5} />
              ))}
              <Radar name="Combined" dataKey="Combined" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} strokeWidth={2.5} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle(isLightMode)} formatter={(v: number) => [`${v}%`, '']} />
            </RadarChart>
          </ResponsiveContainer>
          <div className={`mt-2 p-2.5 rounded-lg text-[11px] flex items-center gap-2 ${isLightMode ? 'bg-amber-50 text-amber-800' : 'bg-amber-950/20 text-amber-300'}`}>
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Limiting scenario: <b>{limiting.scenario}</b> at {(limiting.resilience * 100).toFixed(0)}% combined resilience.</span>
          </div>
        </Panel>

        <Panel title="Cohesion Contribution by Prong" icon={TrendingUp} isLightMode={isLightMode}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cohesionBars} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
              <CartesianGrid stroke={c.grid} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" stroke={c.axis} tick={{ fontSize: 9 }} unit=" mN/m" />
              <YAxis type="category" dataKey="name" stroke={c.axis} tick={{ fontSize: 10 }} width={64} />
              <Tooltip contentStyle={tooltipStyle(isLightMode)} formatter={(v: number) => [`${v} mN/m`, 'cohesion']} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {cohesionBars.map((d, i) => <Cell key={i} fill={PRONG_COLOR[d.prong]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className={`mt-2 text-[10px] leading-relaxed ${isLightMode ? 'text-stone-500' : 'text-slate-500'}`}>
            Each binder reduces to an interparticle cohesion (γ-PGA &amp; alginate via shear modulus G; CaCO₃ via UCS).
            The combined radar uses 1 − Π(1 − rᵢ): the crust survives a scenario if <b>any</b> active mechanism survives it.
          </p>
        </Panel>
      </div>
    </div>
  );
}
