"use client";

/**
 * Xanthan Gum Flow Model
 * ======================
 * A power-law (Ostwald–de Waele) rheology model for how xanthan gum solution, the shear-thinning
 * carrier fluid used to pump the biopolymer mix, flows through delivery tubing: mean flow speed
 * vs. pressure drop across a straight cylindrical tube, and how dilution changes both. Ported from
 * the team's Overleaf write-up ("A Power-Law Model for Speed and Pressure Drop of Xanthan Gum
 * Solution Flow in a Cylindrical Tube"), with the static figures rebuilt as a live, slider-driven
 * chart, the interactivity the write-up itself notes a static document can't offer.
 *
 * All numbers on this page come from src/lib/xanthanFlow.ts, never hand-transcribed, so the page
 * cannot drift from the model.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

import { useTheme } from "@/components/theme-context";
import { PortalIntro } from "@/components/portal-intro";
import { PORTAL_INTROS } from "@/src/lib/portalIntros";
import ModuleErrorBoundary from "@/src/components/ErrorBoundary";
import Katex from "@/src/components/Katex";
import { PORTAL_NAMES } from "@/content/copy";
import { NAV } from "@/content/copy";
import { DUNE, STATUS } from "@/src/lib/palette";
import {
  Panel,
  Slider,
  StatCard,
  MathDisclosure,
  chartColors,
  tooltipStyle,
} from "@/src/components/simulation/_shared";
import {
  TUBE,
  BASE_XANTHAN,
  DILUTION,
  RE_LAMINAR_LIMIT,
  CONCENTRATION_LEVELS,
  CONCENTRATION_COLORS,
  concentrationParams,
  pressureFromSpeed,
  speedFromPressure,
  transitTime,
  flowRateMlPerMin,
  reynoldsMR,
  pctLabel,
  type RheologyParams,
} from "@/src/lib/xanthanFlow";

const BASE_PARAMS: RheologyParams = { K: BASE_XANTHAN.K0, n: BASE_XANTHAN.n0 };

/** log-spaced samples between 10^min and 10^max (inclusive), used for the log-x dilution chart. */
function logspace(min: number, max: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) =>
    Math.pow(10, min + ((max - min) * i) / (count - 1)),
  );
}

function formatDuration(seconds: number): string {
  if (!isFinite(seconds)) return "n/a";
  if (seconds >= 60) return `${(seconds / 60).toFixed(1)} min`;
  if (seconds >= 1) return `${seconds.toFixed(1)} s`;
  return `${seconds.toFixed(2)} s`;
}

/** Table 1 / Table 2 sample speeds (cm/s), same set the source model tabulates. */
const SAMPLE_SPEEDS_CM = [0.5, 1.0, 2.0, 5.0, 10.0];

export default function XanthanFlowView() {
  const router = useRouter();
  const { isLightMode } = useTheme();
  const backToPortals = () => router.push("/portals");

  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 pb-24 pt-24">
      <PortalIntro content={PORTAL_INTROS["xanthan-flow"]} />
      <button
        onClick={backToPortals}
        className="mb-6 flex items-center gap-2 px-4 py-2 text-[length:var(--text-micro)] font-semibold rounded-[4px] border border-border bg-secondary hover:brightness-95 transition"
      >
        {NAV.backToPortals}
      </button>
      <ModuleErrorBoundary isLightMode={isLightMode} label={PORTAL_NAMES.xanthan}>
        <XanthanFlowContent isLightMode={isLightMode} />
      </ModuleErrorBoundary>
    </div>
  );
}

