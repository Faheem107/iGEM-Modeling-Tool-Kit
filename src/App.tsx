"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '@/components/theme-context';

// Module Imports
import MetabolicModel from './components/MetabolicModel';
import AdvancedFbaPortal from './components/AdvancedFbaPortal';
import CrossLinkingBiophysics from './components/CrossLinkingBiophysics';
import ProteinThermalDecay from './components/ProteinThermalDecay';
import AeolianWindTunnel from './components/AeolianWindTunnel';
import EcologicalSpread from './components/EcologicalSpread';
import EconomicScalabilityEngine from './components/EconomicScalabilityEngine';
import HighFidelityProteinExplorer from './components/HighFidelityProteinExplorer';
import WetLabSandbox2D from './components/WetLabSandbox2D';
import GlossaryTerm, { GlossaryProvider } from './components/GlossaryTerm';
import SimulationWorkspace from './components/simulation/SimulationWorkspace';
import { ProngId } from './lib/prongs';

import { 
  Dna, 
  Wind, 
  Layers, 
  Bug, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  ShieldCheck,
  Workflow,
  Globe,
  Coins,
  Sun,
  Moon,
  X,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Flame
} from 'lucide-react';

import { MetabolicParams, BiophysicsParams, AeolianParams, CAConfig } from './types';

type ViewMode = 'landing' | 'pipeline' | 'wetlab-sandbox' | 'protein-suite' | 'simulation';
// ADDED 'thermal' to TabType
type TabType = 'metabolic' | 'fba' | 'crosslink' | 'thermal' | 'aeolian' | 'ecological' | 'economic';

// ACCURATE 3 PRONGS BASED ON WET LAB APPROACH .MD
const PRONGS = [
  {
    id: 1,
    title: "Polymer Overexpression",
    icon: <Sparkles className="w-8 h-8 text-amber-500" />,
    short: "Gamma-PGA bio-adhesive matrix",
    whatItIs: "Enhancing the natural production of Gamma-PGA in Bacillus subtilis to act as a primary bio-adhesive matrix.",
    modelDoes: "Simulates metabolic flux, cross-linking thermodynamics with calcium ions, and calculates the resulting shear modulus.",
    impact: "Maximizes structural integrity and provides a biodegradable crust capable of withstanding severe wind friction."
  },
  {
    id: 2,
    title: "Carbonic Anhydrase & Sortase",
    icon: <Layers className="w-8 h-8 text-emerald-500" />,
    short: "Non-ureolytic MICP biomineralization",
    whatItIs: "Engineering B. subtilis to secrete Carbonic Anhydrase (CA) and anchor it to the cell surface via Sortase-mediated ligation. This enzyme sequesters CO2 and water to form calcium carbonate crystals without producing toxic ammonia.",
    modelDoes: "Simulates Sortase & Sorting Signal functionality, CA dimerization kinetics, and Signal Peptide efficiency to predict successful covalent anchoring and biomineralization rates.",
    impact: "Provides a sustainable, ammonia-free pathway to cement sand grains together, permanently sequestering atmospheric CO2 while drastically improving crust durability."
  },
  {
    id: 3,
    title: "Commercial Biopolymer Backup",
    icon: <ShieldCheck className="w-8 h-8 text-rose-500" />,
    short: "Sodium Alginate fail-safe",
    whatItIs: "Utilizing Sodium Alginate, a robust commercial biopolymer, as a fail-safe additive if engineered bacteria fail to establish in extreme, fluctuating desert conditions.",
    modelDoes: "Models the rheological properties, gelation thermodynamics, and cross-linking efficiency of Sodium Alginate under extreme temperatures and salinity.",
    impact: "Ensures reliable, immediate sand stabilization in the harshest environments, providing a dependable fallback to guarantee project success."
  }
];

const PORTAL_CARDS = [
  { id: 'wetlab-sandbox', icon: <Bug className="w-6 h-6 text-amber-500" />, title: 'Wet Lab Sandbox', desc: 'Simulate physical lab assays and monitor biopolymer propagation.' },
  { id: 'pipeline', icon: <Workflow className="w-6 h-6 text-indigo-500" />, title: 'Physical Pipeline', desc: 'Analyze metabolic pathways, crosslinking biophysics, and wind resistance.' },
  { id: 'protein-suite', icon: <Dna className="w-6 h-6 text-rose-500" />, title: '3D Protein Suite', desc: 'Explore structural molecular dynamics and thermal decay.' }
];

