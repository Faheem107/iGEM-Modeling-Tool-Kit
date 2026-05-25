import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Wind, ShieldCheck, HelpCircle, Sliders, RefreshCw, Layers, ArrowLeft, Play, Pause, Thermometer, Droplet } from 'lucide-react';

interface WetLabSandbox2DProps {
  onBack: () => void;
  universalVitals?: {
    pgaAccum: number;
    shearModulus: number;
  };
}

export default function WetLabSandbox2D({ onBack, universalVitals }: WetLabSandbox2DProps) {
  // --- REAL LABORATORY ENTER-ABLE VALUES IN WET LAB ASSAY ---
  const [labOD600, setLabOD600] = useState<number>(1.8);          // OD600 units (range 0.1 to 4.0)
  const [labInocVolume, setLabInocVolume] = useState<number>(30);   // mL/dm3 sand (range 2 to 100)
  const [labGlutamate, setLabGlutamate] = useState<number>(50);     // mM glutamate precursor concentration (range 0 to 120)
  const [labSalinity, setLabSalinity] = useState<number>(2.0);      // g/L divalent calcium salts (range 0.1 to 12.0)
  const [labTemp, setLabTemp] = useState<number>(37);               // °C Incubation temperature (range 15 to 55)
  const [enableNoise, setEnableNoise] = useState<boolean>(true);   // Experimental noise to mimic life
  const [windFriction, setWindFriction] = useState<number>(0.65);   // m/s friction velocity u*
  
  // Real-time micro noise oscillation value
  const [noiseVal, setNoiseVal] = useState<number>(1.0);
  const [explainTab, setExplainTab] = useState<'context' | 'math'>('context');

  useEffect(() => {
    if (!enableNoise) {
      setNoiseVal(1.0);
      return;
    }
    const interval = setInterval(() => {
      // Gentle brownian noise
      setNoiseVal(prev => {
        const delta = (Math.random() - 0.5) * 0.035;
        const next = prev + delta;
        return Math.max(0.88, Math.min(1.12, next));
      });
    }, 850);
    return () => clearInterval(interval);
  }, [enableNoise]);

  // Derived biophysical model mappings
  // 1. Bacterial density maps from OD600 & Inoculation volume
  const cellDensity = useMemo(() => {
    return labOD600 * (labInocVolume / 22) * noiseVal;
  }, [labOD600, labInocVolume, noiseVal]);

  // 2. Precursor feeding speed maps from Glutamate feed and heat optimality (37°C is Bacillus peak metabolic yield)
  const precursorFeed = useMemo(() => {
    const tempFactor = Math.max(0.12, 1.0 - Math.abs(labTemp - 37) * 0.026);
    return (labGlutamate / 10.0) * tempFactor * noiseVal;
  }, [labGlutamate, labTemp, noiseVal]);

  // 3. Salinity cation conversion maps g/L to mol/m3 divalent calcium coordinates
  const salinityInput = useMemo(() => {
    return labSalinity * 5.4 * noiseVal;
  }, [labSalinity, noiseVal]);

  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [stormSeverity, setStormSeverity] = useState<'mild' | 'severe' | 'gale'>('severe');

  // Trigger storm event on the sandbox
  const [stormActive, setStormActive] = useState<boolean>(false);
  const [erosionUntreated, setErosionUntreated] = useState<number>(0);
  const [erosionTreated, setErosionTreated] = useState<number>(0);

  // Derive downstream biophysical outcomes from the wet-lab inputs
  // 1. Secreted PGA concentration = Density * Precursor efficiency
  const derivedPGA = useMemo(() => {
    return Math.min(220, cellDensity * precursorFeed * 4.5);
  }, [cellDensity, precursorFeed]);

  // 2. Crosslinking saturation state
  const saturationFactor = useMemo(() => {
    const Kd = 4.0;
    return salinityInput / (Kd + salinityInput);
  }, [salinityInput]);

  // 3. Lattice Shear Modulus G (Pascal)
  const derivedShearModulus = useMemo(() => {
    const baseG = 250;
    const concentrationEffect = derivedPGA * 12.5;
    const coordinationEffect = saturationFactor * 1.5;
    return Math.min(3800, baseG + concentrationEffect * coordinationEffect);
  }, [derivedPGA, saturationFactor]);

  // 4. Critical Erosion Threshold Speed
  const u_star_critical = useMemo(() => {
    const untreatedThresh = 0.15; // base
    const bioGelCohesion = derivedShearModulus * 0.0000015;
    return untreatedThresh + Math.sqrt(bioGelCohesion / 1.225);
  }, [derivedShearModulus]);

  // Birds-Eye 2D Canvas Ref and loop
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Persistent Grid state refs to prevent resetting dunes elevation on parameter changes!
  interface GridCell {
    height: number;      // 0.0 to 1.0 (amount of sand left)
    organicBind: number; // 0.0 to 1.0 (biopolymer crosslinking binder strength)
    revealedBedrock: boolean;
  }
  const untreatedGridRef = useRef<GridCell[][]>([]);
  const treatedGridRef = useRef<GridCell[][]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let frame = 0;

    // Simulation Grid Sizes: We represent a top-down sandy land segment
    const cols = 40;
    const rows = 35;
    const cellW = canvas.width / 2 / cols;
    const cellH = canvas.height / rows;

    // Lazy initialization of grid refs
    if (untreatedGridRef.current.length === 0 || treatedGridRef.current.length === 0) {
      const untreatedList: GridCell[][] = [];
      const treatedList: GridCell[][] = [];

      for (let r = 0; r < rows; r++) {
        untreatedList[r] = [];
        treatedList[r] = [];
        for (let c = 0; c < cols; c++) {
          const duneNoise = 0.5 + 0.32 * Math.sin(c * 0.28) * Math.cos(r * 0.18) + Math.random() * 0.12;
          const initialHeight = Math.max(0.25, Math.min(1.0, duneNoise));

          untreatedList[r][c] = {
            height: initialHeight,
            organicBind: 0.0,
            revealedBedrock: false
          };

          treatedList[r][c] = {
            height: initialHeight,
            organicBind: 0.0,
            revealedBedrock: false
          };
        }
      }
      untreatedGridRef.current = untreatedList;
      treatedGridRef.current = treatedList;
    }

    // Reactively update binding coefficients based on the current derived parameters
    const polymerInfiltration = Math.min(1.0, (derivedShearModulus / 1800) * 0.95);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (treatedGridRef.current[r] && treatedGridRef.current[r][c]) {
          treatedGridRef.current[r][c].organicBind = polymerInfiltration * (0.85 + (Math.sin(r + c) * 0.1));
        }
      }
    }

    // Dynamic wind sweeping particles
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

      // Wet-lab parameters directly regulate erosion likelihood under wind storms
      const currentWind = windFriction * (stormActive ? 1.6 : 1.0); // wind spikes during storm event
      
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

          // --- Untreated sands physics ---
          if (untreatedGrid[r] && untreatedGrid[r][c]) {
            const utCell = untreatedGrid[r][c];
            const untreatedDiff = currentWind - 0.22;
            if (untreatedDiff > 0 && utCell.height > 0) {
              const erodeProb = untreatedDiff * 0.0125 * (1.1 + 0.15 * Math.sin(frame * 0.1));
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
                    life: 45
                  });
                }
              }
            }
            if (utCell.height === 0 || utCell.revealedBedrock) {
              totalUntreatedErosion++;
            }
          }

          // --- Treated sands physics ---
          if (treatedGrid[r] && treatedGrid[r][c]) {
            const trCell = treatedGrid[r][c];
            const treatedDiff = currentWind - u_star_critical;
            if (treatedDiff > 0 && trCell.height > 0) {
              const stabilizerEfficiency = trCell.organicBind; // 0 to 1
              const baseErodeProb = treatedDiff * 0.0125;
              const absoluteErodeProb = baseErodeProb * Math.max(0, 1.0 - stabilizerEfficiency * 0.995);

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
                    life: 30
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

      // Calculate cumulative erosion percentage metrics
      setErosionUntreated(Math.min(100, Math.round((totalUntreatedErosion / untreatedOriginalCount) * 100)));
      setErosionTreated(Math.min(100, Math.round((totalTreatedErosion / treatedOriginalCount) * 100)));

      // Update blown sand particles
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

      // Render Untreated Dunes (Left Side)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (!untreatedGrid[r] || !untreatedGrid[r][c]) continue;
          const cell = untreatedGrid[r][c];
          const x = c * cellW;
          const y = r * cellH;

          if (cell.revealedBedrock) {
            ctx.fillStyle = '#1e110b';
          } else {
            const val = Math.floor(100 + cell.height * 115);
            ctx.fillStyle = `rgb(${val}, ${Math.floor(val * 0.68)}, ${Math.floor(val * 0.32)})`;
          }
          ctx.fillRect(x, y, cellW, cellH);

          ctx.strokeStyle = '#05070a';
          ctx.lineWidth = 0.25;
          ctx.strokeRect(x, y, cellW, cellH);
        }
      }

      // Render Treated Bio-stabilized Dunes (Right Side)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (!treatedGrid[r] || !treatedGrid[r][c]) continue;
          const cell = treatedGrid[r][c];
          const x = canvas.width / 2 + c * cellW;
          const y = r * cellH;

          if (cell.revealedBedrock) {
            ctx.fillStyle = '#1e110b';
          } else {
            const val = Math.floor(100 + cell.height * 115);
            const rComp = Math.floor(val * (1.0 - cell.organicBind * 0.8));
            const gComp = Math.floor(val * (0.68 + cell.organicBind * 0.3));
            const bComp = Math.floor(val * (0.32 + cell.organicBind * 0.45));
            ctx.fillStyle = `rgb(${rComp}, ${gComp}, ${bComp})`;
          }
          ctx.fillRect(x, y, cellW, cellH);

          ctx.strokeStyle = '#05070a';
          ctx.lineWidth = 0.25;
          ctx.strokeRect(x, y, cellW, cellH);

          // Overlay web nodes representing polymer mesh
          if (cell.organicBind > 0.4 && frame % 120 < 60 && Math.random() < 0.01) {
            ctx.strokeStyle = 'rgba(110, 231, 183, 0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + cellW * 3, y + cellH * 2);
            ctx.stroke();
          }
        }
      }

      // Draw Separator Wall line
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();

      // Render dust storm particles
      particles.forEach((p) => {
        ctx.fillStyle = p.isTreated ? 'rgba(52, 211, 153, 0.75)' : 'rgba(245, 158, 11, 0.6)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.isTreated ? 1.5 : 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Ambient wind vector indications flowing horizontally
      if (stormActive || windFriction > 0.40) {
        ctx.strokeStyle = 'rgba(238, 242, 255, 0.08)';
        ctx.lineWidth = 1;
        const windSpeedLines = stormActive ? 12 : 5;
        for (let i = 0; i < windSpeedLines; i++) {
          const ly = (i * canvas.height / windSpeedLines + frame * 4) % canvas.height;
          const lx = (frame * (windFriction * 18)) % canvas.width;
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx + 50, ly);
          ctx.stroke();
        }
      }

      // Chamber title texts on canvas
      ctx.fillStyle = 'rgba(3, 5, 8, 0.85)';
      ctx.fillRect(20, 15, 195, 26);
      ctx.fillRect(canvas.width / 2 + 20, 15, 265, 26);
      
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.strokeRect(20, 15, 195, 26);
      ctx.strokeRect(canvas.width / 2 + 20, 15, 265, 26);

      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f59e0b';
      ctx.fillText('🔴 UNTREATED DRY DUNES', 30, 31);
      ctx.fillStyle = '#34d399';
      ctx.fillText('🟢 BIO-STABILIZED COATED DUNES', canvas.width / 2 + 30, 31);

      // Warning alarm overlay if storm triggered
      if (stormActive) {
        ctx.fillStyle = `rgba(239, 68, 68, ${0.05 + 0.04 * Math.sin(frame * 0.15)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#fca5a5';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚡️ ACTIVE COYOTE AEOLIAN GUST STORM TEST IN PROGRESS ⚡️', canvas.width / 2, canvas.height - 20);
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [cellDensity, precursorFeed, salinityInput, windFriction, isSimulating, stormActive, u_star_critical, derivedShearModulus]);

  return (
    <div className="min-h-screen bg-[#030508] text-slate-200 p-6 md:p-8 font-sans" id="wetlab-comparison-frame">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-emerald-950 border border-emerald-500/80 text-emerald-400 font-mono text-[9px] uppercase tracking-widest font-black px-2.5 py-1 rounded">
                NYUAD iGEM 2026 Wet-Lab Assay
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight uppercase">
              Wet-Lab Parameter Simulation Sandbox
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl mt-1 leading-relaxed">
              Feed experimental laboratory values directly into our 2D birds-eye dune lattice. Monitor organic matrix propagation and see sands protected structurally during real-time Simulated Dust Gales.
            </p>
          </div>
          <button 
            onClick={onBack}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded font-bold font-mono text-[#22d3ee] hover:text-white text-xs tracking-wider transition cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" /> Exit Sandbox & Equations
          </button>
        </div>

        {/* Central Core Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Controls Sidebar (Left Column) */}
          <div className="lg:col-span-5 space-y-6 bg-[#0a0f18] p-5 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-100 flex items-center gap-2 font-mono">
                <Sliders className="w-4 h-4 text-[#22d3ee]" />
                Lab Parameter Registry
              </h3>
              {/* Noise toggle control */}
              <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-400 p-1 bg-slate-900 border border-slate-800 rounded">
                <input 
                  type="checkbox" 
                  checked={enableNoise}
                  onChange={(e) => setEnableNoise(e.target.checked)}
                  className="rounded accent-emerald-500 w-3.5 h-3.5 cursor-pointer"
                />
                <span>Micro noise fluctuation</span>
              </label>
            </div>

            {/* Input Slider 1 - Initial OD600 */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
                <span className="font-semibold text-slate-200">Initial Colony Optical Density (<code className="text-[#22d3ee]">OD₆₀₀</code>)</span>
                <span className="font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-900/35 px-1.5 py-0.5 rounded text-[10px]">{labOD600.toFixed(2)} Target</span>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="range" min="0.1" max="4.0" step="0.1"
                  value={labOD600} 
                  onChange={(e) => setLabOD600(parseFloat(e.target.value))}
                  className="grow h-1.5 rounded accent-cyan-500 cursor-ew-resize"
                />
                <input 
                  type="number" min="0.1" max="4.0" step="0.1"
                  value={labOD600}
                  onChange={(e) => setLabOD600(Math.max(0.1, Math.min(4.0, parseFloat(e.target.value) || 0.1)))}
                  className="w-16 bg-[#030508] text-[#22d3ee] border border-slate-800 focus:border-cyan-500 rounded px-1.5 py-0.5 text-xs font-mono text-center outline-none"
                />
              </div>
              <span className="text-[9px] text-slate-500 block mt-1">Direct spectrophotometer measurement of initial Bacillus cell density.</span>
            </div>

            {/* Input Slider 2 - Inoculation Volume */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
                <span className="font-semibold text-slate-200">Inoculation Vol (Per dm³ soil)</span>
                <span className="font-mono text-indigo-400 bg-indigo-950/40 border border-indigo-900/30 px-1.5 py-0.5 rounded text-[10px]">{labInocVolume.toFixed(0)} mL</span>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="range" min="2" max="100" step="2"
                  value={labInocVolume} 
                  onChange={(e) => setLabInocVolume(parseInt(e.target.value))}
                  className="grow h-1.5 rounded accent-indigo-500 cursor-ew-resize"
                />
                <input 
                  type="number" min="2" max="100" step="2"
                  value={labInocVolume}
                  onChange={(e) => setLabInocVolume(Math.max(2, Math.min(100, parseInt(e.target.value) || 2)))}
                  className="w-16 bg-[#030508] text-indigo-400 border border-slate-800 focus:border-indigo-500 rounded px-1.5 py-0.5 text-xs font-mono text-center outline-none"
                />
              </div>
              <span className="text-[9px] text-slate-500 block mt-1">Suspended liquid volume distributed through the sand matrix.</span>
            </div>

            {/* Input Slider 3 - Glutamate Precursor */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
                <span className="font-semibold text-slate-200">L-Glutamate Dosing (<code className="text-emerald-400">[S]₀</code>)</span>
                <span className="font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-1.5 py-0.5 rounded text-[10px]">{labGlutamate.toFixed(0)} mM</span>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="range" min="0" max="120" step="5"
                  value={labGlutamate} 
                  onChange={(e) => setLabGlutamate(parseInt(e.target.value))}
                  className="grow h-1.5 rounded accent-emerald-500 cursor-ew-resize"
                />
                <input 
                  type="number" min="0" max="120" step="5"
                  value={labGlutamate}
                  onChange={(e) => setLabGlutamate(Math.max(0, Math.min(120, parseInt(e.target.value) || 0)))}
                  className="w-16 bg-[#030508] text-emerald-400 border border-slate-800 focus:border-emerald-500 rounded px-1.5 py-0.5 text-xs font-mono text-center outline-none"
                />
              </div>
              <span className="text-[9px] text-slate-500 block mt-1">Precursor concentrations fueling Bacillus monomer production kinetics.</span>
            </div>

            {/* Input Slider 4 - Nutrient Salinity Ca2+ */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
                <span className="font-semibold text-slate-200">Divalent Calcium salt (<code className="text-[#f59e0b]">[CaCl₂]</code>)</span>
                <span className="font-mono text-amber-400 bg-amber-950/30 border border-amber-900/30 px-1.5 py-0.5 rounded text-[10px]">{labSalinity.toFixed(2)} g/L</span>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="range" min="0.1" max="12.0" step="0.1"
                  value={labSalinity} 
                  onChange={(e) => setLabSalinity(parseFloat(e.target.value))}
                  className="grow h-1.5 rounded accent-amber-550 cursor-ew-resize"
                />
                <input 
                  type="number" min="0.1" max="12.0" step="0.1"
                  value={labSalinity}
                  onChange={(e) => setLabSalinity(Math.max(0.1, Math.min(12.0, parseFloat(e.target.value) || 0.1)))}
                  className="w-16 bg-[#030508] text-amber-400 border border-slate-800 focus:border-amber-500 rounded px-1.5 py-0.5 text-xs font-mono text-center outline-none"
                />
              </div>
              <span className="text-[9px] text-slate-500 block mt-1">Divalent calcium sources to crosslink polymeric carboxylate chains.</span>
            </div>

            {/* Input Slider 5 - Incubation Temp */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
                <span className="font-semibold text-slate-200">Incubation Temperature (<code className="text-rose-400">T</code>)</span>
                <span className="font-mono text-rose-450 bg-rose-950/30 border border-rose-900/30 px-1.5 py-0.5 rounded text-[10px]">{labTemp.toFixed(1)} °C</span>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="range" min="15" max="55" step="1"
                  value={labTemp} 
                  onChange={(e) => setLabTemp(parseFloat(e.target.value))}
                  className="grow h-1.5 rounded accent-rose-500 cursor-ew-resize"
                />
                <input 
                  type="number" min="15" max="55" step="1"
                  value={labTemp}
                  onChange={(e) => setLabTemp(Math.max(15, Math.min(55, parseInt(e.target.value) || 37)))}
                  className="w-16 bg-[#030508] text-rose-400 border border-slate-800 focus:border-rose-500 rounded px-1.5 py-0.5 text-xs font-mono text-center outline-none"
                />
              </div>
              <span className="text-[9px] text-slate-550 block mt-1">Optimal growth temperature is 37°C. Extreme temperatures inhibit yield.</span>
            </div>

            {/* UAE Region Wind Speeds Presets */}
            <div className="pt-3 border-t border-slate-850/80">
              <span className="text-[9px] font-black text-slate-400 tracking-wider block mb-2 font-mono uppercase">UAE Desert Profile Wind Presets</span>
              <div className="grid grid-cols-3 gap-1.5 text-[9px] font-mono">
                <button 
                  onClick={() => setWindFriction(0.35)}
                  className={`p-1.5 rounded border transition cursor-pointer text-left ${windFriction === 0.35 ? 'bg-cyan-950/40 text-cyan-400 border-cyan-500/80' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                >
                  <strong className="block text-[8px] text-slate-200">Al Ain Shamal</strong>
                  <span>u* = 0.35 m/s</span>
                </button>
                <button 
                  onClick={() => setWindFriction(0.65)}
                  className={`p-1.5 rounded border transition cursor-pointer text-left ${windFriction === 0.65 ? 'bg-indigo-950/40 text-indigo-400 border-indigo-500/80' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                >
                  <strong className="block text-[8px] text-slate-200">Al Jaraf Gale</strong>
                  <span>u* = 0.65 m/s</span>
                </button>
                <button 
                  onClick={() => setWindFriction(1.15)}
                  className={`p-1.5 rounded border transition cursor-pointer text-left ${windFriction === 1.15 ? 'bg-red-950/40 text-red-400 border-red-500/80' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                >
                  <strong className="block text-[8px] text-slate-200">Liwa Severe Sand</strong>
                  <span>u* = 1.15 m/s</span>
                </button>
              </div>
            </div>

            {/* Wind Friction Slider */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Custom Wind Friction speed (<code className="text-emerald-400">u*</code>)</span>
                <span className="font-mono bg-emerald-950/30 text-emerald-400 px-1.5 py-0.5 rounded text-[10px]">{windFriction.toFixed(2)} m/s</span>
              </div>
              <input 
                type="range" min="0.10" max="1.50" step="0.05" 
                value={windFriction} 
                onChange={(e) => setWindFriction(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded accent-emerald-500 cursor-ew-resize"
              />
            </div>

            {/* Downstream Calculated Physical Metrics */}
            <div className="pt-4 border-t border-slate-850/80 space-y-2 font-mono text-xs">
              <div className="flex justify-between text-[9px] font-black text-slate-500 tracking-wider">
                <span>CONVERTED OUTCOMES</span>
                {enableNoise && (
                  <span className="text-[#34d399] animate-pulse">Live Noise: {noiseVal.toFixed(3)}x</span>
                )}
              </div>
              
              <div className="flex justify-between items-center py-1 bg-black/35 rounded border border-slate-900/40 px-2">
                <span className="text-slate-400">Bacterial Density (X_0):</span>
                <span className="font-bold text-[#22d3ee]">{cellDensity.toFixed(2)} × 10⁷ c/mL</span>
              </div>

              <div className="flex justify-between items-center py-1 bg-black/35 rounded border border-slate-900/40 px-2">
                <span className="text-slate-400">Secreted γ-PGA:</span>
                <span className="font-bold text-indigo-400">{derivedPGA.toFixed(1)} mg/L</span>
              </div>

              <div className="flex justify-between items-center py-1 bg-black/35 rounded border border-slate-900/40 px-2">
                <span className="text-slate-400">Lattice Shear Modulus (Gs):</span>
                <span className="font-bold text-[#f59e0b]">{derivedShearModulus.toFixed(1)} Pa</span>
              </div>

              <div className="flex justify-between items-center py-1 bg-black/35 rounded border border-slate-900/40 px-2">
                <span className="text-slate-400">Erosion Speed Threshold (u_s_t):</span>
                <span className="font-bold text-emerald-400">{u_star_critical.toFixed(3)} m/s</span>
              </div>
            </div>

            {/* Interactive Simulation Controls */}
            <div className="pt-4 border-t border-slate-850/80 space-y-2">
              <span className="text-[10px] font-black font-mono text-slate-400 tracking-widest block uppercase">Dune Gale Test Rig</span>
              
              <button 
                onClick={() => setStormActive(prev => !prev)}
                className={`w-full py-2.5 rounded font-mono font-bold text-xs tracking-wider uppercase transition flex items-center justify-center gap-2 cursor-pointer ${stormActive ? 'bg-red-500 hover:bg-red-600 text-black shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse' : 'bg-amber-500 hover:bg-amber-600 text-black'}`}
              >
                <Wind className="w-4 h-4 animate-spin" />
                {stormActive ? '🔥 STOP STORM EVENT' : '🌪 LAUNCH STORM GALE EVENT'}
              </button>

              <button 
                onClick={() => setIsSimulating(prev => !prev)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-450 hover:text-white rounded font-mono text-[10px] tracking-widest uppercase transition flex items-center justify-center gap-2 cursor-pointer border border-slate-800"
              >
                {isSimulating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {isSimulating ? 'Pause dune grid' : 'Resume dune grid'}
              </button>
            </div>

          </div>

          {/* Side-by-Side Live 2D Sandbox Grid Rendering (Right Column) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Visual Indicators Banner Box */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-red-950/15 border border-red-900/40 rounded-xl relative overflow-hidden flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-bold font-mono text-slate-400 tracking-wider block">UNTREATED DUNE EROSION (%)</span>
                  <span className="text-3xl font-extrabold font-mono text-red-400 tracking-tighter mt-1 block">{erosionUntreated}%</span>
                </div>
                <p className="text-[10px] text-slate-450 leading-normal font-sans mt-2">
                  Dry sands slip easily under wind drag above <code className="text-slate-300">0.22 m/s</code>, creating sand dispersal.
                </p>
                <div className="absolute right-5 bottom-3 text-red-500/10">
                  <Droplet className="w-16 h-16 shrink-0" />
                </div>
              </div>

              <div className="p-4 bg-emerald-900/10 border border-emerald-900/40 rounded-xl relative overflow-hidden flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-bold font-mono text-slate-400 tracking-wider block">BIO-STABILIZED COATED EROSION (%)</span>
                  <span className="text-3xl font-extrabold font-mono text-emerald-400 tracking-tighter mt-1 block">{erosionTreated}%</span>
                </div>
                <p className="text-[10px] text-slate-450 leading-normal font-sans mt-2">
                  Organically bound grains successfully resist shear stresses up to <code className="text-emerald-400">{u_star_critical.toFixed(2)} m/s</code>.
                </p>
                <div className="absolute right-5 bottom-3 text-emerald-500/10">
                  <ShieldCheck className="w-16 h-16 shrink-0" />
                </div>
              </div>
            </div>

            {/* Real Interactive Canvas Map Container */}
            <div className="border border-slate-800/80 rounded-xl overflow-hidden shadow-2xl bg-[#06080d] p-3">
              <canvas 
                ref={canvasRef} 
                width={720} 
                height={350} 
                className="w-full h-auto block rounded animate-fade-in"
              />
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-2 px-1">
                <span>Top-down Birds-Eye Dune Elevation Lattice Plane</span>
                <span>Adjust inputs to observe dynamic erosion shifts</span>
              </div>
            </div>

            {/* TWO-TABS PANEL: HELP vs MATHEMATICAL MODELS */}
            <div className="bg-[#0a0f18] border border-slate-800 rounded-xl overflow-hidden">
              <div className="flex border-b border-slate-800 bg-[#070b12] text-[11px] font-mono">
                <button 
                  onClick={() => setExplainTab('context')}
                  className={`px-4 py-2.5 border-r border-slate-800 font-bold transition flex items-center gap-1.5 cursor-pointer selection:bg-transparent ${explainTab === 'context' ? 'bg-[#0a0f18] text-[#22d3ee]' : 'text-slate-400 hover:text-slate-200 bg-black/10'}`}
                >
                  <HelpCircle className="w-4 h-4 text-cyan-400" /> Assay Context
                </button>
                <button 
                  onClick={() => setExplainTab('math')}
                  className={`px-4 py-2.5 font-bold transition flex items-center gap-1.5 cursor-pointer selection:bg-transparent ${explainTab === 'math' ? 'bg-[#0a0f18] text-[#a5b4fc]' : 'text-slate-400 hover:text-slate-200 bg-black/10'}`}
                >
                  📖 Mathematical Equations & Logic
                </button>
              </div>
              <div className="p-4 text-xs">
                {explainTab === 'context' ? (
                  <div className="animate-fadeIn space-y-3 leading-relaxed">
                    <p className="text-slate-350">
                      Our synthetic <em className="italic text-slate-100">Bacillus subtilis</em> cells secrete robust <span className="text-[#34d399] font-bold">Poly-γ-Glutamic Acid (γ-PGA)</span> biopolymers upon eating glutamate precursors. Divalent cations (Ca²⁺ molecules from divalent calcium salt) then chelate the carboxyl groups on adjacent γ-PGA strands, securing quartz particles within a microscopic stabilizing mesh.
                    </p>
                    <p className="text-slate-350">
                      In this comparative top-down model, the left lane models pristine untreated sand dunes which rapidly wash, blow, and erode away at wind friction thresholds above <code className="text-amber-400 text-[10px]">0.22 m/s</code>. The right lane shows the sand treated with our bio-organic glue matrix, securely resisting extreme Shamal wind friction speeds up to <code className="text-[#34d399] text-[10px]">{u_star_critical.toFixed(2)} m/s</code>.
                    </p>
                  </div>
                ) : (
                  <div className="animate-fadeIn space-y-3 font-mono text-[10.5px] text-slate-450 leading-normal">
                    <h4 className="text-xs font-bold text-slate-250 font-sans uppercase tracking-wider mb-2">🔭 Downstream System Relationships</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div className="p-2.5 bg-[#04060a] border border-slate-850 rounded">
                        <span className="text-cyan-400 font-bold block mb-1">1. Bio-synthetic Yield:</span>
                        <code>γ-PGA = Density(X₀) * Feed(S₀) * Optimum(T)</code>
                        <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                          Maximized near biological optimum warm temperature (37°C), regulating organic glue abundance.
                        </p>
                      </div>
                      <div className="p-2.5 bg-[#04060a] border border-slate-850 rounded text-left">
                        <span className="text-amber-400 font-bold block mb-1 font-sans">2. Metal-Polymer Coordinate Chelation:</span>
                        <code>Saturation (θ) = [Ca²⁺] / (Kd + [Ca²⁺])</code>
                        <p className="text-[10px] text-slate-500 mt-1 leading-normal font-sans">
                          Binds polymer chains using divalent calcium links, solidifying sand cohesiveness.
                        </p>
                      </div>
                      <div className="p-2.5 bg-[#04060a] border border-slate-850 rounded">
                        <span className="text-indigo-400 font-bold block mb-1">3. Sand Shear Modulus Gs:</span>
                        <code>Gs = G_base + Yield_PGA * θ * Elasticity</code>
                        <p className="text-[10px] text-slate-500 mt-1 leading-normal font-sans">
                          Affinement elastomer network model calculating structural stiffness (measured in Pascals).
                        </p>
                      </div>
                      <div className="p-2.5 bg-[#04060a] border border-slate-850 rounded">
                        <span className="text-emerald-400 font-bold block mb-1">4. Threshold Windspeed u*t:</span>
                        <code>u*t = u_base + sqrt(Cohesion_Gs * Thickness / Air_Density)</code>
                        <p className="text-[10px] text-slate-500 mt-1 leading-normal font-sans">
                          The absolute wind friction speed limit before the dune starts suffering aeolian erosion.
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
    </div>
  );
}
