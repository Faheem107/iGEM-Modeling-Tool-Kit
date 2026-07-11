"use client";

/**
 * Biocontainment Kill Switch, MazE/MazF toxin–antitoxin control layer.
 * The reframed "third element" (it replaced the applied-alginate prong): a genetically-encoded
 * control for the two engineered prongs. Three analyses in one module:
 *   1) TA dynamics & viability, the aTc-inducible / plasmid-dilution kill (RK4 ODE).
 *   2) HGT containment, the E. coli MazEF split that self-eliminates wild recipients.
 *   3) Spore clearance, germinate-then-kill over rounds, with the superdormancy floor.
 * All numbers come from src/lib/physics/killswitch.ts (single source of truth). This is a
 * qualitative decision-support model grounded in the team's reframe research, no value here is
 * presented as a wet-lab measurement.
 */

import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from "recharts";
import {
  Activity,
  Share2,
  Sprout,
  Syringe,
  Timer,
  Boxes,
} from "lucide-react";
import { GlossaryText } from "../../GlossaryTerm";
import {
  Panel,
  Slider,
  StatCard,
  MathDisclosure,
  ModuleActions,
  chartColors,
  tooltipStyle,
  Themed,
} from "../_shared";
import {
  DEFAULT_KILLSWITCH,
  DEFAULT_HGT,
  DEFAULT_SPORE,
  simulateKillSwitch,
  timeToLogKill,
  evaluateHgtContainment,
  simulateSporeClearance,
  sporeLogReduction,
  plasmidCopy,
  type KillSwitchParams,
  type HgtParams,
  type SporeParams,
} from "../../../lib/physics/killswitch";

const MolstarViewer = dynamic(() => import("@/components/molstar-viewer"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-sm text-dune-ash">
      Preparing 3D viewer…
    </div>
  ),
});

type Tab = "dynamics" | "hgt" | "spore" | "structures";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "dynamics", label: "TA dynamics & kill", icon: Activity },
  { id: "hgt", label: "HGT containment", icon: Share2 },
  { id: "spore", label: "Spore clearance", icon: Sprout },
  { id: "structures", label: "3D structures", icon: Boxes },
];

