import React, { useMemo, useEffect } from "react";
import {
  Thermometer,
  Droplet,
  Percent,
  TrendingDown,
  Lock,
  Unlock,
  AlertTriangle,
  Compass,
  Activity,
  Sparkles,
  Info,
} from "lucide-react";
import GlossaryTerm from "./GlossaryTerm";
import { ModuleActions } from "./simulation/_shared";
import { DUNE, STATUS, SURFACE } from "@/src/lib/palette";

interface ProteinThermalDecayProps {
  isLightMode: boolean;
  temperature?: number;
  pH?: number;
  salinity?: number;
  onUpdateEnvironmentalModifier?: (modifier: number) => void;
}

export default function ProteinThermalDecay({
  isLightMode,
  temperature: initialTemp = 25,
  pH: initialPh = 7.4,
  salinity: initialSalinity = 1.0,
  onUpdateEnvironmentalModifier,
}: ProteinThermalDecayProps) {
  // Local state for environmental conditions
  const [temperature, setTemperature] = React.useState<number>(initialTemp);
  const [pH, setPh] = React.useState<number>(initialPh);
  const [salinity, setSalinity] = React.useState<number>(initialSalinity);

  // Constants for B. subtilis engineered gamma-PGA stabilizing protein scaffold representation
  const T_MELTING_BASE = 52.0; // Baseline denaturation midpoint temperature in Celsius
  const STABILITY_FACTOR = 4.5; // Slope factor of transition (Boltzmann width)

  // Derived Stability Parameters based on biochemical pH/salt environment
  const derivedParameters = useMemo(() => {
    // Stability is maximal at pH 7.2 - 7.6. Deviations weaken folding structural integrity.
    const pHDeviation = pH - 7.4;
    const pH_Tm_Penalty = -3.2 * Math.pow(pHDeviation, 2);

    // Ionic strength protects up to 1.2%, extreme hypersalinity details denature proteins
    const salinityDeviation = salinity - 1.2;
    const salinity_Tm_Penalty = -4.5 * Math.pow(salinityDeviation, 2);

    // Calculate actual operative melting temperature
    const operativeT_melting = Math.max(
      25.0,
      T_MELTING_BASE + pH_Tm_Penalty + salinity_Tm_Penalty,
    );

    // Operational integrity (fraction folded f_folded) using modified Boltzmann equation
    const exponent = (temperature - operativeT_melting) / STABILITY_FACTOR;
    const f_folded = 1.0 / (1.0 + Math.exp(exponent));

    // Environmental viability multiplier is the folding fraction itself
    const viabilityMultiplier = Math.max(0.01, Math.min(1.0, f_folded));

    return {
      operativeT_melting,
      viabilityMultiplier,
      foldedPercentage: viabilityMultiplier * 100,
    };
  }, [temperature, pH, salinity]);

  const { operativeT_melting, viabilityMultiplier, foldedPercentage } =
    derivedParameters;

  // Propagate environmental modifier downstream to influence material crosslinking elasticity
  useEffect(() => {
    if (onUpdateEnvironmentalModifier) {
      onUpdateEnvironmentalModifier(viabilityMultiplier);
    }
  }, [viabilityMultiplier, onUpdateEnvironmentalModifier]);

  // Generate data coordinates for plotting the folded fraction curve from 0°C to 70°C
  const graphCoordinates = useMemo(() => {
    const points: { x: number; y: number; temp: number }[] = [];
    const width = 380;
    const height = 160;

    for (let t = 0; t <= 70; t += 2) {
      const exponent = (t - operativeT_melting) / STABILITY_FACTOR;
      const f = 1.0 / (1.0 + Math.exp(exponent));

      // Map to SVG ViewBox space: x from 0 to 70 mapping to 0 to width
      const svgX = (t / 70) * width;
      // y from 0 to 1 mapping to height down to 0 (since SVG starting coordinates starts from top-left)
      const svgY = height - f * height;

      points.push({ x: svgX, y: svgY, temp: t });
    }

    return points;
  }, [operativeT_melting]);

  // SVG Drawing Path path
  const pathData = useMemo(() => {
    if (graphCoordinates.length === 0) return "";
    return graphCoordinates.reduce((acc, pt, idx) => {
      const command = idx === 0 ? "M" : "L";
      return `${acc} ${command} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    }, "");
  }, [graphCoordinates]);

  // Map the current selected temperature point onto the SVG layout
  const currentIndicatorPos = useMemo(() => {
    const width = 380;
    const height = 160;
    const svgX = (temperature / 70) * width;
    const svgY = height - viabilityMultiplier * height;
    return { x: svgX, y: svgY };
  }, [temperature, viabilityMultiplier]);

  return (
    <div
      className={`p-6 rounded-[6px] border transition-all duration-300 font-sans ${
        isLightMode
          ? "bg-card border-dune-orange/10"
          : "bg-dune-ink border-border"
      }`}
      id="protein-thermal-decay-frame"
    >
      {/* Title block */}
      <div className="flex items-center gap-4 mb-6">
        <div
          className={`p-2 rounded-[4px] ${isLightMode ? "bg-dune-orange text-dune-orange" : "bg-dune-orange/45 text-dune-orange"}`}
        >
          <Thermometer className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-[length:var(--text-micro)] font-black uppercase tracking-wider font-mono">
            Protein Conformational &amp; Thermal Decay
          </h3>
          <p className="text-[length:var(--text-caption)] text-muted-foreground mt-1">
            Thermodynamic folding state f_folded mapping of sandy soil
            biopolymers.
          </p>
        </div>
      </div>

      <div className="mb-6">
        <ModuleActions moduleId="thermal" isLightMode={isLightMode} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Sliders Control Panel */}
        <div className="md:col-span-5 space-y-4">
          <div
            className={`p-4 rounded-[4px] border space-y-4 ${
              isLightMode
                ? "bg-dune-orange/50 border-dune-orange/5"
                : "bg-dune-ink/60 border-border"
            }`}
          >
            <h4 className="text-[length:var(--text-caption)] font-extrabold uppercase tracking-widest text-dune-teal font-mono flex items-center gap-2 pb-1 border-b border-dashed border-border">
              <Compass className="h-3.5 w-3.5" /> Soil Micro-Climate Inputs
            </h4>

            {/* Temperature Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[length:var(--text-caption)]">
                <span className="font-semibold flex items-center gap-1">
                  <Thermometer className="h-3.5 w-3.5 text-dune-maroon" /> Target
                  Temperature:
                </span>
                <span
                  className={`font-mono font-bold ${temperature >= 45 ? "text-dune-rose" : "text-dune-teal"}`}
                >
                  {temperature.toFixed(1)} °C
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="65"
                step="0.5"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-1 bg-card rounded-[4px] appearance-none cursor-pointer accent-dune-orange"
              />
            </div>

            {/* pH Meter Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[length:var(--text-caption)]">
                <span className="font-semibold flex items-center gap-1">
                  <Droplet className="h-3.5 w-3.5 text-dune-teal" /> Soil pH Level:
                </span>
                <span className="font-mono font-bold text-dune-teal">
                  {pH.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="4.0"
                max="10.0"
                step="0.1"
                value={pH}
                onChange={(e) => setPh(parseFloat(e.target.value))}
                className="w-full h-1 bg-card rounded-[4px] appearance-none cursor-pointer accent-dune-teal"
              />
            </div>

            {/* Salinity Percentage Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[length:var(--text-caption)]">
                <span className="font-semibold flex items-center gap-1">
                  <Percent className="h-3.5 w-3.5 text-dune-teal" /> Ground
                  Salinity/Ions:
                </span>
                <span className="font-mono font-bold text-dune-teal">
                  {salinity.toFixed(2)} %
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="5.0"
                step="0.1"
                value={salinity}
                onChange={(e) => setSalinity(parseFloat(e.target.value))}
                className="w-full h-1 bg-card rounded-[4px] appearance-none cursor-pointer accent-dune-teal"
              />
            </div>
          </div>

          {/* Current Denaturation Properties readout info */}
          <div
            className={`p-4 rounded-[4px] border text-[length:var(--text-micro)] space-y-2 ${
              isLightMode
                ? "bg-card border-dune-orange/10"
                : "bg-dune-ink border-border"
            }`}
          >
            <div className="flex justify-between items-center text-[length:var(--text-caption)]">
              <span className="text-muted-foreground uppercase font-mono text-[length:var(--text-caption)]">
                Operative Melting Point $T_m$:
              </span>
              <span className="font-mono font-bold text-foreground">
                {operativeT_melting.toFixed(2)} °C
              </span>
            </div>
            <div className="flex justify-between items-center text-[length:var(--text-caption)]">
              <span className="text-muted-foreground uppercase font-mono text-[length:var(--text-caption)]">
                Folding Half-Life State:
              </span>
              <span
                className={`font-mono font-extrabold ${foldedPercentage < 50 ? "text-dune-maroon" : "text-dune-teal"}`}
              >
                {foldedPercentage.toFixed(1)} % folded
              </span>
            </div>
          </div>
        </div>

        {/* Live SVG Graph Visualizer (7 Cols) */}
        <div className="md:col-span-7 flex flex-col justify-between">
          {/* Live Folded State Plot */}
          <div
            className={`p-4 rounded-[4px] border ${
              isLightMode
                ? "bg-card border-dune-orange/5"
                : "bg-dune-ink/90 border-border"
            }`}
          >
            <div className="flex justify-between items-center mb-2 text-[length:var(--text-caption)] font-mono uppercase text-muted-foreground">
              <span className="flex items-center gap-1">
                <Activity className="h-3.5 w-3.5 text-dune-rose" />{" "}
                <GlossaryTerm term="folding-curve">
                  Operative Folding Curve
                </GlossaryTerm>
              </span>
              <span>
                T_melting midpoint = {operativeT_melting.toFixed(1)}°C
              </span>
            </div>

            {/* Plot graphic */}
            <div className="relative h-[180px] w-full">
              <svg
                viewBox="0 0 380 180"
                width="100%"
                height="100%"
                className="overflow-visible"
              >
                {/* Horizontal reference lines */}
                <line
                  x1="0"
                  y1="0"
                  x2="380"
                  y2="0"
                  stroke={DUNE.ash}
                  strokeDasharray="2,3"
                  strokeWidth="0.8"
                />
                <line
                  x1="0"
                  y1="80"
                  x2="380"
                  y2="80"
                  stroke={DUNE.ash}
                  strokeDasharray="1,4"
                  strokeWidth="0.8"
                />
                <line
                  x1="0"
                  y1="160"
                  x2="380"
                  y2="160"
                  stroke={DUNE.ash}
                  strokeWidth="1"
                />

                {/* Vertical melting midpoint line */}
                <line
                  x1={(operativeT_melting / 70) * 380}
                  y1="0"
                  x2={(operativeT_melting / 70) * 380}
                  y2="160"
                  stroke={STATUS.bad}
                  strokeDasharray="3,3"
                  strokeWidth="0.8"
                  opacity="0.65"
                />

                {/* Curve plotting */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={foldedPercentage < 40 ? DUNE.rose : DUNE.rose}
                  strokeWidth="2.5"
                  className="transition-all duration-300"
                />

                {/* Background gradient below curve */}
                <path
                  d={`${pathData} L 380 160 L 0 160 Z`}
                  fill={
                    foldedPercentage < 40
                      ? "url(#grad-red)"
                      : "url(#grad-green)"
                  }
                  opacity="0.1"
                  className="transition-all duration-300"
                />

                {/* Glowing Dot representing state */}
                <g className="transition-all duration-300">
                  <circle
                    cx={currentIndicatorPos.x}
                    cy={currentIndicatorPos.y}
                    r="8"
                    fill={DUNE.rose}
                    opacity="0.25"
                    className="animate-ping"
                    style={{ animationDuration: "2s" }}
                  />
                  <circle
                    cx={currentIndicatorPos.x}
                    cy={currentIndicatorPos.y}
                    r="4"
                    fill={STATUS.bad}
                    stroke={SURFACE.light}
                    strokeWidth="1"
                  />
                </g>

                {/* Subtext markers */}
                <text
                  x="5"
                  y="12"
                  fontSize="10"
                  fill={DUNE.ash}
                  className="font-mono"
                >
                  100% Folded (Active)
                </text>
                <text
                  x="5"
                  y="156"
                  fontSize="10"
                  fill={DUNE.ash}
                  className="font-mono"
                >
                  0% Folded (Denatured)
                </text>
                <text
                  x="375"
                  y="172"
                  fontSize="10"
                  fill={DUNE.ash}
                  className="font-mono"
                  textAnchor="end"
                >
                  70 °C
                </text>
                <text
                  x="5"
                  y="172"
                  fontSize="10"
                  fill={DUNE.ash}
                  className="font-mono"
                >
                  0 °C
                </text>
                <text
                  x={(operativeT_melting / 70) * 380}
                  y="172"
                  fontSize="10"
                  fill={STATUS.bad}
                  className="font-mono font-bold"
                  textAnchor="middle"
                >
                  Tm ({operativeT_melting.toFixed(0)}°C)
                </text>

                {/* Definitions */}
                <defs>
                  <linearGradient
                    id="grad-green"
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor={DUNE.rose} />
                    <stop offset="100%" stopColor={DUNE.rose} stopOpacity="0" />
                  </linearGradient>
                  <linearGradient
                    id="grad-red"
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor={DUNE.rose} />
                    <stop offset="100%" stopColor={DUNE.rose} stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Actionable Warning Box Panel */}
          <div className="mt-4">
            {foldedPercentage < 50 ? (
              <div className="p-4 bg-dune-maroon/20 border border-dune-maroon/60 rounded-[4px] flex items-start gap-2 text-[length:var(--text-caption)] text-dune-maroon">
                <AlertTriangle className="h-4 w-4 text-dune-maroon shrink-0 mt-1" />
                <div>
                  <strong className="font-black uppercase tracking-wider block mb-1">
                    Critical Thermophilic Integrity Loss!
                  </strong>
                  Severe local micro-climate triggers protein denaturation. The
                  cross-linked biofilm protection coefficient drops by{" "}
                  <span className="font-bold font-mono text-foreground text-[length:var(--text-micro)]">
                    {((1.0 - viabilityMultiplier) * 100).toFixed(0)}%
                  </span>
                  .
                </div>
              </div>
            ) : (
              <div className="p-4 bg-dune-teal/15 border border-dune-teal/40 rounded-[4px] flex items-start gap-2 text-[length:var(--text-caption)] text-dune-teal">
                <Sparkles
                  className="h-4 w-4 text-dune-teal shrink-0 mt-1 animate-spin"
                  style={{ animationDuration: "10s" }}
                />
                <div>
                  <strong className="font-bold uppercase tracking-wider block mb-1">
                    Structural Fold State Optimized
                  </strong>
                  The biopolymer scaffold maintains secure structural
                  configurations, enabling high adhesive cohesion across soil
                  sand boundaries.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
