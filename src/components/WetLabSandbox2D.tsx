import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Wind,
  ShieldCheck,
  HelpCircle,
  Sliders,
  RefreshCw,
  Layers,
  ArrowLeft,
  Play,
  Pause,
  Thermometer,
  Droplet,
  Beaker,
} from "lucide-react";
import GlossaryTerm from "./GlossaryTerm";
import { ModuleActions } from "./simulation/_shared";

interface WetLabSandbox2DProps {
  onBack: () => void;
  universalVitals?: {
    pgaAccum: number;
    shearModulus: number;
  };
  isLightMode?: boolean;
}

export default function WetLabSandbox2D({
  onBack,
  universalVitals,
  isLightMode = false,
}: WetLabSandbox2DProps) {
  // --- REAL LABORATORY ENTER-ABLE VALUES IN WET LAB ASSAY ---
  const [labOD600, setLabOD600] = useState<number>(1.8); // OD600 units (range 0.1 to 4.0)
  const [labInocVolume, setLabInocVolume] = useState<number>(30); // mL/dm3 sand (range 2 to 100)
  const [labGlutamate, setLabGlutamate] = useState<number>(50); // mM glutamate precursor concentration (range 0 to 120)
  const [labSalinity, setLabSalinity] = useState<number>(2.0); // g/L divalent calcium salts (range 0.1 to 12.0)
  const [labTemp, setLabTemp] = useState<number>(37); // °C Incubation temperature (range 15 to 55)
  const [enableNoise, setEnableNoise] = useState<boolean>(true); // Experimental noise to mimic life
  const [windFriction, setWindFriction] = useState<number>(0.65); // m/s friction velocity u*

  // Real-time micro noise oscillation value
  const [noiseVal, setNoiseVal] = useState<number>(1.0);
  const [explainTab, setExplainTab] = useState<"context" | "math">("context");

  // NEW: State key to manually refresh/reset the 2D canvas grid
  const [refreshKey, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    if (!enableNoise) {
      setNoiseVal(1.0);
      return;
    }
    const interval = setInterval(() => {
      // Gentle brownian noise
      setNoiseVal((prev) => {
        const delta = (Math.random() - 0.5) * 0.035;
        const next = prev + delta;
        return Math.max(0.88, Math.min(1.12, next));
      });
    }, 850);
    return () => clearInterval(interval);
  }, [enableNoise]);

  // Derived biophysical model mappings
  const cellDensity = useMemo(() => {
    return labOD600 * (labInocVolume / 22) * noiseVal;
  }, [labOD600, labInocVolume, noiseVal]);

  const precursorFeed = useMemo(() => {
    const tempFactor = Math.max(0.12, 1.0 - Math.abs(labTemp - 37) * 0.026);
    return (labGlutamate / 10.0) * tempFactor * noiseVal;
  }, [labGlutamate, labTemp, noiseVal]);

  const salinityInput = useMemo(() => {
    return labSalinity * 5.4 * noiseVal;
  }, [labSalinity, noiseVal]);

  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [stormSeverity, setStormSeverity] = useState<
    "mild" | "severe" | "gale"
  >("severe");
  const [stormActive, setStormActive] = useState<boolean>(false);
  const [erosionUntreated, setErosionUntreated] = useState<number>(0);
  const [erosionTreated, setErosionTreated] = useState<number>(0);

  // Derive downstream biophysical outcomes from the wet-lab inputs
  const derivedPGA = useMemo(() => {
    return Math.min(220, cellDensity * precursorFeed * 4.5);
  }, [cellDensity, precursorFeed]);

  const saturationFactor = useMemo(() => {
    const Kd = 4.0;
    return salinityInput / (Kd + salinityInput);
  }, [salinityInput]);

  const derivedShearModulus = useMemo(() => {
    const baseG = 250;
    const concentrationEffect = derivedPGA * 12.5;
    const coordinationEffect = saturationFactor * 1.5;
    return Math.min(3800, baseG + concentrationEffect * coordinationEffect);
  }, [derivedPGA, saturationFactor]);

  const u_star_critical = useMemo(() => {
    const untreatedThresh = 0.15; // base
    const bioGelCohesion = derivedShearModulus * 0.0000015;
    return untreatedThresh + Math.sqrt(bioGelCohesion / 1.225);
  }, [derivedShearModulus]);

  // Birds-Eye 2D Canvas Ref and loop
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  interface GridCell {
    height: number;
    organicBind: number;
    revealedBedrock: boolean;
  }
  const untreatedGridRef = useRef<GridCell[][]>([]);
  const treatedGridRef = useRef<GridCell[][]>([]);

  // NEW: Handler to wipe the grids and trigger a clean canvas remount
  const handleRefreshGrid = () => {
    untreatedGridRef.current = [];
    treatedGridRef.current = [];
    setErosionUntreated(0);
    setErosionTreated(0);
    setRefreshKey((k) => k + 1); // Forces the useEffect below to rebuild the dunes
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let frame = 0;

    const cols = 40;
    const rows = 35;
    const cellW = canvas.width / 2 / cols;
    const cellH = canvas.height / rows;

    if (
      untreatedGridRef.current.length === 0 ||
      treatedGridRef.current.length === 0
    ) {
      const untreatedList: GridCell[][] = [];
      const treatedList: GridCell[][] = [];

      for (let r = 0; r < rows; r++) {
        untreatedList[r] = [];
        treatedList[r] = [];
        for (let c = 0; c < cols; c++) {
          const duneNoise =
            0.5 +
            0.32 * Math.sin(c * 0.28) * Math.cos(r * 0.18) +
            Math.random() * 0.12;
          const initialHeight = Math.max(0.25, Math.min(1.0, duneNoise));

          untreatedList[r][c] = {
            height: initialHeight,
            organicBind: 0.0,
            revealedBedrock: false,
          };

          treatedList[r][c] = {
            height: initialHeight,
            organicBind: 0.0,
            revealedBedrock: false,
          };
        }
      }
      untreatedGridRef.current = untreatedList;
      treatedGridRef.current = treatedList;
    }

    const polymerInfiltration = Math.min(
      1.0,
      (derivedShearModulus / 1800) * 0.95,
    );
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (treatedGridRef.current[r] && treatedGridRef.current[r][c]) {
          treatedGridRef.current[r][c].organicBind =
            polymerInfiltration * (0.85 + Math.sin(r + c) * 0.1);
        }
      }
    }

    interface FlyingParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      isTreated: boolean;
      life: number;
    }
    const particles: FlyingParticle[] = [];

    const updatePhysics = () => {
      frame++;
      const currentWind = windFriction * (stormActive ? 1.6 : 1.0);

      let totalUntreatedErosion = 0;
      let totalTreatedErosion = 0;
      let treatedOriginalCount = 0;
      let untreatedOriginalCount = 0;

      const untreatedGrid = untreatedGridRef.current;
      const treatedGrid = treatedGridRef.current;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          untreatedOriginalCount++;
          treatedOriginalCount++;

          if (untreatedGrid[r] && untreatedGrid[r][c]) {
            const utCell = untreatedGrid[r][c];
            const untreatedDiff = currentWind - 0.22;
            if (untreatedDiff > 0 && utCell.height > 0) {
              const erodeProb =
                untreatedDiff * 0.0125 * (1.1 + 0.15 * Math.sin(frame * 0.1));
              if (Math.random() < erodeProb) {
                utCell.height -= 0.035;
                if (utCell.height <= 0.0) {
                  utCell.height = 0;
                  utCell.revealedBedrock = true;
                }
                if (Math.random() < 0.22) {
                  particles.push({
                    x: c * cellW + Math.random() * cellW,
                    y: r * cellH + Math.random() * cellH,
                    vx: currentWind * 8.5 + Math.random() * 2,
                    vy: (Math.random() - 0.5) * 1.8,
                    isTreated: false,
                    life: 45,
                  });
                }
              }
            }
            if (utCell.height === 0 || utCell.revealedBedrock) {
              totalUntreatedErosion++;
            }
          }

          if (treatedGrid[r] && treatedGrid[r][c]) {
            const trCell = treatedGrid[r][c];
            const treatedDiff = currentWind - u_star_critical;
            if (treatedDiff > 0 && trCell.height > 0) {
              const stabilizerEfficiency = trCell.organicBind;
              const baseErodeProb = treatedDiff * 0.0125;
              const absoluteErodeProb =
                baseErodeProb * Math.max(0, 1.0 - stabilizerEfficiency * 0.995);

              if (Math.random() < absoluteErodeProb) {
                trCell.height -= 0.015;
                if (trCell.height <= 0) {
                  trCell.height = 0;
                  trCell.revealedBedrock = true;
                }
                if (Math.random() < 0.18) {
                  particles.push({
                    x: canvas.width / 2 + c * cellW + Math.random() * cellW,
                    y: r * cellH + Math.random() * cellH,
                    vx: currentWind * 8.5 + Math.random() * 2,
                    vy: (Math.random() - 0.5) * 1.8,
                    isTreated: true,
                    life: 30,
                  });
                }
              }
            }
            if (trCell.height === 0 || trCell.revealedBedrock) {
              totalTreatedErosion++;
            }
          }
        }
      }

      setErosionUntreated(
        Math.min(
          100,
          Math.round((totalUntreatedErosion / untreatedOriginalCount) * 100),
        ),
      );
      setErosionTreated(
        Math.min(
          100,
          Math.round((totalTreatedErosion / treatedOriginalCount) * 100),
        ),
      );

      for (let pIdx = particles.length - 1; pIdx >= 0; pIdx--) {
        const p = particles[pIdx];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0 || p.x > canvas.width) {
          particles.splice(pIdx, 1);
        }
      }
    };

    const render = () => {
      if (isSimulating) {
        updatePhysics();
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const untreatedGrid = untreatedGridRef.current;
      const treatedGrid = treatedGridRef.current;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (!untreatedGrid[r] || !untreatedGrid[r][c]) continue;
          const cell = untreatedGrid[r][c];
          const x = c * cellW;
          const y = r * cellH;

          if (cell.revealedBedrock) {
            ctx.fillStyle = "#1e110b";
          } else {
            const val = Math.floor(100 + cell.height * 115);
            ctx.fillStyle = `rgb(${val}, ${Math.floor(val * 0.68)}, ${Math.floor(val * 0.32)})`;
          }
          ctx.fillRect(x, y, cellW, cellH);

          ctx.strokeStyle = "#05070a";
          ctx.lineWidth = 0.25;
          ctx.strokeRect(x, y, cellW, cellH);
        }
      }

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (!treatedGrid[r] || !treatedGrid[r][c]) continue;
          const cell = treatedGrid[r][c];
          const x = canvas.width / 2 + c * cellW;
          const y = r * cellH;

          if (cell.revealedBedrock) {
            ctx.fillStyle = "#1e110b";
          } else {
            const val = Math.floor(100 + cell.height * 115);
            const rComp = Math.floor(val * (1.0 - cell.organicBind * 0.8));
            const gComp = Math.floor(val * (0.68 + cell.organicBind * 0.3));
            const bComp = Math.floor(val * (0.32 + cell.organicBind * 0.45));
            ctx.fillStyle = `rgb(${rComp}, ${gComp}, ${bComp})`;
          }
          ctx.fillRect(x, y, cellW, cellH);

          ctx.strokeStyle = "#05070a";
          ctx.lineWidth = 0.25;
          ctx.strokeRect(x, y, cellW, cellH);

          if (
            cell.organicBind > 0.4 &&
            frame % 120 < 60 &&
            Math.random() < 0.01
          ) {
            ctx.strokeStyle = "rgba(110, 231, 183, 0.15)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + cellW * 3, y + cellH * 2);
            ctx.stroke();
          }
        }
      }

      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();

      particles.forEach((p) => {
        ctx.fillStyle = p.isTreated
          ? "rgba(52, 211, 153, 0.75)"
          : "rgba(245, 158, 11, 0.6)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [
    cellDensity,
    precursorFeed,
    salinityInput,
    windFriction,
    isSimulating,
    stormActive,
    u_star_critical,
    derivedShearModulus,
    refreshKey,
  ]);

  return (
    <div
      className={`p-6 rounded-2xl border space-y-6 transition-colors duration-300 animate-fadeIn ${
        isLightMode
          ? "bg-gradient-to-br from-white to-teal-50/40 border-teal-200 text-stone-800"
          : "bg-gradient-to-br from-[#1c1512] to-teal-950/20 border-slate-800 text-slate-200"
      }`}
    >
      {/* Compact module header — matches the other workspace modules' card style. */}
      <div className="flex items-center gap-3 border-b pb-4 border-slate-200/60 dark:border-slate-800">
        <div
          className={`p-2.5 rounded-xl ${isLightMode ? "bg-teal-50 text-teal-600" : "bg-teal-950/40 text-teal-400"}`}
        >
          <Beaker className="w-5 h-5" />
        </div>
        <div>
          <h3
            className={`text-sm font-black uppercase tracking-wider ${isLightMode ? "text-slate-900" : "text-white"}`}
          >
            Wet-Lab Parameter Sandbox
          </h3>
          <p
            className={`text-[11px] ${isLightMode ? "text-stone-500" : "text-slate-400"}`}
          >
            Feed real bench values — OD₆₀₀, glutamate, calcium salt, temperature
            — into the same erosion physics: a γ-PGA dune-crust assay.
          </p>
        </div>
      </div>

      <ModuleActions moduleId="wetlab" isLightMode={isLightMode} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div
          className={`lg:col-span-5 space-y-6 p-5 rounded-xl border transition-all duration-300 ${
            isLightMode
              ? "bg-white/95 border-amber-900/10 text-stone-800"
              : "bg-[#1c1512] border-slate-800 text-slate-200"
          }`}
        >
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Thermometer
                className={`w-4 h-4 ${isLightMode ? "text-rose-600" : "text-rose-400"}`}
              />
              <h3 className="font-bold text-sm uppercase tracking-wider font-mono">
                1. Lab Inputs
              </h3>
            </div>

            <div className="space-y-5 px-1">
              <div>
                <div
                  className={`flex justify-between text-[11px] mb-1.5 ${isLightMode ? "text-stone-600" : "text-slate-400"}`}
                >
                  <span
                    className={`font-semibold ${isLightMode ? "text-stone-800" : "text-slate-200"}`}
                  >
                    Inoculum Cell Density (<GlossaryTerm term="OD600" />)
                  </span>
                  <span
                    className={`font-mono px-1.5 py-0.5 rounded text-[10px] border ${isLightMode ? "bg-amber-50 border-amber-200 text-amber-700 font-bold" : "text-amber-400 bg-amber-950/40 border border-amber-900/30"}`}
                  >
                    {labOD600.toFixed(2)} Abs
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0.1"
                    max="4.0"
                    step="0.1"
                    value={labOD600}
                    onChange={(e) => setLabOD600(parseFloat(e.target.value))}
                    className={`grow h-1.5 rounded accent-amber-500 cursor-ew-resize ${isLightMode ? "bg-stone-200" : ""}`}
                  />
                </div>
              </div>

              <div>
                <div
                  className={`flex justify-between text-[11px] mb-1.5 ${isLightMode ? "text-stone-600" : "text-slate-400"}`}
                >
                  <span
                    className={`font-semibold ${isLightMode ? "text-stone-800" : "text-slate-200"}`}
                  >
                    Inoculation Vol (Per dm³ soil)
                  </span>
                  <span
                    className={`font-mono px-1.5 py-0.5 rounded text-[10px] border ${isLightMode ? "bg-amber-50 border-amber-200 text-amber-700 font-bold" : "text-amber-400 bg-amber-950/40 border border-amber-900/30"}`}
                  >
                    {labInocVolume.toFixed(0)} mL
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="2"
                    max="100"
                    step="2"
                    value={labInocVolume}
                    onChange={(e) => setLabInocVolume(parseInt(e.target.value))}
                    className={`grow h-1.5 rounded accent-amber-500 cursor-ew-resize ${isLightMode ? "bg-stone-200" : ""}`}
                  />
                </div>
              </div>

              <div>
                <div
                  className={`flex justify-between text-[11px] mb-1.5 ${isLightMode ? "text-stone-600" : "text-slate-400"}`}
                >
                  <span
                    className={`font-semibold ${isLightMode ? "text-stone-800" : "text-slate-200"}`}
                  >
                    <GlossaryTerm term="L-Glutamate" /> Substrate Feed
                  </span>
                  <span
                    className={`font-mono px-1.5 py-0.5 rounded text-[10px] border ${isLightMode ? "bg-teal-50 border-teal-200 text-teal-700 font-bold" : "text-teal-400 bg-teal-950/40 border border-teal-900/30"}`}
                  >
                    {labGlutamate.toFixed(0)} mM
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="120"
                    step="5"
                    value={labGlutamate}
                    onChange={(e) => setLabGlutamate(parseInt(e.target.value))}
                    className={`grow h-1.5 rounded accent-teal-500 cursor-ew-resize ${isLightMode ? "bg-stone-200" : ""}`}
                  />
                </div>
              </div>

              <div>
                <div
                  className={`flex justify-between text-[11px] mb-1.5 ${isLightMode ? "text-stone-600" : "text-slate-400"}`}
                >
                  <span
                    className={`font-semibold ${isLightMode ? "text-stone-800" : "text-slate-200"}`}
                  >
                    Ca2+ Salinity Additive
                  </span>
                  <span
                    className={`font-mono px-1.5 py-0.5 rounded text-[10px] border ${isLightMode ? "bg-amber-50 border-amber-200 text-amber-700 font-bold" : "text-amber-400 bg-amber-950/40 border border-amber-900/30"}`}
                  >
                    {labSalinity.toFixed(1)} g/L
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0.1"
                    max="12.0"
                    step="0.1"
                    value={labSalinity}
                    onChange={(e) => setLabSalinity(parseFloat(e.target.value))}
                    className={`grow h-1.5 rounded accent-amber-500 cursor-ew-resize ${isLightMode ? "bg-stone-200" : ""}`}
                  />
                </div>
                <span
                  className={`text-[9px] block mt-1 ${isLightMode ? "text-stone-500" : "text-slate-500"}`}
                >
                  Divalent calcium sources to crosslink polymeric carboxylate
                  chains.
                </span>
              </div>

              <div>
                <div
                  className={`flex justify-between text-[11px] mb-1.5 ${isLightMode ? "text-stone-600" : "text-slate-400"}`}
                >
                  <span
                    className={`font-semibold ${isLightMode ? "text-stone-800" : "text-slate-200"}`}
                  >
                    Incubation Temperature (
                    <code
                      className={
                        isLightMode
                          ? "text-rose-700 font-bold font-mono"
                          : "text-rose-400"
                      }
                    >
                      T
                    </code>
                    )
                  </span>
                  <span
                    className={`font-mono px-1.5 py-0.5 rounded text-[10px] border ${isLightMode ? "bg-rose-50 border-rose-200 text-rose-700 font-bold" : "text-rose-400 bg-rose-950/40 border border-rose-900/30"}`}
                  >
                    {labTemp.toFixed(1)} °C
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="15"
                    max="55"
                    step="1"
                    value={labTemp}
                    onChange={(e) => setLabTemp(parseFloat(e.target.value))}
                    className={`grow h-1.5 rounded accent-rose-500 cursor-ew-resize ${isLightMode ? "bg-stone-200" : ""}`}
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            className={`p-4 rounded-xl border mt-6 ${isLightMode ? "bg-[#fcfaf5] border-amber-900/10" : "bg-[#020508] border-slate-800"}`}
          >
            <div className="flex items-center gap-2 mb-4">
              <Wind
                className={`w-4 h-4 ${isLightMode ? "text-teal-600" : "text-teal-400"}`}
              />
              <h3 className="font-bold text-sm uppercase tracking-wider font-mono">
                2. Storm Simulation
              </h3>
            </div>

            <div className="space-y-4 px-1">
              <div>
                <div
                  className={`flex justify-between text-[11px] mb-1 ${isLightMode ? "text-stone-600" : "text-slate-400"}`}
                >
                  <span>
                    Custom Wind Friction speed (
                    <code
                      className={
                        isLightMode
                          ? "text-[#b07568] font-bold"
                          : "text-teal-400"
                      }
                    >
                      u*
                    </code>
                    )
                  </span>
                  <span
                    className={`font-mono px-1.5 py-0.5 rounded text-[10px] border ${isLightMode ? "bg-teal-50 border-teal-200 text-teal-800 font-bold" : "bg-teal-950/30 text-teal-400 border border-teal-900/30"}`}
                  >
                    {windFriction.toFixed(2)} m/s
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="1.50"
                  step="0.05"
                  value={windFriction}
                  onChange={(e) => setWindFriction(parseFloat(e.target.value))}
                  className={`w-full h-1.5 rounded accent-teal-500 cursor-ew-resize ${isLightMode ? "bg-stone-200" : ""}`}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer mt-2 group">
                <input
                  type="checkbox"
                  checked={stormActive}
                  onChange={(e) => setStormActive(e.target.checked)}
                  className="rounded border-slate-700 text-red-500 focus:ring-red-500 bg-slate-900 w-4 h-4"
                />
                <span
                  className={`text-[11px] font-bold uppercase transition-colors ${stormActive ? "text-red-500 animate-pulse" : isLightMode ? "text-stone-600" : "text-slate-400"}`}
                >
                  {stormActive
                    ? "⚠ GALE FORCE EVENT ACTIVE"
                    : "Trigger Sudden Gale Event"}
                </span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={`flex-1 py-2.5 rounded-lg font-bold font-mono text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer border ${
                isLightMode
                  ? "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                  : "bg-slate-900 hover:bg-slate-800 text-slate-350 hover:text-white border-slate-800"
              }`}
            >
              {isSimulating ? (
                <Pause className="w-3 h-3" />
              ) : (
                <Play className="w-3 h-3" />
              )}
              {isSimulating ? "Pause dune grid" : "Resume dune grid"}
            </button>

            <button
              onClick={handleRefreshGrid}
              className={`py-2.5 px-4 rounded-lg font-bold font-mono text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer border transition-colors ${
                isLightMode
                  ? "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                  : "bg-blue-950/40 hover:bg-blue-900/60 text-blue-400 border-blue-900/30"
              }`}
              title="Reset grid simulation"
            >
              <RefreshCw className="w-3 h-3" />
              Reset
            </button>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-red-950/15 border border-red-900/40 rounded-xl relative overflow-hidden flex flex-col justify-between">
              <span className="text-[10px] font-mono font-bold text-red-500 uppercase tracking-wider mb-2">
                Control (Bare Sand)
              </span>
              <div className="flex justify-between items-end">
                <span className="text-3xl font-black text-red-400">
                  {erosionUntreated}%
                </span>
                <span className="text-[10px] text-red-500/70 font-mono pb-1">
                  Erosion
                </span>
              </div>
            </div>
            <div className="p-4 bg-teal-950/15 border border-teal-900/40 rounded-xl relative overflow-hidden flex flex-col justify-between">
              <span className="text-[10px] font-mono font-bold text-teal-500 uppercase tracking-wider mb-2">
                Treated (Bio-stabilized)
              </span>
              <div className="flex justify-between items-end">
                <span className="text-3xl font-black text-teal-400">
                  {erosionTreated}%
                </span>
                <span className="text-[10px] text-teal-500/70 font-mono pb-1">
                  Erosion
                </span>
              </div>
            </div>
          </div>

          <div
            className={`p-1.5 rounded-xl border flex flex-col relative overflow-hidden transition-all duration-300 ${
              isLightMode
                ? "bg-white border-amber-900/10 "
                : "bg-[#020305] border-slate-800"
            }`}
          >
            <canvas
              ref={canvasRef}
              width={800}
              height={400}
              className="w-full h-auto bg-black rounded-lg cursor-crosshair border border-slate-900/50"
            />

            <div
              className={`absolute bottom-3 left-3 right-3 p-3 rounded-lg border backdrop-blur-md flex justify-between items-center ${
                isLightMode
                  ? "bg-white/80 border-amber-900/10 text-stone-800"
                  : "bg-black/60 border-slate-800 text-slate-300"
              }`}
            >
              <div className="flex flex-col">
                <span className="text-[10px] font-bold font-mono text-amber-400 mb-0.5">
                  Calculated Modulus (Gs)
                </span>
                <span className="text-sm font-black">
                  {derivedShearModulus.toFixed(0)} Pa
                </span>
              </div>
              <div className="w-px h-8 bg-slate-700/50" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold font-mono text-teal-400 mb-0.5">
                  Yield Target (PGA)
                </span>
                <span className="text-sm font-black">
                  {derivedPGA.toFixed(1)} g/L
                </span>
              </div>
              <div className="w-px h-8 bg-slate-700/50" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold font-mono text-rose-400 mb-0.5">
                  Critical Friction (u*t)
                </span>
                <span className="text-sm font-black">
                  {u_star_critical.toFixed(2)} m/s
                </span>
              </div>
            </div>
          </div>

          <div
            className={`border rounded-xl overflow-hidden mt-4 ${
              isLightMode
                ? "bg-stone-50 border-amber-900/10"
                : "bg-[#1c1512] border-slate-850"
            }`}
          >
            <div className="flex border-b border-inherit">
              <button
                onClick={() => setExplainTab("context")}
                className={`flex-1 py-2 text-[10px] font-mono font-bold uppercase tracking-wider ${explainTab === "context" ? (isLightMode ? "bg-amber-100 text-amber-900" : "bg-slate-800 text-white") : isLightMode ? "text-stone-500 hover:bg-stone-100" : "text-slate-500 hover:bg-slate-900/50"}`}
              >
                Wet-Lab Context
              </button>
              <button
                onClick={() => setExplainTab("math")}
                className={`flex-1 py-2 text-[10px] font-mono font-bold uppercase tracking-wider ${explainTab === "math" ? (isLightMode ? "bg-amber-100 text-amber-900" : "bg-slate-800 text-white") : isLightMode ? "text-stone-500 hover:bg-stone-100" : "text-slate-500 hover:bg-slate-900/50"}`}
              >
                Bio-Physical Math Models
              </button>
            </div>

            <div className="p-4 text-xs">
              {explainTab === "context" ? (
                <div className="animate-fadeIn space-y-3 leading-relaxed">
                  <p
                    className={
                      isLightMode
                        ? "text-stone-700 font-medium"
                        : "text-slate-350"
                    }
                  >
                    Our synthetic{" "}
                    <em
                      className={`italic font-semibold ${isLightMode ? "text-amber-900" : "text-slate-100"}`}
                    >
                      Bacillus subtilis
                    </em>{" "}
                    cells secrete robust{" "}
                    <span className="font-bold text-teal-500">
                      γ-PGA polymers
                    </span>
                    .
                  </p>
                  <p
                    className={
                      isLightMode
                        ? "text-stone-700 font-medium"
                        : "text-slate-400"
                    }
                  >
                    Here we tie <b>physical Wet Lab factors</b> directly into
                    real-world aerodynamic thresholds:
                  </p>
                  <ul
                    className={`list-disc list-inside space-y-1 ml-1 ${isLightMode ? "text-stone-600" : "text-slate-500"}`}
                  >
                    <li>
                      <b>Higher OD600</b> guarantees dense biofilm matrices.
                    </li>
                    <li>
                      <b>L-Glutamate Precursors</b> map directly to PGA yields.
                    </li>
                    <li>
                      <b>Divalent Salinity</b> is critical; calcium acts as the
                      thermodynamic "glue" crossing PGA carboxyl groups.
                    </li>
                  </ul>
                </div>
              ) : (
                <div className="animate-fadeIn space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      className={`p-2.5 border rounded ${isLightMode ? "bg-[#fcfaf5]/85 border-[#b8956c]/20" : "bg-[#04060a] border-slate-850"}`}
                    >
                      <span className="text-rose-500 font-bold block mb-1">
                        1. Temperature Viability:
                      </span>
                      <code>Yield ∝ Feed * (1 - α|T - T_opt|)</code>
                      <p className="text-[10px] text-slate-500 mt-1 leading-normal font-sans">
                        Metabolic productivity penalty function tracking
                        divergence from ideal 37°C.
                      </p>
                    </div>
                    <div
                      className={`p-2.5 border rounded ${isLightMode ? "bg-[#fcfaf5]/85 border-[#b8956c]/20" : "bg-[#04060a] border-slate-850"}`}
                    >
                      <span className="text-amber-500 font-bold block mb-1">
                        2. Salinity Saturation:
                      </span>
                      <code>θ = S / (Kd + S)</code>
                      <p className="text-[10px] text-slate-500 mt-1 leading-normal font-sans">
                        Michaelis-Menten coordination saturation scaling for
                        matrix cohesiveness.
                      </p>
                    </div>
                    <div
                      className={`p-2.5 border rounded ${isLightMode ? "bg-[#fcfaf5]/85 border-[#b8956c]/20" : "bg-[#04060a] border-slate-850"}`}
                    >
                      <span className="text-amber-600 font-bold block mb-1">
                        3. Sand Shear Modulus Gs:
                      </span>
                      <code>Gs = G_base + Yield_PGA * θ * Elasticity</code>
                      <p className="text-[10px] text-slate-500 mt-1 leading-normal font-sans">
                        Affinement elastomer network model calculating
                        structural stiffness (measured in Pascals).
                      </p>
                    </div>
                    <div
                      className={`p-2.5 border rounded ${isLightMode ? "bg-[#fcfaf5]/85 border-[#b8956c]/20" : "bg-[#04060a] border-slate-850"}`}
                    >
                      <span className="text-teal-650 font-bold block mb-1">
                        4. Threshold Windspeed u*t:
                      </span>
                      <code>
                        {
                          "u*t = u_base + sqrt(Cohesion_Gs * Thickness / Air_Density)"
                        }
                      </code>
                      <p className="text-[10px] text-slate-500 mt-1 leading-normal font-sans">
                        The absolute wind friction speed limit before the dune
                        starts suffering aeolian erosion.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
