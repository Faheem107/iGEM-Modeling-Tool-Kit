import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import GlossaryTerm from './GlossaryTerm';
import { 
  Play, 
  RotateCcw, 
  ArrowRight, 
  Dna, 
  Cpu, 
  Sparkles, 
  Thermometer, 
  ShieldAlert, 
  AlertCircle, 
  CheckCircle2, 
  Coins, 
  Globe, 
  Wind, 
  Atom, 
  Hourglass,
  FlaskConical,
  Sprout,
  ChevronRight,
  Calculator,
  Flame,
  Gauge,
  HelpCircle,
  FileText,
  DollarSign
} from 'lucide-react';

interface MultiscaleGuidedTourProps {
  isLightMode: boolean;
  onClose?: () => void;
}

export default function MultiscaleGuidedTour({
  isLightMode,
  onClose
}: MultiscaleGuidedTourProps) {
  // Centralized Glossary active pop-up manager (only one open at a time)
  const [activePopupId, setActivePopupId] = useState<string | null>(null);

  // Current active step view (User can walk through details of steps 1-5, but bottom dashboard displays comprehensive real-time cascading results)
  const [activeStage, setActiveStage] = useState<number>(1);
  const [unlockedStages, setUnlockedStages] = useState<number[]>([1, 2, 3, 4, 5]);

  // STAGE 1 & 2 Core State: Feedstock Glucose rate input (0 to 20 mmol/g/h)
  const [glucoseInput, setGlucoseInput] = useState<number>(12.5);
  const [isFbaSolving, setIsFbaSolving] = useState<boolean>(false);
  const [fbaPulse, setFbaPulse] = useState<boolean>(false);

  // STAGE 3 Core State: Target Desert Surface Temperature (15°C to 65°C)
  const [desertTemp, setDesertTemp] = useState<number>(42.0); 

  // STAGE 4 Core State: Real-time wind tunnel state variables
  const [isWindActive, setIsWindActive] = useState<boolean>(false);
  const [windSimulationTime, setWindSimulationTime] = useState<number>(0);
  const [liveControlErosion, setLiveControlErosion] = useState<{ x: number; y: number }[]>([]);
  const [liveBiofilmErosion, setLiveBiofilmErosion] = useState<{ x: number; y: number }[]>([]);
  const [stormWindForce, setStormWindForce] = useState<number>(28.0); // m/s active storm wind
  const [simulationComplete, setSimulationComplete] = useState<boolean>(false);
  const windTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic feedback flashes on interaction
  const [pulseStage, setPulseStage] = useState<number | null>(null);
  const triggerPulse = (stage: number) => {
    setPulseStage(stage);
    setTimeout(() => setPulseStage(null), 600);
  };

  // ---------------- STAGE 1 MATHEMATICS (FBA Carbon Inflow) ----------------
  const fbaMetrics = useMemo(() => {
    // Uptake kinetics (Michaelis-Menten representation)
    const V_max = 18.5; // max uptake rate mmol/gCDW/h
    const K_s = 4.2; // affinity constant
    const v_uptake = (V_max * glucoseInput) / (K_s + glucoseInput);

    // Metabolic split ratio: 68% of structural carbon channeled directly into precursor L-Glutamate
    const splitRatio = 0.68;
    const v_glutamate = v_uptake * splitRatio;

    return {
      v_uptake,
      v_glutamate
    };
  }, [glucoseInput]);

  // Trigger cascade pulses on slider shifts
  useEffect(() => {
    triggerPulse(1);
    triggerPulse(2);
    triggerPulse(3);
    triggerPulse(5);
  }, [glucoseInput]);

  useEffect(() => {
    triggerPulse(3);
    triggerPulse(4);
    triggerPulse(5);
  }, [desertTemp]);

  // ---------------- STAGE 2 MATHEMATICS (Coupled ODE Growth) ----------------
  const odeKinetics = useMemo(() => {
    const points: { hour: number; mrna: number; enzyme: number; pga: number }[] = [];
    
    // Kinetic rates derived from standard B. subtilis strain models
    const k_transcription = 0.32;
    const d_mrna = 0.18;
    const k_translation = 0.45;
    const d_enzyme = 0.09;
    const k_pga_synthesis = 1.15;

    let m_state = 0; // mRNA transcript level
    let e_state = 0; // enzyme transcription factor activity
    let p_state = 0; // Cumulative Biopolymer PGA density (g/L)

    const parentFlux = fbaMetrics.v_glutamate;

    // Euler step approximation over 48 hours for high performance
    for (let h = 0; h <= 48; h++) {
      const dm = (k_transcription * parentFlux) - (d_mrna * m_state);
      const de = (k_translation * m_state) - (d_enzyme * e_state);
      const dp = k_pga_synthesis * e_state * (parentFlux / (2.5 + parentFlux));

      m_state = Math.max(0, m_state + dm * 0.15);
      e_state = Math.max(0, e_state + de * 0.15);
      p_state = Math.max(0, p_state + dp * 0.15);

      points.push({
        hour: h,
        mrna: Math.min(100, m_state * 8),
        enzyme: Math.min(100, e_state * 6),
        pga: Math.min(120, p_state)
      });
    }

    const finalPgaYield = points[points.length - 1]?.pga || 0;

    return {
      points,
      finalPgaYield
    };
  }, [fbaMetrics.v_glutamate]);

  // ---------------- STAGE 3 MATHEMATICS (Thermodenaturation & Biophysics) ----------------
  const biophysicalMetrics = useMemo(() => {
    const Tm_scaffold = 46.0; // Denaturation midpoint temp (°C) of PGA enzyme scaffolds
    const k_denatur = 4.8; // Boltzmann temperature sensitivity value

    // Probability of folded, biologically active protein configuration
    const foldedStability = 1.0 / (1.0 + Math.exp((desertTemp - Tm_scaffold) / k_denatur));

    // Base loose dry desert sand shear strength G_base ≈ 380 Pa
    // Harvested PGA acts as crosslinker, scaled with temperature stability
    const G_base = 380.0;
    const shearModulusGs = G_base + (odeKinetics.finalPgaYield * 162.0 * foldedStability);

    return {
      foldedStability,
      shearModulusGs
    };
  }, [odeKinetics.finalPgaYield, desertTemp]);

  // ---------------- STAGE 4 MATHEMATICS (Critical Shield Threshold) ----------------
  const aeolianThreshold = useMemo(() => {
    const baseUntreatedCutoff = 10.5; // m/s required to lift dry untreated sand grains
    // Biopolymer protective coating scales based on square root of Sand Shear Strength (Gs)
    const thresholdWindSpeed = baseUntreatedCutoff + (0.22 * Math.sqrt(biophysicalMetrics.shearModulusGs));

    return {
      thresholdWindSpeed
    };
  }, [biophysicalMetrics.shearModulusGs]);

  // Handle Ignite Wind Simulation
  const handleIgniteWindTunnel = () => {
    if (isWindActive) {
      if (windTimerRef.current) clearInterval(windTimerRef.current);
      setIsWindActive(false);
      setWindSimulationTime(0);
      setSimulationComplete(false);
      setLiveControlErosion([]);
      setLiveBiofilmErosion([]);
      return;
    }

    setIsWindActive(true);
    setSimulationComplete(false);
    setWindSimulationTime(0);
    setLiveControlErosion([{ x: 0, y: 0 }]);
    setLiveBiofilmErosion([{ x: 0, y: 0 }]);

    let t = 0;
    const step = 0.25; // tick every quarter second
    const totalDuration = 15;

    // Control Group Failure Speed
    const controlErosionFactor = 1.6 + (stormWindForce / 12.0);

    // Treated Group failure rate scales based on whether current storm force exceeds biological threshold index
    const thresholdExceeded = stormWindForce > aeolianThreshold.thresholdWindSpeed;
    const Gs = biophysicalMetrics.shearModulusGs;
    
    // Safety damage coefficient
    const biofilmErosionFactor = thresholdExceeded
      ? 0.18 * Math.pow(stormWindForce - aeolianThreshold.thresholdWindSpeed, 1.32)
      : 0.008 * (stormWindForce / (Gs / 220.0));

    if (windTimerRef.current) clearInterval(windTimerRef.current);

    windTimerRef.current = setInterval(() => {
      t += step;
      if (t > totalDuration) {
        clearInterval(windTimerRef.current!);
        setIsWindActive(false);
        setSimulationComplete(true);
        return;
      }

      setWindSimulationTime(t);

      // Plot data points
      setLiveControlErosion(prev => [
        ...prev,
        { x: t, y: Math.min(100, (1 - Math.exp(-t * controlErosionFactor)) * 100) }
      ]);

      setLiveBiofilmErosion(prev => [
        ...prev,
        { x: t, y: Math.min(100, (1 - Math.exp(-t * biofilmErosionFactor)) * 100) }
      ]);

    }, 250);
  };

  useEffect(() => {
    return () => {
      if (windTimerRef.current) clearInterval(windTimerRef.current);
    };
  }, []);

  // ---------------- PANEL A (Failure Timers) ----------------
  const stopwatchMetrics = useMemo(() => {
    // Control Group fails at 90% erosion mass
    const controlFailureSec = Math.log(1 - 0.90) / - (1.6 + (stormWindForce / 12.0));
    
    // Biofilm Group failure
    const Gs = biophysicalMetrics.shearModulusGs;
    const thresholdExceeded = stormWindForce > aeolianThreshold.thresholdWindSpeed;
    const biofilmErosionFactor = thresholdExceeded
      ? 0.18 * Math.pow(stormWindForce - aeolianThreshold.thresholdWindSpeed, 1.32)
      : 0.008 * (stormWindForce / (Gs / 220.0));

    const bioFailureSec = Math.log(1 - 0.90) / - biofilmErosionFactor;
    
    // Safety margin calculation
    const safetyMarginRatio = bioFailureSec / Math.max(0.1, controlFailureSec);

    return {
      controlSec: controlFailureSec,
      bioSec: bioFailureSec,
      safetyMarginRatio,
      isImmune: !thresholdExceeded || bioFailureSec > 180
    };
  }, [stormWindForce, aeolianThreshold.thresholdWindSpeed, biophysicalMetrics.shearModulusGs]);

  // ---------------- PANEL B (Wet Lab Operational Rules) ----------------
  const wetLabProtocol = useMemo(() => {
    // Total cultivation time needed inside incubator to reach peak protective polymer density
    const incubationTimeHr = Math.max(16.0, Math.min(72.0, 48.0 * (10.0 / (glucoseInput + 0.1))));

    // Target spray density volume based on required crust cohesion weight
    const requiredCrustCohesion = Math.max(5.5, Math.min(25.0, 18.0 * (1200.0 / biophysicalMetrics.shearModulusGs)));
    const sprayVolumeMlm2 = 250.0 + (requiredCrustCohesion * 18.5);

    // Safety factor expanding volume for desert thermal decomposition
    const thermalSafetyMultiplier = desertTemp < 32 ? 1.0 : 1.0 + ((desertTemp - 32) * 0.038);

    return {
      incubationTimeHr,
      sprayVolumeMlm2,
      thermalSafetyMultiplier
    };
  }, [glucoseInput, biophysicalMetrics.shearModulusGs, desertTemp]);

  // ---------------- PANEL C (Macro Economic Forecast) ----------------
  const macroEconomics = useMemo(() => {
    const hectareSquareMeters = 10000;
    // Base volume needed per square meter
    const rawVolumeLitres = (wetLabProtocol.sprayVolumeMlm2 / 1000.0) * wetLabProtocol.thermalSafetyMultiplier;
    
    // Multiplied across a single Hectare
    const totalVolumeLitresRequired = rawVolumeLitres * hectareSquareMeters;

    // Direct materials prep rate ($0.12 per Liter using synthetic minimal growth medium with agricultural grade molasses)
    const costPerLiter = 0.14;
    const costPerHectareUsd = totalVolumeLitresRequired * costPerLiter;

    return {
      totalVolumeLitresRequired,
      costPerHectareUsd
    };
  }, [wetLabProtocol]);

  // Stage 1 Solving Action
  const solveFbaInflow = () => {
    setIsFbaSolving(true);
    setFbaPulse(true);
    setTimeout(() => {
      setIsFbaSolving(false);
      setFbaPulse(false);
      // Flow cascade jump to stage 2
      setActiveStage(2);
    }, 1000);
  };

  return (
    <div className={`p-5 md:p-8 rounded-2xl border transition-all duration-300 font-sans shadow-2xl relative ${
      isLightMode 
        ? 'bg-gradient-to-br from-slate-50 to-amber-50/60 text-slate-900 border-slate-200' 
        : 'bg-[#03070f] text-slate-100 border-slate-800'
    }`} id="multiscale-simulation-guided-tour">

      {/* Radiant Glow Ring Accents */}
      {!isLightMode && (
        <div className="absolute top-10 right-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 mb-8 border-b border-slate-205 dark:border-slate-800 gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-slate-900 rounded-xl border border-indigo-200/50 dark:border-slate-800 text-indigo-700 dark:text-indigo-400">
            <Atom className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] tracking-widest uppercase font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 border border-emerald-300/40 dark:border-emerald-800/40 font-mono">
                iGEM Simulation Core
              </span>
              <span className="text-[10px] text-slate-500 font-mono">• Multiscale Sandbox</span>
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
              Micro-to-Macro Interactive Timeline
            </h1>
            <p className="text-xs text-slate-650 dark:text-slate-400 mt-0.5">
              Simulating intracellular metabolic carbon fluxes, dynamic protein expression ODEs, and live-ticking storm boundary chamber failure limits.
            </p>
          </div>
        </div>

        {onClose && (
          <button 
            type="button" 
            onClick={onClose}
            className={`text-xs px-4 py-2 rounded-xl font-mono font-bold transition flex items-center gap-2 ${
              isLightMode 
                ? 'bg-slate-200 hover:bg-slate-300 text-slate-850' 
                : 'bg-slate-900 hover:bg-slate-800 text-slate-350 border border-slate-800'
            }`}
          >
            ✕ Close View
          </button>
        )}
      </div>

      {/* HORIZONTAL STEP SENSOR TRAIN */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-8">
        {[
          { stepNum: 1, title: "1. FBA Inflow", stats: `${fbaMetrics.v_glutamate.toFixed(1)} mmol/g/h`, icon: Dna, color: "border-amber-500 dark:text-amber-400" },
          { stepNum: 2, title: "2. ODE Kinetics", stats: `${odeKinetics.finalPgaYield.toFixed(1)} g/L Yield`, icon: Cpu, color: "border-emerald-500 dark:text-emerald-450" },
          { stepNum: 3, title: "3. Biophysics", stats: `${biophysicalMetrics.shearModulusGs.toFixed(0)} Pa stiffness`, icon: Thermometer, color: "border-sky-500 dark:text-sky-450" },
          { stepNum: 4, title: "4. Wind Tunnel", stats: "Active Simulation", icon: Wind, color: "border-pink-500 dark:text-pink-400" },
          { stepNum: 5, title: "5. Operational", stats: "Operational Plans", icon: FileText, color: "border-indigo-500 dark:text-indigo-400" },
        ].map((item) => {
          const isActive = activeStage === item.stepNum;
          const isUnlocked = unlockedStages.includes(item.stepNum);
          const Icon = item.icon;

          return (
            <button
              key={item.stepNum}
              type="button"
              disabled={!isUnlocked}
              onClick={() => setActiveStage(item.stepNum)}
              className={`text-left p-3.5 rounded-xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[96px] ${
                isActive 
                  ? 'bg-white border-indigo-500 shadow-md ring-2 ring-indigo-500/20 dark:bg-slate-950 dark:border-indigo-500' 
                  : isUnlocked 
                    ? 'bg-white/95 border-slate-200 hover:border-slate-350 hover:bg-slate-50 dark:bg-slate-900/40 dark:border-slate-800/80 dark:hover:bg-slate-900'
                    : 'bg-slate-100/50 border-transparent text-slate-400 opacity-50 cursor-not-allowed dark:bg-slate-950 dark:text-slate-700'
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10.5px] font-mono font-bold border ${
                  isActive 
                    ? 'bg-indigo-650 text-white border-indigo-400 dark:bg-indigo-500' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-550 dark:text-slate-400 border-transparent'
                }`}>
                  {item.stepNum}
                </span>
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-650 dark:text-indigo-400' : 'text-slate-400'}`} />
              </div>

              <div className="mt-3">
                <div className={`text-xs font-bold uppercase tracking-tight ${
                  isActive 
                    ? 'text-indigo-700 dark:text-indigo-400' 
                    : 'text-slate-800 dark:text-slate-250'
                }`}>
                  {item.title}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-450 font-mono truncate">
                  {item.stats}
                </div>
              </div>

              {pulseStage === item.stepNum && (
                <div className="absolute inset-0 bg-indigo-500/10 animate-pulse pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>

      {/* MAIN TWO-COLUMN VIEWPORT CHASSIS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mb-8">
        
        {/* LEFT COLUMN: ACTIVE VIEW CARD WITH DETAILED CONTROLS (5 COLS) */}
        <div className={`lg:col-span-12 xl:col-span-5 p-6 rounded-2xl border flex flex-col justify-between min-h-[460px] ${
          isLightMode 
            ? 'bg-white text-slate-905 border-slate-205 shadow-sm' 
            : 'bg-slate-950 text-slate-50 border-slate-850'
        }`}>
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className={`text-[9.5px] uppercase tracking-wider font-mono font-bold px-2 py-0.5 rounded border ${
                isLightMode 
                  ? 'text-emerald-900 bg-emerald-50 border-emerald-300' 
                  : 'text-emerald-300 bg-emerald-950/45 border-emerald-800/40'
              }`}>
                ACTIVE STEP WALKTHROUGH
              </span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeStage}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {activeStage === 1 && (
                  <div className="space-y-3">
                    <h3 className={`text-sm font-black uppercase tracking-wider font-mono ${isLightMode ? 'text-amber-900' : 'text-amber-400'}`}>
                      I. Carbon Feedstock Allocation
                    </h3>
                    <p className={`text-xs font-semibold leading-relaxed ${isLightMode ? 'text-slate-800' : 'text-slate-50'}`}>
                      Calculates cellular precursor flux using stoichiometric boundaries. Reallocates glucose influx toward L-glutamate biosynthesis inside <GlossaryTerm term="Bacillus subtilis" theme={isLightMode ? 'light' : 'dark'} />.
                    </p>
                    <div className={`p-3 border rounded-lg text-xs font-mono space-y-1 ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                      <div className={`text-[10px] uppercase font-bold ${isLightMode ? 'text-slate-800' : 'text-slate-400'}`}>Stoichiometric System Matrix:</div>
                      <div className={`font-semibold text-center py-1 ${isLightMode ? 'text-indigo-900' : 'text-indigo-300'}`}>S · v = 0</div>
                    </div>
                  </div>
                )}

                {activeStage === 2 && (
                  <div className="space-y-3">
                    <h3 className={`text-sm font-black uppercase tracking-wider font-mono ${isLightMode ? 'text-emerald-900' : 'text-emerald-300'}`}>
                      II. Synthesis Kinetic Simulation
                    </h3>
                    <p className={`text-xs font-semibold leading-relaxed ${isLightMode ? 'text-slate-800' : 'text-slate-50'}`}>
                      Integrates transcription, translation, and biopolymer assembly rates over a 48H growth cycle. Computes real-time cellular accumulation of <GlossaryTerm term="gamma-PGA" theme={isLightMode ? 'light' : 'dark'} />.
                    </p>
                    <div className={`p-3 border rounded-lg text-xs font-mono space-y-1 ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                      <div className={`text-[10px] uppercase font-bold ${isLightMode ? 'text-slate-800' : 'text-slate-400'}`}>Polymer Synthesis ODE:</div>
                      <div className={`font-semibold text-center py-1 ${isLightMode ? 'text-emerald-900' : 'text-emerald-300'}`}>d[γ-PGA] / dt = k_pga · [Enzyme_Active]</div>
                    </div>
                  </div>
                )}

                {activeStage === 3 && (
                  <div className="space-y-3">
                    <h3 className={`text-sm font-black uppercase tracking-wider font-mono ${isLightMode ? 'text-sky-900' : 'text-sky-300'}`}>
                      III. Ionic Cross-Linking Thermodynamics
                    </h3>
                    <p className={`text-xs font-semibold leading-relaxed ${isLightMode ? 'text-slate-800' : 'text-slate-50'}`}>
                      Models electrostatic matrix binding between quartz grain surfaces under desert temperatures. Uses Boltzmann mechanics to calculate polymer folded states and overall sand <GlossaryTerm term="Shear Modulus" theme={isLightMode ? 'light' : 'dark'} /> stiffness.
                    </p>
                    <div className={`p-3 border rounded-lg text-xs font-mono space-y-1 ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                      <div className={`text-[10px] uppercase font-bold ${isLightMode ? 'text-slate-800' : 'text-slate-400'}`}>Thermodynamic Modulus Scaling:</div>
                      <div className={`font-semibold text-center py-1 ${isLightMode ? 'text-sky-900' : 'text-sky-300'}`}>Gs = G_base + Yield · 162.0 · P_folded(T)</div>
                    </div>
                  </div>
                )}

                {activeStage === 4 && (
                  <div className="space-y-3">
                    <h3 className={`text-sm font-black uppercase tracking-wider font-mono ${isLightMode ? 'text-pink-905' : 'text-pink-400'}`}>
                      IV. Aeolian Boundary Stress Testing
                    </h3>
                    <p className={`text-xs font-semibold leading-relaxed ${isLightMode ? 'text-slate-800' : 'text-slate-50'}`}>
                      Subjects protected soil matrices to wind shear. Simulates sand transport mechanisms (including <GlossaryTerm term="Saltation" theme={isLightMode ? 'light' : 'dark'} />) and tracks soil failure boundaries.
                    </p>
                    <div className={`p-3 border rounded-lg text-xs font-mono space-y-1 ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                      <div className={`text-[10px] uppercase font-bold ${isLightMode ? 'text-slate-800' : 'text-slate-400'}`}>Critical Friction Threshold Rate:</div>
                      <div className={`font-semibold text-center py-1 ${isLightMode ? 'text-pink-900' : 'text-pink-300'}`}>u_*t = 10.5 + 0.22 · √Gs</div>
                    </div>
                  </div>
                )}

                {activeStage === 5 && (
                  <div className="space-y-3">
                    <h3 className={`text-sm font-black uppercase tracking-wider font-mono ${isLightMode ? 'text-indigo-900' : 'text-indigo-300'}`}>
                      V. Site Deployment Field Protocol
                    </h3>
                    <p className={`text-xs font-semibold leading-relaxed ${isLightMode ? 'text-slate-800' : 'text-slate-50'}`}>
                      Translates multi-scale modeling predictions directly into real-world geotechnical deployment instructions. Maps bio-crust values to target soil application rates.
                    </p>
                    <div className={`p-3 border rounded-lg text-xs font-mono space-y-1 ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                      <div className={`text-[10px] uppercase font-bold ${isLightMode ? 'text-slate-800' : 'text-slate-400'}`}>Required Area Volume Ratio:</div>
                      <div className={`font-semibold text-center py-1 ${isLightMode ? 'text-indigo-900' : 'text-indigo-400'}`}>Volume_L = (Spray_m2 / 1000) · S_thermal</div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ACTIVE STEP CONTROLS BOX */}
          <div className={`mt-8 pt-5 border-t space-y-5 ${isLightMode ? 'border-slate-200' : 'border-slate-800'}`}>
            
            {/* Stage 1: Feedstock glucose adjuster */}
            {activeStage === 1 && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className={`font-bold ${isLightMode ? 'text-slate-800' : 'text-slate-400'}`}>Glucose Input Flow Parameter:</span>
                    <span className={`font-extrabold text-sm ${isLightMode ? 'text-amber-900' : 'text-amber-405'}`}>{glucoseInput.toFixed(1)} mmol/gCDW/h</span>
                  </div>
                  <input 
                    type="range"
                    min="1.0"
                    max="20.0"
                    step="0.5"
                    value={glucoseInput}
                    onChange={(e) => setGlucoseInput(parseFloat(e.target.value))}
                    className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-amber-500 "${isLightMode ? 'bg-slate-200' : 'bg-slate-800'}`}
                    id="tour-glucose-slider"
                  />
                  <div className={`flex justify-between text-[10px] font-mono ${isLightMode ? 'text-slate-600' : 'text-slate-500'}`}>
                    <span>Survival State (1.0)</span>
                    <span>Industrial Peak (20.0)</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={solveFbaInflow}
                  disabled={isFbaSolving}
                  className="w-full py-2.5 px-4 rounded-xl text-xs uppercase font-mono font-bold tracking-wider bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50"
                >
                  {isFbaSolving ? (
                    <>
                      <Atom className="w-4 h-4 animate-spin text-white" /> Solving Stoichiometrics...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-4 h-4 text-white" /> Solving S · v = 0 Target Flux
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Stage 2 ODE Navigation */}
            {activeStage === 2 && (
              <div className="space-y-3">
                <div className={`p-3 rounded-xl border text-xs font-mono space-y-1.5 ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-850'}`}>
                  <div className={`text-[10px] uppercase font-bold ${isLightMode ? 'text-slate-705' : 'text-slate-500'}`}>STAGED ODE EXTRACTS</div>
                  <div className="flex justify-between text-slate-800 dark:text-slate-300 font-semibold">
                    <span>Metabolic Carbon Source Flux:</span>
                    <span className={`font-bold ${isLightMode ? 'text-amber-900 font-black' : 'text-amber-400'}`}>{fbaMetrics.v_glutamate.toFixed(2)} mmol/g/h</span>
                  </div>
                  <div className="flex justify-between text-slate-800 dark:text-slate-300 font-semibold">
                    <span>Resulting γ-PGA Density:</span>
                    <span className={`font-bold ${isLightMode ? 'text-emerald-900 font-black' : 'text-emerald-450'}`}>{odeKinetics.finalPgaYield.toFixed(2)} g/L</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveStage(3)}
                  className="w-full py-2.5 rounded-xl text-xs uppercase font-mono font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 shadow"
                >
                  Conduct Biophysical Crosslinking <ArrowRight className="w-4 h-4 text-white" />
                </button>
              </div>
            )}

            {/* Stage 3 Temperature controls */}
            {activeStage === 3 && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className={`font-bold ${isLightMode ? 'text-slate-800' : 'text-slate-400'}`}>Target Ground Desert Temp:</span>
                    <span className={`font-extrabold text-sm flex items-center gap-1 ${isLightMode ? 'text-red-900' : 'text-red-400'}`}>
                      <Thermometer className="w-4 h-4" /> {desertTemp.toFixed(1)}°C
                    </span>
                  </div>
                  <input 
                    type="range"
                    min="15"
                    max="65"
                    step="1"
                    value={desertTemp}
                    onChange={(e) => setDesertTemp(parseInt(e.target.value))}
                    className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-red-500 ${isLightMode ? 'bg-slate-200' : 'bg-slate-800'}`}
                    id="tour-temp-slider"
                  />
                  <div className={`flex justify-between text-[10px] font-mono ${isLightMode ? 'text-slate-600' : 'text-slate-500'}`}>
                    <span>Moderate Spring (15°C)</span>
                    <span>Sahara Daylight (65°C)</span>
                  </div>
                </div>

                <div className={`p-3 rounded-xl text-xs font-mono flex flex-col gap-1.5 border ${
                  isLightMode 
                    ? 'bg-slate-50 border-slate-200 text-slate-800 font-semibold' 
                    : 'bg-slate-950/40 border-slate-850 text-slate-300'
                }`}>
                  <div className="flex justify-between">
                    <span>Enzyme Matrix Stability Factor:</span>
                    <span className={`font-bold ${isLightMode ? 'text-indigo-900' : 'text-indigo-400'}`}>{(biophysicalMetrics.foldedStability * 100).toFixed(0)}% Stable</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sand Surface Stiffness Modulus (Gs):</span>
                    <span className={`font-bold ${isLightMode ? 'text-emerald-900' : 'text-emerald-450'}`}>{biophysicalMetrics.shearModulusGs.toFixed(1)} Pa</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveStage(4)}
                  className="w-full py-2.5 rounded-xl text-xs uppercase font-mono font-bold bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center gap-1.5 shadow"
                >
                  Conduct Active Wind Simulation <ArrowRight className="w-4 h-4 text-white" />
                </button>
              </div>
            )}

            {/* Stage 4 Wind simulator Controls */}
            {activeStage === 4 && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className={`font-bold ${isLightMode ? 'text-slate-800' : 'text-slate-400'}`}>Simulated Storm Velocity:</span>
                    <span className={`font-extrabold text-sm flex items-center gap-1 ${isLightMode ? 'text-pink-905' : 'text-pink-400'}`}>
                      <Wind className="w-3.5 h-3.5" /> {stormWindForce.toFixed(0)} m/s
                    </span>
                  </div>
                  <input 
                    type="range"
                    min="10"
                    max="45"
                    step="1"
                    value={stormWindForce}
                    onChange={(e) => setStormWindForce(parseInt(e.target.value))}
                    className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-pink-500 ${isLightMode ? 'bg-slate-200' : 'bg-slate-800'}`}
                    id="tour-wind-slider"
                  />
                  <div className={`flex justify-between text-[10px] font-mono ${isLightMode ? 'text-slate-600' : 'text-slate-500'}`}>
                    <span>Fresh Storm (10 m/s)</span>
                    <span>Extreme Gales (45 m/s)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleIgniteWindTunnel}
                    className={`col-span-2 py-2.5 rounded-xl text-xs uppercase font-mono font-bold flex items-center justify-center gap-1.5 shadow transition-all ${
                      isWindActive 
                        ? 'bg-red-600 hover:bg-red-500 text-white' 
                        : 'bg-pink-650 hover:bg-pink-550 text-white'
                    }`}
                  >
                    <Wind className={`w-4 h-4 ${isWindActive ? 'animate-spin' : ''}`} />
                    {isWindActive ? `Stop Sim (${windSimulationTime.toFixed(1)}s)` : "Ignite Wind Tunnel Blast"}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveStage(5)}
                  className={`w-full py-2.5 rounded-xl text-xs uppercase font-mono font-bold hover:text-white flex items-center justify-center gap-1.5 transition border ${
                    isLightMode 
                      ? 'bg-slate-900 border-slate-750 text-slate-100 hover:bg-slate-800' 
                      : 'bg-slate-900 border-slate-805 text-slate-305 hover:bg-slate-800'
                  }`}
                >
                  Inspect Deployment Protocols <ArrowRight className="w-4 h-4 text-white" />
                </button>
              </div>
            )}

            {/* Stage 5 blueprint control navigation */}
            {activeStage === 5 && (
              <div className="space-y-3">
                <div className={`p-3 rounded-xl text-xs font-mono italic text-center border ${
                  isLightMode 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-950 font-bold' 
                    : 'bg-indigo-950/20 border-indigo-900/40 text-indigo-400'
                }`}>
                  "All computational layers have successfully synced! Explore the comprehensive Wet Lab translations below."
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveStage(1);
                    setGlucoseInput(12.5);
                    setDesertTemp(42.0);
                    setStormWindForce(28.0);
                    setLiveControlErosion([]);
                    setLiveBiofilmErosion([]);
                    setWindSimulationTime(0);
                    setIsWindActive(false);
                    setSimulationComplete(false);
                  }}
                  className={`w-full py-2.5 rounded-xl text-xs uppercase font-mono font-bold flex items-center justify-center gap-1.5 transition border ${
                    isLightMode 
                      ? 'bg-slate-100 border-slate-205 text-slate-800 hover:bg-slate-200' 
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" /> Reset Guided Tour Parameters
                </button>
              </div>
            )}

          </div>
        </div>

        {/* RIGHT COLUMN: CORRESPONDING LIVE GRAPHICAL PANELS (7 COLS) */}
        <div className="lg:col-span-12 xl:col-span-7 flex flex-col justify-between gap-6">
          
          {/* EQUATION MODULES SCREEN */}
          <div className={`p-5 rounded-2xl border shadow-inner relative overflow-hidden flex flex-col justify-between transition-colors duration-300 ${
            isLightMode 
              ? 'bg-amber-100/10 text-slate-800 border-amber-900/10' 
              : 'bg-slate-950 text-slate-200 border-slate-900'
          }`}>
            <div className={`absolute top-2.5 right-3.5 text-[8.5px] font-mono uppercase flex items-center gap-1 ${
              isLightMode ? 'text-amber-800/80' : 'text-slate-500'
            }`}>
              <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-ping" />
              STOCHASTIC RESOLVER STATUS ONLINE
            </div>

            <div className="space-y-4 font-mono">
              <div className={`text-[10px] font-bold uppercase tracking-wider ${
                isLightMode ? 'text-amber-900' : 'text-slate-550'
              }`}>
                Active Mathematical Processing Matrix
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Stoichiometric FBA solve */}
                <div className={`p-3 rounded-xl border transition-all duration-300 ${
                  activeStage === 1 
                    ? (isLightMode ? 'border-amber-500/50 bg-amber-100/50 text-amber-950' : 'border-amber-500/40 bg-amber-950/15 text-amber-500')
                    : (isLightMode ? 'border-amber-900/5 bg-transparent text-slate-500 opacity-60' : 'border-slate-900 bg-slate-950/45 text-slate-400 opacity-60')
                }`}>
                  <div className={`text-[9.5px] font-bold uppercase mb-1 ${
                    isLightMode ? 'text-amber-800' : 'text-slate-550'
                  }`}>
                    [Stoichiometric Carbon Balance]
                  </div>
                  <div className={`text-[10px] italic ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>{"S • v = 0"}</div>
                  <div className={`text-[11px] font-semibold ${
                    activeStage === 1 && isLightMode ? 'text-amber-950' : (activeStage === 1 ? 'text-amber-500' : 'text-slate-500')
                  }`}>
                    {"v_glutamate = (18.5 * " + glucoseInput.toFixed(1) + ") / (" + (4.2) + " + " + glucoseInput.toFixed(1) + ") * 0.68"}
                  </div>
                  <div className={`text-xs font-bold mt-1 ${
                    isLightMode ? 'text-amber-900' : 'text-amber-400'
                  }`}>
                    {"= " + fbaMetrics.v_glutamate.toFixed(3) + " mmol/gCDW/h"}
                  </div>
                </div>

                {/* Coupled ODE integration translation */}
                <div className={`p-3 rounded-xl border transition-all duration-300 ${
                  activeStage === 2 
                    ? (isLightMode ? 'border-emerald-500/50 bg-emerald-100/40 text-emerald-950' : 'border-emerald-500/40 bg-emerald-950/15 text-emerald-450')
                    : (isLightMode ? 'border-amber-900/5 bg-transparent text-slate-500 opacity-60' : 'border-slate-900 bg-slate-950/45 text-slate-400 opacity-60')
                }`}>
                  <div className={`text-[9.5px] font-bold uppercase mb-1 ${
                    isLightMode ? 'text-emerald-800' : 'text-slate-550'
                  }`}>
                    [Coupled ODE Translation Loop]
                  </div>
                  <div className={`text-[10px] italic ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>{"d[PGA]/dt = k_pga * [ActiveEnzyme]"}</div>
                  <div className={`text-[11px] font-semibold ${
                    activeStage === 2 && isLightMode ? 'text-emerald-950' : (activeStage === 2 ? 'text-emerald-400' : 'text-slate-500')
                  }`}>
                    {"dPGA/dt = 1.15 * enzyme_t * (flux_glutamate / (2.5 + flux_glutamate))"}
                  </div>
                  <div className={`text-xs font-bold mt-1 ${
                    isLightMode ? 'text-emerald-900' : 'text-emerald-450'
                  }`}>
                    {"Total Bio-yield => " + odeKinetics.finalPgaYield.toFixed(2) + " g/L"}
                  </div>
                </div>

                {/* Biophysics stability folding */}
                <div className={`p-3 rounded-xl border transition-all duration-300 ${
                  activeStage === 3 
                    ? (isLightMode ? 'border-sky-500/50 bg-sky-100/40 text-sky-950' : 'border-sky-500/40 bg-sky-950/15 text-sky-400')
                    : (isLightMode ? 'border-amber-900/5 bg-transparent text-slate-500 opacity-60' : 'border-slate-900 bg-slate-950/45 text-slate-400 opacity-60')
                }`}>
                  <div className={`text-[9.5px] font-bold uppercase mb-1 ${
                    isLightMode ? 'text-sky-800' : 'text-slate-550'
                  }`}>
                    [Boltzmann Denaturation stability]
                  </div>
                  <div className={`text-[10px] italic ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>{"Gs = G_base + Yield * 162.0 * FoldProbability"}</div>
                  <div className={`text-[11px] font-semibold ${
                    activeStage === 3 && isLightMode ? 'text-sky-950' : (activeStage === 3 ? 'text-sky-400' : 'text-slate-500')
                  }`}>
                    {"Fold(T): 1 / (1 + exp((" + desertTemp.toFixed(1) + " - 46.0) / 4.8))"}
                  </div>
                  <div className={`text-xs font-bold mt-1 ${
                    isLightMode ? 'text-sky-900' : 'text-sky-450'
                  }`}>
                    {"Shear Modulus Gs => " + biophysicalMetrics.shearModulusGs.toFixed(1) + " Pa"}
                  </div>
                </div>

                {/* Wind boundary layer safety cutoff */}
                <div className={`p-3 rounded-xl border transition-all duration-300 ${
                  activeStage === 4 
                    ? (isLightMode ? 'border-pink-500/50 bg-pink-100/40 text-pink-950' : 'border-pink-500/40 bg-pink-950/15 text-pink-400')
                    : (isLightMode ? 'border-amber-900/5 bg-transparent text-slate-500 opacity-60' : 'border-slate-900 bg-slate-950/45 text-slate-400 opacity-60')
                }`}>
                  <div className={`text-[9.5px] font-bold uppercase mb-1 ${
                    isLightMode ? 'text-pink-800' : 'text-slate-550'
                  }`}>
                    [Aeolian cohesive Shield Cutoff]
                  </div>
                  <div className={`text-[10px] italic ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>{"u_*t = 10.5 + 0.22 * sqrt(Gs)"}</div>
                  <div className={`text-[11px] font-semibold ${
                    activeStage === 4 && isLightMode ? 'text-pink-950' : (activeStage === 4 ? 'text-pink-450' : 'text-slate-500')
                  }`}>
                    {"u_*t = 10.5 + 0.22 * sqrt(" + biophysicalMetrics.shearModulusGs.toFixed(0) + " )"}
                  </div>
                  <div className={`text-xs font-bold mt-1 ${
                    isLightMode ? 'text-pink-905' : 'text-pink-400'
                  }`}>
                    {"Critical Velocity Limit => " + aeolianThreshold.thresholdWindSpeed.toFixed(2) + " m/s"}
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* DYNAMIC VISUAL SCREEN AREA */}
          <div className={`p-6 rounded-2xl border flex-1 flex flex-col justify-between min-h-[300px] relative overflow-hidden ${
            isLightMode 
              ? 'bg-amber-100/30 border-slate-205 shadow-inner' 
              : 'bg-[#010204]/90 border-slate-900 shadow-2xl shadow-black/90'
          }`}>
            
            <AnimatePresence mode="wait">
              
              {/* STAGE 1 VISUALIZER */}
              {activeStage === 1 && (
                <motion.div
                  key="v-s-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4 w-full h-full flex flex-col justify-between flex-1"
                >
                  <div className="flex justify-between items-center text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
                    <span>Intracellular Metabolic Precursor stream</span>
                    <span className="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1">
                      <Atom className="w-3.5 h-3.5" /> FBA Solvings
                    </span>
                  </div>

                  {/* Flux animation */}
                  <div className="relative h-32 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl bg-white dark:bg-[#03060d] overflow-hidden flex items-center justify-between px-10">
                    
                    {/* Glucose Input */}
                    <div className="flex flex-col items-center z-10">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-400/25 flex items-center justify-center font-bold text-xs uppercase font-mono">
                        Glucose
                      </div>
                      <span className="text-[9px] font-mono text-slate-550 dark:text-slate-400 mt-1">{glucoseInput.toFixed(1)} mmol</span>
                    </div>

                    {/* Stoichiometric Solver Tube with flowing carbon units */}
                    <div className="absolute inset-0 flex justify-center items-center pointer-events-none overflow-hidden max-w-sm mx-auto">
                      {[1, 2, 3, 4, 5].map((item) => (
                        <motion.div
                          key={item}
                          animate={{ 
                            x: isFbaSolving ? [-130, 130] : [-10 * item, 10 * item],
                            opacity: [0, 1, 1, 0],
                            scale: [0.9, 1.15, 0.9]
                          }}
                          transition={{ 
                            repeat: Infinity, 
                            duration: Math.max(0.5, 3.2 - glucoseInput * 0.15), 
                            delay: item * 0.35 
                          }}
                          className="w-4.5 h-4.5 rounded-full bg-amber-500 text-[8px] font-black font-mono text-black flex items-center justify-center absolute shadow"
                        >
                          C
                        </motion.div>
                      ))}
                    </div>

                    {/* Precursor L-Glutamate Output */}
                    <div className="flex flex-col items-center z-10">
                      <motion.div 
                        animate={isFbaSolving ? { rotate: [0, 180, 360], scale: [1, 1.25, 1] } : {}}
                        transition={{ duration: 1.0 }}
                        className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center justify-center font-bold text-xs uppercase font-mono"
                      >
                        L-Glu
                      </motion.div>
                      <span className="text-[9px] font-mono text-slate-550 dark:text-slate-400 mt-1">{fbaMetrics.v_glutamate.toFixed(1)} mmol</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-center text-slate-550 dark:text-slate-400 italic font-mono leading-relaxed">
                    {isFbaSolving 
                      ? "▶ FBA Matrix balanced successfully! Emitting Precursor values downstream..." 
                      : "Drag Glucose slider on the left, then solve to feed numerical matrices downward."}
                  </p>
                </motion.div>
              )}

              {/* STAGE 2 VISUALIZER */}
              {activeStage === 2 && (
                <motion.div
                  key="v-s-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4 w-full flex-1 flex flex-col justify-between"
                >
                  <div className="flex justify-between items-center text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
                    <span>Dynamic Time-Series Translation Curve (48h)</span>
                    <span className="text-emerald-700 dark:text-emerald-450 font-bold block">PGA Yield: {odeKinetics.finalPgaYield.toFixed(1)} g/L</span>
                  </div>

                  {/* SVG Line plots */}
                  <div className="h-44 w-full bg-white dark:bg-[#020409] border border-slate-205 dark:border-slate-900 rounded-xl p-3 relative flex flex-col justify-between">
                    {/* Mini legends */}
                    <div className="flex justify-center gap-4 text-[9px] font-mono">
                      <span className="flex items-center gap-1 text-purple-650 dark:text-purple-400">
                        <span className="w-2.5 h-0.5 bg-purple-500 inline-block" /> mRNA
                      </span>
                      <span className="flex items-center gap-1 text-sky-655 dark:text-sky-400">
                        <span className="w-2.5 h-0.5 bg-sky-500 inline-block" /> Enzyme
                      </span>
                      <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-450">
                        <span className="w-2.5 h-0.5 bg-emerald-500 inline-block" /> γ-PGA Polymer
                      </span>
                    </div>

                    <div className="flex-1 min-h-[100px] relative mt-1">
                      <svg viewBox="0 0 500 100" width="100%" height="100%">
                        {/* Mesh grid */}
                        <line x1="0" y1="90" x2="500" y2="90" stroke="#475569" strokeWidth="0.8" opacity="0.3" />
                        <line x1="0" y1="45" x2="500" y2="45" stroke="#475569" strokeWidth="0.8" strokeDasharray="2,3" opacity="0.15" />
                        <line x1="250" y1="0" x2="250" y2="100" stroke="#475569" strokeWidth="0.8" strokeDasharray="2,3" opacity="0.15" />

                        {/* mRNA curve path */}
                        <path 
                          d={`M 0 90 ${odeKinetics.points.map(pt => `L ${(pt.hour / 48) * 500} ${90 - (pt.mrna / 100) * 80}`).join(' ')}`}
                          fill="none"
                          stroke="#a855f7"
                          strokeWidth="2"
                        />

                        {/* Enzyme curve path */}
                        <path 
                          d={`M 0 90 ${odeKinetics.points.map(pt => `L ${(pt.hour / 48) * 500} ${90 - (pt.enzyme / 100) * 80}`).join(' ')}`}
                          fill="none"
                          stroke="#06b6d4"
                          strokeWidth="2"
                        />

                        {/* PGA Accumulation path */}
                        <path 
                          d={`M 0 90 ${odeKinetics.points.map(pt => `L ${(pt.hour / 48) * 500} ${90 - (pt.pga / 120) * 80}`).join(' ')}`}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2.5"
                        />
                      </svg>
                    </div>

                    {/* Chart baseline axes labels */}
                    <div className="flex justify-between items-center text-[8.5px] font-mono text-slate-500 px-1 mt-1">
                      <span>0 Hour (Inoculation)</span>
                      <span>24 Hours (Middle phase)</span>
                      <span>48 Hours (Full Yield)</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-center text-slate-550 dark:text-slate-400 font-mono italic">
                    {`*Glucose Input directly dictates overall scale. Peak PGA yield solves dynamically to ${odeKinetics.finalPgaYield.toFixed(2)} g/L.`}
                  </p>
                </motion.div>
              )}

              {/* STAGE 3 VISUALIZER */}
              {activeStage === 3 && (
                <motion.div
                  key="v-s-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4 w-full flex-1 flex flex-col justify-between"
                >
                  <div className="flex justify-between items-center text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
                    <span>Proteic Lattice Stability &amp; Crosslinking Status</span>
                    <span className="text-sky-700 dark:text-sky-450 font-bold">Gs Modulus: {biophysicalMetrics.shearModulusGs.toFixed(0)} Pa</span>
                  </div>

                  {/* Sand crystal visual crosslinking block */}
                  <div className="h-44 border border-slate-205 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-[#03060c] flex items-center justify-around relative">
                    
                    {/* Left grain box */}
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-14 h-14 rounded-full bg-amber-200/40 text-amber-800 dark:bg-amber-950/20 dark:text-amber-500 border border-amber-300/40 flex items-center justify-center font-bold text-[10px] text-center uppercase font-mono shadow-sm">
                        Quartz Grain 1
                      </div>
                    </div>

                    {/* Biophysical molecular crosslink binding cords */}
                    <div className="flex-1 max-w-xs h-10 relative flex items-center justify-center">
                      <svg width="100%" height="40" className="overflow-visible">
                        {[1, 2, 3].map((val) => (
                          <motion.path
                            key={val}
                            d={`M 0 ${10 + val * 6} Q 70 ${val * 12} 140 ${10 + val * 6}`}
                            fill="none"
                            stroke={biophysicalMetrics.foldedStability > 0.5 ? "#0ea5e9" : "#ef4444"}
                            strokeWidth={Math.max(1, 4 * biophysicalMetrics.foldedStability)}
                            strokeDasharray={biophysicalMetrics.foldedStability < 0.3 ? "2,2" : ""}
                            className="transition-all duration-300"
                            animate={{ y: [0, -3 + val, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5 + val, ease: "easeInOut" }}
                          />
                        ))}
                      </svg>
                      {/* Stability multiplier banner badge */}
                      <span className={`absolute top-1/2 -translate-y-1/2 text-[8px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                        biophysicalMetrics.foldedStability > 0.5
                          ? 'bg-sky-100 text-sky-850 dark:bg-sky-950/60 dark:text-sky-400'
                          : 'bg-red-100 text-red-850 dark:bg-red-950/60 dark:text-red-400'
                      }`}>
                        {(biophysicalMetrics.foldedStability * 100).toFixed(0)}% STABLE
                      </span>
                    </div>

                    {/* Right grain box */}
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-14 h-14 rounded-full bg-amber-200/40 text-amber-850 dark:bg-amber-950/20 dark:text-amber-500 border border-amber-300/40 flex items-center justify-center font-bold text-[10px] uppercase font-mono shadow-sm">
                        Quartz Grain 2
                      </div>
                    </div>

                  </div>

                  <p className="text-[10px] text-slate-550 dark:text-slate-400 text-center font-mono italic">
                    {`At high temperatures, denaturation reduces cross-linking density. Active Ground Temperature: ${desertTemp.toFixed(1)}°C.`}
                  </p>
                </motion.div>
              )}

              {/* STAGE 4 VISUALIZER: Kinetic Wind Tunnel Simulation & LIVE PLOT */}
              {activeStage === 4 && (
                <motion.div
                  key="v-s-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4 w-full flex-1 flex flex-col justify-between"
                >
                  <div className="flex justify-between items-center text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
                    <span>Live Wind Erosion Tunnel (15 Second Blast Loop)</span>
                    <span className="text-pink-700 dark:text-pink-400 font-bold uppercase blink font-mono">
                      {isWindActive ? "RUNNING BLAST SIMULATION..." : "STANDBY"}
                    </span>
                  </div>

                  {/* SVG Double line plotting graph */}
                  <div className="h-44 w-full bg-white dark:bg-[#020308] border border-slate-205 dark:border-slate-900 rounded-xl p-3 relative flex flex-col justify-between">
                    
                    {/* Live Line Chart legends */}
                    <div className="flex justify-center gap-4 text-[9px] font-mono">
                      <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-500 font-bold">
                        <span className="w-2.5 h-0.5 bg-amber-600 inline-block" /> Untreated Sand
                      </span>
                      <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-450 font-bold">
                        <span className="w-2.5 h-0.5 bg-emerald-500 inline-block" /> Biofilm Protected
                      </span>
                    </div>

                    {/* Live Plotting Surface */}
                    <div className="flex-1 min-h-[100px] relative mt-1">
                      <svg viewBox="0 0 500 100" width="100%" height="100%">
                        {/* Horizontal guides */}
                        <line x1="0" y1="90" x2="500" y2="90" stroke="#475569" strokeWidth="0.8" opacity="0.3" />
                        <line x1="0" y1="45" x2="500" y2="45" stroke="#475569" strokeWidth="0.8" strokeDasharray="2,3" opacity="0.15" />
                        <line x1="0" y1="10" x2="500" y2="10" stroke="#ef4444" strokeWidth="0.8" strokeDasharray="3,3" opacity="0.3" />
                        
                        {/* 100% Failure mark */}
                        <text x="4" y="16" fill="#ef4444" fontSize="7" fontFamily="monospace" opacity="0.8">100% EROSION LIMIT</text>

                        {/* Plot 1: Untreated Control (Heavy path) */}
                        {liveControlErosion.length > 1 && (
                          <path
                            d={`M 0 90 ${liveControlErosion.map(p => `L ${(p.x / 15) * 500} ${90 - (p.y / 100) * 80}`).join(' ')}`}
                            fill="none"
                            stroke="#ca8a04"
                            strokeWidth="2.5"
                          />
                        )}

                        {/* Plot 2: Protected Biofilm sand */}
                        {liveBiofilmErosion.length > 1 && (
                          <path
                            d={`M 0 90 ${liveBiofilmErosion.map(p => `L ${(p.x / 15) * 500} ${90 - (p.y / 100) * 80}`).join(' ')}`}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="2.5"
                          />
                        )}

                        {/* Live Stopwatch Cursor vertical ticker */}
                        {isWindActive && (
                          <line 
                            x1={(windSimulationTime / 15) * 500} 
                            y1="0" 
                            x2={(windSimulationTime / 15) * 500} 
                            y2="100" 
                            stroke="#a855f7" 
                            strokeWidth="1" 
                            strokeDasharray="2,2" 
                          />
                        )}
                      </svg>
                    </div>

                    <div className="flex justify-between items-center text-[8px] font-mono text-slate-500 mt-1 px-1">
                      <span>0.0 Seconds</span>
                      <span>Exposure Timeline</span>
                      <span>15.0 Seconds</span>
                    </div>

                  </div>

                  <p className="text-[10px] text-center text-slate-550 dark:text-slate-400 font-mono italic">
                    {`Storm Wind Force parameter: ${stormWindForce.toFixed(0)} m/s vs sand crust threshold resistance limit: ${aeolianThreshold.thresholdWindSpeed.toFixed(1)} m/s.`}
                  </p>

                </motion.div>
              )}

              {/* STAGE 5 VISUALIZER */}
              {activeStage === 5 && (
                <motion.div
                  key="v-s-5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4 w-full flex-1 flex flex-col justify-between"
                >
                  <div className="flex justify-between items-center text-[10.5px] font-mono uppercase tracking-wider text-slate-500">
                    <span>Field Application Instruction Sheet</span>
                    <span className="text-indigo-700 dark:text-indigo-400 font-bold font-mono">Ready to Export</span>
                  </div>

                  <div className="h-44 border border-slate-205 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-[#03060c] flex flex-col justify-between">
                    <div className="space-y-2 font-mono text-[10px] text-slate-705 dark:text-slate-350">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-indigo-505 rounded-full" />
                        <span>Inoculation Cycle duration: <strong className="text-indigo-700 dark:text-indigo-400">{wetLabProtocol.incubationTimeHr.toFixed(1)} hours</strong> inside the cell reactors.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-indigo-505 rounded-full" />
                        <span>Spray Density requirement: <strong className="text-indigo-700 dark:text-indigo-400">{wetLabProtocol.sprayVolumeMlm2.toFixed(0)} mL / m²</strong> liquid mixture.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-indigo-505 rounded-full" />
                        <span>Weather Comp Safety buffer: <strong className="text-indigo-700 dark:text-indigo-400">{wetLabProtocol.thermalSafetyMultiplier.toFixed(2)}x</strong> multiplier.</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-indigo-50 dark:bg-[#020610] border border-indigo-200/40 dark:border-indigo-950/60 rounded-xl text-[9px] text-slate-550 dark:text-slate-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span>Always scale cultivation ratios carefully to match raw feedstock bounds for best performance.</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-550 dark:text-slate-400 text-center font-mono italic">
                    This protocol sheet has successfully updated to mirror Stage 1 carbon rate changes.
                  </p>
                </motion.div>
              )}

            </AnimatePresence>

          </div>

        </div>

      </div>

      {/* COHESIVE RESULTS & WET LAB TRANSLATION SCORECARD DASHBOARD (THEpayload) */}
      <div className={`p-6 rounded-2xl border ${
        isLightMode 
          ? 'bg-white border-slate-205 text-slate-900 shadow-md' 
          : 'bg-slate-950 border-slate-850'
      }`}>
        <div className={`flex justify-between items-center mb-5 pb-3 border-b border-dashed ${
          isLightMode ? 'border-slate-200' : 'border-slate-850'
        }`}>
          <div className="flex items-center gap-2">
            <Calculator className={`w-5 h-5 ${isLightMode ? 'text-indigo-900' : 'text-indigo-300'}`} />
            <h3 className={`text-base font-extrabold uppercase font-mono tracking-tight ${isLightMode ? 'text-slate-900' : 'text-slate-50'}`}>
              Unified Multiscale Scorecard Dashboard
            </h3>
          </div>
          <span className={`text-[9px] font-mono uppercase ${isLightMode ? 'text-slate-650 font-bold' : 'text-slate-500'}`}>
            Autocalulating cascading metrics
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* PANEL A: Erosion comparative timers */}
          <div className="space-y-3.5">
            <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider font-mono ${
              isLightMode ? 'text-pink-905' : 'text-pink-400'
            }`}>
              <Hourglass className="w-4 h-4" />
              <span>Panel A: Failure Stopwatch</span>
            </div>

            <div className={`p-4 rounded-xl space-y-3 font-mono border ${
              isLightMode 
                ? 'bg-slate-50 border-slate-200 text-slate-900' 
                : 'bg-slate-900 border-slate-850 text-slate-50'
            }`}>
              <div className="flex justify-between items-center">
                <span className={`text-[10.5px] ${isLightMode ? 'text-slate-700' : 'text-slate-400'}`}>Control Fail-Time:</span>
                <span className={`text-xs font-black ${isLightMode ? 'text-amber-900 font-extrabold' : 'text-[#ca8a04]'}`}>
                  {stopwatchMetrics.controlSec.toFixed(1)} Secs
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className={`text-[10.5px] ${isLightMode ? 'text-slate-700' : 'text-slate-400'}`}>Treated Fail-Time:</span>
                <span className={`text-xs font-black ${isLightMode ? 'text-emerald-950' : 'text-emerald-400'}`}>
                  {stopwatchMetrics.isImmune ? "15.0+ Secs (STABLE)" : `${stopwatchMetrics.bioSec.toFixed(1)} Secs`}
                </span>
              </div>

              <div className={`pt-2 border-t flex justify-between items-center text-[11px] ${
                isLightMode ? 'border-slate-200' : 'border-slate-800'
              }`}>
                <span className={isLightMode ? 'text-slate-700' : 'text-slate-400'}>Structural Safety Delta:</span>
                <span className={`font-black ${isLightMode ? 'text-indigo-905' : 'text-indigo-300'}`}>
                  {stopwatchMetrics.isImmune 
                    ? `>${(15.0 / stopwatchMetrics.controlSec).toFixed(1)}x Protection`
                    : `${stopwatchMetrics.safetyMarginRatio.toFixed(1)}x Protection`
                  }
                </span>
              </div>
            </div>
          </div>

          {/* PANEL B: Field spray requirements */}
          <div className="space-y-3.5">
            <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider font-mono ${
              isLightMode ? 'text-emerald-900' : 'text-emerald-400'
            }`}>
              <FlaskConical className="w-4 h-4" />
              <span>Panel B: Wet Lab Protocol</span>
            </div>

            <div className={`p-4 rounded-xl space-y-3 font-mono border ${
              isLightMode 
                ? 'bg-slate-50 border-slate-200 text-slate-900' 
                : 'bg-slate-900 border-slate-850 text-slate-50'
            }`}>
              <div className="flex justify-between items-center">
                <span className={`text-[10.5px] ${isLightMode ? 'text-slate-700' : 'text-slate-400'}`}>Incubator Time:</span>
                <span className={`text-xs font-black ${isLightMode ? 'text-indigo-900' : 'text-indigo-300'}`}>
                  {wetLabProtocol.incubationTimeHr.toFixed(1)} Hours
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className={`text-[10.5px] ${isLightMode ? 'text-slate-700' : 'text-slate-400'}`}>Target Spray Volume:</span>
                <span className={`text-xs font-black ${isLightMode ? 'text-indigo-900' : 'text-indigo-300'}`}>
                  {wetLabProtocol.sprayVolumeMlm2.toFixed(0)} mL/m²
                </span>
              </div>

              <div className={`pt-2 border-t flex justify-between items-center text-[11px] ${
                isLightMode ? 'border-slate-200' : 'border-slate-800'
              }`}>
                <span className={isLightMode ? 'text-slate-700' : 'text-slate-400'}>Thermal Safety Buffer:</span>
                <span className={`font-black ${isLightMode ? 'text-red-900' : 'text-red-400'}`}>
                  {wetLabProtocol.thermalSafetyMultiplier.toFixed(2)}x scale
                </span>
              </div>
            </div>
          </div>

          {/* PANEL C: Macro scale financials */}
          <div className="space-y-3.5">
            <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider font-mono ${
              isLightMode ? 'text-sky-900' : 'text-sky-300'
            }`}>
              <DollarSign className="w-4.5 h-4.5" />
              <span>Panel C: Macro Economics</span>
            </div>

            <div className={`p-4 rounded-xl space-y-3 font-mono border ${
              isLightMode 
                ? 'bg-slate-50 border-slate-200 text-slate-900' 
                : 'bg-slate-900 border-slate-850 text-slate-50'
            }`}>
              <div className="flex justify-between items-center">
                <span className={`text-[10.5px] ${isLightMode ? 'text-slate-700' : 'text-slate-400'}`}>Volume / Hectare:</span>
                <span className={`text-xs font-black ${isLightMode ? 'text-indigo-900' : 'text-indigo-400'}`}>
                  {(macroEconomics.totalVolumeLitresRequired).toLocaleString(undefined, { maximumFractionDigits: 0 })} Liters
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className={`text-[10.5px] ${isLightMode ? 'text-slate-700' : 'text-slate-400'}`}>Medium cost / Liter:</span>
                <span className={`text-xs font-black ${isLightMode ? 'text-indigo-900' : 'text-indigo-400'}`}>
                  $0.14 USD
                </span>
              </div>

              <div className={`pt-2 border-t flex justify-between items-center text-[11px] ${
                isLightMode ? 'border-slate-200' : 'border-slate-800'
              }`}>
                <span className={isLightMode ? 'text-slate-700' : 'text-slate-400'}>Estimated Cost / Hectare:</span>
                <span className={`font-black ${isLightMode ? 'text-emerald-900' : 'text-emerald-400'}`}>
                  ${(macroEconomics.costPerHectareUsd).toLocaleString(undefined, { maximumFractionDigits: 1 })} USD
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
