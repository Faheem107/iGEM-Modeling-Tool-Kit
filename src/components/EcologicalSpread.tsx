import React, { useState, useEffect, useRef } from 'react';
import { CAConfig } from '../types';
import { Bug, Sparkles, RefreshCw, Layers, ShieldHalf, TrendingUp, HelpCircle, Info, Link2 } from 'lucide-react';

interface EcologicalProps {
  config: CAConfig;
  setConfig: React.Dispatch<React.SetStateAction<CAConfig>>;
  pgaAccum: number;
  isLinked: boolean;
  setIsLinked: (val: boolean) => void;
  isLightMode: boolean;
}

export default function EcologicalSpread({
  config,
  setConfig,
  pgaAccum,
  isLinked,
  setIsLinked,
  isLightMode,
}: EcologicalProps) {
  const [steps, setSteps] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [density, setDensity] = useState<number>(0);
  const [resourceLevel, setResourceLevel] = useState<number>(100);
  const [gelCoverage, setGelCoverage] = useState<number>(0);
  const [killSwitchTriggered, setKillSwitchTriggered] = useState<boolean>(false);

  // Derive propagation speed dynamically when bound
  const effectiveSpreadProb = isLinked ? Math.min(0.95, 0.2 + (pgaAccum / 220) * 0.7) : config.spreadProb;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Grid states: 
  // 0 = empty sand
  // 1 = active bacteria
  // 2 = dead/kill-switch activated
  // 3 = only biopolymeric gel residue left behind
  const gridRef = useRef<number[][]>([]);
  const resourceGridRef = useRef<number[][]>([]);
  const pgaGridRef = useRef<number[][]>([]);

  // Initialize grids
  const initSimulation = () => {
    const size = config.gridSize;
    const tempGrid = Array(size).fill(0).map(() => Array(size).fill(0));
    const tempRes = Array(size).fill(0).map(() => Array(size).fill(1.0)); // full resources
    const tempPGA = Array(size).fill(0).map(() => Array(size).fill(0.0));

    if (config.initialInoculation === 'center') {
      const mid = Math.floor(size / 2);
      // seed a small cluster in center
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          tempGrid[mid + dx][mid + dy] = 1;
        }
      }
    } else if (config.initialInoculation === 'corners') {
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
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cellWidth = canvas.width / config.gridSize;
    const cellHeight = canvas.height / config.gridSize;

    const col = Math.floor(x / cellWidth);
    const row = Math.floor(y / cellHeight);

    if (row >= 0 && row < config.gridSize && col >= 0 && col < config.gridSize) {
      gridRef.current[row][col] = 1; // Seed bacteria
      resourceGridRef.current[row][col] = 1.0; // Refresh resources locally
      updateMetrics();
    }
  };

  // Perform one step of Cellular Automata cellular spread rules
  const tickSimulation = () => {
    const size = config.gridSize;
    const grid = gridRef.current;
    const res = resourceGridRef.current;
    const pga = pgaGridRef.current;

    if (grid.length === 0) return;

    const nextGrid = grid.map(row => [...row]);
    const nextRes = res.map(row => [...row]);
    const nextPGA = pga.map(row => [...row]);

    let activeBactCount = 0;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const state = grid[r][c];
        const currentResource = res[r][c];

        if (state === 1) {
          activeBactCount++;
          // Secrete γ-PGA in current cell
          nextPGA[r][c] = Math.min(1.0, pga[r][c] + 0.15);

          // Consumes localized water/nutrients
          const remainingRes = Math.max(0, currentResource - config.resourceConsume);
          nextRes[r][c] = remainingRes;

          // Biosafety rule: Kill switch self-limiting constraint when resources run dry
          if (remainingRes <= 0.05) {
            nextGrid[r][c] = 2; // Die
          }

          // Spread to immediate neighbors (von Neumann & Moore coordinates) if resources permit
          if (currentResource > 0.15) {
            const neighbors = [
              [r - 1, c], [r + 1, c],
              [r, c - 1], [r, c + 1],
              [r - 1, c - 1], [r - 1, c + 1],
              [r + 1, c - 1], [r + 1, c + 1]
            ];

            neighbors.forEach(([nr, nc]) => {
              // Boundary conditions check
              if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                if (grid[nr][nc] === 0 && Math.random() < effectiveSpreadProb) {
                  // Only spreads if there's sufficient moisture in neighbor
                  if (res[nr][nc] > 0.2) {
                    nextGrid[nr][nc] = 1;
                  }
                }
              }
            });
          }
        } else if (state === 2) {
          // Dead bacteria cell. Can leave polymeric bio-cement gel structure behind.
          nextGrid[r][c] = 3;
        }
      }
    }

    gridRef.current = nextGrid;
    resourceGridRef.current = nextRes;
    pgaGridRef.current = nextPGA;
    
    setSteps(prev => prev + 1);

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
        if (gridRef.current[r]?.[c] === 2 || gridRef.current[r]?.[c] === 3) totalDead++;
        totalRes += resourceGridRef.current[r]?.[c] || 0;
        totalPGA += pgaGridRef.current[r]?.[c] || 0;
      }
    }

    const cellCount = size * size;
    setDensity(parseFloat(((totalBact / cellCount) * 100).toFixed(1)));
    setResourceLevel(parseFloat(((totalRes / cellCount) * 100).toFixed(1)));
    setGelCoverage(parseFloat(((totalPGA / cellCount) * 100).toFixed(1)));
  };

  // Canvas drawing effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const size = config.gridSize;
    const cellWidth = canvas.width / size;
    const cellHeight = canvas.height / size;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const state = gridRef.current[r]?.[c] || 0;
        const resOfCell = resourceGridRef.current[r]?.[c] || 0;
        const pgaOfCell = pgaGridRef.current[r]?.[c] || 0;

        // Custom Sand Biofilm Palette
        if (state === 1) {
          ctx.fillStyle = isLightMode ? '#059669' : '#10b981'; // Bright Neon Green active colony
        } else if (state === 2) {
          ctx.fillStyle = isLightMode ? '#94a3b8' : '#475569'; // Dormant gray
        } else if (state === 3) {
          ctx.fillStyle = isLightMode 
            ? `rgba(14, 165, 233, ${Math.min(1.0, pgaOfCell * 0.95 + 0.3)})` 
            : `rgba(6, 182, 212, ${Math.min(1.0, pgaOfCell * 0.9 + 0.25)})`; // Neon cyan polymeric gel
        } else {
          if (isLightMode) {
            // Empty sand - warm yellow sand scaling with resource level (moisture content)
            const rVal = Math.floor(253 - resOfCell * 18);
            const gVal = Math.floor(251 - resOfCell * 28);
            const bVal = Math.floor(245 - resOfCell * 42);
            ctx.fillStyle = `rgb(${rVal}, ${gVal}, ${bVal})`;
          } else {
            // Empty sand - dark charcoal with color scaling based on water/resource content
            const rVal = Math.floor(10 + resOfCell * 24);
            const gVal = Math.floor(14 + resOfCell * 26);
            const bVal = Math.floor(22 + resOfCell * 42);
            ctx.fillStyle = `rgb(${rVal}, ${gVal}, ${bVal})`;
          }
        }

        ctx.fillRect(c * cellWidth, r * cellHeight, cellWidth, cellHeight);
        
        if (config.gridSize <= 30) {
          ctx.strokeStyle = isLightMode ? '#efe7d1' : '#0f172a';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(c * cellWidth, r * cellHeight, cellWidth, cellHeight);
        }
      }
    }
  }, [steps, config.gridSize, isLightMode]);

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
    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 rounded-xl border transition-all duration-300 ${isLightMode ? 'bg-[#fdfaf3] border-amber-900/10 shadow-[0_4px_24px_rgba(139,94,26,0.06)]' : 'bg-[#06080d] border-slate-800 shadow-xl'}`} id="ecological-spread-panel">
      {/* Rules Config Panel */}
      <div className={`lg:col-span-12 xl:col-span-4 p-5 rounded border transition-colors duration-300 ${isLightMode ? 'bg-white border-amber-900/10' : 'bg-[#0a0f18] border-slate-800/80'} font-sans`}>
        <h3 className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 mb-4 font-mono ${isLightMode ? 'text-amber-955' : 'text-slate-100'}`}>
          <Bug className={`w-5 h-5 ${isLightMode ? 'text-indigo-600' : 'text-indigo-400'}`} />
          Biosafety & Spread Controls
        </h3>

        <div className="space-y-4">
          {/* Universal Linkage switch */}
          <div className={`p-3 rounded text-xs mb-2 ${isLightMode ? 'bg-indigo-50/45 border border-indigo-200' : 'bg-indigo-950/15 border border-indigo-900/35'}`}>
            <label className="flex items-center justify-between cursor-pointer">
              <span className={`flex items-center gap-1.5 font-bold ${isLightMode ? 'text-indigo-805 text-sm' : 'text-indigo-400'}`}>
                <Link2 className={`w-4 h-4 animate-pulse ${isLightMode ? 'text-indigo-600 font-bold' : 'text-indigo-400'}`} />
                Link Growth Speed to Secretion
              </span>
              <input 
                type="checkbox" 
                checked={isLinked} 
                onChange={(e) => setIsLinked(e.target.checked)}
                className="rounded accent-indigo-500"
              />
            </label>
            <p className={`text-[10px] mt-1 font-sans leading-normal ${isLightMode ? 'text-stone-605 font-medium' : 'text-slate-400'}`}>
              When enabled, moisture spread speed (<code className={isLightMode ? 'text-indigo-600 font-mono font-bold' : 'text-indigo-400'}>P_spread</code>) is directly proportional to Intracellular PGA secretion yield computed from dynamic metabolic ODE simulations.
            </p>
          </div>

          <div>
            <span className={`text-[11px] font-bold block mb-1.5 uppercase font-[#854d0e] tracking-wider ${isLightMode ? 'text-stone-710' : 'text-slate-400'}`}>Inoculation Pattern</span>
            <div className={`grid grid-cols-3 gap-1.5 p-1 rounded border font-mono ${isLightMode ? 'bg-[#fdfaf3] border-amber-900/10 shadow-sm' : 'bg-[#06080d] border border-slate-800'}`}>
              {(['center', 'corners', 'random'] as const).map((pat) => (
                <button
                  key={pat}
                  onClick={() => setConfig(prev => ({ ...prev, initialInoculation: pat }))}
                  className={`px-2 py-1 text-[9px] font-bold rounded capitalize cursor-pointer transition ${config.initialInoculation === pat ? (isLightMode ? 'bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-sm' : 'bg-indigo-950 text-indigo-300 border border-indigo-900/60') : (isLightMode ? 'text-stone-500 hover:text-stone-800 bg-[#ffffff] border border-stone-200/40 hover:border-indigo-400' : 'text-slate-500 hover:text-slate-300')}`}
                >
                  {pat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className={`flex justify-between text-[11px] mb-1 ${isLightMode ? 'text-stone-701' : 'text-slate-400'}`}>
              <div className="group relative flex items-center gap-1 cursor-help">
                <span className={`underline decoration-dotted underline-offset-2 ${isLightMode ? 'decoration-stone-300' : 'decoration-slate-600'}`}>Moisture Spread Probability</span>
                <Info className="w-3.5 h-3.5 text-slate-500 hover:text-cyan-455 transition" />
                <div className={`absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-64 p-2 text-[10px] rounded border shadow-xl z-25 font-sans leading-relaxed ${isLightMode ? 'bg-white text-stone-800 border-amber-900/15' : 'bg-slate-950 text-slate-300 border border-slate-800'}`}>
                  The raw probability rate of vegetative binary fission and cellular spread to adjacent porous sand cavities.
                </div>
              </div>
              <span className={`font-mono px-1 py-0.5 rounded text-[10px] border ${isLightMode ? 'bg-indigo-50 border-indigo-200 text-indigo-805 font-bold' : 'bg-indigo-950/40 text-indigo-400 border border-indigo-900/30'}`}>{(effectiveSpreadProb * 100).toFixed(0)}%</span>
            </div>
            {isLinked ? (
              <div className={`py-2.5 px-3 rounded text-[11px] font-mono flex items-center gap-1.5 border ${
                isLightMode 
                  ? 'bg-indigo-50/45 text-indigo-800 border-indigo-200 shadow-sm' 
                  : 'bg-slate-900/40 text-indigo-400 border border-indigo-950/60'
              }`}>
                <span>Bound: Math.min(0.95, 0.2 + PGA * 0.003)</span>
              </div>
            ) : (
              <input 
                type="range" min="0.10" max="0.95" step="0.05"
                value={config.spreadProb} 
                onChange={(e) => setConfig(prev => ({ ...prev, spreadProb: parseFloat(e.target.value) }))}
                className={`w-full accent-indigo-500 cursor-ew-resize ${isLightMode ? 'bg-stone-200 h-1.5 rounded' : ''}`}
              />
            )}
          </div>

          <div>
            <div className={`flex justify-between text-[11px] mb-1 ${isLightMode ? 'text-stone-701' : 'text-slate-400'}`}>
              <div className="group relative flex items-center gap-1 cursor-help">
                <span className={`underline decoration-dotted underline-offset-2 ${isLightMode ? 'decoration-stone-300' : 'decoration-slate-600'}`}>Water Consumption Efficiency</span>
                <Info className="w-3.5 h-3.5 text-slate-500 hover:text-cyan-455 transition" />
                <div className={`absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-64 p-2 text-[10px] rounded border shadow-xl z-25 font-sans leading-relaxed ${isLightMode ? 'bg-white text-stone-800 border-amber-900/15' : 'bg-slate-950 text-slate-300 border border-slate-800'}`}>
                  Nutrient/water uptake rate of bacillus colony clusters per simulated generation generation step.
                </div>
              </div>
              <span className={`font-mono px-1 py-0.5 rounded text-[10px] border ${isLightMode ? 'bg-red-50 border-red-200 text-red-800 font-bold' : 'bg-red-950/40 text-red-400 border border-red-900/30'}`}>{(config.resourceConsume * 100).toFixed(0)}% step⁻¹</span>
            </div>
            <input 
              type="range" min="0.02" max="0.40" step="0.02"
              value={config.resourceConsume} 
              onChange={(e) => setConfig(prev => ({ ...prev, resourceConsume: parseFloat(e.target.value) }))}
              className={`w-full accent-red-500 cursor-ew-resize ${isLightMode ? 'bg-stone-200 h-1.5 rounded' : ''}`}
            />
          </div>

          <div>
            <label className={`text-[11px] mb-1.5 block font-mono tracking-wider uppercase ${isLightMode ? 'text-stone-701 font-bold' : 'text-slate-400'}`}>Simulation Grid Density</label>
            <select 
              value={config.gridSize} 
              onChange={(e) => setConfig(prev => ({ ...prev, gridSize: parseInt(e.target.value) }))}
              className={`w-full p-2 rounded text-xs font-semibold font-mono outline-none border ${
                isLightMode 
                  ? 'bg-amber-50/65 border-amber-900/12 text-stone-800' 
                  : 'bg-[#06080d] border-slate-800 text-slate-300'
              }`}
            >
              <option value="30">Compact (30 x 30)</option>
              <option value="50">Medium Standard (50 x 50)</option>
              <option value="80">Dense Matrix (80 x 80)</option>
            </select>
          </div>
        </div>

        {/* Dynamic biosafety locks */}
        <div className={`mt-5 pt-4 border-t font-sans ${isLightMode ? 'border-amber-900/10' : 'border-slate-800'}`}>
          <h4 className={`text-[11px] font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1 font-mono ${isLightMode ? 'text-indigo-800' : 'text-slate-400'}`}>
            <ShieldHalf className={`w-3.5 h-3.5 ${isLightMode ? 'text-indigo-600' : 'text-indigo-400'}`} />
            Genetic Containment Validation
          </h4>
          <p className={`text-[10px] leading-normal mb-3 ${isLightMode ? 'text-stone-605 font-medium' : 'text-slate-500'}`}>
            NYUAD&apos;s biosafe design features a synthetic kill-switch limits substrate viability. Apoptosis triggers automatically online if ambient sand moisture falls below standard thresholds &lt;5%.
          </p>

          <div className="space-y-2 font-mono">
            <div className={`flex items-center justify-between p-2.5 rounded text-[11px] border ${isLightMode ? 'bg-amber-50/20 border-amber-900/10' : 'bg-[#06080d] border-slate-800'}`}>
              <span className={isLightMode ? 'text-stone-500 font-bold' : 'text-slate-400'}>Active Population:</span>
              <span className={`font-bold ${density > 0 ? (isLightMode ? 'text-emerald-700' : 'text-emerald-400') : 'text-slate-500'}`}>
                {density > 0 ? `${density}%` : 'Extinct'}
              </span>
            </div>
            <div className={`flex items-center justify-between p-2.5 rounded text-[11px] border ${isLightMode ? 'bg-amber-50/20 border-amber-900/10' : 'bg-[#06080d] border-slate-800'}`}>
              <span className={isLightMode ? 'text-stone-500 font-bold' : 'text-slate-400'}>Biofilm Sand Crust:</span>
              <span className={`font-bold ${isLightMode ? 'text-cyan-700' : 'text-cyan-400'}`}>{gelCoverage}%</span>
            </div>
            {killSwitchTriggered && (
              <div className={`border-2 border-dashed p-2.5 rounded text-[10px] font-bold leading-normal ${
                isLightMode 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                  : 'bg-[#081810] text-emerald-400 border-emerald-800'
              }`}>
                ✓ BIOSAFETY VERIFIED: Kill-switch shutoff fully operational. All live microbes terminated successfully. Stable γ-PGA reinforced sand crust maintained!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid Canvas Sandbox */}
      <div className={`lg:col-span-12 xl:col-span-8 p-5 rounded border flex flex-col justify-between font-sans transition-colors duration-300 ${
        isLightMode ? 'bg-white border-amber-900/10' : 'bg-[#0a0f18] border-slate-800/80'
      }`}>
        <div>
          <div className="flex flex-wrap gap-3 justify-between items-center mb-3">
            <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 font-mono ${isLightMode ? 'text-amber-955' : 'text-slate-200'}`}>
              <Sparkles className={`w-5 h-5 ${isLightMode ? 'text-indigo-600 animate-pulse' : 'text-indigo-400'}`} />
              Microscopic Population Sandbox
            </h3>

            {/* Run triggers */}
            <div className="flex gap-2.5 font-mono">
              <button 
                onClick={initSimulation}
                className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors border ${
                  isLightMode 
                    ? 'bg-amber-50 text-stone-800 border-amber-900/12 hover:bg-amber-100/50' 
                    : 'bg-[#06080d] border-slate-800 hover:text-white text-slate-400'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" /> Re-seed
              </button>
              <button 
                onClick={() => isRunning ? setIsRunning(false) : tickSimulation()}
                className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors border ${
                  isLightMode 
                    ? 'bg-amber-50 text-stone-800 border-amber-900/12 hover:bg-amber-100/50' 
                    : 'bg-[#06080d] border-slate-800 hover:text-white text-slate-400'
                }`}
              >
                Step
              </button>
              <button 
                onClick={() => setIsRunning(r => !r)}
                className={`px-3 py-1 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition border ${
                  isRunning 
                    ? (isLightMode ? 'bg-rose-50 text-rose-800 border-rose-250 shadow-sm' : 'bg-rose-950 text-rose-300 border border-rose-900/60') 
                    : (isLightMode ? 'bg-indigo-50 text-indigo-800 border-indigo-250 shadow-sm' : 'bg-indigo-950 text-indigo-300 border border-indigo-900/60')
                }`}
              >
                {isRunning ? 'Pause Ticks' : 'Start Growth'}
              </button>
            </div>
          </div>
          <p className={`text-[11px] leading-relaxed mb-4 ${isLightMode ? 'text-stone-605 font-medium' : 'text-slate-400'}`}>
            Click anywhere inside the sandbox grid to manual inoculate custom biological colonies. Watch bacteria secrete <strong className={isLightMode ? 'text-cyan-705' : 'text-cyan-400'}>PGA biopolymer (cyan)</strong> radially until moisture runs dry.
          </p>

          <div className="flex flex-col md:flex-row gap-6 items-center justify-center">
            {/* Simulation Matrix Canvas */}
            <div className={`relative border-4 rounded overflow-hidden shadow-2xl ${isLightMode ? 'border-amber-900/15 bg-white' : 'border-slate-900 bg-[#06090f]'}`}>
              <canvas 
                ref={canvasRef} 
                width={330} 
                height={330} 
                onClick={handleCanvasClick}
                className="block cursor-crosshair animate-fade-in"
              />
              <div className="absolute top-2 right-2 flex flex-col gap-1">
                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded text-right font-mono border ${isLightMode ? 'bg-white/90 text-stone-800 border-amber-900/12' : 'bg-slate-950/80 backdrop-blur text-slate-300'}`}>
                  Tick Frame: {steps}
                </span>
              </div>
            </div>

            {/* Color Metrics and Legend */}
            <div className="w-full md:w-44 space-y-4">
              <div className={`font-mono text-xs space-y-3 p-3 border rounded ${isLightMode ? 'bg-[#fdfaf3]/55 border-amber-900/10 text-stone-604' : 'bg-[#06080d] border border-slate-800 text-slate-400'}`}>
                <span className={`text-[10px] font-bold block tracking-widest uppercase ${isLightMode ? 'text-stone-500' : 'text-slate-500'}`}>Legends</span>
                
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded inline-block border ${isLightMode ? 'bg-[#fdfaf3] border-amber-200' : 'bg-[#121622] border-slate-800'}`}></span>
                  <span>Coarse Desert Sand</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded inline-block ${isLightMode ? 'bg-[#059669]' : 'bg-[#10b981]'}`}></span>
                  <span>Active Bacillus</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded inline-block ${isLightMode ? 'bg-[#0ea5e9]' : 'bg-[#06b6d4]'}`}></span>
                  <span>PGA Bio-cement</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded inline-block ${isLightMode ? 'bg-stone-400' : 'bg-slate-500'}`}></span>
                  <span>Terminated (Apopted)</span>
                </div>
              </div>

              {/* Statistical Progress Columns */}
              <div className={`space-y-3 font-mono ${isLightMode ? 'text-stone-604' : 'text-slate-400'}`}>
                <div>
                  <div className="flex justify-between text-[10px] mb-1 font-bold">
                    <span>MOISTURE LEVEL:</span>
                    <span className={isLightMode ? 'text-cyan-705' : 'text-cyan-400'}>{resourceLevel}%</span>
                  </div>
                  <div className={`w-full h-1.5 rounded-full overflow-hidden border ${isLightMode ? 'bg-stone-100 border-amber-900/10' : 'bg-[#06080d] border border-slate-800'}`}>
                    <div className="bg-cyan-500 h-full transition-all" style={{ width: `${resourceLevel}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] mb-1 font-bold">
                    <span>CRUST FORMATION:</span>
                    <span className={isLightMode ? 'text-emerald-705' : 'text-emerald-400'}>{gelCoverage}%</span>
                  </div>
                  <div className={`w-full h-1.5 rounded-full overflow-hidden border ${isLightMode ? 'bg-stone-100 border-amber-900/10' : 'bg-[#06080d] border border-slate-800'}`}>
                    <div className="bg-emerald-500 h-full transition-all" style={{ width: `${gelCoverage}%` }}></div>
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
