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
import { PORTAL_NAMES } from "@/content/copy";
import { DUNE } from "@/src/lib/palette";

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
            ctx.fillStyle = DUNE.ink;
          } else {
            const val = Math.floor(100 + cell.height * 115);
            ctx.fillStyle = `rgb(${val}, ${Math.floor(val * 0.68)}, ${Math.floor(val * 0.32)})`;
          }
          ctx.fillRect(x, y, cellW, cellH);

          ctx.strokeStyle = DUNE.ink;
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
            ctx.fillStyle = DUNE.ink;
          } else {
            const val = Math.floor(100 + cell.height * 115);
            const rComp = Math.floor(val * (1.0 - cell.organicBind * 0.8));
            const gComp = Math.floor(val * (0.68 + cell.organicBind * 0.3));
            const bComp = Math.floor(val * (0.32 + cell.organicBind * 0.45));
            ctx.fillStyle = `rgb(${rComp}, ${gComp}, ${bComp})`;
          }
          ctx.fillRect(x, y, cellW, cellH);

          ctx.strokeStyle = DUNE.ink;
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

      ctx.strokeStyle = DUNE.ash;
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
      className={`p-6 rounded-[6px] border space-y-6 transition-colors duration-300 animate-fadeIn ${
        isLightMode
          ? "bg-white/70 border-dune-teal text-foreground"
          : "bg-card/70 border-border text-foreground"
      }`}
    >
      {/* Compact module header, matches the other workspace modules' card style. */}
      <div className="flex items-center gap-4 border-b pb-4 border-border">
        <div
          className={`p-2 rounded-[6px] ${isLightMode ? "bg-dune-teal text-dune-teal" : "bg-dune-teal/40 text-dune-teal"}`}
        >
          <Beaker className="w-5 h-5" />
        </div>
        <div>
          <h3
            className={`text-[length:var(--text-micro)] font-black uppercase tracking-wider ${isLightMode ? "text-foreground" : "text-foreground"}`}
          >
            {PORTAL_NAMES.wetlab}
          </h3>
          <p
            className={`text-[length:var(--text-caption)] ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
          >
            Feed real bench values, OD₆₀₀, glutamate, calcium salt, temperature, into the same erosion physics: a γ-PGA dune-crust assay.
          </p>
        </div>
      </div>

      <ModuleActions moduleId="wetlab" isLightMode={isLightMode} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div
          className={`lg:col-span-5 space-y-6 p-6 rounded-[6px] border transition-all duration-300 ${
            isLightMode
              ? "bg-white/95 border-dune-orange/10 text-foreground"
              : "bg-dune-ink border-border text-foreground"
          }`}
        >
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Thermometer
                className={`w-4 h-4 ${isLightMode ? "text-dune-rose" : "text-dune-rose"}`}
              />
              <h3 className="font-bold text-[length:var(--text-micro)] uppercase tracking-wider font-mono">
                1. Lab Inputs
              </h3>
            </div>

            <div className="space-y-6 px-1">
              <div>
                <div
                  className={`flex justify-between text-[length:var(--text-caption)] mb-2 ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
                >
                  <span
                    className={`font-semibold ${isLightMode ? "text-foreground" : "text-foreground"}`}
                  >
                    Inoculum Cell Density (<GlossaryTerm term="OD600" />)
                  </span>
                  <span
                    className={`font-mono px-2 py-1 rounded text-[length:var(--text-caption)] border ${isLightMode ? "bg-dune-orange border-dune-orange text-dune-orange font-bold" : "text-dune-orange bg-dune-orange/40 border border-dune-orange/30"}`}
                  >
                    {labOD600.toFixed(2)} Abs
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0.1"
                    max="4.0"
                    step="0.1"
                    value={labOD600}
                    onChange={(e) => setLabOD600(parseFloat(e.target.value))}
                    className={`grow h-1.5 rounded accent-dune-orange cursor-ew-resize ${isLightMode ? "bg-secondary" : ""}`}
                  />
                </div>
              </div>

              <div>
                <div
                  className={`flex justify-between text-[length:var(--text-caption)] mb-2 ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
                >
                  <span
                    className={`font-semibold ${isLightMode ? "text-foreground" : "text-foreground"}`}
                  >
                    Inoculation Vol (Per dm³ soil)
                  </span>
                  <span
                    className={`font-mono px-2 py-1 rounded text-[length:var(--text-caption)] border ${isLightMode ? "bg-dune-orange border-dune-orange text-dune-orange font-bold" : "text-dune-orange bg-dune-orange/40 border border-dune-orange/30"}`}
                  >
                    {labInocVolume.toFixed(0)} mL
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="2"
                    max="100"
                    step="2"
                    value={labInocVolume}
                    onChange={(e) => setLabInocVolume(parseInt(e.target.value))}
                    className={`grow h-1.5 rounded accent-dune-orange cursor-ew-resize ${isLightMode ? "bg-secondary" : ""}`}
                  />
                </div>
              </div>

              <div>
                <div
                  className={`flex justify-between text-[length:var(--text-caption)] mb-2 ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
                >
                  <span
                    className={`font-semibold ${isLightMode ? "text-foreground" : "text-foreground"}`}
                  >
                    <GlossaryTerm term="L-Glutamate" /> Substrate Feed
                  </span>
                  <span
                    className={`font-mono px-2 py-1 rounded text-[length:var(--text-caption)] border ${isLightMode ? "bg-dune-teal border-dune-teal text-dune-teal font-bold" : "text-dune-teal bg-dune-teal/40 border border-dune-teal/30"}`}
                  >
                    {labGlutamate.toFixed(0)} mM
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="120"
                    step="5"
                    value={labGlutamate}
                    onChange={(e) => setLabGlutamate(parseInt(e.target.value))}
                    className={`grow h-1.5 rounded accent-dune-teal cursor-ew-resize ${isLightMode ? "bg-secondary" : ""}`}
                  />
                </div>
              </div>

              <div>
                <div
                  className={`flex justify-between text-[length:var(--text-caption)] mb-2 ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
                >
                  <span
                    className={`font-semibold ${isLightMode ? "text-foreground" : "text-foreground"}`}
                  >
                    Ca2+ Salinity Additive
                  </span>
                  <span
                    className={`font-mono px-2 py-1 rounded text-[length:var(--text-caption)] border ${isLightMode ? "bg-dune-orange border-dune-orange text-dune-orange font-bold" : "text-dune-orange bg-dune-orange/40 border border-dune-orange/30"}`}
                  >
                    {labSalinity.toFixed(1)} g/L
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0.1"
                    max="12.0"
                    step="0.1"
                    value={labSalinity}
                    onChange={(e) => setLabSalinity(parseFloat(e.target.value))}
                    className={`grow h-1.5 rounded accent-dune-orange cursor-ew-resize ${isLightMode ? "bg-secondary" : ""}`}
                  />
                </div>
                <span
                  className={`text-[length:var(--text-caption)] block mt-1 ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
                >
                  Divalent calcium sources to crosslink polymeric carboxylate
                  chains.
                </span>
              </div>

              <div>
                <div
                  className={`flex justify-between text-[length:var(--text-caption)] mb-2 ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
                >
                  <span
                    className={`font-semibold ${isLightMode ? "text-foreground" : "text-foreground"}`}
                  >
                    Incubation Temperature (
                    <code
                      className={
                        isLightMode
                          ? "text-dune-rose font-bold font-mono"
                          : "text-dune-rose"
                      }
                    >
                      T
                    </code>
                    )
                  </span>
                  <span
                    className={`font-mono px-2 py-1 rounded text-[length:var(--text-caption)] border ${isLightMode ? "bg-dune-rose border-dune-rose text-dune-rose font-bold" : "text-dune-rose bg-dune-rose/40 border border-dune-rose/30"}`}
                  >
                    {labTemp.toFixed(1)} °C
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="15"
                    max="55"
                    step="1"
                    value={labTemp}
                    onChange={(e) => setLabTemp(parseFloat(e.target.value))}
                    className={`grow h-1.5 rounded accent-dune-rose cursor-ew-resize ${isLightMode ? "bg-secondary" : ""}`}
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            className={`p-4 rounded-[6px] border mt-6 ${isLightMode ? "bg-card border-dune-orange/10" : "bg-dune-ink border-border"}`}
          >
            <div className="flex items-center gap-2 mb-4">
              <Wind
                className={`w-4 h-4 ${isLightMode ? "text-dune-teal" : "text-dune-teal"}`}
              />
              <h3 className="font-bold text-[length:var(--text-micro)] uppercase tracking-wider font-mono">
                2. Storm Simulation
              </h3>
            </div>

            <div className="space-y-4 px-1">
              <div>
                <div
                  className={`flex justify-between text-[length:var(--text-caption)] mb-1 ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
                >
                  <span>
                    Custom Wind Friction speed (
                    <code
                      className={
                        isLightMode
                          ? "text-dune-rose font-bold"
                          : "text-dune-teal"
                      }
                    >
                      u*
                    </code>
                    )
                  </span>
                  <span
                    className={`font-mono px-2 py-1 rounded text-[length:var(--text-caption)] border ${isLightMode ? "bg-dune-teal border-dune-teal text-dune-teal font-bold" : "bg-dune-teal/30 text-dune-teal border border-dune-teal/30"}`}
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
                  className={`w-full h-1.5 rounded accent-dune-teal cursor-ew-resize ${isLightMode ? "bg-secondary" : ""}`}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer mt-2 group">
                <input
                  type="checkbox"
                  checked={stormActive}
                  onChange={(e) => setStormActive(e.target.checked)}
                  className="rounded border-border text-dune-maroon focus:ring-dune-maroon bg-dune-basalt w-4 h-4"
                />
                <span
                  className={`text-[length:var(--text-caption)] font-bold uppercase transition-colors ${stormActive ? "text-dune-maroon" : isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
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
              className={`flex-1 py-2 rounded-[4px] font-bold font-mono text-[length:var(--text-caption)] uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer border ${
                isLightMode
                  ? "bg-background hover:bg-muted text-foreground border-border"
                  : "bg-dune-basalt hover:bg-card text-foreground hover:text-foreground border-border"
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
              className={`py-2 px-4 rounded-[4px] font-bold font-mono text-[length:var(--text-caption)] uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer border transition-colors ${
                isLightMode
                  ? "bg-dune-teal hover:bg-dune-teal text-dune-teal border-dune-teal"
                  : "bg-dune-teal/40 hover:bg-dune-teal/60 text-dune-teal border-dune-teal/30"
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
            <div className="p-4 bg-dune-maroon/15 border border-dune-maroon/40 rounded-[6px] relative overflow-hidden flex flex-col justify-between">
              <span className="text-[length:var(--text-caption)] font-mono font-bold text-dune-maroon uppercase tracking-wider mb-2">
                Control (Bare Sand)
              </span>
              <div className="flex justify-between items-end">
                <span className="text-[length:var(--text-h1)] font-black text-dune-maroon">
                  {erosionUntreated}%
                </span>
                <span className="text-[length:var(--text-caption)] text-dune-maroon/70 font-mono pb-1">
                  Erosion
                </span>
              </div>
            </div>
            <div className="p-4 bg-dune-teal/15 border border-dune-teal/40 rounded-[6px] relative overflow-hidden flex flex-col justify-between">
              <span className="text-[length:var(--text-caption)] font-mono font-bold text-dune-teal uppercase tracking-wider mb-2">
                Treated (Bio-stabilized)
              </span>
              <div className="flex justify-between items-end">
                <span className="text-[length:var(--text-h1)] font-black text-dune-teal">
                  {erosionTreated}%
                </span>
                <span className="text-[length:var(--text-caption)] text-dune-teal/70 font-mono pb-1">
                  Erosion
                </span>
              </div>
            </div>
          </div>

          <div
            className={`p-2 rounded-[6px] border flex flex-col relative overflow-hidden transition-all duration-300 ${
              isLightMode
                ? "bg-white border-dune-orange/10 "
                : "bg-dune-ink border-border"
            }`}
          >
            <canvas
              ref={canvasRef}
              width={800}
              height={400}
              className="w-full h-auto bg-black rounded-[4px] cursor-crosshair border border-border"
            />

            <div
              className={`absolute bottom-3 left-3 right-3 p-4 rounded-[4px] border backdrop-blur-md flex justify-between items-center ${
                isLightMode
                  ? "bg-white/80 border-dune-orange/10 text-foreground"
                  : "bg-black/60 border-border text-foreground"
              }`}
            >
              <div className="flex flex-col">
                <span className="text-[length:var(--text-caption)] font-bold font-mono text-dune-orange mb-1">
                  Calculated Modulus (Gs)
                </span>
                <span className="text-[length:var(--text-micro)] font-black">
                  {derivedShearModulus.toFixed(0)} Pa
                </span>
              </div>
              <div className="w-px h-8 bg-muted/50" />
              <div className="flex flex-col">
                <span className="text-[length:var(--text-caption)] font-bold font-mono text-dune-teal mb-1">
                  Yield Target (PGA)
                </span>
                <span className="text-[length:var(--text-micro)] font-black">
                  {derivedPGA.toFixed(1)} g/L
                </span>
              </div>
              <div className="w-px h-8 bg-muted/50" />
              <div className="flex flex-col">
                <span className="text-[length:var(--text-caption)] font-bold font-mono text-dune-rose mb-1">
                  Critical Friction (u*t)
                </span>
                <span className="text-[length:var(--text-micro)] font-black">
                  {u_star_critical.toFixed(2)} m/s
                </span>
              </div>
            </div>
          </div>

          <div
            className={`border rounded-[6px] overflow-hidden mt-4 ${
              isLightMode
                ? "bg-background border-dune-orange/10"
                : "bg-dune-ink border-border"
            }`}
          >
            <div className="flex border-b border-inherit">
              <button
                onClick={() => setExplainTab("context")}
                className={`flex-1 py-2 text-[length:var(--text-caption)] font-mono font-bold uppercase tracking-wider ${explainTab === "context" ? (isLightMode ? "bg-dune-orange text-dune-orange" : "bg-card text-foreground") : isLightMode ? "text-muted-foreground hover:bg-muted" : "text-muted-foreground hover:bg-dune-basalt/50"}`}
              >
                Wet-Lab Context
              </button>
              <button
                onClick={() => setExplainTab("math")}
                className={`flex-1 py-2 text-[length:var(--text-caption)] font-mono font-bold uppercase tracking-wider ${explainTab === "math" ? (isLightMode ? "bg-dune-orange text-dune-orange" : "bg-card text-foreground") : isLightMode ? "text-muted-foreground hover:bg-muted" : "text-muted-foreground hover:bg-dune-basalt/50"}`}
              >
                Bio-Physical Math Models
              </button>
            </div>

            <div className="p-4 text-[length:var(--text-micro)]">
              {explainTab === "context" ? (
                <div className="animate-fadeIn space-y-4 leading-relaxed">
                  <p
                    className={
                      isLightMode
                        ? "text-foreground font-medium"
                        : "text-foreground"
                    }
                  >
                    Our synthetic{" "}
                    <em
                      className={`italic font-semibold ${isLightMode ? "text-dune-orange" : "text-foreground"}`}
                    >
                      Bacillus subtilis
                    </em>{" "}
                    cells secrete robust{" "}
                    <span className="font-bold text-dune-teal">
                      γ-PGA polymers
                    </span>
                    .
                  </p>
                  <p
                    className={
                      isLightMode
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    }
                  >
                    Here we tie <b>physical Wet Lab factors</b> directly into
                    real-world aerodynamic thresholds:
                  </p>
                  <ul
                    className={`list-disc list-inside space-y-1 ml-1 ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
                  >
                    <li>
                      <b>Higher OD600</b> seeds a denser starting population,
                      which tends to build biofilm faster.
                    </li>
                    <li>
                      <b>L-Glutamate precursors</b> feed γ-PGA synthesis and
                      raise the achievable yield.
                    </li>
                    <li>
                      <b>Divalent salinity</b> matters: calcium bridges γ-PGA
                      carboxyl groups, cross-linking the matrix.
                    </li>
                  </ul>
                </div>
              ) : (
                <div className="animate-fadeIn space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      className={`p-2 border rounded ${isLightMode ? "bg-card/85 border-dune-sand/20" : "bg-dune-ink border-border"}`}
                    >
                      <span className="text-dune-rose font-bold block mb-1">
                        1. Temperature Viability:
                      </span>
                      <code>Yield ∝ Feed * (1 - α|T - T_opt|)</code>
                      <p className="text-[length:var(--text-caption)] text-muted-foreground mt-1 leading-normal font-sans">
                        Metabolic productivity penalty function tracking
                        divergence from ideal 37°C.
                      </p>
                    </div>
                    <div
                      className={`p-2 border rounded ${isLightMode ? "bg-card/85 border-dune-sand/20" : "bg-dune-ink border-border"}`}
                    >
                      <span className="text-dune-orange font-bold block mb-1">
                        2. Salinity Saturation:
                      </span>
                      <code>θ = S / (Kd + S)</code>
                      <p className="text-[length:var(--text-caption)] text-muted-foreground mt-1 leading-normal font-sans">
                        Michaelis-Menten coordination saturation scaling for
                        matrix cohesiveness.
                      </p>
                    </div>
                    <div
                      className={`p-2 border rounded ${isLightMode ? "bg-card/85 border-dune-sand/20" : "bg-dune-ink border-border"}`}
                    >
                      <span className="text-dune-orange font-bold block mb-1">
                        3. Sand Shear Modulus Gs:
                      </span>
                      <code>Gs = G_base + Yield_PGA * θ * Elasticity</code>
                      <p className="text-[length:var(--text-caption)] text-muted-foreground mt-1 leading-normal font-sans">
                        Affinement elastomer network model calculating
                        structural stiffness (measured in Pascals).
                      </p>
                    </div>
                    <div
                      className={`p-2 border rounded ${isLightMode ? "bg-card/85 border-dune-sand/20" : "bg-dune-ink border-border"}`}
                    >
                      <span className="text-dune-teal font-bold block mb-1">
                        4. Threshold Windspeed u*t:
                      </span>
                      <code>
                        {
                          "u*t = u_base + sqrt(Cohesion_Gs * Thickness / Air_Density)"
                        }
                      </code>
                      <p className="text-[length:var(--text-caption)] text-muted-foreground mt-1 leading-normal font-sans">
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