function XanthanFlowContent({ isLightMode }: { isLightMode: boolean }) {
  const c = chartColors(isLightMode);

  // Interactive calculator state: concentration fraction φ and applied pressure ΔP.
  const [phi, setPhi] = useState(1);
  const [appliedPressure, setAppliedPressure] = useState(100);

  const liveParams = useMemo(() => concentrationParams(phi), [phi]);
  const liveSpeedMs = useMemo(
    () => speedFromPressure(appliedPressure, liveParams),
    [appliedPressure, liveParams],
  );
  const liveSpeedCm = liveSpeedMs * 100;
  const liveFlowRate = useMemo(
    () => flowRateMlPerMin(liveSpeedMs),
    [liveSpeedMs],
  );
  const liveTransit = useMemo(() => transitTime(liveSpeedMs), [liveSpeedMs]);
  const liveRe = useMemo(
    () => reynoldsMR(liveSpeedMs, liveParams),
    [liveSpeedMs, liveParams],
  );
  const liveLaminar = liveRe < RE_LAMINAR_LIMIT;

  // Table 1 / Table 2: ΔP(V) and transit time at the undiluted default, for the tube in the model.
  const sampleTable = useMemo(
    () =>
      SAMPLE_SPEEDS_CM.map((vCm) => {
        const vMs = vCm / 100;
        const dP = pressureFromSpeed(vMs, BASE_PARAMS);
        return { vCm, vMs, dP, t: transitTime(vMs) };
      }),
    [],
  );

  // Chart A: ΔP vs V at the undiluted default, linear axis 0–12 cm/s (mirrors the write-up's figure).
  const baseCurve = useMemo(
    () =>
      Array.from({ length: 61 }, (_, i) => {
        const vCm = (i / 60) * 12;
        return { vCm: +vCm.toFixed(2), dP: +pressureFromSpeed(vCm / 100, BASE_PARAMS).toFixed(1) };
      }),
    [],
  );

  // Chart B: family of ΔP(V) curves across concentration levels, log-x 0.01–100 cm/s (mirrors
  // Figure 1), plus the live slider curve overlaid in bold.
  const dilutionCurve = useMemo(() => {
    const speedsCm = logspace(-2, 2, 49);
    return speedsCm.map((vCm) => {
      const vMs = vCm / 100;
      const row: Record<string, number> = { vCm: +vCm.toPrecision(4) };
      CONCENTRATION_LEVELS.forEach((level) => {
        row[`p${level}`] = +pressureFromSpeed(
          vMs,
          concentrationParams(level),
        ).toFixed(1);
      });
      row.live = +pressureFromSpeed(vMs, liveParams).toFixed(1);
      return row;
    });
  }, [liveParams]);

  // Table 3 analogue: quick-reference dilution table at a fixed ΔP = 100 Pa.
  const dilutionTable = useMemo(
    () =>
      CONCENTRATION_LEVELS.map((level) => {
        const params = concentrationParams(level);
        const vMs = speedFromPressure(100, params);
        return {
          level,
          ...params,
          vCm: vMs * 100,
          q: flowRateMlPerMin(vMs),
          t: transitTime(vMs),
        };
      }),
    [],
  );

  return (
    <div className="space-y-6">
      {/* Header banner, same pattern as the other modules (icon + title + subtitle). */}
      <div
        className={`p-4 rounded-[6px] border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors duration-300 ${
          isLightMode
            ? "bg-dune-teal border-dune-teal/10"
            : "bg-dune-ink border-border"
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`p-2 rounded-[4px] ${isLightMode ? "bg-dune-teal/10 text-dune-teal" : "bg-dune-teal/50 text-dune-teal border border-dune-teal/50"}`}
          >
            </div>
          <div>
            <h1 className="text-[length:var(--text-micro)] font-black uppercase tracking-wider font-mono">
              {PORTAL_NAMES.xanthan}
            </h1>
            <p
              className={`text-[length:var(--text-caption)] mt-1 max-w-2xl ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
            >
              Power-law pipe flow for the shear-thinning carrier fluid, mean
              speed ↔ pressure drop through a {TUBE.diameter * 100} cm
              diameter, {TUBE.length * 100} cm tube, and how dilution changes
              both.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
          <StatCard
            isLightMode={isLightMode}
            label="Diameter"
            value={(TUBE.diameter * 100).toFixed(0)}
            unit="cm"
            accent={isLightMode ? "text-dune-teal" : "text-dune-teal"}
          />
          <StatCard
            isLightMode={isLightMode}
            label="Length"
            value={(TUBE.length * 100).toFixed(0)}
            unit="cm"
            accent={isLightMode ? "text-dune-teal" : "text-dune-teal"}
          />
          <StatCard
            isLightMode={isLightMode}
            label="Flow regime"
            value="Laminar"
            sub="power-law fluid"
            accent={isLightMode ? "text-dune-teal" : "text-dune-teal"}
          />
        </div>
      </div>

      {/* 1. Problem setup */}
      <Panel title="1 · Problem Setup" isLightMode={isLightMode}>
        <p
          className={`text-[length:var(--text-micro)] leading-relaxed mb-4 ${isLightMode ? "text-foreground" : "text-foreground"}`}
        >
          Xanthan gum solutions are strongly{" "}
          <b>shear-thinning</b> (pseudoplastic): their apparent viscosity
          drops sharply as shear rate increases. That means the ordinary
          Newtonian Hagen–Poiseuille law, ΔP ∝ V, does not apply, pumping this
          fluid twice as fast does not need twice the pressure. Instead the
          model uses the <b>power-law (Ostwald–de Waele) fluid model</b>, the
          standard, experimentally well-validated rheology for xanthan gum
          solutions.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard
            isLightMode={isLightMode}
            label="Diameter D"
            value={TUBE.diameter.toFixed(3)}
            unit="m"
            accent={isLightMode ? "text-foreground" : "text-foreground"}
            sub={`R = ${TUBE.radius.toFixed(3)} m`}
          />
          <StatCard
            isLightMode={isLightMode}
            label="Length L"
            value={TUBE.length.toFixed(2)}
            unit="m"
            accent={isLightMode ? "text-foreground" : "text-foreground"}
          />
          <StatCard
            isLightMode={isLightMode}
            label="Geometry"
            value="Straight"
            sub="cylindrical tube"
            accent={isLightMode ? "text-foreground" : "text-foreground"}
          />
        </div>
      </Panel>

      {/* 2. Rheological model */}
      <Panel
        title="2 · Rheological Model"
        isLightMode={isLightMode}
      >
        <div className="flex justify-center py-2">
          <Katex tex="\tau = K\,\dot{\gamma}^{\,n}" />
        </div>
        <p
          className={`text-[length:var(--text-micro)] leading-relaxed mb-4 ${isLightMode ? "text-foreground" : "text-foreground"}`}
        >
          <b>K</b> [Pa·s<sup>n</sup>] is the <b>consistency index</b> (a
          viscosity-like scale factor); <b>n</b> [dimensionless] is the{" "}
          <b>flow behaviour index</b>. For xanthan gum, n &lt; 1
          (shear-thinning), the smaller n is, the more strongly shear-thinning
          the fluid is. n = 1 recovers a Newtonian fluid with K = µ.
          Literature values for dilute aqueous xanthan gum solutions
          commonly fall in n ≈ 0.15–0.3, K ≈ 1–20 Pa·s<sup>n</sup>. This
          page's working default (≈1% w/w, ≈25 °C) is:
        </p>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <StatCard
            isLightMode={isLightMode}
            label="n (behaviour index)"
            value={BASE_XANTHAN.n0.toFixed(3)}
            emphasize
            accent={isLightMode ? "text-dune-teal" : "text-dune-teal"}
            sub="shear-thinning"
          />
          <StatCard
            isLightMode={isLightMode}
            label="K (consistency)"
            value={BASE_XANTHAN.K0.toFixed(2)}
            unit={`Pa s^${BASE_XANTHAN.n0}`}
            emphasize
            accent={isLightMode ? "text-dune-teal" : "text-dune-teal"}
          />
          <StatCard
            isLightMode={isLightMode}
            label="ρ (density)"
            value={BASE_XANTHAN.rho.toFixed(0)}
            unit="kg/m³"
            accent={isLightMode ? "text-foreground" : "text-foreground"}
          />
        </div>
        <p
          className={`text-[length:var(--text-caption)] leading-relaxed ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
        >
          Replace these three numbers with a rheometer measurement (or the
          manufacturer's data sheet) of your actual solution, everything
          below updates automatically, they are the only material inputs to
          the model.
        </p>
      </Panel>

      {/* 3. Derivation */}
      <Panel
        title="3 · Derivation: Velocity & Flow Rate"
        isLightMode={isLightMode}
      >
        <p
          className={`text-[length:var(--text-micro)] leading-relaxed mb-4 ${isLightMode ? "text-foreground" : "text-foreground"}`}
        >
          Assuming steady, laminar, fully developed, incompressible,
          isothermal flow driven by a pressure drop ΔP over length L, a force
          balance plus the power-law constitutive relation gives the mean
          speed and, inverted, the pressure needed to drive a chosen speed:
        </p>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div
            className={`p-4 rounded-[4px] border flex flex-col items-center gap-1 ${isLightMode ? "border-dune-orange/10 bg-card" : "border-border bg-dune-ink"}`}
          >
            <span
              className={`text-[length:var(--text-caption)] font-bold uppercase tracking-wider ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
            >
              Mean speed from ΔP
            </span>
            <Katex tex="V=\dfrac{nR}{3n+1}\left(\dfrac{\Delta P\,R}{2KL}\right)^{1/n}" />
          </div>
          <div
            className={`p-4 rounded-[4px] border flex flex-col items-center gap-1 ${isLightMode ? "border-dune-orange/10 bg-card" : "border-border bg-dune-ink"}`}
          >
            <span
              className={`text-[length:var(--text-caption)] font-bold uppercase tracking-wider ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
            >
              Pressure drop from V
            </span>
            <Katex tex="\Delta P(V)=\dfrac{2KL}{R}\left(\dfrac{(3n+1)V}{nR}\right)^{n}" />
          </div>
        </div>
        <MathDisclosure isLightMode={isLightMode}>
          <div className="space-y-4">
            <p>Force balance on a cylindrical fluid element of radius r:</p>
            <Katex tex="\tau(r)=\dfrac{\Delta P}{2L}\,r" />
            <p>
              Combined with the constitutive relation and γ̇ = −du/dr, then
              integrated with no-slip u(R) = 0:
            </p>
            <Katex tex="u(r)=\dfrac{n}{n+1}\left(\dfrac{\Delta P}{2KL}\right)^{1/n}\left[R^{\frac{n+1}{n}}-r^{\frac{n+1}{n}}\right]" />
            <p>
              Integrating u(r) over the cross-section gives the generalized
              Hagen–Poiseuille / Rabinowitsch–Mooney flow rate:
            </p>
            <Katex tex="Q=\int_0^R u(r)\,2\pi r\,dr=\dfrac{\pi n R^3}{3n+1}\left(\dfrac{\Delta P\,R}{2KL}\right)^{1/n}" />
            <p>and the mean speed V = Q/(πR²), Eq. (6) above.</p>
          </div>
        </MathDisclosure>
        <p
          className={`text-[length:var(--text-caption)] leading-relaxed mt-4 ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
        >
          The flow is <b>nonlinear</b>: ΔP ∝ V<sup>n</sup> with n ≈{" "}
          {BASE_XANTHAN.n0}, so doubling the speed increases the required
          pressure by only a factor of 2<sup>{BASE_XANTHAN.n0}</sup> ≈{" "}
          {Math.pow(2, BASE_XANTHAN.n0).toFixed(2)}, far less than the factor
          of 2 a Newtonian fluid would require. This is the practical
          signature of shear-thinning behaviour.
        </p>
      </Panel>

      {/* 4. Model evaluated for this tube: constants + tables */}
      <Panel
        title="4 · Model Evaluated for This Tube"
        isLightMode={isLightMode}
      >
        <div className="grid grid-cols-2 gap-4 mb-4">
          <StatCard
            isLightMode={isLightMode}
            label="(3n+1)/(nR)"
            value={(
              (3 * BASE_XANTHAN.n0 + 1) /
              (BASE_XANTHAN.n0 * TUBE.radius)
            ).toFixed(0)}
            unit="m⁻¹"
            accent={isLightMode ? "text-foreground" : "text-foreground"}
          />
          <StatCard
            isLightMode={isLightMode}
            label="2KL/R"
            value={(
              (2 * BASE_XANTHAN.K0 * TUBE.length) /
              TUBE.radius
            ).toFixed(1)}
            unit="Pa"
            accent={isLightMode ? "text-foreground" : "text-foreground"}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[length:var(--text-caption)] border-collapse">
            <thead>
              <tr
                className={`text-left uppercase tracking-wider text-[length:var(--text-caption)] font-bold ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
              >
                <th className="py-2 pr-4">V [cm/s]</th>
                <th className="py-2 pr-4">ΔP [Pa]</th>
                <th className="py-2 pr-4">Transit time (15 cm)</th>
              </tr>
            </thead>
            <tbody>
              {sampleTable.map((row) => (
                <tr
                  key={row.vCm}
                  className={`border-t ${isLightMode ? "border-dune-orange/10" : "border-border"}`}
                >
                  <td className="py-2 pr-4 font-mono">
                    {row.vCm.toFixed(1)}
                  </td>
                  <td className="py-2 pr-4 font-mono">
                    {row.dP.toFixed(0)}
                  </td>
                  <td className="py-2 pr-4 font-mono">
                    {formatDuration(row.t)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p
          className={`text-[length:var(--text-caption)] mt-2 leading-relaxed ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
        >
          Despite a 20× speed-up from 0.5 to 10 cm/s, the required pressure
          only about doubles ({sampleTable[0].dP.toFixed(0)} →{" "}
          {sampleTable[sampleTable.length - 1].dP.toFixed(0)} Pa), a direct
          consequence of shear-thinning.
        </p>
      </Panel>

      {/* Chart A: ΔP vs V at the undiluted default. */}
      <Panel
        title="5 · Visualising ΔP vs. V (undiluted)"
        isLightMode={isLightMode}
      >
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={baseCurve} margin={{ top: 8, right: 16, left: 4, bottom: 16 }}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis
              dataKey="vCm"
              type="number"
              domain={[0, 12]}
              stroke={c.axis}
              tick={{ fontSize: 10 }}
              label={{
                value: "mean speed V (cm/s)",
                position: "insideBottom",
                offset: -8,
                fontSize: 10,
                fill: c.axis,
              }}
            />
            <YAxis
              domain={[150, 500]}
              stroke={c.axis}
              tick={{ fontSize: 10 }}
              width={44}
              label={{
                value: "ΔP (Pa)",
                angle: -90,
                position: "insideLeft",
                fontSize: 10,
                fill: c.axis,
              }}
            />
            <Tooltip
              contentStyle={tooltipStyle(isLightMode)}
              formatter={(v: number) => [`${v} Pa`, "ΔP"]}
              labelFormatter={(v) => `V = ${v} cm/s`}
            />
            <Line
              type="monotone"
              dataKey="dP"
              stroke={DUNE.teal}
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
        <p
          className={`mt-2 text-[length:var(--text-caption)] leading-relaxed ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
        >
          The strongly sublinear (concave) shape is the hallmark of
          shear-thinning flow: large increases in speed require only modest
          increases in driving pressure, sharply unlike the linear ΔP ∝ V
          behaviour of a Newtonian fluid (e.g. water) in the same tube.
        </p>
      </Panel>

      {/* 6. Effect of dilution */}
      <Panel
        title="6 · Effect of Dilution with Water"
        isLightMode={isLightMode}
      >
        <p
          className={`text-[length:var(--text-micro)] leading-relaxed mb-4 ${isLightMode ? "text-foreground" : "text-foreground"}`}
        >
          Let φ = c/c₀ ∈ [0,1] be the concentration fraction relative to the
          undiluted 1% w/w base (φ = 1 undiluted, φ = 0.5 a 1:1 dilution, φ =
          0 pure water). Both rheological parameters scale with dilution:
        </p>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div
            className={`p-4 rounded-[4px] border flex flex-col items-center gap-1 ${isLightMode ? "border-dune-orange/10 bg-card" : "border-border bg-dune-ink"}`}
          >
            <Katex tex="K(\varphi)=K_w+(K_0-K_w)\varphi^{\alpha}" />
          </div>
          <div
            className={`p-4 rounded-[4px] border flex flex-col items-center gap-1 ${isLightMode ? "border-dune-orange/10 bg-card" : "border-border bg-dune-ink"}`}
          >
            <Katex tex="n(\varphi)=1-(1-n_0)\varphi^{\beta}" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <StatCard
            isLightMode={isLightMode}
            label="Kw (water)"
            value={DILUTION.Kw.toFixed(3)}
            unit="Pa s"
            accent={isLightMode ? "text-foreground" : "text-foreground"}
          />
          <StatCard
            isLightMode={isLightMode}
            label="α (K exponent)"
            value={DILUTION.alpha.toFixed(1)}
            accent={isLightMode ? "text-foreground" : "text-foreground"}
            sub="K falls faster than linear"
          />
          <StatCard
            isLightMode={isLightMode}
            label="β (n exponent)"
            value={DILUTION.beta.toFixed(1)}
            accent={isLightMode ? "text-foreground" : "text-foreground"}
            sub="n rises slower than linear"
          />
          <StatCard
            isLightMode={isLightMode}
            label="Halving K"
            value={`≈${Math.pow(2, DILUTION.alpha).toFixed(1)}×`}
            accent={isLightMode ? "text-dune-teal" : "text-dune-teal"}
            sub="per halved concentration"
          />
        </div>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-[length:var(--text-caption)] border-collapse">
            <thead>
              <tr className="caption text-left">
                <th className="py-2 pr-4">
                  Concentration <span className="caption-asis">φ</span>
                </th>
                <th className="py-2 pr-4">K [Pa sⁿ]</th>
                <th className="py-2 pr-4">n</th>
                <th className="py-2 pr-4">V [cm/s]</th>
                <th className="py-2 pr-4">Q [mL/min]</th>
                <th className="py-2 pr-4">Transit time</th>
              </tr>
            </thead>
            <tbody>
              {dilutionTable.map((row) => (
                <tr
                  key={row.level}
                  className={`border-t ${isLightMode ? "border-dune-orange/10" : "border-border"}`}
                >
                  <td className="py-2 pr-4 font-mono">
                    {pctLabel(row.level)}
                  </td>
                  <td className="py-2 pr-4 font-mono">{row.K.toFixed(3)}</td>
                  <td className="py-2 pr-4 font-mono">{row.n.toFixed(3)}</td>
                  <td className="py-2 pr-4 font-mono">
                    {row.vCm.toFixed(2)}
                  </td>
                  <td className="py-2 pr-4 font-mono">{row.q.toFixed(0)}</td>
                  <td className="py-2 pr-4 font-mono">
                    {formatDuration(row.t)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p
          className={`text-[length:var(--text-caption)] leading-relaxed ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
        >
          Values at a fixed applied pressure of 100 Pa. Because K falls
          steeply with dilution while n rises toward 1, speed is extremely
          sensitive to concentration, diluting 100% → 50% at the same
          pressure raises V by roughly 37×; 100% → 10% by 900×.
        </p>
      </Panel>

      {/* 7. Interactive calculator + Chart B */}
      <div
        className={`grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 rounded-[6px] border border-border transition-colors duration-300 ${
          isLightMode ? "bg-card" : "bg-card"
        }`}
      >
        <div className="lg:col-span-5 space-y-6">
          <h3
            className={`text-[length:var(--text-micro)] font-extrabold uppercase tracking-wider flex items-center gap-2 ${isLightMode ? "text-dune-maroon" : "text-dune-paper"}`}
          >
            Interactive Calculator
          </h3>
          <p
            className={`text-[length:var(--text-caption)] leading-relaxed ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
          >
            Pick a concentration and an applied pressure, and the model works
            out how fast the mix moves and how long it takes to get there.
          </p>
          <Slider
            label="Concentration φ"
            value={phi}
            min={0.05}
            max={1}
            step={0.01}
            isLightMode={isLightMode}
            accent="accent-dune-teal"
            format={(v) => pctLabel(v)}
            onChange={setPhi}
          />
          <Slider
            label="Applied pressure ΔP"
            value={appliedPressure}
            min={20}
            max={600}
            step={5}
            unit="Pa"
            isLightMode={isLightMode}
            accent="accent-dune-teal"
            onChange={setAppliedPressure}
          />
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              isLightMode={isLightMode}
              label="K(φ)"
              value={liveParams.K.toFixed(3)}
              unit="Pa sⁿ"
              accent={isLightMode ? "text-dune-teal" : "text-dune-teal"}
            />
            <StatCard
              isLightMode={isLightMode}
              label="n(φ)"
              value={liveParams.n.toFixed(3)}
              accent={isLightMode ? "text-dune-teal" : "text-dune-teal"}
            />
            <StatCard
              isLightMode={isLightMode}
              label="Mean speed V"
              value={liveSpeedCm.toFixed(2)}
              unit="cm/s"
              emphasize
              accent={isLightMode ? "text-foreground" : "text-foreground"}
            />
            <StatCard
              isLightMode={isLightMode}
              label="Flow rate Q"
              value={liveFlowRate.toFixed(1)}
              unit="mL/min"
              accent={isLightMode ? "text-foreground" : "text-foreground"}
            />
            <StatCard
              isLightMode={isLightMode}
              label="Transit time"
              value={formatDuration(liveTransit)}
              accent={isLightMode ? "text-foreground" : "text-foreground"}
            />
            <StatCard
              isLightMode={isLightMode}
              label="Re (Metzner–Reed)"
              value={liveRe < 1 ? liveRe.toExponential(1) : liveRe.toFixed(0)}
              accent={
                liveLaminar
                  ? isLightMode
                    ? "text-dune-teal"
                    : "text-dune-teal"
                  : isLightMode
                    ? "text-dune-rose"
                    : "text-dune-rose"
              }
              sub={liveLaminar ? "laminar" : "check: near/above 2100"}
            />
          </div>
        </div>
        <div className="lg:col-span-7 space-y-4">
          <h3
            className={`text-[length:var(--text-micro)] font-extrabold uppercase tracking-wider flex items-center gap-2 ${isLightMode ? "text-dune-maroon" : "text-dune-paper"}`}
          >
            ΔP vs. V by
            Concentration
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={dilutionCurve}
              margin={{ top: 8, right: 16, left: 4, bottom: 16 }}
            >
              <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
              <XAxis
                dataKey="vCm"
                type="number"
                scale="log"
                domain={[0.01, 100]}
                ticks={[0.01, 0.1, 1, 10, 100]}
                stroke={c.axis}
                tick={{ fontSize: 10 }}
                label={{
                  value: "mean speed V (cm/s, log)",
                  position: "insideBottom",
                  offset: -8,
                  fontSize: 10,
                  fill: c.axis,
                }}
              />
              <YAxis
                domain={[0, 600]}
                stroke={c.axis}
                tick={{ fontSize: 10 }}
                width={40}
              />
              <Tooltip
                contentStyle={tooltipStyle(isLightMode)}
                formatter={(v: number, name: string) => [`${v} Pa`, name]}
                labelFormatter={(v) => `V = ${v} cm/s`}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {CONCENTRATION_LEVELS.map((level) => (
                <Line
                  key={level}
                  type="monotone"
                  dataKey={`p${level}`}
                  name={pctLabel(level)}
                  stroke={CONCENTRATION_COLORS[level]}
                  strokeWidth={1.3}
                  strokeDasharray="4 3"
                  dot={false}
                />
              ))}
              <Line
                type="monotone"
                dataKey="live"
                name={`Current (${pctLabel(phi)})`}
                stroke={STATUS.warn}
                strokeWidth={2.6}
                dot={false}
              />
              {liveSpeedCm >= 0.01 && liveSpeedCm <= 100 && (
                <ReferenceLine
                  x={+liveSpeedCm.toPrecision(4)}
                  stroke={STATUS.warn}
                  strokeDasharray="2 2"
                  label={{
                    value: "V now",
                    fontSize: 10,
                    fill: STATUS.warn,
                    position: "top",
                  }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
          <p
            className={`text-[length:var(--text-caption)] leading-relaxed ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
          >
            Dashed lines are the five reference concentrations. The bold amber
            line is your slider's live curve. Moving to a lower concentration
            shifts the curve down and right: the same pressure drives a far
            higher speed.
          </p>
        </div>
      </div>

      {/* 8. Validity check */}
      <Panel
        title="7 · Validity Check: Is the Flow Laminar?"
        isLightMode={isLightMode}
      >
        <p
          className={`text-[length:var(--text-micro)] leading-relaxed mb-4 ${isLightMode ? "text-foreground" : "text-foreground"}`}
        >
          The derivation assumes laminar flow, checked with the Metzner–Reed
          generalized Reynolds number for power-law fluids:
        </p>
        <div className="flex justify-center py-2 mb-2">
          <Katex tex="Re_{MR}=\dfrac{\rho\,V^{2-n}D^{n}}{8^{\,n-1}K\left(\dfrac{3n+1}{4n}\right)^{n}}" />
        </div>
        <p
          className={`text-[length:var(--text-caption)] leading-relaxed ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
        >
          As with Newtonian pipe flow, Re<sub>MR</sub> ≲{" "}
          {RE_LAMINAR_LIMIT} is a reasonable laminar cutoff. At the flow
          speeds relevant here, Re<sub>MR</sub> stays far below this
          threshold for typical xanthan gum consistency indices, the high
          effective viscosity at low shear rates strongly damps turbulence.
          Below ~5% concentration the flow approaches the transition, so
          those results should be verified experimentally. Your current
          slider setting gives Re<sub>MR</sub> ≈{" "}
          <b>{liveRe < 1 ? liveRe.toExponential(1) : liveRe.toFixed(0)}</b> (
          {liveLaminar ? "laminar" : "check, near or above the cutoff"}).
        </p>
      </Panel>

      {/* 9. Summary */}
      <Panel
        title="8 · Summary & How to Use This Model"
        isLightMode={isLightMode}
      >
        <ol
          className={`list-decimal list-inside space-y-2 text-[length:var(--text-micro)] leading-relaxed ${isLightMode ? "text-foreground" : "text-foreground"}`}
        >
          <li>
            Measure or look up K, n, and ρ for the actual xanthan gum
            solution, concentration and temperature matter a great deal;
            even 0.5% vs. 1% can change K by an order of magnitude.
          </li>
          <li>
            Plug them into ΔP(V) (pressure for a target speed) or V(ΔP)
            (speed from an applied pressure), using R ={" "}
            {TUBE.radius.toFixed(3)} m and L = {TUBE.length.toFixed(2)} m
            for this tube.
          </li>
          <li>
            Check Re<sub>MR</sub> against the {RE_LAMINAR_LIMIT} cutoff to
            confirm the flow stays laminar at the chosen operating point.
          </li>
        </ol>
        <div
          className={`mt-4 p-4 rounded-[4px] border text-[length:var(--text-caption)] flex items-start gap-2 ${
            isLightMode
              ? "bg-dune-orange/10 text-dune-orange border-dune-orange"
              : "bg-dune-orange/20 text-dune-orange border-dune-orange/40"
          }`}
        >
          <span>
            This model can be extended to a Herschel–Bulkley form (τ = τ₀ +
            Kγ̇ⁿ) if the solution shows a measurable yield stress τ₀, common
            at higher concentrations.
          </span>
        </div>
      </Panel>
    </div>
  );
}
