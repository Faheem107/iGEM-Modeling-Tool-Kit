'use client';

/**
 * Curing & Deployment Timeline — the crust's life story in one module.
 * The other macro modules report the MATURE cohesion; this one shows how the crust rises to that
 * strength over the 0/8/16/24/32 h spray protocol (Study 5) and then weathers over months until it
 * must be re-applied. The multi-prong pay-off is explicit: a fast-setting polymer buys early-age
 * strength while the durable calcite floor stretches the re-application interval.
 */

import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts';
import { Timer, Sprout, CalendarClock, Wind, TriangleAlert } from 'lucide-react';
import { Panel, StatCard, Slider, ModuleActions, chartColors, tooltipStyle, Themed } from './_shared';
import GlossaryTerm, { GlossaryText } from '../GlossaryTerm';
import { curingTimeline, PRONG_LABEL, type ProngId, type ProngContribution } from '../../lib/physics';

interface Props extends Themed {
  prongs: ProngId[];
  /** Per-prong interaction-adjusted cohesion contributions (same objects that feed the composite). */
  contributions: ProngContribution[];
  /** Deployment grain diameter [m] (sets the survival-wind cohesion floor). */
  grainDiameter: number;
}

const PRONG_COLOR: Record<ProngId, string> = { 1: '#f59e0b', 2: '#10b981', 3: '#f43f5e' };
/** Protocol spray times over the maturation window (Study 5). */
const SPRAY_HOURS = [0, 8, 16, 24, 32];
const mN = (n: number) => +(n * 1000).toFixed(2); // N/m → mN/m for readable axes

