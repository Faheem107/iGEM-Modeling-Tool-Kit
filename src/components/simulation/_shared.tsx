"use client";

/**
 * Shared UI primitives for the simulation modules, themed panels, sliders, stat cards,
 * a collapsible "Show the math" block, and recharts color tokens. Keeps every new module
 * visually consistent with the existing toolkit (light/dark) while staying graph-first.
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown, Sigma, PlayCircle, BookText, Code2 } from "lucide-react";
import { useGlossary, GlossaryText } from "../GlossaryTerm";
import { MODULE_CODE } from "../../lib/moduleCode";
import type { ModuleId } from "../../lib/prongs";
import { NAV } from "@/content/copy";
import { DUNE, HAIRLINE, INK, MUTED_INK, SURFACE } from "@/src/lib/palette";

export interface Themed {
  isLightMode: boolean;
}

// Shared scroll-reveal used by Panel / ModuleShell so every graph fades in as it
// enters the viewport (DESIGN.md §6). amount is kept small so panels taller than
// the viewport still trigger.
const revealProps = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.12 },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
};

/** recharts color tokens for a given theme. */
export const chartColors = (light: boolean) => ({
  grid: light ? HAIRLINE.light : HAIRLINE.dark,
  axis: light ? MUTED_INK.light : DUNE.ash,
  tooltipBg: light ? SURFACE.light : DUNE.ink,
  tooltipBorder: light ? HAIRLINE.light : HAIRLINE.dark,
  text: light ? INK.light : INK.dark,
});

export const tooltipStyle = (light: boolean) => ({
  backgroundColor: light ? "rgba(255,255,255,0.97)" : "rgba(28,21,18,0.97)",
  border: `1px solid ${light ? HAIRLINE.light : HAIRLINE.dark}`,
  borderRadius: 3,
  fontSize: 11,
  fontFamily: "var(--font-lexend), system-ui, sans-serif",
  color: light ? INK.light : INK.dark,
});

export function Panel({
  title,
  icon: Icon,
  isLightMode,
  children,
  className = "",
  right,
}: Themed & {
  title: React.ReactNode;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  right?: React.ReactNode;
}) {
  return (
    <motion.div
      {...revealProps}
      className={`rounded-[6px] border border-border p-6 transition-colors duration-300 ${
        isLightMode ? "bg-white/70" : "bg-card/70"
      } ${className}`}
    >
      <div className="mb-4 flex items-center justify-between gap-4 border-b border-border pb-4">
        <h3 className="caption flex items-center gap-2 text-foreground">
          {Icon && <Icon className="h-3.5 w-3.5 text-dune-teal" />}
          {title}
        </h3>
        {right}
      </div>
      {children}
    </motion.div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  isLightMode,
  accent = "accent-dune-teal",
  hint,
  format,
}: Themed & {
  label: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
  accent?: string;
  hint?: string;
  format?: (v: number) => string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4 text-[length:var(--text-caption)]">
        <span className="font-medium text-foreground">{label}</span>
        {/* The value is information, not a badge: mono and tabular, no chip. */}
        <span className="font-mono text-[length:var(--text-caption)] tabular-nums text-muted-foreground">
          {format ? format(value) : value}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`w-full ${accent}`}
      />
      {hint && (
        <span
          className="mt-2 block text-[length:var(--text-caption)] leading-snug text-muted-foreground opacity-80"
        >
          <GlossaryText max={3}>{hint}</GlossaryText>
        </span>
      )}
    </div>
  );
}

