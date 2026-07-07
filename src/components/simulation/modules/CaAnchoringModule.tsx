'use client';

/**
 * Prong 2 — Carbonic Anhydrase surface-display strategy comparison.
 * Compares the two anchoring routes the wet lab is deciding between — Sortase-mediated
 * ligation vs LytE-CWBD binding motif — across the three failure modes they flagged:
 * signal-peptide export, CA dimerization, and the anchoring step itself.
 *
 * Display efficiency = export × dimerization × anchoring (multiplicative — every step must work).
 * This is a decision-support comparison; the sub-efficiencies are wet-lab measurable
 * (see WETLAB_TODO.md §4). Overall display ⇒ realized CA activity for the CaCO₃ module.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
import { FlaskConical, Anchor, Link2, CheckCircle2 } from 'lucide-react';
import GlossaryTerm, { GlossaryText } from '../../GlossaryTerm';
import { ModuleShell, Panel, Slider, StatCard, ModuleActions, chartColors, tooltipStyle, Themed } from '../_shared';

interface Props extends Themed {
  onUpdate?: (out: { displayEfficiency: number }) => void;
}

export default function CaAnchoringModule({ isLightMode, onUpdate }: Props) {
  const c = chartColors(isLightMode);
  // Shared bacterial physiology (both routes use the Sec pathway and need CA dimers).
  const [exportEff, setExportEff] = useState(0.7);   // signal-peptide export success
  const [dimerEff, setDimerEff] = useState(0.65);    // CA dimerization fraction
  // Route-specific anchoring step.
  const [sortaseEff, setSortaseEff] = useState(0.6); // sortase ligation efficiency
  const [motifEff, setMotifEff] = useState(0.5);     // LytE-CWBD cell-wall binding

  const sortaseDisplay = exportEff * dimerEff * sortaseEff;
  const motifDisplay = exportEff * dimerEff * motifEff;
  const best = Math.max(sortaseDisplay, motifDisplay);
  const recommend = sortaseDisplay >= motifDisplay ? 'Sortase-mediated ligation' : 'LytE-CWBD binding motif';

  useEffect(() => { onUpdate?.({ displayEfficiency: best }); }, [best, onUpdate]);

  const data = useMemo(() => ([
    { stage: 'Export', Sortase: +(exportEff * 100).toFixed(0), Motif: +(exportEff * 100).toFixed(0) },
    { stage: 'Dimerize', Sortase: +(dimerEff * 100).toFixed(0), Motif: +(dimerEff * 100).toFixed(0) },
    { stage: 'Anchor', Sortase: +(sortaseEff * 100).toFixed(0), Motif: +(motifEff * 100).toFixed(0) },
    { stage: 'Overall', Sortase: +(sortaseDisplay * 100).toFixed(0), Motif: +(motifDisplay * 100).toFixed(0) },
  ]), [exportEff, dimerEff, sortaseEff, motifEff, sortaseDisplay, motifDisplay]);

  const controls = (
    <>
      <Panel title="Anchoring & Display Efficiencies" icon={FlaskConical} isLightMode={isLightMode}>
        <div className="space-y-4">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${isLightMode ? 'text-stone-500' : 'text-slate-500'}`}>Shared (Sec pathway physiology)</span>
          <Slider isLightMode={isLightMode} accent="accent-cyan-500" label="Signal-peptide export" value={exportEff} min={0} max={1} step={0.02} format={(v) => `${(v * 100).toFixed(0)}%`} onChange={setExportEff} hint="Periplasmic-fractionation assay (does CA leave the membrane?)." />
          <Slider isLightMode={isLightMode} accent="accent-violet-500" label="CA dimerization" value={dimerEff} min={0} max={1} step={0.02} format={(v) => `${(v * 100).toFixed(0)}%`} onChange={setDimerEff} hint="pNPA esterase assay — active CA requires dimers." />
          <div className={`pt-2 border-t ${isLightMode ? 'border-amber-900/10' : 'border-slate-800'}`} />
          <span className={`text-[10px] font-bold uppercase tracking-wider ${isLightMode ? 'text-stone-500' : 'text-slate-500'}`}>Route-specific anchoring</span>
          <Slider isLightMode={isLightMode} accent="accent-emerald-500" label="Sortase ligation" value={sortaseEff} min={0} max={1} step={0.02} format={(v) => `${(v * 100).toFixed(0)}%`} onChange={setSortaseEff} hint="GFP-on-PDL/PLL bead retention (YhcS transfer to amine)." />
          <Slider isLightMode={isLightMode} accent="accent-amber-500" label="LytE-CWBD binding" value={motifEff} min={0} max={1} step={0.02} format={(v) => `${(v * 100).toFixed(0)}%`} onChange={setMotifEff} hint="Cell-wall binding domain affinity / display density." />
        </div>
      </Panel>

      <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
        isLightMode ? 'bg-emerald-50/60 border-emerald-200' : 'bg-emerald-950/15 border-emerald-900/40'
      }`}>
        <CheckCircle2 className={`w-7 h-7 shrink-0 ${isLightMode ? 'text-emerald-600' : 'text-emerald-400'}`} />
        <div>
          <span className={`block text-[9px] font-bold uppercase tracking-wider ${isLightMode ? 'text-stone-500' : 'text-slate-500'}`}>Recommended route</span>
          <span className={`font-black text-sm ${isLightMode ? 'text-emerald-800' : 'text-emerald-300'}`}>{recommend}</span>
          <span className={`block text-[10px] font-mono mt-0.5 ${isLightMode ? 'text-stone-600' : 'text-slate-400'}`}>{(best * 100).toFixed(1)}% functional CA displayed</span>
        </div>
      </div>

      <ModuleActions moduleId="ca-anchoring" isLightMode={isLightMode} />
    </>
  );

  return (
    <ModuleShell isLightMode={isLightMode} controls={controls}>
      <Panel title={<>Route Comparison — <GlossaryTerm term="sortase">Sortase</GlossaryTerm> vs <GlossaryTerm term="cwbd-binding">Binding Motif</GlossaryTerm></>} icon={Anchor} isLightMode={isLightMode}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="stage" stroke={c.axis} tick={{ fontSize: 10 }} />
            <YAxis stroke={c.axis} tick={{ fontSize: 9 }} unit="%" domain={[0, 100]} />
            <Tooltip contentStyle={tooltipStyle(isLightMode)} formatter={(v: number) => [`${v}%`, '']} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="Sortase" radius={[4, 4, 0, 0]} name="Sortase ligation">
              {data.map((d, i) => <Cell key={i} fill={d.stage === 'Overall' ? '#059669' : '#34d399'} />)}
            </Bar>
            <Bar dataKey="Motif" radius={[4, 4, 0, 0]} name="LytE-CWBD motif">
              {data.map((d, i) => <Cell key={i} fill={d.stage === 'Overall' ? '#d97706' : '#fbbf24'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <div className="grid grid-cols-2 gap-3">
        <StatCard isLightMode={isLightMode} label="Sortase overall" value={(sortaseDisplay * 100).toFixed(1)} unit="%" accent={isLightMode ? 'text-emerald-700' : 'text-emerald-400'} emphasize={sortaseDisplay >= motifDisplay} />
        <StatCard isLightMode={isLightMode} label="Binding motif overall" value={(motifDisplay * 100).toFixed(1)} unit="%" accent={isLightMode ? 'text-amber-700' : 'text-amber-400'} emphasize={motifDisplay > sortaseDisplay} />
      </div>
      <p className={`text-[10px] flex items-start gap-1.5 ${isLightMode ? 'text-stone-500' : 'text-slate-500'}`}>
        <Link2 className="w-3.5 h-3.5 text-cyan-500 mt-0.5 shrink-0" />
        <GlossaryText>Display efficiency is the product of three independent steps, export times dimerization times anchoring, so the chain is only as strong as its weakest link and can never exceed any single stage. The winning route sets the realized carbonic anhydrase activity feeding the precipitation model; every stage is a separate wet-lab assay.</GlossaryText>
      </p>
    </ModuleShell>
  );
}
