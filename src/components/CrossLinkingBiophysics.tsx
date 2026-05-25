import React, { useState, useMemo, useEffect, useRef } from 'react';
import { BiophysicsParams } from '../types';
import { Layers, Thermometer, Sun, Moon, Sparkles, SlidersHorizontal, Info, Link2, HelpCircle } from 'lucide-react';

interface CrossLinkingProps {
  params: BiophysicsParams;
  setParams: React.Dispatch<React.SetStateAction<BiophysicsParams>>;
  pgaAccum: number;
  isLinked: boolean;
  setIsLinked: (val: boolean) => void;
  shearModulus: number;
  onUpdateShearModulus?: (g: number) => void;
}

export default function CrossLinkingBiophysics({
  params,
  setParams,
  pgaAccum,
  isLinked,
  setIsLinked,
  shearModulus,
  onUpdateShearModulus,
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

  // Base physics solver
  const results = useMemo(() => {
    const R = 8.314; // Ideal gas constant J/(mol*K)
    
    // Saturation theta
    const theta = params.ion_conc / (params.Kd + params.ion_conc);
    
    // Volumetric cross-link density nu
    const factor = 1 - (2 * params.Mx) / params.Mn;
    const nu = Math.max(0, effectiveRhoPolymer * theta * factor);
    
    // Shear modulus G (Pa)
    const G = nu * R * params.temperature;
    
    return { theta, nu, G };
  }, [params, effectiveRhoPolymer]);

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
      { x: 75,  y: 65,  radius: 30, color: '#e0f2fe', z: 0.35 },  // Light ice quartz
      { x: 215, y: 60,  radius: 38, color: '#bae6fd', z: 0.85 },  // Medium ice-blue silica
      { x: 385, y: 70,  radius: 34, color: '#e0f2fe', z: 0.55 },  // Clear silicon granule
      { x: 505, y: 65,  radius: 28, color: '#cffafe', z: 0.25 },  
      { x: 130, y: 175, radius: 42, color: '#e2e8f0', z: 0.95 },  // Dense frosted quartz
      { x: 295, y: 185, radius: 40, color: '#bae6fd', z: 0.75 },  // Layered silica cluster
      { x: 465, y: 175, radius: 36, color: '#cbd5e1', z: 0.45 },  
      { x: 70,  y: 290, radius: 32, color: '#cffafe', z: 0.30 },  // Lower silica layer
      { x: 230, y: 280, radius: 38, color: '#cbd5e1', z: 0.65 },  
      { x: 395, y: 300, radius: 44, color: '#bae6fd', z: 1.00 },  // Giant silica dome
      { x: 520, y: 285, radius: 26, color: '#e0f2fe', z: 0.20 },  
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

      // Dark sci-fi backdrop
      ctx.fillStyle = '#03060a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render molecular background grids reflecting custom parallax shift
      ctx.strokeStyle = '#050c18';
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
      ctx.fillStyle = 'rgba(34, 211, 238, 0.09)';
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
        ctx.fillStyle = 'rgba(110, 231, 183, 1.0)';
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
        ctx.shadowColor = 'rgba(1, 3, 7, 0.9)';
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
        grainGrad.addColorStop(0.72, 'rgba(15, 23, 42, 0.45)'); // Refractive dark inner curvature
        grainGrad.addColorStop(1, '#081734'); // Rich oceanic deep slate shadow rim for extreme 3D fullness

        ctx.fillStyle = grainGrad;
        ctx.beginPath();
        ctx.arc(gx, gy, g.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // High gloss frosted glass inner crescent reflection
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(gx, gy, g.radius - 2.5, Math.PI * 1.15, Math.PI * 1.65);
        ctx.stroke();

        // Dark ink borders to provide distinct cartoon-like outlines resembling Protein Imager style
        ctx.strokeStyle = '#02050b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(gx, gy, g.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Frosted silica text tag
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = 'bold 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText("SiO₂", gx, gy + 3);
      });

      // Overlay visual boundary dashboard stats onto canvas
      ctx.fillStyle = 'rgba(10, 15, 24, 0.88)';
      ctx.fillRect(10, canvas.height - 35, canvas.width - 20, 25);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.strokeRect(10, canvas.height - 35, canvas.width - 20, 25);
      
      ctx.fillStyle = '#22d3ee';
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
  }, [params, results, effectiveRhoPolymer]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 bg-[#06080d] rounded-xl border border-slate-800 shadow-xl" id="crosslinking-biophysics-panel">
      
      {/* Parameter Controls Panel */}
      <div className="lg:col-span-5 bg-[#0a0f18] p-5 rounded-xl border border-slate-800/80 space-y-5 flex flex-col justify-between">
        
        <div className="space-y-4">
          {/* Module Header */}
          <div className="flex justify-between items-center pb-3 border-b border-slate-800">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-100 flex items-center gap-2 font-mono">
              <Layers className="w-5 h-5 text-cyan-400" />
              Bio-cementation Cross-Link Settings
            </h3>
            <div className="flex gap-1.5 bg-[#06080d] p-1 rounded border border-slate-800">
              <button 
                onClick={() => handlePreset('day')}
                className={`px-2 py-1 text-[9px] font-mono font-bold rounded flex items-center gap-1 cursor-pointer transition ${activePreset === 'day' ? 'bg-[#152e3d] text-cyan-400 border border-cyan-850' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Sun className="w-3 h-3 text-amber-400" /> Day
              </button>
              <button 
                onClick={() => handlePreset('night')}
                className={`px-2 py-1 text-[9px] font-mono font-bold rounded flex items-center gap-1 cursor-pointer transition ${activePreset === 'night' ? 'bg-[#152e3d] text-cyan-400 border border-cyan-850' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Moon className="w-3 h-3 text-[#22d3ee]" /> Night
              </button>
            </div>
          </div>

          {/* Dynamic linking controllers */}
          <div className="space-y-4">
            
            {/* Universal Linkage toggle with cyan outline */}
            <div className="p-3.5 rounded-lg bg-cyan-950/10 border border-cyan-900/35 text-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="flex items-center gap-1.5 font-bold text-cyan-400 font-sans">
                  <Link2 className="w-4 h-4 text-cyan-500 animate-pulse" />
                  Interconnect With Secretion Yield
                </span>
                <input 
                  type="checkbox" 
                  checked={isLinked} 
                  onChange={(e) => setIsLinked(e.target.checked)}
                  className="rounded accent-cyan-500 w-4 h-4 cursor-pointer"
                />
              </label>
              <p className="text-[10px] text-slate-450 mt-2 font-sans leading-relaxed">
                When checked, local biopolymer density (<code className="text-[#34d399]">ρ_poly</code>) is directly bound to live secreted γ-PGA concentrations from upstream synthetic cell models.
              </p>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-405 mb-1">
                <span className="font-semibold">Soil Cation Saturation (<code className="text-cyan-450 font-mono">[Ca²⁺]</code>)</span>
                <span className="font-mono bg-cyan-950/40 text-cyan-450 px-1.5 py-0.5 border border-cyan-900/40 rounded text-[10px]">{params.ion_conc.toFixed(1)} mol/m³</span>
              </div>
              <input 
                type="range" min="0.5" max="25" step="0.5" 
                value={params.ion_conc} 
                onChange={(e) => {
                  setParams(p => ({ ...p, ion_conc: parseFloat(e.target.value) }));
                  setActivePreset('custom');
                }}
                className="w-full h-1.5 rounded accent-cyan-500 cursor-ew-resize"
              />
              <span className="text-[9px] text-slate-500 block mt-1">Divalent calcium ions act as molecular anchors bridging separate strands.</span>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-405 mb-1">
                <span className="font-semibold">Disassociation Aff. Constant (<code className="text-amber-450 font-mono">Kd</code>)</span>
                <span className="font-mono bg-amber-950/30 text-amber-455 px-1.5 py-0.5 border border-amber-900/45 rounded text-[10px]">{params.Kd.toFixed(1)} mol/m³</span>
              </div>
              <input 
                type="range" min="1.0" max="15.0" step="0.5" 
                value={params.Kd} 
                onChange={(e) => {
                  setParams(p => ({ ...p, Kd: parseFloat(e.target.value) }));
                  setActivePreset('custom');
                }}
                className="w-full h-1.5 rounded accent-amber-500 cursor-ew-resize"
              />
              <span className="text-[9px] text-slate-500 block mt-1">Represents binding tightness. Lower values increase chelation network rigidity.</span>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-405 mb-1">
                <span className="font-semibold">Polymer Matrix Concentration (<code className="text-[#34d399] font-mono">ρ_poly</code>)</span>
                <span className="font-mono bg-emerald-950/30 text-[#34d399] px-1.5 py-0.5 border border-emerald-900/30 rounded text-[10px]">{effectiveRhoPolymer.toFixed(2)} kg/m³</span>
              </div>
              {isLinked ? (
                <div className="py-2.5 px-3 rounded bg-slate-900/45 text-[10px] text-[#34d399] border border-emerald-900/20 font-mono flex items-center gap-1.5 animate-pulse">
                  <span>🔗 Dynamic Feed: Math.min(8.0, 0.1 + PGA * 0.04)</span>
                </div>
              ) : (
                <input 
                  type="range" min="0.1" max="8.0" step="0.1" 
                  value={params.rho_polymer} 
                  onChange={(e) => {
                    setParams(p => ({ ...p, rho_polymer: parseFloat(e.target.value) }));
                    setActivePreset('custom');
                  }}
                  className="w-full h-1.5 rounded accent-emerald-500 cursor-ew-resize"
                />
              )}
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-405 mb-1">
                <span className="font-semibold">Environmental Temp (<code className="text-rose-450 font-mono">T</code>)</span>
                <span className="font-mono bg-rose-950/30 text-rose-450 px-1.5 py-0.5 border border-rose-900/40 rounded text-[10px]">{params.temperature.toFixed(1)} K ({(params.temperature - 273.15).toFixed(1)}°C)</span>
              </div>
              <input 
                type="range" min="260" max="330" step="1" 
                value={params.temperature} 
                onChange={(e) => {
                  setParams(p => ({ ...p, temperature: parseFloat(e.target.value) }));
                  setActivePreset('custom');
                }}
                className="w-full h-1.5 rounded accent-rose-500 cursor-ew-resize"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-900">
          <div>
            <label className="text-[9px] text-slate-500 mb-1 block font-mono">CROSS-LINK WT (Mx)</label>
            <input 
              type="number" min="500" max="10000" step="100"
              value={params.Mx} 
              onChange={(e) => setParams(p => ({ ...p, Mx: Math.max(100, parseInt(e.target.value) || 0) }))}
              className="w-full bg-[#06080d] p-1.5 border border-slate-850 rounded text-xs text-white font-mono outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="text-[9px] text-slate-500 mb-1 block font-mono">POLYMER LENGTH (Mn)</label>
            <input 
              type="number" min="20000" max="150000" step="5000"
              value={params.Mn} 
              onChange={(e) => setParams(p => ({ ...p, Mn: Math.max(5000, parseInt(e.target.value) || 0) }))}
              className="w-full bg-[#06080d] p-1.5 border border-slate-850 rounded text-xs text-white font-mono outline-none focus:border-cyan-500"
            />
          </div>
        </div>

      </div>

      {/* Larger, Stunning Real-Time Visuals Viewport */}
      <div className="lg:col-span-7 bg-[#0a0f18] p-5 rounded-xl border border-slate-800/80 flex flex-col justify-between space-y-4">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-200 flex items-center gap-2 font-mono pb-2 border-b border-slate-800/40">
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            Quartz/SiO₂ Sand Gels Undergoing Coordinate Chelation
          </h3>
          <p className="text-xs text-slate-450 leading-relaxed max-w-2xl mt-2 font-sans">
            <strong>How Bio-gelling works simply:</strong> The bacteria-produced <strong>γ-PGA polymeric adhesive</strong> contains repeating negatively charged carboxylate groups along its peptide backbone. In porous sand beds, the addition of divalent metal cations like <strong>Calcium (Ca²⁺)</strong> forms strong salt bridges that cross-link these chains together. This traps quartz sand grains in an elastic solid matrix, boosting soil shear modulus up to 4000 Pa!
          </p>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Realtime Canvas Box (LARGER VIEWPORT) */}
            <div className="md:col-span-8 flex justify-center">
              <div className="border border-slate-800 rounded-lg overflow-hidden relative shadow-2xl bg-[#04060a] w-full max-w-[550px] group">
                <canvas 
                  ref={canvasRef} 
                  width={550} 
                  height={360} 
                  className="block rounded max-w-full h-auto cursor-crosshair"
                />
                
                {/* 3D hover helper */}
                <div className="absolute top-2.5 left-2.5 bg-black/85 px-2.5 py-1 rounded text-[9px] font-mono tracking-wider border border-slate-800 uppercase text-indigo-300 opacity-0 group-hover:opacity-100 transition pointer-events-none">
                  🖱 Hover cursor to shift 3D parallax layers
                </div>
              </div>
            </div>

            {/* Biophysics Dashboard numbers */}
            <div className="md:col-span-4 space-y-4 font-mono text-xs bg-[#05070c] border border-slate-850 p-4 rounded-xl shadow self-stretch flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-black text-slate-500 tracking-wider block uppercase mb-3">Lattice Telemetry</span>
                
                <div className="space-y-4">
                  <div>
                    <span className="text-slate-500 block text-[9px] mb-0.5">SATURATION DENSITY (θ)</span>
                    <span className="font-extrabold text-[#22d3ee] text-sm">{(results.theta * 100).toFixed(1)}%</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[9px] mb-0.5">PEPTIDIC CROSSLINKS</span>
                    <span className="font-extrabold text-[#34d399] text-[11px]">{results.nu.toFixed(5)} mol/cm³</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[9px] mb-0.5 font-sans">SHEAR STIFFNESS (Gs)</span>
                    <span className="font-black text-amber-400 text-sm">{results.G.toFixed(1)} Pa</span>
                  </div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-900 leading-normal text-[10px] text-slate-450 font-sans flex gap-1.5 items-start">
                <Info className="w-4 h-4 text-[#22d3ee] shrink-0" />
                <span>An elevated Shear G ratio protects sand bed structures from erosion up to 50 m/s gale dust storm stresses!</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
