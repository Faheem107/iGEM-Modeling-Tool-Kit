"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '@/components/theme-context';
import MetabolicModel from './components/MetabolicModel';
import AdvancedFbaPortal from './components/AdvancedFbaPortal';
import ProteinThermalDecay from './components/ProteinThermalDecay';
import CrossLinkingBiophysics from './components/CrossLinkingBiophysics';
import AeolianWindTunnel from './components/AeolianWindTunnel';
import EcologicalSpread from './components/EcologicalSpread';
import EconomicScalabilityEngine from './components/EconomicScalabilityEngine';
import HighFidelityProteinExplorer from './components/HighFidelityProteinExplorer';
import WetLabSandbox2D from './components/WetLabSandbox2D';
import GlossaryTerm, { GlossaryProvider } from './components/GlossaryTerm';
import MultiscaleGuidedTour from './components/MultiscaleGuidedTour';

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
  Award,
  Coins,
  Sun,
  Moon
} from 'lucide-react';
import { MetabolicParams, BiophysicsParams, AeolianParams, CAConfig } from './types';

type ViewMode = 'landing' | 'pipeline' | 'wetlab-sandbox' | 'protein-suite' | 'guided-tour';
type TabType = 'metabolic' | 'fba' | 'crosslink' | 'aeolian' | 'ecological' | 'economic';

