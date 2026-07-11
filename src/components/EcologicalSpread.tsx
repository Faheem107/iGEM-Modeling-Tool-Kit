import React, { useState, useEffect, useRef } from "react";
import { CAConfig } from "../types";
import {
  Bug,
  Sparkles,
  RefreshCw,
  Layers,
  ShieldHalf,
  TrendingUp,
  HelpCircle,
  Info,
  Link2,
  Droplet,
  ShieldCheck,
  ShieldAlert,
  Gauge,
} from "lucide-react";
import GlossaryTerm from "./GlossaryTerm";
import { ModuleActions } from "./simulation/_shared";
import {
  ECOLOGY_CALIB,
  cval,
  frontKinematics,
  latticeInvasionProb,
  combinedEscapeFrequency,
  deployedPopulation,
  escapeStatistics,
} from "../lib/physics";

interface EcologicalProps {
  config: CAConfig;
  setConfig: React.Dispatch<React.SetStateAction<CAConfig>>;
  pgaAccum: number;
  isLinked: boolean;
  setIsLinked: (val: boolean) => void;
  isLightMode: boolean;
  /** Bacterial prongs driving this colony (1 = γ-PGA, 2 = CaCO₃). Both use engineered B. subtilis. */
  activeProngs?: (1 | 2 | 3)[];
}

