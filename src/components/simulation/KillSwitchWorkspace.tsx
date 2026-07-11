"use client";

/**
 * Standalone Biocontainment Kill Switch workspace.
 * The kill switch is the project's biosafety element, so it is modelled on its own here rather
 * than folded into a prong-tailored run. Opened from the landing kill-switch window.
 *
 * Layout matches the prong Simulation Workspace exactly: a header banner with a headline stat
 * row, then the Sandyx companion rail (mascot on top of a scroll-spy module tree) beside a
 * stack of numbered module sections. The kill switch's four analyses are the sections here.
 */

import React, { useMemo } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ShieldAlert,
  Activity,
  Share2,
  Sprout,
  Boxes,
  Skull,
  ShieldCheck,
  Timer,
  type LucideIcon,
} from "lucide-react";

import {
  DynamicsTab,
  HgtTab,
  SporeTab,
  StructuresTab,
} from "./modules/KillSwitchModule";
import { ModuleActions } from "./_shared";
import ModuleErrorBoundary from "../ErrorBoundary";
import { GlossaryText } from "../GlossaryTerm";
import SandyxCompanion from "../SandyxCompanion";
import {
  DEFAULT_KILLSWITCH,
  DEFAULT_HGT,
  DEFAULT_SPORE,
  simulateKillSwitch,
  timeToLogKill,
  evaluateHgtContainment,
  sporeLogReduction,
} from "../../lib/physics/killswitch";

interface Props {
  isLightMode: boolean;
  onBack: () => void;
}

interface KsSection {
  id: string;
  title: string;
  blurb: string;
  scale: string;
  icon: LucideIcon;
  render: (isLightMode: boolean) => React.ReactNode;
}

const SECTIONS: KsSection[] = [
  {
    id: "dynamics",
    title: "TA Dynamics & Kill",
    blurb:
      "MazE/MazF toxin and antitoxin ODE. The aTc trigger over-produces the toxin on demand, and plasmid dilution removes the antitoxin so the strain self-limits.",
    scale: "genetic",
    icon: Activity,
    render: (l) => <DynamicsTab isLightMode={l} />,
  },
  {
    id: "hgt",
    title: "HGT Containment",
    blurb:
      "The E. coli MazEF split. A wild recipient gets the toxin but not the cognate antitoxin, so it self-eliminates after gene transfer.",
    scale: "ecology",
    icon: Share2,
    render: (l) => <HgtTab isLightMode={l} />,
  },
  {
    id: "spore",
    title: "Spore Clearance",
    blurb:
      "Germinate-then-kill over rounds. Enhanced germination wakes dormant spores so the toxin can clear them, down to a superdormant floor.",
    scale: "ecology",
    icon: Sprout,
    render: (l) => <SporeTab isLightMode={l} />,
  },
  {
    id: "structures",
    title: "3D Structures",
    blurb:
      "Real toxin and antitoxin coordinates from the PDB, showing the neutralised complex and why the lock-and-key pairing contains gene transfer.",
    scale: "protein",
    icon: Boxes,
    render: (l) => <StructuresTab isLightMode={l} />,
  },
];

