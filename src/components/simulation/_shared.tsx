"use client";

/**
 * Shared UI primitives for the simulation modules, themed panels, sliders, stat cards,
 * a collapsible "Show the math" block, and recharts color tokens. Keeps every new module
 * visually consistent with the existing toolkit (light/dark) while staying graph-first.
 */

import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useGlossary, GlossaryText } from "../GlossaryTerm";
import { CaptionText } from "../CaptionText";
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
  isLightMode,
  children,
  className = "",
  right,
}: Themed & {
  title: React.ReactNode;
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
        <h3 className="caption text-foreground" style={{ textWrap: "balance" }}>
          <CaptionText>{title}</CaptionText>
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
  accent = "accent-dune-teal",
  hint,
  note,
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
  /** A short unit-style clarification, always visible. One line at most. */
  hint?: string;
  /** A caveat the reader wants only after they have moved the slider. Behind a
   *  Note, so it does not sit between the control and the next figure. */
  note?: string;
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
        <span className="mt-2 block text-[length:var(--text-caption)] leading-snug text-muted-foreground opacity-80">
          <GlossaryText max={3}>{hint}</GlossaryText>
        </span>
      )}
      {note && (
        <Note label="What this assumes" className="mt-2">
          {note}
        </Note>
      )}
    </div>
  );
}

/**
 * A caption-size disclosure for one clarification.
 *
 * The rule it exists to enforce (CLAUDE.md, "Information order"): the number
 * comes first, alone. A sentence explaining what a figure means goes behind
 * this, so a reader who has not yet looked at the figure is not reading about
 * it. Collapsed it is one muted line; open it is prose in place, with no
 * border, no fill and no rule, because a box here reads as a second panel
 * rather than an answer to a question the reader just asked.
 *
 * Use `Fold` for a section. This is for a single caveat next to a figure.
 */
