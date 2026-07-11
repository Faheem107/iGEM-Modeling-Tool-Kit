"use client";

/**
 * Shared UI primitives for the simulation modules, themed panels, sliders, stat cards,
 * a collapsible "Show the math" block, and recharts color tokens. Keeps every new module
 * visually consistent with the existing toolkit (light/dark) while staying graph-first.
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown, Sigma, PlayCircle, BookText } from "lucide-react";
import { useGlossary, GlossaryText } from "../GlossaryTerm";
import type { ModuleId } from "../../lib/prongs";

export interface Themed {
  isLightMode: boolean;
}

// Shared scroll-reveal used by Panel / ModuleShell so every graph fades in as it
// enters the viewport (DESIGN.md §6). amount is kept small so panels taller than
// the viewport still trigger.
const revealProps = {
  initial: { opacity: 0, y: 24, scale: 0.985 },
  whileInView: { opacity: 1, y: 0, scale: 1 },
  viewport: { once: true, amount: 0.12 },
  transition: { duration: 0.6, ease: "easeOut" as const },
};

/** recharts color tokens for a given theme. */
export const chartColors = (light: boolean) => ({
  grid: light ? "#e7e0cf" : "#3a2f29",
  axis: light ? "#78716c" : "#8a7e75",
  tooltipBg: light ? "#ffffff" : "#1c1512",
  tooltipBorder: light ? "#e7e5e4" : "#43362e",
  text: light ? "#1c1917" : "#f3e9db",
});