export default function CuringTimelinePanel({ isLightMode, prongs, contributions, grainDiameter }: Props) {
  const c = chartColors(isLightMode);
  const [designWind, setDesignWind] = useState(30);

  const timeline = useMemo(
    () => curingTimeline(contributions, { grainDiameter, designWindMs: designWind }),
    [contributions, grainDiameter, designWind],
  );

  const active = useMemo(() => prongs.filter((p) => contributions.some((x) => x.prong === p && x.cohesion > 0)), [prongs, contributions]);

  const matureData = useMemo(() => timeline.maturation.map((pt) => ({ hour: +pt.hour.toFixed(1), total: mN(pt.total) })), [timeline.maturation]);

  const fieldData = useMemo(() => timeline.field.map((pt) => {
    const row: Record<string, number> = { month: +pt.month.toFixed(2) };
    active.forEach((p) => { row[`p${p}`] = mN(pt.perProng[p] ?? 0); });
    return row;
  }), [timeline.field, active]);

  const survivalMn = mN(timeline.survivalCohesion);
  const reapplyLabel = Number.isFinite(timeline.reapplyMonths)
    ? `${timeline.reapplyMonths.toFixed(1)} mo`
    : `> ${timeline.field[timeline.field.length - 1].month.toFixed(0)} mo`;
  const meetsDesign = timeline.maxSurvivableWindFresh >= designWind - 1e-6;
  const hasCalcite = active.includes(2);

  return (
    <div className={`p-6 rounded-2xl border space-y-6 transition-colors duration-300 ${
      isLightMode ? 'bg-gradient-to-br from-white to-sky-50/40 border-sky-200 shadow-lg' : 'bg-gradient-to-br from-[#06080d] to-sky-950/20 border-slate-800 shadow-2xl'
    }`}>
      <div className="flex items-center gap-3 border-b pb-4 border-slate-200/60 dark:border-slate-800">
        <div className={`p-2.5 rounded-xl ${isLightMode ? 'bg-sky-50 text-sky-600' : 'bg-sky-950/40 text-sky-400'}`}>
          <CalendarClock className="w-5 h-5" />
        </div>
        <div>
          <h3 className={`text-sm font-black uppercase tracking-wider ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Curing &amp; Deployment Timeline</h3>
          <p className={`text-[11px] ${isLightMode ? 'text-stone-500' : 'text-slate-400'}`}>
            <GlossaryText max={4}>How the crust cures over the 32 h spray protocol, then weathers until re-application.</GlossaryText>
          </p>
        </div>
      </div>

      <ModuleActions moduleId="curing" isLightMode={isLightMode} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard isLightMode={isLightMode} label="Time to mature" value={timeline.hoursToMature.toFixed(0)} unit="h" accent={isLightMode ? 'text-sky-700' : 'text-sky-400'} sub="to 95% of full strength" />
        <StatCard isLightMode={isLightMode} label="Early strength @8 h" value={(timeline.earlyAgeFraction * 100).toFixed(0)} unit="%" accent={isLightMode ? 'text-amber-700' : 'text-amber-400'} sub="of mature, at 1st re-spray" />
        <StatCard isLightMode={isLightMode} label="Withstands (fresh)" value={timeline.maxSurvivableWindFresh.toFixed(0)} unit="m/s" emphasize accent={meetsDesign ? (isLightMode ? 'text-emerald-700' : 'text-emerald-400') : (isLightMode ? 'text-rose-600' : 'text-rose-400')} sub={`design ${designWind} m/s`} />
        <StatCard isLightMode={isLightMode} label="Re-apply due" value={reapplyLabel} accent={timeline.survivesToScheduledReapply ? (isLightMode ? 'text-emerald-700' : 'text-emerald-400') : (isLightMode ? 'text-rose-600' : 'text-rose-400')} sub={`protocol: ${timeline.scheduledReapplyMonths.toFixed(0)} mo cadence`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Panel title={<><GlossaryTerm term="curing">Maturation</GlossaryTerm> over the spray protocol</>} icon={Timer} isLightMode={isLightMode}
          right={<span className={`text-[10px] font-mono ${isLightMode ? 'text-stone-500' : 'text-slate-500'}`}>0–48 h</span>}>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={matureData} margin={{ top: 6, right: 10, left: -14, bottom: 4 }}>
              <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
              <XAxis dataKey="hour" type="number" domain={[0, 48]} ticks={[0, 8, 16, 24, 32, 40, 48]} stroke={c.axis} tick={{ fontSize: 9 }} unit="h" />
              <YAxis stroke={c.axis} tick={{ fontSize: 9 }} width={40} label={{ value: 'mN/m', angle: -90, position: 'insideLeft', fontSize: 9, fill: c.axis }} />
              <Tooltip contentStyle={tooltipStyle(isLightMode)} formatter={(v: number) => [`${v} mN/m`, 'cohesion']} labelFormatter={(h) => `${h} h cure`} />
              <Area type="monotone" dataKey="total" stroke="#0ea5e9" strokeWidth={2.5} fill="#0ea5e9" fillOpacity={0.15} name="crust cohesion" />
              {SPRAY_HOURS.map((h) => (
                <ReferenceLine key={h} x={h} stroke={isLightMode ? '#38bdf8' : '#0ea5e9'} strokeDasharray="2 3" strokeOpacity={0.6}
                  label={{ value: `${h}h`, fontSize: 8, fill: c.axis, position: 'top' }} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
          <p className={`mt-2 text-[10px] leading-relaxed ${isLightMode ? 'text-stone-500' : 'text-slate-500'}`}>
            Dashed lines are the protocol spray times (0/8/16/24/32 h). Alginate gels on contact,
            γ-PGA sets within hours, and MICP calcite ripens over the full 32 h — so the mix reaches
            useful strength early and plateaus by maturation.
          </p>
        </Panel>

        <Panel title="Field weathering &amp; re-application" icon={CalendarClock} isLightMode={isLightMode}
          right={<span className={`text-[10px] font-mono ${isLightMode ? 'text-stone-500' : 'text-slate-500'}`}>months</span>}>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={fieldData} margin={{ top: 6, right: 10, left: -14, bottom: 4 }}>
              <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
              <XAxis dataKey="month" type="number" domain={[0, 'dataMax']} stroke={c.axis} tick={{ fontSize: 9 }} unit="mo" />
              <YAxis stroke={c.axis} tick={{ fontSize: 9 }} width={40} label={{ value: 'mN/m', angle: -90, position: 'insideLeft', fontSize: 9, fill: c.axis }} />
              <Tooltip contentStyle={tooltipStyle(isLightMode)} formatter={(v: number, n: string) => [`${v} mN/m`, n]} labelFormatter={(m) => `${m} mo`} />
              <Legend wrapperStyle={{ fontSize: 9 }} />
              {active.map((p) => (
                <Area key={p} type="monotone" dataKey={`p${p}`} stackId="1" stroke={PRONG_COLOR[p]} fill={PRONG_COLOR[p]} fillOpacity={0.25} name={PRONG_LABEL[p]} />
              ))}
              <ReferenceLine y={survivalMn} stroke={isLightMode ? '#e11d48' : '#fb7185'} strokeDasharray="5 3"
                label={{ value: `survive ${designWind} m/s`, fontSize: 8, fill: isLightMode ? '#e11d48' : '#fb7185', position: 'insideTopRight' }} />
              {Number.isFinite(timeline.reapplyMonths) && timeline.reapplyMonths > 0 && (
                <ReferenceLine x={+timeline.reapplyMonths.toFixed(1)} stroke={c.axis} strokeDasharray="2 2"
                  label={{ value: 're-apply', fontSize: 8, fill: c.axis, position: 'top' }} />
              )}
            </AreaChart>
          </ResponsiveContainer>
          <Slider isLightMode={isLightMode} accent="accent-rose-500" label={<>Design survival wind</>} value={designWind} min={12} max={40} step={1} unit="m/s"
            onChange={setDesignWind} hint="Wind speed the crust must keep withstanding between sprays (UAE winds ≈16–20 m/s; optimised calcite ≈30 m/s)." />
        </Panel>
      </div>

      <div className={`p-3 rounded-xl border text-[11px] flex items-start gap-2 ${
        !meetsDesign
          ? (isLightMode ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-rose-950/20 text-rose-300 border-rose-900/40')
          : timeline.survivesToScheduledReapply
            ? (isLightMode ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-emerald-950/20 text-emerald-300 border-emerald-900/40')
            : (isLightMode ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-amber-950/20 text-amber-300 border-amber-900/40')
      }`}>
        {meetsDesign && timeline.survivesToScheduledReapply ? <Sprout className="w-4 h-4 shrink-0 mt-0.5" /> : <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />}
        <span>
          {!meetsDesign ? (
            <>This selection cures to withstand only <b>{timeline.maxSurvivableWindFresh.toFixed(0)} m/s</b> when
            fresh — below the {designWind} m/s design wind. Lower the design wind, or add/strengthen the CaCO₃
            (MICP) prong, whose cement supplies the extra cohesion needed to survive UAE storm winds.</>
          ) : timeline.survivesToScheduledReapply ? (
            <>Best of both ends: the crust reaches <b>{(timeline.earlyAgeFraction * 100).toFixed(0)}%</b> strength
            by the first re-spray and stays above the {designWind} m/s survival line for <b>{reapplyLabel}</b> —
            {hasCalcite ? ' the durable calcite floor carries it' : ' longer than a soluble polymer alone would'} beyond
            the {timeline.scheduledReapplyMonths.toFixed(0)}-month protocol cadence.</>
          ) : (
            <>This crust matures in <b>{timeline.hoursToMature.toFixed(0)} h</b> and clears {designWind} m/s when fresh,
            but weathers below the survival line at <b>{reapplyLabel}</b> — short of the {timeline.scheduledReapplyMonths.toFixed(0)}-month cadence.
            {hasCalcite
              ? ' Boost the calcite recipe (more Ca²⁺ / CA activity in the CaCO₃ module) to raise the durable floor and extend the interval.'
              : ' Adding the durable CaCO₃ prong would raise the long-term floor and stretch the interval.'}</>
          )}
        </span>
      </div>
    </div>
  );
}