export function StatCard({
  label,
  value,
  unit,
  accent,
  isLightMode,
  sub,
  emphasize,
}: Themed & {
  label: React.ReactNode;
  value: string;
  unit?: string;
  accent: string;
  sub?: string;
  emphasize?: boolean;
}) {
  return (
    // A figure on a rule, not a tile. The emphasised one is marked by a heavier
    // top rule and a larger number, never by a ring or a fill.
    <div
      className={`border-t pt-2 ${
        emphasize ? "border-dune-orange" : "border-border"
      }`}
    >
      <span className="caption mb-2 block">{label}</span>
      <div className="flex items-baseline gap-2">
        <span
          className={`tabular-nums ${emphasize ? "text-[length:var(--text-h3)]" : "text-[length:var(--text-body)]"} ${accent}`}
          style={{ fontVariationSettings: '"wght" 620' }}
        >
          {value}
        </span>
        {unit && (
          <span className="font-mono text-[length:var(--text-caption)] text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
      {sub && (
        <span className="mt-1 block text-[length:var(--text-caption)] leading-snug text-muted-foreground">
          {sub}
        </span>
      )}
    </div>
  );
}

/** Collapsible block hiding dense formulae behind a toggle (graph-first by default). */
export function MathDisclosure({
  isLightMode,
  children,
  label = NAV.revealMath,
}: Themed & { children: React.ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="overflow-hidden rounded-[4px] border border-border"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="caption flex w-full items-center justify-between px-4 py-2 transition-colors hover:text-foreground"
      >
        <span className="flex items-center gap-2">
          <Sigma className="h-3.5 w-3.5" /> {label}
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          className="border-t border-border px-4 py-4 font-mono text-[length:var(--text-caption)] leading-relaxed text-foreground"
        >
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Shared base for the three module toolbar controls (Show the Math / Video Explanation / Sources).
 * Each is a Sandyx drop target (it carries the given `data-*` attribute) and highlights while the
 * mascot hovers over it. Click it, or drop Sandyx on it, to open the matching window.
 */
function ModuleToggle({
  isLightMode,
  moduleId,
  dropAttr,
  icon: Icon,
  label,
  onOpen,
  hovered,
  className = "",
}: Themed & {
  moduleId: ModuleId;
  dropAttr:
    | "data-sandyx-math"
    | "data-sandyx-video"
    | "data-sandyx-sources"
    | "data-sandyx-code";
  icon: LucideIcon;
  label: string;
  onOpen: () => void;
  hovered: boolean;
  className?: string;
}) {
  const attrs = { [dropAttr]: moduleId } as Record<string, string>;
  return (
    <button
      type="button"
      {...attrs}
      onClick={onOpen}
      title={`${label}, click, or drop Sandyx here`}
      // Sandyx hover is marked by the edge taking the accent, not by a ring.
      className={`caption flex w-full min-w-0 flex-col items-center justify-center gap-2 rounded-[4px] border px-2 py-4 transition-colors hover:border-dune-orange hover:text-dune-orange ${
        hovered ? "border-dune-orange text-dune-orange" : "border-border"
      } ${className}`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="text-center leading-tight whitespace-normal break-words">
        {label}
      </span>
    </button>
  );
}

/**
 * "Show the Math" toggle, opens the LaTeX math window. Click it, OR drop Sandyx on it
 * (it is a `data-sandyx-math` drop target). Highlights while Sandyx hovers over it.
 */
export function ShowMathToggle({
  moduleId,
  isLightMode,
  className = "",
}: Themed & { moduleId: ModuleId; className?: string }) {
  const { openMath, hoverId } = useGlossary();
  return (
    <ModuleToggle
      isLightMode={isLightMode}
      moduleId={moduleId}
      dropAttr="data-sandyx-math"
      icon={Sigma}
      label={NAV.revealMath}
      onOpen={() => openMath(moduleId)}
      hovered={hoverId === moduleId}
      className={className}
    />
  );
}

/**
 * "Video Explanation" toggle, opens the narrated Manim animation window. Click it, OR drop
 * Sandyx on it (`data-sandyx-video` drop target).
 */
export function VideoExplanationToggle({
  moduleId,
  isLightMode,
  className = "",
}: Themed & { moduleId: ModuleId; className?: string }) {
  const { openVideo, hoverId } = useGlossary();
  return (
    <ModuleToggle
      isLightMode={isLightMode}
      moduleId={moduleId}
      dropAttr="data-sandyx-video"
      icon={PlayCircle}
      label="Video Explanation"
      onOpen={() => openVideo(moduleId)}
      hovered={hoverId === moduleId}
      className={className}
    />
  );
}

/**
 * "Sources" toggle, opens the model's grounding references. Sits farthest right in the toolbar.
 * Click it, OR drop Sandyx on it (`data-sandyx-sources` drop target).
 */
export function SourcesToggle({
  moduleId,
  isLightMode,
  className = "",
}: Themed & { moduleId: ModuleId; className?: string }) {
  const { openSources, hoverId } = useGlossary();
  return (
    <ModuleToggle
      isLightMode={isLightMode}
      moduleId={moduleId}
      dropAttr="data-sandyx-sources"
      icon={BookText}
      label="Sources"
      onOpen={() => openSources(moduleId)}
      hovered={hoverId === moduleId}
      className={className}
    />
  );
}

/**
 * "Code & Plots" toggle, opens the downloadable Python script + matplotlib previews. Click it, OR
 * drop Sandyx on it (`data-sandyx-code` drop target). Only rendered for modules that ship code.
 */
export function CodePlotsToggle({
  moduleId,
  isLightMode,
  className = "",
}: Themed & { moduleId: ModuleId; className?: string }) {
  const { openCode, hoverId } = useGlossary();
  return (
    <ModuleToggle
      isLightMode={isLightMode}
      moduleId={moduleId}
      dropAttr="data-sandyx-code"
      icon={Code2}
      label="Code & Plots"
      onOpen={() => openCode(moduleId)}
      hovered={hoverId === moduleId}
      className={className}
    />
  );
}

/**
 * The standard module toolbar: [ Show the Math | Video Explanation | Sources | Code & Plots ] in one
 * responsive row. Replaces the bare <ShowMathToggle> at the foot of every module. Each is a Sandyx
 * drop target. The Code & Plots toggle only appears for modules that ship a reproducible script.
 */
export function ModuleActions({
  moduleId,
  isLightMode,
  className = "",
}: Themed & { moduleId: ModuleId; className?: string }) {
  const hasCode = moduleId in MODULE_CODE;
  return (
    <div className={className}>
      <p
        className="caption mb-2 flex items-center gap-2"
      >
        <img
          src="/sandyx.png"
          alt=""
          aria-hidden
          className="h-4 w-4 object-contain shrink-0"
          draggable={false}
        />
        Drop Sandyx or click any of the {hasCode ? 4 : 3} below!
      </p>
      <div
        className={`grid items-stretch gap-2 ${hasCode ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}
      >
        <ShowMathToggle moduleId={moduleId} isLightMode={isLightMode} />
        <VideoExplanationToggle moduleId={moduleId} isLightMode={isLightMode} />
        <SourcesToggle moduleId={moduleId} isLightMode={isLightMode} />
        {hasCode && (
          <CodePlotsToggle moduleId={moduleId} isLightMode={isLightMode} />
        )}
      </div>
    </div>
  );
}

/** Two-column module shell: controls (left) + visuals (right). */
export function ModuleShell({
  isLightMode,
  controls,
  children,
}: Themed & { controls: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.div
      {...revealProps}
      className={`grid grid-cols-1 gap-6 rounded-[6px] border border-border p-6 transition-colors duration-300 lg:grid-cols-12 ${
        isLightMode ? "bg-white/60" : "bg-card/60"
      }`}
    >
      <div className="lg:col-span-5 space-y-6">{controls}</div>
      <div className="lg:col-span-7 space-y-6">{children}</div>
    </motion.div>
  );
}
