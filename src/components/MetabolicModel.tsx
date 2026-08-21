import React, { useState, useMemo, useEffect } from "react";
import { MetabolicParams, SimulationStep } from "../types";
import { simulateMetabolicODE, calibrateKcat } from "../lib/physics";
import {
  Play,
  RotateCcw,
  Award,
  Dna,
  Database,
  ShieldAlert,
  Sparkles,
  Info,
} from "lucide-react";
import GlossaryTerm from "./GlossaryTerm";
import { ModuleActions } from "./simulation/_shared";
import { DUNE, HAIRLINE, STATUS, TINT } from "@/src/lib/palette";

interface MetabolicProps {
  params: MetabolicParams;
  setParams: React.Dispatch<React.SetStateAction<MetabolicParams>>;
  onUpdatePgaAccum?: (pga: number) => void;
  targetYield: number;
  setTargetYield: (val: number) => void;
  calibratedKcat: number | null;
  setCalibratedKcat: (val: number | null) => void;
  isLightMode?: boolean;
}

export default function MetabolicModel({
  params,
  setParams,
  onUpdatePgaAccum,
  targetYield,
  setTargetYield,
  calibratedKcat,
  setCalibratedKcat,
  isLightMode = false,
}: MetabolicProps) {
  // RK4 ODE integration, delegated to the shared physics core (single source of truth).
  const simulationData: SimulationStep[] = useMemo(
    () => simulateMetabolicODE(params),
    [params],
  );

  // Bubble up calculated yield changes
  const finalPga = simulationData[simulationData.length - 1]?.pga || 0;
  useEffect(() => {
    if (onUpdatePgaAccum) {
      onUpdatePgaAccum(finalPga);
    }
  }, [finalPga, onUpdatePgaAccum]);

  // Max values for plotting scale
  const maxVals = useMemo(() => {
    let maxMRNA = 0.1;
    let maxEnzyme = 0.1;
    let maxPGA = 0.1;
    simulationData.forEach((d) => {
      if (d.mRNA > maxMRNA) maxMRNA = d.mRNA;
      if (d.enzyme > maxEnzyme) maxEnzyme = d.enzyme;
      if (d.pga > maxPGA) maxPGA = d.pga;
    });
    return { mRNA: maxMRNA, enzyme: maxEnzyme, pga: maxPGA };
  }, [simulationData]);

  // Wet-lab calibration: reverse-solve k_cat for a measured yield (shared physics core).
  const handleCalibrate = () => {
    const estimatedKcat = calibrateKcat(params, targetYield);
    if (Number.isFinite(estimatedKcat) && estimatedKcat > 0) {
      setCalibratedKcat(parseFloat(estimatedKcat.toFixed(4)));
      setParams((prev) => ({
        ...prev,
        k_cat: parseFloat(estimatedKcat.toFixed(2)),
      }));
    }
  };

  const [activeHoverPoint, setActiveHoverPoint] =
    useState<SimulationStep | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // SVG dimensions
  const width = 600;
  const height = 320;
  const paddingLeft = 50;
  const paddingRight = 50;
  const paddingTop = 20;
  const paddingBottom = 40;

  // Convert points to SVG coordinates
  const points = useMemo(() => {
    return simulationData.map((d, index) => {
      const x =
        paddingLeft + (d.time / 48) * (width - paddingLeft - paddingRight);

      // Standardize heights to plot on dual scales: Left (mRNA & enzyme) vs Right (PGA output)
      const maxLeft = Math.max(maxVals.mRNA, maxVals.enzyme) * 1.1;
      const maxRight = maxVals.pga * 1.1;

      const yMRNA =
        height -
        paddingBottom -
        (d.mRNA / maxLeft) * (height - paddingTop - paddingBottom);
      const yEnzyme =
        height -
        paddingBottom -
        (d.enzyme / maxLeft) * (height - paddingTop - paddingBottom);
      const yPGA =
        height -
        paddingBottom -
        (d.pga / maxRight) * (height - paddingTop - paddingBottom);

      return { x, yMRNA, yEnzyme, yPGA, d, index };
    });
  }, [simulationData, maxVals]);

  const pathMRNA = useMemo(
    () => points.map((p) => `${p.x},${p.yMRNA}`).join(" "),
    [points],
  );
  const pathEnzyme = useMemo(
    () => points.map((p) => `${p.x},${p.yEnzyme}`).join(" "),
    [points],
  );
  const pathPGA = useMemo(
    () => points.map((p) => `${p.x},${p.yPGA}`).join(" "),
    [points],
  );

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const svgRect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - svgRect.left;

    // Find closest index
    const relativeX =
      (mouseX - paddingLeft) / (width - paddingLeft - paddingRight);
    let index = Math.round(relativeX * (simulationData.length - 1));
    index = Math.max(0, Math.min(simulationData.length - 1, index));

    if (index >= 0 && index < simulationData.length) {
      setActiveHoverPoint(simulationData[index]);
      setHoverIndex(index);
    }
  };

  const handleMouseLeave = () => {
    setActiveHoverPoint(null);
    setHoverIndex(null);
  };

  return (
    <div
      className={`grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 rounded-[6px] border transition-all duration-300 ${
        isLightMode
          ? "bg-card border-dune-orange/10"
          : "bg-dune-ink border-border "
      }`}
      id="metabolic-module-panel"
    >
      <div className="lg:col-span-12">
        <ModuleActions moduleId="metabolic" isLightMode={isLightMode} />
      </div>
      {/* Parameters Panel */}
      <div
        className={`lg:col-span-12 xl:col-span-5 p-6 rounded-[4px] border transition-colors duration-300 ${isLightMode ? "bg-white border-dune-orange/10" : "bg-dune-ink border-border"}`}
      >
        <h3
          className={`text-[length:var(--text-micro)] font-extrabold uppercase tracking-wider flex items-center gap-2 mb-4 font-sans ${isLightMode ? "text-dune-orange" : "text-foreground"}`}
        >
          <Dna
            className={`w-5 h-5 ${isLightMode ? "text-dune-teal" : "text-dune-teal"}`}
          />
          Intracellular Kinetic Control Unit
        </h3>

        {/* Sliders */}
        <div className="space-y-4 font-sans">
          <div>
            <div className="flex justify-between text-[length:var(--text-caption)] mb-1">
              <div className="group relative flex items-center gap-1 cursor-help">
                <span
                  className={`underline decoration-dotted underline-offset-2 ${isLightMode ? "text-muted-foreground decoration-border" : "text-muted-foreground decoration-border"}`}
                >
                  Transcription Rate (
                  <code
                    className={
                      isLightMode
                        ? "text-dune-teal font-mono font-bold"
                        : "text-dune-teal font-mono"
                    }
                  >
                    α_m
                  </code>
                  )
                </span>
                <Info
                  className={`w-3.5 h-3.5 ${isLightMode ? "text-muted-foreground hover:text-dune-teal" : "text-muted-foreground hover:text-dune-teal"} transition`}
                />
                <div
                  className={`absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 text-[length:var(--text-caption)] rounded-[4px] border z-25 font-sans leading-relaxed ${isLightMode ? "bg-white text-foreground border-dune-orange/15" : "bg-dune-basalt text-foreground border-border"}`}
                >
                  Rate of transcribing PgsBCA operon mRNA strands from the DNA
                  synthetic promoter.
                </div>
              </div>
              <span
                className={`font-mono px-2 py-1 rounded-[4px] text-[length:var(--text-caption)] ${isLightMode ? "bg-dune-teal/10 border border-dune-teal text-dune-teal font-bold" : "bg-dune-teal/50 border border-dune-teal/50 text-dune-teal"}`}
              >
                {params.alpha_m.toFixed(1)} h⁻¹
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="15"
              step="0.5"
              value={params.alpha_m}
              onChange={(e) =>
                setParams((p) => ({
                  ...p,
                  alpha_m: parseFloat(e.target.value),
                }))
              }
              className={`w-full cursor-ew-resize ${isLightMode ? "accent-dune-teal bg-secondary" : "accent-dune-teal"}`}
            />
          </div>

          <div>
            <div className="flex justify-between text-[length:var(--text-caption)] mb-1">
              <div className="group relative flex items-center gap-1 cursor-help">
                <span
                  className={`underline decoration-dotted underline-offset-2 ${isLightMode ? "text-muted-foreground decoration-border" : "text-muted-foreground decoration-border"}`}
                >
                  mRNA Half-life Degradation (
                  <code
                    className={
                      isLightMode
                        ? "text-dune-maroon font-mono font-bold"
                        : "text-dune-maroon font-mono"
                    }
                  >
                    β_m
                  </code>
                  )
                </span>
                <Info
                  className={`w-3.5 h-3.5 ${isLightMode ? "text-muted-foreground hover:text-dune-teal" : "text-muted-foreground hover:text-dune-teal"} transition`}
                />
                <div
                  className={`absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 text-[length:var(--text-caption)] rounded-[4px] border z-25 font-sans leading-relaxed ${isLightMode ? "bg-white text-foreground border-dune-orange/15" : "bg-dune-basalt text-foreground border-border"}`}
                >
                  Rate at which cellular RNases degrade the transcribed mRNA
                  species.
                </div>
              </div>
              <span
                className={`font-mono px-2 py-1 rounded-[4px] text-[length:var(--text-caption)] ${isLightMode ? "bg-dune-maroon/10 border border-dune-maroon text-dune-maroon font-bold" : "bg-dune-maroon/30 border border-dune-maroon/40 text-dune-maroon"}`}
              >
                {params.beta_m.toFixed(2)} h⁻¹
              </span>
            </div>
            <input
              type="range"
              min="0.01"
              max="1.0"
              step="0.05"
              value={params.beta_m}
              onChange={(e) =>
                setParams((p) => ({ ...p, beta_m: parseFloat(e.target.value) }))
              }
              className={`w-full cursor-ew-resize ${isLightMode ? "accent-dune-maroon bg-secondary" : "accent-dune-maroon"}`}
            />
          </div>

          <div>
            <div className="flex justify-between text-[length:var(--text-caption)] mb-1">
              <div className="group relative flex items-center gap-1 cursor-help">
                <span
                  className={`underline decoration-dotted underline-offset-2 ${isLightMode ? "text-muted-foreground decoration-border" : "text-muted-foreground decoration-border"}`}
                >
                  Enzyme Translation Rate (
                  <code
                    className={
                      isLightMode
                        ? "text-dune-teal font-mono font-bold"
                        : "text-dune-teal font-mono"
                    }
                  >
                    α_e
                  </code>
                  )
                </span>
                <Info
                  className={`w-3.5 h-3.5 ${isLightMode ? "text-muted-foreground hover:text-dune-teal" : "text-muted-foreground hover:text-dune-teal"} transition`}
                />
                <div
                  className={`absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 text-[length:var(--text-caption)] rounded-[4px] border z-25 font-sans leading-relaxed ${isLightMode ? "bg-white text-foreground border-dune-orange/15" : "bg-dune-basalt text-foreground border-border"}`}
                >
                  Ribosome recruitment speed to translate active PgsB, PgsC, and
                  PgsA enzymes.
                </div>
              </div>
              <span
                className={`font-mono px-2 py-1 rounded-[4px] text-[length:var(--text-caption)] ${isLightMode ? "bg-dune-teal/10 border border-dune-teal text-dune-teal font-bold" : "bg-dune-teal/50 border border-dune-teal/50 text-dune-teal"}`}
              >
                {params.alpha_e.toFixed(1)} h⁻¹
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="5.0"
              step="0.2"
              value={params.alpha_e}
              onChange={(e) =>
                setParams((p) => ({
                  ...p,
                  alpha_e: parseFloat(e.target.value),
                }))
              }
              className={`w-full cursor-ew-resize ${isLightMode ? "accent-dune-teal bg-secondary" : "accent-dune-teal"}`}
            />
          </div>

          <div>
            <div className="flex justify-between text-[length:var(--text-caption)] mb-1">
              <div className="group relative flex items-center gap-1 cursor-help">
                <span
                  className={`underline decoration-dotted underline-offset-2 ${isLightMode ? "text-muted-foreground decoration-border" : "text-muted-foreground decoration-border"}`}
                >
                  Enzyme Degradation (
                  <code
                    className={
                      isLightMode
                        ? "text-dune-orange font-mono font-bold"
                        : "text-dune-orange font-mono"
                    }
                  >
                    β_e
                  </code>
                  )
                </span>
                <Info
                  className={`w-3.5 h-3.5 ${isLightMode ? "text-muted-foreground hover:text-dune-teal" : "text-muted-foreground hover:text-dune-teal"} transition`}
                />
                <div
                  className={`absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 text-[length:var(--text-caption)] rounded-[4px] border z-25 font-sans leading-relaxed ${isLightMode ? "bg-white text-foreground border-dune-orange/15" : "bg-dune-basalt text-foreground border-border"}`}
                >
                  Intracellular enzyme clearance speed orchestrated by host cell
                  proteasome machinery.
                </div>
              </div>
              <span
                className={`font-mono px-2 py-1 rounded-[4px] text-[length:var(--text-caption)] ${isLightMode ? "bg-dune-orange/10 border border-dune-orange text-dune-orange font-bold" : "bg-dune-orange/30 border border-dune-orange/40 text-dune-orange"}`}
              >
                {params.beta_e.toFixed(3)} h⁻¹
              </span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.2"
              step="0.01"
              value={params.beta_e}
              onChange={(e) =>
                setParams((p) => ({ ...p, beta_e: parseFloat(e.target.value) }))
              }
              className={`w-full cursor-ew-resize ${isLightMode ? "accent-dune-orange bg-secondary" : "accent-dune-orange"}`}
            />
          </div>

          <div>
            <div className="flex justify-between text-[length:var(--text-caption)] mb-1">
              <div className="group relative flex items-center gap-1 cursor-help">
                <span
                  className={`underline decoration-dotted underline-offset-2 ${isLightMode ? "text-muted-foreground decoration-border" : "text-muted-foreground decoration-border"}`}
                >
                  <GlossaryTerm term="k-cat">Catalytic Efficiency</GlossaryTerm>{" "}
                  (
                  <code
                    className={
                      isLightMode
                        ? "text-dune-teal font-mono font-bold"
                        : "text-dune-teal font-mono"
                    }
                  >
                    k_cat
                  </code>
                  )
                </span>
                <Info
                  className={`w-3.5 h-3.5 ${isLightMode ? "text-muted-foreground hover:text-dune-teal" : "text-muted-foreground hover:text-dune-teal"} transition`}
                />
                <div
                  className={`absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 text-[length:var(--text-caption)] rounded-[4px] border z-25 font-sans leading-relaxed ${isLightMode ? "bg-white text-foreground border-dune-orange/15" : "bg-dune-basalt text-foreground border-border"}`}
                >
                  Maximum polymer chain synthesis turnover cycle count of the
                  PgsBCA complex per hour.
                </div>
              </div>
              <span
                className={`font-mono px-2 py-1 rounded-[4px] text-[length:var(--text-caption)] ${isLightMode ? "bg-dune-teal/10 border border-dune-teal text-dune-teal font-bold" : "bg-dune-teal/30 border border-dune-teal/40 text-dune-teal"}`}
              >
                {params.k_cat.toFixed(2)} h⁻¹
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="5.0"
              step="0.1"
              value={params.k_cat}
              onChange={(e) =>
                setParams((p) => ({ ...p, k_cat: parseFloat(e.target.value) }))
              }
              className={`w-full cursor-ew-resize ${isLightMode ? "accent-dune-teal bg-secondary" : "accent-dune-teal"}`}
            />
          </div>

          <div>
            <div className="flex justify-between text-[length:var(--text-caption)] mb-1">
              <div className="group relative flex items-center gap-1 cursor-help">
                <span
                  className={`underline decoration-dotted underline-offset-2 ${isLightMode ? "text-muted-foreground decoration-border" : "text-muted-foreground decoration-border"}`}
                >
                  L-Glutamate Precursor (
                  <code
                    className={
                      isLightMode
                        ? "text-dune-orange font-mono font-bold"
                        : "text-dune-orange font-mono"
                    }
                  >
                    [S]
                  </code>
                  )
                </span>
                <Info
                  className={`w-3.5 h-3.5 ${isLightMode ? "text-muted-foreground hover:text-dune-teal" : "text-muted-foreground hover:text-dune-teal"} transition`}
                />
                <div
                  className={`absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 text-[length:var(--text-caption)] rounded-[4px] border z-25 font-sans leading-relaxed ${isLightMode ? "bg-white text-foreground border-dune-orange/15" : "bg-dune-basalt text-foreground border-border"}`}
                >
                  Extracellular precursor feeding stock concentration providing
                  monomer units.
                </div>
              </div>
              <span
                className={`font-mono px-2 py-1 rounded-[4px] text-[length:var(--text-caption)] ${isLightMode ? "bg-dune-orange/10 border border-dune-orange text-dune-orange font-bold" : "bg-dune-orange/30 border border-dune-orange/40 text-dune-orange"}`}
              >
                {params.s_precursor.toFixed(1)} mM
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="25"
              step="0.5"
              value={params.s_precursor}
              onChange={(e) =>
                setParams((p) => ({
                  ...p,
                  s_precursor: parseFloat(e.target.value),
                }))
              }
              className={`w-full cursor-ew-resize ${isLightMode ? "accent-dune-orange bg-secondary" : "accent-dune-orange"}`}
            />
          </div>
        </div>

        {/* Gene Knockouts (Biosafety & Yield Hack) */}
        <div
          className="mt-6 pt-4 border-t border-border"
        >
          <span
            className={`text-[length:var(--text-caption)] font-bold block mb-4 uppercase tracking-wider font-mono ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
          >
            Gene Knockout Status
          </span>
          <div className="grid grid-cols-2 gap-4">
            <label
              className={`flex items-center justify-between p-2 rounded-[4px] border text-[length:var(--text-micro)] cursor-pointer transition ${
                params.ggtKnockout
                  ? isLightMode
                    ? "border-dune-teal bg-dune-teal/10 text-dune-teal"
                    : "border-dune-teal bg-dune-teal/20 text-dune-teal"
                  : isLightMode
                    ? "border-dune-orange/10 bg-background text-muted-foreground hover:text-foreground"
                    : "border-border bg-dune-ink text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex flex-col">
                <span className="font-mono font-bold">Δggt</span>
                <span
                  className={`text-[length:var(--text-caption)] font-mono ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
                >
                  Glutamyl-Tferase
                </span>
              </div>
              <input
                type="checkbox"
                checked={params.ggtKnockout}
                onChange={(e) =>
                  setParams((p) => ({ ...p, ggtKnockout: e.target.checked }))
                }
                className="rounded-[4px] accent-dune-teal ml-2"
              />
            </label>

            <label
              className={`flex items-center justify-between p-2 rounded-[4px] border text-[length:var(--text-micro)] cursor-pointer transition ${
                params.pgcAKnockout
                  ? isLightMode
                    ? "border-dune-teal bg-dune-teal/10 text-dune-teal"
                    : "border-dune-teal bg-dune-teal/20 text-dune-teal"
                  : isLightMode
                    ? "border-dune-orange/10 bg-background text-muted-foreground hover:text-foreground"
                    : "border-border bg-dune-ink text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex flex-col">
                <span className="font-mono font-bold">ΔpgcA</span>
                <span
                  className={`text-[length:var(--text-caption)] font-mono ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
                >
                  Glutamic Hydrolase
                </span>
              </div>
              <input
                type="checkbox"
                checked={params.pgcAKnockout}
                onChange={(e) =>
                  setParams((p) => ({ ...p, pgcAKnockout: e.target.checked }))
                }
                className="rounded-[4px] accent-dune-teal ml-2"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Analytics & Graph Panel */}
      <div
        className={`lg:col-span-12 xl:col-span-7 p-6 rounded-[4px] border flex flex-col justify-between transition-colors duration-300 ${isLightMode ? "bg-white border-dune-orange/10" : "bg-dune-ink border-border"}`}
      >
        <div>
          <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
            <h3
              className={`text-[length:var(--text-micro)] font-bold uppercase tracking-wider flex items-center gap-2 ${isLightMode ? "text-dune-orange" : "text-foreground"}`}
            >
              <Database
                className={`w-4 h-4 ${isLightMode ? "text-dune-teal" : "text-dune-teal"}`}
              />
              Real-time Concentration Dynamics
            </h3>
            <div className="flex gap-4 text-[length:var(--text-caption)] font-mono">
              <span
                className={`flex items-center gap-2 ${isLightMode ? "text-dune-teal font-bold" : "text-dune-teal"}`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${isLightMode ? "bg-dune-teal" : "bg-dune-teal"}`}
                ></span>{" "}
                mRNA
              </span>
              <span
                className={`flex items-center gap-2 ${isLightMode ? "text-dune-maroon font-bold" : "text-dune-maroon"}`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${isLightMode ? "bg-dune-maroon" : "bg-dune-maroon"}`}
                ></span>{" "}
                Enzyme Complex
              </span>
              <span
                className={`flex items-center gap-2 ${isLightMode ? "text-dune-teal font-bold" : "text-dune-teal"}`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${isLightMode ? "bg-dune-teal" : "bg-dune-teal"}`}
                ></span>{" "}
                γ-PGA Output
              </span>
            </div>
          </div>

          {/* SVG Graph */}
          <div
            className={`relative border rounded-[4px] p-2 overflow-hidden select-none transition-colors duration-300 ${isLightMode ? "bg-card border-dune-orange/10" : "bg-dune-ink border-border"}`}
          >
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto cursor-crosshair overflow-visible"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {/* Grid Lines */}
              {[4, 8, 12, 16, 20].map((v, i) => {
                const y =
                  paddingTop + (i * (height - paddingTop - paddingBottom)) / 4;
                return (
                  <line
                    key={v}
                    x1={paddingLeft}
                    y1={y}
                    x2={width - paddingRight}
                    y2={y}
                    stroke={isLightMode ? TINT.sandWash : DUNE.ink}
                    strokeDasharray="3,3"
                  />
                );
              })}
              {[12, 24, 36, 48].map((t) => {
                const x =
                  paddingLeft + (t / 48) * (width - paddingLeft - paddingRight);
                return (
                  <line
                    key={t}
                    x1={x}
                    y1={paddingTop}
                    x2={x}
                    y2={height - paddingBottom}
                    stroke={isLightMode ? TINT.sandWash : DUNE.ink}
                    strokeDasharray="3,3"
                  />
                );
              })}

              {/* Slotted Paths */}
              <polyline
                fill="none"
                strokeWidth={isLightMode ? "2.5" : "2"}
                stroke={isLightMode ? DUNE.orange : DUNE.teal}
                points={pathMRNA}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                fill="none"
                strokeWidth={isLightMode ? "2.5" : "2"}
                stroke={isLightMode ? TINT.orangeDeep : TINT.orangeLight}
                points={pathEnzyme}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                fill="none"
                strokeWidth={isLightMode ? "3.5" : "3"}
                stroke={isLightMode ? STATUS.good : STATUS.good}
                points={pathPGA}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Axes */}
              <line
                x1={paddingLeft}
                y1={height - paddingBottom}
                x2={width - paddingRight}
                y2={height - paddingBottom}
                stroke={isLightMode ? TINT.sandLight : HAIRLINE.dark}
                strokeWidth="1"
              />
              <line
                x1={paddingLeft}
                y1={paddingTop}
                x2={paddingLeft}
                y2={height - paddingBottom}
                stroke={isLightMode ? TINT.sandLight : HAIRLINE.dark}
                strokeWidth="1"
              />
              <line
                x1={width - paddingRight}
                y1={paddingTop}
                x2={width - paddingRight}
                y2={height - paddingBottom}
                stroke={isLightMode ? TINT.sandLight : HAIRLINE.dark}
                strokeWidth="1"
              />

              {/* Axis Labels */}
              <text
                x={paddingLeft - 8}
                y={paddingTop + 5}
                fill={isLightMode ? STATUS.bad : DUNE.ash}
                fontSize="10"
                textAnchor="end"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {Math.max(maxVals.mRNA, maxVals.enzyme).toFixed(1)}
              </text>
              <text
                x={paddingLeft - 8}
                y={height - paddingBottom}
                fill={isLightMode ? STATUS.bad : DUNE.ash}
                fontSize="10"
                textAnchor="end"
                fontWeight="bold"
                fontFamily="monospace"
              >
                0.0
              </text>
              <text
                x={paddingLeft - 32}
                y={height / 2}
                transform={`rotate(-90, ${paddingLeft - 32}, ${height / 2})`}
                fill={isLightMode ? DUNE.orange : DUNE.teal}
                fontSize="10"
                textAnchor="middle"
                fontWeight="bold"
                fontFamily="monospace"
                letterSpacing="0.05em"
              >
                SPECIES LEVEL (AU)
              </text>

              <text
                x={width - paddingRight + 8}
                y={paddingTop + 5}
                fill={isLightMode ? STATUS.good : STATUS.good}
                fontSize="10"
                textAnchor="start"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {maxVals.pga.toFixed(1)}
              </text>
              <text
                x={width - paddingRight + 8}
                y={height - paddingBottom}
                fill={isLightMode ? STATUS.good : STATUS.good}
                fontSize="10"
                textAnchor="start"
                fontWeight="bold"
                fontFamily="monospace"
              >
                0.0
              </text>
              <text
                x={width - paddingRight + 32}
                y={height / 2}
                transform={`rotate(90, ${width - paddingRight + 32}, ${height / 2})`}
                fill={isLightMode ? STATUS.good : STATUS.good}
                fontSize="10"
                textAnchor="middle"
                fontWeight="bold"
                fontFamily="monospace"
                letterSpacing="0.05em"
              >
                γ-PGA ACCUM. (mol/m³)
              </text>

              {/* Time tick labels */}
              {[0, 12, 24, 36, 48].map((t) => {
                const x =
                  paddingLeft + (t / 48) * (width - paddingLeft - paddingRight);
                return (
                  <text
                    key={t}
                    x={x}
                    y={height - paddingBottom + 16}
                    fill={isLightMode ? STATUS.bad : DUNE.ash}
                    fontSize="10"
                    textAnchor="middle"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {t}h
                  </text>
                );
              })}
              <text
                x={width / 2}
                y={height - 5}
                fill={isLightMode ? STATUS.bad : DUNE.ash}
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="monospace"
                letterSpacing="0.05em"
              >
                CULTIVATION DURATION (HOURS)
              </text>

              {/* Interactive Hover Point Element */}
              {hoverIndex !== null && activeHoverPoint && (
                <>
                  <line
                    x1={points[hoverIndex].x}
                    y1={paddingTop}
                    x2={points[hoverIndex].x}
                    y2={height - paddingBottom}
                    stroke={isLightMode ? TINT.sandDeep : DUNE.ash}
                    strokeWidth="1"
                    strokeDasharray="4,4"
                  />
                  <circle
                    cx={points[hoverIndex].x}
                    cy={points[hoverIndex].yMRNA}
                    r="5"
                    fill={isLightMode ? DUNE.orange : DUNE.teal}
                  />
                  <circle
                    cx={points[hoverIndex].x}
                    cy={points[hoverIndex].yEnzyme}
                    r="5"
                    fill={isLightMode ? TINT.orangeDeep : TINT.orangeLight}
                  />
                  <circle
                    cx={points[hoverIndex].x}
                    cy={points[hoverIndex].yPGA}
                    r="5"
                    fill={isLightMode ? STATUS.good : STATUS.good}
                  />
                </>
              )}
            </svg>

            {/* Hover tooltip absolute overlay */}
            {activeHoverPoint && (
              <div
                className={`absolute top-4 left-16 select-none pointer-events-none space-y-1 p-4 text-[length:var(--text-caption)] font-mono rounded-[4px] border ${
                  isLightMode
                    ? "bg-white/95 border-dune-orange/15 text-foreground "
                    : "bg-dune-ink/95 border border-border text-foreground"
                }`}
              >
                <p
                  className={`font-bold text-[length:var(--text-micro)] ${isLightMode ? "text-foreground" : "text-foreground"}`}
                >
                  T-Epoch: {activeHoverPoint.time.toFixed(2)} hrs
                </p>
                <p
                  className={
                    isLightMode
                      ? "text-dune-teal font-semibold"
                      : "text-dune-teal"
                  }
                >
                  mRNA level: {activeHoverPoint.mRNA.toFixed(3)}
                </p>
                <p
                  className={
                    isLightMode
                      ? "text-dune-maroon font-semibold"
                      : "text-dune-maroon"
                  }
                >
                  Pgs Enzyme: {activeHoverPoint.enzyme.toFixed(3)}
                </p>
                <p
                  className={
                    isLightMode
                      ? "text-dune-teal font-bold"
                      : "text-dune-teal font-bold"
                  }
                >
                  γ-PGA output: {activeHoverPoint.pga.toFixed(3)} mol/m³
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Wet Lab Calibration Assistant Module */}
        <div
          className={`mt-6 p-4 rounded-[4px] border relative overflow-hidden transition-colors ${
            isLightMode
              ? "bg-dune-orange/50 border-dune-orange/10"
              : "bg-dune-ink/60 border border-dune-teal/80"
          }`}
        >
          <div className="absolute right-3 top-3 opacity-5">
            <Award
              className={`w-16 h-16 ${isLightMode ? "text-dune-teal" : "text-dune-teal"}`}
            />
          </div>
          <h4
            className={`text-[length:var(--text-micro)] font-bold font-mono uppercase tracking-widest flex items-center gap-2 mb-2 ${isLightMode ? "text-dune-teal" : "text-dune-teal"}`}
          >
            <Sparkles
              className={`w-4 h-4 ${isLightMode ? "text-dune-teal" : "text-dune-teal"}`}
            />
            iGEM Wet Lab Calibration Interface
          </h4>
          <p
            className={`text-[length:var(--text-caption)] leading-relaxed mb-4 ${isLightMode ? "text-muted-foreground font-medium" : "text-muted-foreground"}`}
          >
            To integrate our dry-lab model with NYUAD laboratory assays: enter
            your spectrophotometric experimental yield to reverse-calibrate and
            store our synthetic enzyme efficiency rate (<code>k_cat</code>).
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-[4px] border ${isLightMode ? "bg-white border-dune-orange/15" : "bg-dune-ink border-border"}`}
            >
              <span
                className={`text-[length:var(--text-caption)] font-mono ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
              >
                EXPERIMENTAL YIELD:
              </span>
              <input
                type="number"
                value={targetYield}
                onChange={(e) =>
                  setTargetYield(Math.max(1, parseFloat(e.target.value) || 0))
                }
                className={`w-16 bg-transparent font-mono text-[length:var(--text-micro)] font-bold outline-none border-b border-transparent focus:border-dune-teal ${isLightMode ? "text-foreground" : "text-foreground"}`}
              />
              <span
                className={`text-[length:var(--text-caption)] font-mono ${isLightMode ? "text-dune-teal font-bold" : "text-dune-teal"}`}
              >
                mol/m³
              </span>
            </div>
            <button
              onClick={handleCalibrate}
              className={`px-4 py-2 text-[length:var(--text-caption)] font-mono font-bold rounded-[4px] uppercase tracking-wider transition flex items-center gap-1 cursor-pointer ${
                isLightMode
                  ? "text-foreground bg-dune-teal hover:bg-dune-teal"
                  : "text-black bg-dune-teal hover:bg-dune-teal"
              }`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Calibrate k_cat
            </button>
            {calibratedKcat !== null && (
              <span
                className={`text-[length:var(--text-caption)] font-mono px-2 py-1 rounded-[4px] border ${
                  isLightMode
                    ? "bg-dune-teal/10 border-dune-teal text-dune-teal font-bold"
                    : "bg-dune-teal/50 border border-dune-teal"
                }`}
              >
                CALIBRATED:{" "}
                <code
                  className={isLightMode ? "text-dune-teal" : "text-foreground"}
                >
                  k_cat = {calibratedKcat}
                </code>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
