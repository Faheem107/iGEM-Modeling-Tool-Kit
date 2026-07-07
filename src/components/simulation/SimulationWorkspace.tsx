'use client';

/**
 * Prong-aware Simulation Workspace — the destination of "Proceed to Model".
 * Composes a meaningful, combination-specific set of modules (a single prong is a valid
 * combination), threads each prong's binder output into a composite cohesion that drives the
 * macro wind-erosion result, and presents them as one scrollable path alongside the Sandyx
 * companion rail (a mascot + a module "tree" that fills in as you scroll).
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft, Wind, ShieldCheck, Gauge,
} from 'lucide-react';

import type { MetabolicParams, BiophysicsParams, AeolianParams, CAConfig } from '../../types';
import {
  modulesForSelection, PRONGS, combinationLabel, type ProngId, type ModuleId, type ModuleMeta,
} from '../../lib/prongs';
import {
  cohesionFromShearModulus, cohesionFromUCS, compositeCohesion, solveAeolian,
  uStarToFreestream, prongYieldFactors, prongInteractions, type ProngContribution,
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
import GrainSizeCoveragePanel from './GrainSizeCoveragePanel';
import CuringTimelinePanel from './CuringTimelinePanel';
import SandyxCompanion from '../SandyxCompanion';
import ModuleErrorBoundary from '../ErrorBoundary';
import { GlossaryText } from '../GlossaryTerm';

interface Props {
  selectedProngs: ProngId[];
  isLightMode: boolean;
  onBack: () => void;
}

export default function SimulationWorkspace({ selectedProngs, isLightMode, onBack }: Props) {
  const prongs = useMemo(() => [...selectedProngs].sort() as ProngId[], [selectedProngs]);
  const modules = useMemo(() => modulesForSelection(prongs), [prongs]);
  const treeItems = useMemo(() => modules.map((m) => ({ id: `mod-${m.id}`, label: m.title })), [modules]);

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
  const [caDisplayEff, setCaDisplayEff] = useState(1);

  // All module→workspace reporters are idempotent: they no-op when the value is unchanged, so the
  // cross-module coupling (e.g. CA display → CaCO₃ → composite) always settles and can't loop.
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  const handleCaco3 = useCallback((o: { ucs: number; calcitePct: number; co2: number }) =>
    setCaco3Out((p) => (near(p.ucs, o.ucs) && near(p.calcitePct, o.calcitePct) && near(p.co2, o.co2) ? p : o)), []);
  const handleAlginate = useCallback((o: { modulus: number }) =>
    setAlginateOut((p) => (near(p.modulus, o.modulus) ? p : o)), []);
  const handleCaDisplay = useCallback((o: { displayEfficiency: number }) =>
    setCaDisplayEff((p) => (near(p, o.displayEfficiency) ? p : o.displayEfficiency)), []);
  const handlePga = useCallback((v: number) => setPgaAccum((p) => (near(p, v) ? p : v)), []);
  const handleShear = useCallback((g: number) => setShearModulus((p) => (near(p, g) ? p : g)), []);
  const handleEnv = useCallback((m: number) => setEnvModifier((p) => (near(p, m) ? p : m)), []);
  // Stable + guarded: the FBA precursor feed used to be an inline arrow, so it changed identity
  // every render, re-fired the module's effect, and set a fresh metabolicParams object each time —
  // an infinite update loop. A memoised, value-guarded callback breaks it.
  const handlePrecursorFlux = useCallback((v: number) => {
    const clean = Number(Math.max(0, v).toFixed(4));
    setMetabolicParams((p) => (near(p.s_precursor, clean) ? p : { ...p, s_precursor: clean }));
  }, []);

  // The bacterial prongs present (γ-PGA and/or CaCO₃) — drives the shared cell-level modules.
  const bacterialProngs = useMemo(() => prongs.filter((p) => p === 1 || p === 2) as ProngId[], [prongs]);

  // --- Composite cohesion across active prongs (the unifying macro driver) ---
  // Each prong's standalone cohesion is first knocked down by the inter-prong interactions
  // (shared-Ca²⁺ competition + co-expression metabolic burden), THEN combined with the
  // physicochemical synergy term — so the macro result reflects genuine competition.
  const interactions = useMemo(() => prongInteractions(prongs), [prongs]);
  const yieldFactors = useMemo(() => prongYieldFactors(prongs), [prongs]);
  const contributions = useMemo<ProngContribution[]>(() => {
    const standalone: Record<number, number> = {
      1: cohesionFromShearModulus(shearModulus),
      2: cohesionFromUCS(caco3Out.ucs),
      3: cohesionFromShearModulus(alginateOut.modulus),
    };
    return prongs.map((p) => ({ prong: p, cohesion: standalone[p] * (yieldFactors[p] ?? 1) }));
  }, [prongs, shearModulus, caco3Out.ucs, alginateOut.modulus, yieldFactors]);

  const composite = useMemo(() => compositeCohesion(contributions), [contributions]);

  // Headline macro result: how much the combination raises the wind-erosion threshold.
  const headline = useMemo(() => solveAeolian({
    grainDiameter: aeolianParams.sand_diameter,
    frictionVelocity: aeolianParams.wind_velocity,
    cohesion: composite.totalCohesion,
  }), [aeolianParams.sand_diameter, aeolianParams.wind_velocity, composite.totalCohesion]);

  const gEquivalent = composite.totalCohesion / 2.0e-6; // composite cohesion → equivalent stiffness for legacy panels

  // Effective vitals so Prong-2/3-only combinations never run on stale γ-PGA defaults:
  //  - stiffness falls back to the composite-equivalent when Prong 1 isn't present,
  //  - the "bacterial drive" for colony spread / wet-lab uses γ-PGA when present, else the
  //    realised CaCO₃ output (a genuine Prong-2 productivity signal).
  const has1 = prongs.includes(1);
  const effectiveShear = has1 ? shearModulus : gEquivalent;
  const bacterialDrive = has1 ? pgaAccum : Math.min(220, 30 + caco3Out.calcitePct * 25);

  const renderModule = useCallback((id: ModuleId) => {
    switch (id) {
      case 'fba':
        return <FbaOptimizationModule isLightMode={isLightMode} prongs={bacterialProngs} onUpdatePrecursorFlux={handlePrecursorFlux} />;
      case 'metabolic':
        return <MetabolicModel params={metabolicParams} setParams={setMetabolicParams} onUpdatePgaAccum={handlePga} targetYield={targetYield} setTargetYield={setTargetYield} calibratedKcat={calibratedKcat} setCalibratedKcat={setCalibratedKcat} isLightMode={isLightMode} />;
      case 'crosslink':
        return <CrossLinkingBiophysics params={crosslinkParams} setParams={setCrosslinkParams} pgaAccum={pgaAccum} isLinked={isLinked} setIsLinked={setIsLinked} shearModulus={shearModulus} onUpdateShearModulus={handleShear} environmentalModifier={envModifier} isLightMode={isLightMode} />;
      case 'caco3':
        return <Caco3PrecipitationModule isLightMode={isLightMode} onUpdate={handleCaco3} displayEfficiency={caDisplayEff} />;
      case 'ca-anchoring':
        return <CaAnchoringModule isLightMode={isLightMode} onUpdate={handleCaDisplay} />;
      case 'alginate':
        return <AlginateGelModule isLightMode={isLightMode} onUpdate={handleAlginate} />;
      case 'thermal':
        return <ProteinThermalDecay isLightMode={isLightMode} onUpdateEnvironmentalModifier={handleEnv} />;
      case 'protein-3d':
        return <HighFidelityProteinExplorer isLightMode={isLightMode} prongs={bacterialProngs as (1 | 2 | 3)[]} />;
      case 'ecological':
        return <EcologicalSpread config={ecologicalConfig} setConfig={setEcologicalConfig} pgaAccum={bacterialDrive} isLinked={isLinked} setIsLinked={setIsLinked} isLightMode={isLightMode} activeProngs={bacterialProngs} />;
      case 'aeolian':
        return <AeolianWindTunnel params={aeolianParams} setParams={setAeolianParams} shearModulus={prongs.length > 1 ? gEquivalent : shearModulus} isLinked={isLinked} setIsLinked={setIsLinked} isLightMode={isLightMode} externalCohesion={composite.totalCohesion} activeProngs={prongs} />;
      case 'wetlab':
        return <WetLabSandbox2D onBack={onBack} universalVitals={{ pgaAccum: bacterialDrive, shearModulus: effectiveShear }} isLightMode={isLightMode} />;
      case 'grainsize':
        return <GrainSizeCoveragePanel isLightMode={isLightMode} prongs={prongs} yieldFactors={yieldFactors} />;
      case 'composite':
        return <CompositeSynthesisPanel isLightMode={isLightMode} prongs={prongs} contributions={contributions} interactions={interactions} />;
      case 'curing':
        return <CuringTimelinePanel isLightMode={isLightMode} prongs={prongs} contributions={contributions} grainDiameter={aeolianParams.sand_diameter} />;
      case 'economic':
        return <EconomicScalabilityEngine isLightMode={isLightMode} prongs={prongs} contributions={contributions} polymerYield={pgaAccum} alginateModulus={alginateOut.modulus} caco3={caco3Out} requiredCrustThickness={12.0} />;
      default:
        return null;
    }
  }, [isLightMode, metabolicParams, crosslinkParams, aeolianParams, ecologicalConfig, targetYield, calibratedKcat,
      pgaAccum, shearModulus, isLinked, envModifier, prongs, contributions, composite.totalCohesion, gEquivalent,
      bacterialProngs, bacterialDrive, effectiveShear, caDisplayEff, caco3Out, alginateOut.modulus,
      interactions, yieldFactors, onBack, handleCaco3, handleAlginate, handleCaDisplay, handlePga, handleShear, handleEnv, handlePrecursorFlux]);

  const sectionHeader = (m: ModuleMeta, index: number) => (
    <div className="flex items-center gap-3 mb-3">
      <div className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${isLightMode ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-950/40 text-indigo-400'}`}>
        <m.icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <h2 className={`text-sm font-black uppercase tracking-wide truncate ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
          <span className="opacity-40 mr-1.5">{String(index + 1).padStart(2, '0')}</span>{m.title}
        </h2>
        <p className={`text-[11px] ${isLightMode ? 'text-stone-500' : 'text-slate-400'}`}><GlossaryText max={4}>{m.blurb}</GlossaryText></p>
      </div>
      <span className={`ml-auto text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border ${isLightMode ? 'border-stone-200 text-stone-500' : 'border-slate-700 text-slate-400'}`}>{m.scale}</span>
    </div>
  );

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
        </div>

        {/* Headline macro result */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <HeadlineStat isLightMode={isLightMode} icon={Wind} label="Untreated threshold" value={`${uStarToFreestream(headline.uStarT0).toFixed(1)}`} unit="m/s" />
          <HeadlineStat isLightMode={isLightMode} icon={ShieldCheck} label="Treated threshold" value={`${uStarToFreestream(headline.uStarT).toFixed(1)}`} unit="m/s" emphasize />
          <HeadlineStat isLightMode={isLightMode} icon={Gauge} label="Erosion reduction" value={`${(headline.fluxReduction * 100).toFixed(0)}`} unit="%" />
          <HeadlineStat isLightMode={isLightMode} icon={ShieldCheck} label="Composite cohesion" value={(composite.totalCohesion * 1000).toFixed(1)} unit="mN/m" />
        </div>
      </div>

      {/* Rail + stacked modules */}
      <div className="lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-8">
        <SandyxCompanion items={treeItems} isLightMode={isLightMode} />

        <div className="space-y-10 min-w-0">
          {modules.map((m, i) => (
            <motion.section key={m.id} id={`mod-${m.id}`} className="scroll-mt-24"
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.5 }}>
              {sectionHeader(m, i)}
              <ModuleErrorBoundary isLightMode={isLightMode} label={m.title}>
                {renderModule(m.id)}
              </ModuleErrorBoundary>
            </motion.section>
          ))}
        </div>
      </div>
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
