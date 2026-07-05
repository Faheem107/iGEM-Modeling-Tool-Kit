import React, { useState, useMemo, useEffect } from 'react';
import { MetabolicParams, SimulationStep } from '../types';
import { simulateMetabolicODE, calibrateKcat } from '../lib/physics';
import { Play, RotateCcw, Award, Dna, Database, ShieldAlert, Sparkles, Info } from 'lucide-react';
import GlossaryTerm from './GlossaryTerm';
import { ShowMathToggle } from './simulation/_shared';

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
  isLightMode = false
}: MetabolicProps) {

  // RK4 ODE integration — delegated to the shared physics core (single source of truth).
  const simulationData: SimulationStep[] = useMemo(() => simulateMetabolicODE(params), [params]);

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
      setParams(prev => ({ ...prev, k_cat: parseFloat(estimatedKcat.toFixed(2)) }));
    }
  };

  const [activeHoverPoint, setActiveHoverPoint] = useState<SimulationStep | null>(null);
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
      const x = paddingLeft + (d.time / 48) * (width - paddingLeft - paddingRight);
      
      // Standardize heights to plot on dual scales: Left (mRNA & enzyme) vs Right (PGA output)
      const maxLeft = Math.max(maxVals.mRNA, maxVals.enzyme) * 1.1;
      const maxRight = maxVals.pga * 1.1;

      const yMRNA = height - paddingBottom - (d.mRNA / maxLeft) * (height - paddingTop - paddingBottom);
      const yEnzyme = height - paddingBottom - (d.enzyme / maxLeft) * (height - paddingTop - paddingBottom);
      const yPGA = height - paddingBottom - (d.pga / maxRight) * (height - paddingTop - paddingBottom);

      return { x, yMRNA, yEnzyme, yPGA, d, index };
    });
  }, [simulationData, maxVals]);

  const pathMRNA = useMemo(() => points.map(p => `${p.x},${p.yMRNA}`).join(' '), [points]);
  const pathEnzyme = useMemo(() => points.map(p => `${p.x},${p.yEnzyme}`).join(' '), [points]);
  const pathPGA = useMemo(() => points.map(p => `${p.x},${p.yPGA}`).join(' '), [points]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const svgRect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - svgRect.left;
    
    // Find closest index
    const relativeX = (mouseX - paddingLeft) / (width - paddingLeft - paddingRight);
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
    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 rounded-xl border transition-all duration-300 ${
      isLightMode 
        ? 'bg-[#fdfaf3] border-amber-900/10 shadow-[0_4px_24px_rgba(139,94,26,0.06)]' 
        : 'bg-[#06080d] border-slate-800 shadow-xl'
    }`} id="metabolic-module-panel">
      <div className="lg:col-span-12"><ShowMathToggle moduleId="metabolic" isLightMode={isLightMode} /></div>
      {/* Parameters Panel */}
      <div className={`lg:col-span-12 xl:col-span-5 p-5 rounded border transition-colors duration-300 ${isLightMode ? 'bg-white border-amber-900/10' : 'bg-[#0a0f18] border-slate-800/80'}`}>
        <h3 className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 mb-4 font-sans ${isLightMode ? 'text-amber-950' : 'text-slate-100'}`}>
          <Dna className={`w-5 h-5 ${isLightMode ? 'text-cyan-600' : 'text-cyan-400'}`} />
          Intracellular Kinetic Control Unit
        </h3>

        {/* Sliders */}
        <div className="space-y-4 font-sans">
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <div className="group relative flex items-center gap-1 cursor-help">
                <span className={`underline decoration-dotted underline-offset-2 ${isLightMode ? 'text-stone-701 decoration-stone-300' : 'text-slate-400 decoration-slate-600'}`}>Transcription Rate (<code className={isLightMode ? 'text-cyan-700 font-mono font-bold' : 'text-cyan-400 font-mono'}>α_m</code>)</span>
                <Info className={`w-3.5 h-3.5 ${isLightMode ? 'text-stone-400 hover:text-cyan-600' : 'text-slate-500 hover:text-cyan-400'} transition`} />
                <div className={`absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-64 p-2 text-[10px] rounded border shadow-xl z-25 font-sans leading-relaxed ${isLightMode ? 'bg-white text-stone-800 border-amber-900/15' : 'bg-slate-950 text-slate-300 border-slate-800'}`}>
                  Rate of transcribing PgsBCA operon mRNA strands from the DNA synthetic promoter.
                </div>
              </div>
              <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${isLightMode ? 'bg-cyan-50 border border-cyan-200 text-cyan-800 font-bold' : 'bg-cyan-950/50 border border-cyan-900/50 text-cyan-400'}`}>{params.alpha_m.toFixed(1)} h⁻¹</span>
            </div>
            <input 
              type="range" min="0.5" max="15" step="0.5" 
              value={params.alpha_m} 
              onChange={(e) => setParams(p => ({ ...p, alpha_m: parseFloat(e.target.value) }))}
              className={`w-full cursor-ew-resize ${isLightMode ? 'accent-cyan-600 bg-stone-200' : 'accent-cyan-500'}`}
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <div className="group relative flex items-center gap-1 cursor-help">
                <span className={`underline decoration-dotted underline-offset-2 ${isLightMode ? 'text-stone-701 decoration-stone-300' : 'text-slate-400 decoration-slate-600'}`}>mRNA Half-life Degradation (<code className={isLightMode ? 'text-orange-700 font-mono font-bold' : 'text-orange-400 font-mono'}>β_m</code>)</span>
                <Info className={`w-3.5 h-3.5 ${isLightMode ? 'text-stone-400 hover:text-cyan-600' : 'text-slate-500 hover:text-cyan-400'} transition`} />
                <div className={`absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-64 p-2 text-[10px] rounded border shadow-xl z-25 font-sans leading-relaxed ${isLightMode ? 'bg-white text-stone-800 border-amber-900/15' : 'bg-slate-950 text-slate-300 border-slate-800'}`}>
                  Rate at which cellular RNases degrade the transcribed mRNA species.
                </div>
              </div>
              <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${isLightMode ? 'bg-orange-50 border border-orange-200 text-orange-850 font-bold' : 'bg-orange-950/30 border border-orange-900/40 text-orange-400'}`}>{params.beta_m.toFixed(2)} h⁻¹</span>
            </div>
            <input 
              type="range" min="0.01" max="1.0" step="0.05" 
              value={params.beta_m} 
              onChange={(e) => setParams(p => ({ ...p, beta_m: parseFloat(e.target.value) }))}
              className={`w-full cursor-ew-resize ${isLightMode ? 'accent-orange-600 bg-stone-200' : 'accent-orange-500'}`}
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <div className="group relative flex items-center gap-1 cursor-help">
                <span className={`underline decoration-dotted underline-offset-2 ${isLightMode ? 'text-stone-701 decoration-stone-300' : 'text-slate-400 decoration-slate-600'}`}>Enzyme Translation Rate (<code className={isLightMode ? 'text-cyan-700 font-mono font-bold' : 'text-cyan-400 font-mono'}>α_e</code>)</span>
                <Info className={`w-3.5 h-3.5 ${isLightMode ? 'text-stone-400 hover:text-cyan-600' : 'text-slate-500 hover:text-cyan-400'} transition`} />
                <div className={`absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-64 p-2 text-[10px] rounded border shadow-xl z-25 font-sans leading-relaxed ${isLightMode ? 'bg-white text-stone-800 border-amber-900/15' : 'bg-slate-950 text-slate-300 border-slate-800'}`}>
                  Ribosome recruitment speed to translate active PgsB, PgsC, and PgsA enzymes.
                </div>
              </div>
              <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${isLightMode ? 'bg-cyan-50 border border-cyan-200 text-cyan-850 font-bold' : 'bg-cyan-950/50 border border-cyan-900/50 text-cyan-400'}`}>{params.alpha_e.toFixed(1)} h⁻¹</span>
            </div>
            <input 
              type="range" min="0.2" max="5.0" step="0.2" 
              value={params.alpha_e} 
              onChange={(e) => setParams(p => ({ ...p, alpha_e: parseFloat(e.target.value) }))}
              className={`w-full cursor-ew-resize ${isLightMode ? 'accent-cyan-600 bg-stone-200' : 'accent-cyan-400'}`}
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <div className="group relative flex items-center gap-1 cursor-help">
                <span className={`underline decoration-dotted underline-offset-2 ${isLightMode ? 'text-stone-701 decoration-stone-300' : 'text-slate-400 decoration-slate-600'}`}>Enzyme Degradation (<code className={isLightMode ? 'text-amber-700 font-mono font-bold' : 'text-amber-400 font-mono'}>β_e</code>)</span>
                <Info className={`w-3.5 h-3.5 ${isLightMode ? 'text-stone-400 hover:text-cyan-600' : 'text-slate-500 hover:text-cyan-400'} transition`} />
                <div className={`absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-64 p-2 text-[10px] rounded border shadow-xl z-25 font-sans leading-relaxed ${isLightMode ? 'bg-white text-stone-800 border-amber-900/15' : 'bg-slate-950 text-slate-300 border-slate-800'}`}>
                  Intracellular enzyme clearance speed orchestrated by host cell proteasome machinery.
                </div>
              </div>
              <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${isLightMode ? 'bg-amber-50 border border-amber-200 text-amber-850 font-bold' : 'bg-amber-950/30 border border-amber-900/40 text-amber-400'}`}>{params.beta_e.toFixed(3)} h⁻¹</span>
            </div>
            <input 
              type="range" min="0.01" max="0.2" step="0.01" 
              value={params.beta_e} 
              onChange={(e) => setParams(p => ({ ...p, beta_e: parseFloat(e.target.value) }))}
              className={`w-full cursor-ew-resize ${isLightMode ? 'accent-amber-600 bg-stone-200' : 'accent-amber-500'}`}
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <div className="group relative flex items-center gap-1 cursor-help">
                <span className={`underline decoration-dotted underline-offset-2 ${isLightMode ? 'text-stone-701 decoration-stone-300' : 'text-slate-400 decoration-slate-600'}`}><GlossaryTerm term="k-cat">Catalytic Efficiency</GlossaryTerm> (<code className={isLightMode ? 'text-emerald-700 font-mono font-bold' : 'text-emerald-400 font-mono'}>k_cat</code>)</span>
                <Info className={`w-3.5 h-3.5 ${isLightMode ? 'text-stone-400 hover:text-cyan-600' : 'text-slate-500 hover:text-cyan-400'} transition`} />
                <div className={`absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-64 p-2 text-[10px] rounded border shadow-xl z-25 font-sans leading-relaxed ${isLightMode ? 'bg-white text-stone-800 border-amber-900/15' : 'bg-slate-950 text-slate-300 border-slate-800'}`}>
                  Maximum polymer chain synthesis turnover cycle count of the PgsBCA complex per hour.
                </div>
              </div>
              <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${isLightMode ? 'bg-emerald-50 border border-emerald-200 text-emerald-850 font-bold' : 'bg-emerald-950/30 border border-emerald-900/40 text-emerald-400'}`}>{params.k_cat.toFixed(2)} h⁻¹</span>
            </div>
            <input 
              type="range" min="0.1" max="5.0" step="0.1" 
              value={params.k_cat} 
              onChange={(e) => setParams(p => ({ ...p, k_cat: parseFloat(e.target.value) }))}
              className={`w-full cursor-ew-resize ${isLightMode ? 'accent-emerald-600 bg-stone-200' : 'accent-emerald-500'}`}
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <div className="group relative flex items-center gap-1 cursor-help">
                <span className={`underline decoration-dotted underline-offset-2 ${isLightMode ? 'text-stone-701 decoration-stone-300' : 'text-slate-400 decoration-slate-600'}`}>L-Glutamate Precursor (<code className={isLightMode ? 'text-purple-700 font-mono font-bold' : 'text-purple-400 font-mono'}>[S]</code>)</span>
                <Info className={`w-3.5 h-3.5 ${isLightMode ? 'text-stone-400 hover:text-cyan-600' : 'text-slate-500 hover:text-cyan-400'} transition`} />
                <div className={`absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-64 p-2 text-[10px] rounded border shadow-xl z-25 font-sans leading-relaxed ${isLightMode ? 'bg-white text-stone-800 border-amber-900/15' : 'bg-slate-950 text-slate-300 border-slate-800'}`}>
                  Extracellular precursor feeding stock concentration providing monomer units.
                </div>
              </div>
              <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${isLightMode ? 'bg-purple-50 border border-purple-200 text-purple-850 font-bold' : 'bg-purple-950/30 border border-purple-900/40 text-purple-400'}`}>{params.s_precursor.toFixed(1)} mM</span>
            </div>
            <input 
              type="range" min="0.5" max="25" step="0.5" 
              value={params.s_precursor} 
              onChange={(e) => setParams(p => ({ ...p, s_precursor: parseFloat(e.target.value) }))}
              className={`w-full cursor-ew-resize ${isLightMode ? 'accent-purple-600 bg-stone-200' : 'accent-purple-500'}`}
            />
          </div>
        </div>

        {/* Gene Knockouts (Biosafety & Yield Hack) */}
        <div className={`mt-5 pt-4 border-t ${isLightMode ? 'border-amber-905_10' : 'border-slate-800'}`}>
          <span className={`text-[10px] font-bold block mb-3 uppercase tracking-wider font-mono ${isLightMode ? 'text-stone-500' : 'text-slate-500'}`}>Gene Knockout Status</span>
          <div className="grid grid-cols-2 gap-3">
            <label className={`flex items-center justify-between p-2.5 rounded border text-xs cursor-pointer transition ${
              params.ggtKnockout 
                ? isLightMode ? 'border-emerald-700 bg-emerald-50 text-emerald-900' : 'border-emerald-800 bg-emerald-950/20 text-emerald-300' 
                : isLightMode ? 'border-amber-900/10 bg-stone-50 text-stone-600 hover:text-stone-900' : 'border-slate-800 bg-[#080b12] text-slate-500 hover:text-slate-300'
            }`}>
              <div className="flex flex-col">
                <span className="font-mono font-bold">Δggt</span>
                <span className={`text-[9px] font-mono ${isLightMode ? 'text-stone-400' : 'text-slate-500'}`}>Glutamyl-Tferase</span>
              </div>
              <input 
                type="checkbox" 
                checked={params.ggtKnockout} 
                onChange={(e) => setParams(p => ({ ...p, ggtKnockout: e.target.checked }))}
                className="rounded accent-emerald-500 ml-2"
              />
            </label>

            <label className={`flex items-center justify-between p-2.5 rounded border text-xs cursor-pointer transition ${
              params.pgcAKnockout 
                ? isLightMode ? 'border-emerald-700 bg-emerald-50 text-emerald-900' : 'border-emerald-800 bg-emerald-950/20 text-emerald-300' 
                : isLightMode ? 'border-amber-900/10 bg-stone-50 text-stone-600 hover:text-stone-900' : 'border-slate-800 bg-[#080b12] text-slate-500 hover:text-slate-300'
            }`}>
              <div className="flex flex-col">
                <span className="font-mono font-bold">ΔpgcA</span>
                <span className={`text-[9px] font-mono ${isLightMode ? 'text-stone-400' : 'text-slate-500'}`}>Glutamic Hydrolase</span>
              </div>
              <input 
                type="checkbox" 
                checked={params.pgcAKnockout} 
                onChange={(e) => setParams(p => ({ ...p, pgcAKnockout: e.target.checked }))}
                className="rounded accent-emerald-500 ml-2"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Analytics & Graph Panel */}
      <div className={`lg:col-span-12 xl:col-span-7 p-5 rounded border flex flex-col justify-between transition-colors duration-300 ${isLightMode ? 'bg-white border-amber-900/10' : 'bg-[#0a0f18] border-slate-800/80'}`}>
        <div>
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
            <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isLightMode ? 'text-amber-950' : 'text-slate-200'}`}>
              <Database className={`w-4 h-4 animate-pulse ${isLightMode ? 'text-cyan-600' : 'text-cyan-400'}`} />
              Real-time Concentration Dynamics
            </h3>
            <div className="flex gap-4 text-[10px] font-mono">
              <span className={`flex items-center gap-1.5 ${isLightMode ? 'text-cyan-700 font-bold' : 'text-cyan-400'}`}>
                <span className={`w-2 h-2 rounded-full ${isLightMode ? 'bg-cyan-650' : 'bg-cyan-400'}`}></span> mRNA
              </span>
              <span className={`flex items-center gap-1.5 ${isLightMode ? 'text-orange-700 font-bold' : 'text-orange-400'}`}>
                <span className={`w-2 h-2 rounded-full ${isLightMode ? 'bg-orange-550' : 'bg-orange-400'}`}></span> Enzyme Complex
              </span>
              <span className={`flex items-center gap-1.5 ${isLightMode ? 'text-emerald-700 font-bold' : 'text-emerald-400'}`}>
                <span className={`w-2 h-2 rounded-full ${isLightMode ? 'bg-emerald-550' : 'bg-emerald-400'}`}></span> γ-PGA Output
              </span>
            </div>
          </div>

          {/* SVG Graph */}
          <div className={`relative border rounded p-2 overflow-hidden select-none transition-colors duration-300 ${isLightMode ? 'bg-[#fcfbf9] border-amber-900/10' : 'bg-[#06080d] border-slate-800/80'}`}>
            <svg 
              viewBox={`0 0 ${width} ${height}`} 
              className="w-full h-auto cursor-crosshair overflow-visible"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {/* Grid Lines */}
              {[4, 8, 12, 16, 20].map((v, i) => {
                const y = paddingTop + (i * (height - paddingTop - paddingBottom)) / 4;
                return (
                  <line 
                    key={v} x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} 
                    stroke={isLightMode ? "#efe7d3" : "#161f30"} strokeDasharray="3,3" 
                  />
                );
              })}
              {[12, 24, 36, 48].map((t) => {
                const x = paddingLeft + (t / 48) * (width - paddingLeft - paddingRight);
                return (
                  <line 
                    key={t} x1={x} y1={paddingTop} x2={x} y2={height - paddingBottom} 
                    stroke={isLightMode ? "#efe7d3" : "#161f30"} strokeDasharray="3,3" 
                  />
                );
              })}

              {/* Slotted Paths */}
              <polyline fill="none" strokeWidth={isLightMode ? "2.5" : "2"} stroke={isLightMode ? "#4f46e5" : "#06b6d4"} points={pathMRNA} strokeLinecap="round" strokeLinejoin="round" />
              <polyline fill="none" strokeWidth={isLightMode ? "2.5" : "2"} stroke={isLightMode ? "#ea580c" : "#fb923c"} points={pathEnzyme} strokeLinecap="round" strokeLinejoin="round" />
              <polyline fill="none" strokeWidth={isLightMode ? "3.5" : "3"} stroke={isLightMode ? "#16a34a" : "#4ade80"} points={pathPGA} strokeLinecap="round" strokeLinejoin="round" />

              {/* Axes */}
              <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke={isLightMode ? "#c8b49c" : "#1e293b"} strokeWidth="1" />
              <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke={isLightMode ? "#c8b49c" : "#1e293b"} strokeWidth="1" />
              <line x1={width - paddingRight} y1={paddingTop} x2={width - paddingRight} y2={height - paddingBottom} stroke={isLightMode ? "#c8b49c" : "#1e293b"} strokeWidth="1" />

              {/* Axis Labels */}
              <text x={paddingLeft - 8} y={paddingTop + 5} fill={isLightMode ? "#78350f" : "#475569"} fontSize="9" textAnchor="end" fontWeight="bold" fontFamily="monospace">
                {Math.max(maxVals.mRNA, maxVals.enzyme).toFixed(1)}
              </text>
              <text x={paddingLeft - 8} y={height - paddingBottom} fill={isLightMode ? "#78350f" : "#475569"} fontSize="9" textAnchor="end" fontWeight="bold" fontFamily="monospace">0.0</text>
              <text x={paddingLeft - 32} y={height/2} transform={`rotate(-90, ${paddingLeft - 32}, ${height/2})`} fill={isLightMode ? "#4f46e5" : "#06b6d4"} fontSize="9" textAnchor="middle" fontWeight="bold" fontFamily="monospace" letterSpacing="0.05em">
                SPECIES LEVEL (AU)
              </text>

              <text x={width - paddingRight + 8} y={paddingTop + 5} fill={isLightMode ? "#16a34a" : "#4ade80"} fontSize="9" textAnchor="start" fontWeight="bold" fontFamily="monospace">
                {maxVals.pga.toFixed(1)}
              </text>
              <text x={width - paddingRight + 8} y={height - paddingBottom} fill={isLightMode ? "#16a34a" : "#4ade80"} fontSize="9" textAnchor="start" fontWeight="bold" fontFamily="monospace">0.0</text>
              <text x={width - paddingRight + 32} y={height/2} transform={`rotate(90, ${width - paddingRight + 32}, ${height/2})`} fill={isLightMode ? "#16a34a" : "#4ade80"} fontSize="9" textAnchor="middle" fontWeight="bold" fontFamily="monospace" letterSpacing="0.05em">
                γ-PGA ACCUM. (mol/m³)
              </text>

              {/* Time tick labels */}
              {[0, 12, 24, 36, 48].map((t) => {
                const x = paddingLeft + (t / 48) * (width - paddingLeft - paddingRight);
                return (
                  <text key={t} x={x} y={height - paddingBottom + 16} fill={isLightMode ? "#78350f" : "#475569"} fontSize="9" textAnchor="middle" fontWeight="bold" fontFamily="monospace">
                    {t}h
                  </text>
                );
              })}
              <text x={width/2} y={height - 5} fill={isLightMode ? "#78350f" : "#475569"} fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace" letterSpacing="0.05em">CULTIVATION DURATION (HOURS)</text>

              {/* Interactive Hover Point Element */}
              {hoverIndex !== null && activeHoverPoint && (
                <>
                  <line 
                    x1={points[hoverIndex].x} y1={paddingTop} 
                    x2={points[hoverIndex].x} y2={height - paddingBottom} 
                    stroke={isLightMode ? "#b4a088" : "#334155"} strokeWidth="1" strokeDasharray="4,4" 
                  />
                  <circle cx={points[hoverIndex].x} cy={points[hoverIndex].yMRNA} r="5" fill={isLightMode ? "#4f46e5" : "#06b6d4"} />
                  <circle cx={points[hoverIndex].x} cy={points[hoverIndex].yEnzyme} r="5" fill={isLightMode ? "#ea580c" : "#fb923c"} />
                  <circle cx={points[hoverIndex].x} cy={points[hoverIndex].yPGA} r="5" fill={isLightMode ? "#16a34a" : "#4ade80"} />
                </>
              )}
            </svg>

            {/* Hover tooltip absolute overlay */}
            {activeHoverPoint && (
              <div className={`absolute top-4 left-16 select-none pointer-events-none space-y-1 p-3 text-[10px] font-mono rounded border shadow-2xl ${
                isLightMode 
                  ? 'bg-white/95 border-amber-900/15 text-stone-850 shadow-md' 
                  : 'bg-[#080b12]/95 border border-slate-800 text-slate-300'
              }`}>
                <p className={`font-bold text-xs ${isLightMode ? 'text-stone-900' : 'text-slate-100'}`}>T-Epoch: {activeHoverPoint.time.toFixed(2)} hrs</p>
                <p className={isLightMode ? 'text-cyan-700 font-semibold' : 'text-cyan-400'}>mRNA level: {activeHoverPoint.mRNA.toFixed(3)}</p>
                <p className={isLightMode ? 'text-orange-700 font-semibold' : 'text-orange-400'}>Pgs Enzyme: {activeHoverPoint.enzyme.toFixed(3)}</p>
                <p className={isLightMode ? 'text-emerald-700 font-bold' : 'text-emerald-400 font-bold'}>γ-PGA output: {activeHoverPoint.pga.toFixed(3)} mol/m³</p>
              </div>
            )}
          </div>
        </div>

        {/* Wet Lab Calibration Assistant Module */}
        <div className={`mt-5 p-4 rounded border relative overflow-hidden transition-colors ${
          isLightMode 
            ? 'bg-amber-50/50 border-amber-900/10' 
            : 'bg-[#091522]/60 border border-emerald-950/80'
        }`}>
          <div className="absolute right-3 top-3 opacity-5">
            <Award className={`w-16 h-16 ${isLightMode ? 'text-emerald-650' : 'text-emerald-400'}`} />
          </div>
          <h4 className={`text-xs font-bold font-mono uppercase tracking-widest flex items-center gap-1.5 mb-1.5 ${isLightMode ? 'text-emerald-805' : 'text-emerald-400'}`}>
            <Sparkles className={`w-4 h-4 ${isLightMode ? 'text-emerald-700' : 'text-emerald-400'}`} />
            iGEM Wet Lab Calibration Interface
          </h4>
          <p className={`text-[11px] leading-relaxed mb-3 ${isLightMode ? 'text-stone-600 font-medium' : 'text-slate-400'}`}>
            To integrate our dry-lab model with NYUAD laboratory assays: enter your spectrophotometric 
            experimental yield to reverse-calibrate and store our synthetic enzyme efficiency rate (<code>k_cat</code>).
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded border ${isLightMode ? 'bg-white border-amber-900/15' : 'bg-[#06080d] border-slate-800'}`}>
              <span className={`text-[10px] font-mono ${isLightMode ? 'text-stone-500' : 'text-slate-400'}`}>EXPERIMENTAL YIELD:</span>
              <input 
                type="number" 
                value={targetYield} 
                onChange={(e) => setTargetYield(Math.max(1, parseFloat(e.target.value) || 0))}
                className={`w-16 bg-transparent font-mono text-xs font-bold outline-none border-b border-transparent focus:border-cyan-550 ${isLightMode ? 'text-stone-900' : 'text-white'}`} 
              />
              <span className={`text-[10px] font-mono ${isLightMode ? 'text-emerald-700 font-bold' : 'text-emerald-400'}`}>mol/m³</span>
            </div>
            <button 
              onClick={handleCalibrate}
              className={`px-3.5 py-1.5 text-[10px] font-mono font-bold rounded uppercase tracking-wider shadow-sm transition flex items-center gap-1 cursor-pointer ${
                isLightMode 
                  ? 'text-white bg-cyan-705 hover:bg-cyan-800 bg-[#0284c7]' 
                  : 'text-black bg-cyan-400 hover:bg-cyan-500'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Calibrate k_cat
            </button>
            {calibratedKcat !== null && (
              <span className={`text-[10px] font-mono px-2 py-1 rounded border ${
                isLightMode 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' 
                  : 'bg-emerald-950/50 border border-emerald-900'
              }`}>
                CALIBRATED: <code className={isLightMode ? 'text-emerald-950' : 'text-white'}>k_cat = {calibratedKcat}</code>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
