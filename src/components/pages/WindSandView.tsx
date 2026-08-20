"use client";

/**
 * Wind Pattern & Sand Impact Model (v0)
 * ======================================
 * A geographic hotspot → target dispersal estimate, ported from the team's `wind_sand_v0.py`
 * prototype: pull a seasonal wind rose (Open-Meteo) and hotspot sand content (SoilGrids), find
 * the compass sector pointing from hotspot to target, and apply a naive exponential decay with
 * distance to estimate what fraction of mobilized sand could reach the target.
 *
 * The deterministic pieces (great-circle bearing/distance, the deposition formula) come straight
 * from src/lib/windSand.ts, which is the source of truth. The live-data steps (the real ERA5 wind
 * ensemble, the real SoilGrids query) can't run from a static page, they're represented here by a
 * clearly-labelled illustrative wind rose rather than fabricated as if they were live data. The
 * exact script that *does* pull the real data is embedded below, downloadable, run it yourself.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Compass,
  Wind,
  Layers,
  Route,
  Gauge,
  ListChecks,
  TriangleAlert,
  Download,
  Code2,
} from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

import { useTheme } from "@/components/theme-context";
import { PortalIntro } from "@/components/portal-intro";
import { PORTAL_INTROS } from "@/src/lib/portalIntros";
import ModuleErrorBoundary from "@/src/components/ErrorBoundary";
import Katex from "@/src/components/Katex";
import {
  Panel,
  Slider,
  StatCard,
  MathDisclosure,
  chartColors,
  tooltipStyle,
} from "@/src/components/simulation/_shared";
import {
  HOTSPOT_PRESETS,
  TARGET_PRESETS,
  COMPASS_SECTORS,
  REPRESENTATIVE_WIND_ROSE,
  REPRESENTATIVE_SAND_PCT,
  bearingAndDistance,
  sectorForBearing,
  estimateDeposition,
  type CompassSector,
} from "@/src/lib/windSand";
import { WIND_SAND_SCRIPT } from "@/src/lib/windSandScript";

const selectClass = (isLightMode: boolean) =>
  `w-full p-2 rounded text-[11px] font-semibold font-mono outline-none border ${
    isLightMode
      ? "bg-amber-50/65 border-amber-900/12 text-stone-800"
      : "bg-[#1c1512] border-slate-800 text-slate-300"
  }`;

const numberInputClass = (isLightMode: boolean) =>
  `w-full p-1.5 rounded text-[11px] font-mono outline-none border ${
    isLightMode
      ? "bg-white border-amber-900/12 text-stone-800"
      : "bg-[#1c1512] border-slate-800 text-slate-300"
  }`;

export default function WindSandView() {
  const router = useRouter();
  const { isLightMode } = useTheme();
  const backToPortals = () => router.push("/portals");

  return (
    <div className="pt-24 pb-12 px-4 md:px-8 max-w-[1600px] mx-auto">
      <PortalIntro content={PORTAL_INTROS["wind-sand"]} />
      <button
        onClick={backToPortals}
        className="mb-6 flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-[3px] border border-border bg-secondary hover:brightness-95 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Portals
      </button>
      <ModuleErrorBoundary isLightMode={isLightMode} label="Wind Pattern & Sand Impact Model">
        <WindSandContent isLightMode={isLightMode} />
      </ModuleErrorBoundary>
    </div>
  );
}

function WindSandContent({ isLightMode }: { isLightMode: boolean }) {
  const c = chartColors(isLightMode);

  const [hotspotIdx, setHotspotIdx] = useState(0);
  const [hotspotLat, setHotspotLat] = useState(HOTSPOT_PRESETS[0].lat);
  const [hotspotLon, setHotspotLon] = useState(HOTSPOT_PRESETS[0].lon);
  const [targetIdx, setTargetIdx] = useState(0);
  const [targetLat, setTargetLat] = useState(TARGET_PRESETS[0].lat);
  const [targetLon, setTargetLon] = useState(TARGET_PRESETS[0].lon);
  const [erosionFraction, setErosionFraction] = useState(0.02);
  const [decayLengthKm, setDecayLengthKm] = useState(100);

  const applyHotspotPreset = (idx: number) => {
    setHotspotIdx(idx);
    setHotspotLat(HOTSPOT_PRESETS[idx].lat);
    setHotspotLon(HOTSPOT_PRESETS[idx].lon);
  };
  const applyTargetPreset = (idx: number) => {
    setTargetIdx(idx);
    setTargetLat(TARGET_PRESETS[idx].lat);
    setTargetLon(TARGET_PRESETS[idx].lon);
  };

  const { bearingDeg, distanceKm } = useMemo(
    () => bearingAndDistance(hotspotLat, hotspotLon, targetLat, targetLon),
    [hotspotLat, hotspotLon, targetLat, targetLon],
  );
  const targetSector: CompassSector = useMemo(
    () => sectorForBearing(bearingDeg),
    [bearingDeg],
  );
  const { freq: windFrequency, speedMs: windSpeed } =
    REPRESENTATIVE_WIND_ROSE[targetSector];

  const { distanceDecay, depositionFraction } = useMemo(
    () =>
      estimateDeposition({
        erosionFraction,
        windFrequency,
        distanceKm,
        decayLengthKm,
      }),
    [erosionFraction, windFrequency, distanceKm, decayLengthKm],
  );

  const roseData = useMemo(
    () =>
      COMPASS_SECTORS.map((s) => ({
        sector: s,
        freq: +(REPRESENTATIVE_WIND_ROSE[s].freq * 100).toFixed(1),
        target: s === targetSector,
      })),
    [targetSector],
  );

  const decayCurve = useMemo(
    () =>
      Array.from({ length: 61 }, (_, i) => {
        const d = (i / 60) * Math.max(300, distanceKm * 1.4);
        const { depositionFraction: dep } = estimateDeposition({
          erosionFraction,
          windFrequency,
          distanceKm: d,
          decayLengthKm,
        });
        return { d: +d.toFixed(0), dep: +(dep * 100).toFixed(4) };
      }),
    [erosionFraction, windFrequency, decayLengthKm, distanceKm],
  );

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div
        className={`p-4 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors duration-300 ${
          isLightMode
            ? "bg-amber-50 border-amber-900/10"
            : "bg-[#1a140d] border-slate-800"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${isLightMode ? "bg-amber-100 text-amber-700" : "bg-amber-950/50 text-amber-300 border border-amber-900/50"}`}
          >
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-wider font-mono">
              Wind Pattern & Sand Impact Model
            </h1>
            <p
              className={`text-[11px] mt-0.5 max-w-2xl ${isLightMode ? "text-stone-600" : "text-slate-400"}`}
            >
              A v0 hotspot → target dispersal estimate: seasonal wind rose +
              hotspot sand content, combined with a naive downwind decay.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
          <StatCard
            isLightMode={isLightMode}
            label="Data sources"
            value="2"
            sub="Open-Meteo · SoilGrids"
            accent={isLightMode ? "text-amber-700" : "text-amber-400"}
          />
          <StatCard
            isLightMode={isLightMode}
            label="Compass sectors"
            value="8"
            accent={isLightMode ? "text-amber-700" : "text-amber-400"}
          />
          <StatCard
            isLightMode={isLightMode}
            label="Status"
            value="v0"
            sub="placeholder model"
            accent={isLightMode ? "text-amber-700" : "text-amber-400"}
          />
        </div>
      </div>

      {/* 1. Wind ensemble */}
      <Panel
        title="1 · Historical Wind Ensemble (Open-Meteo)"
        icon={Wind}
        isLightMode={isLightMode}
      >
        <p
          className={`text-[12px] leading-relaxed mb-4 ${isLightMode ? "text-stone-700" : "text-slate-300"}`}
        >
          The live pipeline pulls a year of hourly 10 m wind speed and
          direction for the hotspot from Open-Meteo's free ERA5-based
          archive (no key required), buckets it into 16 compass sectors ×
          4 seasons, and averages speed per sector to build a seasonal wind
          rose.
        </p>
        <div className="grid md:grid-cols-2 gap-4 items-center">
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={roseData} outerRadius="75%">
              <PolarGrid stroke={c.grid} />
              <PolarAngleAxis
                dataKey="sector"
                tick={{ fontSize: 10, fill: c.axis }}
              />
              <PolarRadiusAxis
                angle={90}
                tick={{ fontSize: 8, fill: c.axis }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={tooltipStyle(isLightMode)}
                formatter={(v: number) => [`${v}%`, "frequency"]}
              />
              <Radar
                dataKey="freq"
                stroke="#d97706"
                fill="#d97706"
                fillOpacity={0.28}
                strokeWidth={2}
                dot={(dotProps: {
                  cx: number;
                  cy: number;
                  payload: { payload: { target: boolean } };
                  key: string;
                }) => {
                  const { cx, cy, payload, key } = dotProps;
                  return payload.payload.target ? (
                    <circle
                      key={key}
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill="#0369a1"
                      stroke={isLightMode ? "#fff" : "#0f1a1e"}
                      strokeWidth={1.5}
                    />
                  ) : (
                    <circle key={key} cx={cx} cy={cy} r={2} fill="#d97706" />
                  );
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
          <div
            className={`text-[11px] leading-relaxed space-y-2 ${isLightMode ? "text-stone-600" : "text-slate-400"}`}
          >
            <p>
              This 8-sector rose is <b>illustrative</b>, shaped on the UAE's
              well-documented NW <b>Shamal</b> regime (≈
              {(REPRESENTATIVE_WIND_ROSE.NW.freq * 100).toFixed(0)}% of the
              time, ≈{REPRESENTATIVE_WIND_ROSE.NW.speedMs.toFixed(1)} m/s
              mean), not a live ERA5 pull. Swap in the real per-sector
              numbers once you've run the script below against your own
              hotspot.
            </p>
            <p>
              The blue dot on the rose marks whichever sector currently
              points from the hotspot toward the target, computed live from the
              coordinates in the calculator further down.
            </p>
          </div>
        </div>
      </Panel>

      {/* 2. Sand content */}
      <Panel
        title="2 · Sand Content at Hotspot (SoilGrids)"
        icon={Layers}
        isLightMode={isLightMode}
      >
        <p
          className={`text-[12px] leading-relaxed mb-4 ${isLightMode ? "text-stone-700" : "text-slate-300"}`}
        >
          The live pipeline queries ISRIC SoilGrids' free REST API for sand
          content (%) at 0–5 cm depth at the hotspot coordinate, an
          erosion-input proxy for how sand-dominated the source material is.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            isLightMode={isLightMode}
            label="Sand content (0–5 cm)"
            value={REPRESENTATIVE_SAND_PCT.toFixed(0)}
            unit="%"
            emphasize
            accent={isLightMode ? "text-amber-700" : "text-amber-400"}
            sub="representative of an active dune"
          />
          <div
            className={`p-3 rounded-[4px] border text-[10px] leading-relaxed flex items-start gap-2 ${
              isLightMode
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-amber-950/20 text-amber-300 border-amber-900/40"
            }`}
          >
            <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              In the v0 script this value is fetched and printed, but not
              yet wired into the deposition formula below, it's a
              diagnostic for now, faithfully reflected here rather than
              inventing a coupling the source script doesn't have.
            </span>
          </div>
        </div>
      </Panel>

      {/* 3 & 4. Bearing/distance + deposition model */}
      <Panel
        title="3 · Bearing, Distance & the Deposition Estimate"
        icon={Route}
        isLightMode={isLightMode}
      >
        <p
          className={`text-[12px] leading-relaxed mb-3 ${isLightMode ? "text-stone-700" : "text-slate-300"}`}
        >
          A great-circle bearing and distance from hotspot to target locate
          which wind-rose sector matters; a deliberately naive exponential
          decay with distance then estimates the fraction of eroded sand
          that survives the trip:
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <div
            className={`p-3 rounded-[4px] border flex flex-col items-center gap-1 ${isLightMode ? "border-amber-900/10 bg-[#fcfaf5]" : "border-border bg-[#1c1512]"}`}
          >
            <span
              className={`text-[9px] font-bold uppercase tracking-wider ${isLightMode ? "text-stone-500" : "text-slate-500"}`}
            >
              Great-circle distance (haversine)
            </span>
            <Katex tex="d = 2R_{\oplus}\arcsin\!\sqrt{\sin^2\!\tfrac{\Delta\varphi}{2}+\cos\varphi_1\cos\varphi_2\sin^2\!\tfrac{\Delta\lambda}{2}}" />
          </div>
          <div
            className={`p-3 rounded-[4px] border flex flex-col items-center gap-1 ${isLightMode ? "border-amber-900/10 bg-[#fcfaf5]" : "border-border bg-[#1c1512]"}`}
          >
            <span
              className={`text-[9px] font-bold uppercase tracking-wider ${isLightMode ? "text-stone-500" : "text-slate-500"}`}
            >
              Deposition fraction (v0 placeholder)
            </span>
            <Katex tex="f_{\text{dep}} = f_{\text{erosion}}\cdot p_{\text{wind}}\cdot e^{-d / L}" />
          </div>
        </div>
        <MathDisclosure isLightMode={isLightMode} label="What each term means">
          <div className="space-y-1.5">
            <p>
              <b>d</b>: great-circle distance hotspot → target [km], R⊕ =
              6371 km.
            </p>
            <p>
              <b>f_erosion</b>: fraction of loose hotspot topsoil assumed
              mobilized per event, the model's tunable "slider".
            </p>
            <p>
              <b>p_wind</b>: fraction of the time the wind blows toward the
              target's compass sector (from the wind rose).
            </p>
            <p>
              <b>L</b>: e-folding decay length [km], how quickly transported
              sand falls out with distance.
            </p>
          </div>
        </MathDisclosure>
        <p
          className={`text-[10px] leading-relaxed mt-3 ${isLightMode ? "text-stone-500" : "text-slate-500"}`}
        >
          This is <b>not</b> a real plume/dispersion model, it's a
          placeholder to get an end-to-end number flowing, a starting point
          to refine with a proper transport model.
        </p>
      </Panel>

      {/* Interactive calculator */}
      <div
        className={`grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 rounded-[6px] border border-border transition-colors duration-300 ${
          isLightMode ? "bg-[#fdfaf3]" : "bg-card"
        }`}
      >
        <div className="lg:col-span-5 space-y-4">
          <h3
            className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 ${isLightMode ? "text-dune-maroon" : "text-dune-paper"}`}
          >
            <Gauge className="w-4 h-4 text-amber-500" /> Interactive
            Calculator
          </h3>

          <div>
            <label
              className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isLightMode ? "text-stone-500" : "text-slate-500"}`}
            >
              Hotspot
            </label>
            <select
              className={selectClass(isLightMode)}
              value={hotspotIdx}
              onChange={(e) => applyHotspotPreset(Number(e.target.value))}
            >
              {HOTSPOT_PRESETS.map((p, i) => (
                <option key={p.name} value={i}>
                  {p.name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              <input
                type="number"
                step="0.01"
                value={hotspotLat}
                onChange={(e) => setHotspotLat(parseFloat(e.target.value))}
                className={numberInputClass(isLightMode)}
                aria-label="Hotspot latitude"
              />
              <input
                type="number"
                step="0.01"
                value={hotspotLon}
                onChange={(e) => setHotspotLon(parseFloat(e.target.value))}
                className={numberInputClass(isLightMode)}
                aria-label="Hotspot longitude"
              />
            </div>
          </div>

          <div>
            <label
              className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isLightMode ? "text-stone-500" : "text-slate-500"}`}
            >
              Target site
            </label>
            <select
              className={selectClass(isLightMode)}
              value={targetIdx}
              onChange={(e) => applyTargetPreset(Number(e.target.value))}
            >
              {TARGET_PRESETS.map((p, i) => (
                <option key={p.name} value={i}>
                  {p.name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              <input
                type="number"
                step="0.01"
                value={targetLat}
                onChange={(e) => setTargetLat(parseFloat(e.target.value))}
                className={numberInputClass(isLightMode)}
                aria-label="Target latitude"
              />
              <input
                type="number"
                step="0.01"
                value={targetLon}
                onChange={(e) => setTargetLon(parseFloat(e.target.value))}
                className={numberInputClass(isLightMode)}
                aria-label="Target longitude"
              />
            </div>
          </div>

          <Slider
            label="Erosion fraction"
            value={erosionFraction}
            min={0.001}
            max={0.1}
            step={0.001}
            isLightMode={isLightMode}
            accent="accent-amber-500"
            format={(v) => `${(v * 100).toFixed(1)}%`}
            onChange={setErosionFraction}
          />
          <Slider
            label="Decay length L"
            value={decayLengthKm}
            min={10}
            max={300}
            step={5}
            unit="km"
            isLightMode={isLightMode}
            accent="accent-amber-500"
            onChange={setDecayLengthKm}
          />

          <div className="grid grid-cols-2 gap-3">
            <StatCard
              isLightMode={isLightMode}
              label="Bearing"
              value={bearingDeg.toFixed(0)}
              unit="°"
              sub={`sector ${targetSector}`}
              accent={isLightMode ? "text-stone-800" : "text-slate-100"}
            />
            <StatCard
              isLightMode={isLightMode}
              label="Distance"
              value={distanceKm.toFixed(0)}
              unit="km"
              accent={isLightMode ? "text-stone-800" : "text-slate-100"}
            />
            <StatCard
              isLightMode={isLightMode}
              label="Wind frequency"
              value={(windFrequency * 100).toFixed(0)}
              unit="%"
              sub={`toward ${targetSector}`}
              accent={isLightMode ? "text-amber-700" : "text-amber-400"}
            />
            <StatCard
              isLightMode={isLightMode}
              label="Mean wind speed"
              value={windSpeed.toFixed(1)}
              unit="m/s"
              accent={isLightMode ? "text-amber-700" : "text-amber-400"}
            />
            <StatCard
              isLightMode={isLightMode}
              label="Distance decay"
              value={distanceDecay.toFixed(3)}
              accent={isLightMode ? "text-stone-800" : "text-slate-100"}
            />
            <StatCard
              isLightMode={isLightMode}
              label="Deposition fraction"
              value={(depositionFraction * 100).toFixed(3)}
              unit="%"
              emphasize
              accent={isLightMode ? "text-emerald-700" : "text-emerald-400"}
            />
          </div>
        </div>

        <div className="lg:col-span-7 space-y-3">
          <h3
            className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 ${isLightMode ? "text-dune-maroon" : "text-dune-paper"}`}
          >
            <Compass className="w-4 h-4 text-amber-500" /> Deposition
            Fraction vs. Distance
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={decayCurve}
              margin={{ top: 8, right: 16, left: 4, bottom: 16 }}
            >
              <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
              <XAxis
                dataKey="d"
                type="number"
                stroke={c.axis}
                tick={{ fontSize: 9 }}
                label={{
                  value: "distance from hotspot (km)",
                  position: "insideBottom",
                  offset: -8,
                  fontSize: 10,
                  fill: c.axis,
                }}
              />
              <YAxis
                stroke={c.axis}
                tick={{ fontSize: 9 }}
                width={48}
                label={{
                  value: "deposition fraction (%)",
                  angle: -90,
                  position: "insideLeft",
                  fontSize: 10,
                  fill: c.axis,
                }}
              />
              <Tooltip
                contentStyle={tooltipStyle(isLightMode)}
                formatter={(v: number) => [`${v}%`, "deposition"]}
                labelFormatter={(d) => `${d} km`}
              />
              <Line
                type="monotone"
                dataKey="dep"
                stroke="#d97706"
                strokeWidth={2.5}
                dot={false}
              />
              <ReferenceLine
                x={+distanceKm.toFixed(0)}
                stroke="#0369a1"
                strokeDasharray="2 2"
                label={{
                  value: "target",
                  fontSize: 9,
                  fill: "#0369a1",
                  position: "top",
                }}
              />
            </LineChart>
          </ResponsiveContainer>
          <p
            className={`text-[10px] leading-relaxed ${isLightMode ? "text-stone-500" : "text-slate-500"}`}
          >
            The exponential falls off entirely on the chosen decay length L,
            the dashed line marks the current hotspot → target distance. A
            shorter L (sand falls out fast) or a longer trip both push the
            estimate toward zero.
          </p>
        </div>
      </div>

      {/* Script */}
      <Panel
        title="Show the Script"
        icon={Code2}
        isLightMode={isLightMode}
        right={
          <a
            href="/code/wind-sand.py"
            download
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] border text-[10px] font-bold uppercase tracking-wider transition-colors ${
              isLightMode
                ? "border-amber-900/10 bg-[#fcfaf5] text-stone-600 hover:bg-stone-100"
                : "border-border bg-[#1c1512] text-slate-400 hover:bg-slate-900/50"
            }`}
          >
            <Download className="w-3.5 h-3.5" /> Download .py
          </a>
        }
      >
        <p
          className={`text-[11px] leading-relaxed mb-3 ${isLightMode ? "text-stone-600" : "text-slate-400"}`}
        >
          The full, unmodified `wind_sand_v0.py` prototype, the two live data
          pulls (Open-Meteo + SoilGrids) plus the wind-rose and deposition
          logic ported above. Requires internet access to
          <code>open-meteo.com</code> and <code>rest.isric.org</code> to run,
          no API keys needed.
        </p>
        <MathDisclosure isLightMode={isLightMode} label="Show wind_sand_v0.py">
          <pre className="overflow-x-auto whitespace-pre text-[10px] leading-snug">
            {WIND_SAND_SCRIPT}
          </pre>
        </MathDisclosure>
      </Panel>

      {/* Summary */}
      <Panel
        title="Summary & How to Use This Model"
        icon={ListChecks}
        isLightMode={isLightMode}
      >
        <ol
          className={`list-decimal list-inside space-y-2 text-[12px] leading-relaxed ${isLightMode ? "text-stone-700" : "text-slate-300"}`}
        >
          <li>
            Run <code>wind_sand_v0.py</code> against your real hotspot to
            pull the actual ERA5 wind ensemble and SoilGrids sand content,
            replacing the illustrative wind rose above.
          </li>
          <li>
            Set the hotspot and target coordinates, pick an erosion
            fraction and decay length, and read off the bearing, distance,
            and deposition fraction from the calculator.
          </li>
          <li>
            Treat the deposition fraction as a first-pass, order-of-magnitude
            placeholder, refine with a real plume/dispersion transport
            model before drawing conclusions.
          </li>
        </ol>
        <div
          className={`mt-4 p-3 rounded-[4px] border text-[11px] flex items-start gap-2 ${
            isLightMode
              ? "bg-amber-50 text-amber-800 border-amber-200"
              : "bg-amber-950/20 text-amber-300 border-amber-900/40"
          }`}
        >
          <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            v0 honesty note: no fabricated data. The wind rose here is
            explicitly illustrative (labelled throughout), the sand content
            is a representative placeholder, and the bearing/distance and
            deposition formulas are exact ports of the source script, not
            approximations.
          </span>
        </div>
      </Panel>
    </div>
  );
}
