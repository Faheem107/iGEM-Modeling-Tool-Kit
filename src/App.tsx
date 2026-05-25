import { useState, useMemo, useEffect, useRef } from 'react';
import MetabolicModel from './components/MetabolicModel';
import CrossLinkingBiophysics from './components/CrossLinkingBiophysics';
import AeolianWindTunnel from './components/AeolianWindTunnel';
import EcologicalSpread from './components/EcologicalSpread';
import HighFidelityProteinExplorer from './components/HighFidelityProteinExplorer';
import WetLabSandbox2D from './components/WetLabSandbox2D';

import { 
  Dna, 
  Wind, 
  Layers, 
  Bug, 
  Sparkles, 
  ArrowRight, 
  BookOpen, 
  ShieldCheck,
  Workflow,
  Download,
  Flame,
  Globe,
  HelpCircle,
  Sliders,
  Award
} from 'lucide-react';
import { MetabolicParams, BiophysicsParams, AeolianParams, CAConfig } from './types';

type ViewMode = 'landing' | 'pipeline' | 'wetlab-sandbox' | 'protein-suite';
type TabType = 'metabolic' | 'crosslink' | 'aeolian' | 'ecological';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [activeTab, setActiveTab] = useState<TabType>('metabolic');

  // --- Central Simulation Orchestrator States ---
  const [metabolicParams, setMetabolicParams] = useState<MetabolicParams>({
    alpha_m: 0.12,
    beta_m: 0.02,
    alpha_e: 0.08,
    beta_e: 0.01,
    k_cat: 4.5,
    s_precursor: 2.5,
    k_m: 1.5,
    k_deg: 0.05,
    ggtKnockout: true,
    pgcAKnockout: true,
  });

  const [crosslinkParams, setCrosslinkParams] = useState<BiophysicsParams>({
    ion_conc: 10.0,
    Kd: 4.0,
    rho_polymer: 3.5,
    temperature: 298.15,
    Mx: 350,
    Mn: 25000,
  });

  const [aeolianParams, setAeolianParams] = useState<AeolianParams>({
    sand_diameter: 0.00025, // 0.25 mm (medium sand)
    wind_velocity: 0.35,     // wind friction speed u* (m/s)
    biofilm_cohesion: 0.0002, // gamma cohesive parameter
  });

  const [ecologicalConfig, setEcologicalConfig] = useState<CAConfig>({
    gridSize: 50,
    spreadProb: 0.45,
    resourceConsume: 0.12,
    initialInoculation: 'center',
    killSwitchDelay: 10,
  });

  // STORE Structural Calibration values persistently in the parent state (Requirement 2)
  const [targetYield, setTargetYield] = useState<number>(120);
  const [calibratedKcat, setCalibratedKcat] = useState<number | null>(() => {
    const saved = localStorage.getItem('calibrated_k_cat_v6');
    return saved ? parseFloat(saved) : null;
  });

  useEffect(() => {
    if (calibratedKcat !== null) {
      localStorage.setItem('calibrated_k_cat_v6', calibratedKcat.toString());
    } else {
      localStorage.removeItem('calibrated_k_cat_v6');
    }
  }, [calibratedKcat]);

  // Derived outputs passing between modules
  const [pgaAccum, setPgaAccum] = useState<number>(35.0);
  const [shearModulus, setShearModulus] = useState<number>(1450.0);

  // Link status toggles
  const [isLinkedPga, setIsLinkedPga] = useState<boolean>(true);
  const [isLinkedShear, setIsLinkedShear] = useState<boolean>(true);
  const [isLinkedSpread, setIsLinkedSpread] = useState<boolean>(true);

  // --- Onboarding Splash Flags (Requirement 4) ---
  const [activeWetlabStarted, setActiveWetlabStarted] = useState<boolean>(true);
  const [activePipelineStarted, setActivePipelineStarted] = useState<boolean>(true);
  const [activeProteinStarted, setActiveProteinStarted] = useState<boolean>(true);

  const handleBackToLanding = () => {
    setViewMode('landing');
    setActiveWetlabStarted(true);
    setActivePipelineStarted(true);
    setActiveProteinStarted(true);
  };

  // --- Particle Background Renderer for Landing Page ---
  const headerCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (viewMode !== 'landing' || !headerCanvasRef.current) return;
    const canvas = headerCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      alpha: number;
      phase: number;
    }> = [];

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // Seed sandy and peptidic glowing coordinates
    const count = 120;
    const colors = [
      '#22d3ee', // Cyan
      '#34d399', // Emerald green
      '#fbbf24', // Gold sand
      '#6366f1', // Indigo
      '#3b82f6'  // Blue
    ];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2.2 + 0.8,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.5 + 0.25,
        phase: Math.random() * Math.PI * 2
      });
    }

    // Mouse movement interactive variables
    let pointerX = -1000;
    let pointerY = -1000;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerX = e.clientX - rect.left;
      pointerY = e.clientY - rect.top;
    };
    const handleMouseLeave = () => {
      pointerX = -1000;
      pointerY = -1000;
    };
    const handleCanvasClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      // Emit sudden surge of beautiful particles
      for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2.5 + 0.8;
        particles.push({
          x: clickX,
          y: clickY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: Math.random() * 2.5 + 1.2,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 0.9,
          phase: Math.random() * Math.PI * 2
        });
      }
      // Trim to avoid too many elements
      if (particles.length > 250) {
        particles = particles.slice(particles.length - 200);
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('click', handleCanvasClick);

    // Track mouse-based painting of biopolymers
    let lastMouseX = -1;
    let lastMouseY = -1;

    const handlePaintBioPolymer = (e: MouseEvent) => {
      if (viewMode !== 'landing') return;
      const rect = canvas.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      if (lastMouseX !== -1) {
        const dist = Math.hypot(currentX - lastMouseX, currentY - lastMouseY);
        if (dist > 8) {
          // Spawn active binding particles as user drags mouse
          particles.push({
            x: currentX,
            y: currentY,
            vx: (Math.random() - 0.5) * 0.5 + (currentX - lastMouseX) * 0.08,
            vy: (Math.random() - 0.5) * 0.5 + (currentY - lastMouseY) * 0.08,
            radius: Math.random() * 1.8 + 1.2,
            color: colors[Math.floor(Math.random() * colors.length)],
            alpha: 0.85,
            phase: Math.random() * Math.PI * 2
          });
          if (particles.length > 250) {
            particles.shift();
          }
        }
      }
      lastMouseX = currentX;
      lastMouseY = currentY;
    };
    canvas.addEventListener('mousemove', handlePaintBioPolymer);

    let globalTime = 0;
    const animate = () => {
      globalTime += 0.006;
      
      // Cinematic transparent background clearing for comet trailing sand trails!
      ctx.fillStyle = 'rgba(3, 5, 8, 0.18)'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw faint structural science grids representing simulation nodes
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.02)';
      ctx.lineWidth = 1;
      const gridSize = 100;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw an abstract rotating golden bio-netting center-stage
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.022)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 180 + Math.sin(globalTime) * 20, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(34, 211, 238, 0.015)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 320 + Math.cos(globalTime * 0.8) * 35, 0, Math.PI * 2);
      ctx.stroke();

      // Update and Draw connecting webs first with beautiful polymer matrix look
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const pi = particles[i];
          const pj = particles[j];
          if (!pi || !pj) continue;
          const dist = Math.hypot(pi.x - pj.x, pi.y - pj.y);
          if (dist < 90) {
            const opacity = (1.0 - dist / 90) * 0.18 * Math.min(pi.alpha, pj.alpha);
            // Dynamic color blending based on interaction state
            ctx.strokeStyle = pi.color === pj.color 
              ? `rgba(52, 211, 153, ${opacity})` 
              : `rgba(34, 211, 238, ${opacity * 0.75})`;
            ctx.lineWidth = 0.55;
            ctx.beginPath();
            ctx.moveTo(pi.x, pi.y);
            ctx.lineTo(pj.x, pj.y);
            ctx.stroke();
          }
        }
      }

      // Render individual particle bodies
      particles.forEach((p, idx) => {
        if (!p) return;
        // Gravitational attraction / repulsion to pointer
        if (pointerX > 0) {
          const dx = pointerX - p.x;
          const dy = pointerY - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 200) {
            // Stronger wind blowing effect when user hovers nearby - sandstorm reaction!
            const force = (1.0 - dist / 200) * 0.28;
            p.vx += (Math.random() - 0.2) * force * 1.5;
            p.vy += (dy / dist) * force * 0.5;
            p.alpha = Math.min(1.0, p.alpha + 0.1);
          }
        }

        // Apply a gentle horizontal desert wind drift (from left to right) simulating sand transport!
        p.x += p.vx + 0.28; 
        p.y += p.vy + Math.sin(globalTime * 1.5 + p.phase) * 0.08;

        // Apply progressive friction/drag so sudden gusts dissipate elegantly
        p.vx *= 0.96;
        p.vy *= 0.96;

        // Sand storm boundaries wrap with elegant random height re-distribution
        if (p.x < 0) {
          p.x = canvas.width;
          p.y = Math.random() * canvas.height;
        }
        if (p.x > canvas.width) {
          p.x = 0;
          p.y = Math.random() * canvas.height;
        }
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Pulsate opacity for natural twinkling molecular/sand feel
        const pulse = Math.sin(globalTime * 8 + p.phase) * 0.12;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0.12, Math.min(1.0, p.alpha + pulse));

        ctx.beginPath();
        // Render 10% of particles as square crystal salt cubes, remainder as floating peptide cells
        if (idx % 10 === 0) {
          ctx.rect(p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2);
        } else {
          ctx.arc(p.x, p.y, p.radius * 0.9, 0, Math.PI * 2);
        }
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousemove', handlePaintBioPolymer);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('click', handleCanvasClick);
      cancelAnimationFrame(animId);
    };
  }, [viewMode]);

  return (
    <div className="min-h-screen bg-[#030508] text-slate-200 font-sans selection:bg-cyan-500 selection:text-black">
      
      {viewMode === 'landing' && (
        /* LANDING VIEW */
        <div className="relative min-h-screen overflow-hidden flex flex-col justify-between" id="landing-page-frame">
          {/* Interactive particles canvas background */}
          <canvas 
            ref={headerCanvasRef} 
            className="absolute inset-0 w-full h-full pointer-events-auto"
            style={{ zIndex: 0 }}
          />

          <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
            
            {/* NYUAD Logo Header Badge */}
            <div className="flex justify-center mb-5">
              <span className="bg-cyan-950/85 border border-[#14b8a6]/45 text-[#22d3ee] font-mono text-[9px] uppercase tracking-[0.25em] font-black px-4 py-1.5 rounded-full shadow-lg">
                NYUAD iGEM 2026 iGEM Research Module
              </span>
            </div>

            <div className="text-center max-w-4xl mx-auto col-span-full">
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-none uppercase select-none mb-3 font-sans">
                Growing Eco-Friendly Sand Glue to Prevent Dust Storms
              </h1>
              <p className="text-sm text-cyan-400 tracking-wider uppercase font-mono mb-6 max-w-2xl mx-auto">
                Predict and Optimize Your Wet-Lab Enzyme Recipes & Wind Studies
              </p>
              
              <div className="bg-[#0c1220]/80 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl text-left max-w-3xl mx-auto mb-10 text-xs md:text-sm space-y-3 font-sans leading-relaxed shadow-2xl">
                <h3 className="font-bold text-[#22d3ee] uppercase text-xs tracking-wider flex items-center gap-2">
                  <Workflow className="w-4 h-4 text-cyan-400" /> How to use this Toolkit in Your Laboratory:
                </h3>
                <p className="text-slate-300">
                  Our project helps you turn harmless, native soil bacteria (<em className="italic text-slate-200">Bacillus subtilis</em>) into natural glue-producing bio-reactors. By feeding them starter nutrients, they make a sticky, biodegradable web (<strong className="text-emerald-400">gamma-PGA</strong>) that binds loose desert sand grains together.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-800/80">
                  <div className="flex items-start gap-2">
                    <span className="text-[#22d3ee] font-black text-xs">①</span>
                    <p className="text-slate-400">
                      <strong className="text-slate-200 block mb-0.5">Perfect Recipe Mixes</strong>
                      Find the perfect blend of starter cell concentration and calcium salt density without wasting hours of trial-and-error pipetting.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#22d3ee] font-black text-xs">②</span>
                    <p className="text-slate-400">
                      <strong className="text-slate-200 block mb-0.5">Simulate Wind Resistance</strong>
                      Test if your recipe holding treated sands can withstand heavy desert storm gusts before building physical wind-chamber structures.
                    </p>
                  </div>
                </div>
              </div>
            </div>

              {/* Research Gateways Portals Cards Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 text-left">
                
                {/* Gateway 1: Wet Lab Sandbox */}
                <div 
                  onClick={() => setViewMode('wetlab-sandbox')}
                  className="bg-[#06080d]/85 border border-slate-800/80 hover:border-emerald-500/70 p-5 rounded-xl cursor-pointer transition shadow-xl hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(52,211,153,0.15)] group relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="p-2.5 rounded bg-emerald-950/30 border border-emerald-900/40 text-[#10b981]">
                      <Sliders className="w-5 h-5 text-[#34d399]" />
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 group-hover:text-[#34d399] transition font-bold">LAUNCH PORTAL ◀</span>
                  </div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wide group-hover:text-[#34d399] transition mb-1.5 flex items-center gap-1.5">
                    1. Wet-Lab Sandbox
                  </h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Enter physical parameters from laboratory spectrophotometric assays. Compare treated vs. untreated sand dunes under wind erosion cells in 2D.
                  </p>
                  <div className="absolute right-0 bottom-0 w-24 h-2 bg-gradient-to-r from-transparent to-emerald-500/10"></div>
                </div>

                {/* Gateway 2: Dynamic Modeling Pipeline */}
                <div 
                  onClick={() => setViewMode('pipeline')}
                  className="bg-[#06080d]/85 border border-slate-800/80 hover:border-[#06b6d4]/70 p-5 rounded-xl cursor-pointer transition shadow-xl hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] group relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="p-2.5 rounded bg-cyan-950/30 border border-cyan-900/40 text-cyan-400">
                      <Workflow className="w-5 h-5 text-cyan-400 animate-pulse" />
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 group-hover:text-cyan-400 transition font-bold">LAUNCH PORTAL ◀</span>
                  </div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wide group-hover:text-cyan-400 transition mb-1.5 flex items-center gap-1.5">
                    2. Physical Pipeline
                  </h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Explore our integrated dry lab pipeline. Simulate metabolic model kinetics, cross-linking isotherms, wind-shear, and ecological cellular growth dynamics.
                  </p>
                  <div className="absolute right-0 bottom-0 w-24 h-2 bg-gradient-to-r from-transparent to-cyan-500/10"></div>
                </div>

                {/* Gateway 3: 3D Protein Suite */}
                <div 
                  onClick={() => setViewMode('protein-suite')}
                  className="bg-[#06080d]/85 border border-slate-800/80 hover:border-indigo-505/70 p-5 rounded-xl cursor-pointer transition shadow-xl hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] group relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="p-2.5 rounded bg-indigo-950/30 border border-indigo-900/40 text-indigo-400">
                      <Globe className="w-5 h-5 text-indigo-400" />
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 group-hover:text-indigo-400 transition font-bold">LAUNCH PORTAL ◀</span>
                  </div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wide group-hover:text-indigo-400 transition mb-1.5 flex items-center gap-1.5">
                    3. 3D Protein Suite
                  </h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Inspect high-fidelity cell-shaded structures of the synthesized Bacillus enzyme complexes with realistic coordinates guidelines.
                  </p>
                  <div className="absolute right-0 bottom-0 w-24 h-2 bg-gradient-to-r from-transparent to-indigo-500/10"></div>
                </div>

              </div>

            </div>

            {/* Brief Laboratory Workflows section */}
            <div className="border-t border-slate-800/70 pt-10">
              <h3 className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-500 text-center mb-6 font-mono">
                PRACTICAL APPLICATIONS IN YOUR RESEARCH
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Flow 1 */}
                <div className="bg-[#06080d]/80 backdrop-blur-sm p-4 rounded-xl border border-slate-900/90 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-black text-cyan-400 font-mono uppercase tracking-wider block mb-2">
                      I. Calibrate Bacterial Growth
                    </span>
                    <div className="py-2 px-3 bg-black/40 rounded border border-slate-900 font-sans text-xs text-slate-300 leading-relaxed">
                      Optimize incubation parameters (like 37°C targets) and nutrient concentrations to maximize bio-glue mass generation before prepping physical agar plates.
                    </div>
                  </div>
                  <p className="text-[9px] text-[#22d3ee]/70 font-mono mt-3 uppercase tracking-wider">
                    → SAVE HOURS OF CULTURE MEDIATING
                  </p>
                </div>

                {/* Flow 2 */}
                <div className="bg-[#06080d]/80 backdrop-blur-sm p-4 rounded-xl border border-slate-900/90 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-black text-amber-400 font-mono uppercase tracking-wider block mb-2">
                      II. Calculate Salt Ratios
                    </span>
                    <div className="py-2 px-3 bg-black/40 rounded border border-slate-900 font-sans text-xs text-slate-300 leading-relaxed">
                      Calibrate the perfect magnesium and calcium mineral salt concentrations to bind individual monomer fibers into tough, durable soil netting.
                    </div>
                  </div>
                  <p className="text-[9px] text-amber-400/80 font-mono mt-3 uppercase tracking-wider">
                    → ELIMINATE CHELATION GUESSWORK
                  </p>
                </div>

                {/* Flow 3 */}
                <div className="bg-[#06080d]/80 backdrop-blur-sm p-4 rounded-xl border border-slate-900/90 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-black text-emerald-400 font-mono uppercase tracking-wider block mb-2">
                      III. Wind Stress Thresholds
                    </span>
                    <div className="py-2 px-3 bg-black/40 rounded border border-slate-900 font-sans text-xs text-slate-300 leading-relaxed">
                      Convert laboratory soil stiffness readings directly into wind resistance speeds (m/s) to see if treated sands stay secure during Liwa wind gales.
                    </div>
                  </div>
                  <p className="text-[9px] text-emerald-400/80 font-mono mt-3 uppercase tracking-wider">
                    → PREDICT SHEAR FORCE SUCCESS
                  </p>
                </div>

                {/* Flow 4 */}
                <div className="bg-[#06080d]/80 backdrop-blur-sm p-4 rounded-xl border border-slate-900/90 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-black text-indigo-400 font-mono uppercase tracking-wider block mb-2">
                      IV. Safety Biosensors
                    </span>
                    <div className="py-2 px-3 bg-black/40 rounded border border-slate-900 font-sans text-xs text-slate-300 leading-relaxed">
                      Simulate built-in genetic kill switches to ensure bacterial soil coatings only stay alive in wet regions and safely degrade in dry desert settings.
                    </div>
                  </div>
                  <p className="text-[9px] text-indigo-300/80 font-mono mt-3 uppercase tracking-wider">
                    → VERIFY 100% REGULATORY SAFETY
                  </p>
                </div>
              </div>
            </div>

          <div className="text-center py-6 text-[10px] text-slate-600 font-mono select-none" style={{ zIndex: 10 }}>
            NYUAD iGEM Simulation Toolkit. Built for iGEM 2026.
          </div>
        </div>
      )}

      {/* 1. Unified Sticky Navigation Header for Deep Portals (Requirement 1 & 4) */}
      {viewMode !== 'landing' && (
        <header className="sticky top-0 z-50 bg-[#05070a]/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-3 flex flex-wrap gap-4 justify-between items-center max-w-7xl mx-auto rounded-b-xl shadow-lg my-2">
          <div 
            onClick={handleBackToLanding}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <span className="bg-emerald-950 border border-emerald-500/60 text-emerald-400 font-mono text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded">
              NYUAD iGEM
            </span>
            <span className="text-white text-xs font-bold tracking-wide group-hover:text-emerald-400 transition font-sans">
              Sand Bio-Stabilizer Toolkit
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs">
            <button 
              onClick={handleBackToLanding}
              className="text-[11px] text-slate-400 hover:text-white px-2 py-1 transition rounded font-medium font-sans"
            >
              ← Back Home
            </button>
            <div className="w-px h-3.5 bg-slate-800 mx-1.5" />
            
            <button 
              onClick={() => { setViewMode('wetlab-sandbox'); }}
              className={`text-[11px] px-3 py-1.5 transition rounded-lg font-semibold font-sans ${viewMode === 'wetlab-sandbox' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Wet-Lab Sandbox
            </button>
            <button 
              onClick={() => { setViewMode('pipeline'); }}
              className={`text-[11px] px-3 py-1.5 transition rounded-lg font-semibold font-sans ${viewMode === 'pipeline' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Dry-Lab Pipeline
            </button>
            <button 
              onClick={() => { setViewMode('protein-suite'); }}
              className={`text-[11px] px-3 py-1.5 transition rounded-lg font-bold font-sans flex items-center gap-1 ${viewMode === 'protein-suite' ? 'bg-[#6366f1]/15 text-[#a5b4fc] border border-indigo-500/35' : 'text-indigo-400 hover:text-indigo-300'}`}
            >
              ✨ 3D Protein Suite
            </button>
          </div>
        </header>
      )}

      {/* PORTAL 1: Wet Lab Sandbox onboarding & simulation views */}
      {viewMode === 'wetlab-sandbox' && (
        <div className="max-w-7xl mx-auto px-4 md:px-0">
          {!activeWetlabStarted ? (
            /* Splash Onboarding for Wet-Lab Sandbox */
            <div className="min-h-[70vh] flex items-center justify-center p-6 font-sans">
              <div className="max-w-md w-full bg-[#0a0f18]/90 border border-slate-800 p-8 rounded-2xl shadow-2xl relative overflow-hidden text-center space-y-5 animate-fadeIn">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-950/40 border border-emerald-800 flex items-center justify-center text-[#34d399]">
                  <Sliders className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono font-bold text-[#34d399] tracking-wider uppercase bg-emerald-950/60 border border-emerald-900/60 px-3 py-1 rounded-full">
                    Portal 1: Recipe Optimizer
                  </span>
                  <h2 className="text-xl font-bold text-white uppercase tracking-tight pt-1">
                    Wet-Lab Sand Simulator
                  </h2>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  Here you can test different laboratory recipes (such as starting cell density, mineral salt density, glutamate feed, and temperature) on a live sandbed. Adjust sliders to see a side-by-side comparative simulation of untreated sand vs sand protected by our organic bacterial glue.
                </p>
                <div className="p-3 bg-[#05070a]/90 border border-slate-900 rounded-xl text-left text-slate-400 text-[10.5px] leading-relaxed">
                  <span className="font-extrabold text-[#34d399] block mb-0.5">🔬 WHAT YOU WILL TEST:</span>
                  The effect of recipe changes on sand erosion under high-speed shamal desert wind gusts.
                </div>
                <div className="flex gap-3 justify-center pt-1.5">
                  <button 
                    onClick={handleBackToLanding}
                    className="px-4 py-2 bg-slate-905 hover:bg-slate-900 text-slate-400 hover:text-slate-200 text-xs rounded-xl border border-slate-800/80 transition"
                  >
                    ◀ Back Home
                  </button>
                  <button 
                    onClick={() => setActiveWetlabStarted(true)}
                    className="px-6 py-2 bg-[#34d399] hover:bg-[#10b981] text-black font-extrabold text-xs rounded-xl shadow-lg hover:shadow-[0_0_15px_rgba(52,211,153,0.3)] transition"
                  >
                    Begin Sandbox Simulation
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Standalone Wet Lab Sandbox view direct link to 2D Sand Grid comparison */
            <WetLabSandbox2D 
              onBack={handleBackToLanding}
              universalVitals={{ pgaAccum, shearModulus }}
            />
          )}
        </div>
      )}

      {/* PORTAL 2: 3D Protein Suite onboarding & visualizer views */}
      {viewMode === 'protein-suite' && (
        <div className="max-w-7xl mx-auto px-4">
          {!activeProteinStarted ? (
            /* Splash Onboarding for 3D Protein Suite */
            <div className="min-h-[70vh] flex items-center justify-center p-6 font-sans">
              <div className="max-w-md w-full bg-[#0a0f18]/90 border border-slate-800 p-8 rounded-2xl shadow-2xl relative overflow-hidden text-center space-y-5 animate-fadeIn">
                <div className="mx-auto w-12 h-12 rounded-full bg-indigo-950/40 border border-indigo-900 flex items-center justify-center text-indigo-400">
                  <Globe className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono font-bold text-indigo-300 tracking-wider uppercase bg-indigo-950/60 border border-indigo-900/60 px-3 py-1 rounded-full">
                    Portal 3: Molecular View
                  </span>
                  <h2 className="text-xl font-bold text-white uppercase tracking-tight pt-1">
                    3D Enzyme Structures
                  </h2>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  Inspect the crystallographic molecular models calibrated for our desert <em className="italic">Bacillus</em> synthesizing enzymes. Drag to rotate atoms in 3D, and spotlight active binding pockets that link substrates to turn sticky glue networks rigid.
                </p>
                <div className="p-3 bg-[#05070a]/90 border border-slate-900 rounded-xl text-left text-slate-400 text-[10.5px] leading-relaxed">
                  <span className="font-extrabold text-indigo-400 block mb-0.5">🧬 WHAT YOU WILL TEST:</span>
                  Interact with real amino acid coordinates (like Lys-181) to see how they anchor substrates inside the molecular active site cleft.
                </div>
                <div className="flex gap-3 justify-center pt-1.5">
                  <button 
                    onClick={handleBackToLanding}
                    className="px-4 py-2 bg-slate-905 hover:bg-slate-900 text-slate-400 hover:text-slate-200 text-xs rounded-xl border border-slate-800/80 transition"
                  >
                    ◀ Back Home
                  </button>
                  <button 
                    onClick={() => setActiveProteinStarted(true)}
                    className="px-6 py-2 bg-[#6366f1] hover:bg-indigo-600 text-white font-extrabold text-xs rounded-xl shadow-lg hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] transition"
                  >
                    Launch 3D Visualizer
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Standalone 3D Protein Imager view */
            <div className="space-y-6 pt-4 animate-fadeIn">
              <HighFidelityProteinExplorer />
            </div>
          )}
        </div>
      )}

      {/* PORTAL 3: Dynamic modeling workspace panel views */}
      {viewMode === 'pipeline' && (
        <div id="dynamic-workspace-frame" className="max-w-7xl mx-auto px-4 md:px-6">
          {!activePipelineStarted ? (
            /* Splash Onboarding for Dry-Lab Pipeline */
            <div className="min-h-[70vh] flex items-center justify-center p-6 font-sans">
              <div className="max-w-md w-full bg-[#0a0f18]/90 border border-slate-800 p-8 rounded-2xl shadow-2xl relative overflow-hidden text-center space-y-5 animate-fadeIn">
                <div className="mx-auto w-12 h-12 rounded-full bg-cyan-950/40 border border-cyan-800 flex items-center justify-center text-cyan-400">
                  <Workflow className="w-5 h-5 text-cyan-400 animate-pulse" />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-wider uppercase bg-cyan-950/60 border border-cyan-900/60 px-3 py-1 rounded-full">
                    Portal 2: Design Pipeline
                  </span>
                  <h2 className="text-xl font-bold text-white uppercase tracking-tight pt-1">
                    Dry-Lab Modeling Pipeline
                  </h2>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  Step through our integrated dry-lab modeling modules. This connecting pipeline starts with cellular growth models, feeds outputs to polymer crosslinking stiffness calculations, tests dunes against gale gusts, and evaluates ecological safety boundaries.
                </p>
                <div className="p-3 bg-[#05070a]/90 border border-slate-900 rounded-xl text-left text-slate-400 text-[10.5px] leading-relaxed">
                  <span className="font-extrabold text-cyan-400 block mb-0.5">🔗 PIPELINE CONNECTION:</span>
                  Modifications inside early phases seamlessly propagate ahead to update soil stiffness thresholds and safety zones.
                </div>
                <div className="flex gap-3 justify-center pt-1.5">
                  <button 
                    onClick={handleBackToLanding}
                    className="px-4 py-2 bg-slate-905 hover:bg-slate-900 text-slate-400 hover:text-slate-200 text-xs rounded-xl border border-slate-800/80 transition"
                  >
                    ◀ Back Home
                  </button>
                  <button 
                    onClick={() => setActivePipelineStarted(true)}
                    className="px-6 py-2 bg-[#22d3ee] hover:bg-[#06b6d4] text-black font-extrabold text-xs rounded-xl shadow-lg hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition"
                  >
                    Launch Pipeline Workspace
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* CORE PIPELINE WORKSPACE CONTENT */
            <div className="space-y-6 pt-4 animate-fadeIn">
              
              {/* Minimal Dashboard Overview Cards (NO REDUNDANCY, ONLY KEY DYNAMIC STATS) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                
                <div className="bg-[#080b12] p-4 rounded-xl border border-slate-800/80 shadow-lg flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Biopolymer Secreted Yield</span>
                    <span className="text-sm font-extrabold text-white block font-mono">{pgaAccum.toFixed(1)} mg/L</span>
                  </div>
                  <div className="bg-cyan-950/30 p-2 rounded border border-cyan-800/40">
                    <Dna className="w-4 h-4 text-cyan-400" />
                  </div>
                </div>

                <div className="bg-[#080b12] p-4 rounded-xl border border-slate-800/80 shadow-lg flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Lattice Shear Modulus</span>
                    <span className="text-sm font-extrabold text-amber-400 block font-mono">{shearModulus.toFixed(1)} Pa</span>
                  </div>
                  <div className="bg-amber-950/30 p-2 rounded border border-amber-900/30">
                    <Layers className="w-4 h-4 text-amber-400" />
                  </div>
                </div>

                <div className="bg-[#080b12] p-4 rounded-xl border border-slate-800/80 shadow-lg flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Erosion Safeguard Factor</span>
                    <span className="text-sm font-extrabold text-emerald-400 block font-mono">
                      {Math.max(1.0, (shearModulus / 1500 + 1)).toFixed(2)}x
                    </span>
                  </div>
                  <div className="bg-emerald-950/30 p-2 rounded border border-emerald-900/30">
                    <Wind className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>

                <div className="bg-[#080b12] p-4 rounded-xl border border-slate-800/80 shadow-lg flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Containment Switch Status</span>
                    <span className="text-sm font-extrabold text-rose-400 block font-mono uppercase">Arid Apoptosis Active</span>
                  </div>
                  <div className="bg-rose-950/30 p-2 rounded border border-rose-900/30">
                    <Bug className="w-4 h-4 text-rose-400" />
                  </div>
                </div>

              </div>

              {/* Input integration system notification badge */}
              <div className="p-3.5 bg-cyan-950/10 border border-cyan-900/30 rounded-lg text-xs text-slate-300 font-semibold mb-6 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Workflow className="w-4.5 h-4.5 text-cyan-500 animate-pulse shrink-0" />
                  <span>
                    <strong>Interactive Synthesis Pipeline Active:</strong> Inputs modifications from metabolic kinetics automatically adjust polymer density and threshold aerodynamics parameters!
                  </span>
                </div>
                <span className="hidden md:inline-block font-mono text-[9px] text-cyan-400 bg-cyan-950/45 px-2.5 py-0.5 rounded border border-cyan-850">
                  PIPELINE BOUND 🔗
                </span>
              </div>

              {/* Modeling approaches selector tabs */}
              <div className="flex flex-wrap gap-2.5 mb-6 border-b border-slate-800 pb-3.5" id="nav-dock-tabs">
                <button
                  onClick={() => setActiveTab('metabolic')}
                  className={`flex-1 min-w-[155px] text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    activeTab === 'metabolic'
                      ? 'bg-cyan-950/20 border-cyan-800 text-cyan-400'
                      : 'bg-[#080b12] border-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  <div className="text-xs font-bold uppercase flex items-center gap-1.5 font-sans">
                    <Dna className="w-3.5 h-3.5 text-cyan-500" />
                    1. Metabolic Flux
                  </div>
                  <div className="text-[9px] opacity-70 italic font-mono pl-5 mt-0.5">PGA Synthase Kinetics</div>
                </button>

                <button
                  onClick={() => setActiveTab('crosslink')}
                  className={`flex-1 min-w-[155px] text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    activeTab === 'crosslink'
                      ? 'bg-cyan-950/20 border-cyan-850 text-cyan-400'
                      : 'bg-[#080b12] border-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  <div className="text-xs font-bold uppercase flex items-center gap-1.5 font-sans">
                    <Layers className="w-3.5 h-3.5 text-cyan-500" />
                    2. Cross-Linking
                  </div>
                  <div className="text-[9px] opacity-70 italic font-mono pl-5 mt-0.5">Chelation & Viscosity</div>
                </button>

                <button
                  onClick={() => setActiveTab('aeolian')}
                  className={`flex-1 min-w-[155px] text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    activeTab === 'aeolian'
                      ? 'bg-cyan-950/20 border-cyan-850 text-cyan-400'
                      : 'bg-[#080b12] border-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  <div className="text-xs font-bold uppercase flex items-center gap-1.5 font-sans">
                    <Wind className="w-3.5 h-3.5 text-cyan-500 text-cyan-500" />
                    3. Aeolian Transport
                  </div>
                  <div className="text-[9px] opacity-70 italic font-mono pl-5 mt-0.5">Sand Shear Strength</div>
                </button>

                <button
                  onClick={() => setActiveTab('ecological')}
                  className={`flex-1 min-w-[155px] text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    activeTab === 'ecological'
                      ? 'bg-cyan-950/20 border-cyan-850 text-cyan-400'
                      : 'bg-[#080b12] border-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  <div className="text-xs font-bold uppercase flex items-center gap-1.5 font-sans">
                    <Bug className="w-3.5 h-3.5 text-cyan-500" />
                    4. Biofilm Expansion
                  </div>
                  <div className="text-[9px] opacity-70 italic font-mono pl-5 mt-0.5">Stochastic Growth CA</div>
                </button>
              </div>

              {/* Introductory Section Explanations for Everyone (Non-Technical summaries) */}
              <div className="mb-6 bg-slate-900/35 border border-slate-800/85 p-5 rounded-xl flex items-start gap-4">
                <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-800/30 text-cyan-400 shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="text-xs">
                  {activeTab === 'metabolic' && (
                    <>
                      <h3 className="font-extrabold text-slate-100 font-sans uppercase tracking-wider text-[11px] mb-1">
                        🧬 Step 1: Cell Growth &amp; Glue Secreting
                      </h3>
                      <p className="text-slate-400 leading-relaxed font-sans text-xs">
                        We grow native soil bacteria called <code className="text-[#22d3ee] font-mono">Bacillus</code>. 
                        By providing nutrients (like glutamate), we trigger their metabolic paths to make natural, sticky poly-glutamic acid (gamma-PGA) glue. 
                        Adjust sliders below to see cell populations grow and optimize physical glue output.
                      </p>
                    </>
                  )}
                  {activeTab === 'crosslink' && (
                    <>
                      <h3 className="font-extrabold text-slate-100 font-sans uppercase tracking-wider text-[11px] mb-1">
                        🔗 Step 2: Locking Chains with Minerals
                      </h3>
                      <p className="text-slate-400 leading-relaxed font-sans text-xs">
                        The bacteria-secreted glue is flexible. To make it hold load stresses, we introduce mineral salt solutions (calcium ions). 
                        The positive mineral charges lock negative polymer rings together. 
                        This cross-linking transforms watery gels into a resilient net that bounds quartz particles tightly.
                      </p>
                    </>
                  )}
                  {activeTab === 'aeolian' && (
                    <>
                      <h3 className="font-extrabold text-slate-100 font-sans uppercase tracking-wider text-[11px] mb-1">
                        🌪 Step 3: Wind-Dunes Stabilization Limits
                      </h3>
                      <p className="text-slate-400 leading-relaxed font-sans text-xs">
                        Once grains are bounded, they become robust ground structures. 
                        This tests wind stress protection as heavy storms blow across a simulated sand bed. 
                        You can trigger severe storm velocities to observe if sand drifts and verify how dense polymer networks hold sands intact.
                      </p>
                    </>
                  )}
                  {activeTab === 'ecological' && (
                    <>
                      <h3 className="font-extrabold text-slate-100 font-sans uppercase tracking-wider text-[11px] mb-1">
                        🧫 Step 4: Environmental Biosafety &amp; Spreading
                      </h3>
                      <p className="text-slate-400 leading-relaxed font-sans text-xs">
                        Will our strains remain contained and safe, or grow uncontrollably? 
                        We designed built-in environmental apoptosis switches so cells only survive in wet Treated Zones and safely degrade in dry environments. 
                        This maps live bacterial expansion to demonstrate 100% biosafety containment.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Dynamic modeling workspace panel views */}
              <div className="transition-all duration-300 shadow-2xl rounded-xl overflow-hidden" id="modeller-workspace-feed">
                {activeTab === 'metabolic' && (
                  <MetabolicModel 
                    params={metabolicParams} 
                    setParams={setMetabolicParams} 
                    onUpdatePgaAccum={setPgaAccum} 
                    targetYield={targetYield}
                    setTargetYield={setTargetYield}
                    calibratedKcat={calibratedKcat}
                    setCalibratedKcat={setCalibratedKcat}
                  />
                )}
                {activeTab === 'crosslink' && (
                  <CrossLinkingBiophysics 
                    params={crosslinkParams} 
                    setParams={setCrosslinkParams} 
                    pgaAccum={pgaAccum}
                    isLinked={isLinkedPga}
                    setIsLinked={setIsLinkedPga}
                    shearModulus={shearModulus}
                    onUpdateShearModulus={setShearModulus}
                  />
                )}
                {activeTab === 'aeolian' && (
                  <AeolianWindTunnel 
                    params={aeolianParams} 
                    setParams={setAeolianParams} 
                    shearModulus={shearModulus}
                    isLinked={isLinkedShear}
                    setIsLinked={setIsLinkedShear}
                  />
                )}
                {activeTab === 'ecological' && (
                  <EcologicalSpread 
                    config={ecologicalConfig} 
                    setConfig={setEcologicalConfig} 
                    pgaAccum={pgaAccum}
                    isLinked={isLinkedSpread}
                    setIsLinked={setIsLinkedSpread}
                  />
                )}
              </div>

              <div className="text-center mt-12 text-[10px] text-slate-600 font-mono py-8 select-none">
                NYUAD iGEM 2026 Simulation Toolkit. All rights reserved.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
