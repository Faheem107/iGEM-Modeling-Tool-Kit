import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, 
  Coins, 
  Layers, 
  ShieldCheck, 
  Sprout, 
  Globe, 
  Building2, 
  FileSpreadsheet, 
  ArrowRight,
  Calculator,
  Award,
  CircleAlert,
  HelpCircle,
  HelpCircle as InfoIcon
} from 'lucide-react';

interface EconomicScalabilityEngineProps {
  isLightMode: boolean;
  polymerYield: number; // in g/L (generally in range 10 - 80 g/L)
  requiredCrustThickness: number; // in mm (typically 5 to 50 mm)
}

export default function EconomicScalabilityEngine({
  isLightMode,
  polymerYield = 35.0,
  requiredCrustThickness = 15.0
}: EconomicScalabilityEngineProps) {
  // 1. Interactive Inputs
  const [targetArea, setTargetArea] = useState<number>(100); // 100 Hectares default
  const [polymerDemandDensity, setPolymerDemandDensity] = useState<number>(1.5); // kg of gamma-PGA required per cubic meter of treated sand

  // Industrial media cost constants
  const GLUCOSE_COST_KG = 0.40; // $/kg industrial glucose
  const NITROGEN_SALT_COST_L = 0.08; // $/L culture cost of other ingredients
  const WATER_UTILITIES_COST_L = 0.04; // $/L utility cost for sterilization & aeration

  // Traditional stabilization benchmarks ($ / Hectare)
  const CHEMICAL_SPRAY_COST_HA = 2800;
  const CONCRETE_BLANKET_COST_HA = 18500;

  // 2. Calculations
  const calculatedMetrics = useMemo(() => {
    // 1 Hectare = 10,000 m²
    const areaM2 = targetArea * 10000;
    
    // Total soil volume to be treated (m³)
    const targetThicknessM = requiredCrustThickness / 1000;
    const totalVolumeM3 = areaM2 * targetThicknessM;

    // Total biopolymer (γ-PGA) required (kg)
    const totalPgaRequiredKg = totalVolumeM3 * polymerDemandDensity;

    // Fermentation volume required (Liters)
    // polymerYield is in g/L, which is kg/m³ (so 1 g/L = 0.001 kg/L)
    const effectiveYieldKgPerL = Math.max(1.0, polymerYield) / 1000;
    const totalFermentationLiters = totalPgaRequiredKg / effectiveYieldKgPerL;

    // Standard industrial 50,000 Liter batches
    const bioreactorRuns = Math.ceil(totalFermentationLiters / 50000);

    // Cost Breakdown per Liter of Culture:
    // Standard culture uses roughly 3% glucose (30g glucose per Liter)
    // Glucose cost per Liter: 0.03 kg * GLUCOSE_COST_KG
    const glucoseCostPerL = 0.03 * GLUCOSE_COST_KG;
    const mediaCostPerL = glucoseCostPerL + NITROGEN_SALT_COST_L;
    const totalProductionCostPerL = mediaCostPerL + WATER_UTILITIES_COST_L;

    // Fermentation Production Expenditures ($)
    const fermentationCost = totalFermentationLiters * totalProductionCostPerL;
    
    // Distribution, spraying and field application costs: $150 / Hectare
    const fieldApplicationCost = targetArea * 180;
    
    // Total Biosynthetic Capital Expenditure
    const totalBioCost = fermentationCost + fieldApplicationCost;

    // Traditional Comparison Costs
    const totalChemicalCost = targetArea * CHEMICAL_SPRAY_COST_HA;
    const totalConcreteCost = targetArea * CONCRETE_BLANKET_COST_HA;

    // Cost savings offsets
    const savingsVsConcrete = totalConcreteCost > 0 
      ? ((totalConcreteCost - totalBioCost) / totalConcreteCost) * 100 
      : 0;
    
    const savingsVsChemical = totalChemicalCost > 0
      ? ((totalChemicalCost - totalBioCost) / totalChemicalCost) * 100
      : 0;

    // LCA Carbon Offset:
    // Cement production releases ~0.9 metric tons of CO2 per ton of cement.
    // Structural concrete uses ~300 kg cement per m³. 
    // Thus structural concrete releases ~0.27 Metric Tons (270kg) of CO2 per m³!
    // Our biological pathway has a strong negative footprint because Bacillus traps carbon, 
    // and we avoid energy-intensive cement kilns.
    // Avoided carbon = 0.27 MT of CO2 per m³ of equivalent concrete volume.
    // Plus biopolymer storage sequestration in dry soils (~0.12 kg CO2 sequestered per kg PGA)
    const co2AvoidedFromCement = totalVolumeM3 * 0.27;
    const co2SequesteredViaBiomass = totalPgaRequiredKg * 0.12;
    const totalCo2AvoidedTons = co2AvoidedFromCement + (co2SequesteredViaBiomass / 1000);

    return {
      totalVolumeM3,
      totalPgaRequiredKg,
      totalFermentationLiters,
      bioreactorRuns,
      totalProductionCostPerL,
      totalBioCost,
      totalChemicalCost,
      totalConcreteCost,
      savingsVsConcrete,
      savingsVsChemical,
      totalCo2AvoidedTons
    };
  }, [targetArea, requiredCrustThickness, polymerYield, polymerDemandDensity]);

  const {
    totalVolumeM3,
    totalPgaRequiredKg,
    totalFermentationLiters,
    bioreactorRuns,
    totalProductionCostPerL,
    totalBioCost,
    totalChemicalCost,
    totalConcreteCost,
    savingsVsConcrete,
    savingsVsChemical,
    totalCo2AvoidedTons
  } = calculatedMetrics;

  // Maximum value for SVG bar chart scales
  const maxYVal = Math.max(totalBioCost, totalChemicalCost, totalConcreteCost, 1000);

  return (
    <div className={`p-5 rounded-xl border transition-all duration-300 font-sans ${
      isLightMode ? 'bg-[#fcfaf5] border-amber-900/10 shadow-sm' : 'bg-[#06080d] border-slate-850/90'
    }`} id="economic-scalability-engine">
      
      {/* Upper header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b pb-4 border-dashed border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${isLightMode ? 'bg-amber-100/80 text-[#3e271e]' : 'bg-amber-950/45 text-amber-400'}`}>
            <Coins className="w-5.5 h-5.5" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider font-mono">
              Economic Scalability &amp; LCA Engine
            </h3>
            <p className="text-[10px] text-slate-500">
              Macroeconomic financial viability ledger linked to cellular yield and crust biophysics.
            </p>
          </div>
        </div>

        {/* Real-time status badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-mono border ${
          isLightMode ? 'bg-amber-50 border-amber-200 text-stone-750' : 'bg-[#0b1322] border-slate-800 text-slate-350'
        }`}>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>FBA Yield Feed: <strong className="text-emerald-400 font-extrabold">{polymerYield.toFixed(1)} g/L</strong></span>
        </div>
      </div>

      {/* Main Core Analytics Bento Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-6">
        
        {/* Sliders Input Panel (4 Cols) */}
        <div className="md:col-span-4 space-y-4">
          <div className={`p-4 rounded-xl border space-y-4 h-full flex flex-col justify-between ${
            isLightMode ? 'bg-amber-50/40 border-amber-900/5' : 'bg-[#0a0f18]/60 border-slate-900'
          }`}>
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#a5b4fc] font-mono mb-4">
                <Calculator className="w-4 h-4 text-indigo-400 animate-spin" style={{ animationDuration: '6s' }} /> Scale Specifications
              </div>

              {/* Slider 1: Target Area Hectares */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="font-semibold text-slate-400">Stabilization Area:</span>
                  <span className="font-mono font-bold text-amber-500">
                    {targetArea.toLocaleString()} Ha
                  </span>
                </div>
                <input 
                  type="range"
                  min="1"
                  max="1000"
                  step="5"
                  value={targetArea}
                  onChange={(e) => setTargetArea(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-[8px] text-slate-600 font-mono">
                  <span>1 Ha (Dune-spur)</span>
                  <span>1,000 Ha (Regreen corridor)</span>
                </div>
              </div>

              {/* Slider 2: Polymer Demand Density */}
              <div className="space-y-1.5 mt-4">
                <div className="flex justify-between text-[11px]">
                  <span className="font-semibold text-slate-400">Polymer Density:</span>
                  <span className="font-mono font-bold text-sky-400">
                    {polymerDemandDensity.toFixed(2)} kg/m³
                  </span>
                </div>
                <input 
                  type="range"
                  min="0.5"
                  max="5.0"
                  step="0.1"
                  value={polymerDemandDensity}
                  onChange={(e) => setPolymerDemandDensity(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-450"
                />
                <div className="flex justify-between text-[8px] text-slate-650 font-mono">
                  <span>0.5 kg/m³ (Light)</span>
                  <span>5.0 kg/m³ (Heavy-load)</span>
                </div>
              </div>
            </div>

            {/* Micro readouts panel */}
            <div className={`p-3 rounded-lg border mt-4 text-[11px] space-y-2 font-mono ${
              isLightMode ? 'bg-amber-100/20 border-amber-900/10 text-stone-700' : 'bg-[#04080e] border-slate-900 text-slate-400'
            }`}>
              <div className="flex justify-between">
                <span>Crust Depth:</span>
                <span className="text-white font-bold">{requiredCrustThickness.toFixed(1)} mm</span>
              </div>
              <div className="flex justify-between">
                <span>Reinforced Volume:</span>
                <span className="text-white font-bold">{totalVolumeM3.toLocaleString(undefined, {maximumFractionDigits: 0})} m³</span>
              </div>
              <div className="flex justify-between">
                <span>Media Cost/L:</span>
                <span className="text-white font-bold">${totalProductionCostPerL.toFixed(3)}/L</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Massive Glowing KPI Cards (8 Cols total in a 2x2 grid) */}
        <div className="md:col-span-8 grid grid-cols-2 gap-4">
          
          {/* KPI 1: Capital Expenditure */}
          <div className={`p-4 rounded-xl border relative overflow-hidden flex flex-col justify-between ${
            isLightMode ? 'bg-amber-50/20 border-amber-900/10 text-stone-850' : 'bg-[#080d16] border-slate-850'
          }`}>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase text-slate-500 font-mono tracking-wider">Estimated Capex Cost (Bio)</span>
              <Coins className="w-4 h-4 text-amber-500 opacity-60" />
            </div>
            <div className="mt-2.5">
              <div className="text-lg md:text-xl font-black font-mono tracking-tight text-amber-500">
                ${totalBioCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <p className="text-[9px] text-slate-500 mt-1">
                Glucose feed formulation + distribution.
              </p>
            </div>
          </div>

          {/* KPI 2: Fermentation Volume */}
          <div className={`p-4 rounded-xl border relative overflow-hidden flex flex-col justify-between ${
            isLightMode ? 'bg-amber-50/20 border-amber-900/10' : 'bg-[#080d16] border-slate-850'
          }`}>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase text-slate-500 font-mono tracking-wider">Industrial Fermentation Vol</span>
              <Layers className="w-4 h-4 text-purple-400 opacity-60" />
            </div>
            <div className="mt-2.5">
              <div className="text-lg md:text-xl font-black font-mono tracking-tight text-white leading-none">
                {totalFermentationLiters.toLocaleString(undefined, { maximumFractionDigits: 0 })} L
              </div>
              <div className="text-[10px] font-semibold text-emerald-400 font-mono mt-1 flex items-center gap-1">
                <ArrowRight className="w-3 h-3" /> {bioreactorRuns} runs (50kL reactors)
              </div>
            </div>
          </div>

          {/* KPI 3: Carbon Footprint Avoided */}
          <div className={`p-4 rounded-xl border relative overflow-hidden flex flex-col justify-between hover:border-emerald-500/40 transition-all ${
            isLightMode ? 'bg-amber-50/20 border-amber-900/10' : 'bg-[#080d16] border-slate-850'
          }`}>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase text-slate-500 font-mono tracking-wider">Net CO2 Offset / Avoided</span>
              <Sprout className="w-4 h-4 text-emerald-400 opacity-70 animate-bounce" />
            </div>
            <div className="mt-2.5">
              <div className="text-lg md:text-xl font-black font-mono tracking-tight text-emerald-400">
                {totalCo2AvoidedTons.toLocaleString(undefined, { maximumFractionDigits: 0 })} MT eCO₂
              </div>
              <p className="text-[9px] text-slate-500 mt-1">
                Avoided high-firing cement kilns footprint.
              </p>
            </div>
          </div>

          {/* KPI 4: Financial Savings vs Traditional */}
          <div className={`p-4 rounded-xl border relative overflow-hidden flex flex-col justify-between ${
            isLightMode ? 'bg-amber-50/20 border-amber-900/10' : 'bg-[#080d16] border-slate-850'
          }`}>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase text-slate-500 font-mono tracking-wider">Savings vs Concrete</span>
              <Award className="w-4 h-4 text-sky-400 opacity-60" />
            </div>
            <div className="mt-2.5">
              <div className="text-lg md:text-xl font-black font-mono tracking-tight text-sky-400">
                {savingsVsConcrete.toFixed(1)}% Saving
              </div>
              <p className="text-[9px] text-slate-500 mt-1">
                Traditional concrete costing ${totalConcreteCost.toLocaleString(undefined, {maximumFractionDigits: 0})} total.
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* Financial Comparison & LCA Footprint Bar Chart Area */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* Dynamic Cost Comparison Bar Chart */}
        <div className={`md:col-span-8 p-4 rounded-xl border ${
          isLightMode ? 'bg-amber-100/10 border-amber-900/5' : 'bg-[#03060a]/90 border-slate-900'
        }`}>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 font-mono flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Project Capital Cost Comparison Vector (USD)
          </h4>

          {/* Core SVG bar chart */}
          <div className="h-[210px] w-full dynamic-svg-barchart-container">
            <svg viewBox="0 0 450 180" width="100%" height="100%" className="overflow-visible">
              {/* Grid Lines */}
              <line x1="60" y1="20" x2="430" y2="20" stroke="#1e293b" strokeDasharray="2,3" strokeWidth="0.8" />
              <line x1="60" y1="70" x2="430" y2="70" stroke="#1e293b" strokeDasharray="2,3" strokeWidth="0.8" />
              <line x1="60" y1="120" x2="430" y2="120" stroke="#1e293b" strokeDasharray="2,3" strokeWidth="0.8" />
              <line x1="60" y1="150" x2="430" y2="150" stroke="#334155" strokeWidth="1" />

              {/* Bar 1: Synthetic Biomaterial */}
              <rect 
                x="80" 
                y={150 - Math.max(10, (totalBioCost / maxYVal) * 120)} 
                width="40" 
                height={Math.max(10, (totalBioCost / maxYVal) * 120)} 
                fill="url(#grad-bio-bar)" 
                rx="4"
                className="transition-all duration-300 hover:opacity-90"
              />
              {/* Cost text label */}
              <text 
                x="100" 
                y={140 - Math.max(10, (totalBioCost / maxYVal) * 120)} 
                fontSize="8.5" 
                fill="#f59e0b" 
                className="font-mono font-bold" 
                textAnchor="middle"
              >
                ${(totalBioCost / 1000).toFixed(1)}k
              </text>

              {/* Bar 2: Classical Chemical Polymers */}
              <rect 
                x="200" 
                y={150 - Math.max(10, (totalChemicalCost / maxYVal) * 120)} 
                width="40" 
                height={Math.max(10, (totalChemicalCost / maxYVal) * 120)} 
                fill="#38bdf8" 
                rx="4"
                className="transition-all duration-300 hover:opacity-90"
              />
              <text 
                x="220" 
                y={140 - Math.max(10, (totalChemicalCost / maxYVal) * 120)} 
                fontSize="8.5" 
                fill="#38bdf8" 
                className="font-mono font-bold" 
                textAnchor="middle"
              >
                ${(totalChemicalCost / 1000).toFixed(1)}k
              </text>

              {/* Bar 3: Traditional Concrete Blankets */}
              <rect 
                x="320" 
                y={150 - Math.max(10, (totalConcreteCost / maxYVal) * 120)} 
                width="40" 
                height={Math.max(10, (totalConcreteCost / maxYVal) * 120)} 
                fill="#ef4444" 
                rx="4"
                className="transition-all duration-300 hover:opacity-90"
              />
              <text 
                x="340" 
                y={140 - Math.max(10, (totalConcreteCost / maxYVal) * 120)} 
                fontSize="8.5" 
                fill="#ef4444" 
                className="font-mono font-bold" 
                textAnchor="middle"
              >
                ${(totalConcreteCost / 1000).toFixed(1)}k
              </text>

              {/* X Axis Labels */}
              <text x="100" y="165" fontSize="8" fill="#94a3b8" className="font-mono font-bold" textAnchor="middle">Bio-PGA (Ours)</text>
              <text x="220" y="165" fontSize="8" fill="#94a3b8" className="font-mono" textAnchor="middle">Chemical Spray</text>
              <text x="340" y="165" fontSize="8" fill="#94a3b8" className="font-mono" textAnchor="middle">Concrete Blanket</text>

              {/* Y Axis Reference Labels */}
              <text x="50" y="24" fontSize="7" fill="#64748b" className="font-mono" textAnchor="end">Max Limit</text>
              <text x="50" y="74" fontSize="7" fill="#64748b" className="font-mono" textAnchor="end">Median</text>
              <text x="50" y="124" fontSize="7" fill="#64748b" className="font-mono" textAnchor="end">Low-Capex</text>
              <text x="50" y="154" fontSize="7" fill="#64748b" className="font-mono" textAnchor="end">$0.00</text>

              {/* Linear Gradient definitions for bars */}
              <defs>
                <linearGradient id="grad-bio-bar" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* LCA Carbon & Ecology Ledger Statement (4 Cols) */}
        <div className="md:col-span-4 flex flex-col justify-between">
          <div className={`p-4 rounded-xl border h-full flex flex-col justify-between ${
            isLightMode ? 'bg-amber-50/50 border-amber-900/10' : 'bg-[#090e15] border-slate-900/80'
          }`}>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#34d399] mb-3 font-mono flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Environmental Audit Ledger
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                Deploying biosynthesized poly-glutamic acid crusts acts as a strong carbon sink by eliminating intensive clinker production lines.
              </p>

              {/* Audit Points list */}
              <div className="space-y-3 text-[11px] font-mono">
                <div className="flex justify-between items-start border-b border-dashed border-slate-800 pb-2">
                  <div className="text-slate-500">
                    <span className="text-emerald-400 mr-1.5">&#10003;</span>
                    Avoided Cement CO₂:
                  </div>
                  <span className="text-slate-205 font-bold">~{(totalVolumeM3 * 0.27).toFixed(1)} MT</span>
                </div>
                <div className="flex justify-between items-start border-b border-dashed border-slate-800 pb-2">
                  <div className="text-slate-500">
                    <span className="text-emerald-400 mr-1.5">&#10003;</span>
                    PGA Carbon Trapping:
                  </div>
                  <span className="text-slate-205 font-bold">~{(totalPgaRequiredKg * 0.12 / 1000).toFixed(2)} MT</span>
                </div>
                <div className="flex justify-between items-start border-b border-dashed border-slate-800 pb-2">
                  <div className="text-slate-500">
                    <span className="text-emerald-400 mr-1.5">&#10003;</span>
                    Toxicity Threshold:
                  </div>
                  <span className="text-sky-350 font-bold">0% (Biodegradable)</span>
                </div>
              </div>
            </div>

            {/* Scale Recommendation Box info */}
            <div className={`p-3 rounded-lg border text-[10px] mt-4 flex items-start gap-2 ${
              isLightMode ? 'bg-[#f4ebe1] border-amber-900/20 text-[#3e271e]' : 'bg-[#05111d] border-sky-950/40 text-sky-400'
            }`}>
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong className="uppercase font-bold block mb-0.5">Scalability Recommendation</strong>
                With <span className="font-bold">{polymerYield.toFixed(0)} g/L yield</span>, this biofilter is competitive at high desert scales. CapEx is <span className="font-bold">{savingsVsChemical.toFixed(0)}% lower</span> than polymer chemical sprays.
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
