'use client';

/**
 * Prong-aware Simulation Workspace — the destination of "Proceed to Model".
 * Composes a meaningful, combination-specific set of modules (a single prong is a valid
 * combination), threads each prong's binder output into a composite cohesion that drives the
 * macro wind-erosion result, and offers an Explore (all modules) or Guided (stepper) view.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft, ArrowRight, Wind, LayoutGrid, Footprints, ShieldCheck, Gauge,
} from 'lucide-react';

import type { MetabolicParams, BiophysicsParams, AeolianParams, CAConfig } from '../../types';
import {
  modulesForSelection, PRONGS, combinationLabel, type ProngId, type ModuleId, type ModuleMeta,
} from '../../lib/prongs';
import {
  cohesionFromShearModulus, cohesionFromUCS, compositeCohesion, solveAeolian,
  uStarToFreestream, type ProngContribution,
} from '../../lib/physics';

import MetabolicModel from '../MetabolicModel';
import CrossLinkingBiophysics from '../CrossLinkingBiophysics';
import ProteinThermalDecay from '../ProteinThermalDecay';
import AeolianWindTunnel from '../AeolianWindTunnel';
import EcologicalSpread from '../EcologicalSpread';
import EconomicScalabilityEngine from '../EconomicScalabilityEngine';
import HighFidelityProteinExplorer from '../HighFidelityProteinExplorer';
import WetLabSandbox2D from '../WetLabSandbox2D';
import FbaOptimizationModule from './modules/FbaOptimizationModule';
import Caco3PrecipitationModule from './modules/Caco3PrecipitationModule';
import AlginateGelModule from './modules/AlginateGelModule';
import CaAnchoringModule from './modules/CaAnchoringModule';
import CompositeSynthesisPanel from './CompositeSynthesisPanel';

interface Props {
  selectedProngs: ProngId[];
  isLightMode: boolean;
  onBack: () => void;
}

export default function SimulationWorkspace({ selectedProngs, isLightMode, onBack }: Props) {
  const prongs = useMemo(() => [...selectedProngs].sort() as ProngId[], [selectedProngs]);
  const modules = useMemo(() => modulesForSelection(prongs), [prongs]);
  const [mode, setMode] = useState<'explore' | 'guided'>('explore');
  const [step, setStep] = useState(0);

  // --- Shared orchestration state (lifted; same defaults as the original pipeline) ---
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
  const [envModifier, setEnvModifier] = useState<number>(1.0);

  // New-prong binder outputs (bubbled up from their modules).
  const [caco3Out, setCaco3Out] = useState({ ucs: 0, calcitePct: 0, co2: 0 });
  const [alginateOut, setAlginateOut] = useState({ modulus: 0 });

  const handleCaco3 = useCallback((o: { ucs: number; calcitePct: number; co2: number }) => setCaco3Out(o), []);
  const handleAlginate = useCallback((o: { modulus: number }) => setAlginateOut(o), []);
  const handlePga = useCallback((v: number) => setPgaAccum(v), []);
  const handleShear = useCallback((g: number) => setShearModulus(g), []);
  const handleEnv = useCallback((m: number) => setEnvModifier(m), []);

  // --- Composite cohesion across active prongs (the unifying macro driver) ---
  const contributions = useMemo<ProngContribution[]>(() => {
    const out: ProngContribution[] = [];
    if (prongs.includes(1)) out.push({ prong: 1, cohesion: cohesionFromShearModulus(shearModulus) });
    if (prongs.includes(2)) out.push({ prong: 2, cohesion: cohesionFromUCS(caco3Out.ucs) });
    if (prongs.includes(3)) out.push({ prong: 3, cohesion: cohesionFromShearModulus(alginateOut.modulus) });
    return out;
  }, [prongs, shearModulus, caco3Out.ucs, alginateOut.modulus]);

  const composite = useMemo(() => compositeCohesion(contributions), [contributions]);

  // Headline macro result: how much the combination raises the wind-erosion threshold.
  const headline = useMemo(() => solveAeolian({
    grainDiameter: aeolianParams.sand_diameter,
    frictionVelocity: aeolianParams.wind_velocity,
    cohesion: composite.totalCohesion,
  }), [aeolianParams.sand_diameter, aeolianParams.wind_velocity, composite.totalCohesion]);

  const gEquivalent = composite.totalCohesion / 2.0e-6; // composite cohesion → equivalent stiffness for legacy panels

  const renderModule = useCallback((id: ModuleId) => {
    switch (id) {
      case 'fba':
        return <FbaOptimizationModule isLightMode={isLightMode} onUpdatePrecursorFlux={(v) => setMetabolicParams((p) => ({ ...p, s_precursor: Number(Math.max(0, v).toFixed(4)) }))} />;
      case 'metabolic':
        return <MetabolicModel params={metabolicParams} setParams={setMetabolicParams} onUpdatePgaAccum={handlePga} targetYield={targetYield} setTargetYield={setTargetYield} calibratedKcat={calibratedKcat} setCalibratedKcat={setCalibratedKcat} isLightMode={isLightMode} />;
      case 'crosslink':
        return <CrossLinkingBiophysics params={crosslinkParams} setParams={setCrosslinkParams} pgaAccum={pgaAccum} isLinked={isLinked} setIsLinked={setIsLinked} shearModulus={shearModulus} onUpdateShearModulus={handleShear} environmentalModifier={envModifier} isLightMode={isLightMode} />;
      case 'caco3':
        return <Caco3PrecipitationModule isLightMode={isLightMode} onUpdate={handleCaco3} />;
      case 'ca-anchoring':
        return <CaAnchoringModule isLightMode={isLightMode} />;
      case 'alginate':
        return <AlginateGelModule isLightMode={isLightMode} onUpdate={handleAlginate} />;
      case 'thermal':
        return <ProteinThermalDecay isLightMode={isLightMode} onUpdateEnvironmentalModifier={handleEnv} />;
      case 'protein-3d':
        return <HighFidelityProteinExplorer isLightMode={isLightMode} />;
      case 'ecological':
        return <EcologicalSpread config={ecologicalConfig} setConfig={setEcologicalConfig} pgaAccum={pgaAccum} isLinked={isLinked} setIsLinked={setIsLinked} isLightMode={isLightMode} />;
      case 'aeolian':
        return <AeolianWindTunnel params={aeolianParams} setParams={setAeolianParams} shearModulus={prongs.length > 1 ? gEquivalent : shearModulus} isLinked={isLinked} setIsLinked={setIsLinked} isLightMode={isLightMode} externalCohesion={composite.totalCohesion} />;
      case 'wetlab':
        return <WetLabSandbox2D onBack={onBack} universalVitals={{ pgaAccum, shearModulus }} isLightMode={isLightMode} />;
      case 'composite':
        return <CompositeSynthesisPanel isLightMode={isLightMode} prongs={prongs} contributions={contributions} />;
      case 'economic':
        return <EconomicScalabilityEngine isLightMode={isLightMode} polymerYield={pgaAccum} requiredCrustThickness={12.0} />;
      default:
        return null;
    }
  }, [isLightMode, metabolicParams, crosslinkParams, aeolianParams, ecologicalConfig, targetYield, calibratedKcat,
      pgaAccum, shearModulus, isLinked, envModifier, prongs, contributions, composite.totalCohesion, gEquivalent,
      onBack, handleCaco3, handleAlginate, handlePga, handleShear, handleEnv]);

  const sectionHeader = (m: ModuleMeta, index: number) => (
    <div className="flex items-center gap-3 mb-3">
      <div className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${isLightMode ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-950/40 text-indigo-400'}`}>
        <m.icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <h2 className={`text-sm font-black uppercase tracking-wide truncate ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
          <span className="opacity-40 mr-1.5">{String(index + 1).padStart(2, '0')}</span>{m.title}
        </h2>
        <p className={`text-[11px] truncate ${isLightMode ? 'text-stone-500' : 'text-slate-400'}`}>{m.blurb}</p>
      </div>
      <span className={`ml-auto text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border ${isLightMode ? 'border-stone-200 text-stone-500' : 'border-slate-700 text-slate-400'}`}>{m.scale}</span>
    </div>
  );

  const current = modules[Math.min(step, modules.length - 1)];

  return (
    <div className="pt-6 pb-24 px-4 md:px-8 max-w-[1600px] mx-auto">
      {/* Header / summary banner */}
      <div className={`p-6 rounded-2xl border mb-8 transition-colors ${isLightMode ? 'bg-white border-amber-900/10 shadow-sm' : 'bg-[#0a0f18] border-slate-800/80 shadow-xl'}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <button onClick={onBack} className={`mb-3 flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl transition ${isLightMode ? 'bg-stone-100 hover:bg-stone-200 text-stone-700' : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300'}`}>
              <ArrowLeft className="w-4 h-4" /> Back to Landing
            </button>
            <h1 className={`text-xl md:text-2xl font-extrabold tracking-tight ${isLightMode ? 'text-amber-950' : 'text-white'}`}>
              Tailored Simulation — {combinationLabel(prongs)}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {prongs.map((p) => {
                const P = PRONGS[p]; const Icon = P.icon;
                return (
                  <span key={p} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${isLightMode ? 'bg-stone-50 border-stone-200 text-stone-700' : 'bg-slate-900/60 border-slate-700 text-slate-200'}`}>
                    <Icon className={`w-3.5 h-3.5 ${P.accent}`} /> {P.title}
                  </span>
                );
              })}
              <span className={`text-[11px] ml-1 ${isLightMode ? 'text-stone-400' : 'text-slate-500'}`}>· {modules.length} modules</span>
            </div>
          </div>

          {/* Mode toggle */}
          <div className={`flex gap-1 p-1 rounded-xl border ${isLightMode ? 'bg-stone-50 border-stone-200' : 'bg-slate-900 border-slate-800'}`}>
            {(['explore', 'guided'] as const).map((md) => (
              <button key={md} onClick={() => { setMode(md); setStep(0); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition ${
                  mode === md ? (isLightMode ? 'bg-indigo-600 text-white shadow' : 'bg-indigo-500 text-white shadow') : (isLightMode ? 'text-stone-600 hover:bg-stone-100' : 'text-slate-400 hover:bg-slate-800')
                }`}>
                {md === 'explore' ? <LayoutGrid className="w-3.5 h-3.5" /> : <Footprints className="w-3.5 h-3.5" />} {md}
              </button>
            ))}
          </div>
        </div>

        {/* Headline macro result */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <HeadlineStat isLightMode={isLightMode} icon={Wind} label="Untreated threshold" value={`${uStarToFreestream(headline.uStarT0).toFixed(1)}`} unit="m/s" />
          <HeadlineStat isLightMode={isLightMode} icon={ShieldCheck} label="Treated threshold" value={`${uStarToFreestream(headline.uStarT).toFixed(1)}`} unit="m/s" emphasize />
          <HeadlineStat isLightMode={isLightMode} icon={Gauge} label="Erosion reduction" value={`${(headline.fluxReduction * 100).toFixed(0)}`} unit="%" />
          <HeadlineStat isLightMode={isLightMode} icon={ShieldCheck} label="Composite cohesion" value={(composite.totalCohesion * 1000).toFixed(1)} unit="mN/m" />
        </div>
      </div>

      {/* Module body */}
      {mode === 'explore' ? (
        <div className="space-y-10">
          {modules.map((m, i) => (
            <motion.section key={m.id} id={`mod-${m.id}`}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.5 }}>
              {sectionHeader(m, i)}
              {renderModule(m.id)}
            </motion.section>
          ))}
        </div>
      ) : (
        <div>
          {/* Stepper progress */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar">
            {modules.map((m, i) => (
              <button key={m.id} onClick={() => setStep(i)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition ${
                  i === step ? (isLightMode ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white') : i < step ? (isLightMode ? 'bg-emerald-50 text-emerald-700' : 'bg-emerald-950/30 text-emerald-400') : (isLightMode ? 'bg-stone-100 text-stone-500' : 'bg-slate-900 text-slate-500')
                }`}>
                <m.icon className="w-3.5 h-3.5" /> {i + 1}
              </button>
            ))}
          </div>
          <motion.section key={current.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
            {sectionHeader(current, step)}
            {renderModule(current.id)}
          </motion.section>
          <div className="flex justify-between mt-8">
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition disabled:opacity-40 ${isLightMode ? 'bg-stone-100 hover:bg-stone-200 text-stone-700' : 'bg-slate-900 hover:bg-slate-800 text-slate-300'}`}>
              <ArrowLeft className="w-4 h-4" /> Previous
            </button>
            <button onClick={() => setStep((s) => Math.min(modules.length - 1, s + 1))} disabled={step >= modules.length - 1}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-40">
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function HeadlineStat({ isLightMode, icon: Icon, label, value, unit, emphasize }: {
  isLightMode: boolean; icon: React.ComponentType<{ className?: string }>; label: string; value: string; unit: string; emphasize?: boolean;
}) {
  return (
    <div className={`p-3 rounded-xl border ${emphasize ? (isLightMode ? 'bg-indigo-50/60 border-indigo-200' : 'bg-indigo-950/20 border-indigo-900/40') : (isLightMode ? 'bg-[#fcfaf4] border-amber-900/10' : 'bg-[#05070c] border-slate-850')}`}>
      <span className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider mb-1 ${isLightMode ? 'text-stone-500' : 'text-slate-500'}`}>
        <Icon className="w-3 h-3" /> {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className={`font-black text-lg ${emphasize ? (isLightMode ? 'text-indigo-700' : 'text-indigo-400') : (isLightMode ? 'text-slate-800' : 'text-slate-200')}`}>{value}</span>
        <span className={`text-[10px] font-mono ${isLightMode ? 'text-stone-500' : 'text-slate-500'}`}>{unit}</span>
      </div>
    </div>
  );
}
