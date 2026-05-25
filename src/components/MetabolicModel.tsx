import React, { useState, useMemo, useEffect } from 'react';
import { MetabolicParams, SimulationStep } from '../types';
import { Play, RotateCcw, Award, Dna, Database, ShieldAlert, Sparkles, Info } from 'lucide-react';

interface MetabolicProps {
  params: MetabolicParams;
  setParams: React.Dispatch<React.SetStateAction<MetabolicParams>>;
  onUpdatePgaAccum?: (pga: number) => void;
  targetYield: number;
  setTargetYield: (val: number) => void;
  calibratedKcat: number | null;
  setCalibratedKcat: (val: number | null) => void;
}

export default function MetabolicModel({ 
  params, 
  setParams, 
  onUpdatePgaAccum,
  targetYield,
  setTargetYield,
  calibratedKcat,
  setCalibratedKcat
}: MetabolicProps) {

  // Runge-Kutta 4th Order (RK4) ODE solver
  const simulationData = useMemo(() => {
    const data: SimulationStep[] = [];
    let mRNA = 0.0;
    let enzyme = 0.0;
    let pga = 0.0;
    
    // 48 hours simulated, with steps of 0.25 hours (193 steps)
    const dt = 0.25;
    const finalTime = 48.0;
    const steps = finalTime / dt;

    // effective degradation rate based on knockouts
    let effectiveKdeg = params.k_deg;
    if (params.ggtKnockout) effectiveKdeg *= 0.1; // 90% reduction
    if (params.pgcAKnockout) effectiveKdeg *= 0.2; // further reduction
    if (params.ggtKnockout && params.pgcAKnockout) effectiveKdeg = 0.0; // fully zero

    const f = (m: number, e: number, p: number) => {
      // DNA complex is assumed normalized to 1.0 representation
      const dm = params.alpha_m * 1.0 - params.beta_m * m;
      const de = params.alpha_e * m - params.beta_e * e;
      const dp = (params.k_cat * e * params.s_precursor) / (params.k_m + params.s_precursor) - effectiveKdeg * p;
      return [dm, de, dp];
    };

    for (let i = 0; i <= steps; i++) {
      const time = i * dt;
      data.push({ time, mRNA, enzyme, pga });

      // Runge-Kutta 4 algorithm
      const [dm1, de1, dp1] = f(mRNA, enzyme, pga);
      
      const m2 = mRNA + 0.5 * dt * dm1;
      const e2 = enzyme + 0.5 * dt * de1;
      const p2 = pga + 0.5 * dt * dp1;
      const [dm2, de2, dp2] = f(m2, e2, p2);

      const m3 = mRNA + 0.5 * dt * dm2;
      const e3 = enzyme + 0.5 * dt * de2;
      const p3 = pga + 0.5 * dt * dp2;
      const [dm3, de3, dp3] = f(m3, e3, p3);

      const m4 = mRNA + dt * dm3;
      const e4 = enzyme + dt * de3;
      const p4 = pga + dt * dp3;
      const [dm4, de4, dp4] = f(m4, e4, p4);

      mRNA += (dt / 6) * (dm1 + 2 * dm2 + 2 * dm3 + dm4);
      enzyme += (dt / 6) * (de1 + 2 * de2 + 2 * de3 + de4);
      pga += (dt / 6) * (dp1 + 2 * dp2 + 2 * dp3 + dp4);
    }

    return data;
  }, [params]);

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

  // Handle Wet Lab Calibration estimation
  const handleCalibrate = () => {
    // Basic solver adjustment to find k_cat matches for target yield at 48h
    // Since yield is roughly linear to k_cat during accumulation with knockouts,
    // we can estimate: target_kcat = current_kcat * (targetYield / currentYieldAt48h)
    const currentYield = simulationData[simulationData.length - 1].pga;
    if (currentYield > 0) {
      const estimatedKcat = params.k_cat * (targetYield / currentYield);
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 bg-[#06080d] rounded-xl border border-slate-800 shadow-xl" id="metabolic-module-panel">
      {/* Parameters Panel */}
      <div className="lg:col-span-5 bg-[#0a0f18] p-5 rounded border border-slate-800/80">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-100 flex items-center gap-2 mb-4 font-sans">
          <Dna className="w-5 h-5 text-cyan-400" />
          Intracellular Kinetic Control Unit
        </h3>

        {/* Sliders */}
        <div className="space-y-4 font-sans">
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <div className="group relative flex items-center gap-1 cursor-help">
                <span className="underline decoration-dotted decoration-slate-600 underline-offset-2">Transcription Rate (<code className="text-cyan-400 font-mono">α_m</code>)</span>
                <Info className="w-3.5 h-3.5 text-slate-500 hover:text-cyan-400 Transition" />
                <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-64 p-2 bg-slate-950 text-[10px] text-slate-300 rounded border border-slate-800 shadow-xl z-25 font-sans leading-relaxed">
                  Rate of transcribing PgsBCA operon mRNA strands from the DNA synthetic promoter.
                </div>
              </div>
              <span className="font-mono bg-cyan-950/50 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-900/50 text-[10px]">{params.alpha_m.toFixed(1)} h⁻¹</span>
            </div>
            <input 
              type="range" min="0.5" max="15" step="0.5" 
              value={params.alpha_m} 
              onChange={(e) => setParams(p => ({ ...p, alpha_m: parseFloat(e.target.value) }))}
              className="w-full accent-cyan-500 cursor-ew-resize"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <div className="group relative flex items-center gap-1 cursor-help">
                <span className="underline decoration-dotted decoration-slate-600 underline-offset-2">mRNA Half-life Degradation (<code className="text-orange-400 font-mono">β_m</code>)</span>
                <Info className="w-3.5 h-3.5 text-slate-500 hover:text-cyan-400 Transition" />
                <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-64 p-2 bg-slate-950 text-[10px] text-slate-300 rounded border border-slate-800 shadow-xl z-25 font-sans leading-relaxed">
                  Rate at which cellular RNases degrade the transcribed mRNA species.
                </div>
              </div>
              <span className="font-mono bg-orange-950/30 text-orange-400 px-1.5 py-0.5 rounded border border-orange-900/40 text-[10px]">{params.beta_m.toFixed(2)} h⁻¹</span>
            </div>
            <input 
              type="range" min="0.01" max="1.0" step="0.05" 
              value={params.beta_m} 
              onChange={(e) => setParams(p => ({ ...p, beta_m: parseFloat(e.target.value) }))}
              className="w-full accent-orange-500 cursor-ew-resize"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <div className="group relative flex items-center gap-1 cursor-help">
                <span className="underline decoration-dotted decoration-slate-600 underline-offset-2">Enzyme Translation Rate (<code className="text-cyan-400 font-mono">α_e</code>)</span>
                <Info className="w-3.5 h-3.5 text-slate-500 hover:text-cyan-400 Transition" />
                <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-64 p-2 bg-slate-950 text-[10px] text-slate-300 rounded border border-slate-800 shadow-xl z-25 font-sans leading-relaxed">
                  Ribosome recruitment speed to translate active PgsB, PgsC, and PgsA enzymes.
                </div>
              </div>
              <span className="font-mono bg-cyan-950/50 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-900/50 text-[10px]">{params.alpha_e.toFixed(1)} h⁻¹</span>
            </div>
            <input 
              type="range" min="0.2" max="5.0" step="0.2" 
              value={params.alpha_e} 
              onChange={(e) => setParams(p => ({ ...p, alpha_e: parseFloat(e.target.value) }))}
              className="w-full accent-cyan-400 cursor-ew-resize"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <div className="group relative flex items-center gap-1 cursor-help">
                <span className="underline decoration-dotted decoration-slate-600 underline-offset-2">Enzyme Degradation (<code className="text-amber-400 font-mono">β_e</code>)</span>
                <Info className="w-3.5 h-3.5 text-slate-500 hover:text-cyan-400 Transition" />
                <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-64 p-2 bg-slate-950 text-[10px] text-slate-300 rounded border border-slate-800 shadow-xl z-25 font-sans leading-relaxed">
                  Intracellular enzyme clearance speed orchestrated by host cell proteasome machinery.
                </div>
              </div>
              <span className="font-mono bg-amber-950/30 text-amber-400 px-1.5 py-0.5 rounded border border-amber-900/40 text-[10px]">{params.beta_e.toFixed(3)} h⁻¹</span>
            </div>
            <input 
              type="range" min="0.01" max="0.2" step="0.01" 
              value={params.beta_e} 
              onChange={(e) => setParams(p => ({ ...p, beta_e: parseFloat(e.target.value) }))}
              className="w-full accent-amber-500 cursor-ew-resize"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <div className="group relative flex items-center gap-1 cursor-help">
                <span className="underline decoration-dotted decoration-slate-600 underline-offset-2">Catalytic Efficiency (<code className="text-emerald-400 font-mono">k_cat</code>)</span>
                <Info className="w-3.5 h-3.5 text-slate-500 hover:text-cyan-400 Transition" />
                <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-64 p-2 bg-slate-950 text-[10px] text-slate-300 rounded border border-slate-800 shadow-xl z-25 font-sans leading-relaxed">
                  Maximum polymer chain synthesis turnover cycle count of the PgsBCA complex per hour.
                </div>
              </div>
              <span className="font-mono bg-emerald-950/30 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-900/40 text-[10px]">{params.k_cat.toFixed(2)} h⁻¹</span>
            </div>
            <input 
              type="range" min="0.1" max="5.0" step="0.1" 
              value={params.k_cat} 
              onChange={(e) => setParams(p => ({ ...p, k_cat: parseFloat(e.target.value) }))}
              className="w-full accent-emerald-500 cursor-ew-resize"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <div className="group relative flex items-center gap-1 cursor-help">
                <span className="underline decoration-dotted decoration-slate-600 underline-offset-2">L-Glutamate Precursor (<code className="text-purple-400 font-mono">[S]</code>)</span>
                <Info className="w-3.5 h-3.5 text-slate-500 hover:text-cyan-400 Transition" />
                <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-64 p-2 bg-slate-950 text-[10px] text-slate-300 rounded border border-slate-800 shadow-xl z-25 font-sans leading-relaxed">
                  Extracellular precursor feeding stock concentration providing monomer units.
                </div>
              </div>
              <span className="font-mono bg-purple-950/30 text-purple-400 px-1.5 py-0.5 rounded border border-purple-900/40 text-[10px]">{params.s_precursor.toFixed(1)} mM</span>
            </div>
            <input 
              type="range" min="0.5" max="25" step="0.5" 
              value={params.s_precursor} 
              onChange={(e) => setParams(p => ({ ...p, s_precursor: parseFloat(e.target.value) }))}
              className="w-full accent-purple-500 cursor-ew-resize"
            />
          </div>
        </div>

        {/* Gene Knockouts (Biosafety & Yield Hack) */}
        <div className="mt-5 pt-4 border-t border-slate-800">
          <span className="text-[10px] font-bold text-slate-500 block mb-3 uppercase tracking-wider font-mono">Gene Knockout Status</span>
          <div className="grid grid-cols-2 gap-3">
            <label className={`flex items-center justify-between p-2.5 rounded border text-xs cursor-pointer transition ${params.ggtKnockout ? 'border-emerald-800 bg-emerald-950/20 text-emerald-300' : 'border-slate-800 bg-[#080b12] text-slate-500 hover:text-slate-300'}`}>
              <div className="flex flex-col">
                <span className="font-mono font-bold">Δggt</span>
                <span className="text-[9px] text-slate-500 font-mono">Glutamyl-Tferase</span>
              </div>
              <input 
                type="checkbox" 
                checked={params.ggtKnockout} 
                onChange={(e) => setParams(p => ({ ...p, ggtKnockout: e.target.checked }))}
                className="rounded accent-emerald-500 ml-2"
              />
            </label>

            <label className={`flex items-center justify-between p-2.5 rounded border text-xs cursor-pointer transition ${params.pgcAKnockout ? 'border-emerald-800 bg-emerald-950/20 text-emerald-300' : 'border-slate-800 bg-[#080b12] text-slate-500 hover:text-slate-300'}`}>
              <div className="flex flex-col">
                <span className="font-mono font-bold">ΔpgcA</span>
                <span className="text-[9px] text-slate-500 font-mono">Glutamic Hydrolase</span>
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
      <div className="lg:col-span-7 bg-[#0a0f18] p-5 rounded border border-slate-800/80 flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400 animate-pulse" />
              Real-time Concentration Dynamics
            </h3>
            <div className="flex gap-4 text-[10px] font-mono">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span> mRNA
              </span>
              <span className="flex items-center gap-1.5 text-orange-400">
                <span className="w-2 h-2 rounded-full bg-orange-400"></span> Enzyme Complex
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span> γ-PGA Output
              </span>
            </div>
          </div>

          {/* SVG Graph */}
          <div className="relative border border-slate-800/80 rounded bg-[#06080d] p-2 overflow-hidden select-none">
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
                    stroke="#161f30" strokeDasharray="3,3" 
                  />
                );
              })}
              {[12, 24, 36, 48].map((t) => {
                const x = paddingLeft + (t / 48) * (width - paddingLeft - paddingRight);
                return (
                  <line 
                    key={t} x1={x} y1={paddingTop} x2={x} y2={height - paddingBottom} 
                    stroke="#161f30" strokeDasharray="3,3" 
                  />
                );
              })}

              {/* Slotted Paths */}
              <polyline fill="none" strokeWidth="2" stroke="#06b6d4" points={pathMRNA} strokeLinecap="round" strokeLinejoin="round" />
              <polyline fill="none" strokeWidth="2" stroke="#fb923c" points={pathEnzyme} strokeLinecap="round" strokeLinejoin="round" />
              <polyline fill="none" strokeWidth="3" stroke="#4ade80" points={pathPGA} strokeLinecap="round" strokeLinejoin="round" />

              {/* Axes */}
              <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="#1e293b" strokeWidth="1" />
              <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="#1e293b" strokeWidth="1" />
              <line x1={width - paddingRight} y1={paddingTop} x2={width - paddingRight} y2={height - paddingBottom} stroke="#1e293b" strokeWidth="1" />

              {/* Axis Labels */}
              <text x={paddingLeft - 8} y={paddingTop + 5} fill="#475569" fontSize="9" textAnchor="end" fontWeight="500" fontFamily="monospace">
                {Math.max(maxVals.mRNA, maxVals.enzyme).toFixed(1)}
              </text>
              <text x={paddingLeft - 8} y={height - paddingBottom} fill="#475569" fontSize="9" textAnchor="end" fontWeight="500" fontFamily="monospace">0.0</text>
              <text x={paddingLeft - 32} y={height/2} transform={`rotate(-90, ${paddingLeft - 32}, ${height/2})`} fill="#06b6d4" fontSize="9" textAnchor="middle" fontWeight="bold" fontFamily="monospace" letterSpacing="0.05em">
                SPECIES LEVEL (AU)
              </text>

              <text x={width - paddingRight + 8} y={paddingTop + 5} fill="#4ade80" fontSize="9" textAnchor="start" fontWeight="500" fontFamily="monospace">
                {maxVals.pga.toFixed(1)}
              </text>
              <text x={width - paddingRight + 8} y={height - paddingBottom} fill="#4ade80" fontSize="9" textAnchor="start" fontWeight="500" fontFamily="monospace">0.0</text>
              <text x={width - paddingRight + 32} y={height/2} transform={`rotate(90, ${width - paddingRight + 32}, ${height/2})`} fill="#4ade80" fontSize="9" textAnchor="middle" fontWeight="bold" fontFamily="monospace" letterSpacing="0.05em">
                γ-PGA ACCUM. (mol/m³)
              </text>

              {/* Time tick labels */}
              {[0, 12, 24, 36, 48].map((t) => {
                const x = paddingLeft + (t / 48) * (width - paddingLeft - paddingRight);
                return (
                  <text key={t} x={x} y={height - paddingBottom + 16} fill="#475569" fontSize="9" textAnchor="middle" fontWeight="500" fontFamily="monospace">
                    {t}h
                  </text>
                );
              })}
              <text x={width/2} y={height - 5} fill="#475569" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace" letterSpacing="0.05em">CULTIVATION DURATION (HOURS)</text>

              {/* Interactive Hover Point Element */}
              {hoverIndex !== null && activeHoverPoint && (
                <>
                  <line 
                    x1={points[hoverIndex].x} y1={paddingTop} 
                    x2={points[hoverIndex].x} y2={height - paddingBottom} 
                    stroke="#334155" strokeWidth="1" strokeDasharray="4,4" 
                  />
                  <circle cx={points[hoverIndex].x} cy={points[hoverIndex].yMRNA} r="4" fill="#06b6d4" />
                  <circle cx={points[hoverIndex].x} cy={points[hoverIndex].yEnzyme} r="4" fill="#fb923c" />
                  <circle cx={points[hoverIndex].x} cy={points[hoverIndex].yPGA} r="4" fill="#4ade80" />
                </>
              )}
            </svg>

            {/* Hover tooltip absolute overlay */}
            {activeHoverPoint && (
              <div className="absolute top-4 left-16 bg-[#080b12]/95 border border-slate-800 backdrop-blur shadow-2xl rounded p-3 text-[10px] font-mono select-none pointer-events-none space-y-1">
                <p className="font-bold text-slate-100 text-xs">T-Epoch: {activeHoverPoint.time.toFixed(2)} hrs</p>
                <p className="text-cyan-400">mRNA level: {activeHoverPoint.mRNA.toFixed(3)}</p>
                <p className="text-orange-400">Pgs Enzyme: {activeHoverPoint.enzyme.toFixed(3)}</p>
                <p className="text-emerald-400 font-bold">γ-PGA output: {activeHoverPoint.pga.toFixed(3)} mol/m³</p>
              </div>
            )}
          </div>
        </div>

        {/* Wet Lab Calibration Assistant Module */}
        <div className="mt-5 bg-[#091522]/60 p-4 rounded border border-emerald-950/80 relative overflow-hidden">
          <div className="absolute right-3 top-3 opacity-5">
            <Award className="w-16 h-16 text-emerald-400" />
          </div>
          <h4 className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            iGEM Wet Lab Calibration Interface
          </h4>
          <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
            To integrate our dry-lab model with NYUAD laboratory assays: enter your spectrophotometric 
            experimental yield to reverse-calibrate and store our synthetic enzyme efficiency rate (<code>k_cat</code>).
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-[#06080d] px-3 py-1.5 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400 font-mono">EXPERIMENTAL YIELD:</span>
              <input 
                type="number" 
                value={targetYield} 
                onChange={(e) => setTargetYield(Math.max(1, parseFloat(e.target.value) || 0))}
                className="w-16 bg-transparent font-mono text-xs font-bold text-white outline-none border-b border-transparent focus:border-cyan-500" 
              />
              <span className="text-[10px] text-emerald-400 font-mono">mol/m³</span>
            </div>
            <button 
              onClick={handleCalibrate}
              className="px-3.5 py-1.5 text-[10px] font-mono font-bold text-black bg-cyan-400 hover:bg-cyan-500 rounded uppercase tracking-wider shadow-sm transition flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Calibrate k_cat
            </button>
            {calibratedKcat !== null && (
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/50 border border-emerald-900 px-2 py-1 rounded">
                CALIBRATED: <code className="text-white">k_cat = {calibratedKcat}</code>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