export default function EcologicalSpread({
  config,
  setConfig,
  pgaAccum,
  isLinked,
  setIsLinked,
  isLightMode,
  activeProngs = [1],
}: EcologicalProps) {
  // Both Prong 1 (γ-PGA) and Prong 2 (CaCO₃) are engineered into B. subtilis, so the colony,
  // spread and MazE/MazF kill-switch apply to whichever bacterial prong(s) are active.
  const hasPGA = activeProngs.includes(1);
  const hasCaco3 = activeProngs.includes(2);
  const binderLabel =
    hasPGA && hasCaco3
      ? "γ-PGA biofilm + CaCO₃ biocement"
      : hasCaco3
        ? "CaCO₃ biocement"
        : "γ-PGA biofilm";
  // Crust colour by whichever binder(s) the dead colony leaves behind: CaCO₃ reads as pale mineral,
  // γ-PGA as a cyan gel, both as a teal-mineral blend.
  const crustRGB: [number, number, number] =
    hasPGA && hasCaco3
      ? [125, 211, 200]
      : hasCaco3
        ? [222, 226, 230]
        : [14, 165, 233];
  const [steps, setSteps] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [density, setDensity] = useState<number>(0);
  const [resourceLevel, setResourceLevel] = useState<number>(100);
  const [gelCoverage, setGelCoverage] = useState<number>(0);
  const [killSwitchTriggered, setKillSwitchTriggered] =
    useState<boolean>(false);

  // --- Physical spread & biocontainment levers (module-local; not part of the shared CAConfig) ---
  // Ca²⁺ dosed for cross-linking / MICP also SUPPRESSES colony sliding (surfactin complexation,
  // Kubota & Kobayashi 2017) — a real spread-limiting synergy of the chemistry the prongs deploy.
  const [caConc, setCaConc] = useState<number>(1.0); // mM Ca²⁺
  // MazE/MazF kill-switch escape frequency exponent: escape = 10^(−escapeExp) per cell·generation.
  const [escapeExp, setEscapeExp] = useState<number>(8); // 8 → 10⁻⁸ (NIH target)
  const [redundantSwitch, setRedundantSwitch] = useState<boolean>(true); // orthogonal 2nd switch

  // Colony vitality (0–1) sets the Fisher–KPP reaction term µ: when linked it is driven by the
  // γ-PGA secretion vigour; otherwise the manual "growth vigour" slider (config.spreadProb).
  const vitality = isLinked
    ? Math.max(0.15, Math.min(1, 0.2 + pgaAccum / 250))
    : config.spreadProb;
  const kin = frontKinematics(vitality, caConc);
  // The colony map is a time-accelerated schematic; its per-step invasion probability is a monotone
  // function of the same drivers (↑ with vitality, ↓ with Ca²⁺). The rigorous physical front speed
  // is reported in mm·day⁻¹ from c = 2√(Dµ).
  const effectiveSpreadProb = isLinked
    ? latticeInvasionProb(kin, vitality)
    : config.spreadProb;

  // Biocontainment: independent orthogonal switches MULTIPLY their escape frequencies. The deployed
  // population is taken at hectare field scale (the number actually released), so N·p is the honest
  // expected-escapee count regardless of the toy lattice's current step.
  const perSwitchEscape = Math.pow(10, -escapeExp);
  const pEscape = combinedEscapeFrequency(
    perSwitchEscape,
    redundantSwitch ? 2 : 1,
  );
  const HECTARE_SPAN_MM = 1e5; // 1 ha = 100 m × 100 m
  const escape = escapeStatistics(
    pEscape,
    deployedPopulation(HECTARE_SPAN_MM, 1),
  );
  const nihThreshold = cval(ECOLOGY_CALIB.nihEscapeThreshold);
  // Compact scientific-notation formatter for the tiny probabilities.
  const sci = (x: number) => {
    if (x <= 0) return "0";
    const e = Math.floor(Math.log10(x));
    const m = x / Math.pow(10, e);
    return `${m.toFixed(1)}×10${e
      .toString()
      .split("")
      .map((d) => "⁻⁰¹²³⁴⁵⁶⁷⁸⁹"["-0123456789".indexOf(d)])
      .join("")}`;
  };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);

  // Grid states:
  // 0 = empty sand
  // 1 = active bacteria
  // 2 = dead/kill-switch activated
  // 3 = only biopolymeric gel residue left behind
  const gridRef = useRef<number[][]>([]);
  const resourceGridRef = useRef<number[][]>([]);
  const pgaGridRef = useRef<number[][]>([]);
  // Per-cell generation age of the active colony — drives MazE/MazF plasmid-dilution death.
  const ageGridRef = useRef<number[][]>([]);

  // Initialize grids
  const initSimulation = () => {
    const size = config.gridSize;
    const tempGrid = Array(size)
      .fill(0)
      .map(() => Array(size).fill(0));
    const tempRes = Array(size)
      .fill(0)
      .map(() => Array(size).fill(1.0)); // full resources
    const tempPGA = Array(size)
      .fill(0)
      .map(() => Array(size).fill(0.0));
    ageGridRef.current = Array(size)
      .fill(0)
      .map(() => Array(size).fill(0));

    if (config.initialInoculation === "center") {
      const mid = Math.floor(size / 2);
      // seed a small cluster in center
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          tempGrid[mid + dx][mid + dy] = 1;
        }
      }
    } else if (config.initialInoculation === "corners") {
      tempGrid[2][2] = 1;
      tempGrid[2][size - 3] = 1;
      tempGrid[size - 3][2] = 1;
      tempGrid[size - 3][size - 3] = 1;
    } else {
      // random seeds
      for (let k = 0; k < 25; k++) {
        const rx = Math.floor(Math.random() * (size - 4)) + 2;
        const ry = Math.floor(Math.random() * (size - 4)) + 2;
        tempGrid[rx][ry] = 1;
      }
    }

    gridRef.current = tempGrid;
    resourceGridRef.current = tempRes;
    pgaGridRef.current = tempPGA;
    setSteps(0);
    setKillSwitchTriggered(false);
    updateMetrics();
  };

  // Click on grid cell to inoculate custom points manually
  const handleCanvasClick = (
    e: React.MouseEvent<HTMLCanvasElement, MouseEvent>,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    // Map from CSS px to grid coords (canvas backing store is DPR-scaled, so use rect dimensions).
    const col = Math.floor(
      ((e.clientX - rect.left) / rect.width) * config.gridSize,
    );
    const row = Math.floor(
      ((e.clientY - rect.top) / rect.height) * config.gridSize,
    );

    if (
      row >= 0 &&
      row < config.gridSize &&
      col >= 0 &&
      col < config.gridSize
    ) {
      // Seed a small 2-cell cluster so a click reliably takes hold.
      for (let dr = 0; dr <= 1; dr++)
        for (let dc = 0; dc <= 1; dc++) {
          const rr = row + dr,
            cc = col + dc;
          if (
            rr < config.gridSize &&
            cc < config.gridSize &&
            gridRef.current[rr]?.[cc] === 0
          ) {
            gridRef.current[rr][cc] = 1;
            resourceGridRef.current[rr][cc] = 1.0;
            if (ageGridRef.current[rr]) ageGridRef.current[rr][cc] = 0;
          }
        }
      updateMetrics();
    }
  };

  // Perform one step of the colony-spread model.
  // • moisture diffuses between cells and slowly evaporates (an organic wetting front, not a hard edge)
  // • active cells consume water, secrete crust, and age one generation
  // • the MazE/MazF kill-switch fires two ways: instantly when local moisture dries out (SigB drought
  // response), and stochastically as the containment plasmid dilutes out over ~killSwitchDelay–2×
  // generations — so even well-watered colonies self-terminate, blocking overspread & HGT.
  const tickSimulation = () => {
    const size = config.gridSize;
    const grid = gridRef.current;
    const res = resourceGridRef.current;
    const pga = pgaGridRef.current;
    const age = ageGridRef.current;

    if (grid.length === 0) return;

    const nextGrid = grid.map((row) => [...row]);
    const nextRes = res.map((row) => [...row]);
    const nextPGA = pga.map((row) => [...row]);
    const nextAge = age.map((row) => [...row]);

    // 1) Moisture diffusion + slow evaporation (5-point Laplacian, reflective edges).
    const DIFF = 0.12,
      EVAP = 0.004;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const here = res[r][c];
        const up = res[r - 1]?.[c] ?? here;
        const down = res[r + 1]?.[c] ?? here;
        const left = res[r]?.[c - 1] ?? here;
        const right = res[r]?.[c + 1] ?? here;
        const diffused = here + DIFF * (up + down + left + right - 4 * here);
        nextRes[r][c] = Math.max(0, diffused - EVAP);
      }
    }

    const genDilution = Math.max(4, config.killSwitchDelay); // generations before plasmid loss begins
    let activeBactCount = 0;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const state = grid[r][c];

        if (state === 1) {
          activeBactCount++;
          const gen = age[r][c] + 1;
          nextAge[r][c] = gen;

          // Secrete crust (rate scales with local moisture) and consume water.
          const moisture = nextRes[r][c];
          nextPGA[r][c] = Math.min(
            1.0,
            pga[r][c] + 0.12 * Math.max(0.2, moisture),
          );
          nextRes[r][c] = Math.max(0, moisture - config.resourceConsume);

          // Kill-switch: drought-triggered OR plasmid dilution (probability ramps after genDilution,
          // certain by ~2× — matching the 8–20 generation dilution window).
          const drought = nextRes[r][c] <= 0.05;
          const dilutionP =
            gen <= genDilution
              ? 0
              : Math.min(1, (gen - genDilution) / genDilution);
          if (drought || Math.random() < dilutionP) {
            nextGrid[r][c] = 2;
          }

          // Spread into moist, empty neighbours (Moore neighbourhood).
          if (nextRes[r][c] > 0.15) {
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr,
                  nc = c + dc;
                if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
                if (
                  grid[nr][nc] === 0 &&
                  res[nr][nc] > 0.2 &&
                  Math.random() < effectiveSpreadProb
                ) {
                  nextGrid[nr][nc] = 1;
                  nextAge[nr][nc] = 0;
                }
              }
            }
          }
        } else if (state === 2) {
          // Dead cell → leaves the mineral/gel crust behind.
          nextGrid[r][c] = 3;
        }
      }
    }

    gridRef.current = nextGrid;
    resourceGridRef.current = nextRes;
    pgaGridRef.current = nextPGA;
    ageGridRef.current = nextAge;

    setSteps((prev) => prev + 1);

    // If population hits zero after initial growth, check containment status
    if (activeBactCount === 0 && steps > 5) {
      setKillSwitchTriggered(true);
      setIsRunning(false);
    }

    updateMetrics();
  };

  const updateMetrics = () => {
    const size = config.gridSize;
    let totalBact = 0;
    let totalDead = 0;
    let totalRes = 0;
    let totalPGA = 0;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (gridRef.current[r]?.[c] === 1) totalBact++;
        if (gridRef.current[r]?.[c] === 2 || gridRef.current[r]?.[c] === 3)
          totalDead++;
        totalRes += resourceGridRef.current[r]?.[c] || 0;
        totalPGA += pgaGridRef.current[r]?.[c] || 0;
      }
    }

    const cellCount = size * size;
    setDensity(parseFloat(((totalBact / cellCount) * 100).toFixed(1)));
    setResourceLevel(parseFloat(((totalRes / cellCount) * 100).toFixed(1)));
    setGelCoverage(parseFloat(((totalPGA / cellCount) * 100).toFixed(1)));
  };

  // Force a redraw when the container resizes (keeps the map crisp and square at any width).
  const [resizeTick, setResizeTick] = useState(0);
  useEffect(() => {
    const wrap = canvasWrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => setResizeTick((t) => t + 1));
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // Bird's-eye desert renderer: paint the lattice into a grid-resolution buffer, then upscale it with
  // bilinear smoothing so colonies read as soft, blended patches (an aerial view of the deployment
  // site) rather than hard cells. Dune shading + a vignette sell the overhead perspective.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = canvasWrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = config.gridSize;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cssW = Math.max(240, Math.min(wrap.clientWidth || 360, 620));
    const W = Math.round(cssW * dpr);
    if (canvas.width !== W) {
      canvas.width = W;
      canvas.height = W;
    }

    // Low-res buffer, one texel per cell.
    let off = offscreenRef.current;
    if (!off) {
      off = document.createElement("canvas");
      offscreenRef.current = off;
    }
    off.width = size;
    off.height = size;
    const octx = off.getContext("2d");
    if (!octx) return;

    const img = octx.createImageData(size, size);
    const data = img.data;
    const [cr, cg, cb] = crustRGB;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const state = gridRef.current[r]?.[c] || 0;
        const m = resourceGridRef.current[r]?.[c] || 0; // moisture 0–1
        const pgaOfCell = pgaGridRef.current[r]?.[c] || 0;
        let R: number, G: number, B: number;

        // Damp sand reads darker/richer than bone-dry sand.
        const sand = isLightMode
          ? [236 - m * 26, 222 - m * 34, 196 - m * 48]
          : [24 + m * 26, 22 + m * 24, 18 + m * 30];

        if (state === 1) {
          R = isLightMode ? 5 : 16;
          G = isLightMode ? 150 : 185;
          B = isLightMode ? 105 : 129; // active colony
        } else if (state === 2) {
          R = 148;
          G = 163;
          B = 184; // just died
        } else if (state === 3) {
          const a = Math.min(1, pgaOfCell * 0.9 + 0.3); // crust opacity over sand
          R = sand[0] * (1 - a) + cr * a;
          G = sand[1] * (1 - a) + cg * a;
          B = sand[2] * (1 - a) + cb * a;
        } else {
          [R, G, B] = sand;
        }

        const idx = (r * size + c) * 4;
        data[idx] = R;
        data[idx + 1] = G;
        data[idx + 2] = B;
        data[idx + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);

    ctx.clearRect(0, 0, W, W);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(off, 0, 0, size, size, 0, 0, W, W);

    // Dune light: a soft diagonal sheen so the flat map reads as sunlit terrain.
    const dune = ctx.createLinearGradient(0, 0, W, W);
    dune.addColorStop(
      0,
      isLightMode ? "rgba(255,247,224,0.35)" : "rgba(120,110,90,0.16)",
    );
    dune.addColorStop(0.5, "rgba(0,0,0,0)");
    dune.addColorStop(
      1,
      isLightMode ? "rgba(120,86,30,0.10)" : "rgba(0,0,0,0.28)",
    );
    ctx.fillStyle = dune;
    ctx.fillRect(0, 0, W, W);

    // Vignette for the overhead-lens feel.
    const vig = ctx.createRadialGradient(
      W / 2,
      W / 2,
      W * 0.28,
      W / 2,
      W / 2,
      W * 0.72,
    );
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(
      1,
      isLightMode ? "rgba(90,66,26,0.14)" : "rgba(0,0,0,0.42)",
    );
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, W);
  }, [steps, config.gridSize, isLightMode, resizeTick, crustRGB]);

  // Handle run ticking loop
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isRunning) {
      intervalId = setInterval(() => {
        tickSimulation();
      }, 100);
    }
    return () => clearInterval(intervalId);
  }, [isRunning, config]);

  // Fire init on mounting
  useEffect(() => {
    initSimulation();
  }, [config.gridSize, config.initialInoculation]);

  return (
    <div
      className={`grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 rounded-xl border transition-all duration-300 ${isLightMode ? "bg-[#fdfaf3] border-amber-900/10 shadow-[0_4px_24px_rgba(139,94,26,0.06)]" : "bg-[#1c1512] border-slate-800 "}`}
      id="ecological-spread-panel"
    >
      {/* Rules Config Panel */}
      <div
        className={`lg:col-span-12 xl:col-span-4 p-5 rounded border transition-colors duration-300 ${isLightMode ? "bg-white border-amber-900/10" : "bg-[#1c1512] border-slate-800/80"} font-sans`}
      >
        <h3
          className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 mb-4 font-mono ${isLightMode ? "text-amber-955" : "text-slate-100"}`}
        >
          <Bug
            className={`w-5 h-5 ${isLightMode ? "text-amber-600" : "text-amber-400"}`}
          />
          Biosafety & Spread Controls
        </h3>

        <div className="mb-4">
          <ModuleActions moduleId="ecological" isLightMode={isLightMode} />
        </div>

        <div className="space-y-4">
          {/* Universal Linkage switch */}
          <div
            className={`p-3 rounded text-xs mb-2 ${isLightMode ? "bg-amber-50/45 border border-amber-200" : "bg-amber-950/15 border border-amber-900/35"}`}
          >
            <label className="flex items-center justify-between cursor-pointer">
              <span
                className={`flex items-center gap-1.5 font-bold ${isLightMode ? "text-amber-805 text-sm" : "text-amber-400"}`}
              >
                <Link2
                  className={`w-4 h-4 animate-pulse ${isLightMode ? "text-amber-600 font-bold" : "text-amber-400"}`}
                />
                Link Growth Speed to Secretion
              </span>
              <input
                type="checkbox"
                checked={isLinked}
                onChange={(e) => setIsLinked(e.target.checked)}
                className="rounded accent-amber-500"
              />
            </label>
            <p
              className={`text-[10px] mt-1 font-sans leading-normal ${isLightMode ? "text-stone-605 font-medium" : "text-slate-400"}`}
            >
              When enabled, moisture spread speed (
              <code
                className={
                  isLightMode
                    ? "text-amber-600 font-mono font-bold"
                    : "text-amber-400"
                }
              >
                P_spread
              </code>
              ) is directly proportional to Intracellular PGA secretion yield
              computed from dynamic metabolic ODE simulations.
            </p>
          </div>

          <div>
            <span
              className={`text-[11px] font-bold block mb-1.5 uppercase font-[#854d0e] tracking-wider ${isLightMode ? "text-stone-710" : "text-slate-400"}`}
            >
              Inoculation Pattern
            </span>
            <div
              className={`grid grid-cols-3 gap-1.5 p-1 rounded border font-mono ${isLightMode ? "bg-[#fdfaf3] border-amber-900/10 " : "bg-[#1c1512] border border-slate-800"}`}
            >
              {(["center", "corners", "random"] as const).map((pat) => (
                <button
                  key={pat}
                  onClick={() =>
                    setConfig((prev) => ({ ...prev, initialInoculation: pat }))
                  }
                  className={`px-2 py-1 text-[9px] font-bold rounded capitalize cursor-pointer transition ${config.initialInoculation === pat ? (isLightMode ? "bg-amber-50 text-amber-800 border border-amber-200 " : "bg-amber-950 text-amber-300 border border-amber-900/60") : isLightMode ? "text-stone-500 hover:text-stone-800 bg-[#ffffff] border border-stone-200/40 hover:border-amber-400" : "text-slate-500 hover:text-slate-300"}`}
                >
                  {pat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div
              className={`flex justify-between text-[11px] mb-1 ${isLightMode ? "text-stone-701" : "text-slate-400"}`}
            >
              <div className="group relative flex items-center gap-1 cursor-help">
                <span
                  className={`underline decoration-dotted underline-offset-2 ${isLightMode ? "decoration-stone-300" : "decoration-slate-600"}`}
                >
                  Moisture Spread Probability
                </span>
                <Info className="w-3.5 h-3.5 text-slate-500 hover:text-teal-455 transition" />
                <div
                  className={`absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-64 p-2 text-[10px] rounded border z-25 font-sans leading-relaxed ${isLightMode ? "bg-white text-stone-800 border-amber-900/15" : "bg-slate-950 text-slate-300 border border-slate-800"}`}
                >
                  The raw probability rate of vegetative binary fission and
                  cellular spread to adjacent porous sand cavities.
                </div>
              </div>
              <span
                className={`font-mono px-1 py-0.5 rounded text-[10px] border ${isLightMode ? "bg-amber-50 border-amber-200 text-amber-805 font-bold" : "bg-amber-950/40 text-amber-400 border border-amber-900/30"}`}
              >
                {(effectiveSpreadProb * 100).toFixed(0)}%
              </span>
            </div>
            {isLinked ? (
              <div
                className={`py-2.5 px-3 rounded text-[11px] font-mono flex items-center gap-1.5 border ${
                  isLightMode
                    ? "bg-amber-50/45 text-amber-800 border-amber-200 "
                    : "bg-slate-900/40 text-amber-400 border border-amber-950/60"
                }`}
              >
                <span>
                  Linked to secretion — faster spread when γ-PGA yield is higher
                </span>
              </div>
            ) : (
              <input
                type="range"
                min="0.10"
                max="0.95"
                step="0.05"
                value={config.spreadProb}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    spreadProb: parseFloat(e.target.value),
                  }))
                }
                className={`w-full accent-amber-500 cursor-ew-resize ${isLightMode ? "bg-stone-200 h-1.5 rounded" : ""}`}
              />
            )}
            {/* Rigorous physical front speed (Fisher–KPP), reported alongside the schematic map. */}
            <div
              className={`mt-2 p-2.5 rounded text-[10px] font-mono border leading-relaxed ${isLightMode ? "bg-teal-50/50 border-teal-200 text-stone-700" : "bg-teal-950/15 border-teal-900/30 text-slate-300"}`}
            >
              <div className="flex items-center gap-1 mb-1 font-bold not-italic">
                <Gauge
                  className={`w-3.5 h-3.5 ${isLightMode ? "text-teal-700" : "text-teal-400"}`}
                />
                <GlossaryTerm term="fisher-kpp">Fisher–KPP</GlossaryTerm> colony
                front
              </div>
              <div className="flex justify-between">
                <span>c = 2√(D·µ)</span>
                <span
                  className={
                    isLightMode ? "text-teal-800 font-bold" : "text-teal-300"
                  }
                >
                  {kin.speed_mm_day.toFixed(1)} mm·day⁻¹
                </span>
              </div>
              <div className="flex justify-between">
                <span>doubling t_d = ln2/µ</span>
                <span>{kin.doubling_h.toFixed(1)} h</span>
              </div>
              <div className="flex justify-between">
                <span>Ca²⁺ sliding retained</span>
                <span
                  className={
                    kin.caRetainedFraction < 0.6
                      ? isLightMode
                        ? "text-teal-700 font-bold"
                        : "text-teal-400"
                      : ""
                  }
                >
                  {(kin.caRetainedFraction * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Ca²⁺ dosing — suppresses sliding motility (a spread-limiting lever we already control). */}
          <div>
            <div
              className={`flex justify-between text-[11px] mb-1 ${isLightMode ? "text-stone-701" : "text-slate-400"}`}
            >
              <div className="group relative flex items-center gap-1 cursor-help">
                <Droplet
                  className={`w-3.5 h-3.5 ${isLightMode ? "text-teal-600" : "text-teal-400"}`}
                />
                <span
                  className={`underline decoration-dotted underline-offset-2 ${isLightMode ? "decoration-stone-300" : "decoration-slate-600"}`}
                >
                  Ca²⁺ Dose (sliding suppression)
                </span>
                <Info className="w-3.5 h-3.5 text-slate-500 hover:text-teal-455 transition" />
                <div
                  className={`absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-64 p-2 text-[10px] rounded border z-25 font-sans leading-relaxed ${isLightMode ? "bg-white text-stone-800 border-amber-900/15" : "bg-slate-950 text-slate-300 border border-slate-800"}`}
                >
                  The same Ca²⁺ dosed for γ-PGA cross-linking / MICP complexes
                  surfactin and disables flagellum-independent sliding, lowering
                  the colony diffusivity D (Kubota &amp; Kobayashi 2017). Higher
                  Ca²⁺ → slower spread.
                </div>
              </div>
              <span
                className={`font-mono px-1 py-0.5 rounded text-[10px] border ${isLightMode ? "bg-teal-50 border-teal-200 text-teal-800 font-bold" : "bg-teal-950/40 text-teal-400 border border-teal-900/30"}`}
              >
                {caConc.toFixed(1)} mM
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={caConc}
              onChange={(e) => setCaConc(parseFloat(e.target.value))}
              className={`w-full accent-teal-500 cursor-ew-resize ${isLightMode ? "bg-stone-200 h-1.5 rounded" : ""}`}
            />
          </div>

          <div>
            <div
              className={`flex justify-between text-[11px] mb-1 ${isLightMode ? "text-stone-701" : "text-slate-400"}`}
            >
              <div className="group relative flex items-center gap-1 cursor-help">
                <span
                  className={`underline decoration-dotted underline-offset-2 ${isLightMode ? "decoration-stone-300" : "decoration-slate-600"}`}
                >
                  Water Consumption Efficiency
                </span>
                <Info className="w-3.5 h-3.5 text-slate-500 hover:text-teal-455 transition" />
                <div
                  className={`absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-64 p-2 text-[10px] rounded border z-25 font-sans leading-relaxed ${isLightMode ? "bg-white text-stone-800 border-amber-900/15" : "bg-slate-950 text-slate-300 border border-slate-800"}`}
                >
                  Nutrient/water uptake rate of bacillus colony clusters per
                  simulated generation generation step.
                </div>
              </div>
              <span
                className={`font-mono px-1 py-0.5 rounded text-[10px] border ${isLightMode ? "bg-red-50 border-red-200 text-red-800 font-bold" : "bg-red-950/40 text-red-400 border border-red-900/30"}`}
              >
                {(config.resourceConsume * 100).toFixed(0)}% step⁻¹
              </span>
            </div>
            <input
              type="range"
              min="0.02"
              max="0.40"
              step="0.02"
              value={config.resourceConsume}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  resourceConsume: parseFloat(e.target.value),
                }))
              }
              className={`w-full accent-red-500 cursor-ew-resize ${isLightMode ? "bg-stone-200 h-1.5 rounded" : ""}`}
            />
          </div>

          <div>
            <label
              className={`text-[11px] mb-1.5 block font-mono tracking-wider uppercase ${isLightMode ? "text-stone-701 font-bold" : "text-slate-400"}`}
            >
              Map Resolution
            </label>
            <select
              value={config.gridSize}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  gridSize: parseInt(e.target.value),
                }))
              }
              className={`w-full p-2 rounded text-xs font-semibold font-mono outline-none border ${
                isLightMode
                  ? "bg-amber-50/65 border-amber-900/12 text-stone-800"
                  : "bg-[#1c1512] border-slate-800 text-slate-300"
              }`}
            >
              <option value="30">Compact (30 x 30)</option>
              <option value="50">Medium Standard (50 x 50)</option>
              <option value="80">Dense Matrix (80 x 80)</option>
            </select>
          </div>
        </div>

        {/* Dynamic biosafety locks */}
        <div
          className={`mt-5 pt-4 border-t font-sans ${isLightMode ? "border-amber-900/10" : "border-slate-800"}`}
        >
          <h4
            className={`text-[11px] font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1 font-mono ${isLightMode ? "text-amber-800" : "text-slate-400"}`}
          >
            <ShieldHalf
              className={`w-3.5 h-3.5 ${isLightMode ? "text-amber-600" : "text-amber-400"}`}
            />
            <GlossaryTerm term="kill-switch">Genetic Containment</GlossaryTerm>{" "}
            Validation
          </h4>
          <p
            className={`text-[10px] leading-normal mb-3 ${isLightMode ? "text-stone-605 font-medium" : "text-slate-500"}`}
          >
            A <GlossaryTerm term="maze-mazf">MazE/MazF</GlossaryTerm>{" "}
            toxin–antitoxin{" "}
            <GlossaryTerm term="kill-switch">kill-switch</GlossaryTerm> contains
            the engineered <i>B. subtilis</i> ({binderLabel}): the plasmid
            dilutes out over ~8–20 generations and the switch also fires if
            surface moisture falls below ~5%, blocking overspread and horizontal
            gene transfer to wild strains.
          </p>

          {/* Quantitative escape-frequency biosafety calculator — the real "spread probability". */}
          <div
            className={`mb-3 p-3 rounded border font-mono ${isLightMode ? "bg-white border-amber-900/12" : "bg-[#1c1512] border-slate-800"}`}
          >
            <div
              className={`flex justify-between text-[10px] mb-1.5 font-sans ${isLightMode ? "text-stone-701" : "text-slate-400"}`}
            >
              <span className="font-bold uppercase tracking-wider">
                Kill-switch escape frequency
              </span>
              <span
                className={`px-1 py-0.5 rounded text-[10px] border font-mono ${escape.meetsNIH ? (isLightMode ? "bg-teal-50 border-teal-200 text-teal-800 font-bold" : "bg-teal-950/40 text-teal-400 border-teal-900/40") : isLightMode ? "bg-rose-50 border-rose-200 text-rose-800 font-bold" : "bg-rose-950/40 text-rose-400 border-rose-900/40"}`}
              >
                {sci(pEscape)} cell⁻¹
              </span>
            </div>
            <input
              type="range"
              min="6"
              max="9"
              step="0.5"
              value={escapeExp}
              onChange={(e) => setEscapeExp(parseFloat(e.target.value))}
              className={`w-full accent-teal-500 cursor-ew-resize ${isLightMode ? "bg-stone-200 h-1.5 rounded" : ""}`}
            />
            <div
              className={`flex justify-between text-[9px] mt-0.5 font-sans ${isLightMode ? "text-stone-500" : "text-slate-500"}`}
            >
              <span>leaky 10⁻⁶</span>
              <span>
                per switch: 10<sup>−{escapeExp}</sup>
              </span>
              <span>tight 10⁻⁹</span>
            </div>

            <label
              className={`flex items-center justify-between mt-2.5 cursor-pointer text-[10px] font-sans ${isLightMode ? "text-stone-700" : "text-slate-300"}`}
            >
              <span className="flex items-center gap-1.5 font-bold">
                <ShieldCheck
                  className={`w-3.5 h-3.5 ${isLightMode ? "text-teal-600" : "text-teal-400"}`}
                />
                Redundant orthogonal switch (×)
              </span>
              <input
                type="checkbox"
                checked={redundantSwitch}
                onChange={(e) => setRedundantSwitch(e.target.checked)}
                className="rounded accent-teal-500"
              />
            </label>
            <p
              className={`text-[9px] mt-1 leading-normal font-sans ${isLightMode ? "text-stone-500" : "text-slate-500"}`}
            >
              Two independent switches multiply their escape frequencies — the
              design route to beating the NIH 10⁻⁸ line.
            </p>

            {/* Field-scale consequence: expected escapees over a treated hectare. */}
            <div
              className={`mt-3 pt-2.5 border-t space-y-1 ${isLightMode ? "border-amber-900/10" : "border-slate-800"}`}
            >
              <div
                className={`flex justify-between text-[10px] ${isLightMode ? "text-stone-600" : "text-slate-400"}`}
              >
                <span>Deployed cells (per ha)</span>
                <span>{sci(escape.population)}</span>
              </div>
              <div
                className={`flex justify-between text-[10px] ${isLightMode ? "text-stone-600" : "text-slate-400"}`}
              >
                <span>Expected escapees (N·p)</span>
                <span
                  className={
                    escape.containedAtScale
                      ? isLightMode
                        ? "text-teal-700 font-bold"
                        : "text-teal-400"
                      : isLightMode
                        ? "text-rose-700 font-bold"
                        : "text-rose-400"
                  }
                >
                  {sci(escape.expectedEscapees)}
                </span>
              </div>
              <div
                className={`flex justify-between text-[10px] ${isLightMode ? "text-stone-600" : "text-slate-400"}`}
              >
                <span>P(≥1 escapee / ha)</span>
                <span>
                  {escape.pAtLeastOne < 1e-4
                    ? sci(escape.pAtLeastOne)
                    : `${(escape.pAtLeastOne * 100).toFixed(1)}%`}
                </span>
              </div>
              <div
                className={`mt-1.5 flex items-center gap-1.5 p-1.5 rounded text-[9px] font-sans font-bold border ${escape.containedAtScale ? (isLightMode ? "bg-teal-50 text-teal-800 border-teal-200" : "bg-teal-950/30 text-teal-400 border-teal-900/40") : isLightMode ? "bg-rose-50 text-rose-800 border-rose-200" : "bg-rose-950/30 text-rose-400 border-rose-900/40"}`}
              >
                {escape.containedAtScale ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" /> Contained at hectare
                    scale — fewer than one escapee expected (vs NIH 10⁻⁸
                    single-cell target: {escape.meetsNIH ? "met" : "not met"}).
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5" />{" "}
                    {escape.expectedEscapees.toExponential(1)} escapees expected
                    per ha — enable the redundant switch or tighten the design.
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2 font-mono">
            <div
              className={`flex items-center justify-between p-2.5 rounded text-[11px] border ${isLightMode ? "bg-amber-50/20 border-amber-900/10" : "bg-[#1c1512] border-slate-800"}`}
            >
              <span
                className={
                  isLightMode ? "text-stone-500 font-bold" : "text-slate-400"
                }
              >
                Active Population:
              </span>
              <span
                className={`font-bold ${density > 0 ? (isLightMode ? "text-teal-700" : "text-teal-400") : "text-slate-500"}`}
              >
                {density > 0 ? `${density}%` : "Extinct"}
              </span>
            </div>
            <div
              className={`flex items-center justify-between p-2.5 rounded text-[11px] border ${isLightMode ? "bg-amber-50/20 border-amber-900/10" : "bg-[#1c1512] border-slate-800"}`}
            >
              <span
                className={
                  isLightMode ? "text-stone-500 font-bold" : "text-slate-400"
                }
              >
                Crust Coverage ({binderLabel}):
              </span>
              <span
                className={`font-bold ${isLightMode ? "text-teal-700" : "text-teal-400"}`}
              >
                {gelCoverage}%
              </span>
            </div>
            {killSwitchTriggered && (
              <div
                className={`border-2 border-dashed p-2.5 rounded text-[10px] font-bold leading-normal ${
                  isLightMode
                    ? "bg-teal-50 text-teal-800 border-teal-300"
                    : "bg-[#081810] text-teal-400 border-teal-800"
                }`}
              >
                ✓ BIOSAFETY VERIFIED: MazE/MazF kill-switch operational — live
                microbes cleared while the {binderLabel} sand crust remains
                intact.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid Canvas Sandbox */}
      <div
        className={`lg:col-span-12 xl:col-span-8 p-5 rounded border flex flex-col justify-between font-sans transition-colors duration-300 ${
          isLightMode
            ? "bg-white border-amber-900/10"
            : "bg-[#1c1512] border-slate-800/80"
        }`}
      >
        <div>
          <div className="flex flex-wrap gap-3 justify-between items-center mb-3">
            <h3
              className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 font-mono ${isLightMode ? "text-amber-955" : "text-slate-200"}`}
            >
              <Sparkles
                className={`w-5 h-5 ${isLightMode ? "text-amber-600 animate-pulse" : "text-amber-400"}`}
              />
              Deployment-Site Colony Map
            </h3>

            {/* Run triggers */}
            <div className="flex gap-2.5 font-mono">
              <button
                onClick={initSimulation}
                className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors border ${
                  isLightMode
                    ? "bg-amber-50 text-stone-800 border-amber-900/12 hover:bg-amber-100/50"
                    : "bg-[#1c1512] border-slate-800 hover:text-white text-slate-400"
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" /> Re-seed
              </button>
              <button
                onClick={() =>
                  isRunning ? setIsRunning(false) : tickSimulation()
                }
                className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors border ${
                  isLightMode
                    ? "bg-amber-50 text-stone-800 border-amber-900/12 hover:bg-amber-100/50"
                    : "bg-[#1c1512] border-slate-800 hover:text-white text-slate-400"
                }`}
              >
                Step
              </button>
              <button
                onClick={() => setIsRunning((r) => !r)}
                className={`px-3 py-1 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition border ${
                  isRunning
                    ? isLightMode
                      ? "bg-rose-50 text-rose-800 border-rose-250 "
                      : "bg-rose-950 text-rose-300 border border-rose-900/60"
                    : isLightMode
                      ? "bg-amber-50 text-amber-800 border-amber-250 "
                      : "bg-amber-950 text-amber-300 border border-amber-900/60"
                }`}
              >
                {isRunning ? "Pause Ticks" : "Start Growth"}
              </button>
            </div>
          </div>
          <p
            className={`text-[11px] leading-relaxed mb-4 ${isLightMode ? "text-stone-605 font-medium" : "text-slate-400"}`}
          >
            An overhead view of the treated patch. Click anywhere to inoculate a
            colony; watch it spread along the moisture front, lay down{" "}
            {binderLabel}, and then self-terminate as the{" "}
            <GlossaryTerm term="maze-mazf">MazE/MazF</GlossaryTerm> plasmid
            dilutes out — leaving crust but no live microbes.
          </p>

          <div className="flex flex-col md:flex-row gap-6 items-start justify-center">
            {/* Bird's-eye deployment-site map (responsive, square) */}
            <div
              ref={canvasWrapRef}
              className={`relative aspect-square w-full max-w-[460px] flex-1 rounded-xl overflow-hidden ring-1 ${isLightMode ? "ring-amber-900/15 bg-[#e8dcc0]" : "ring-slate-800 bg-[#1c1512]"}`}
            >
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className="block w-full h-full cursor-crosshair animate-fade-in"
              />
              <div className="absolute top-2 right-2 flex flex-col gap-1">
                <span
                  className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded text-right font-mono border ${isLightMode ? "bg-white/85 text-stone-800 border-amber-900/12" : "bg-slate-950/70 backdrop-blur text-slate-300"}`}
                >
                  Generation {steps}
                </span>
              </div>
              <div className="absolute bottom-2 left-2">
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono border ${isLightMode ? "bg-white/80 text-stone-600 border-amber-900/12" : "bg-slate-950/60 backdrop-blur text-slate-400"}`}
                >
                  bird&apos;s-eye · click to inoculate
                </span>
              </div>
            </div>

            {/* Color Metrics and Legend */}
            <div className="w-full md:w-44 space-y-4">
              <div
                className={`font-mono text-xs space-y-3 p-3 border rounded ${isLightMode ? "bg-[#fdfaf3]/55 border-amber-900/10 text-stone-604" : "bg-[#1c1512] border border-slate-800 text-slate-400"}`}
              >
                <span
                  className={`text-[10px] font-bold block tracking-widest uppercase ${isLightMode ? "text-stone-500" : "text-slate-500"}`}
                >
                  Legends
                </span>

                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded inline-block border ${isLightMode ? "bg-[#e8dcc0] border-amber-200" : "bg-[#1a1712] border-slate-800"}`}
                  ></span>
                  <span>Desert sand (darker = damp)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded inline-block ${isLightMode ? "bg-[#b07568]" : "bg-[#c28a7c]"}`}
                  ></span>
                  <span>
                    Active <i>B. subtilis</i>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded inline-block"
                    style={{
                      background: `rgb(${crustRGB[0]},${crustRGB[1]},${crustRGB[2]})`,
                    }}
                  ></span>
                  <span>{binderLabel} crust</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded inline-block ${isLightMode ? "bg-stone-400" : "bg-slate-500"}`}
                  ></span>
                  <span>Just died (kill-switch)</span>
                </div>
              </div>

              {/* Statistical Progress Columns */}
              <div
                className={`space-y-3 font-mono ${isLightMode ? "text-stone-604" : "text-slate-400"}`}
              >
                <div>
                  <div className="flex justify-between text-[10px] mb-1 font-bold">
                    <span>MOISTURE LEVEL:</span>
                    <span
                      className={
                        isLightMode ? "text-teal-705" : "text-teal-400"
                      }
                    >
                      {resourceLevel}%
                    </span>
                  </div>
                  <div
                    className={`w-full h-1.5 rounded-full overflow-hidden border ${isLightMode ? "bg-stone-100 border-amber-900/10" : "bg-[#1c1512] border border-slate-800"}`}
                  >
                    <div
                      className="bg-teal-500 h-full transition-all"
                      style={{ width: `${resourceLevel}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] mb-1 font-bold">
                    <span>CRUST FORMATION:</span>
                    <span
                      className={
                        isLightMode ? "text-teal-705" : "text-teal-400"
                      }
                    >
                      {gelCoverage}%
                    </span>
                  </div>
                  <div
                    className={`w-full h-1.5 rounded-full overflow-hidden border ${isLightMode ? "bg-stone-100 border-amber-900/10" : "bg-[#1c1512] border border-slate-800"}`}
                  >
                    <div
                      className="bg-teal-500 h-full transition-all"
                      style={{ width: `${gelCoverage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