export default function App() {
  const PORTAL_TABS: TabType[] = ['fba', 'metabolic', 'crosslink', 'aeolian', 'ecological', 'economic'];
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [activePortal, setActivePortal] = useState<number>(0);
  const activeTab = PORTAL_TABS[activePortal];
  const { isLightMode, setIsLightMode } = useTheme();

  // --- Scroll State for Scroll Reveal and Scroll to Top ---
  const [scrollY, setScrollY] = useState<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

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
  const [calibratedKcat, setCalibratedKcat] = useState<number | null>(null);
  const isLoadedRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem('calibrated_k_cat_v6');
      if (saved) {
        setCalibratedKcat(parseFloat(saved));
      }
      isLoadedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!isLoadedRef.current) return;
    if (calibratedKcat !== null) {
      localStorage.setItem('calibrated_k_cat_v6', calibratedKcat.toString());
    } else {
      localStorage.removeItem('calibrated_k_cat_v6');
    }
  }, [calibratedKcat]);

  const handleUpdatePrecursorFlux = (val: number) => {
    // Treat the FBA output direct precursor flux (v_precursor) as starting nutrient substrate availability
    const cleanVal = Math.max(0, val);
    setMetabolicParams(prev => {
      if (Math.abs(prev.s_precursor - cleanVal) < 0.001) return prev;
      return { ...prev, s_precursor: Number(cleanVal.toFixed(4)) };
    });
  };

  // Derived outputs passing between modules
  const [pgaAccum, setPgaAccum] = useState<number>(35.0);
  const [shearModulus, setShearModulus] = useState<number>(1450.0);
  const [environmentalModifier, setEnvironmentalModifier] = useState<number>(1.0);

  // Derived biophysics crust thickness (mm) needed to hold down sand based on physical shear strength
  const calculatedCrustThickness = useMemo(() => {
    // Stiffer sand-polymer matrix (higher shearModulus Pa) requires a thinner overall protective crust depth
    // Baseline required depth: 15.0 mm. Range: 5.0 mm to 45.0 mm.
    const baselineModulus = 1500;
    const thickness = 15.0 * (baselineModulus / Math.max(200, shearModulus));
    return Math.max(5.0, Math.min(45.0, thickness));
  }, [shearModulus]);

  // Link status toggles
  const [isLinkedPga, setIsLinkedPga] = useState<boolean>(true);
  const [isLinkedShear, setIsLinkedShear] = useState<boolean>(true);
  const [isLinkedSpread, setIsLinkedSpread] = useState<boolean>(true);

  // --- Onboarding Splash Flags ---
  const [activeWetlabStarted, setActiveWetlabStarted] = useState<boolean>(false);
  const [activePipelineStarted, setActivePipelineStarted] = useState<boolean>(false);
  const [activeProteinStarted, setActiveProteinStarted] = useState<boolean>(false);
  const [activeTourStarted, setActiveTourStarted] = useState<boolean>(false);

  const handleBackToLanding = () => {
    setViewMode('landing');
    setActiveWetlabStarted(false);
    setActivePipelineStarted(false);
    setActiveProteinStarted(false);
    setActiveTourStarted(false);
  };

  // Completely wipe pipeline memory and reset defaults on unmount
  useEffect(() => {
    if (viewMode !== 'pipeline') {
      setActivePipelineStarted(false);
      setActivePortal(0); // Land on Portal 0: FBA Workspace
    }
  }, [viewMode]);

  // --- Particle Background Renderer for Landing Page ---
  const headerCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!headerCanvasRef.current) return;
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
      colorIndex: number;
      alpha: number;
      phase: number;
    }> = [];

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // Seed sandy or peptidic glowing coordinates depending on selected theme
    const count = isLightMode ? 220 : 130; // Increased density for small sand grains floating around
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: isLightMode 
          ? Math.random() * 1.6 + 0.4 // Extra small desert sand dust
          : Math.random() * 2.5 + 0.6,
        colorIndex: Math.floor(Math.random() * 5),
        alpha: isLightMode ? Math.random() * 0.55 + 0.35 : Math.random() * 0.5 + 0.25,
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
    
    const dModeColors = [
      '#22d3ee', // Cyan
      '#34d399', // Emerald green
      '#fbbf24', // Gold sand
      '#6366f1', // Indigo
      '#3b82f6'  // Blue
    ];
    const lModeColors = [
      '#5c4033', // Deep Espresso Brown (darker tone than background)
      '#8c6239', // Terra Cotta Sand
      '#a67c52', // Classic Ochre Sand
      '#4a3319', // Dark Walnut Sand
      '#a16207'  // Clay Golden brown
    ];

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
          radius: isLightMode ? Math.random() * 2.0 + 0.5 : Math.random() * 2.5 + 1.2,
          colorIndex: Math.floor(Math.random() * 5),
          alpha: 0.9,
          phase: Math.random() * Math.PI * 2
        });
      }
      // Trim to avoid too many elements
      if (particles.length > 350) {
        particles = particles.slice(particles.length - 250);
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
            radius: isLightMode ? Math.random() * 1.4 + 0.6 : Math.random() * 1.8 + 1.2,
            colorIndex: Math.floor(Math.random() * 5),
            alpha: 0.85,
            phase: Math.random() * Math.PI * 2
          });
          if (particles.length > 350) {
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
      
      // Cinematic transparent background clearing for trailing sand and biopolymer textures!
      ctx.fillStyle = isLightMode 
        ? 'rgba(237, 227, 206, 0.22)' // Warm sand color clearing with slightly darker tone
        : 'rgba(3, 5, 8, 0.18)'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw faint structural science grids representing simulation nodes
      ctx.strokeStyle = isLightMode ? 'rgba(92, 64, 51, 0.04)' : 'rgba(16, 185, 129, 0.02)';
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
      ctx.strokeStyle = isLightMode ? 'rgba(140, 98, 57, 0.035)' : 'rgba(234, 179, 8, 0.022)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 180 + Math.sin(globalTime) * 20, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = isLightMode ? 'rgba(92, 64, 51, 0.025)' : 'rgba(34, 211, 238, 0.015)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 320 + Math.cos(globalTime * 0.8) * 35, 0, Math.PI * 2);
      ctx.stroke();

      // Update and Draw connecting webs first with beautiful polymer matrix look
      const runColors = isLightMode ? lModeColors : dModeColors;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const pi = particles[i];
          const pj = particles[j];
          if (!pi || !pj) continue;
          const dist = Math.hypot(pi.x - pj.x, pi.y - pj.y);
          if (dist < 80) {
            const opacity = (1.0 - dist / 80) * 0.18 * Math.min(pi.alpha, pj.alpha);
            // Dynamic color blending based on interaction state and theme
            ctx.strokeStyle = isLightMode 
              ? `rgba(140, 98, 57, ${opacity * 0.45})`
              : pi.colorIndex === pj.colorIndex 
                ? `rgba(52, 211, 153, ${opacity})` 
                : `rgba(34, 211, 238, ${opacity * 0.75})`;
            ctx.lineWidth = isLightMode ? 0.35 : 0.55;
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
        p.x += p.vx + (isLightMode ? 0.38 : 0.28); // slightly speedier sand flow in light mode
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
        ctx.fillStyle = runColors[p.colorIndex % runColors.length];
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
  }, [viewMode, isLightMode]);

  return (
    <GlossaryProvider>
      <div className={`min-h-screen transition-all duration-350 font-sans relative ${
        isLightMode 
          ? 'bg-[#efe4cd] text-slate-900 selection:bg-amber-800 selection:text-white light-mode-active' 
          : 'bg-[#030508] text-slate-200 selection:bg-cyan-500 selection:text-black'
      }`}>
      {/* Interactive/Background particles canvas backdrop - persists across views */}
      <canvas 
        ref={headerCanvasRef} 
        className={`fixed inset-0 w-full h-full animate-fadeIn transition-all duration-500 overflow-hidden ${
          viewMode === 'landing' ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'
        }`}
        style={{ zIndex: 0 }}
      />
      
      {/* Top Floating Theme Switcher Option */}
      <div className="fixed top-4 right-6 z-50 flex items-center gap-3">
        <button
          onClick={() => setIsLightMode(!isLightMode)}
          className={`flex items-center justify-center p-2 rounded-full border cursor-pointer shadow-md transition-all duration-300 ${
            isLightMode
              ? 'bg-[#dfceb0]/85 border-[#b8956c] text-[#5c4033] hover:bg-[#ebdec7]'
              : 'bg-slate-900/90 border-slate-800 text-cyan-400 hover:bg-slate-800'
          }`}
          title="Toggle between warm sandy and dark biophysics theme mode"
          id="theme-toggler-btn"
        >
          {isLightMode ? (
            <Moon className="w-4 h-4 fill-[#5c4033] text-[#5c4033]" />
          ) : (
            <Sun className="w-4 h-4 fill-[#fbbf24] text-yellow-400 animate-spin-slow" />
          )}
        </button>
      </div>

      {/* Top Left Floating Scroll to Top Option */}
      <motion.button
        animate={{ 
          opacity: scrollY > 200 && viewMode === 'landing' ? 1 : 0, 
          scale: scrollY > 200 && viewMode === 'landing' ? 1 : 0.8,
          x: scrollY > 200 && viewMode === 'landing' ? 0 : -20
        }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{ pointerEvents: scrollY > 200 && viewMode === 'landing' ? 'auto' : 'none' }}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed top-4 left-6 z-50 flex items-center justify-center p-2 rounded-full border cursor-pointer shadow-md transition-all duration-300 ${
          isLightMode
            ? 'bg-[#dfceb0]/85 border-[#b8956c] text-[#5c4033] hover:bg-[#ebdec7]'
            : 'bg-slate-900/90 border-slate-800 text-cyan-400 hover:bg-slate-800'
        }`}
        title="Scroll to Top"
        id="scroll-to-top-btn"
      >
        <ArrowRight className="w-4 h-4 -rotate-90 text-current" />
      </motion.button>
      
      {viewMode === 'landing' && (
        /* LANDING VIEW RESTRUCTURED IN 3 SCROLL SECTIONS */
        <div className="relative min-h-screen text-center" id="landing-page-frame">
          
          {/* Section 1: Full-Screen Title Height */}
          <div className="h-screen flex flex-col justify-between items-center text-center px-6 relative z-10 py-12" id="landing-section-1">
            <div /> {/* Top spacing spacer */}
            
            <motion.div 
              style={{ opacity: Math.max(0, 1 - scrollY / 500) }}
              className="max-w-4xl mx-auto flex flex-col items-center justify-center -mt-16"
            >
              <motion.h1 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1 }}
                className={`text-4xl md:text-6xl font-extrabold tracking-tight leading-none uppercase select-none mb-6 font-sans ${
                  isLightMode ? 'text-amber-950' : 'text-white'
                }`}
              >
                iGEM Modeling Toolkit to Study Sand Stabilization
              </motion.h1>
              <p className={`text-xs md:text-sm tracking-wider uppercase font-mono max-w-2xl mx-auto ${
                isLightMode ? 'text-amber-800' : 'text-cyan-400'
              }`}>
                Explore our Simulated 3-pronged solution to tackle wind-driven sand movement
              </p>
            </motion.div>
 
            {/* Scroll to learn more - completely static and fades out as user scrolls */}
            <motion.button 
              style={{ opacity: Math.max(0, 1 - scrollY / 40) }}
              className="pb-16 flex flex-col items-center gap-2 cursor-pointer border-none bg-transparent focus:outline-none"
              onClick={() => {
                document.getElementById('landing-section-2')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <span className={`text-[10px] font-mono tracking-wider font-bold uppercase ${isLightMode ? 'text-stone-500' : 'text-slate-400'}`}>
                Scroll to learn more
              </span>
              <ArrowRight className={`w-5 h-5 rotate-90 ${isLightMode ? 'text-amber-850' : 'text-cyan-400'}`} />
            </motion.button>
          </div>

          {/* Section 2: How to use the toolkit in the lab (Scroll Reveal) */}
          <div id="landing-section-2" className="min-h-[50vh] flex flex-col justify-center items-center py-24 px-6 max-w-4xl mx-auto text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-120px" }}
              transition={{ duration: 0.8 }}
              className={`p-8 md:p-12 rounded-2xl border backdrop-blur-md shadow-xl text-center space-y-4 ${
                isLightMode 
                  ? 'bg-white/75 border-amber-900/10 shadow-[0_12px_30px_rgba(139,94,26,0.06)]' 
                  : 'bg-[#0c1220]/80 border-slate-800/80'
              }`}
            >
              <h2 className={`text-2xl md:text-3xl font-extrabold uppercase tracking-tight flex items-center justify-center gap-3 font-sans ${
                isLightMode ? 'text-amber-950' : 'text-white'
              }`}>
                <Workflow className={`w-7 h-7 ${isLightMode ? 'text-amber-800' : 'text-[#22d3ee]'}`} /> 
                How to use the toolkit in the lab
              </h2>
              <p className={`text-sm md:text-base leading-relaxed font-sans max-w-2xl mx-auto ${
                isLightMode ? 'text-stone-700' : 'text-slate-300'
              }`}>
                Our toolkit translates micro-level assay parameters directly into macro-scale desert wind protection. Feed your experimental measurements to estimate soil cohesion, test wind gust resistance, and map containment apoptosis thresholds seamlessly.
              </p>
            </motion.div>
          </div>

          {/* Section 3: Main Research Workspace Gateways (Scroll Reveal) */}
          <div id="landing-section-3" className="max-w-6xl mx-auto px-6 py-20 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-120px" }}
              transition={{ duration: 0.8 }}
              className="space-y-10 font-sans"
            >
              <div className="text-center">
                <span className={`font-mono text-[9px] uppercase tracking-[0.25em] font-black px-4 py-1.5 rounded-full shadow-lg transition-all ${
                  isLightMode 
                    ? 'bg-white/80 border border-amber-900/15 text-amber-900 shadow-[0_4px_12px_rgba(139,94,26,0.06)]' 
                    : 'bg-cyan-950/85 border border-[#14b8a6]/45 text-[#22d3ee]'
                }`}>
                  NYUAD iGEM 2026 iGEM Research Module
                </span>
                <h2 className={`text-2xl font-bold uppercase tracking-wide mt-4 ${isLightMode ? 'text-amber-950' : 'text-white'}`}>
                  Select Your Research Workspace
                </h2>
              </div>

              {/* Research Gateways Portals Cards Section */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
                
                {/* Gateway 1: Wet Lab Sandbox */}
                <div 
                  onClick={() => setViewMode('wetlab-sandbox')}
                  className={`p-5 rounded-xl cursor-pointer transition shadow-xl hover:-translate-y-1 group relative overflow-hidden ${
                    isLightMode 
                      ? 'bg-white/80 border border-amber-900/10 hover:border-emerald-600/50 hover:shadow-[0_10px_25px_rgba(139,94,26,0.06)]'
                      : 'bg-[#06080d]/85 border border-slate-800/80 hover:border-emerald-500/70 hover:shadow-[0_0_20px_rgba(52,211,153,0.15)]'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className={`p-2.5 rounded border ${isLightMode ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-950/30 border-emerald-900/40 text-[#10b981]'}`}>
                      <Sliders className="w-5 h-5 text-current" />
                    </span>
                    <span className={`text-[9px] font-mono group-hover:text-emerald-600 transition font-bold ${isLightMode ? 'text-stone-400' : 'text-slate-500'}`}>LAUNCH PORTAL ◀</span>
                  </div>
                  <h3 className={`text-sm font-bold uppercase tracking-wide group-hover:text-emerald-600 transition mb-1.5 flex items-center gap-1.5 ${isLightMode ? 'text-stone-950' : 'text-white'}`}>
                    1. Wet-Lab Sandbox
                  </h3>
                  <p className={`text-[11px] leading-relaxed ${isLightMode ? 'text-stone-600 font-medium' : 'text-slate-400'}`}>
                    Enter physical parameters from laboratory spectrophotometric assays. Compare treated vs. untreated sand dunes under wind erosion cells in 2D.
                  </p>
                  <div className="absolute right-0 bottom-0 w-24 h-2 bg-gradient-to-r from-transparent to-emerald-500/10"></div>
                </div>

                {/* Gateway 2: Dynamic Modeling Pipeline */}
                <div 
                  onClick={() => setViewMode('pipeline')}
                  className={`p-5 rounded-xl cursor-pointer transition shadow-xl hover:-translate-y-1 group relative overflow-visible ${
                    isLightMode 
                      ? 'bg-white/80 border border-amber-900/10 hover:border-cyan-500/50 hover:shadow-[0_10px_25px_rgba(139,94,26,0.06)]'
                      : 'bg-[#06080d]/85 border border-slate-800/80 hover:border-[#06b6d4]/70 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className={`p-2.5 rounded border ${isLightMode ? 'bg-cyan-50 border-cyan-200 text-cyan-800' : 'bg-cyan-950/30 border-cyan-900/40 text-cyan-400'}`}>
                      <Workflow className="w-5 h-5 text-current animate-pulse" />
                    </span>
                    <span className={`text-[9px] font-mono group-hover:text-cyan-600 transition font-bold ${isLightMode ? 'text-stone-400' : 'text-slate-500'}`}>LAUNCH PORTAL ◀</span>
                  </div>
                  <h3 className={`text-sm font-bold uppercase tracking-wide group-hover:text-cyan-600 transition mb-1.5 flex items-center gap-1.5 ${isLightMode ? 'text-stone-950' : 'text-white'}`}>
                    2. Physical Pipeline
                  </h3>
                  <p className={`text-[11px] leading-relaxed ${isLightMode ? 'text-stone-600 font-medium' : 'text-slate-400'}`}>
                    Explore our integrated dry lab pipeline. Simulate <GlossaryTerm term="k_cat" theme={isLightMode ? 'light' : 'dark'}>metabolic model kinetics</GlossaryTerm>, <GlossaryTerm term="Cross-linking" theme={isLightMode ? 'light' : 'dark'}>cross-linking</GlossaryTerm> isotherms, wind-shear, and ecological cellular growth dynamics.
                  </p>
                  <div className="absolute right-0 bottom-0 w-24 h-2 bg-gradient-to-r from-transparent to-cyan-500/10 rounded-br-xl"></div>
                </div>

                {/* Gateway 3: 3D Protein Suite */}
                <div 
                  onClick={() => setViewMode('protein-suite')}
                  className={`p-5 rounded-xl cursor-pointer transition shadow-xl hover:-translate-y-1 group relative overflow-visible ${
                    isLightMode 
                      ? 'bg-white/80 border border-amber-900/10 hover:border-indigo-500/50 hover:shadow-[0_10px_25px_rgba(139,94,26,0.06)]'
                      : 'bg-[#06080d]/85 border border-slate-800/80 hover:border-indigo-500/70 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className={`p-2.5 rounded border ${isLightMode ? 'bg-indigo-50 border-indigo-200 text-indigo-800' : 'bg-indigo-950/30 border-indigo-900/40 text-indigo-400'}`}>
                      <Globe className="w-5 h-5 text-current" />
                    </span>
                    <span className={`text-[9px] font-mono group-hover:text-indigo-600 transition font-bold ${isLightMode ? 'text-stone-400' : 'text-slate-500'}`}>LAUNCH PORTAL ◀</span>
                  </div>
                  <h3 className={`text-sm font-bold uppercase tracking-wide group-hover:text-indigo-600 transition mb-1.5 flex items-center gap-1.5 ${isLightMode ? 'text-stone-950' : 'text-white'}`}>
                    3. 3D Protein Suite
                  </h3>
                  <p className={`text-[11px] leading-relaxed ${isLightMode ? 'text-stone-600 font-medium' : 'text-slate-400'}`}>
                    Inspect high-fidelity structures of synthesized <GlossaryTerm term="Bacillus subtilis" theme={isLightMode ? 'light' : 'dark'}>Bacillus enzyme complexes</GlossaryTerm> using crystallographic <GlossaryTerm term="PDB File" theme={isLightMode ? 'light' : 'dark'}>PDB coordinate maps</GlossaryTerm>.
                  </p>
                  <div className="absolute right-0 bottom-0 w-24 h-2 bg-gradient-to-r from-transparent to-indigo-500/10 rounded-br-xl"></div>
                </div>

                {/* Gateway 4: Multiscale Guided Tour */}
                <div 
                  onClick={() => setViewMode('guided-tour')}
                  className={`p-5 rounded-xl cursor-pointer transition shadow-xl hover:-translate-y-1 group relative overflow-visible ${
                    isLightMode 
                      ? 'bg-white/80 border border-amber-900/10 hover:border-amber-500/50 hover:shadow-[0_10px_25px_rgba(139,94,26,0.06)]'
                      : 'bg-[#06080d]/85 border border-slate-800/80 hover:border-amber-500/70 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className={`p-2.5 rounded border ${isLightMode ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-amber-950/30 border-amber-900/40 text-amber-550'}`}>
                      <Sparkles className="w-5 h-5 text-current" />
                    </span>
                    <span className={`text-[9px] font-mono group-hover:text-amber-600 transition font-bold ${isLightMode ? 'text-stone-400' : 'text-slate-500'}`}>LAUNCH PORTAL ◀</span>
                  </div>
                  <h3 className={`text-sm font-bold uppercase tracking-wide group-hover:text-amber-600 transition mb-1.5 flex items-center gap-1.5 ${isLightMode ? 'text-stone-950' : 'text-white'}`}>
                    4. Interactive Tour
                  </h3>
                  <p className={`text-[11px] leading-relaxed ${isLightMode ? 'text-stone-600 font-medium' : 'text-slate-400'}`}>
                    Walk step-by-step through our integrated design pipeline. Watch genomic enzyme parameters resolve directly into global dune sand lock outcomes.
                  </p>
                  <div className="absolute right-0 bottom-0 w-24 h-2 bg-gradient-to-r from-transparent to-amber-500/10 rounded-br-xl"></div>
                </div>

              </div>
            </motion.div>
          </div>

          {/* Footer section */}
          <div className="max-w-6xl mx-auto px-6 pb-6 relative z-10 transition-colors duration-300">
            <div className={`text-center py-6 text-[10px] font-mono select-none mt-4 ${isLightMode ? 'text-stone-500' : 'text-slate-600'}`}>
              NYUAD iGEM Simulation Toolkit. Built for iGEM 2026.
            </div>
          </div>
        </div>
      )}

      {/* 1. Unified Sticky Navigation Header for Deep Portals (Requirement 1 & 4) */}
      {viewMode !== 'landing' && (
        <header className={`sticky top-0 z-50 backdrop-blur-md px-6 py-3 flex flex-wrap gap-4 justify-between items-center max-w-7xl mx-auto rounded-b-xl shadow-lg my-2 border transition-all duration-300 ${
          isLightMode 
            ? 'bg-amber-100/90 border-amber-900/10 text-stone-900 shadow-sm' 
            : 'bg-[#05070a]/90 border-b border-slate-800/80 text-slate-200'
        }`}>
          <div 
            onClick={handleBackToLanding}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <span className={`font-mono text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded transition-all ${
              isLightMode 
                ? 'bg-amber-200 border border-amber-900/20 text-amber-900' 
                : 'bg-emerald-950 border border-emerald-500/60 text-emerald-400'
            }`}>
              NYUAD iGEM
            </span>
            <span className={`text-xs font-bold tracking-wide transition font-sans ${
              isLightMode ? 'text-amber-950 group-hover:text-amber-700' : 'text-white group-hover:text-emerald-400'
            }`}>
              Sand Bio-Stabilizer Toolkit
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs">
            <button 
              onClick={handleBackToLanding}
              className={`text-[11px] px-2 py-1 transition rounded font-medium font-sans ${
                isLightMode ? 'text-stone-600 hover:text-stone-900' : 'text-slate-400 hover:text-white'
              }`}
            >
              ← Back Home
            </button>
            <div className={`w-px h-3.5 mx-1.5 ${isLightMode ? 'bg-amber-900/20' : 'bg-slate-800'}`} />
            
            <button 
              onClick={() => { setViewMode('wetlab-sandbox'); }}
              className={`text-[11px] px-3 py-1.5 transition rounded-lg font-semibold font-sans ${
                viewMode === 'wetlab-sandbox' 
                  ? (isLightMode ? 'bg-emerald-200 text-emerald-900 border border-emerald-300' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20') 
                  : (isLightMode ? 'text-stone-600 hover:text-stone-900' : 'text-slate-400 hover:text-slate-200')
              }`}
            >
              Wet-Lab Sandbox
            </button>
            <button 
              onClick={() => { setViewMode('pipeline'); }}
              className={`text-[11px] px-3 py-1.5 transition rounded-lg font-semibold font-sans ${
                viewMode === 'pipeline' 
                  ? (isLightMode ? 'bg-cyan-200 text-cyan-900 border border-cyan-300' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20') 
                  : (isLightMode ? 'text-stone-600 hover:text-stone-900' : 'text-slate-400 hover:text-slate-200')
              }`}
            >
              Dry-Lab Pipeline
            </button>
            <button 
              onClick={() => { setViewMode('protein-suite'); }}
              className={`text-[11px] px-3 py-1.5 transition rounded-lg font-bold font-sans flex items-center gap-1 ${
                viewMode === 'protein-suite' 
                  ? (isLightMode ? 'bg-indigo-200 text-indigo-900 border border-indigo-300' : 'bg-[#6366f1]/15 text-[#a5b4fc] border border-indigo-500/35') 
                  : (isLightMode ? 'text-indigo-700 hover:text-indigo-900 font-bold' : 'text-indigo-400 hover:text-indigo-305')
              }`}
            >
              3D Protein Suite
            </button>
            <button 
              onClick={() => { setViewMode('guided-tour'); }}
              className={`text-[11px] px-3 py-1.5 transition rounded-lg font-bold font-sans flex items-center gap-1 ${
                viewMode === 'guided-tour' 
                  ? (isLightMode ? 'bg-amber-200 text-amber-900 border border-amber-300' : 'bg-amber-500/15 text-amber-400 border border-amber-500/35') 
                  : (isLightMode ? 'text-amber-700 hover:text-amber-900 font-bold' : 'text-amber-400 hover:text-amber-300')
              }`}
            >
              Interactive Tour
            </button>
          </div>
        </header>
      )}

      {/* PORTAL 1: Wet Lab Sandbox onboarding & simulation views */}
      {viewMode === 'wetlab-sandbox' && (
        <motion.div 
          key="wetlab-sandbox-view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-7xl mx-auto px-4 md:px-0 relative z-10"
        >
          <AnimatePresence mode="wait">
            {!activeWetlabStarted ? (
              /* Splash Onboarding for Wet-Lab Sandbox */
              <motion.div 
                key="wetlab-splash"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="min-h-[70vh] flex items-center justify-center p-6 font-sans"
              >
                <div className={`max-w-md w-full p-8 rounded-2xl shadow-2xl relative overflow-hidden text-center space-y-5 border transition-all duration-300 ${
                  isLightMode 
                    ? 'bg-white/95 border-amber-900/15 text-stone-800 shadow-[0_12px_30px_rgba(139,94,26,0.06)]' 
                    : 'bg-[#0a0f18]/90 border-slate-800 text-slate-200'
                }`}>
                  <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    isLightMode ? 'bg-emerald-100 border border-emerald-300 text-emerald-800' : 'bg-emerald-950/40 border border-emerald-800 text-emerald-400'
                  }`}>
                    <Sliders className="w-5 h-5 text-current" />
                  </div>
                  <div className="space-y-1.5">
                    <span className={`text-[10px] font-mono font-bold tracking-wider uppercase border px-3 py-1 rounded-full transition-colors ${
                      isLightMode ? 'bg-emerald-100/55 border-emerald-200 text-emerald-900' : 'bg-emerald-950/60 border-emerald-900/60 text-[#34d399]'
                    }`}>
                      Portal 1: Recipe Optimizer
                    </span>
                    <h2 className={`text-xl font-bold uppercase tracking-tight pt-1 ${
                      isLightMode ? 'text-stone-900' : 'text-white'
                    }`}>
                      Wet-Lab Sand Simulator
                    </h2>
                  </div>
                  <p className={`text-xs leading-relaxed font-sans ${
                    isLightMode ? 'text-stone-600' : 'text-slate-300'
                  }`}>
                    Here you can test different laboratory recipes (such as starting cell density, mineral salt density, glutamate feed, and temperature) on a live sandbed. Adjust sliders to see a side-by-side comparative simulation of untreated sand vs sand protected by our organic bacterial glue.
                  </p>
                  <div className={`p-3 border rounded-xl text-left text-[10.5px] leading-relaxed ${
                    isLightMode ? 'bg-amber-50/50 border-amber-900/10 text-stone-600' : 'bg-[#05070a]/90 border-slate-900 text-slate-400'
                  }`}>
                    <span className="font-extrabold text-[#34d399] block mb-0.5">WHAT YOU WILL TEST:</span>
                    The effect of recipe changes on sand erosion under high-speed shamal desert wind gusts.
                  </div>
                  <div className="flex gap-3 justify-center pt-1.5">
                    <button 
                      type="button"
                      onClick={handleBackToLanding}
                      className={`px-4 py-2 text-xs rounded-xl border transition ${
                        isLightMode ? 'bg-stone-100 hover:bg-stone-200 border-stone-200 text-stone-700' : 'bg-slate-905 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800/80'
                      }`}
                    >
                      Back Home
                    </button>
                    <button 
                      type="button"
                      onClick={() => setActiveWetlabStarted(true)}
                      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition"
                    >
                      Begin Sandbox Simulation
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* Standalone Wet Lab Sandbox view direct link to 2D Sand Grid comparison with scroll reveal */
              <motion.div
                key="wetlab-main"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                <WetLabSandbox2D 
                  onBack={handleBackToLanding}
                  universalVitals={{ pgaAccum, shearModulus }}
                  isLightMode={isLightMode}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
      {/* PORTAL 2: 3D Protein Suite onboarding & visualizer views */}
      {viewMode === 'protein-suite' && (
        <motion.div 
          key="protein-suite-view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-7xl mx-auto px-4 relative z-10"
        >
          <AnimatePresence mode="wait">
            {!activeProteinStarted ? (
              /* Splash Onboarding for 3D Protein Suite */
              <motion.div 
                key="protein-splash"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="min-h-[70vh] flex items-center justify-center p-6 font-sans"
              >
                <div className={`max-w-md w-full p-8 rounded-2xl shadow-2xl relative overflow-hidden text-center space-y-5 border transition-all duration-300 ${
                  isLightMode 
                    ? 'bg-white/95 border-amber-900/15 text-stone-800 shadow-[0_12px_30px_rgba(139,94,26,0.06)]' 
                    : 'bg-[#0a0f18]/90 border-slate-800 text-slate-200'
                }`}>
                  <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    isLightMode ? 'bg-indigo-100 border border-indigo-200 text-indigo-800' : 'bg-indigo-950/40 border border-indigo-900 text-indigo-400'
                  }`}>
                    <Globe className="w-5 h-5 text-current" />
                  </div>
                  <div className="space-y-1.5">
                    <span className={`text-[10px] font-mono font-bold tracking-wider uppercase border px-3 py-1 rounded-full transition-colors ${
                      isLightMode ? 'bg-indigo-100/55 border-indigo-200 text-indigo-900' : 'bg-indigo-950/60 border-indigo-900/60 text-indigo-300'
                    }`}>
                      Portal 3: Molecular View
                    </span>
                    <h2 className={`text-xl font-bold uppercase tracking-tight pt-1 ${
                      isLightMode ? 'text-stone-900' : 'text-white'
                    }`}>
                      3D Enzyme Structures
                    </h2>
                  </div>
                  <p className={`text-xs leading-relaxed font-sans ${
                    isLightMode ? 'text-stone-600' : 'text-slate-300'
                  }`}>
                    Inspect the crystallographic molecular models calibrated for our desert <em className="italic">Bacillus</em> synthesizing enzymes. Drag to rotate atoms in 3D, and spotlight active binding pockets that link substrates to turn sticky glue networks rigid.
                  </p>
                  <div className={`p-3 border rounded-xl text-left text-[10.5px] leading-relaxed ${
                    isLightMode ? 'bg-amber-50/50 border-amber-900/10 text-stone-600' : 'bg-[#05070a]/90 border-slate-900 text-slate-400'
                  }`}>
                    <span className="font-extrabold text-indigo-400 block mb-0.5">WHAT YOU WILL TEST:</span>
                    Interact with real amino acid coordinates (like Lys-181) to see how they anchor substrates inside the molecular active site cleft.
                  </div>
                  <div className="flex gap-3 justify-center pt-1.5">
                    <button 
                      type="button"
                      onClick={handleBackToLanding}
                      className={`px-4 py-2 text-xs rounded-xl border transition ${
                        isLightMode ? 'bg-stone-100 hover:bg-stone-200 border-stone-200 text-stone-700' : 'bg-slate-905 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800/80'
                      }`}
                    >
                      Back Home
                    </button>
                    <button 
                      type="button"
                      onClick={() => setActiveProteinStarted(true)}
                      className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition"
                    >
                      Launch 3D Visualizer
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* Standalone 3D Protein Imager view with scroll reveal */
              <motion.div 
                key="protein-main"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-6 pt-4"
              >
                <HighFidelityProteinExplorer isLightMode={isLightMode} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* PORTAL 3: Dynamic modeling workspace panel views */}
      {viewMode === 'pipeline' && (
        <div key="dry-lab-pipeline-workspace" id="dynamic-workspace-frame" className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
          {!activePipelineStarted ? (
            /* Splash Onboarding for Dry-Lab Pipeline */
            <div className="min-h-[70vh] flex items-center justify-center p-6 font-sans">
              <div className={`max-w-md w-full p-8 rounded-2xl shadow-2xl relative overflow-hidden text-center space-y-5 animate-fadeIn border transition-all duration-300 ${
                isLightMode 
                  ? 'bg-white/95 border-amber-900/15 text-stone-800 shadow-[0_12px_30px_rgba(139,94,26,0.06)]' 
                  : 'bg-[#0a0f18]/90 border-slate-800 text-slate-200'
              }`}>
                <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  isLightMode ? 'bg-cyan-100 border border-cyan-300 text-cyan-800' : 'bg-cyan-950/40 border border-cyan-800 text-cyan-400'
                }`}>
                  <Workflow className="w-5 h-5 text-current" />
                </div>
                <div className="space-y-1.5">
                  <span className={`text-[10px] font-mono font-bold tracking-wider uppercase border px-3 py-1 rounded-full transition-colors ${
                    isLightMode ? 'bg-cyan-100/55 border-cyan-200 text-cyan-900' : 'bg-cyan-950/60 border-cyan-900/60 text-cyan-400'
                  }`}>
                    Portal 2: Design Pipeline
                  </span>
                  <h2 className={`text-xl font-bold uppercase tracking-tight pt-1 ${
                    isLightMode ? 'text-stone-900' : 'text-white'
                  }`}>
                    Dry-Lab Modeling Pipeline
                  </h2>
                </div>
                <p className={`text-xs leading-relaxed font-sans ${
                  isLightMode ? 'text-stone-600' : 'text-slate-300'
                }`}>
                  Step through our integrated dry-lab modeling modules. This connecting pipeline starts with cellular growth models, feeds outputs to polymer crosslinking stiffness calculations, tests dunes against gale gusts, and evaluates ecological safety boundaries.
                </p>
                <div className={`p-3 border rounded-xl text-left text-[10.5px] leading-relaxed ${
                  isLightMode ? 'bg-amber-50/50 border-amber-900/10 text-stone-600' : 'bg-[#05070a]/90 border-slate-900 text-slate-400'
                }`}>
                  <span className="font-extrabold text-cyan-400 block mb-0.5">PIPELINE CONNECTION:</span>
                  Modifications inside early phases seamlessly propagate ahead to update soil stiffness thresholds and safety zones.
                </div>
                <div className="flex gap-3 justify-center pt-1.5">
                  <button 
                    onClick={handleBackToLanding}
                    className={`px-4 py-2 text-xs rounded-xl border transition ${
                      isLightMode ? 'bg-stone-100 hover:bg-stone-200 border-stone-200 text-stone-700' : 'bg-slate-905 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800/80'
                    }`}
                  >
                    Back Home
                  </button>
                  <button 
                    onClick={() => setActivePipelineStarted(true)}
                    className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition"
                  >
                    Launch Pipeline Workspace
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* CORE PIPELINE WORKSPACE CONTENT WITH SCROLL VERTICAL PIPE REVEAL */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-16 pt-4 max-w-5xl mx-auto"
            >
              {/* Vertical line indicator */}
              <div className="relative border-l border-dashed border-cyan-800/40 pl-6 md:pl-10 space-y-16 ml-3 md:ml-6 pb-12">
                
                {/* SECTION 1: Metabolic Flux Workspace */}
                <motion.div
                  initial={{ opacity: 0, y: 45 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-105px" }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="relative space-y-4 font-sans"
                >
                  {/* Dot Marker on Vertical Line */}
                  <div className="absolute -left-[31px] md:-left-[47px] top-1.5 w-4 h-4 rounded-full bg-cyan-500 border border-black flex items-center justify-center shadow-lg shadow-cyan-500/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  </div>
                  <div>
                    <h3 className={`text-sm tracking-wider uppercase font-bold flex items-center gap-2 ${isLightMode ? 'text-amber-955' : 'text-cyan-400'}`}>
                      <Sparkles className="w-4 h-4 text-emerald-500 animate-spin" />
                      1. Biopolymer Precursor Matrix (Metabolic Flux FBA)
                    </h3>
                    <p className={`text-xs mt-1 leading-relaxed max-w-2xl font-sans ${isLightMode ? 'text-stone-700' : 'text-slate-400'}`}>
                      Solves the intracellular reaction equations in real-time. Adjust metabolic parameters and feed rate to maximize glutamate output, which drives the downstream reactor growth simulation.
                    </p>
                  </div>
                  <div className={`shadow-lg rounded-xl overflow-hidden border ${isLightMode ? 'bg-[#fcfaf5] border-amber-900/10' : 'bg-[#06080d] border-slate-800'}`}>
                    <AdvancedFbaPortal 
                      isLightMode={isLightMode} 
                      onUpdatePrecursorFlux={handleUpdatePrecursorFlux}
                    />
                  </div>
                </motion.div>

                {/* SECTION 2: Enzyme Bio-kinetics */}
                <motion.div
                  initial={{ opacity: 0, y: 45 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-105px" }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="relative space-y-4 font-sans"
                >
                  <div className="absolute -left-[31px] md:-left-[47px] top-1.5 w-4 h-4 rounded-full bg-cyan-500 border border-black flex items-center justify-center shadow-lg shadow-cyan-500/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                  <div>
                    <h3 className={`text-sm tracking-wider uppercase font-bold flex items-center gap-2 ${isLightMode ? 'text-amber-955' : 'text-cyan-400'}`}>
                      <Dna className="w-4 h-4 text-cyan-500" />
                      2. Cultivation Yield Simulator (Enzyme Bio-kinetics)
                    </h3>
                    <p className={`text-xs mt-1 leading-relaxed max-w-2xl font-sans ${isLightMode ? 'text-stone-700' : 'text-slate-400'}`}>
                      Simulates micro-organism growth and poly-glutamic acid (gamma-PGA) glue secretion over 48 hours. Substrate uptake rate is connected to the preceding carbon flux result.
                    </p>
                  </div>
                  <div className={`shadow-lg rounded-xl overflow-hidden border ${isLightMode ? 'bg-[#fcfaf5] border-amber-900/10' : 'bg-[#06080d] border-slate-800'}`}>
                    <MetabolicModel 
                      params={metabolicParams} 
                      setParams={setMetabolicParams} 
                      onUpdatePgaAccum={setPgaAccum} 
                      targetYield={targetYield}
                      setTargetYield={setTargetYield}
                      calibratedKcat={calibratedKcat}
                      setCalibratedKcat={setCalibratedKcat}
                      isLightMode={isLightMode}
                    />
                  </div>
                </motion.div>

                {/* SECTION 3: Chelation Biophysics */}
                <motion.div
                  initial={{ opacity: 0, y: 45 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-105px" }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="relative space-y-4 font-sans"
                >
                  <div className="absolute -left-[31px] md:-left-[47px] top-1.5 w-4 h-4 rounded-full bg-cyan-500 border border-black flex items-center justify-center shadow-lg shadow-cyan-500/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                  <div>
                    <h3 className={`text-sm tracking-wider uppercase font-bold flex items-center gap-2 ${isLightMode ? 'text-amber-955' : 'text-cyan-400'}`}>
                      <Layers className="w-4 h-4 text-pink-500" />
                      3. Lattice Stiffness Calculator (Chelation Biophysics &amp; Environment)
                    </h3>
                    <p className={`text-xs mt-1 leading-relaxed max-w-2xl font-sans ${isLightMode ? 'text-stone-700' : 'text-slate-400'}`}>
                      Calculates how positive calcium mineral feeds crosslink with gamma-PGA. Models the increase in aggregate lattice shear modulus (soil stiffness) as the polymer network lock is optimized.
                    </p>
                  </div>
                  <div className={`shadow-lg rounded-xl p-4 border ${isLightMode ? 'bg-[#fcfaf5] border-amber-900/10' : 'bg-[#06080d] border-slate-800'}`}>
                    <div className="flex flex-col gap-6">
                      <ProteinThermalDecay 
                        isLightMode={isLightMode}
                        onUpdateEnvironmentalModifier={setEnvironmentalModifier}
                      />
                      <CrossLinkingBiophysics 
                        params={crosslinkParams} 
                        setParams={setCrosslinkParams} 
                        pgaAccum={pgaAccum}
                        isLinked={isLinkedPga}
                        setIsLinked={setIsLinkedPga}
                        shearModulus={shearModulus}
                        onUpdateShearModulus={setShearModulus}
                        isLightMode={isLightMode}
                        environmentalModifier={environmentalModifier}
                      />
                    </div>
                  </div>
                </motion.div>

                {/* SECTION 4: Aeolian Wind Tunnel */}
                <motion.div
                  initial={{ opacity: 0, y: 45 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-105px" }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="relative space-y-4 font-sans"
                >
                  <div className="absolute -left-[31px] md:-left-[47px] top-1.5 w-4 h-4 rounded-full bg-cyan-500 border border-black flex items-center justify-center shadow-lg shadow-cyan-500/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                  <div>
                    <h3 className={`text-sm tracking-wider uppercase font-bold flex items-center gap-2 ${isLightMode ? 'text-amber-955' : 'text-cyan-400'}`}>
                      <Wind className="w-4 h-4 text-[#ff9000]" />
                      4. Storm Gale Blast Simulator (Aeolian Aerodynamics)
                    </h3>
                    <p className={`text-xs mt-1 leading-relaxed max-w-2xl font-sans ${isLightMode ? 'text-stone-700' : 'text-slate-400'}`}>
                      Subjects the stabilized crust to direct storm wind velocity gusts. Verifies sand drift containment as wind speed is ramped up relative to soil stiffness limits.
                    </p>
                  </div>
                  <div className={`shadow-lg rounded-xl overflow-hidden border ${isLightMode ? 'bg-[#fcfaf5] border-amber-900/10' : 'bg-[#06080d] border-slate-800'}`}>
                    <AeolianWindTunnel 
                      params={aeolianParams} 
                      setParams={setAeolianParams} 
                      shearModulus={shearModulus}
                      isLinked={isLinkedShear}
                      setIsLinked={setIsLinkedShear}
                      isLightMode={isLightMode}
                    />
                  </div>
                </motion.div>

                {/* SECTION 5: Environmental Containment */}
                <motion.div
                  initial={{ opacity: 0, y: 45 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-105px" }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="relative space-y-4 font-sans"
                >
                  <div className="absolute -left-[31px] md:-left-[47px] top-1.5 w-4 h-4 rounded-full bg-cyan-500 border border-black flex items-center justify-center shadow-lg shadow-cyan-500/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                  <div>
                    <h3 className={`text-sm tracking-wider uppercase font-bold flex items-center gap-2 ${isLightMode ? 'text-amber-955' : 'text-cyan-400'}`}>
                      <Bug className="w-4 h-4 text-emerald-400" />
                      5. Biosafety Containment Grid (Ecological Apoptosis)
                    </h3>
                    <p className={`text-xs mt-1 leading-relaxed max-w-2xl font-sans ${isLightMode ? 'text-stone-700' : 'text-slate-400'}`}>
                      Simulates environmental containment inside soil zones. Triggers self-destruct (apoptosis) sequences in cells drifting outside wet Treated Zones into dry regions.
                    </p>
                  </div>
                  <div className={`shadow-lg rounded-xl overflow-hidden border ${isLightMode ? 'bg-[#fcfaf5] border-amber-900/10' : 'bg-[#06080d] border-slate-800'}`}>
                    <EcologicalSpread 
                      config={ecologicalConfig} 
                      setConfig={setEcologicalConfig} 
                      pgaAccum={pgaAccum}
                      isLinked={isLinkedSpread}
                      setIsLinked={setIsLinkedSpread}
                      isLightMode={isLightMode}
                    />
                  </div>
                </motion.div>

                {/* SECTION 6: Economic & Global Scalability */}
                <motion.div
                  initial={{ opacity: 0, y: 45 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-105px" }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="relative space-y-4 font-sans"
                >
                  <div className="absolute -left-[31px] md:-left-[47px] top-1.5 w-4 h-4 rounded-full bg-cyan-500 border border-black flex items-center justify-center shadow-lg shadow-cyan-500/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                  <div>
                    <h3 className={`text-sm tracking-wider uppercase font-bold flex items-center gap-2 ${isLightMode ? 'text-amber-955' : 'text-cyan-405'}`}>
                      <Coins className="w-4 h-4 text-yellow-500" />
                      6. Economic &amp; Environmental Impact Ledger
                    </h3>
                    <p className={`text-xs mt-1 leading-relaxed max-w-2xl font-sans ${isLightMode ? 'text-stone-700' : 'text-slate-400'}`}>
                      Calculates financial feasibility, total CapEx costs, and direct CO₂ capture/neutralizing metrics compared to high-intensity concrete covers.
                    </p>
                  </div>
                  <div className={`shadow-lg rounded-xl overflow-hidden border ${isLightMode ? 'bg-[#fcfaf5] border-amber-900/10' : 'bg-[#06080d] border-slate-800'}`}>
                    <EconomicScalabilityEngine 
                      isLightMode={isLightMode}
                      polymerYield={pgaAccum}
                      requiredCrustThickness={calculatedCrustThickness}
                    />
                  </div>
                </motion.div>

              </div>

              {/* Page Footer inside Scroll Stream */}
              <div className={`text-center mt-12 text-[10px] pb-12 font-mono select-none ${isLightMode ? 'text-[#cfa471]' : 'text-slate-600'}`}>
                NYUAD iGEM 2026 Simulation Toolkit. All rights reserved.
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* PORTAL 4: Multiscale Guided Tour presentation component with onboarding splash */}
      {viewMode === 'guided-tour' && (
        <div id="guided-tour-view" className="max-w-7xl mx-auto px-4 md:px-6 relative z-10 py-6">
          {!activeTourStarted ? (
            /* Splash Onboarding for Interactive Tour */
            <div className="min-h-[70vh] flex items-center justify-center p-6 font-sans">
              <div className={`max-w-md w-full p-8 rounded-2xl shadow-2xl relative overflow-hidden text-center space-y-5 animate-fadeIn border transition-all duration-300 ${
                isLightMode 
                  ? 'bg-white/95 border-amber-900/15 text-stone-800 shadow-[0_12px_30px_rgba(139,94,26,0.06)]' 
                  : 'bg-[#0a0f18]/90 border-slate-800 text-slate-200'
              }`}>
                <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  isLightMode ? 'bg-amber-100 border border-amber-200 text-amber-800' : 'bg-amber-950/40 border border-amber-900 text-amber-400'
                }`}>
                  <Sparkles className="w-5 h-5 text-current" />
                </div>
                <div className="space-y-1.5">
                  <span className={`text-[10px] font-mono font-bold tracking-wider uppercase border px-3 py-1 rounded-full transition-colors ${
                    isLightMode ? 'bg-amber-100/55 border-amber-200 text-amber-900' : 'bg-amber-950/60 border-amber-900/60 text-amber-300'
                  }`}>
                    Portal 4: Space-Time Tour
                  </span>
                  <h2 className={`text-xl font-bold uppercase tracking-tight pt-1 ${
                    isLightMode ? 'text-stone-900' : 'text-white'
                  }`}>
                    Interactive Multiscale Tour
                  </h2>
                </div>
                <p className={`text-xs leading-relaxed font-sans ${
                  isLightMode ? 'text-stone-600' : 'text-slate-300'
                }`}>
                  Step through a cohesive, curated presentation tracing our modeled bio-cementation solution. Walk through cellular enzyme dynamics, geomechanical sand stability scales, wind mitigation rates, and biosafety modules.
                </p>
                <div className={`p-3 border rounded-xl text-left text-[10.5px] leading-relaxed ${
                  isLightMode ? 'bg-amber-50/50 border-amber-900/10 text-stone-600' : 'bg-[#05070a]/90 border-slate-900 text-slate-400'
                }`}>
                  <span className="font-extrabold text-amber-400 block mb-0.5">WHAT YOU WILL EXPLORE:</span>
                  Take an automated, narrated tour detailing experimental insights and model connections to defeat actual Shamal sand erosion.
                </div>
                <div className="flex gap-3 justify-center pt-1.5">
                  <button 
                    onClick={handleBackToLanding}
                    className={`px-4 py-2 text-xs rounded-xl border transition ${
                      isLightMode ? 'bg-stone-100 hover:bg-stone-200 border-stone-200 text-stone-700' : 'bg-slate-905 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800/80'
                    }`}
                  >
                    Back Home
                  </button>
                  <button 
                    onClick={() => setActiveTourStarted(true)}
                    className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition"
                  >
                    Begin Interactive Tour
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Standalone tour imager view with scroll reveal */
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <MultiscaleGuidedTour 
                isLightMode={isLightMode} 
                onClose={handleBackToLanding} 
              />
            </motion.div>
          )}
        </div>
      )}
      </div>
    </GlossaryProvider>
  );
}
