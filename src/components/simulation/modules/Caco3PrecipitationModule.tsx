'use client';

/**
 * Prong 2 — CaCO₃ Precipitation → UCS → CO₂ capture (Carbonic Anhydrase, non-ureolytic).
 * Geochemical model per §6 (Lassin et al. 2018). Graph-first; dense math behind a disclosure.
 */

import React, { useMemo, useEffect, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ReferenceDot, Legend,
} from 'recharts';
import { Atom, Layers, Wind as WindIcon, Leaf } from 'lucide-react';
import type { Caco3Params } from '../../../types';
import {
  carbonateSpeciation, simulatePrecipitation, caActivityFraction, calciteToUCS, saturationIndex,
  CACO3_CALIB, cval,
} from '../../../lib/physics';
import { ModuleShell, Panel, Slider, StatCard, MathDisclosure, chartColors, tooltipStyle, Themed } from '../_shared';

interface Props extends Themed {
  onUpdate?: (out: { ucs: number; calcitePct: number; co2: number }) => void;
}

const DEFAULTS: Caco3Params = { calcium: 25, dicMax: 30, pH: 9.5, caEnhancement: 0.6 };

export default function Caco3PrecipitationModule({ isLightMode, onUpdate }: Props) {
  const [p, setP] = useState<Caco3Params>(DEFAULTS);
  const c = chartColors(isLightMode);

  const caActivity = useMemo(() => caActivityFraction(p.caEnhancement), [p.caEnhancement]);

  const result = useMemo(() => simulatePrecipitation({
    calciumMillimolar: p.calcium, dicMaxMillimolar: p.dicMax, pH: p.pH, caActivity, hours: 48, dt: 0.5,
  }), [p.calcium, p.dicMax, p.pH, caActivity]);

  // Bubble up binder outputs for the composite + aeolian modules.
  useEffect(() => {
    onUpdate?.({ ucs: result.ucsKpa, calcitePct: result.calciteWtPercent, co2: result.co2SequesteredGPerL });
  }, [result.ucsKpa, result.calciteWtPercent, result.co2SequesteredGPerL, onUpdate]);

  const speciation = useMemo(() => {
    const rows = [];
    for (let pH = 6; pH <= 11.01; pH += 0.2) {
      const s = carbonateSpeciation(pH);
      rows.push({ pH: +pH.toFixed(1), CO2: +(s.alpha0 * 100).toFixed(1), HCO3: +(s.alpha1 * 100).toFixed(1), CO3: +(s.alpha2 * 100).toFixed(1) });
    }
    return rows;
  }, []);

  const kinetics = useMemo(() => result.series
    .filter((_, i) => i % 2 === 0)
    .map((s) => ({ t: +s.time.toFixed(1), Ca: +(s.caMolar * 1000).toFixed(2), ACC: +(s.accMolar * 1000).toFixed(2), Calcite: +(s.calciteMolar * 1000).toFixed(2) })),
  [result.series]);

  const ucsCurve = useMemo(() => {
    const top = Math.max(15, result.calciteWtPercent * 1.6);
    const rows = [];
    for (let pct = 0; pct <= top; pct += top / 40) rows.push({ pct: +pct.toFixed(2), ucs: +calciteToUCS(pct).toFixed(1) });
    return rows;
  }, [result.calciteWtPercent]);

  const finalSI = useMemo(() => {
    const last = result.series[result.series.length - 1];
    const si = saturationIndex(last.caMolar, last.co3Molar, cval(CACO3_CALIB.pKspCalcite));
    return Number.isFinite(si) ? si : -99;
  }, [result.series]);

  const controls = (
    <>
      <Panel title="Geochemical Reactor Controls" icon={Atom} isLightMode={isLightMode}>
        <div className="space-y-4">
          <Slider isLightMode={isLightMode} accent="accent-emerald-500" label={<>Dissolved Ca²⁺</>} value={p.calcium} min={1} max={60} step={1} unit="mM"
            onChange={(v) => setP((s) => ({ ...s, calcium: v }))} hint="Calcium source feeding the precipitation reaction." />
          <Slider isLightMode={isLightMode} accent="accent-cyan-500" label={<>Max DIC capacity</>} value={p.dicMax} min={2} max={60} step={1} unit="mM"
            onChange={(v) => setP((s) => ({ ...s, dicMax: v }))} hint="Dissolved inorganic carbon ceiling (CO₂ availability)." />
          <Slider isLightMode={isLightMode} accent="accent-violet-500" label={<>Solution pH</>} value={p.pH} min={8.5} max={10.5} step={0.1}
            onChange={(v) => setP((s) => ({ ...s, pH: v }))} hint="Valid model window 8.5–10.5 (carbonate speciation control)." />
          <Slider isLightMode={isLightMode} accent="accent-amber-500" label={<>Carbonic Anhydrase activity</>} value={p.caEnhancement} min={0} max={1} step={0.02}
            format={(v) => `${(v * 100).toFixed(0)}%`} onChange={(v) => setP((s) => ({ ...s, caEnhancement: v }))}
            hint={`Realized fold-enhancement of CO₂ hydration → effective activity ${(caActivity * 100).toFixed(0)}%.`} />
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3">
        <StatCard isLightMode={isLightMode} label="Calcite content" value={result.calciteWtPercent.toFixed(2)} unit="wt%" accent={isLightMode ? 'text-emerald-700' : 'text-emerald-400'} />
        <StatCard isLightMode={isLightMode} label="Saturation index" value={finalSI <= -99 ? '—' : finalSI.toFixed(2)} unit="SI" accent={finalSI > 0 ? (isLightMode ? 'text-emerald-700' : 'text-emerald-400') : (isLightMode ? 'text-rose-600' : 'text-rose-400')} sub={finalSI > 0 ? 'supersaturated → precipitates' : 'undersaturated'} />
        <StatCard isLightMode={isLightMode} label="Unconfined Compressive Strength" value={(result.ucsKpa / 1000).toFixed(2)} unit="MPa" emphasize accent={isLightMode ? 'text-amber-700' : 'text-amber-400'} sub={`${result.ucsKpa.toFixed(0)} kPa biocement`} />
        <StatCard isLightMode={isLightMode} label="CO₂ sequestered" value={result.co2SequesteredGPerL.toFixed(2)} unit="g/L" accent={isLightMode ? 'text-teal-700' : 'text-teal-400'} sub="net-negative, no ammonia" />
      </div>

      <MathDisclosure isLightMode={isLightMode}>
        <p>Speciation: α₂ = K₁K₂ / (H² + K₁H + K₁K₂), [CO₃²⁻] = α₂·DIC</p>
        <p className="mt-1">Ω = [Ca²⁺][CO₃²⁻]/Ksp ,&nbsp; SI = log₁₀Ω</p>
        <p className="mt-1">aqueous → <b>ACC</b> (TST: r = kₚ·(Ω−1)) → <b>calcite</b> (ripening k = {cval(CACO3_CALIB.kAccToCalcite)} h⁻¹)</p>
        <p className="mt-1">UCS = {cval(CACO3_CALIB.kUcs)}·(calcite wt%)<sup>{cval(CACO3_CALIB.nUcs)}</sup> kPa &nbsp;·&nbsp; 1 mol CaCO₃ ⇒ 1 mol CO₂</p>
      </MathDisclosure>
    </>
  );

  return (
    <ModuleShell isLightMode={isLightMode} controls={controls}>
      <Panel title="Carbonate Speciation (Bjerrum)" icon={Layers} isLightMode={isLightMode}
        right={<span className={`text-[10px] font-mono ${isLightMode ? 'text-stone-500' : 'text-slate-500'}`}>operating pH {p.pH.toFixed(1)}</span>}>
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={speciation} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="pH" stroke={c.axis} tick={{ fontSize: 9 }} />
            <YAxis stroke={c.axis} tick={{ fontSize: 9 }} unit="%" />
            <Tooltip contentStyle={tooltipStyle(isLightMode)} />
            <Area type="monotone" dataKey="CO2" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} name="CO₂(aq)" />
            <Area type="monotone" dataKey="HCO3" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} name="HCO₃⁻" />
            <Area type="monotone" dataKey="CO3" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.4} name="CO₃²⁻" />
            <ReferenceLine x={+p.pH.toFixed(1)} stroke={isLightMode ? '#4f46e5' : '#818cf8'} strokeDasharray="4 2" />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Panel title="Precipitation Kinetics (48 h)" icon={Atom} isLightMode={isLightMode}>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={kinetics} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke={c.axis} tick={{ fontSize: 9 }} unit="h" />
              <YAxis stroke={c.axis} tick={{ fontSize: 9 }} />
              <Tooltip contentStyle={tooltipStyle(isLightMode)} />
              <Legend wrapperStyle={{ fontSize: 9 }} />
              <Line type="monotone" dataKey="Ca" stroke="#38bdf8" dot={false} strokeWidth={2} name="Ca²⁺ mM" />
              <Line type="monotone" dataKey="ACC" stroke="#a855f7" dot={false} strokeWidth={2} name="ACC mM" />
              <Line type="monotone" dataKey="Calcite" stroke="#10b981" dot={false} strokeWidth={2.5} name="Calcite mM" />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Biocement Strength Curve" icon={WindIcon} isLightMode={isLightMode}>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={ucsCurve} margin={{ top: 4, right: 10, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
              <XAxis dataKey="pct" stroke={c.axis} tick={{ fontSize: 9 }} unit="%" />
              <YAxis stroke={c.axis} tick={{ fontSize: 9 }} />
              <Tooltip contentStyle={tooltipStyle(isLightMode)} formatter={(v: number) => [`${v} kPa`, 'UCS']} labelFormatter={(l) => `${l} wt% calcite`} />
              <Line type="monotone" dataKey="ucs" stroke="#f59e0b" dot={false} strokeWidth={2.5} name="UCS (kPa)" />
              {result.calciteWtPercent > 0 && (
                <ReferenceDot x={+result.calciteWtPercent.toFixed(2)} y={+result.ucsKpa.toFixed(1)} r={5} fill="#ef4444" stroke={isLightMode ? '#fff' : '#000'} />
              )}
            </LineChart>
          </ResponsiveContainer>
          <p className={`mt-2 text-[10px] flex items-center gap-1 ${isLightMode ? 'text-stone-500' : 'text-slate-500'}`}>
            <Leaf className="w-3 h-3 text-emerald-500" /> Red marker = current operating point; curve calibrated by UCS-vs-calcite% wet-lab regression.
          </p>
        </Panel>
      </div>
    </ModuleShell>
  );
}
