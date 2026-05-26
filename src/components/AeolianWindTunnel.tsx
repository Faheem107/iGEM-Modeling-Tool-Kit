import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AeolianParams } from '../types';
import { Wind, ShieldCheck, Zap, Info, Play, RotateCcw, Link2 } from 'lucide-react';

interface AeolianProps {
  params: AeolianParams;
  setParams: React.Dispatch<React.SetStateAction<AeolianParams>>;
  shearModulus: number;
  isLinked: boolean;
  setIsLinked: (val: boolean) => void;
  isLightMode: boolean;
}

export default function AeolianWindTunnel({
  params,
  setParams,
  shearModulus,
  isLinked,
  setIsLinked,
  isLightMode,
}: AeolianProps) {
  const [simulationActive, setSimulationActive] = useState<boolean>(true);

  // Cohesion factor linked to the shear modulus
  const effectiveCohesion = isLinked ? Math.min(0.006, shearModulus * 0.000002) : params.biofilm_cohesion;

  // Constants
  const A = 0.11;        // empirical dimensionless constant
  const rho_s = 2650;    // sand density (kg/m3)
  const rho_a = 1.225;   // air density (kg/m3)
  const g = 9.81;        // gravity (m/s2)
  const C = 2.0;         // saltation constant

  // Core Physics Calcs
  const physics = useMemo(() => {
    // 1. Untreated Threshold Velocity
    // u*t0 = A * sqrt( ((rho_s - rho_a)/rho_a) * g * d )
    const term1_untreated = ((rho_s - rho_a) / rho_a) * g * params.sand_diameter;
    const u_star_t0 = A * Math.sqrt(term1_untreated);

    // 2. Treated Threshold Velocity
    // u*t = A * sqrt( term1 + gamma / (rho_a * d) )
    const term2_treated = effectiveCohesion / (rho_a * params.sand_diameter);
    const u_star_t = A * Math.sqrt(term1_untreated + term2_treated);

    // 3. Mass Saltation Flux q (kg/m*s) for untreated sand
    let q_untreated = 0.0;
    if (params.wind_velocity > u_star_t0) {
      q_untreated = C * (rho_a / g) * Math.pow(params.wind_velocity, 3) * (1 - (Math.pow(u_star_t0, 2) / Math.pow(params.wind_velocity, 2)));
    }

    // 4. Mass Saltation Flux q for treated sand
    let q_treated = 0.0;
    if (params.wind_velocity > u_star_t) {
      q_treated = C * (rho_a / g) * Math.pow(params.wind_velocity, 3) * (1 - (Math.pow(u_star_t, 2) / Math.pow(params.wind_velocity, 2)));
    }

    return { u_star_t0, u_star_t, q_untreated, q_treated };
  }, [params, effectiveCohesion]);

  // Virtual Wind Tunnel Particle Simulator
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    // Create particles with realistic size variations
    const particleCount = 140;
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      isTreated: boolean;
      state: 'resting' | 'saltating';
      jitterOffset: number;
    }> = [];

    // Halve the particles into untreated and treated sides for side-by-side comparison
    for (let i = 0; i < particleCount; i++) {
      const isTreated = i >= particleCount / 2;
      const grainDiam = params.sand_diameter * 1000; // in mm
      const baseRadius = Math.max(1.8, grainDiam * 12 + Math.random() * 1.5);
      
      particles.push({
        x: (isTreated ? canvas.width / 2 : 0) + Math.random() * (canvas.width / 2 - 20) + 10,
        y: canvas.height - 14 - Math.random() * 8,
        vx: 0,
        vy: 0,
        radius: baseRadius,
        color: isTreated ? '#34d399' : '#f59e0b', // Emerald treated, yellow loose
        isTreated,
        state: 'resting',
        jitterOffset: Math.random() * Math.PI * 2,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.035;

      // Background viewport color
      ctx.fillStyle = isLightMode ? '#fdfaf3' : '#06080d';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Diagnostic radar grid lines
      ctx.strokeStyle = isLightMode ? '#eae1cd' : '#0e1726';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Wind chamber partition lines
      ctx.strokeStyle = isLightMode ? '#efe7d1' : '#1e293b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();

      // Dynamic wind vectors (blowing lines that flow with friction speed)
      const windActiveStr = Math.min(1.0, params.wind_velocity * 0.9);
      ctx.strokeStyle = isLightMode ? `rgba(14, 165, 233, ${0.12 + windActiveStr * 0.45})` : `rgba(165, 243, 252, ${0.1 + windActiveStr * 0.4})`;
      ctx.lineWidth = 1 + params.wind_velocity * 3.5;
      
      const flowLines = 6;
      for (let f = 0; f < flowLines; f++) {
        const hY = 30 + f * 30;
        const drift = (time * params.wind_velocity * 180) % canvas.width;
        ctx.beginPath();
        ctx.moveTo(0, hY);
        for (let x = 0; x < canvas.width; x += 20) {
          const wY = hY + Math.sin((x / 50) + time * 3 + f) * (params.wind_velocity * 9);
          ctx.lineTo(x, wY);
        }
        ctx.stroke();
      }

      // Chamber title card indicators
      ctx.fillStyle = isLightMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(15, 23, 42, 0.7)';
      ctx.fillRect(10, 8, 120, 20);
      ctx.fillRect(canvas.width / 2 + 10, 8, 155, 20);
      ctx.strokeStyle = isLightMode ? '#eae1cd' : '#1d283c';
      ctx.strokeRect(10, 8, 120, 20);
      ctx.strokeRect(canvas.width / 2 + 10, 8, 155, 20);

      ctx.fillStyle = isLightMode ? '#475569' : '#94a3b8';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ef4444';
      ctx.fillText('UNTREATED SANDS', 16, 21);
      ctx.fillStyle = isLightMode ? '#059669' : '#10b981';
      ctx.fillText('NYUAD iGEM BIO-GEL', canvas.width / 2 + 16, 21);

      // Simulation physics engine updates
      particles.forEach((p) => {
        const threshold = p.isTreated ? physics.u_star_t : physics.u_star_t0;
        const indexThresholdReached = params.wind_velocity > threshold;

        if (simulationActive) {
          if (indexThresholdReached) {
            p.state = 'saltating';
            
            // Horizontal transport momentum + random turbulences
            p.vx += (params.wind_velocity - threshold) * (0.05 + Math.random() * 0.12);
            
            // Saltation liftoff triggers when particle hits ground
            if (p.y >= canvas.height - 15) {
              p.vy = -Math.random() * (params.wind_velocity * 6.8);
            }
            
            p.vy += 0.45; // custom gravity drift
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.97; // air resistance friction
          } else {
            // Settle down elegantly to rest
            p.state = 'resting';
            p.vx *= 0.8;
            if (p.y < canvas.height - 14) {
              p.y += 1.8;
            } else {
              p.y = canvas.height - 14;
              p.vy = 0;
            }

            // Slight coherent vibration under ambient wind speeds below threshold
            if (params.wind_velocity > 0.1) {
              p.x += Math.sin(time * 5 + p.jitterOffset) * (params.wind_velocity * 0.4);
            }
          }

          // Bound constraints bouncing on bottom sand-bed floor
          if (p.y >= canvas.height - 14) {
            p.y = canvas.height - 14;
            p.vy = -p.vy * 0.38; // elastic rebound
            p.vx *= 0.75;
          }

          // Recycle sand horizontally within their respective halves
          const leftBound = p.isTreated ? canvas.width / 2 : 0;
          const rightBound = p.isTreated ? canvas.width : canvas.width / 2;
          
          if (p.x > rightBound) {
            p.x = leftBound - 5;
            p.y = canvas.height - 14 - Math.random() * 4;
            p.vx = Math.random() * 1.5;
            p.vy = 0;
          }
        }

        // Guard to ensure values passed to createRadialGradient are completely finite and greater than zero
        const radiusVal = Math.max(0.1, p.radius);
        const pxVal = p.x;
        const pyVal = p.y;
        if (!isFinite(radiusVal) || !isFinite(pxVal) || !isFinite(pyVal) || radiusVal <= 0) {
          return;
        }

        // Render beautiful particle nodes with CPK highlighting
        const grad = ctx.createRadialGradient(
          pxVal - radiusVal * 0.2, pyVal - radiusVal * 0.2, radiusVal * 0.05,
          pxVal, pyVal, radiusVal
        );
        if (p.isTreated) {
          // Treated particles with glowing gel binders wrapping them
          grad.addColorStop(0, '#a7f3d0'); // Mint green bright highlights
          grad.addColorStop(0.3, '#10b981'); // Emerald
          grad.addColorStop(1, '#064e3b');
        } else {
          // Loose, dry desert sand grains
          grad.addColorStop(0, '#fde047'); // Golden sand
          grad.addColorStop(0.35, '#f59e0b');
          grad.addColorStop(1, '#78350f');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = p.isTreated ? 'rgba(16, 185, 129, 0.4)' : 'rgba(217, 119, 6, 0.3)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });

      // Bio-cemented structural networks overlay drawing (gel mesh links)
      if (effectiveCohesion > 0.0001) {
        ctx.strokeStyle = `rgba(16, 185, 129, ${Math.min(0.65, effectiveCohesion * 150)})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let j = 0; j < particles.length / 2 - 1; j++) {
          const p1 = particles[Math.floor(particles.length / 2) + j];
          const p2 = particles[Math.floor(particles.length / 2) + j + 1];
          if (p1 && p2 && p1.state === 'resting' && p2.state === 'resting') {
            const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
            if (dist < 45) {
              ctx.moveTo(p1.x, p1.y);
              ctx.bezierCurveTo(p1.x, p1.y + 5, p2.x, p2.y + 5, p2.x, p2.y);
            }
          }
        }
        ctx.stroke();
      }

      // Air flow velocity meter center widget
      ctx.fillStyle = isLightMode ? '#ffffff' : '#0a0f18';
      ctx.fillRect(canvas.width / 2 - 55, canvas.height - 35, 110, 28);
      ctx.strokeStyle = isLightMode ? '#eae1cd' : '#1e293b';
      ctx.lineWidth = 1;
      ctx.strokeRect(canvas.width / 2 - 55, canvas.height - 35, 110, 28);

      ctx.fillStyle = isLightMode ? '#0ea5e9' : '#22d3ee';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`WIND u*: ${params.wind_velocity.toFixed(2)} m/s`, canvas.width / 2, canvas.height - 18);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [params, physics, simulationActive, effectiveCohesion, isLightMode]);

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 rounded-xl border transition-all duration-300 ${
      isLightMode 
        ? 'bg-[#fdfaf3] border-amber-900/10 shadow-[0_4px_24px_rgba(139,94,26,0.06)]' 
        : 'bg-[#06080d] border-slate-800 shadow-xl'
    }`} id="aeolian-wind-tunnel">
      {/* Parameters */}
      <div className={`lg:col-span-12 xl:col-span-5 p-5 rounded border transition-colors duration-300 ${isLightMode ? 'bg-white border-amber-900/10' : 'bg-[#0a0f18] border-slate-800/80'}`}>
        <h3 className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 mb-4 font-mono ${isLightMode ? 'text-amber-955' : 'text-slate-100'}`}>
          <Wind className={`w-5 h-5 ${isLightMode ? 'text-cyan-650' : 'text-cyan-400'}`} />
          Aeolian Dynamics Simulator
        </h3>

        <div className="space-y-5">
          {/* Universal Link to Biophysics */}
          <div className={`p-3 rounded text-xs mb-2 ${isLightMode ? 'bg-cyan-50/45 border border-cyan-200' : 'bg-cyan-950/15 border border-cyan-900/40'}`}>
            <label className="flex items-center justify-between cursor-pointer">
              <span className={`flex items-center gap-1.5 font-bold ${isLightMode ? 'text-cyan-800' : 'text-cyan-400'}`}>
                <Link2 className={`w-4 h-4 animate-pulse ${isLightMode ? 'text-cyan-600' : 'text-cyan-500'}`} />
                Link Bio-Cohesion to Shear Modulus
              </span>
              <input 
                type="checkbox" 
                checked={isLinked} 
                onChange={(e) => setIsLinked(e.target.checked)}
                className="rounded accent-cyan-500"
              />
            </label>
            <p className={`text-[10px] mt-1 font-sans leading-normal ${isLightMode ? 'text-stone-600 font-medium' : 'text-slate-400'}`}>
              When enabled, sand cohesive attachment (<code className={isLightMode ? 'text-emerald-700 font-mono font-bold' : 'text-emerald-400'}>γ_bio</code>) is dynamically calculated from downstream shear modulus strength of crosslinked soil gel networks.
            </p>
          </div>

          <div>
            <div className={`flex justify-between text-[11px] mb-1 ${isLightMode ? 'text-stone-700' : 'text-slate-400'}`}>
              <div className="group relative flex items-center gap-1 cursor-help">
                <span className={`underline decoration-dotted underline-offset-2 ${isLightMode ? 'decoration-stone-300' : 'decoration-slate-600'}`}>Friction Wind Velocity (<code className={isLightMode ? 'text-cyan-700 font-mono font-bold' : 'text-cyan-400 font-mono'}>u_*</code>)</span>
                <Info className="w-3.5 h-3.5 text-slate-500 hover:text-cyan-455 transition" />
                <div className={`absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-64 p-2 text-[10px] rounded shadow-xl z-25 font-sans leading-relaxed ${isLightMode ? 'bg-white text-stone-800 border border-amber-900/15' : 'bg-slate-950 text-slate-300 border border-slate-800'}`}>
                  Friction speed of ambient wind stress forcing sand lift dislodgements.
                </div>
              </div>
              <span className={`font-mono px-1.5 py-0.5 rounded border text-[10px] ${isLightMode ? 'bg-cyan-50 border-cyan-200 text-cyan-800 font-bold' : 'bg-cyan-950/50 border border-cyan-900/40 text-cyan-400'}`}>{params.wind_velocity.toFixed(2)} m/s</span>
            </div>
            <input 
              type="range" min="0.05" max="1.50" step="0.05" 
              value={params.wind_velocity} 
              onChange={(e) => setParams(p => ({ ...p, wind_velocity: parseFloat(e.target.value) }))}
              className={`w-full accent-cyan-500 cursor-ew-resize ${isLightMode ? 'bg-stone-200 h-1.5 rounded' : ''}`}
            />
            <span className={`text-[10px] block mt-1 font-sans ${isLightMode ? 'text-stone-400' : 'text-slate-500'}`}>Wind force exerted physically onto sand bed surfaces</span>
          </div>

          <div>
            <div className={`flex justify-between text-[11px] mb-1 ${isLightMode ? 'text-stone-700' : 'text-slate-400'}`}>
              <div className="group relative flex items-center gap-1 cursor-help">
                <span className={`underline decoration-dotted underline-offset-2 ${isLightMode ? 'decoration-stone-300' : 'decoration-slate-600'}`}>Sand Particle Diameter (<code className={isLightMode ? 'text-amber-700 font-mono font-bold' : 'text-amber-400 font-mono'}>d</code>)</span>
                <Info className="w-3.5 h-3.5 text-slate-500 hover:text-cyan-455 transition" />
                <div className={`absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-64 p-2 text-[10px] z-25 font-sans leading-relaxed rounded border shadow-xl ${isLightMode ? 'bg-white text-stone-800 border-amber-900/15' : 'bg-slate-950 text-slate-300 border border-slate-800'}`}>
                  Grain diameter size of sand particles; larger sizes require significantly more lift.
                </div>
              </div>
              <span className={`font-mono px-1.5 py-0.5 rounded border text-[10px] ${isLightMode ? 'bg-amber-50 border-amber-200 text-amber-850 font-bold' : 'bg-amber-950/30 border border-amber-900/40 text-amber-400'}`}>{(params.sand_diameter * 1000).toFixed(3)} mm</span>
            </div>
            <div className="flex gap-2">
              <input 
                type="range" min="0.00005" max="0.00100" step="0.00005" 
                value={params.sand_diameter} 
                onChange={(e) => setParams(p => ({ ...p, sand_diameter: parseFloat(e.target.value) }))}
                className={`w-full h-2 rounded accent-amber-500 mt-2 cursor-ew-resize ${isLightMode ? 'bg-stone-200' : ''}`}
              />
            </div>
            {/* Quick Presets for grain sizes */}
            <div className="flex gap-2.5 mt-2 font-mono">
              <button 
                onClick={() => setParams(p => ({ ...p, sand_diameter: 0.00005 }))}
                className={`text-[9px] font-bold px-2 py-1 rounded border cursor-pointer transition-colors ${
                  isLightMode 
                    ? 'text-amber-900 bg-amber-50/60 border-amber-900/15 hover:bg-amber-100/60' 
                    : 'text-slate-400 bg-[#06080d] hover:bg-slate-900/60 border border-slate-800'
                }`}
              >
                Fine (0.05mm)
              </button>
              <button 
                onClick={() => setParams(p => ({ ...p, sand_diameter: 0.00025 }))}
                className={`text-[9px] font-bold px-2 py-1 rounded border cursor-pointer transition-colors ${
                  isLightMode 
                    ? 'text-amber-900 bg-amber-50/60 border-amber-900/15 hover:bg-amber-100/60' 
                    : 'text-slate-400 bg-[#06080d] hover:bg-slate-900/60 border border-slate-800'
                }`}
              >
                Medium (0.25mm)
              </button>
              <button 
                onClick={() => setParams(p => ({ ...p, sand_diameter: 0.00085 }))}
                className={`text-[9px] font-bold px-2 py-1 rounded border cursor-pointer transition-colors ${
                  isLightMode 
                    ? 'text-amber-900 bg-amber-50/60 border-amber-900/15 hover:bg-amber-100/60' 
                    : 'text-slate-400 bg-[#06080d] hover:bg-slate-900/60 border border-slate-800'
                }`}
              >
                Coarse (0.85mm)
              </button>
            </div>
          </div>

          <div>
            <div className={`flex justify-between text-[11px] mb-1 ${isLightMode ? 'text-stone-700' : 'text-slate-400'}`}>
              <div className="group relative flex items-center gap-1 cursor-help">
                <span className={`underline decoration-dotted underline-offset-2 ${isLightMode ? 'decoration-stone-300' : 'decoration-slate-600'}`}>Biofilm Cohesive Adhesion (<code className={isLightMode ? 'text-emerald-700 font-mono' : 'text-emerald-400 font-mono'}>γ_bio</code>)</span>
                <Info className="w-3.5 h-3.5 text-slate-500 hover:text-cyan-455 transition" />
                <div className={`absolute left-0 bottom-full mb-1.5 hidden group-hover:block w-64 p-2 text-[10px] z-25 font-sans leading-relaxed rounded border shadow-xl ${isLightMode ? 'bg-white text-stone-800 border-amber-900/15' : 'bg-slate-950 text-slate-300 border border-slate-800'}`}>
                  Sticky bio-gel adhesive coefficient securing loose sand grains together.
                </div>
              </div>
              <span className={`font-mono px-1.5 py-0.5 rounded border text-[10px] ${isLightMode ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' : 'bg-emerald-950/30 border border-emerald-900/40 text-emerald-400'}`}>{effectiveCohesion.toFixed(5)} Pa</span>
            </div>
            {isLinked ? (
              <div className={`py-2.5 px-3 rounded text-[11px] font-mono flex items-center gap-1.5 border ${
                isLightMode 
                  ? 'bg-emerald-50/45 text-emerald-800 border-emerald-200 shadow-sm' 
                  : 'bg-slate-900/40 text-emerald-400/90 border border-emerald-953'
              }`}>
                <span>🔗 Bound: shearModulus * 0.000002</span>
              </div>
            ) : (
              <input 
                type="range" min="0.0" max="0.002" step="0.0001" 
                value={params.biofilm_cohesion} 
                onChange={(e) => setParams(p => ({ ...p, biofilm_cohesion: parseFloat(e.target.value) }))}
                className={`w-full accent-emerald-500 cursor-ew-resize ${isLightMode ? 'bg-stone-200 h-1.5 rounded' : ''}`}
              />
            )}
          </div>
        </div>

        {/* State Indicators */}
        <div className={`mt-5 pt-4 border-t space-y-2 ${isLightMode ? 'border-amber-900/10' : 'border-slate-800'}`}>
          <div className={`flex items-center justify-between text-xs font-mono ${isLightMode ? 'text-stone-600 font-medium' : 'text-slate-400'}`}>
            <span>UNTREATED THRESHOLD SPEED (u_*t0):</span>
            <span className={`font-bold ${isLightMode ? 'text-stone-704' : 'text-slate-400'}`}>{physics.u_star_t0.toFixed(3)} m/s</span>
          </div>
          <div className={`flex items-center justify-between text-xs font-mono ${isLightMode ? 'text-emerald-700' : 'text-emerald-404'}`}>
            <span>BIO-CEMENTED THRESHOLD (u_*t):</span>
            <span className="font-bold">{physics.u_star_t.toFixed(3)} m/s</span>
          </div>

          <div className={`mt-4 p-3 rounded-lg flex items-center gap-3 ${
            isLightMode 
              ? 'bg-[#ffeed6] border border-amber-900/12 shadow-[0_2px_8px_rgba(139,94,26,0.04)]' 
              : 'bg-[#0a1824] border border-cyan-950/80'
          }`}>
            <ShieldCheck className={`w-8 h-8 shrink-0 ${isLightMode ? 'text-amber-600' : 'text-cyan-400'}`} />
            <div className={`text-[11px] leading-snug font-sans ${isLightMode ? 'text-stone-700 font-medium' : 'text-slate-300'}`}>
              <strong>Erosion Protection Verified:</strong> Overexpressing γ-PGA increases the desert dislodgement threshold speed from <span className="text-amber-600 font-mono">{physics.u_star_t0.toFixed(2)} m/s</span> up to <span className="text-cyan-700 font-mono font-bold">{physics.u_star_t.toFixed(2)} m/s</span>!
            </div>
          </div>
        </div>
      </div>

      {/* Wind Tunnel Simulation Showcase */}
      <div className={`lg:col-span-12 xl:col-span-7 p-5 rounded border flex flex-col justify-between font-sans transition-colors duration-300 ${
        isLightMode ? 'bg-white border-amber-900/10' : 'bg-[#0a0f18] border-slate-800/80'
      }`}>
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isLightMode ? 'text-amber-955 font-bold' : 'text-slate-200'}`}>
              <Zap className={`w-5 h-5 animate-pulse ${isLightMode ? 'text-amber-600' : 'text-amber-400'}`} />
              Dynamic Aeolian Wind Tunnel Simulator
            </h3>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setSimulationActive(s => !s)}
                className={`px-3 py-1 rounded font-mono text-[10px] font-bold tracking-wider uppercase transition flex items-center gap-1 cursor-pointer ${
                  isLightMode 
                    ? 'bg-amber-50 text-cyan-800 border border-amber-900/12 hover:bg-amber-100/50' 
                    : 'bg-[#06080d] border border-slate-800 text-cyan-400 hover:text-cyan-300'
                }`}
              >
                <Play className="w-3 h-3 text-cyan-500" />
                {simulationActive ? 'Pause Sim' : 'Resume Sim'}
              </button>
            </div>
          </div>
          <p className={`text-[11px] leading-relaxed mb-4 ${isLightMode ? 'text-stone-600 font-medium' : 'text-slate-400'}`}>
            Compare chambers. Left contains loose, untreated sand grains; right contains NYUAD&apos;s polymer bonded bio-cement. Turn up friction speed and notice coherent bio-cement layers resisting wind dislodgement.
          </p>

          <div className={`border rounded overflow-hidden relative shadow-2xl ${isLightMode ? 'border-amber-900/15 bg-[#fdfaf3]' : 'border-slate-800 bg-[#06090f]'}`}>
            <canvas 
              ref={canvasRef} 
              width={520} 
              height={300}
              className="w-full display-block"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
