'use client';

/**
 * Grain-Size Coverage — how the active prongs bind the UAE dune-sand size distribution.
 * MICP (CaCO₃) only cements a mid-fine sweet spot (~63–125 µm); γ-PGA and alginate close the
 * coarse- and fine-grain gaps it misses. The combined union coverage over the site's log-normal
 * grain-size distribution is the quantitative form of the three-prong "cover all sizes" thesis.
 */

import React, { useMemo } from 'react';
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts';
import { Ruler, ScanLine, TriangleAlert } from 'lucide-react';
import { Panel, StatCard, chartColors, tooltipStyle, Themed } from './_shared';
import GlossaryTerm, { GlossaryText } from '../GlossaryTerm';
import { ModuleActions } from './_shared';
import { grainSizeProfile, PRONG_LABEL, type ProngId } from '../../lib/physics';

interface Props extends Themed {
  prongs: ProngId[];
  /** Realised-yield factors per prong (inter-prong competition / burden) — starved prongs cover less. */
  yieldFactors?: Partial<Record<ProngId, number>>;
}

const PRONG_COLOR: Record<ProngId, string> = { 1: '#f59e0b', 2: '#10b981', 3: '#f43f5e' };

export default function GrainSizeCoveragePanel({ isLightMode, prongs, yieldFactors }: Props) {
  const c = chartColors(isLightMode);
  const profile = useMemo(() => grainSizeProfile(prongs, { yieldFactors }), [prongs, yieldFactors]);

  const data = useMemo(() => profile.bands.map((b) => {
    const row: Record<string, number> = {
      d: +b.diameter.toFixed(1),
      combined: +(b.combined * 100).toFixed(1),
      // scale the PSD to the 0–100 axis for a readable silhouette of "where the sand actually is"
      psd: +(b.massFraction * 100 * profile.bands.length * 0.6).toFixed(2),
    };
    prongs.forEach((p) => { row[`p${p}`] = +((b.perProng[p] ?? 0) * 100).toFixed(1); });
    return row;
  }), [profile, prongs]);

  const multi = prongs.length >= 2;

  return (
    <div className={`p-6 rounded-2xl border space-y-6 transition-colors duration-300 ${
      isLightMode ? 'bg-gradient-to-br from-white to-teal-50/40 border-teal-200 shadow-lg' : 'bg-gradient-to-br from-[#06080d] to-teal-950/20 border-slate-800 shadow-2xl'
    }`}>
      <div className="flex items-center gap-3 border-b pb-4 border-slate-200/60 dark:border-slate-800">
        <div className={`p-2.5 rounded-xl ${isLightMode ? 'bg-teal-50 text-teal-600' : 'bg-teal-950/40 text-teal-400'}`}>
          <Ruler className="w-5 h-5" />
        </div>
        <div>
          <h3 className={`text-sm font-black uppercase tracking-wider ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Grain-Size Coverage</h3>
          <p className={`text-[11px] ${isLightMode ? 'text-stone-500' : 'text-slate-400'}`}>
            <GlossaryText max={4}>Which grains each binder actually holds across the UAE dune-sand size distribution.</GlossaryText>
          </p>
        </div>
      </div>

      <ModuleActions moduleId="grainsize" isLightMode={isLightMode} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard isLightMode={isLightMode} label="Bound sand mass" value={(profile.boundMassFraction * 100).toFixed(0)} unit="%" emphasize accent={isLightMode ? 'text-teal-700' : 'text-teal-400'} sub="of site PSD held" />
        <StatCard isLightMode={isLightMode} label="MICP sweet-spot" value={(profile.micpEfficiencyMean * 100).toFixed(0)} unit="%" accent={isLightMode ? 'text-emerald-700' : 'text-emerald-400'} sub="mean CaCO₃ efficiency" />
        <StatCard isLightMode={isLightMode} label="Weakest band" value={`${profile.weakestDiameter.toFixed(0)}`} unit="µm" accent={isLightMode ? 'text-amber-700' : 'text-amber-400'} sub={`${(profile.weakestCoverage * 100).toFixed(0)}% coverage`} />
        <StatCard isLightMode={isLightMode} label="Site D₅₀" value={profile.d50.toFixed(0)} unit="µm" accent={isLightMode ? 'text-slate-700' : 'text-slate-300'} sub="median grain size" />
      </div>

      <Panel title={<><GlossaryTerm term="grain-size-distribution">Coverage</GlossaryTerm> vs grain diameter</>} icon={ScanLine} isLightMode={isLightMode}>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 16 }}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis
              dataKey="d" type="number" scale="log" domain={[20, 600]}
              ticks={[20, 40, 63, 100, 125, 200, 300, 500]}
              stroke={c.axis} tick={{ fontSize: 9 }}
              label={{ value: 'grain diameter (µm)', position: 'insideBottom', offset: -8, fontSize: 10, fill: c.axis }}
            />
            <YAxis domain={[0, 100]} stroke={c.axis} tick={{ fontSize: 9 }} unit="%" width={38} />
            <Tooltip contentStyle={tooltipStyle(isLightMode)} formatter={(v: number, n: string) => [`${v}%`, n]} labelFormatter={(d) => `${d} µm`} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {/* Where the site's sand actually is (PSD silhouette). */}
            <Area type="monotone" dataKey="psd" name="site sand (PSD)" stroke="none" fill={isLightMode ? '#cbd5e1' : '#334155'} fillOpacity={0.35} legendType="none" />
            {/* Combined union coverage. */}
            <Area type="monotone" dataKey="combined" name="Combined" stroke="#14b8a6" strokeWidth={2.5} fill="#14b8a6" fillOpacity={0.12} />
            {prongs.map((p) => (
              <Line key={p} type="monotone" dataKey={`p${p}`} name={PRONG_LABEL[p]} stroke={PRONG_COLOR[p]} strokeWidth={1.6} dot={false} strokeDasharray="4 3" />
            ))}
            <ReferenceLine x={profile.d50} stroke={c.axis} strokeDasharray="2 2" label={{ value: 'D₅₀', fontSize: 9, fill: c.axis, position: 'top' }} />
          </ComposedChart>
        </ResponsiveContainer>
        <p className={`mt-2 text-[10px] leading-relaxed ${isLightMode ? 'text-stone-500' : 'text-slate-500'}`}>
          Dashed lines are each binder's per-grain effectiveness; the solid band is the union
          (a grain is held if <b>any</b> mechanism binds it: 1 − Π(1 − eₚ)). The grey silhouette is
          where the deployment sand's mass actually sits (D₅₀ ≈ {profile.d50.toFixed(0)} µm).
        </p>
      </Panel>

      <div className={`p-3 rounded-xl border text-[11px] flex items-start gap-2 ${
        multi
          ? (isLightMode ? 'bg-teal-50 text-teal-800 border-teal-200' : 'bg-teal-950/20 text-teal-300 border-teal-900/40')
          : (isLightMode ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-amber-950/20 text-amber-300 border-amber-900/40')
      }`}>
        <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          {multi ? (
            <>The prongs are grain-size complementary: MICP (CaCO₃) peaks at 63–125 µm, while γ-PGA and
            alginate close the coarse and fine gaps it misses — together holding
            <b> {(profile.boundMassFraction * 100).toFixed(0)}%</b> of the sand mass.</>
          ) : (
            <>A single binder leaves a grain-size gap — this selection's weakest band is at
            <b> {profile.weakestDiameter.toFixed(0)} µm</b> ({(profile.weakestCoverage * 100).toFixed(0)}% held).
            Adding another prong that covers that size raises the bound mass fraction.</>
          )}
        </span>
      </div>
    </div>
  );
}