export default function KillSwitchModule({ isLightMode }: Themed) {
  const [tab, setTab] = useState<Tab>("dynamics");
  const shell = isLightMode ? "bg-[#fdfaf3]" : "bg-card";

  return (
    <div
      className={`rounded-[6px] border border-border p-5 md:p-6 transition-colors ${shell}`}
    >
      {/* Tab bar */}
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-[4px] border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                active
                  ? isLightMode
                    ? "border-amber-300 bg-amber-50 text-amber-800"
                    : "border-amber-900/50 bg-amber-500/10 text-amber-300"
                  : isLightMode
                    ? "border-stone-200 bg-white text-stone-500 hover:bg-stone-50"
                    : "border-slate-800 bg-[#1c1512] text-slate-400 hover:bg-slate-900/50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "dynamics" && <DynamicsTab isLightMode={isLightMode} />}
      {tab === "hgt" && <HgtTab isLightMode={isLightMode} />}
      {tab === "spore" && <SporeTab isLightMode={isLightMode} />}
      {tab === "structures" && <StructuresTab isLightMode={isLightMode} />}

      <div className="mt-6">
        <ModuleActions moduleId="killswitch" isLightMode={isLightMode} />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------
// Tab 1, TA dynamics & viability
// ------------------------------------------------------------------------------------------
export function DynamicsTab({ isLightMode }: Themed) {
  const c = chartColors(isLightMode);
  const [p, setP] = useState<KillSwitchParams>(DEFAULT_KILLSWITCH);
  const set = (patch: Partial<KillSwitchParams>) => setP((q) => ({ ...q, ...patch }));

  const series = useMemo(() => simulateKillSwitch(p, { finalTime: 48, dt: 0.02 }), [p]);
  // Downsample for the chart.
  const data = useMemo(() => {
    const stride = Math.ceil(series.length / 160);
    return series
      .filter((_, i) => i % stride === 0)
      .map((s) => ({
        t: +s.time.toFixed(2),
        toxin: +s.toxin.toFixed(3),
        antitoxin: +s.antitoxin.toFixed(3),
        viability: +s.logViability.toFixed(3),
      }));
  }, [series]);

  const tKill = timeToLogKill(series, 3);
  const finalLog = series[series.length - 1]?.logViability ?? 0;
  const plasmid24 = plasmidCopy(p, 24);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-5">
        <Panel title="Kill trigger" icon={Syringe} isLightMode={isLightMode}>
          <div className="space-y-4">
            <label className="flex items-center justify-between gap-2 text-[11px] font-semibold">
              <span className={isLightMode ? "text-stone-700" : "text-slate-300"}>
                Add aTc trigger
              </span>
              <button
                onClick={() => set({ induce: !p.induce })}
                className={`relative h-6 w-11 rounded-full transition-colors ${p.induce ? "bg-dune-orange" : isLightMode ? "bg-stone-300" : "bg-slate-700"}`}
                aria-pressed={p.induce}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${p.induce ? "left-[22px]" : "left-0.5"}`}
                />
              </button>
            </label>
            <Slider
              isLightMode={isLightMode}
              accent="accent-amber-500"
              label="aTc concentration"
              value={p.atc}
              min={0}
              max={400}
              step={5}
              unit="ng/mL"
              onChange={(v) => set({ atc: v })}
              hint="Anhydrotetracycline dose driving the Tet-inducible extra mazF copy."
            />
            <Slider
              isLightMode={isLightMode}
              accent="accent-amber-500"
              label="Trigger time"
              value={p.induceAt}
              min={0}
              max={24}
              step={1}
              unit="h"
              onChange={(v) => set({ induceAt: v })}
              hint="When aTc is applied, the population grows freely until then."
            />
          </div>
        </Panel>

        <Panel title="Self-limiting (no aTc)" icon={Timer} isLightMode={isLightMode}>
          <div className="space-y-4">
            <Slider
              isLightMode={isLightMode}
              accent="accent-teal-500"
              label="Plasmid loss / generation"
              value={p.plasmidLossPerGen}
              min={0}
              max={0.25}
              step={0.005}
              format={(v) => `${(v * 100).toFixed(1)}%`}
              onChange={(v) => set({ plasmidLossPerGen: v })}
              hint="Segregational instability, the plasmid-borne antitoxin dilutes out over ~20 generations."
            />
            <Slider
              isLightMode={isLightMode}
              accent="accent-teal-500"
              label="Generation time"
              value={p.genTime}
              min={0.4}
              max={1.5}
              step={0.05}
              unit="h"
              onChange={(v) => set({ genTime: v })}
              hint="B. subtilis doubling time (reframe cites 30–73 min)."
            />
            <Slider
              isLightMode={isLightMode}
              accent="accent-rose-500"
              label="Antitoxin lability (δ_A)"
              value={p.deltaA}
              min={0.3}
              max={3}
              step={0.1}
              unit="1/h"
              onChange={(v) => set({ deltaA: v })}
              hint="MazE is degraded by Lon/Clp proteases, the faster it decays, the sooner MazF wins."
            />
          </div>
        </Panel>
      </div>

      <div className="space-y-4 lg:col-span-7">
        <Panel
          title="Toxin / antitoxin balance & viable population"
          icon={Activity}
          isLightMode={isLightMode}
        >
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={c.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="t"
                stroke={c.axis}
                tick={{ fontSize: 10 }}
                unit="h"
                type="number"
                domain={[0, 48]}
              />
              <YAxis
                yAxisId="conc"
                stroke={c.axis}
                tick={{ fontSize: 9 }}
                label={{ value: "MazE / MazF", angle: -90, position: "insideLeft", fontSize: 9, fill: c.axis }}
              />
              <YAxis
                yAxisId="via"
                orientation="right"
                stroke={c.axis}
                tick={{ fontSize: 9 }}
                domain={[-10, 0]}
              />
              <Tooltip contentStyle={tooltipStyle(isLightMode)} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <ReferenceLine yAxisId="via" y={-3} stroke="#ef4444" strokeDasharray="4 4" />
              <Area
                yAxisId="via"
                type="monotone"
                dataKey="viability"
                name="log₁₀(N/N₀)"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.12}
              />
              <Line
                yAxisId="conc"
                type="monotone"
                dataKey="antitoxin"
                name="MazE (antitoxin)"
                stroke="#14b8a6"
                dot={false}
                strokeWidth={2}
              />
              <Line
                yAxisId="conc"
                type="monotone"
                dataKey="toxin"
                name="MazF (toxin)"
                stroke="#d97706"
                dot={false}
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>

        <div className="grid grid-cols-3 gap-3">
          <StatCard
            isLightMode={isLightMode}
            label="Time to 3-log kill"
            value={tKill === null ? ", " : tKill.toFixed(1)}
            unit={tKill === null ? "" : "h"}
            accent={isLightMode ? "text-rose-700" : "text-rose-400"}
            emphasize
            sub={tKill === null ? "not reached in 48 h" : "99.9% cleared"}
          />
          <StatCard
            isLightMode={isLightMode}
            label="Viability @ 48 h"
            value={finalLog.toFixed(1)}
            unit="log"
            accent={isLightMode ? "text-amber-700" : "text-amber-400"}
          />
          <StatCard
            isLightMode={isLightMode}
            label="Plasmid @ 24 h"
            value={`${(plasmid24 * 100).toFixed(0)}`}
            unit="%"
            accent={isLightMode ? "text-teal-700" : "text-teal-400"}
            sub="antitoxin source"
          />
        </div>

        <p className={`text-[10px] leading-relaxed ${isLightMode ? "text-stone-500" : "text-slate-500"}`}>
          <GlossaryText>
            Two independent kill modes: the aTc trigger over-produces MazF on demand, while plasmid
            dilution slowly removes the antitoxin so the strain self-limits even with no inducer.
            Turn the trigger off and watch the population still decline once the plasmid dilutes
            away.
          </GlossaryText>
        </p>

        <MathDisclosure isLightMode={isLightMode}>
          dA/dt = σ_A(p) − δ_A·A − k_on·A·T + k_off·C
          <br />
          dT/dt = σ_T(aTc) − δ_T·T − k_on·A·T + k_off·C
          <br />
          dC/dt = k_on·A·T − k_off·C − δ_C·C (sequestered toxin leaves via slow complex turnover)
          <br />
          μ(T) = μ_max·(1−θ) − d_max·θ, θ = Tⁿ/(K_Tⁿ+Tⁿ); d/dt log₁₀N = μ/ln10
        </MathDisclosure>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------
// Tab 2, HGT containment
// ------------------------------------------------------------------------------------------
export function HgtTab({ isLightMode }: Themed) {
  const [p, setP] = useState<HgtParams>(DEFAULT_HGT);
  const set = (patch: Partial<HgtParams>) => setP((q) => ({ ...q, ...patch }));
  const r = useMemo(() => evaluateHgtContainment(p), [p]);

  const routeData = r.routes.map((x) => ({
    name: x.label,
    pct: +(x.probability * 100).toFixed(2),
  }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-5">
        <Panel title="Containment design" icon={Share2} isLightMode={isLightMode}>
          <div className="space-y-4">
            <Toggle
              isLightMode={isLightMode}
              label="Split mazE across two loci"
              on={p.splitAntitoxin}
              onToggle={() => set({ splitAntitoxin: !p.splitAntitoxin })}
              hint="Both distant halves must transfer together to rescue a recipient, squares the (already rare) acquisition probability."
            />
            <Toggle
              isLightMode={isLightMode}
              label="Rare-codon-optimise mazE"
              on={p.codonOptimise}
              onToggle={() => set({ codonOptimise: !p.codonOptimise })}
              hint="Even if a recipient acquires mazE it cannot translate it efficiently, so no functional antitoxin is made."
            />
            <Slider
              isLightMode={isLightMode}
              accent="accent-amber-500"
              label="Payload/toxin expression coupling"
              value={p.payloadExpression}
              min={0.4}
              max={1}
              step={0.02}
              format={(v) => `${(v * 100).toFixed(0)}%`}
              onChange={(v) => set({ payloadExpression: v })}
              hint="mazF sits in the SAME transcriptional unit as the biofilm genes, expressing the payload means expressing the toxin."
            />
            <Slider
              isLightMode={isLightMode}
              accent="accent-teal-500"
              label="Chromosome-fragment acquisition"
              value={p.chromFragFreq}
              min={0}
              max={0.6}
              step={0.01}
              format={(v) => `${(v * 100).toFixed(0)}%`}
              onChange={(v) => set({ chromFragFreq: v })}
              hint="Chance a recipient also picks up chromosomal mazE by transformation (rarer than plasmid transfer)."
            />
            <Slider
              isLightMode={isLightMode}
              accent="accent-rose-500"
              label="Cognate-carrier recipients"
              value={p.cognateRecipients}
              min={0}
              max={0.3}
              step={0.005}
              format={(v) => `${(v * 100).toFixed(1)}%`}
              onChange={(v) => set({ cognateRecipients: v })}
              hint="Fraction of the community (e.g. E. coli) that already carries a cognate MazE, the acknowledged failure mode."
            />
          </div>
        </Panel>
      </div>

      <div className="space-y-4 lg:col-span-7">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            isLightMode={isLightMode}
            label="Containment efficiency"
            value={`${(r.containmentEfficiency * 100).toFixed(1)}`}
            unit="%"
            accent={isLightMode ? "text-teal-700" : "text-teal-400"}
            emphasize
            sub="recipients that self-eliminate"
          />
          <StatCard
            isLightMode={isLightMode}
            label="Escape / exposure"
            value={r.escapePerExposure.toExponential(1)}
            accent={isLightMode ? "text-rose-700" : "text-rose-400"}
            sub="HGT freq × escape prob."
          />
        </div>

        <Panel title="Escape routes (of recipients that got the plasmid)" icon={Share2} isLightMode={isLightMode}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={routeData}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 4, bottom: 0 }}
            >
              <CartesianGrid stroke={chartColors(isLightMode).grid} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" stroke={chartColors(isLightMode).axis} tick={{ fontSize: 9 }} unit="%" />
              <YAxis type="category" dataKey="name" hide />
              <Tooltip
                contentStyle={tooltipStyle(isLightMode)}
                formatter={(v: number) => [`${v}%`, "of recipients"]}
              />
              <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                {routeData.map((_, i) => (
                  <Cell key={i} fill={["#ef4444", "#f59e0b", "#94a3b8"][i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1">
            {routeData.map((x, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ background: ["#ef4444", "#f59e0b", "#94a3b8"][i] }}
                />
                <span className={isLightMode ? "text-stone-600" : "text-slate-400"}>
                  {x.name}, {x.pct}%
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <p className={`text-[10px] leading-relaxed ${isLightMode ? "text-stone-500" : "text-slate-500"}`}>
          <GlossaryText>
            The plasmid carries an E. coli MazF linked to the biofilm payload; a wild recipient
            gets the toxin but not the cognate E. coli MazE, so it self-eliminates. Splitting and
            codon-optimising the antitoxin drive the acquisition-rescue route toward zero; the
            residual escape is dominated by cognate-carrier organisms such as E. coli, which the
            team mitigates by careful site selection.
          </GlossaryText>
        </p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------
// Tab 3, Spore clearance
// ------------------------------------------------------------------------------------------
export function SporeTab({ isLightMode }: Themed) {
  const c = chartColors(isLightMode);
  const [p, setP] = useState<SporeParams>(DEFAULT_SPORE);
  const set = (patch: Partial<SporeParams>) => setP((q) => ({ ...q, ...patch }));

  const series = useMemo(() => simulateSporeClearance(p), [p]);
  const data = series.map((s) => ({
    round: s.round,
    logReduction: +s.logReduction.toFixed(2),
    viablePct: +(s.viableSpores * 100).toFixed(3),
  }));
  const totalLog = sporeLogReduction(p);
  const residual = series[series.length - 1]?.viableSpores ?? 1;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-5">
        <Panel title="Germinate-then-kill design" icon={Sprout} isLightMode={isLightMode}>
          <div className="space-y-4">
            <Toggle
              isLightMode={isLightMode}
              label="Over-express gerB*"
              on={p.gerBstar}
              onToggle={() => set({ gerBstar: !p.gerBstar })}
              hint="The mutant germinant receptor lowers the germination threshold → more spores wake per round."
            />
            <Slider
              isLightMode={isLightMode}
              accent="accent-teal-500"
              label="Distinct germinants"
              value={p.distinctGerminants}
              min={1}
              max={4}
              step={1}
              onChange={(v) => set({ distinctGerminants: v })}
              hint="L-Ala, AGFK … each germinant recruits a different receptor subset, so combining them wakes more spores."
            />
            <Slider
              isLightMode={isLightMode}
              accent="accent-amber-500"
              label="Germination per round (single)"
              value={p.baseGerminationPerRound}
              min={0.2}
              max={0.9}
              step={0.02}
              format={(v) => `${(v * 100).toFixed(0)}%`}
              onChange={(v) => set({ baseGerminationPerRound: v })}
            />
            <Slider
              isLightMode={isLightMode}
              accent="accent-rose-500"
              label="Superdormant floor"
              value={p.superdormantFloor}
              min={0}
              max={0.02}
              step={0.0005}
              format={(v) => `${(v * 100).toFixed(2)}%`}
              onChange={(v) => set({ superdormantFloor: v })}
              hint="Spores with near-zero germinant receptors that no germinant wakes, the clearance floor (Ghosh et al. 2012)."
            />
            <Slider
              isLightMode={isLightMode}
              accent="accent-rose-500"
              label="Re-sporulation"
              value={p.resporulation}
              min={0}
              max={0.4}
              step={0.01}
              format={(v) => `${(v * 100).toFixed(0)}%`}
              onChange={(v) => set({ resporulation: v })}
              hint="Woken cells that re-sporulate before the kill switch clears them (desert nutrient run-out)."
            />
            <Slider
              isLightMode={isLightMode}
              accent="accent-teal-500"
              label="Rounds"
              value={p.rounds}
              min={1}
              max={8}
              step={1}
              onChange={(v) => set({ rounds: v })}
            />
          </div>
        </Panel>
      </div>

      <div className="space-y-4 lg:col-span-7">
        <Panel title="Viable-spore log-reduction per round" icon={Sprout} isLightMode={isLightMode}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={c.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="round" stroke={c.axis} tick={{ fontSize: 10 }} label={{ value: "round", position: "insideBottom", offset: -2, fontSize: 9, fill: c.axis }} />
              <YAxis stroke={c.axis} tick={{ fontSize: 9 }} label={{ value: "−log₁₀ viable", angle: -90, position: "insideLeft", fontSize: 9, fill: c.axis }} />
              <Tooltip
                contentStyle={tooltipStyle(isLightMode)}
                formatter={(v: number, n: string) => [n === "logReduction" ? `${v} log` : `${v}%`, n === "logReduction" ? "reduction" : "viable"]}
              />
              <Bar dataKey="logReduction" name="logReduction" radius={[4, 4, 0, 0]} fill="#14b8a6" />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <div className="grid grid-cols-2 gap-3">
          <StatCard
            isLightMode={isLightMode}
            label="Total log-reduction"
            value={totalLog.toFixed(1)}
            unit="log"
            accent={isLightMode ? "text-teal-700" : "text-teal-400"}
            emphasize
          />
          <StatCard
            isLightMode={isLightMode}
            label="Residual viable spores"
            value={`${(residual * 100).toExponential(1)}`}
            unit="%"
            accent={isLightMode ? "text-rose-700" : "text-rose-400"}
            sub="of the original load"
          />
        </div>

        <p className={`text-[10px] leading-relaxed ${isLightMode ? "text-stone-500" : "text-slate-500"}`}>
          <GlossaryText>
            MazF needs active translation, so it cannot touch a dormant spore, the spore must be
            germinated first. gerB* and multiple germinants wake more spores each round, but a
            superdormant fraction with near-zero germinant receptors sets a floor that repeated
            rounds asymptote toward rather than eliminate. This is why the team pairs enhanced
            germination with the kill switch instead of relying on the toxin alone.
          </GlossaryText>
        </p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------
// Tab 4, real 3D structures of the toxin–antitoxin proteins
// ------------------------------------------------------------------------------------------
const KS_STRUCTURES = [
  {
    id: "1UB4",
    label: "E. coli MazE·MazF complex",
    sub: "PDB 1UB4 · Kamada et al. 2003",
    file: "/pdb/1UB4.pdb",
    desc: "The antitoxin (MazE) clamped onto the toxin (MazF), the neutralised state. The E. coli pair is what the plasmid carries for HGT containment: a recipient that gets MazF without this cognate MazE cannot form this complex, so the toxin stays active.",
  },
  {
    id: "4ME7",
    label: "B. subtilis MazF·cognate MazE",
    sub: "PDB 4ME7 · EndoA–EndoAI",
    file: "/pdb/4ME7.pdb",
    desc: "The B. subtilis toxin bound to its OWN antitoxin. Antitoxins only neutralise their cognate toxin ('lock and key'), which is why B. subtilis MazE cannot rescue a cell that acquired E. coli MazF.",
  },
  {
    id: "4MDX",
    label: "B. subtilis MazF · RNA substrate",
    sub: "PDB 4MDX · mRNA interferase",
    file: "/pdb/4MDX.pdb",
    desc: "The toxin caught on an RNA strand. MazF is an endoribonuclease that cleaves mRNA at ACA sites, halting translation, which is exactly why it works only on metabolically active cells and not on dormant spores.",
  },
];

export function StructuresTab({ isLightMode }: Themed) {
  const [sel, setSel] = useState(0);
  const s = KS_STRUCTURES[sel];
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="space-y-3 lg:col-span-4">
        {KS_STRUCTURES.map((st, i) => {
          const active = i === sel;
          return (
            <button
              key={st.id}
              onClick={() => setSel(i)}
              className={`w-full rounded-[5px] border p-3 text-left transition-colors ${
                active
                  ? isLightMode
                    ? "border-amber-300 bg-amber-50"
                    : "border-amber-900/50 bg-amber-500/10"
                  : isLightMode
                    ? "border-stone-200 bg-white hover:bg-stone-50"
                    : "border-slate-800 bg-[#1c1512] hover:bg-slate-900/50"
              }`}
            >
              <span className={`block text-[13px] font-bold ${isLightMode ? "text-stone-800" : "text-slate-200"}`}>
                {st.label}
              </span>
              <span className={`block font-mono text-[10px] ${isLightMode ? "text-stone-500" : "text-slate-500"}`}>
                {st.sub}
              </span>
            </button>
          );
        })}
        <p className={`text-[11px] leading-relaxed ${isLightMode ? "text-stone-600" : "text-slate-400"}`}>
          {s.desc}
        </p>
      </div>
      <div className="lg:col-span-8">
        <div className="relative h-[360px] w-full overflow-hidden rounded-[6px] border border-border bg-black/5 dark:bg-black/30">
          <MolstarViewer key={s.file} url={s.file} className="absolute inset-0 h-full w-full" />
        </div>
        <p className={`mt-2 text-[10px] ${isLightMode ? "text-stone-500" : "text-slate-500"}`}>
          Real experimental coordinates served from <code>/public/pdb</code>. Drag to rotate; scroll to zoom.
        </p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------
// Small labelled toggle (matches the module aesthetic).
// ------------------------------------------------------------------------------------------
function Toggle({
  isLightMode,
  label,
  on,
  onToggle,
  hint,
}: Themed & { label: string; on: boolean; onToggle: () => void; hint?: string }) {
  return (
    <div>
      <label className="flex items-center justify-between gap-2 text-[11px] font-semibold">
        <span className={isLightMode ? "text-stone-700" : "text-slate-300"}>{label}</span>
        <button
          onClick={onToggle}
          aria-pressed={on}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-dune-teal" : isLightMode ? "bg-stone-300" : "bg-slate-700"}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-[22px]" : "left-0.5"}`}
          />
        </button>
      </label>
      {hint && (
        <span className={`mt-1 block text-[9px] ${isLightMode ? "text-stone-400" : "text-slate-500"}`}>
          <GlossaryText max={3}>{hint}</GlossaryText>
        </span>
      )}
    </div>
  );
}
