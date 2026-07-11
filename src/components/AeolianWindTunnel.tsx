import React, { useState, useMemo, useEffect, useRef } from "react";
import { AeolianParams } from "../types";
import {
  Wind,
  ShieldCheck,
  Zap,
  Link2,
  Gauge,
  Clock,
  Flame,
  Coins,
} from "lucide-react";
import {
  PHYS,
  AEOLIAN_CALIB,
  cval,
  uStarToFreestream,
  freestreamToUStar,
  cohesionFromShearModulus,
} from "../lib/physics";
import { ModuleActions } from "./simulation/_shared";

interface AeolianProps {
  params: AeolianParams;
  setParams: React.Dispatch<React.SetStateAction<AeolianParams>>;
  shearModulus: number;
  isLinked: boolean;
  setIsLinked: (val: boolean) => void;
  isLightMode: boolean;
  /** When provided (multi-prong combinations), overrides the internal cohesion with the
   * composite interparticle cohesion γ [N/m] computed across all active prongs. */
  externalCohesion?: number;
  /** Active prongs, so the crust is labelled by whatever binder(s) actually formed it. */
  activeProngs?: (1 | 2 | 3)[];
}

export default function AeolianWindTunnel({
  params,
  setParams,
  shearModulus,
  isLinked,
  setIsLinked,
  isLightMode,
  externalCohesion,
  activeProngs = [1],
}: AeolianProps) {
  // Every prong forms a wind-resistant crust, γ-PGA/alginate via shear modulus, CaCO₃ via UCS, // so this tunnel applies to ANY combination; label the crust by whatever binder(s) formed it.
  const crustLabel = (() => {
    const parts: string[] = [];
    if (activeProngs.includes(1)) parts.push("γ-PGA");
    if (activeProngs.includes(2)) parts.push("CaCO₃");
    if (activeProngs.includes(3)) parts.push("alginate");
    return parts.length ? parts.join(" + ") : "engineered";
  })();

  // Prong-specific crust palette + short label, the treated grains and the biocrust legend are
  // coloured by whichever binder(s) actually formed the crust (γ-PGA gel, CaCO₃ cement, alginate coat).
  const PRONG_CRUST: Record<
    1 | 2 | 3,
    { hi: string; mid: string; lo: string; name: string }
  > = {
    1: { hi: "#fcd34d", mid: "#f59e0b", lo: "#b45309", name: "γ-PGA gel" },
    2: { hi: "#a7f3d0", mid: "#c28a7c", lo: "#065f46", name: "CaCO₃ cement" },
    3: { hi: "#fecdd3", mid: "#fb7185", lo: "#9f1239", name: "alginate coat" },
  };
  const activeBinders = ([1, 2, 3] as const).filter((p) =>
    activeProngs.includes(p),
  );
  const primaryBinder = activeBinders[0] ?? 2; // treated grains take the first active binder's colour
  const prongKey = activeBinders.join("-");
  // --- Upgraded State Parameters ---
  const [crustThickness, setCrustThickness] = useState<number>(12.0); // mm (1.0 to 25.0 mm)
  const [localShearModulus, setLocalShearModulus] = useState<number>(3100); // Pa (used when unlinked)
  const [isLiveTesting, setIsLiveTesting] = useState<boolean>(false);
  const [liveTestTime, setLiveTestTime] = useState<number>(0.0); // 0.0s to 15.0s

  // Real-time chart coordinate points populated during the live test
  const [liveControlErosion, setLiveControlErosion] = useState<
    { x: number; y: number }[]
  >([]);
  const [liveTreatedErosion, setLiveTreatedErosion] = useState<
    { x: number; y: number }[]
  >([]);

  // Simulation timer ref
  const liveTestTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Active shear modulus to use in calculations
  const activeGs = isLinked ? Math.max(100, shearModulus) : localShearModulus;

  // Bagnold threshold + saltation constants, pulled from the physics core so this tunnel
  // and the workspace headline stats never disagree.
  const A = cval(AEOLIAN_CALIB.A); // empirical dimensionless constant
  const rho_s = PHYS.RHO_SAND; // sand density (kg/m³)
  const rho_a = PHYS.RHO_AIR; // air density (kg/m³)
  const g = PHYS.g; // gravity (m/s²)

  // Freestream U∞ ↔ friction velocity u* via the log-law surface coupling (AEOLIAN_CALIB.uStarRatio).
  const uStarToUinf = (uStar: number) => uStarToFreestream(uStar);
  const uInfToUStar = (uInf: number) => freestreamToUStar(uInf);

  const currentFreestreamWind = useMemo(() => {
    return Number(uStarToUinf(params.wind_velocity).toFixed(1));
  }, [params.wind_velocity]);

  // Adjust wind speed
  const handleWindSpeedChange = (velocityMps: number) => {
    const targetUStar = uInfToUStar(velocityMps);
    setParams((p) => ({
      ...p,
      wind_velocity: targetUStar,
    }));
  };

  // Bio-cohesion factor. When a composite cohesion is supplied (multi-prong combinations),
  // it overrides the single-prong shear-modulus estimate.
  const effectiveCohesion = useMemo(() => {
    if (externalCohesion !== undefined) return externalCohesion;
    return isLinked
      ? Math.min(0.009, cohesionFromShearModulus(activeGs))
      : params.biofilm_cohesion;
  }, [externalCohesion, isLinked, activeGs, params.biofilm_cohesion]);

  // Physics Solvers
  const physicsResult = useMemo(() => {
    // 1. Untreated Threshold Velocity (friction limit)
    const term1_untreated =
      ((rho_s - rho_a) / rho_a) * g * params.sand_diameter;
    const u_star_t0 = A * Math.sqrt(term1_untreated);
    const uInf_t0 = uStarToUinf(u_star_t0);

    // 2. Treated Cohesion-Enhanced Threshold Velocity
    const term2_treated = effectiveCohesion / (rho_a * params.sand_diameter);
    const u_star_t = A * Math.sqrt(term1_untreated + term2_treated);
    const uInf_t = uStarToUinf(u_star_t);

    // Applied Shear Stress (Pascals) exerted by current wind speed
    const appliedShearStress = rho_a * Math.pow(params.wind_velocity, 2);

    // Critical stress threshold for instantaneous crust structural shattering
    const shatterStressLimit =
      activeGs * cval(AEOLIAN_CALIB.shatterPerThickness) * crustThickness;
    const isShattered =
      appliedShearStress > shatterStressLimit && currentFreestreamWind > 5;

    return {
      u_star_t0,
      u_star_t,
      uInf_t0,
      uInf_t,
      appliedShearStress,
      shatterStressLimit,
      isShattered,
    };
  }, [
    params.sand_diameter,
    params.wind_velocity,
    effectiveCohesion,
    activeGs,
    crustThickness,
    currentFreestreamWind,
  ]);

  // Stopwatch Metrics calculated for entire storm duration
  const stopwatchMetrics = useMemo(() => {
    const uInf = currentFreestreamWind;
    const ut0 = physicsResult.uInf_t0;
    const ut = physicsResult.uInf_t;

    let t_fail_control = 15.0;
    if (uInf > ut0) {
      t_fail_control = Math.max(1.2, 10.0 / Math.pow(uInf - ut0 + 1.2, 0.45));
    } else {
      t_fail_control = 15.0;
    }

    let t_fail_treated = 15.0;
    if (physicsResult.isShattered) {
      t_fail_treated = t_fail_control * 1.05;
    } else if (uInf > ut) {
      const safetyScale =
        1.0 + (activeGs * crustThickness) / (180.0 * Math.max(1.0, uInf - ut));
      t_fail_treated = Math.min(180, t_fail_control * safetyScale);
    } else {
      t_fail_treated = 999.0;
    }

    const lifespanMultiplier =
      t_fail_treated === 999.0 ? Infinity : t_fail_treated / t_fail_control;

    return {
      controlFailSec: t_fail_control,
      treatedFailSec: t_fail_treated,
      lifespanMultiplier,
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
        controlPercent = Math.min(
          100,
          Math.pow(currentTime / controlFailSec, 1.35) * 100,
        );
      }
      setLiveControlErosion((prev) => [
        ...prev,
        { x: currentTime, y: controlPercent },
      ]);

      // Plot Treated erosion curves
      let treatedPercent = 0;
      if (physicsResult.isShattered) {
        treatedPercent = Math.min(
          100,
          Math.pow(currentTime / (controlFailSec * 1.05), 1.35) * 100,
        );
      } else if (currentFreestreamWind > physicsResult.uInf_t) {
        treatedPercent = Math.min(
          100,
          Math.pow(currentTime / treatedFailSec, 2.0) * 100,
        );
      }
      setLiveTreatedErosion((prev) => [
        ...prev,
        { x: currentTime, y: treatedPercent },
      ]);
    }, 45);
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
    // Idempotent: when there is nothing to reset (idle, no live-test data) every setter bails, so
    // this effect adds NO re-render. That matters because it fires on activeGs, which shifts as the
    // upstream modules settle, and an unconditional reset here would amplify the settle cascade
    // past React's update-depth guard.
    setIsLiveTesting((v) => (v ? false : v));
    setLiveTestTime((v) => (v !== 0 ? 0 : v));
    setLiveControlErosion((prev) => (prev.length ? [] : prev));
    setLiveTreatedErosion((prev) => (prev.length ? [] : prev));
  };

  // Particle Canvas simulation rendering loop logic
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportWrapRef = useRef<HTMLDivElement | null>(null);

  // Live values the animation reads each frame, lets the canvas set up ONCE (no teardown on every
  // slider tick) and stay perfectly sized to its container (fixing the old stretched look).
  const drawRef = useRef({
    wind: currentFreestreamWind,
    uInf_t: physicsResult.uInf_t,
    uInf_t0: physicsResult.uInf_t0,
    isShattered: physicsResult.isShattered,
    activeGs,
    crustThickness,
    isLightMode,
    crustLabel,
    sandDiameter: params.sand_diameter,
    crust: PRONG_CRUST[primaryBinder],
  });
  drawRef.current = {
    wind: currentFreestreamWind,
    uInf_t: physicsResult.uInf_t,
    uInf_t0: physicsResult.uInf_t0,
    isShattered: physicsResult.isShattered,
    activeGs,
    crustThickness,
    isLightMode,
    crustLabel,
    sandDiameter: params.sand_diameter,
    crust: PRONG_CRUST[primaryBinder],
  };

  useEffect(() => {
    const canvas = particleCanvasRef.current;
    const wrap = viewportWrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const CSS_H = 200; // displayed height in CSS px
    let W = 0,
      H = 0,
      dpr = 1,
      floorY = 0;
    let clockTicks = 0;
    let animId = 0;

    type P = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      isTreated: boolean;
      jitter: number;
    };
    let pList: P[] = [];

    const seed = () => {
      const pCount = 110;
      pList = [];
      for (let i = 0; i < pCount; i++) {
        const isTreated = i >= pCount / 2;
        const grainSize = Math.max(
          1.6,
          drawRef.current.sandDiameter * 1000 * 15 * dpr +
            Math.random() * 1.6 * dpr,
        );
        pList.push({
          x:
            (isTreated ? W / 2 : 0) +
            Math.random() * (W / 2 - 20 * dpr) +
            10 * dpr,
          y: floorY - Math.random() * 12 * dpr,
          vx: 0,
          vy: 0,
          size: grainSize,
          isTreated,
          jitter: Math.random() * Math.PI * 2,
        });
      }
    };

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const cssW = Math.max(280, wrap.clientWidth || 520);
      W = Math.round(cssW * dpr);
      H = Math.round(CSS_H * dpr);
      floorY = H - 15 * dpr;
      canvas.width = W;
      canvas.height = H;
      canvas.style.width = "100%";
      canvas.style.height = `${CSS_H}px`;
      seed();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const renderLoop = () => {
      const d = drawRef.current;
      const s = dpr; // size scale so strokes/fonts stay crisp at any DPR
      clockTicks += 0.04;

      ctx.fillStyle = d.isLightMode ? "#f8fafc" : "#030712";
      ctx.fillRect(0, 0, W, H);

      // faint reference grid
      ctx.strokeStyle = d.isLightMode
        ? "rgba(203, 213, 225, 0.45)"
        : "rgba(30, 41, 59, 0.4)";
      ctx.lineWidth = 0.8 * s;
      for (let x = 0; x < W; x += 40 * s) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 40 * s) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // wind streamlines (density/amplitude scale with speed)
      const activeSpeedPercent = d.wind / 50.0;
      ctx.strokeStyle = d.isLightMode
        ? `rgba(79, 70, 229, ${0.08 + activeSpeedPercent * 0.45})`
        : `rgba(129, 140, 248, ${0.05 + activeSpeedPercent * 0.35})`;
      ctx.lineWidth = Math.max(0.5, 0.5 + activeSpeedPercent * 4.5) * s;
      for (let r = 0; r < 5; r++) {
        const rowY = (35 + r * 30) * s;
        ctx.beginPath();
        ctx.moveTo(0, rowY);
        for (let x = 0; x < W; x += 30 * s) {
          const curveY =
            rowY +
            Math.sin(x / (40 * s) + clockTicks * 4.5 + r) * (d.wind * 0.45 * s);
          ctx.lineTo(x, curveY);
        }
        ctx.stroke();
      }

      // centre divider
      ctx.strokeStyle = d.isLightMode ? "#f3e9db" : "#43362e";
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(W / 2, H);
      ctx.stroke();

      // side labels
      ctx.font = `bold ${9 * s}px "JetBrains Mono", Courier, monospace`;
      ctx.fillStyle = "#ef4444";
      ctx.fillText("UNTREATED SAND", 12 * s, 20 * s);
      ctx.fillStyle = d.isLightMode ? d.crust.lo : d.crust.mid;
      ctx.fillText(
        `${d.crustLabel.toUpperCase()} CRUST · ${d.crustThickness.toFixed(0)}mm`,
        W / 2 + 12 * s,
        20 * s,
      );

      pList.forEach((p) => {
        const matchingThreshold = p.isTreated ? d.uInf_t : d.uInf_t0;
        const liftTriggered = d.wind > matchingThreshold;

        if (liftTriggered) {
          p.vx +=
            (d.wind - matchingThreshold) * (0.012 + Math.random() * 0.05) * s;
          if (p.y >= floorY) p.vy = -Math.random() * (d.wind * 1.6) * s;
          p.vy += 0.35 * s;
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.95;
        } else {
          p.vx *= 0.7;
          if (p.y < floorY) p.y += 1.5 * s;
          else {
            p.y = floorY;
            p.vy = 0;
          }
          if (d.wind > 2)
            p.x += Math.sin(clockTicks * 8 + p.jitter) * (d.wind * 0.06) * s;
        }

        if (p.y >= floorY) {
          p.y = floorY;
          p.vy = -p.vy * 0.3;
        }

        const leftMargin = p.isTreated ? W / 2 : 0;
        const rightMargin = p.isTreated ? W : W / 2;
        if (p.x > rightMargin) {
          p.x = leftMargin - 4 * s;
          p.y = floorY - Math.random() * 5 * s;
          p.vx = (0.5 + Math.random() * 1.5) * s;
          p.vy = 0;
        }

        const radius = Math.max(1.0 * s, p.size);
        const grad = ctx.createRadialGradient(
          p.x - radius * 0.25,
          p.y - radius * 0.25,
          radius * 0.1,
          p.x,
          p.y,
          radius,
        );
        if (p.isTreated) {
          if (d.isShattered) {
            grad.addColorStop(0, "#f97316");
            grad.addColorStop(1, "#7c2d12");
          } else {
            grad.addColorStop(0, d.crust.hi);
            grad.addColorStop(0.35, d.crust.mid);
            grad.addColorStop(1, d.crust.lo);
          }
        } else {
          grad.addColorStop(0, "#f5deb3");
          grad.addColorStop(0.4, "#c9a267");
          grad.addColorStop(1, "#7c5a2e");
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = p.isTreated
          ? d.isShattered
            ? "rgba(124, 45, 18, 0.4)"
            : "rgba(0,0,0,0.18)"
          : "rgba(124, 90, 46, 0.3)";
        ctx.lineWidth = 0.5 * s;
        ctx.stroke();
      });

      // inter-grain cohesive bond mesh on the treated side (fades in with stiffness)
      if (!d.isShattered && d.activeGs > 800) {
        ctx.strokeStyle = d.isLightMode
          ? `rgba(5, 150, 105, ${Math.min(0.7, d.activeGs * 0.00003)})`
          : `rgba(16, 185, 129, ${Math.min(0.75, d.activeGs * 0.000035)})`;
        ctx.lineWidth = 1.6 * s;
        ctx.beginPath();
        const halfStart = Math.floor(pList.length / 2);
        for (let j = 0; j < pList.length / 2 - 1; j++) {
          const p1 = pList[halfStart + j];
          const p2 = pList[halfStart + j + 1];
          if (p1 && p2 && p1.y > floorY - 10 * s && p2.y > floorY - 10 * s) {
            const distance = Math.hypot(p1.x - p2.x, p1.y - p2.y);
            if (distance < 38 * s) {
              ctx.moveTo(p1.x, p1.y);
              ctx.quadraticCurveTo(
                (p1.x + p2.x) / 2,
                (p1.y + p2.y) / 2 + 4 * s,
                p2.x,
                p2.y,
              );
            }
          }
        }
        ctx.stroke();
      }

      animId = requestAnimationFrame(renderLoop);
    };

    renderLoop();
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
    // Set up once per binder change; all fast-changing values are read live from drawRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prongKey]);

  return (
    <div className={`space-y-8`} id="aeolian-simulation-root">
      <ModuleActions moduleId="aeolian" isLightMode={isLightMode} />

      {/* Sliders + diagnostics (12 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* INPUT HARDWARE SLIDERS PANEL (5 Cols) */}
        <div
          className={`lg:col-span-5 p-6 rounded-2xl border flex flex-col justify-between space-y-6 ${
            isLightMode
              ? "bg-white text-slate-900 border-slate-205 "
              : "bg-[#040813] text-slate-100 border-slate-850 "
          }`}
        >
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Boundary Configuration Presets
              </h3>
            </div>

            <div className="space-y-6">
              {/* SLIDER 1: WIND SPEED */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-650 dark:text-slate-400 font-bold flex items-center gap-1">
                    <Wind className="w-3.5 h-3.5 text-amber-500" /> Simulated
                    Wind Speed:
                  </span>
                  <span className="text-amber-700 dark:text-amber-400 font-extrabold text-sm font-sans">
                    {currentFreestreamWind} m/s
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  value={currentFreestreamWind}
                  onChange={(e) =>
                    handleWindSpeedChange(parseInt(e.target.value))
                  }
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-100 dark:bg-slate-800 accent-amber-600"
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
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />{" "}
                    Bio-Crust Thickness:
                  </span>
                  <span className="text-teal-700 dark:text-teal-450 font-extrabold text-sm font-sans">
                    {crustThickness.toFixed(1)} mm
                  </span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="25.0"
                  step="0.5"
                  value={crustThickness}
                  onChange={(e) =>
                    setCrustThickness(parseFloat(e.target.value))
                  }
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-100 dark:bg-slate-800 accent-teal-500"
                  id="aeolian-slider-thickness"
                />
                <div className="flex justify-between text-[10px] text-slate-450 dark:text-slate-550 font-mono">
                  <span>Micro Spray Coating (1.0 mm)</span>
                  <span>Dense Gel Shield (25.0 mm)</span>
                </div>
              </div>

              {/* SLIDER 3: CRUST STIFFNESS (G-EQUIVALENT) */}
              <div className="space-y-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-650 dark:text-slate-400 font-bold flex items-center gap-1.5">
                    <Link2
                      className={`w-3.5 h-3.5 ${isLinked ? "text-teal-500 animate-spin" : "text-slate-400"}`}
                    />
                    Crust Stiffness G-equiv ({crustLabel}):
                  </span>
                  <span
                    className={`${
                      isLinked
                        ? "text-teal-700 dark:text-teal-450"
                        : "text-amber-700 dark:text-amber-400"
                    } font-extrabold text-sm font-sans`}
                  >
                    {activeGs.toFixed(0)} Pa
                  </span>
                </div>

                {isLinked ? (
                  <div
                    className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between ${
                      isLightMode
                        ? "bg-teal-50/50 text-teal-800 border-teal-100"
                        : "bg-teal-950/15 text-teal-400 border-teal-900/35"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-555 dark:text-slate-500 font-bold block">
                        INTRINSIC BIOPHYSICS LINK ACTIVE
                      </span>
                      <span className="text-[11px]">
                        Synced with Crosslinked Protein Scaffold state.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsLinked(false)}
                      className="px-2.5 py-1 text-[10.5px] rounded border border-teal-300 dark:border-teal-800 font-bold text-center hover:bg-teal-500/20"
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
                      onChange={(e) =>
                        setLocalShearModulus(parseInt(e.target.value))
                      }
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-100 dark:bg-slate-800 accent-amber-500"
                      id="aeolian-slider-modulus"
                    />
                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-455 dark:text-slate-555">
                      <span>Loose (100 Pa)</span>
                      <button
                        type="button"
                        onClick={() => setIsLinked(true)}
                        className="text-teal-700 dark:text-teal-450 hover:underline font-bold"
                      >
                        Re-link to App Modulus
                      </button>
                      <span>Compact (15000 Pa)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* DIAGNOSTIC FORMULA LABELS OVERVIEW */}
          <div
            className={`p-4 rounded-xl border font-mono text-xs space-y-2.5 ${
              isLightMode
                ? "bg-slate-50 border-slate-200 text-slate-800"
                : "bg-slate-950 border-slate-900 text-slate-300"
            }`}
          >
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-900 pb-1 flex justify-between items-center">
              <span>AEROLIAN SHEAR PROFILE</span>
              <span className="text-[9.5px] bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded text-amber-500">
                MATH SOLVED
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Untreated Lift (u_t0):</span>
              <span className="font-bold text-slate-800 dark:text-white">
                {physicsResult.uInf_t0.toFixed(1)} m/s (freestream)
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">
                Biodegradable Threshold (u_t):
              </span>
              <span className="font-bold text-teal-600 dark:text-teal-400">
                {physicsResult.uInf_t.toFixed(1)} m/s (freestream)
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Applied Wind Shear Force:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {physicsResult.appliedShearStress.toFixed(3)} Pa
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">
                Cohesive Shatter Resist Limit:
              </span>
              <span className="font-bold text-teal-700 dark:text-teal-400">
                {physicsResult.shatterStressLimit.toFixed(3)} Pa
              </span>
            </div>

            {/* PHYSICAL SHATTER ALERTS */}
            {physicsResult.isShattered && (
              <div className="p-2.5 rounded bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20 text-[10.5px] leading-relaxed flex items-start gap-1.5">
                <Flame className="w-4 h-4 text-red-500 shrink-0 mt-0.5 animate-bounce" />
                <span>
                  <strong>ALERT: INSTANT FAILURE.</strong> Wind-tunnel shear
                  forcing exceeds maximum cohesion structure strength of the{" "}
                  {crustThickness}mm bio-crust shell.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* REVOLUTIONARY DIVERSE WORKSPACE CHIP: CHART + SIMULATOR (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-6">
          {/* THE CHART VIEWPORTS */}
          <div
            className={`p-6 rounded-2xl border flex flex-col justify-between min-h-[340px] ${
              isLightMode
                ? "bg-white text-slate-900 border-slate-200 "
                : "bg-[#040813] text-slate-100 border-slate-850 "
            }`}
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-200 dark:border-slate-900 pb-3 mb-4">
              <div>
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Erosion Over Time (% of grains lost)
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Traces how fast grains are stripped away over a simulated
                  15-second gust.
                </p>
              </div>

              {/* TEST TRIGGER BUTTON */}
              <button
                type="button"
                onClick={startLiveWindTunnelTest}
                className={`py-2 px-5 rounded-xl text-xs uppercase font-mono font-bold tracking-wider flex items-center justify-center gap-1.5 shadow transition-all duration-300 ${
                  isLiveTesting
                    ? "bg-red-650 hover:bg-red-550 text-white"
                    : "bg-amber-650 hover:bg-amber-550 text-white"
                }`}
                id="btn-trigger-aeolian-live-test"
              >
                <Zap
                  className={`w-3.5 h-3.5 ${isLiveTesting ? "animate-spin" : ""}`}
                />
                {isLiveTesting
                  ? `STOP TEST: ${liveTestTime.toFixed(1)}s`
                  : "Initiate Wind Tunnel Test"}
              </button>
            </div>

            {/* HIGH FIDELITY GRAPH CANVAS SVG - THEMED FOR LIGHT/DARK MODE */}
            <div
              className={`h-44 w-full relative border rounded-xl p-3 flex flex-col justify-between ${
                isLightMode
                  ? "bg-slate-50 border-slate-200"
                  : "bg-[#010204] border-slate-850"
              }`}
            >
              {/* Plot Info Title Indicators */}
              <div className="flex justify-center gap-4 text-[9px] font-mono z-15 select-none text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-0.5 bg-amber-500 inline-block" />{" "}
                  Control Group (Untreated Sand)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-0.5 bg-teal-500 inline-block" />{" "}
                  Bio-Crusted Group (NYUAD Tested)
                </span>
              </div>

              <div className="flex-1 min-h-[110px] w-full relative mt-1">
                {liveControlErosion.length === 0 ? (
                  <div
                    className={`absolute inset-0 flex flex-col items-center justify-center text-xs font-mono gap-1 text-center select-none p-4 rounded border ${
                      isLightMode
                        ? "bg-slate-100/70 text-slate-500 border-slate-200"
                        : "bg-slate-950/70 text-slate-500 border-slate-900"
                    }`}
                  >
                    <Wind
                      className={`w-6 h-6 animate-pulse ${isLightMode ? "text-slate-400" : "text-slate-700"}`}
                    />
                    <span>WIND CHAMBER CALIBRATED</span>
                    <span className="text-[10px] opacity-80">
                      Press &quot;Initiate Wind Tunnel Test&quot; above to trace
                      live soil failure curves.
                    </span>
                  </div>
                ) : (
                  <svg
                    viewBox="0 0 500 100"
                    width="100%"
                    height="100%"
                    className="overflow-visible select-none"
                  >
                    {/* Grid vectors */}
                    <line
                      x1="0"
                      y1="90"
                      x2="500"
                      y2="90"
                      stroke={isLightMode ? "#cbd5e1" : "#43362e"}
                      strokeWidth="0.8"
                    />
                    <line
                      x1="0"
                      y1="10"
                      x2="500"
                      y2="10"
                      stroke={isLightMode ? "#f3e9db" : "#43362e"}
                      strokeWidth="0.7"
                      strokeDasharray="3,3"
                    />
                    <line
                      x1="0"
                      y1="50"
                      x2="500"
                      y2="50"
                      stroke={isLightMode ? "#f3e9db" : "#43362e"}
                      strokeWidth="0.7"
                      strokeDasharray="3,3"
                    />

                    {[125, 250, 375].map((gridX, gi) => (
                      <line
                        key={gi}
                        x1={gridX}
                        y1="0"
                        x2={gridX}
                        y2="100"
                        stroke={isLightMode ? "#f3e9db" : "#1e1b4b"}
                        strokeWidth="0.8"
                        strokeDasharray="2,2"
                      />
                    ))}

                    {/* Left side axis values */}
                    <text
                      x="-5"
                      y="15"
                      fill={isLightMode ? "#8a7e75" : "#475569"}
                      fontSize="8"
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      100%
                    </text>
                    <text
                      x="-5"
                      y="55"
                      fill={isLightMode ? "#8a7e75" : "#475569"}
                      fontSize="8"
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      50%
                    </text>
                    <text
                      x="-5"
                      y="93"
                      fill={isLightMode ? "#8a7e75" : "#475569"}
                      fontSize="8"
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      0%
                    </text>

                    {/* CONTROL LAYER PLOTTED CURVE (BROWN/AMBER LINE) */}
                    {liveControlErosion.length > 1 && (
                      <path
                        d={`M 0 90 ${liveControlErosion.map((pt) => `L ${(pt.x / 15.0) * 500} ${90 - (pt.y / 100) * 80}`).join(" ")}`}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    )}

                    {/* TREATED LAYER PLOTTED CURVE (EMERALD GREEN LINE) */}
                    {liveTreatedErosion.length > 1 && (
                      <path
                        d={`M 0 90 ${liveTreatedErosion.map((pt) => `L ${(pt.x / 15.0) * 500} ${90 - (pt.y / 100) * 80}`).join(" ")}`}
                        fill="none"
                        stroke="#c28a7c"
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
                      stroke="#d6884a"
                      strokeWidth="1.5"
                      strokeDasharray="1,1"
                    />
                  </svg>
                )}
              </div>

              {/* Chart floor axes numbers */}
              <div className="flex justify-between items-center text-[8px] font-mono text-slate-500 px-1 mt-1 border-t border-slate-200 dark:border-slate-900 pt-1">
                <span>0.0s (Start Gale)</span>
                <span>3.7s</span>
                <span>7.5s (Middle Storm)</span>
                <span>11.2s</span>
                <span>15.0s (Storm Cutoff)</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-[10.5px] font-mono mt-3 text-slate-500">
              <span className="flex items-center gap-0.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" /> Live Clock
                ticker
              </span>
              <span>Duration: 15.0 Continuous Secs</span>
            </div>
          </div>

          {/* GRAIN-MOTION VIEWPORT (live side-by-side saltation of untreated vs bio-crusted sand) */}
          <div
            className={`p-4 rounded-xl border flex flex-col gap-2 overflow-hidden ${
              isLightMode
                ? "bg-[#f8fafc] border-slate-200"
                : "bg-[#02050b] border-slate-900"
            }`}
          >
            <div className="flex justify-between items-center px-1 gap-2 flex-wrap">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-[#c28a7c]" /> Grain-Motion
                Viewport
              </span>
              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold font-mono">
                friction velocity u* = {params.wind_velocity.toFixed(3)} m/s
              </span>
            </div>

            {/* Binder legend, the crust is coloured by whichever prong(s) actually formed it. */}
            <div className="flex items-center gap-3 px-1 flex-wrap">
              <span className="flex items-center gap-1 text-[9px] font-mono text-slate-500">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ background: "#c9a267" }}
                />{" "}
                untreated sand
              </span>
              {activeBinders.map((p) => (
                <span
                  key={p}
                  className="flex items-center gap-1 text-[9px] font-mono text-slate-500"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ background: PRONG_CRUST[p].mid }}
                  />{" "}
                  {PRONG_CRUST[p].name}
                </span>
              ))}
            </div>

            {/* Canvas Block, the wrapper is measured so the canvas is DPR-sized to its box (no stretch). */}
            <div
              ref={viewportWrapRef}
              className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-850"
            >
              <canvas ref={particleCanvasRef} className="block w-full" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. COHESIVE RESULTS & WET LAB TRANSLATION (5 STAGE OUTLINE SCORECARD AT THE BOTTOM) */}
      <div
        className={`p-6 rounded-2xl border ${
          isLightMode
            ? "bg-gradient-to-br from-white to-amber-50/20 border-amber-200 "
            : "bg-gradient-to-br from-slate-950 to-slate-950/80 border-slate-850 "
        }`}
      >
        {/* SCORECARD TAPE DECORATION */}
        <div className="flex items-center gap-4 border-b border-amber-100 dark:border-slate-900 pb-5 mb-5 justify-between flex-wrap">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-teal-500 text-white font-mono text-[9px] font-extrabold tracking-widest animate-pulse">
              FINAL REPORT
            </span>
            <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-widest font-mono">
              Durability &amp; Wet-Lab Translation
            </h3>
          </div>

          <div className="text-[11px] text-slate-550 dark:text-slate-400 font-mono">
            Computed live, in-browser •{" "}
            <span className="text-teal-500 font-bold">up to date</span>
          </div>
        </div>

        {/* TWO COLUMNS GRID BENTO STRUCTURE (economics live in the dedicated Economic module) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* PANEL A: SIMULATION CRUST STOPWATCH DIGITAL TIMERS */}
          <div
            className={`p-4 rounded-xl border flex flex-col justify-between ${
              isLightMode
                ? "bg-[#f8fafc] border-slate-200"
                : "bg-[#030610] border-slate-900"
            }`}
          >
            <div className="space-y-1">
              <span className="text-[9.5px] uppercase font-mono font-black tracking-wider text-amber-700 dark:text-amber-400 block mb-1">
                Panel A // Durability Stopwatch
              </span>
              <p className="text-[10px] text-slate-500 leading-normal mb-3">
                Stopwatch records exact simulated failure points at complete
                cumulative mass dislodgement.
              </p>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-850 font-mono">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">
                  Control Sand Time:
                </span>
                <span className="text-xs text-amber-600 font-extrabold">
                  {stopwatchMetrics.controlFailSec === 15.0
                    ? "UNFAILING (15s)"
                    : `${stopwatchMetrics.controlFailSec.toFixed(2)}s`}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-xs text-slate-550 dark:text-slate-450 font-bold">
                  Bio-Treated Time:
                </span>
                <span
                  className={`text-xs font-black px-2 py-0.5 rounded ${
                    physicsResult.isShattered
                      ? "text-red-650 bg-red-100 dark:bg-red-950/20 dark:text-red-400"
                      : stopwatchMetrics.treatedFailSec > 15
                        ? "text-teal-700 bg-teal-50 dark:bg-teal-950/20 dark:text-teal-400"
                        : "text-amber-700 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400"
                  }`}
                >
                  {physicsResult.isShattered
                    ? "SHATTERED INSTANTLY"
                    : stopwatchMetrics.treatedFailSec === 999.0
                      ? "STABLE / IMMUNE (∞)"
                      : `${stopwatchMetrics.treatedFailSec.toFixed(2)}s`}
                </span>
              </div>

              <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-850 flex justify-between items-center">
                <span className="text-[10.5px] text-slate-500 font-bold">
                  Lifespan Extension:
                </span>
                <span className="text-sm font-black text-amber-700 dark:text-amber-400">
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
          <div
            className={`p-4 rounded-xl border flex flex-col justify-between ${
              isLightMode
                ? "bg-[#f8fafc] border-slate-200"
                : "bg-[#030610] border-slate-900"
            }`}
          >
            <div className="space-y-1">
              <span className="text-[9.5px] uppercase font-mono font-black tracking-wider text-teal-700 dark:text-teal-400 block mb-1">
                Panel B // Wet Lab Directives
              </span>
              <p className="text-[10px] text-slate-500 leading-normal mb-3">
                Translates physical boundary model limits into precise
                laboratory execution instructions.
              </p>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-slate-850 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-550 dark:text-slate-450">
                  Cultivation Period:
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {Math.max(16, Math.min(72, (18000 / activeGs) * 2.5)).toFixed(
                    1,
                  )}{" "}
                  hrs
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-550 dark:text-slate-450">
                  Required Spray Density:
                </span>
                <span className="font-extrabold text-[#c28a7c]">
                  {(250.0 + crustThickness * 14.5).toFixed(0)} mL/m²
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-550 dark:text-slate-450">
                  Wind Survival Rating:
                </span>
                <span
                  className={`font-extrabold uppercase ${
                    physicsResult.isShattered
                      ? "text-red-500"
                      : stopwatchMetrics.lifespanMultiplier > 15
                        ? "text-teal-600"
                        : "text-amber-500"
                  }`}
                >
                  {physicsResult.isShattered
                    ? "CRITICAL SHATTER"
                    : currentFreestreamWind > physicsResult.uInf_t
                      ? "MICRO-EROSION ACTIVE"
                      : "SECURED IMMUNITY"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CROSS-REFERENCE: macro deployment cost & LCA are owned by the Economic module */}
        <div
          className={`mt-5 p-3 rounded-xl border flex items-start gap-2.5 text-[11px] font-mono ${
            isLightMode
              ? "bg-amber-50/60 border-amber-200 text-stone-700"
              : "bg-[#05111d] border-teal-950/50 text-teal-300"
          }`}
        >
          <Coins className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
          <span className="leading-relaxed">
            <strong className="uppercase font-bold">
              Deployment economics moved.
            </strong>{" "}
            Per-hectare biopolymer volume, fermentation CapEx and LCA carbon
            offsets are now computed in the dedicated{" "}
            <span className="font-bold">
              Economic Scalability &amp; LCA Engine
            </span>{" "}
            module, which draws directly from the live FBA yield feed for a
            single, consistent cost model.
          </span>
        </div>
      </div>
    </div>
  );
}