export function Note({
  label = "Why",
  children,
  className = "",
}: {
  /** What the reader is asking. Keep it to two or three words. */
  label?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="caption inline-flex items-center gap-2 text-left text-muted-foreground transition-colors hover:text-dune-orange"
      >
        <span className="rule-link">{label}</span>
        <span aria-hidden className="text-dune-orange">
          {open ? "\u2212" : "+"}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="note"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="max-w-[62ch] pt-2 text-[length:var(--text-caption)] leading-relaxed text-muted-foreground">
              {typeof children === "string" ? (
                <GlossaryText max={3}>{children}</GlossaryText>
              ) : (
                children
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * One folded section, shared with the prong list on the landing page.
 *
 * The whole header is the control, so the target is the heading rather than a
 * chevron. `Panel` is the boxed alternative; use `Fold` where a page would
 * otherwise be a grid of boxes.
 */
export function Fold({
  eyebrow,
  title,
  lede,
  children,
  aside,
  right,
  muted,
  wide,
  defaultOpen = false,
  headingClass = "text-[length:var(--text-h3)]",
  className = "",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lede?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
  /** Header trailing slot, outside the button so it is not a click target. */
  right?: React.ReactNode;
  muted?: boolean;
  wide?: boolean;
  defaultOpen?: boolean;
  headingClass?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={className}>
      {eyebrow && <p className="caption mb-2">{eyebrow}</p>}
      <div className="flex items-start justify-between gap-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="group block flex-1 text-left"
        >
          <span className="flex items-start justify-between gap-4">
            <span
              className={`wght-head rule-link ${headingClass} ${
                muted ? "text-muted-foreground" : "text-foreground"
              }`}
            >
              {title}
            </span>
            <span aria-hidden className="caption shrink-0 pt-2 text-dune-orange">
              {open ? "\u2212" : "+"}
            </span>
          </span>
        </button>
        {right && <span className="shrink-0 pt-1">{right}</span>}
      </div>
      {/* The lede sits OUTSIDE the button. It is where a reader meets a
          section's vocabulary for the first time, so it is where a word they do
          not know most needs somewhere to go, and a glossary term is itself a
          control. Nesting one inside the fold's button would put a focus stop
          inside a button and announce as one control containing another. The
          heading and the sign next to it are still the target that opens the
          fold. Two terms per lede: more reads as noise rather than as help. */}
      {lede && (
        <p
          className={`mt-2 text-[length:var(--text-micro)] leading-snug text-muted-foreground ${
            wide ? "max-w-[62ch]" : "max-w-[32ch]"
          }`}
        >
          <GlossaryText max={2}>{lede}</GlossaryText>
        </p>
      )}
      {aside}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {/* Padding on an inner wrapper: on the animated element it would
                still paint at height 0 and the fold would open from a gap. */}
            <div className="pt-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function StatCard({
  label,
  value,
  unit,
  accent,
  sub,
  note,
  emphasize,
  rule = true,
}: Themed & {
  label: React.ReactNode;
  /**
   * Pass null when there is no value to show. A missing number renders as a
   * stated absence, never as 0 and never as a sentence sitting in the slot
   * where a figure belongs. See DUST_EXPOSURE_MODULE_SPEC.md section 7.2.
   */
  value: string | null;
  unit?: string;
  accent: string;
  /** A unit or provenance line, always visible. One line at most. */
  sub?: string;
  /** A caveat the reader only wants after the number. Behind a Note. */
  note?: string;
  emphasize?: boolean;
  /** The top rule reads as a stray line once the Panel around it is gone, so
   *  pass false inside a Fold. Defaults true so no existing module changes. */
  rule?: boolean;
}) {
  if (value === null) {
    return (
      <div className={rule ? "border-t border-border pt-2" : ""}>
        <span className="caption mb-2 block" style={{ textWrap: "balance" }}>
          <CaptionText>{label}</CaptionText>
        </span>
        <span className="block text-[length:var(--text-micro)] italic text-muted-foreground">
          no source yet
        </span>
        {sub && (
          <span className="mt-1 block text-[length:var(--text-caption)] leading-snug text-muted-foreground">
            {sub}
          </span>
        )}
        {note && <Note className="mt-2">{note}</Note>}
      </div>
    );
  }
  return (
    // A figure on a rule, not a tile. The emphasised one is marked by a heavier
    // top rule and a larger number, never by a ring, a fill or a stripe.
    //
    // With rule={false} there is no rule to thicken, so the size step carries it
    // alone. It used to get `border-l-2 border-dune-orange`, a coloured accent
    // bar, which DESIGN.md section 3.2 bans outright. Where the size step alone
    // reads as under-marked, give the figure its own row above the grid rather
    // than a stripe beside it.
    <div
      className={
        rule
          ? `border-t pt-2 ${emphasize ? "border-dune-orange" : "border-border"}`
          : ""
      }
    >
      <span className="caption mb-2 block" style={{ textWrap: "balance" }}>
        <CaptionText>{label}</CaptionText>
      </span>
      <div className="flex items-baseline gap-2">
        <span
          className={`tabular-nums ${emphasize ? "text-[length:var(--text-h3)]" : "text-[length:var(--text-body)]"} ${accent}`}
          style={{ fontVariationSettings: emphasize ? '"wght" 700' : '"wght" 620' }}
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
          {/* One dotted term per line at most. This is where a reader who has
              just met a number looks for the word they did not know, and it is
              also where Sandyx has somewhere to land. `label` is NOT glossed:
              .caption is 11px uppercase at 0.14em tracking, where a dotted
              underline is close to invisible and Term's padding would knock the
              row's baselines out of line. */}
          {typeof sub === "string" ? <GlossaryText max={1}>{sub}</GlossaryText> : sub}
        </span>
      )}
      {note && <Note className="mt-2">{note}</Note>}
    </div>
  );
}

/** Collapsible block hiding dense formulae behind a toggle (graph-first by default). */
export function MathDisclosure({
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
        <span>{label}</span>
        <span aria-hidden className="caption shrink-0 text-dune-orange">
          {open ? "−" : "+"}
        </span>
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
  moduleId,
  dropAttr,
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
      title={label}
      // Sandyx hover is marked by the edge taking the accent, not by a ring.
      className={`caption flex w-full min-w-0 flex-col items-center justify-center gap-2 rounded-[4px] border px-2 py-4 transition-colors hover:border-dune-orange hover:text-dune-orange ${
        hovered ? "border-dune-orange text-dune-orange" : "border-border"
      } ${className}`}
    >
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
export type ModuleAction = "math" | "video" | "sources" | "code";

const ALL_ACTIONS: ModuleAction[] = ["math", "video", "sources", "code"];

export function ModuleActions({
  moduleId,
  isLightMode,
  className = "",
  include,
}: Themed & {
  moduleId: ModuleId;
  className?: string;
  /**
   * Which toggles to show. Defaults to all four, minus Code for modules that
   * ship no script. Pass a subset for a module that has no video to offer,
   * rather than rendering a toggle onto an empty window.
   */
  include?: ModuleAction[];
}) {
  const wanted = include ?? ALL_ACTIONS;
  const shown = wanted.filter((a) => a !== "code" || moduleId in MODULE_CODE);
  const cols =
    shown.length >= 4 ? "grid-cols-2 sm:grid-cols-4"
    : shown.length === 3 ? "grid-cols-3"
    : shown.length === 2 ? "grid-cols-2"
    : "grid-cols-1";
  return (
    <div className={className}>
      <div className={`grid items-stretch gap-2 ${cols}`}>
        {shown.includes("math") && (
          <ShowMathToggle moduleId={moduleId} isLightMode={isLightMode} />
        )}
        {shown.includes("video") && (
          <VideoExplanationToggle moduleId={moduleId} isLightMode={isLightMode} />
        )}
        {shown.includes("sources") && (
          <SourcesToggle moduleId={moduleId} isLightMode={isLightMode} />
        )}
        {shown.includes("code") && (
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
