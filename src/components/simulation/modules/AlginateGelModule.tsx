"use client";

/**
 * Prong 3, Sodium Alginate egg-box gel (applied commercial biopolymer; no bacteria).
 * Ca²⁺ egg-box gelation → shear modulus, plus the honest limitations: moisture retention
 * (a plus) and rain washout (a minus). Deliberately a smaller, distinct module set.
 */

import React, { useMemo, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  ReferenceLine,
} from "recharts";
import { Droplets, ShieldCheck, CloudRain } from "lucide-react";
import GlossaryTerm, { GlossaryText } from "../../GlossaryTerm";
import type { AlginateParams } from "../../../types";
import {
  solveAlginateGel,
  moistureRetention,
  washoutResidual,
  washoutHalfLifeCycles,
  modulusAfterWashout,
} from "../../../lib/physics";
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
  onUpdate?: (out: { modulus: number }) => void;
}

const DEFAULTS: AlginateParams = {
  appliedPercent: 2.0,
  calcium: 10,
  temperature: 298.15,
  relativeHumidity: 0.4,
  rainCycles: 0,
};

export default function AlginateGelModule({ isLightMode, onUpdate }: Props) {
  const [p, setP] = useState<AlginateParams>(DEFAULTS);
  const c = chartColors(isLightMode);
  const tempC = p.temperature - 273.15;

  const gel = useMemo(
    () =>
      solveAlginateGel({
        appliedPercent: p.appliedPercent,
        calciumMillimolar: p.calcium,
        temperature: p.temperature,
      }),
    [p.appliedPercent, p.calcium, p.temperature],
  );
  const moisture = useMemo(
    () => moistureRetention(p.appliedPercent, p.relativeHumidity, tempC),
    [p.appliedPercent, p.relativeHumidity, tempC],
  );
  const effectiveG = useMemo(
    () => modulusAfterWashout(gel.shearModulus, p.rainCycles),
    [gel.shearModulus, p.rainCycles],
  );
  const halfLife = useMemo(() => washoutHalfLifeCycles(), []);

  useEffect(() => {
    onUpdate?.({ modulus: effectiveG });
  }, [effectiveG, onUpdate]);

  const gCurve = useMemo(() => {
    const rows = [];
    for (let ca = 0; ca <= 30.01; ca += 0.75) {
      rows.push({
        ca: +ca.toFixed(1),
        G: +solveAlginateGel({
          appliedPercent: p.appliedPercent,
          calciumMillimolar: ca,
          temperature: p.temperature,
        }).shearModulus.toFixed(0),
      });
    }
    return rows;
  }, [p.appliedPercent, p.temperature]);

  const washoutCurve = useMemo(() => {
    const rows = [];
    for (let n = 0; n <= 20; n++)
      rows.push({
        cycle: n,
        residual: +(washoutResidual(n) * 100).toFixed(1),
        G: +(gel.shearModulus * washoutResidual(n)).toFixed(0),
      });
    return rows;
  }, [gel.shearModulus]);

  const moistureCurve = useMemo(() => {
    const rows = [];
    for (let rh = 0; rh <= 1.001; rh += 0.05)
      rows.push({
        rh: +(rh * 100).toFixed(0),
        water: +moistureRetention(p.appliedPercent, rh, tempC).toFixed(0),
      });
    return rows;
  }, [p.appliedPercent, tempC]);

  const controls = (
    <>
      <Panel
        title="Applied Alginate Treatment"
        icon={Droplets}
        isLightMode={isLightMode}
      >
        <div className="space-y-4">
          <Slider
            isLightMode={isLightMode}
            accent="accent-rose-500"
            label="Applied alginate"
            value={p.appliedPercent}
            min={0.1}
            max={5}
            step={0.1}
            unit="%w/v"
            onChange={(v) => setP((s) => ({ ...s, appliedPercent: v }))}
            hint="Commercial sodium alginate, sprayed directly (no bacteria required)."
          />
          <Slider
            isLightMode={isLightMode}
            accent="accent-teal-500"
            label={<>Ca²⁺ crosslinker</>}
            value={p.calcium}
            min={0}
            max={30}
            step={0.5}
            unit="mM"
            onChange={(v) => setP((s) => ({ ...s, calcium: v }))}
            hint="Divalent calcium forms egg-box junctions between G-blocks."
          />
          <Slider
            isLightMode={isLightMode}
            accent="accent-amber-500"
            label="Temperature"
            value={tempC}
            min={5}
            max={55}
            step={1}
            unit="°C"
            format={(v) => v.toFixed(0)}
            onChange={(v) => setP((s) => ({ ...s, temperature: v + 273.15 }))}
          />
          <Slider
            isLightMode={isLightMode}
            accent="accent-teal-500"
            label="Relative humidity"
            value={p.relativeHumidity}
            min={0}
            max={1}
            step={0.05}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            onChange={(v) => setP((s) => ({ ...s, relativeHumidity: v }))}
            hint="Drives the hydrogel's moisture-retention benefit."
          />
          <Slider
            isLightMode={isLightMode}
            accent="accent-amber-500"
            label="Rain / wet cycles"
            value={p.rainCycles}
            min={0}
            max={20}
            step={1}
            format={(v) => v.toFixed(0)}
            onChange={(v) => setP((s) => ({ ...s, rainCycles: v }))}
            hint="Soluble polymer: washes out over repeated wetting."
          />
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          isLightMode={isLightMode}
          label="Gel shear modulus"
          value={effectiveG.toFixed(0)}
          unit="Pa"
          emphasize
          accent={isLightMode ? "text-rose-700" : "text-rose-400"}
          sub={
            p.rainCycles > 0 ? `after ${p.rainCycles} wet cycles` : "fresh gel"
          }
        />
        <StatCard
          isLightMode={isLightMode}
          label="Ca²⁺ saturation θ"
          value={(gel.theta * 100).toFixed(0)}
          unit="%"
          accent={isLightMode ? "text-teal-700" : "text-teal-400"}
        />
        <StatCard
          isLightMode={isLightMode}
          label="Moisture retained"
          value={moisture.toFixed(0)}
          unit="g/L"
          accent={isLightMode ? "text-teal-700" : "text-teal-400"}
          sub="keeps crust damp"
        />
        <StatCard
          isLightMode={isLightMode}
          label="Washout half-life"
          value={halfLife.toFixed(1)}
          unit="cycles"
          accent={isLightMode ? "text-amber-700" : "text-amber-400"}
          sub="durability limit"
        />
      </div>

      <ModuleActions moduleId="alginate" isLightMode={isLightMode} />
    </>
  );

  return (
    <ModuleShell isLightMode={isLightMode} controls={controls}>
      <Panel
        title={
          <>
            <GlossaryTerm term="egg-box">Egg-Box Gelation</GlossaryTerm> vs Ca²⁺
          </>
        }
        icon={ShieldCheck}
        isLightMode={isLightMode}
      >
        <ResponsiveContainer width="100%" height={150}>
          <LineChart
            data={gCurve}
            margin={{ top: 4, right: 10, left: -16, bottom: 0 }}
          >
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis
              dataKey="ca"
              stroke={c.axis}
              tick={{ fontSize: 9 }}
              unit=" mM"
            />
            <YAxis stroke={c.axis} tick={{ fontSize: 9 }} />
            <Tooltip
              contentStyle={tooltipStyle(isLightMode)}
              formatter={(v: number) => [`${v} Pa`, "G"]}
              labelFormatter={(l) => `${l} mM Ca²⁺`}
            />
            <Line
              type="monotone"
              dataKey="G"
              stroke="#f43f5e"
              dot={false}
              strokeWidth={2.5}
            />
            <ReferenceDot
              x={+p.calcium.toFixed(1)}
              y={+gel.shearModulus.toFixed(0)}
              r={5}
              fill="#8fb3ac"
              stroke={isLightMode ? "#fff" : "#000"}
            />
          </LineChart>
        </ResponsiveContainer>
        <p
          className={`mt-2 text-[10px] ${isLightMode ? "text-stone-500" : "text-slate-500"}`}
        >
          <GlossaryText>
            Calcium binds the buckled G-blocks into egg-box junctions; the
            junction density sets the shear modulus through rubber-elasticity, G
            = network density x R x T. The curve rises then saturates as the
            G-blocks run out of free binding sites.
          </GlossaryText>
        </p>
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Panel
          title={
            <>
              <GlossaryTerm term="rain-washout">
                Rain Washout Durability
              </GlossaryTerm>
            </>
          }
          icon={CloudRain}
          isLightMode={isLightMode}
        >
          <ResponsiveContainer width="100%" height={150}>
            <LineChart
              data={washoutCurve}
              margin={{ top: 4, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
              <XAxis dataKey="cycle" stroke={c.axis} tick={{ fontSize: 9 }} />
              <YAxis stroke={c.axis} tick={{ fontSize: 9 }} unit="%" />
              <Tooltip
                contentStyle={tooltipStyle(isLightMode)}
                formatter={(v: number) => [`${v}%`, "residual"]}
                labelFormatter={(l) => `${l} cycles`}
              />
              <Line
                type="monotone"
                dataKey="residual"
                stroke="#d6884a"
                dot={false}
                strokeWidth={2.5}
                name="residual %"
              />
              <ReferenceLine
                x={p.rainCycles}
                stroke="#ef4444"
                strokeDasharray="4 2"
              />
            </LineChart>
          </ResponsiveContainer>
          <p
            className={`mt-2 text-[10px] ${isLightMode ? "text-stone-500" : "text-slate-500"}`}
          >
            <GlossaryText>
              The honest limit: alginate is soluble, so each wet cycle removes a
              fixed fraction and residual strength falls as (1 - washout
              rate)^cycles. That decay rate is a rainfall-simulation calibration
              target, and it is why alginate is one prong of three, not the
              whole answer.
            </GlossaryText>
          </p>
        </Panel>

        <Panel
          title={
            <>
              <GlossaryTerm term="moisture-retention">
                Moisture Retention
              </GlossaryTerm>{" "}
              vs Humidity
            </>
          }
          icon={Droplets}
          isLightMode={isLightMode}
        >
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart
              data={moistureCurve}
              margin={{ top: 4, right: 10, left: -16, bottom: 0 }}
            >
              <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
              <XAxis
                dataKey="rh"
                stroke={c.axis}
                tick={{ fontSize: 9 }}
                unit="%"
              />
              <YAxis stroke={c.axis} tick={{ fontSize: 9 }} />
              <Tooltip
                contentStyle={tooltipStyle(isLightMode)}
                formatter={(v: number) => [`${v} g/L`, "water"]}
                labelFormatter={(l) => `${l}% RH`}
              />
              <Area
                type="monotone"
                dataKey="water"
                stroke="#8fb3ac"
                fill="#8fb3ac"
                fillOpacity={0.25}
              />
              <ReferenceDot
                x={+(p.relativeHumidity * 100).toFixed(0)}
                y={+moisture.toFixed(0)}
                r={5}
                fill="#f59e0b"
                stroke={isLightMode ? "#fff" : "#000"}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </ModuleShell>
  );
}