export default function App() {
  // ADDED 'thermal' to PORTAL_TABS
  const PORTAL_TABS: TabType[] = ['fba', 'metabolic', 'crosslink', 'thermal', 'aeolian', 'ecological', 'economic'];
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [activePortal, setActivePortal] = useState<number>(0);
  const activeTab = PORTAL_TABS[activePortal];
  const { isLightMode, setIsLightMode } = useTheme();

  // Landing Page Interactive States
  const [isComboMode, setIsComboMode] = useState(false);
  const [selectedProngs, setSelectedProngs] = useState<number[]>([]);
  const [viewingProng, setViewingProng] = useState<number | null>(null);
  const [showPortalsModal, setShowPortalsModal] = useState(false);
  
  // Track scrolling for the "Back to Top" button
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Central routing controller to ensure we open Modals properly and scroll to top
  const handleExitToPortals = () => {
    setViewMode('landing');
    setShowPortalsModal(true);
  };

  // Opens a specific portal and completely forces the window back to the absolute top
  const handlePortalSelect = (id: ViewMode) => {
    setShowPortalsModal(false);
    setViewMode(id);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  // "Proceed to Model": carry the selected prong combination into the tailored simulation.
  const handleProceedToModel = () => {
    if (selectedProngs.length === 0) return;
    setViewMode('simulation');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const handleBackToLanding = () => {
    setViewMode('landing');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  // --- Central Simulation Orchestrator States ---
  const [metabolicParams, setMetabolicParams] = useState<MetabolicParams>({
    alpha_m: 0.12, beta_m: 0.02, alpha_e: 0.08, beta_e: 0.01,
    k_cat: 4.5, s_precursor: 2.5, k_m: 1.5, k_deg: 0.05, ggtKnockout: true, pgcAKnockout: true,
  });

  const [crosslinkParams, setCrosslinkParams] = useState<BiophysicsParams>({
    ion_conc: 10.0, Kd: 4.0, rho_polymer: 3.5, temperature: 298.15, Mx: 350, Mn: 25000,
  });

  const [aeolianParams, setAeolianParams] = useState<AeolianParams>({
    sand_diameter: 0.00025, wind_velocity: 0.35, biofilm_cohesion: 0.0002,
  });

  const [ecologicalConfig, setEcologicalConfig] = useState<CAConfig>({
    gridSize: 50, spreadProb: 0.45, resourceConsume: 0.12, initialInoculation: 'center', killSwitchDelay: 10,
  });

  const [targetYield, setTargetYield] = useState<number>(120);
  const [calibratedKcat, setCalibratedKcat] = useState<number | null>(null);
  const [pgaAccum, setPgaAccum] = useState<number>(35.0);
  const [shearModulus, setShearModulus] = useState<number>(1450.0);
  const [isLinked, setIsLinked] = useState<boolean>(true);

  const handleUpdatePrecursorFlux = (val: number) => {
    const cleanVal = Math.max(0, val);
    setMetabolicParams(prev => {
      if (Math.abs(prev.s_precursor - cleanVal) < 0.001) return prev;
      return { ...prev, s_precursor: Number(cleanVal.toFixed(4)) };
    });
  };

  // ADDED Thermal Kinetics to the Navigation Index
  const navItems = [
    { id: 0, label: 'Advanced FBA', icon: <Workflow className="w-4 h-4" /> },
    { id: 1, label: 'Metabolic Matrix', icon: <Dna className="w-4 h-4" /> },
    { id: 2, label: 'Cross-Link Biophysics', icon: <Layers className="w-4 h-4" /> },
    { id: 3, label: 'Thermal Kinetics', icon: <Flame className="w-4 h-4 text-rose-500" /> },
    { id: 4, label: 'Aeolian Tunnel', icon: <Wind className="w-4 h-4" /> },
    { id: 5, label: 'Ecological Spread', icon: <Bug className="w-4 h-4" /> },
    { id: 6, label: 'Economic Scalability', icon: <Coins className="w-4 h-4" /> },
  ];

  const activeProngData = PRONGS.find(p => p.id === viewingProng);

  // Common animation properties for scroll fading
  const fadeAnimProps = {
    initial: { opacity: 0, y: 50, scale: 0.98 },
    whileInView: { opacity: 1, y: 0, scale: 1 },
    viewport: { once: false, amount: 0.3 }, 
    transition: { duration: 0.7, ease: "easeOut" as const }
  };

  return (
    <GlossaryProvider>
      <div className={`min-h-screen transition-all duration-350 font-sans relative ${
        isLightMode 
          ? 'bg-transparent text-slate-900 selection:bg-amber-800 selection:text-white light-mode-active' 
          : 'bg-transparent text-slate-200 selection:bg-cyan-500 selection:text-black'
      }`}>
        
        {/* Dynamic Glass Blur Overlay for all non-landing views */}
        <div 
          className={`fixed inset-0 z-[-1] pointer-events-none transition-all duration-700 ${
            viewMode !== 'landing' 
              ? (isLightMode ? 'backdrop-blur-[12px] bg-white/20' : 'backdrop-blur-[12px] bg-black/30')
              : 'backdrop-blur-none bg-transparent'
          }`}
        />

        {/* Global Controls - Theme Toggle */}
        <div className="fixed top-4 right-6 z-[60] flex items-center gap-3">
          <button
            onClick={() => setIsLightMode(!isLightMode)}
            className={`p-2.5 rounded-full transition-all duration-300 shadow-md ${
              isLightMode 
                ? 'bg-white hover:bg-slate-50 text-amber-500 border border-slate-200' 
                : 'bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700'
            }`}
          >
            {isLightMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        {/* Seamless Scroll To Top Arrow (Top Left) */}
        <AnimatePresence>
          {viewMode === 'landing' && scrollY > 400 && (
            <motion.button
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={scrollToTop}
              className={`fixed top-6 left-6 z-[100] p-2 transition-transform hover:-translate-y-1 ${
                isLightMode ? 'text-slate-600 hover:text-slate-900 drop-shadow-md' : 'text-slate-400 hover:text-white drop-shadow-md'
              }`}
            >
              <ChevronUp className="w-8 h-8" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Pipeline Navigation Bar */}
        <AnimatePresence>
          {viewMode === 'pipeline' && (
            <motion.nav 
              initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }}
              className={`sticky top-0 z-40 px-4 py-3 border-b backdrop-blur-md shadow-sm ${
                isLightMode ? 'bg-white/80 border-slate-200' : 'bg-slate-900/80 border-slate-800'
              }`}
            >
              <div className="max-w-[1600px] mx-auto flex items-center gap-4 overflow-x-auto no-scrollbar">
                <button 
                  onClick={handleExitToPortals}
                  className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border transition ${
                    isLightMode ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Portals
                </button>
                <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setActivePortal(item.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                      activePortal === item.id 
                        ? (isLightMode ? 'bg-indigo-600 text-white shadow-md' : 'bg-indigo-500 text-white shadow-lg')
                        : (isLightMode ? 'text-slate-600 hover:bg-slate-100 hover:text-indigo-600' : 'text-slate-400 hover:bg-slate-800/60 hover:text-indigo-400')
                    }`}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>

        <main className="relative min-h-screen">
          <AnimatePresence mode="wait">
            
            {/* VIEW 1: CINEMATIC LANDING PAGE */}
            {viewMode === 'landing' && (
              <motion.div 
                key="landing"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="relative w-full z-10 pb-48"
              >
                {/* --- HERO SECTION --- */}
                <motion.div {...fadeAnimProps} className="h-screen flex flex-col items-center justify-center text-center relative px-4 w-full">
                  <div className="max-w-[1100px] mx-auto w-full flex flex-col items-center justify-center mt-[-8vh]">
                    <span className="text-sm md:text-base font-bold font-mono tracking-[0.2em] uppercase mb-6 block text-amber-500">
                      NYUAD iGEM 2026
                    </span>
                    <h1 className={`text-2xl md:text-4xl lg:text-5xl font-extrabold tracking-tight uppercase leading-[1.1] mb-4 font-sans ${isLightMode ? 'text-amber-950' : 'text-white'}`}>
                      iGEM Modeling Toolkit To<br/>Study Sand Stabilization
                    </h1>
                    <p className="text-base md:text-lg lg:text-xl font-medium max-w-3xl mx-auto opacity-70 leading-relaxed">
                      Explore our Simulated 3-pronged solution to tackle wind-driven sand movement
                    </p>
                  </div>

                  {/* SCROLL TO LEARN MORE INDICATOR */}
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 1 }}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 opacity-60"
                  >
                    <span className="text-xs font-bold tracking-[0.3em] uppercase">Scroll to learn more</span>
                    <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
                      <ChevronDown className="w-6 h-6" />
                    </motion.div>
                  </motion.div>
                </motion.div>

                {/* --- CONTENT SECTIONS --- */}
                <div className="max-w-4xl mx-auto space-y-[25vh] px-4 sm:px-8 pt-[10vh]">
                  
                  {/* Scroll 1: Project Overview */}
                  <motion.div {...fadeAnimProps} className="text-center max-w-3xl mx-auto flex flex-col items-center">
                    <h2 className="text-2xl font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-6">Project Overview</h2>
                    <p className="text-lg leading-relaxed opacity-80 text-center">
                      This project tackles the environmental crisis of wind-driven desert sand erosion by engineering <i>Bacillus subtilis</i> to biologically stabilize sandy surfaces. We employ a three-pronged synthetic biology approach to maximize soil cohesion, utilize native desert resources, and ensure strict biosafety. By binding loose particulate matter into a durable crust, we aim to significantly reduce airborne dust and improve regional air quality.
                    </p>
                  </motion.div>

                  {/* Scroll 2: How Models Help */}
                  <motion.div {...fadeAnimProps} className="text-center max-w-3xl mx-auto flex flex-col items-center">
                    <h2 className="text-2xl font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-6">How do these models help?</h2>
                    <p className="text-lg leading-relaxed opacity-80 text-center">
                      These computational models bridge the gap between microscopic bacterial behaviors and macroscopic environmental impact. They allow researchers to simulate polymer cross-linking dynamics, optimize metabolic pathways for resource efficiency, and predict the real-world aeolian stress resistance of treated sand before committing to physical experiments.
                    </p>
                  </motion.div>

                  {/* Scroll 3: Lab Toolkit Usage */}
                  <motion.div {...fadeAnimProps} className="text-center max-w-3xl mx-auto flex flex-col items-center">
                    <h2 className="text-2xl font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-6">How to use this toolkit in the lab</h2>
                    <p className="text-lg leading-relaxed opacity-80 text-center">
                      Use this suite to fine-tune your wet lab parameters, such as incubation temperature, precursor concentrations, and inoculum volumes. The simulated outputs guide exact experimental setups, ensuring you achieve the optimal shear modulus and environmental durability in your physical assays.
                    </p>
                  </motion.div>

                  {/* Scroll 4: The 3 Prongs */}
                  <motion.div {...fadeAnimProps} className="max-w-5xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-10 border-b border-slate-200 dark:border-slate-800 pb-4">
                      <h2 className="text-3xl font-black uppercase tracking-widest">The Three Prongs</h2>
                      
                      <div className="flex items-center gap-4 mt-6 md:mt-0">
                        <span className="text-xs font-black uppercase tracking-widest opacity-60">Select Combination</span>
                        <button 
                          onClick={() => { setIsComboMode(!isComboMode); setSelectedProngs([]); }}
                          className={`w-14 h-7 rounded-full relative transition-colors duration-300 ${isComboMode ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                        >
                          <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-300 ${isComboMode ? 'left-8' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {PRONGS.map(prong => {
                        const isSelected = selectedProngs.includes(prong.id);
                        return (
                          <div 
                            key={prong.id}
                            onClick={() => {
                              if (isComboMode) {
                                setSelectedProngs(prev => prev.includes(prong.id) ? prev.filter(id => id !== prong.id) : [...prev, prong.id]);
                              } else {
                                setViewingProng(prong.id);
                              }
                            }}
                            className={`cursor-pointer p-8 rounded-3xl transition-all duration-300 backdrop-blur-xl flex flex-col items-center text-center group
                              ${isLightMode 
                                  ? 'bg-white/40 border-2 border-slate-200 hover:bg-white/70 shadow-lg hover:shadow-xl' 
                                  : 'bg-slate-900/40 border-2 border-slate-800 hover:bg-slate-800/60 shadow-2xl hover:shadow-indigo-500/10'
                              }
                              ${isSelected ? (isLightMode ? 'border-indigo-500 ring-4 ring-indigo-500/20 scale-[1.03]' : 'border-indigo-500 ring-4 ring-indigo-500/30 scale-[1.03]') : 'scale-100'}
                            `}
                          >
                            <div className="mb-5 p-4 rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 group-hover:scale-110 transition-transform duration-300">
                              {prong.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-3 tracking-tight">{prong.title}</h3>
                            <p className="text-sm font-medium opacity-70 leading-relaxed">{prong.short}</p>
                            
                            {isComboMode && (
                              <div className={`mt-6 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                                isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 dark:border-slate-700 text-transparent'
                              }`}>
                                <CheckCircle2 className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    <AnimatePresence>
                      {isComboMode && selectedProngs.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                          className="mt-16 flex justify-center"
                        >
                          <button
                            onClick={handleProceedToModel}
                            className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-full uppercase tracking-widest transition-transform hover:scale-105 shadow-xl shadow-indigo-500/20 flex items-center gap-3"
                          >
                            Proceed to Model <ArrowRight className="w-5 h-5" />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                </div>
              </motion.div>
            )}

            {/* VIEW 2: PIPELINE */}
            {viewMode === 'pipeline' && (
              <motion.div key="pipeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-24 pb-12 px-4 md:px-8 max-w-[1600px] mx-auto">
                <div className="flex flex-col gap-8">
                  {activeTab === 'fba' && (
                    <AdvancedFbaPortal 
                      isLightMode={isLightMode}
                      onUpdatePrecursorFlux={handleUpdatePrecursorFlux}
                    />
                  )}
                  {activeTab === 'metabolic' && (
                    <MetabolicModel 
                      params={metabolicParams} 
                      setParams={setMetabolicParams}
                      targetYield={targetYield}
                      setTargetYield={setTargetYield}
                      calibratedKcat={calibratedKcat}
                      setCalibratedKcat={setCalibratedKcat}
                      isLightMode={isLightMode}
                    />
                  )}
                  {activeTab === 'crosslink' && (
                    <CrossLinkingBiophysics 
                      params={crosslinkParams}
                      setParams={setCrosslinkParams}
                      pgaAccum={pgaAccum}
                      isLinked={isLinked}
                      setIsLinked={setIsLinked}
                      shearModulus={shearModulus}
                      isLightMode={isLightMode}
                    />
                  )}
                  {/* ADDED: Protein Thermal Decay Tab Rendering */}
                  {activeTab === 'thermal' && (
                    <ProteinThermalDecay 
                      isLightMode={isLightMode}
                    />
                  )}
                  {activeTab === 'aeolian' && (
                    <AeolianWindTunnel 
                      params={aeolianParams}
                      setParams={setAeolianParams}
                      shearModulus={shearModulus}
                      isLinked={isLinked}
                      setIsLinked={setIsLinked}
                      isLightMode={isLightMode}
                    />
                  )}
                  {activeTab === 'ecological' && (
                    <EcologicalSpread 
                      config={ecologicalConfig}
                      setConfig={setEcologicalConfig}
                      pgaAccum={pgaAccum}
                      isLinked={isLinked}
                      setIsLinked={setIsLinked}
                      isLightMode={isLightMode}
                    />
                  )}
                  {activeTab === 'economic' && (
                    <EconomicScalabilityEngine 
                      polymerYield={pgaAccum}
                      requiredCrustThickness={12.0}
                      isLightMode={isLightMode}
                    />
                  )}
                </div>
              </motion.div>
            )}

            {/* VIEW 3: WET LAB */}
            {viewMode === 'wetlab-sandbox' && (
              <motion.div key="wetlab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-24 pb-12 px-4 md:px-8 max-w-[1400px] mx-auto">
                <button 
                  onClick={handleExitToPortals}
                  className={`mb-6 flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
                    isLightMode ? 'bg-stone-100 hover:bg-stone-200 text-stone-700' : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Portals
                </button>
                <WetLabSandbox2D 
                  onBack={handleExitToPortals} 
                  universalVitals={{ pgaAccum, shearModulus }}
                  isLightMode={isLightMode} 
                />
              </motion.div>
            )}

            {/* VIEW 4: PROTEIN SUITE */}
            {viewMode === 'protein-suite' && (
              <motion.div key="protein" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-24 pb-12 px-4 md:px-8 max-w-[1600px] mx-auto">
                <button 
                  onClick={handleExitToPortals}
                  className={`mb-6 flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
                    isLightMode ? 'bg-stone-100 hover:bg-stone-200 text-stone-700' : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Portals
                </button>
                <HighFidelityProteinExplorer isLightMode={isLightMode} />
              </motion.div>
            )}

            {/* VIEW 6: PRONG-TAILORED SIMULATION WORKSPACE */}
            {viewMode === 'simulation' && (
              <motion.div key="simulation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <SimulationWorkspace
                  selectedProngs={selectedProngs as ProngId[]}
                  isLightMode={isLightMode}
                  onBack={handleBackToLanding}
                />
              </motion.div>
            )}

          </AnimatePresence>
        </main>

        {/* --- GLOBAL MODALS --- */}
        <AnimatePresence>
          {/* Prong Information Modal */}
          {viewingProng !== null && !isComboMode && activeProngData && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/50"
              onClick={() => setViewingProng(null)}
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-2xl p-8 md:p-10 rounded-3xl shadow-2xl relative overflow-hidden ${
                  isLightMode ? 'bg-white text-slate-800' : 'bg-slate-900 border border-slate-800 text-slate-200'
                }`}
              >
                <button onClick={() => setViewingProng(null)} className={`absolute top-6 right-6 p-2 rounded-full transition-colors ${isLightMode ? 'bg-slate-100 hover:bg-slate-200' : 'bg-slate-800 hover:bg-slate-700'}`}>
                  <X className="w-5 h-5" />
                </button>
                
                <div className="mb-6 inline-block p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  {activeProngData.icon}
                </div>
                
                <h2 className="text-3xl font-black mb-8 tracking-tight">{activeProngData.title}</h2>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-bold font-mono uppercase tracking-widest text-indigo-500 mb-2">What it is</h4>
                    <p className="text-base leading-relaxed opacity-90">{activeProngData.whatItIs}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold font-mono uppercase tracking-widest text-emerald-500 mb-2">What the model does</h4>
                    <p className="text-base leading-relaxed opacity-90">{activeProngData.modelDoes}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold font-mono uppercase tracking-widest text-amber-500 mb-2">Impact</h4>
                    <p className="text-base leading-relaxed opacity-90 font-medium">{activeProngData.impact}</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* 4 Portals Selection Modal */}
          {showPortalsModal && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/60"
              onClick={() => setShowPortalsModal(false)}
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-4xl p-8 md:p-10 rounded-3xl shadow-2xl relative ${
                  isLightMode ? 'bg-white text-slate-800' : 'bg-slate-900 border border-slate-800 text-slate-200'
                }`}
              >
                <div className="flex justify-between items-center mb-10 border-b pb-6 border-slate-200 dark:border-slate-800">
                  <div>
                    <h2 className="text-3xl font-black tracking-tight mb-2">Select a Sandbox Portal</h2>
                    <p className="opacity-60 text-sm">Based on your selection, choose a module to begin simulation.</p>
                  </div>
                  <button onClick={() => setShowPortalsModal(false)} className={`p-2 rounded-full transition-colors ${isLightMode ? 'bg-slate-100 hover:bg-slate-200' : 'bg-slate-800 hover:bg-slate-700'}`}>
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PORTAL_CARDS.map(card => (
                    <div 
                      key={card.id}
                      onClick={() => handlePortalSelect(card.id as ViewMode)}
                      className={`cursor-pointer p-6 rounded-2xl border-2 transition-all duration-300 group flex items-start gap-4 ${
                        isLightMode 
                          ? 'border-slate-100 hover:border-indigo-500 hover:bg-indigo-50' 
                          : 'border-slate-800 hover:border-indigo-500 hover:bg-indigo-500/10'
                      }`}
                    >
                      <div className={`p-3 rounded-xl transition-colors ${isLightMode ? 'bg-white shadow-sm' : 'bg-slate-800 group-hover:bg-slate-900'}`}>
                        {card.icon}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg mb-1">{card.title}</h3>
                        <p className="text-sm opacity-70 leading-snug">{card.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </GlossaryProvider>
  );
}