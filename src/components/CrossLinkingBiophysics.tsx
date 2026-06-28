import React, { useState, useMemo, useEffect, useRef } from 'react';
import { BiophysicsParams } from '../types';
import { solveCrossLink } from '../lib/physics';
import { Layers, Thermometer, Sun, Moon, Sparkles, SlidersHorizontal, Info, Link2, HelpCircle } from 'lucide-react';

interface CrossLinkingProps {
  params: BiophysicsParams;
  setParams: React.Dispatch<React.SetStateAction<BiophysicsParams>>;
  pgaAccum: number;
  isLinked: boolean;
  setIsLinked: (val: boolean) => void;
  shearModulus: number;
  onUpdateShearModulus?: (g: number) => void;
  isLightMode?: boolean;
  environmentalModifier?: number;
}

export default function CrossLinkingBiophysics({
  params,
  setParams,
  pgaAccum,
  isLinked,
  setIsLinked,
  shearModulus,
  onUpdateShearModulus,
  isLightMode = false,
  environmentalModifier = 1.0,
}: CrossLinkingProps) {
  const [activePreset, setActivePreset] = useState<'day' | 'night' | 'custom'>('day');

  // Interactive mouse offset tracking for 3D Parallax effect
  const mouseRef = useRef({ x: 0, y: 0, currentX: 0, currentY: 0 });

  // Calculates local effective values based on linkage
  const effectiveRhoPolymer = isLinked ? Math.min(8.0, 0.1 + pgaAccum * 0.04) : params.rho_polymer;

  // Set preset temperatures
  const handlePreset = (preset: 'day' | 'night') => {
    setActivePreset(preset);
    if (preset === 'day') {
      setParams(p => ({ ...p, temperature: 318.15 })); // 45°C
    } else {
      setParams(p => ({ ...p, temperature: 288.15 })); // 15°C
    }
  };

  // Base physics solver — Langmuir → affine network → G=νRT, via the shared physics core.
  const results = useMemo(() => {
    const { theta, nu, shearModulus: G } = solveCrossLink({
      ionConcentration: params.ion_conc,
      Kd: params.Kd,
      rhoPolymer: effectiveRhoPolymer,
      Mx: params.Mx,
      Mn: params.Mn,
      temperature: params.temperature,
      viability: environmentalModifier,
    });
    return { theta, nu, G };
  }, [params, effectiveRhoPolymer, environmentalModifier]);

  // Bubble up raw modulus calculated values to parent
  useEffect(() => {
    if (onUpdateShearModulus) {
      onUpdateShearModulus(results.G);
    }
  }, [results.G, onUpdateShearModulus]);

  // Animated canvas for visualizing polymer crosslinking between sand grains
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let time = 0;

    // Track mouse coordinates over canvas for smooth 3D parallax
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const rawX = e.clientX - rect.left - canvas.width / 2;
      const rawY = e.clientY - rect.top - canvas.height / 2;
      mouseRef.current.x = rawX * 0.08; // sensitivity
      mouseRef.current.y = rawY * 0.12;
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = 0;
      mouseRef.current.y = 0;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Fixed coordinates for sand grains with distinct Z-depth layering for 3D parallax
    const grains = [
      { x: 75,  y: 65,  radius: 30, color: isLightMode ? '#fef3c7' : '#e0f2fe', z: 0.35 },  // Golden / Light ice quartz
      { x: 215, y: 60,  radius: 38, color: isLightMode ? '#fed7aa' : '#bae6fd', z: 0.85 },  // Orange sand / Medium ice-blue silica
      { x: 385, y: 70,  radius: 34, color: isLightMode ? '#ffedd5' : '#e0f2fe', z: 0.55 },  // Soft cream / Clear silicon granule
      { x: 505, y: 65,  radius: 28, color: isLightMode ? '#fef3c7' : '#cffafe', z: 0.25 },  
      { x: 130, y: 175, radius: 42, color: isLightMode ? '#f5f5f4' : '#e2e8f0', z: 0.95 },  // Dense frosted quartz
      { x: 295, y: 185, radius: 40, color: isLightMode ? '#fed7aa' : '#bae6fd', z: 0.75 },  // Layered silica cluster
      { x: 465, y: 175, radius: 36, color: isLightMode ? '#ffe4e6' : '#cbd5e1', z: 0.45 },  
      { x: 70,  y: 290, radius: 32, color: isLightMode ? '#ffedd5' : '#cffafe', z: 0.30 },  // Lower silica layer
      { x: 230, y: 280, radius: 38, color: isLightMode ? '#f5f5f4' : '#cbd5e1', z: 0.65 },  
      { x: 395, y: 300, radius: 44, color: isLightMode ? '#fef3c7' : '#bae6fd', z: 1.00 },  // Giant silica dome
      { x: 520, y: 285, radius: 26, color: isLightMode ? '#ffedd5' : '#e0f2fe', z: 0.20 },  
    ];

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.016;

      // Smoothly interpolate the parallax offset to prevent sudden jerking
      const mouse = mouseRef.current;
      mouse.currentX += (mouse.x - mouse.currentX) * 0.08;
      mouse.currentY += (mouse.y - mouse.currentY) * 0.08;

      const pxX = mouse.currentX;
      const pxY = mouse.currentY;

      // Background backdrop
      ctx.fillStyle = isLightMode ? '#fdfaf3' : '#03060a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render molecular background grids reflecting custom parallax shift
      ctx.strokeStyle = isLightMode ? '#eae1cd' : '#050c18';
      ctx.lineWidth = 1;
      for (let x = -40; x < canvas.width + 40; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x + pxX * 0.15, 0);
        ctx.lineTo(x + pxX * 0.15, canvas.height);
        ctx.stroke();
      }
      for (let y = -40; y < canvas.height + 40; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y + pxY * 0.15);
        ctx.lineTo(canvas.width, y + pxY * 0.15);
        ctx.stroke();
      }

      // Draw light ambient water hydration molecules dots
      ctx.fillStyle = isLightMode ? 'rgba(2, 132, 199, 0.11)' : 'rgba(34, 211, 238, 0.09)';
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 6; j++) {
          const wx = i * 85 + Math.sin(time + j) * 8 + pxX * 0.35;
          const wy = j * 72 + Math.cos(time + i) * 6 + pxY * 0.35;
          ctx.beginPath();
          ctx.arc(wx, wy, 1.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 1. Draw polymer strands (γ-PGA peptide chains) weaving dynamically with Z-parallax
      const numChains = Math.min(28, Math.floor(effectiveRhoPolymer * 3.2) + 5);
      
      for (let c = 0; c < numChains; c++) {
        ctx.beginPath();
        const startX = (c * 26 + 25) % (canvas.width + 40);
        
        ctx.lineWidth = 2.0 + results.theta * 2.5;

        // Custom wavy strand coordinates using parallax depth shifts
        const strandDepth = 0.4 + (c % 3) * 0.22;
        const curX = startX + pxX * strandDepth;

        ctx.moveTo(curX, 0);

        // Spline calculations
        for (let y = 10; y <= canvas.height; y += 15) {
          const shift = Math.sin((y / 28) + time * 1.0 + c * 0.7) * (20 + (1.0 - results.theta) * 16);
          ctx.lineTo(curX + shift, y);
        }
        
        // Beautiful vibrant emerald-into-cyan polymer gradient (no gold)
        const strokeGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        strokeGrad.addColorStop(0, `rgba(52, 211, 153, ${0.48 + results.theta * 0.52})`); // Fresh Emerald
        strokeGrad.addColorStop(0.5, `rgba(38, 211, 224, ${0.52 + results.theta * 0.48})`); // Aqua Marine Cyan
        strokeGrad.addColorStop(1, `rgba(99, 102, 241, ${0.35 + results.theta * 0.4})`); // Royal Indigo
        
        ctx.strokeStyle = strokeGrad;
        ctx.stroke();

        // Draw small individual monomer carboxylate dots along the strands
        ctx.fillStyle = isLightMode ? 'rgba(5, 150, 105, 1.0)' : 'rgba(110, 231, 183, 1.0)';
        for (let y = 15; y < canvas.height; y += 45) {
          const shift = Math.sin((y / 28) + time * 1.0 + c * 0.7) * (20 + (1.0 - results.theta) * 16);
          ctx.beginPath();
          ctx.arc(curX + shift, y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 2. Draw active chelating Calcium Ions (Bright royal blue, glowing, no gold)
      if (results.theta > 0.1) {
        const crossLinks = [
          { x: 105, y: 95,  z: 0.4 }, { x: 235, y: 85,  z: 0.8 }, { x: 355, y: 92,  z: 0.6 },
          { x: 165, y: 175, z: 0.9 }, { x: 315, y: 165, z: 0.7 }, { x: 90,  y: 215, z: 0.3 },
          { x: 250, y: 225, z: 0.6 }, { x: 360, y: 205, z: 0.7 }, { x: 480, y: 245, z: 0.4 }
        ];
        
        const activeHubs = Math.min(crossLinks.length, Math.floor(effectiveRhoPolymer * results.theta * 3.8));
        crossLinks.slice(0, activeHubs).forEach((cl, idx) => {
          const sizeOsc = Math.sin(time * 3.2 + idx) * 3;
          const rx = cl.x + pxX * cl.z;
          const ry = cl.y + pxY * cl.z;
          
          // Chelating geometric vector rings (High Tech Cyan-Blue Glow)
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(rx - 16 - sizeOsc, ry);
          ctx.lineTo(rx + 16 + sizeOsc, ry);
          ctx.moveTo(rx, ry - 16 - sizeOsc);
          ctx.lineTo(rx, ry + 16 + sizeOsc);
          ctx.stroke();

          // Radial Indigo-Blue chelation aura
          ctx.fillStyle = 'rgba(79, 70, 229, 0.28)';
          ctx.beginPath();
          ctx.arc(rx, ry, 12 + sizeOsc, 0, Math.PI * 2);
          ctx.fill();

          // Calcium metal sphere dot
          ctx.fillStyle = '#38bdf8'; // Sky cyan blue (highly appealing, no gold)
          ctx.beginPath();
          ctx.arc(rx, ry, 6, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#2563eb';
          ctx.lineWidth = 1.25;
          ctx.beginPath();
          ctx.arc(rx, ry, 6, 0, Math.PI * 2);
          ctx.stroke();
        });
      }

      // 3. Draw sand grains (foreground) with full 3D lighting gradients
      grains.forEach((g) => {
        const gx = g.x + pxX * g.z;
        const gy = g.y + pxY * g.z;
        
        ctx.save();
        
        // Dark rich drop shadow underneath sand grains
        ctx.shadowColor = isLightMode ? 'rgba(139, 92, 26, 0.15)' : 'rgba(1, 3, 7, 0.9)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 5;

        // Guard to ensure values passed to createRadialGradient are completely finite and greater than zero
        const radiusVal = Math.max(0.1, g.radius);
        const pxVal = gx;
        const pyVal = gy;
        if (!isFinite(radiusVal) || !isFinite(pxVal) || !isFinite(pyVal) || radiusVal <= 0) {
          ctx.restore();
          return;
        }

        // Custom Radial shading gradient to build standard photorealistic 3D light-casting spheres
        const grainGrad = ctx.createRadialGradient(
          pxVal - radiusVal * 0.35, pyVal - radiusVal * 0.35, radiusVal * 0.05, 
          pxVal, pyVal, radiusVal 
        );
        grainGrad.addColorStop(0, '#ffffff'); // Specular highlight reflection (pure white glow)
        grainGrad.addColorStop(0.25, g.color); // Middle frosted body color (ice-blue/soft gray)
        grainGrad.addColorStop(0.72, isLightMode ? 'rgba(139, 92, 26, 0.22)' : 'rgba(15, 23, 42, 0.45)'); // Refractive dark inner curvature
        grainGrad.addColorStop(1, isLightMode ? '#9a3412' : '#081734'); // Rich sandy brown or oceanic deep slate shadow rim for extreme 3D fullness

        ctx.fillStyle = grainGrad;
        ctx.beginPath();
        ctx.arc(gx, gy, g.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // High gloss frosted glass inner crescent reflection
        ctx.strokeStyle = isLightMode ? 'rgba(255, 255, 255, 0.65)' : 'rgba(255, 255, 255, 0.32)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(gx, gy, g.radius - 2.5, Math.PI * 1.15, Math.PI * 1.65);
        ctx.stroke();

        // Dark ink borders to provide distinct cartoon-like outlines resembling Protein Imager style
        ctx.strokeStyle = isLightMode ? '#78350f' : '#02050b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(gx, gy, g.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Frosted silica text tag
        ctx.fillStyle = isLightMode ? 'rgba(120, 53, 15, 0.8)' : 'rgba(255, 255, 255, 0.5)';
        ctx.font = 'bold 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText("SiO₂", gx, gy + 3);
      });

      // Overlay visual boundary dashboard stats onto canvas
      ctx.fillStyle = isLightMode ? 'rgba(255, 255, 255, 0.94)' : 'rgba(10, 15, 24, 0.88)';
      ctx.fillRect(10, canvas.height - 35, canvas.width - 20, 25);
      ctx.strokeStyle = isLightMode ? '#eae1cd' : '#1e293b';
      ctx.lineWidth = 1;
      ctx.strokeRect(10, canvas.height - 35, canvas.width - 20, 25);
      
      ctx.fillStyle = isLightMode ? '#4f46e5' : '#22d3ee';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`SATURATION (θ): ${(results.theta * 100).toFixed(1)}%`, 18, canvas.height - 20);
      ctx.fillText(`SHEAR MODULUS (G): ${results.G.toFixed(1)} Pa`, canvas.width - 175, canvas.height - 20);

      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrameId);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [params, results, effectiveRhoPolymer, isLightMode]);

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 rounded-xl border transition-all duration-300 ${
      isLightMode 
        ? 'bg-[#fdfaf3] border-amber-900/10 shadow-[0_4px_24px_rgba(139,94,26,0.06)]' 
        : 'bg-[#06080d] border-slate-800 shadow-xl'
    }`} id="crosslinking-biophysics-panel">
      
      {/* Parameter Controls Panel */}
      <div className={`lg:col-span-12 xl:col-span-5 p-5 rounded-xl border transition-colors duration-300 ${isLightMode ? 'bg-white border-amber-900/10' : 'bg-[#0a0f18] border-slate-800/80'} space-y-5 flex flex-col justify-between`}>
        
        <div className="space-y-4">
          {/* Module Header */}
          <div className={`flex justify-between items-center pb-3 border-b ${isLightMode ? 'border-amber-905_10' : 'border-slate-800'}`}>
            <h3 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 font-mono ${isLightMode ? 'text-amber-950' : 'text-slate-100'}`}>
              <Layers className={`w-5 h-5 ${isLightMode ? 'text-cyan-600' : 'text-cyan-400'}`} />
              Bio-cementation Cross-Link Settings
            </h3>
            <div className={`flex gap-1.5 p-1 rounded border ${isLightMode ? 'bg-amber-50/50 border-amber-900/10' : 'bg-[#06080d] border-slate-800'}`}>
              <button 
                onClick={() => handlePreset('day')}
                className={`px-2 py-1 text-[9px] font-mono font-bold rounded flex items-center gap-1 cursor-pointer transition ${
                  activePreset === 'day' 
                    ? isLightMode ? 'bg-white text-cyan-800 border border-amber-900/15 shadow-sm' : 'bg-[#152e3d] text-cyan-400 border border-cyan-850' 
                    : isLightMode ? 'text-amber-800/50 hover:text-amber-850' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Sun className="w-3 h-3 text-amber-500" /> Day
              </button>
              <button 
                onClick={() => handlePreset('night')}
                className={`px-2 py-1 text-[9px] font-mono font-bold rounded flex items-center gap-1 cursor-pointer transition ${
                  activePreset === 'night' 
                    ? isLightMode ? 'bg-white text-cyan-800 border border-amber-900/15 shadow-sm' : 'bg-[#152e3d] text-cyan-400 border border-cyan-850' 
                    : isLightMode ? 'text-amber-800/50 hover:text-amber-850' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Moon className="w-3 h-3 text-cyan-500 animate-pulse" /> Night
              </button>
            </div>
          </div>

          {/* Dynamic linking controllers */}
          <div className="space-y-4">
            
            {/* Universal Linkage toggle with cyan outline */}
            <div className={`p-3.5 rounded-lg text-xs ${isLightMode ? 'bg-cyan-50/45 border border-cyan-200' : 'bg-cyan-950/10 border border-cyan-900/35'}`}>
              <label className="flex items-center justify-between cursor-pointer">
                <span className={`flex items-center gap-1.5 font-bold font-sans ${isLightMode ? 'text-cyan-800' : 'text-cyan-400'}`}>
                  <Link2 className={`w-4 h-4 animate-pulse ${isLightMode ? 'text-cyan-600' : 'text-cyan-500'}`} />
                  Interconnect With Secretion Yield
                </span>
                <input 
                  type="checkbox" 
                  checked={isLinked} 
                  onChange={(e) => setIsLinked(e.target.checked)}
                  className="rounded accent-cyan-500 w-4 h-4 cursor-pointer"
                />
              </label>
              <p className={`text-[10px] mt-2 font-sans leading-relaxed ${isLightMode ? 'text-stone-600 font-medium' : 'text-slate-400'}`}>
                When checked, local biopolymer density (<code className={isLightMode ? 'text-emerald-700 font-mono font-bold' : 'text-[#34d399]'}>ρ_poly</code>) is directly bound to live secreted γ-PGA concentrations from upstream synthetic cell models.
              </p>
            </div>

            <div>
              <div className={`flex justify-between text-[11px] mb-1 ${isLightMode ? 'text-stone-700' : 'text-slate-400'}`}>
                <span className="font-semibold">Soil Cation Saturation (<code className={isLightMode ? 'text-cyan-700 font-mono font-bold' : 'text-cyan-800 font-mono'}>[Ca²⁺]</code>)</span>
                <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${isLightMode ? 'bg-cyan-50 border border-cyan-200 text-cyan-800 font-bold' : 'bg-cyan-950/40 border border-cyan-900/40 text-cyan-400'}`}>{params.ion_conc.toFixed(1)} mol/m³</span>
              </div>
              <input 
                type="range" min="0.5" max="25" step="0.5" 
                value={params.ion_conc} 
                onChange={(e) => {
                  setParams(p => ({ ...p, ion_conc: parseFloat(e.target.value) }));
                  setActivePreset('custom');
                }}
                className={`w-full h-1.5 rounded accent-cyan-500 cursor-ew-resize ${isLightMode ? 'bg-stone-200' : ''}`}
              />
              <span className={`text-[9px] block mt-1 ${isLightMode ? 'text-stone-400' : 'text-slate-500'}`}>Divalent calcium ions act as molecular anchors bridging separate strands.</span>
            </div>

            <div>
              <div className={`flex justify-between text-[11px] mb-1 ${isLightMode ? 'text-stone-700' : 'text-slate-400'}`}>
                <span className="font-semibold">Disassociation Aff. Constant (<code className={isLightMode ? 'text-amber-700 font-mono font-bold' : 'text-amber-800'}>Kd</code>)</span>
                <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${isLightMode ? 'bg-amber-50 border border-amber-200 text-amber-800 font-bold' : 'bg-amber-950/30 border border-amber-900/45 text-amber-440'}`}>{params.Kd.toFixed(1)} mol/m³</span>
              </div>
              <input 
                type="range" min="1.0" max="15.0" step="0.5" 
                value={params.Kd} 
                onChange={(e) => {
                  setParams(p => ({ ...p, Kd: parseFloat(e.target.value) }));
                  setActivePreset('custom');
                }}
                className={`w-full h-1.5 rounded accent-amber-500 cursor-ew-resize ${isLightMode ? 'bg-stone-200' : ''}`}
              />
              <span className={`text-[9px] block mt-1 ${isLightMode ? 'text-stone-400' : 'text-slate-500'}`}>Represents binding tightness. Lower values increase chelation network rigidity.</span>
            </div>

            <div>
              <div className={`flex justify-between text-[11px] mb-1 ${isLightMode ? 'text-stone-700' : 'text-slate-400'}`}>
                <span className="font-semibold">Polymer Matrix Concentration (<code className={isLightMode ? 'text-emerald-700 font-mono font-bold' : 'text-[#34d399] font-mono'}>ρ_poly</code>)</span>
                <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${isLightMode ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold' : 'bg-emerald-950/30 border border-emerald-900/30 text-[#34d399]'}`}>{effectiveRhoPolymer.toFixed(2)} kg/m³</span>
              </div>
              {isLinked ? (
                <div className={`py-2.5 px-3 rounded text-[10px] border font-mono flex items-center gap-1.5 animate-pulse ${
                  isLightMode 
                    ? 'bg-emerald-50/55 border-emerald-200 text-emerald-800 font-bold shadow-sm' 
                    : 'bg-slate-900/45 text-[#34d399] border-emerald-900/20'
                }`}>
                  <span>Dynamic Feed: Math.min(8.0, 0.1 + PGA * 0.04)</span>
                </div>
              ) : (
                <input 
                  type="range" min="0.1" max="8.0" step="0.1" 
                  value={params.rho_polymer} 
                  onChange={(e) => {
                    setParams(p => ({ ...p, rho_polymer: parseFloat(e.target.value) }));
                    setActivePreset('custom');
                  }}
                  className={`w-full h-1.5 rounded accent-emerald-500 cursor-ew-resize ${isLightMode ? 'bg-stone-200' : ''}`}
                />
              )}
            </div>

            <div>
              <div className={`flex justify-between text-[11px] mb-1 ${isLightMode ? 'text-stone-700' : 'text-slate-400'}`}>
                <span className="font-semibold">Environmental Temp (<code className={isLightMode ? 'text-rose-700 font-mono font-bold' : 'text-rose-400 font-mono'}>T</code>)</span>
                <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${isLightMode ? 'bg-rose-50 border border-rose-200 text-rose-800 font-bold' : 'bg-rose-950/30 border border-rose-900/40 text-rose-400'}`}>{params.temperature.toFixed(1)} K ({(params.temperature - 273.15).toFixed(1)}°C)</span>
              </div>
              <input 
                type="range" min="260" max="330" step="1" 
                value={params.temperature} 
                onChange={(e) => {
                  setParams(p => ({ ...p, temperature: parseFloat(e.target.value) }));
                  setActivePreset('custom');
                }}
                className={`w-full h-1.5 rounded accent-rose-500 cursor-ew-resize ${isLightMode ? 'bg-stone-200' : ''}`}
              />
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-2 gap-3 pt-3 border-t ${isLightMode ? 'border-amber-900/10' : 'border-slate-900'}`}>
          <div>
            <label className={`text-[9px] mb-1 block font-mono ${isLightMode ? 'text-stone-500 font-bold' : 'text-slate-500'}`}>CROSS-LINK WT (Mx)</label>
            <input 
              type="number" min="500" max="10000" step="100"
              value={params.Mx} 
              onChange={(e) => setParams(p => ({ ...p, Mx: Math.max(100, parseInt(e.target.value) || 0) }))}
              className={`w-full p-1.5 border rounded text-xs font-mono outline-none ${
                isLightMode 
                  ? 'bg-[#fdfaf3] border-amber-900/15 text-stone-900 focus:border-cyan-600' 
                  : 'bg-[#06080d] border-slate-850 text-white focus:border-cyan-500'
              }`}
            />
          </div>
          <div>
            <label className={`text-[9px] mb-1 block font-mono ${isLightMode ? 'text-stone-500 font-bold' : 'text-slate-500'}`}>POLYMER LENGTH (Mn)</label>
            <input 
              type="number" min="20000" max="150000" step="5000"
              value={params.Mn} 
              onChange={(e) => setParams(p => ({ ...p, Mn: Math.max(5000, parseInt(e.target.value) || 0) }))}
              className={`w-full p-1.5 border rounded text-xs font-mono outline-none ${
                isLightMode 
                  ? 'bg-[#fdfaf3] border-amber-900/15 text-stone-900 focus:border-cyan-600' 
                  : 'bg-[#06080d] border-slate-850 text-white focus:border-cyan-500'
              }`}
            />
          </div>
        </div>

      </div>

      {/* Larger, Stunning Real-Time Visuals Viewport */}
      <div className={`lg:col-span-12 xl:col-span-7 p-5 rounded-xl border flex flex-col justify-between space-y-4 transition-colors duration-300 ${
        isLightMode ? 'bg-white border-amber-900/10' : 'bg-[#0a0f18] border-slate-800/80'
      }`}>
        <div>
          <h3 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 font-mono pb-2 border-b ${
            isLightMode ? 'text-amber-900 border-amber-900/10' : 'text-slate-200 border-slate-800/40'
          }`}>
            <Sparkles className={`w-5 h-5 animate-pulse ${isLightMode ? 'text-indigo-600' : 'text-indigo-400'}`} />
            Quartz/SiO₂ Sand Gels Undergoing Coordinate Chelation
          </h3>
          <p className={`text-xs leading-relaxed max-w-2xl mt-2 font-sans ${isLightMode ? 'text-stone-600 font-medium' : 'text-slate-400'}`}>
            <strong>How Bio-gelling works simply:</strong> The bacteria-produced <strong>γ-PGA polymeric adhesive</strong> contains repeating negatively charged carboxylate groups along its peptide backbone. In porous sand beds, the addition of divalent metal cations like <strong>Calcium (Ca²⁺)</strong> forms strong salt bridges that cross-link these chains together. This traps quartz sand grains in an elastic solid matrix, boosting soil shear modulus up to 4000 Pa!
          </p>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Realtime Canvas Box (LARGER VIEWPORT) */}
            <div className="md:col-span-8 flex justify-center">
              <div className={`border rounded-lg overflow-hidden relative shadow-2xl w-full max-w-[550px] group transition-colors ${
                isLightMode ? 'border-amber-900/15 bg-[#fdfaf3]' : 'border-slate-800 bg-[#04060a]'
              }`}>
                <canvas 
                  ref={canvasRef} 
                  width={550} 
                  height={360} 
                  className="block rounded max-w-full h-auto cursor-crosshair"
                />
                
                {/* 3D hover helper */}
                <div className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded text-[9px] font-mono tracking-wider border uppercase transition pointer-events-none group-hover:opacity-100 ${
                  isLightMode 
                    ? 'bg-white/95 border-amber-900/15 text-indigo-700 shadow-sm' 
                    : 'bg-black/85 border-slate-800 text-indigo-300 opacity-0'
                }`}>
                  Hover cursor to shift 3D parallax layers
                </div>
              </div>
            </div>

            {/* Biophysics Dashboard numbers */}
            <div className={`md:col-span-4 space-y-4 font-mono text-xs p-4 rounded-xl shadow self-stretch flex flex-col justify-between transition-colors ${
              isLightMode ? 'bg-[#fcfaf4] border border-amber-900/10' : 'bg-[#05070c] border border-slate-850 shadow'
            }`}>
              <div>
                <span className={`text-[9px] font-black tracking-wider block uppercase mb-3 ${isLightMode ? 'text-stone-500' : 'text-slate-500'}`}>Lattice Telemetry</span>
                
                <div className="space-y-4">
                  <div>
                    <span className={`block text-[9px] mb-0.5 ${isLightMode ? 'text-stone-500 font-bold' : 'text-slate-500'}`}>SATURATION DENSITY (θ)</span>
                    <span className={`font-extrabold text-sm ${isLightMode ? 'text-cyan-700' : 'text-[#22d3ee]'}`}>{(results.theta * 100).toFixed(1)}%</span>
                  </div>

                  <div>
                    <span className={`block text-[9px] mb-0.5 ${isLightMode ? 'text-stone-500 font-bold' : 'text-slate-500'}`}>PEPTIDIC CROSSLINKS</span>
                    <span className={`font-extrabold text-[11px] ${isLightMode ? 'text-[#059669]' : 'text-[#34d399]'}`}>{results.nu.toFixed(5)} mol/cm³</span>
                  </div>

                  <div>
                    <span className={`block text-[9px] mb-0.5 font-sans ${isLightMode ? 'text-stone-500 font-bold' : 'text-slate-500'}`}>SHEAR STIFFNESS (Gs)</span>
                    <span className={`font-black text-sm ${isLightMode ? 'text-amber-700' : 'text-amber-400'}`}>{results.G.toFixed(1)} Pa</span>
                  </div>
                </div>
              </div>

              <div className={`pt-2.5 border-t leading-normal text-[10px] font-sans flex gap-1.5 items-start ${
                isLightMode ? 'border-amber-900/10 text-stone-600 font-medium' : 'border-slate-900 text-slate-400'
              }`}>
                <Info className={`w-4 h-4 shrink-0 ${isLightMode ? 'text-cyan-700' : 'text-[#22d3ee]'}`} />
                <span>An elevated Shear G ratio protects sand bed structures from erosion up to 50 m/s gale dust storm stresses!</span>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