export default function KillSwitchWorkspace({ isLightMode, onBack }: Props) {
  const treeItems = useMemo(
    () => SECTIONS.map((s) => ({ id: `mod-${s.id}`, label: s.title })),
    [],
  );

  // Headline numbers from the physics defaults, so the banner mirrors the prong workspace.
  const stats = useMemo(() => {
    const series = simulateKillSwitch(DEFAULT_KILLSWITCH, {
      finalTime: 48,
      dt: 0.02,
    });
    const tKill = timeToLogKill(series, 3);
    const finalLog = series[series.length - 1]?.logViability ?? 0;
    const hgt = evaluateHgtContainment(DEFAULT_HGT);
    const sporeLog = sporeLogReduction(DEFAULT_SPORE);
    return { tKill, finalLog, containment: hgt.containmentEfficiency, sporeLog };
  }, []);

  return (
    <div className="pt-6 pb-24 px-4 md:px-8 max-w-[1600px] mx-auto">
      {/* Header / summary banner */}
      <div
        className={`p-6 rounded-2xl border mb-8 transition-colors ${isLightMode ? "bg-white border-amber-900/10" : "bg-[#1c1512] border-slate-800/80"}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <button
              onClick={onBack}
              className={`mb-3 flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl transition ${isLightMode ? "bg-stone-100 hover:bg-stone-200 text-stone-700" : "bg-slate-900/80 hover:bg-slate-800 text-slate-300"}`}
            >
              <ArrowLeft className="w-4 h-4" /> Back to Landing
            </button>
            <h1
              className={`flex items-center gap-2 text-xl md:text-2xl font-extrabold tracking-tight ${isLightMode ? "text-amber-950" : "text-white"}`}
            >
              <ShieldAlert className="w-6 h-6 text-dune-orange" />
              Biocontainment Kill Switch
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${isLightMode ? "bg-stone-50 border-stone-200 text-stone-700" : "bg-slate-900/60 border-slate-700 text-slate-200"}`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-dune-orange" /> Biosafety
                element
              </span>
              <span
                className={`text-[11px] ml-1 ${isLightMode ? "text-stone-400" : "text-slate-500"}`}
              >
                · {SECTIONS.length} modules
              </span>
            </div>
            <p
              className={`mt-3 max-w-3xl text-sm ${isLightMode ? "text-stone-600" : "text-slate-400"}`}
            >
              <GlossaryText>
                The biosafety element for the two engineered prongs. It controls
                the population with a MazE/MazF toxin and antitoxin circuit,
                contains gene transfer to wild microbes, and clears dormant
                spores. This is modelled on its own.
              </GlossaryText>
            </p>
          </div>
        </div>

        {/* Headline stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <HeadlineStat
            isLightMode={isLightMode}
            icon={Skull}
            label="Time to 3-log kill"
            value={stats.tKill === null ? "48+" : stats.tKill.toFixed(1)}
            unit={stats.tKill === null ? "" : "h"}
            emphasize
          />
          <HeadlineStat
            isLightMode={isLightMode}
            icon={Timer}
            label="Viability @ 48 h"
            value={stats.finalLog.toFixed(1)}
            unit="log"
          />
          <HeadlineStat
            isLightMode={isLightMode}
            icon={ShieldCheck}
            label="HGT containment"
            value={(stats.containment * 100).toFixed(1)}
            unit="%"
          />
          <HeadlineStat
            isLightMode={isLightMode}
            icon={Sprout}
            label="Spore log-reduction"
            value={stats.sporeLog.toFixed(1)}
            unit="log"
          />
        </div>
      </div>

      {/* Rail + stacked modules */}
      <div className="lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-8">
        <SandyxCompanion items={treeItems} isLightMode={isLightMode} />

        <div className="space-y-10 min-w-0">
          {SECTIONS.map((m, i) => (
            <motion.section
              key={m.id}
              id={`mod-${m.id}`}
              className="scroll-mt-24"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.5 }}
            >
              <SectionHeader
                isLightMode={isLightMode}
                icon={m.icon}
                index={i}
                title={m.title}
                blurb={m.blurb}
                scale={m.scale}
              />
              <ModuleErrorBoundary isLightMode={isLightMode} label={m.title}>
                {m.render(isLightMode)}
              </ModuleErrorBoundary>
            </motion.section>
          ))}

          <ModuleActions moduleId="killswitch" isLightMode={isLightMode} />
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  isLightMode,
  icon: Icon,
  index,
  title,
  blurb,
  scale,
}: {
  isLightMode: boolean;
  icon: LucideIcon;
  index: number;
  title: string;
  blurb: string;
  scale: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${isLightMode ? "bg-amber-50 text-amber-600" : "bg-amber-950/40 text-amber-400"}`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <h2
          className={`text-sm font-black uppercase tracking-wide truncate ${isLightMode ? "text-slate-900" : "text-white"}`}
        >
          <span className="opacity-40 mr-1.5">
            {String(index + 1).padStart(2, "0")}
          </span>
          {title}
        </h2>
        <p
          className={`text-[11px] ${isLightMode ? "text-stone-500" : "text-slate-400"}`}
        >
          <GlossaryText max={4}>{blurb}</GlossaryText>
        </p>
      </div>
      <span
        className={`ml-auto text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border ${isLightMode ? "border-stone-200 text-stone-500" : "border-slate-700 text-slate-400"}`}
      >
        {scale}
      </span>
    </div>
  );
}

function HeadlineStat({
  isLightMode,
  icon: Icon,
  label,
  value,
  unit,
  emphasize,
}: {
  isLightMode: boolean;
  icon: LucideIcon;
  label: string;
  value: string;
  unit: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`p-3 rounded-[4px] border ${emphasize ? (isLightMode ? "bg-amber-50/60 border-amber-200" : "bg-amber-950/20 border-amber-900/40") : isLightMode ? "bg-[#fcfaf4] border-amber-900/10" : "bg-[#181210] border-border"}`}
    >
      <span
        className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider mb-1 ${isLightMode ? "text-stone-500" : "text-slate-500"}`}
      >
        <Icon className="w-3 h-3 shrink-0" /> {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span
          className={`font-black text-lg ${emphasize ? (isLightMode ? "text-amber-700" : "text-amber-400") : isLightMode ? "text-slate-800" : "text-slate-200"}`}
        >
          {value}
        </span>
        <span
          className={`text-[10px] font-mono ${isLightMode ? "text-stone-500" : "text-slate-500"}`}
        >
          {unit}
        </span>
      </div>
    </div>
  );
}