export const tooltipStyle = (light: boolean) => ({
  backgroundColor: light ? "rgba(255,255,255,0.97)" : "rgba(10,15,24,0.97)",
  border: `1px solid ${light ? "#e7e5e4" : "#43362e"}`,
  borderRadius: 4,
  fontSize: 11,
  fontFamily: "var(--font-lexend), system-ui, sans-serif",
  color: light ? "#1c1917" : "#f3e9db",
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
      className={`p-5 rounded-[6px] border border-border transition-colors duration-300 ${
        isLightMode ? "bg-white" : "bg-card"
      } ${className}`}
    >
      <div className="flex items-center justify-between mb-4 gap-3">
        <h3
          className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 ${isLightMode ? "text-dune-maroon" : "text-dune-paper"}`}
        >
          {Icon && <Icon className="w-4 h-4 text-dune-teal" />}
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
  accent = "accent-teal-500",
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
      <div className="flex justify-between items-center text-[11px] mb-1">
        <span
          className={`font-semibold ${isLightMode ? "text-stone-700" : "text-slate-300"}`}
        >
          {label}
        </span>
        <span
          className={`font-mono px-1.5 py-0.5 rounded text-[10px] border ${
            isLightMode
              ? "bg-stone-50 border-stone-200 text-stone-800 font-bold"
              : "bg-slate-900/60 border-slate-800 text-slate-200"
          }`}
        >
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
        className={`w-full h-1.5 rounded cursor-ew-resize ${accent} ${isLightMode ? "bg-stone-200" : "bg-slate-800"}`}
      />
      {hint && (
        <span
          className={`text-[9px] block mt-1 ${isLightMode ? "text-stone-400" : "text-slate-500"}`}
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
    <div
      className={`p-3 rounded-[4px] border ${
        isLightMode
          ? "bg-[#fcfaf4] border-amber-900/10"
          : "bg-[#181210] border-border"
      } ${emphasize ? "ring-1 ring-inset " + (isLightMode ? "ring-amber-300/40" : "ring-teal-900/40") : ""}`}
    >
      <span
        className={`block text-[9px] font-bold uppercase tracking-wider mb-1 ${isLightMode ? "text-stone-500" : "text-slate-500"}`}
      >
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span
          className={`font-black ${emphasize ? "text-lg" : "text-sm"} ${accent}`}
        >
          {value}
        </span>
        {unit && (
          <span
            className={`text-[10px] font-mono ${isLightMode ? "text-stone-500" : "text-slate-500"}`}
          >
            {unit}
          </span>
        )}
      </div>
      {sub && (
        <span
          className={`block text-[9px] mt-0.5 ${isLightMode ? "text-stone-400" : "text-slate-500"}`}
        >
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
  label = "Show the math",
}: Themed & { children: React.ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`rounded-[4px] border overflow-hidden ${isLightMode ? "border-amber-900/10 bg-[#fcfaf5]" : "border-border bg-[#1c1512]"}`}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-wider ${
          isLightMode
            ? "text-stone-600 hover:bg-stone-100"
            : "text-slate-400 hover:bg-slate-900/50"
        }`}
      >
        <span className="flex items-center gap-1.5">
          <Sigma className="w-3.5 h-3.5" /> {label}
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          className={`px-4 py-3 text-[11px] leading-relaxed font-mono border-t ${
            isLightMode
              ? "border-amber-900/10 text-stone-700"
              : "border-border text-slate-300"
          }`}
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
  ringLight,
  ringDark,
  hovered,
  className = "",
}: Themed & {
  moduleId: ModuleId;
  dropAttr: "data-sandyx-math" | "data-sandyx-video" | "data-sandyx-sources";
  icon: LucideIcon;
  label: string;
  onOpen: () => void;
  ringLight: string;
  ringDark: string;
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
      className={`w-full min-w-0 flex flex-col items-center justify-center gap-1.5 px-2 py-3.5 rounded-[4px] border text-[11px] font-mono font-bold uppercase tracking-wider transition-colors ${
        isLightMode
          ? "border-amber-900/10 bg-[#fcfaf5] text-stone-600 hover:bg-stone-100"
          : "border-border bg-[#1c1512] text-slate-400 hover:bg-slate-900/50"
      } ${hovered ? (isLightMode ? `ring-2 ${ringLight}` : `ring-2 ${ringDark}`) : ""} ${className}`}
    >
      <Icon className="w-4 h-4 shrink-0" />
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
      label="Show the Math"
      onOpen={() => openMath(moduleId)}
      ringLight="ring-amber-400/60 bg-amber-50"
      ringDark="ring-amber-400/50 bg-amber-500/10"
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
      ringLight="ring-rose-400/60 bg-rose-50"
      ringDark="ring-rose-400/50 bg-rose-500/10"
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
      ringLight="ring-amber-400/60 bg-amber-50"
      ringDark="ring-amber-400/50 bg-amber-500/10"
      hovered={hoverId === moduleId}
      className={className}
    />
  );
}

/**
 * The standard module toolbar: [ Show the Math | Video Explanation | Sources ] in one responsive
 * row. Replaces the bare <ShowMathToggle> at the foot of every module. All three are Sandyx drop
 * targets. On narrow screens the row wraps.
 */
export function ModuleActions({
  moduleId,
  isLightMode,
  className = "",
}: Themed & { moduleId: ModuleId; className?: string }) {
  return (
    <div className={className}>
      <p
        className={`mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold ${
          isLightMode ? "text-stone-500" : "text-slate-500"
        }`}
      >
        <img
          src="/sandyx.png"
          alt=""
          aria-hidden
          className="w-4 h-4 object-contain shrink-0"
          draggable={false}
        />
        Drop Sandyx or click any of the 3 below!
      </p>
      <div className="grid grid-cols-3 items-stretch gap-2">
        <ShowMathToggle moduleId={moduleId} isLightMode={isLightMode} />
        <VideoExplanationToggle moduleId={moduleId} isLightMode={isLightMode} />
        <SourcesToggle moduleId={moduleId} isLightMode={isLightMode} />
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
      className={`grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 rounded-[6px] border border-border transition-colors duration-300 ${
        isLightMode ? "bg-[#fdfaf3]" : "bg-card"
      }`}
    >
      <div className="lg:col-span-5 space-y-5">{controls}</div>
      <div className="lg:col-span-7 space-y-5">{children}</div>
    </motion.div>
  );
}
