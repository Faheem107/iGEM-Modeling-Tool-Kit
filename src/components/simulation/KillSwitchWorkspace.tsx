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
    <div className="mx-auto max-w-[1500px] px-5 pb-32 pt-28 sm:px-8">
      {/* Header / summary banner */}
      <div className="mb-12 border-b border-border pb-8">
        <button
          onClick={onBack}
          className="caption mb-6 inline-flex items-center gap-2 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to the overview
        </button>
        <h1 className="flex items-center gap-2.5 text-[length:var(--text-h1)] text-foreground">
          <ShieldAlert className="h-6 w-6 shrink-0 text-dune-orange" />
          Biocontainment Kill Switch
        </h1>
        <p className="caption mt-3 flex flex-wrap items-center gap-x-3">
          <span>Biosafety element</span>
          <span className="opacity-60">{SECTIONS.length} modules</span>
        </p>
        <p className="mt-4 max-w-[70ch] text-[0.9375rem] leading-relaxed text-muted-foreground">
          <GlossaryText>
            The biosafety element for the two engineered prongs. It controls
            the population with a MazE/MazF toxin and antitoxin circuit,
            contains gene transfer to wild microbes, and clears dormant
            spores. This is modelled on its own.
          </GlossaryText>
        </p>

        {/* Headline stats */}
        <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-4">
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
    // Matches the simulation workspace: index and scale as captions above the
    // title, no icon chip and no pill badge.
    <div className="mb-5 border-b border-border pb-4">
      <div className="caption mb-2 flex items-center gap-3">
        <span>{String(index + 1).padStart(2, "0")}</span>
        <span className="opacity-60">{scale}</span>
      </div>
      <h2 className="flex items-center gap-2 text-[length:var(--text-h3)] text-foreground">
        <Icon className="h-4 w-4 shrink-0 text-dune-orange" />
        {title}
      </h2>
      <p className="mt-1.5 max-w-[70ch] text-[0.875rem] leading-snug text-muted-foreground">
        <GlossaryText max={4}>{blurb}</GlossaryText>
      </p>
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
    // A figure on a rule, matching the simulation workspace.
    <div className={`border-t pt-3 ${emphasize ? "border-dune-orange" : "border-border"}`}>
      <span className="caption mb-2 flex items-center gap-1.5">
        <Icon className="h-3 w-3 shrink-0" /> {label}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span
          className={`tabular-nums ${emphasize ? "text-3xl text-dune-orange" : "text-2xl text-foreground"}`}
          style={{ fontVariationSettings: '"wght" 620' }}
        >
          {value}
        </span>
        <span
          className={`text-[10px] font-mono ${isLightMode ? "text-muted-foreground" : "text-muted-foreground"}`}
        >
          {unit}
        </span>
      </div>
    </div>
  );
}
