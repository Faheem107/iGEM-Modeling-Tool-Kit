import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AeolianParams } from '../types';
import { 
  Wind, 
  ShieldCheck, 
  Zap, 
  Info, 
  Play, 
  RotateCcw, 
  Link2, 
  TrendingUp, 
  ShieldAlert, 
  Gauge, 
  Activity, 
  Clock, 
  Award,
  Flame
} from 'lucide-react';

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
  // --- Upgraded State Parameters ---
  const [crustThickness, setCrustThickness] = useState<number>(12.0); // mm (1.0 to 25.0 mm)
  const [localShearModulus, setLocalShearModulus] = useState<number>(3100); // Pa (used when unlinked)
  const [isLiveTesting, setIsLiveTesting] = useState<boolean>(false);
  const [liveTestTime, setLiveTestTime] = useState<number>(0.0); // 0.0s to 15.0s
  
  // Real-time chart coordinate points populated during the live test
  const [liveControlErosion, setLiveControlErosion] = useState<{ x: number; y: number }[]>([]);
  const [liveTreatedErosion, setLiveTreatedErosion] = useState<{ x: number; y: number }[]>([]);

  // Simulation timer ref
  const liveTestTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Active shear modulus to use in calculations
  const activeGs = isLinked ? Math.max(100, shearModulus) : localShearModulus;

  // Constants for Bagnold threshold speed and saltation dynamics
  const A = 0.11;        // empirical dimensionless constant
  const rho_s = 2650;    // sand density (kg/m3)
  const rho_a = 1.225;   // air density (kg/m3)
  const g = 9.81;        // gravity (m/s2)
  const C = 2.0;         // saltation constant

  // Conversions: freestream velocity U_inf (m/s) corresponds to friction force velocity u* with u* = 0.03 * U_inf
  const uStarToUinf = (uStar: number) => uStar / 0.03;
  const uInfToUStar = (uInf: number) => uInf * 0.03;

  const currentFreestreamWind = useMemo(() => {
    return Number(uStarToUinf(params.wind_velocity).toFixed(1));
  }, [params.wind_velocity]);

  // Adjust wind speed
  const handleWindSpeedChange = (velocityMps: number) => {
    const targetUStar = uInfToUStar(velocityMps);
    setParams(p => ({
      ...p,
      wind_velocity: targetUStar
    }));
  };

  // Bio-cohesion factor based on Active Shear Modulus
  // Scales with sand shear stiffness to give matching cohesion
  const effectiveCohesion = useMemo(() => {
    return isLinked ? Math.min(0.009, activeGs * 0.000002) : params.biofilm_cohesion;
  }, [isLinked, activeGs, params.biofilm_cohesion]);

  // Physics Solvers
  const physicsResult = useMemo(() => {
    // 1. Untreated Threshold Velocity (friction limit)
    const term1_untreated = ((rho_s - rho_a) / rho_a) * g * params.sand_diameter;
    const u_star_t0 = A * Math.sqrt(term1_untreated);
    const uInf_t0 = uStarToUinf(u_star_t0);

    // 2. Treated Cohesion-Enhanced Threshold Velocity
    const term2_treated = effectiveCohesion / (rho_a * params.sand_diameter);
    const u_star_t = A * Math.sqrt(term1_untreated + term2_treated);
    const uInf_t = uStarToUinf(u_star_t);

    // Applied Shear Stress (Pascals) exerted by current wind speed
    const appliedShearStress = rho_a * Math.pow(params.wind_velocity, 2);

    // Critical stress threshold for instantaneous crust structural shattering
    // Higher Gs and thicker protective crust increase this capacity exponentially
    const shatterStressLimit = activeGs * 0.00035 * crustThickness;
    const isShattered = appliedShearStress > shatterStressLimit && currentFreestreamWind > 5;

    return {
      u_star_t0,
      u_star_t,
      uInf_t0,
      uInf_t,
      appliedShearStress,
      shatterStressLimit,
      isShattered
    };
  }, [params.sand_diameter, params.wind_velocity, effectiveCohesion, activeGs, crustThickness, currentFreestreamWind]);

  // Stopwatch Metrics calculated for entire storm duration
  const stopwatchMetrics = useMemo(() => {
    const uInf = currentFreestreamWind;
    const ut0 = physicsResult.uInf_t0;
    const ut = physicsResult.uInf_t;

    // Control Group Failure time: reaches 100% loss rapidly under wind pressure above threshold
    let t_fail_control = 15.0;
    if (uInf > ut0) {
      t_fail_control = Math.max(1.2, 10.0 / Math.pow(uInf - ut0 + 1.2, 0.45));
    } else {
      t_fail_control = 15.0; // stayed completely stable
    }

    // Treated Group Failure time
    let t_fail_treated = 15.0; // stable by default under threshold
    if (physicsResult.isShattered) {
      // Instant crust shattering drops Treated sand's durability immediately
      t_fail_treated = t_fail_control * 1.05; 
    } else if (uInf > ut) {
      // Steady micro-erosion over time above the cohesion threshold
      const safetyScale = 1.0 + (activeGs * crustThickness) / (180.0 * Math.max(1.0, uInf - ut));
      t_fail_treated = Math.min(180, t_fail_control * safetyScale);
    } else {
      t_fail_treated = 999.0; // Infinite survival (no erosion)
    }

    const lifespanMultiplier = t_fail_treated === 999.0 
      ? Infinity 
      : t_fail_treated / t_fail_control;

    return {
      controlFailSec: t_fail_control,
      treatedFailSec: t_fail_treated,
      lifespanMultiplier
    };
  }, [currentFreestreamWind, physicsResult, activeGs, crustThickness]);

  // Infinite simulation update loop when live testing
  const startLiveWindTunnelTest = () => {
    if (isLiveTesting) {
      // Reset action
      if (liveTestTimerRef.current) clearInterval(liveTestTimerRef.current);
      setIsLiveTesting(false);
      setLiveTestTime(0.0);
      setLiveControlErosion([]);
      setLiveTreatedErosion([]);
      return;
    }

    setIsLiveTesting(true);
    setLiveTestTime(0.0);
    setLiveControlErosion([{ x: 0, y: 0 }]);
    setLiveTreatedErosion([{ x: 0, y: 0 }]);

    let currentTime = 0.0;
    const step = 0.3; // Increments of 0.3s
    const targetDuration = 15.0;

    const controlFailSec = stopwatchMetrics.controlFailSec;
    const treatedFailSec = stopwatchMetrics.treatedFailSec;

    if (liveTestTimerRef.current) clearInterval(liveTestTimerRef.current);

    liveTestTimerRef.current = setInterval(() => {
      currentTime += step;
      if (currentTime > targetDuration) {
        clearInterval(liveTestTimerRef.current!);
        setIsLiveTesting(false);
        setLiveTestTime(targetDuration);
        return;
      }

      setLiveTestTime(currentTime);

      // Plot Control erosion curves
      let controlPercent = 0;
      if (currentFreestreamWind > physicsResult.uInf_t0) {
        controlPercent = Math.min(100, Math.pow(currentTime / controlFailSec, 1.35) * 100);
      }
      setLiveControlErosion(prev => [...prev, { x: currentTime, y: controlPercent }]);

      // Plot Treated erosion curves
      let treatedPercent = 0;
      if (physicsResult.isShattered) {
        treatedPercent = Math.min(100, Math.pow(currentTime / (controlFailSec * 1.05), 1.35) * 100);
      } else if (currentFreestreamWind > physicsResult.uInf_t) {
        treatedPercent = Math.min(100, Math.pow(currentTime / treatedFailSec, 2.0) * 100);
      }
      setLiveTreatedErosion(prev => [...prev, { x: currentTime, y: treatedPercent }]);

    }, 45); // highly smooth and responsive ticker updates (ticks fast for rapid graphing)
  };

  useEffect(() => {
    return () => {
      if (liveTestTimerRef.current) clearInterval(liveTestTimerRef.current);
    };
  }, []);

  // Update FBA parameter if active test attributes change
  useEffect(() => {
    triggerReset();
  }, [currentFreestreamWind, crustThickness, activeGs]);

  const triggerReset = () => {
    if (liveTestTimerRef.current) clearInterval(liveTestTimerRef.current);
    setIsLiveTesting(false);
    setLiveTestTime(0.0);
    setLiveControlErosion([]);
    setLiveTreatedErosion([]);
  };

  // Particle Canvas simulation rendering loop logic
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = particleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let clockTicks = 0;

    const pCount = 100;
    const pList: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      isTreated: boolean;
      jitter: number;
    }> = [];

    // Initialize sand particles half untreated (left) and half treated (right)
    for (let i = 0; i < pCount; i++) {
      const isTreated = i >= pCount / 2;
      const diameterMultiplier = params.sand_diameter * 1000; // scaling 
      const grainSize = Math.max(1.5, diameterMultiplier * 15 + Math.random() * 1.5);

      pList.push({
        x: (isTreated ? canvas.width / 2 : 0) + Math.random() * (canvas.width / 2 - 20) + 10,
        y: canvas.height - 15 - Math.random() * 12,
        vx: 0,
        vy: 0,
        size: grainSize,
        isTreated,
        jitter: Math.random() * Math.PI * 2
      });
    }

    const renderLoop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      clockTicks += 0.04;

      // Dark vs Light Canvas frames
      ctx.fillStyle = isLightMode ? '#fafafa' : '#030712';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Wireframe technical graph helper lines
      ctx.strokeStyle = isLightMode ? 'rgba(203, 213, 225, 0.45)' : 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 0.8;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Wind Flow Vectors
      const activeSpeedPercent = currentFreestreamWind / 50.0;
      ctx.strokeStyle = isLightMode 
        ? `rgba(79, 70, 229, ${0.08 + activeSpeedPercent * 0.45})` 
        : `rgba(129, 140, 248, ${0.05 + activeSpeedPercent * 0.35})`;
      ctx.lineWidth = Math.max(0.5, 0.5 + activeSpeedPercent * 4.5);

      const flowRows = 5;
      for (let r = 0; r < flowRows; r++) {
        const rowY = 35 + r * 30;
        const offset = (clockTicks * currentFreestreamWind * 110) % canvas.width;
        ctx.beginPath();
        ctx.moveTo(0, rowY);
        for (let x = 0; x < canvas.width; x += 30) {
          const curveY = rowY + Math.sin((x / 40) + clockTicks * 4.5 + r) * (currentFreestreamWind * 0.45);
          ctx.lineTo(x, curveY);
        }
        ctx.stroke();
      }

      // Middle Boundary partition
      ctx.strokeStyle = isLightMode ? '#e2e8f0' : '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(canvas.width / 2, 0); ctx.lineTo(canvas.width / 2, canvas.height); ctx.stroke();

      // Side Labels in simulation grid
      ctx.font = 'bold 9px "JetBrains Mono", Courier, monospace';
      ctx.fillStyle = '#ef4444';
      ctx.fillText('UNTREATED COHESIONLESS SAND', 15, 20);
      ctx.fillStyle = isLightMode ? '#047857' : '#10b981';
      ctx.fillText(`iGEM γ-PGA COPIED CRUST (${crustThickness.toFixed(0)}mm)`, canvas.width / 2 + 15, 20);

      // Particle physics models
      pList.forEach(p => {
        const matchingThreshold = p.isTreated ? physicsResult.uInf_t : physicsResult.uInf_t0;
        const liftTriggered = currentFreestreamWind > matchingThreshold;

        if (liftTriggered) {
          // Erosion active and saltating
          p.vx += (currentFreestreamWind - matchingThreshold) * (0.012 + Math.random() * 0.05);
          if (p.y >= canvas.height - 15) {
            p.vy = -Math.random() * (currentFreestreamWind * 1.6);
          }
          p.vy += 0.35; // simulated gravity pull
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.95; // air drag
        } else {
          // Stable resting block
          p.vx *= 0.7;
          if (p.y < canvas.height - 15) {
            p.y += 1.5;
          } else {
            p.y = canvas.height - 15;
            p.vy = 0;
          }

          // Ambient micro-shivering
          if (currentFreestreamWind > 2) {
            p.x += Math.sin(clockTicks * 8 + p.jitter) * (currentFreestreamWind * 0.06);
          }
        }

        // Keep inside bounds
        if (p.y >= canvas.height - 15) {
          p.y = canvas.height - 15;
          p.vy = -p.vy * 0.3; // rebound
        }

        const leftMargin = p.isTreated ? canvas.width / 2 : 0;
        const rightMargin = p.isTreated ? canvas.width : canvas.width / 2;

        if (p.x > rightMargin) {
          p.x = leftMargin - 4;
          p.y = canvas.height - 15 - Math.random() * 5;
          p.vx = 0.5 + Math.random() * 1.5;
          p.vy = 0;
        }

        // Draw particle node
        const radius = Math.max(1.0, p.size);
        const gradientRef = ctx.createRadialGradient(
          p.x - radius * 0.25, p.y - radius * 0.25, radius * 0.1,
          p.x, p.y, radius
        );

        if (p.isTreated) {
          if (physicsResult.isShattered) {
            // Shattered state sand is brown/crumbled
            gradientRef.addColorStop(0, '#f97316');
            gradientRef.addColorStop(1, '#7c2d12');
          } else {
            // Bio-coated emerald grains
            gradientRef.addColorStop(0, '#a7f3d0');
            gradientRef.addColorStop(0.35, '#10b981');
            gradientRef.addColorStop(1, '#064e3b');
          }
        } else {
          // Dry sandy gold grains
          gradientRef.addColorStop(0, '#fef08a');
          gradientRef.addColorStop(0.4, '#f59e0b');
          gradientRef.addColorStop(1, '#78350f');
        }

        ctx.fillStyle = gradientRef;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = p.isTreated 
          ? (physicsResult.isShattered ? 'rgba(124, 45, 18, 0.4)' : 'rgba(16, 185, 129, 0.4)') 
          : 'rgba(217, 119, 6, 0.25)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });

      // Gel Mesh linking chains showing crust stability
      if (!physicsResult.isShattered && activeGs > 800) {
        ctx.strokeStyle = isLightMode 
          ? `rgba(5, 150, 105, ${Math.min(0.7, activeGs * 0.00003)})` 
          : `rgba(16, 185, 129, ${Math.min(0.75, activeGs * 0.000035)})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        const halfStart = Math.floor(pList.length / 2);
        for (let j = 0; j < pList.length / 2 - 1; j++) {
          const p1 = pList[halfStart + j];
          const p2 = pList[halfStart + j + 1];
          if (p1 && p2 && p1.y > canvas.height - 25 && p2.y > canvas.height - 25) {
            const distance = Math.hypot(p1.x - p2.x, p1.y - p2.y);
            if (distance < 38) {
              ctx.moveTo(p1.x, p1.y);
              ctx.quadraticCurveTo((p1.x + p2.x) / 2, (p1.y + p2.y) / 2 + 4, p2.x, p2.y);
            }
          }
        }
        ctx.stroke();
      }

      animId = requestAnimationFrame(renderLoop);
    };

    renderLoop();
    return () => cancelAnimationFrame(animId);
  }, [params.sand_diameter, currentFreestreamWind, physicsResult, activeGs, crustThickness, isLightMode]);

  return (
    <div className={`space-y-8`} id="aeolian-simulation-root">
      
      {/* 1. SECTION BADGE HEADER */}
      <div className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
        isLightMode 
          ? 'bg-gradient-to-r from-indigo-50/50 to-emerald-50/40 border-indigo-100 shadow-sm' 
          : 'bg-gradient-to-r from-indigo-950/20 to-emerald-950/20 border-slate-900 shadow-md'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl text-white">
            <Wind className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] tracking-widest uppercase font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/85 text-indigo-850 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/60">
                AEOLIAN STRESS CHAMBER
              </span>
              <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-500" /> Active Physics Core
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
              Aeolian Geotechnical Wind Tunnel Chamber
            </h2>
          </div>
        </div>

        {/* Global Connection Badge */}
        <div className="flex items-center gap-2">
          <div className={`text-xs px-3.5 py-1.5 rounded-xl font-mono flex items-center gap-2 border font-bold ${
            isLinked 
              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-450 border-emerald-200 dark:border-emerald-800/40' 
              : 'bg-amber-50 dark:bg-amber-950/30 text-amber-805 dark:text-amber-440 border-amber-200 dark:border-amber-800/40'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isLinked ? 'bg-emerald-500' : 'bg-amber-500'} animate-ping`} />
            <span>MODEL LINKING: {isLinked ? "LINKED INTRINSICALLY" : "MANUAL SEPARATE VALUES"}</span>
          </div>
        </div>
      </div>

      {/* 2. DUAL LAYOUT CHASSIS: SLIDERS & DIAGNOSTIC DETAILS (12 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* INPUT HARDWARE SLIDERS PANEL (5 Cols) */}
        <div className={`lg:col-span-5 p-6 rounded-2xl border flex flex-col justify-between space-y-6 ${
          isLightMode 
            ? 'bg-white text-slate-900 border-slate-205 shadow-sm' 
            : 'bg-[#040813] text-slate-100 border-slate-850 shadow-xl'
        }`}>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1.5 h-6 rounded bg-indigo-500" />
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-mono">
                Boundary Configuration Presets
              </h3>
            </div>

            <div className="space-y-6">
              
              {/* SLIDER 1: WIND SPEED */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-650 dark:text-slate-400 font-bold flex items-center gap-1">
                    <Wind className="w-3.5 h-3.5 text-indigo-500" /> Simulated Wind Speed:
                  </span>
                  <span className="text-indigo-700 dark:text-indigo-400 font-extrabold text-sm font-sans">
                    {currentFreestreamWind} m/s
                  </span>
                </div>
                <input 
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  value={currentFreestreamWind}
                  onChange={(e) => handleWindSpeedChange(parseInt(e.target.value))}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-100 dark:bg-slate-800 accent-indigo-600"
                  id="aeolian-slider-wind"
                />
                <div className="flex justify-between text-[10px] text-slate-450 dark:text-slate-550 font-mono">
                  <span>Fresh Gale (5 m/s)</span>
                  <span>Hurricane (50 m/s)</span>
                </div>
              </div>

              {/* SLIDER 2: CRUST RESISTANCE THICKNESS */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-650 dark:text-slate-400 font-bold flex items-center gap-1 animate-pulse">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Bio-Crust Thickness:
                  </span>
                  <span className="text-emerald-700 dark:text-emerald-450 font-extrabold text-sm font-sans">
                    {crustThickness.toFixed(1)} mm
                  </span>
                </div>
                <input 
                  type="range"
                  min="1.0"
                  max="25.0"
                  step="0.5"
                  value={crustThickness}
                  onChange={(e) => setCrustThickness(parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-100 dark:bg-slate-800 accent-emerald-500"
                  id="aeolian-slider-thickness"
                />
                <div className="flex justify-between text-[10px] text-slate-450 dark:text-slate-550 font-mono">
                  <span>Micro Spray Coating (1.0 mm)</span>
                  <span>Dense Gel Shield (25.0 mm)</span>
                </div>
              </div>

              {/* SLIDER 3: POLYMER SHEAR MODULUS */}
              <div className="space-y-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-650 dark:text-slate-400 font-bold flex items-center gap-1.5">
                    <Link2 className={`w-3.5 h-3.5 ${isLinked ? 'text-emerald-500 animate-spin' : 'text-slate-400'}`} />
                    Polymer Shear Modulus (Gs):
                  </span>
                  <span className={`${
                    isLinked ? 'text-emerald-700 dark:text-emerald-450' : 'text-amber-700 dark:text-amber-400'
                  } font-extrabold text-sm font-sans`}>
                    {activeGs.toFixed(0)} Pa
                  </span>
                </div>

                {isLinked ? (
                  <div className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between ${
                    isLightMode 
                      ? 'bg-emerald-50/50 text-emerald-800 border-emerald-100' 
                      : 'bg-emerald-950/15 text-emerald-400 border-emerald-900/35'
                  }`}>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-555 dark:text-slate-500 font-bold block">INTRINSIC BIOPHYSICS LINK ACTIVE</span>
                      <span className="text-[11px]">Synced with Crosslinked Protein Scaffold state.</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setIsLinked(false)}
                      className="px-2.5 py-1 text-[10.5px] rounded border border-emerald-300 dark:border-emerald-800 font-bold text-center hover:bg-emerald-500/20"
                    >
                      Unlink
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <input 
                      type="range"
                      min="100"
                      max="15000"
                      step="100"
                      value={localShearModulus}
                      onChange={(e) => setLocalShearModulus(parseInt(e.target.value))}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-100 dark:bg-slate-800 accent-amber-500"
                      id="aeolian-slider-modulus"
                    />
                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-455 dark:text-slate-555">
                      <span>Loose (100 Pa)</span>
                      <button 
                        type="button" 
                        onClick={() => setIsLinked(true)}
                        className="text-emerald-700 dark:text-emerald-450 hover:underline font-bold"
                      >
                        🔗 Re-link to App Modulus
                      </button>
                      <span>Compact (15000 Pa)</span>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* DIAGNOSTIC FORMULA LABELS OVERVIEW */}
          <div className={`p-4 rounded-xl border font-mono text-xs space-y-2.5 ${
            isLightMode 
              ? 'bg-slate-50 border-slate-150 text-slate-800' 
              : 'bg-slate-950 border-slate-900 text-slate-300'
          }`}>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-900 pb-1 flex justify-between items-center">
              <span>AEROLIAN SHEAR PROFILE</span>
              <span className="text-[9.5px] bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded text-indigo-500">MATH SOLVED</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Untreated Lift (u_t0):</span>
              <span className="font-bold text-slate-800 dark:text-white">{physicsResult.uInf_t0.toFixed(1)} m/s (freestream)</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Biodegradable Threshold (u_t):</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{physicsResult.uInf_t.toFixed(1)} m/s (freestream)</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Applied Wind Shear Force:</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{physicsResult.appliedShearStress.toFixed(3)} Pa</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Cohesive Shatter Resist Limit:</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">{physicsResult.shatterStressLimit.toFixed(3)} Pa</span>
            </div>
            
            {/* PHYSICAL SHATTER ALERTS */}
            {physicsResult.isShattered && (
              <div className="p-2.5 rounded bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20 text-[10.5px] leading-relaxed flex items-start gap-1.5">
                <Flame className="w-4 h-4 text-red-500 shrink-0 mt-0.5 animate-bounce" />
                <span>
                  <strong>ALERT: INSTANT FAILURE.</strong> Wind-tunnel shear forcing exceeds maximum cohesion structure strength of the {crustThickness}mm bio-crust shell.
                </span>
              </div>
            )}
          </div>

        </div>

        {/* REVOLUTIONARY DIVERSE WORKSPACE CHIP: CHART + SIMULATOR (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-6">
          
          {/* THE CHART VIEWPORTS */}
          <div className={`p-6 rounded-2xl border flex flex-col justify-between min-h-[340px] ${
            isLightMode 
              ? 'bg-white text-slate-900 border-slate-205 shadow-sm' 
              : 'bg-[#040813] text-slate-100 border-slate-850 shadow-xl'
          }`}>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-150 dark:border-slate-900 pb-3 mb-4">
              <div>
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Interactive Cumulative Erosion Tracker (0% - 100%)
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Plots micro scale grain dislodgements over a simulated 15.0 second storm force.
                </p>
              </div>

              {/* TEST TRIGGER BUTTON */}
              <button
                type="button"
                onClick={startLiveWindTunnelTest}
                className={`py-2 px-5 rounded-xl text-xs uppercase font-mono font-bold tracking-wider flex items-center justify-center gap-1.5 shadow transition-all duration-300 ${
                  isLiveTesting 
                    ? 'bg-red-650 hover:bg-red-550 text-white' 
                    : 'bg-indigo-650 hover:bg-indigo-550 text-white'
                }`}
                id="btn-trigger-aeolian-live-test"
              >
                <Zap className={`w-3.5 h-3.5 ${isLiveTesting ? 'animate-spin' : ''}`} />
                {isLiveTesting ? `STOP TEST: ${liveTestTime.toFixed(1)}s` : "Initiate Wind Tunnel Test"}
              </button>
            </div>

            {/* HIGH FIDELITY GRAPH CANVAS SVG */}
            <div className="h-44 w-full relative bg-[#010204] border border-slate-850 rounded-xl p-3 flex flex-col justify-between">
              
              {/* Plot Info Title Indicators */}
              <div className="flex justify-center gap-4 text-[9px] font-mono z-15 select-none text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-0.5 bg-amber-500 inline-block" /> Control Group (Untreated Sand)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-0.5 bg-emerald-505 inline-block" /> Bio-Crusted Group (NYUAD Tested)
                </span>
              </div>

              <div className="flex-1 min-h-[110px] w-full relative mt-1">
                {liveControlErosion.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-xs text-slate-500 font-mono gap-1 text-center select-none bg-slate-950/70 p-4 rounded border border-slate-900">
                    <Wind className="w-6 h-6 text-slate-700 animate-pulse" />
                    <span>WIND CHAMBER CALIBRATED</span>
                    <span className="text-[10px] text-slate-600">Press &quot;Initiate Wind Tunnel Test&quot; above to trace live soil failure curves.</span>
                  </div>
                ) : (
                  <svg viewBox="0 0 500 100" width="100%" height="100%" className="overflow-visible select-none">
                    
                    {/* Grid vectors */}
                    <line x1="0" y1="90" x2="500" y2="90" stroke="#1e293b" strokeWidth="0.8" />
                    <line x1="0" y1="10" x2="500" y2="10" stroke="#1e293b" strokeWidth="0.7" strokeDasharray="3,3" />
                    <line x1="0" y1="50" x2="500" y2="50" stroke="#1e293b" strokeWidth="0.7" strokeDasharray="3,3" />

                    {[125, 250, 375].map((gridX, gi) => (
                      <line key={gi} x1={gridX} y1="0" x2={gridX} y2="100" stroke="#1e1b4b" strokeWidth="0.8" strokeDasharray="2,2" />
                    ))}

                    {/* Left side axis values */}
                    <text x="-5" y="15" fill="#475569" fontSize="8" fontFamily="monospace" textAnchor="end">100%</text>
                    <text x="-5" y="55" fill="#475569" fontSize="8" fontFamily="monospace" textAnchor="end">50%</text>
                    <text x="-5" y="93" fill="#475569" fontSize="8" fontFamily="monospace" textAnchor="end">0%</text>

                    {/* CONTROL LAYER PLOTTED CURVE (BROWN/AMBER LINE) */}
                    {liveControlErosion.length > 1 && (
                      <path 
                        d={`M 0 90 ${liveControlErosion.map(pt => `L ${(pt.x / 15.0) * 500} ${90 - (pt.y / 100) * 80}`).join(' ')}`}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    )}

                    {/* TREATED LAYER PLOTTED CURVE (EMERALD GREEN LINE) */}
                    {liveTreatedErosion.length > 1 && (
                      <path 
                        d={`M 0 90 ${liveTreatedErosion.map(pt => `L ${(pt.x / 15.0) * 500} ${90 - (pt.y / 100) * 80}`).join(' ')}`}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    )}

                    {/* Current sweeping test timeline cursor ticker */}
                    <line 
                      x1={(liveTestTime / 15.0) * 500} 
                      y1="0" 
                      x2={(liveTestTime / 15.0) * 500} 
                      y2="90" 
                      stroke="#4f46e5" 
                      strokeWidth="1.5" 
                      strokeDasharray="1,1"
                    />

                  </svg>
                )}
              </div>

              {/* Chart floor axes numbers */}
              <div className="flex justify-between items-center text-[8px] font-mono text-slate-550 px-1 mt-1 border-t border-slate-900 pt-1">
                <span>0.0s (Start Gale)</span>
                <span>3.7s</span>
                <span>7.5s (Middle Storm)</span>
                <span>11.2s</span>
                <span>15.0s (Storm Cutoff)</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-[10.5px] font-mono mt-3 text-slate-500">
              <span className="flex items-center gap-0.5"><Clock className="w-3.5 h-3.5 text-indigo-500" /> Live Clock ticker</span>
              <span>Duration: 15.0 Continuous Secs</span>
            </div>

          </div>

          {/* SIMULATION PARTICLE BOX VIEWPORT (The virtual 2D visualizer) */}
          <div className={`p-4 rounded-xl border flex flex-col gap-2 shadow-inner overflow-hidden ${
            isLightMode ? 'bg-[#f8fafc] border-slate-200' : 'bg-[#02050b] border-slate-900'
          }`}>
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-[#10b981]" /> Particle Boundary Aerodynamics Viewport
              </span>
              <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-bold font-mono">
                u_friction = {params.wind_velocity.toFixed(3)} m/s
              </span>
            </div>

            {/* Canvas Block */}
            <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-850">
              <canvas 
                ref={particleCanvasRef}
                width={520}
                height={160}
                className="w-full display-block max-h-[160px]"
              />
            </div>
          </div>

        </div>

      </div>

      {/* 3. COHESIVE RESULTS & WET LAB TRANSLATION (5 STAGE OUTLINE SCORECARD AT THE BOTTOM) */}
      <div className={`p-6 rounded-2xl border ${
        isLightMode 
          ? 'bg-gradient-to-br from-white to-indigo-50/20 border-indigo-150/80 shadow-lg' 
          : 'bg-gradient-to-br from-slate-950 to-slate-950/80 border-slate-850 shadow-2xl'
      }`}>
        
        {/* SCORECARD TAPE DECORATION */}
        <div className="flex items-center gap-4 border-b border-indigo-100 dark:border-slate-900 pb-5 mb-5 justify-between flex-wrap">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500 text-white font-mono text-[9px] font-extrabold tracking-widest animate-pulse">
              FINAL REPORT
            </span>
            <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-widest font-mono">
              Structural Telemetry &amp; Wet Lab Protocols
            </h3>
          </div>
          
          <div className="text-[11px] text-slate-550 dark:text-slate-400 font-mono">
            Synced Local Calculations Core • <span className="text-emerald-500 font-bold">SUCCESSFUL CASCADE</span>
          </div>
        </div>

        {/* THREE COLUMNS GRID BENTO STRUCTURE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* PANEL A: SIMULATION CRUST STOPWATCH DIGITAL TIMERS */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between ${
            isLightMode ? 'bg-[#f4f7fa] border-slate-205' : 'bg-[#030610] border-slate-900'
          }`}>
            <div className="space-y-1">
              <span className="text-[9.5px] uppercase font-mono font-black tracking-wider text-indigo-700 dark:text-indigo-400 block mb-1">
                🏆 Panel A // Durability Stopwatch
              </span>
              <p className="text-[10px] text-slate-500 leading-normal mb-3">
                Stopwatch records exact simulated failure points at complete cumulative mass dislodgement.
              </p>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-850 font-mono">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Control Sand Time:</span>
                <span className="text-xs text-amber-600 font-extrabold">
                  {stopwatchMetrics.controlFailSec === 15.0 
                    ? "UNFAILING (15s)" 
                    : `${stopwatchMetrics.controlFailSec.toFixed(2)}s`}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-xs text-slate-550 dark:text-slate-450 font-bold">Bio-Treated Time:</span>
                <span className={`text-xs font-black px-2 py-0.5 rounded ${
                  physicsResult.isShattered 
                    ? 'text-red-650 bg-red-100 dark:bg-red-950/20 dark:text-red-400' 
                    : stopwatchMetrics.treatedFailSec > 15 
                      ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400' 
                      : 'text-amber-700 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400'
                }`}>
                  {physicsResult.isShattered 
                    ? "SHATTERED INSTANTLY" 
                    : stopwatchMetrics.treatedFailSec === 999.0 
                      ? "STABLE / IMMUNE (∞)" 
                      : `${stopwatchMetrics.treatedFailSec.toFixed(2)}s`}
                </span>
              </div>

              <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-850 flex justify-between items-center">
                <span className="text-[10.5px] text-slate-500 font-bold">Lifespan Extension:</span>
                <span className="text-sm font-black text-indigo-700 dark:text-indigo-400">
                  {physicsResult.isShattered 
                    ? "1.0x (Crust crack)" 
                    : stopwatchMetrics.lifespanMultiplier === Infinity 
                      ? "STABLE SECURED (∞)" 
                      : `${stopwatchMetrics.lifespanMultiplier.toFixed(1)}x longer`}
                </span>
              </div>
            </div>
          </div>

          {/* PANEL B: WET LAB OPERATIONAL BLUEPRINT TRANSLATION */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between ${
            isLightMode ? 'bg-[#f4f7fa] border-slate-205' : 'bg-[#030610] border-slate-900'
          }`}>
            <div className="space-y-1">
              <span className="text-[9.5px] uppercase font-mono font-black tracking-wider text-emerald-700 dark:text-emerald-400 block mb-1">
                Panel B // Wet Lab Directives
              </span>
              <p className="text-[10px] text-slate-500 leading-normal mb-3">
                Translates physical boundary model limits into precise laboratory execution instructions.
              </p>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-slate-850 font-mono text-xs">
              
              <div className="flex justify-between">
                <span className="text-slate-550 dark:text-slate-450">Cultivation Period:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {Math.max(16, Math.min(72, (18000 / activeGs) * 2.5)).toFixed(1)} hrs
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-550 dark:text-slate-450">Required Spray Density:</span>
                <span className="font-extrabold text-[#10b981]">
                  {(250.0 + (crustThickness * 14.5)).toFixed(0)} mL/m²
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-550 dark:text-slate-450">Wind Survival Rating:</span>
                <span className={`font-extrabold uppercase ${
                  physicsResult.isShattered 
                    ? 'text-red-500' 
                    : stopwatchMetrics.lifespanMultiplier > 15 
                      ? 'text-emerald-600' 
                      : 'text-amber-500'
                }`}>
                  {physicsResult.isShattered 
                    ? "CRITICAL SHATTER" 
                    : currentFreestreamWind > physicsResult.uInf_t 
                      ? "MICRO-EROSION ACTIVE" 
                      : "SECURED IMMUNITY"}
                </span>
              </div>

            </div>
          </div>

          {/* PANEL C: MACRO ECONOMICS FORECASTS */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between ${
            isLightMode ? 'bg-[#f4f7fa] border-slate-205' : 'bg-[#030610] border-slate-900'
          }`}>
            <div className="space-y-1">
              <span className="text-[9.5px] uppercase font-mono font-black tracking-wider text-indigo-700 dark:text-indigo-400 block mb-1">
                💰 Panel C // Field Economics
              </span>
              <p className="text-[10px] text-slate-500 leading-normal mb-3">
                Calculates macro project deployment volume estimates and costs mapped to a single standard hectare.
              </p>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-slate-850 font-mono text-xs">
              
              <div className="flex justify-between">
                <span className="text-slate-550 dark:text-slate-450">Volume Required / Ha:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {((250.0 + (crustThickness * 14.5)) * 10).toLocaleString(undefined, { maximumFractionDigits: 0 })} L
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-550 dark:text-slate-450">PGA Cost Multiplier:</span>
                <span className="font-extrabold text-blue-500">
                  ${(0.12 * (activeGs / 3000.0) + 0.04).toFixed(3)} per Liter
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-550 dark:text-slate-450">Est. Cost / Hectare:</span>
                <span className="font-extrabold text-indigo-650 dark:text-indigo-400">
                  ${(((250.0 + (crustThickness * 14.5)) * 10) * (0.12 * (activeGs / 3000.0) + 0.04)).toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
                </span>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
