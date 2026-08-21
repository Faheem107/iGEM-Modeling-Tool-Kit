"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  INDEX_COLUMNS,
  ARCHIVED_MODULES,
  moduleHref,
} from "@/src/lib/modelIndex";
import type { ModuleMeta } from "@/src/lib/prongs";
import { PRONG_TITLES, ALGINATE_RATIONALE } from "@/content/copy";

/**
 * Every model on the site, grouped, with nothing open until it is asked for.
 * ==========================================================================
 * Four folded groups: the two engineered prongs and the two layers they share.
 * The list stays folded, so the reader picks a layer before reading forty link
 * titles. Below them the exposure model and the archived option each get a row
 * of their own. Exposure does not fold: it is one destination, so the heading
 * is the link.
 *
 * The four model columns come from MODULE_REGISTRY via src/lib/modelIndex.ts,
 * so adding a module to the registry lists it here automatically.
 */

type ViewTarget = number | "killswitch";

export default function ModelIndex({
  show = true,
  onView,
  heading,
}: {
  show?: boolean;
  onView?: (t: ViewTarget) => void;
  heading?: string;
}) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: show ? 1 : 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      style={{ pointerEvents: show ? "auto" : "none" }}
    >
      {heading && (
        <div className="mb-12 border-b border-border pb-6">
          <h2 className="text-[length:var(--text-h1)] text-foreground">
            {heading}
          </h2>
        </div>
      )}

      <div className="grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {INDEX_COLUMNS.map((col) => {
          // The two prong columns double as the way into their explainer.
          const prongId =
            col.key === "prong-1" ? 1 : col.key === "prong-2" ? 2 : null;
          return (
            <Group
              key={col.key}
              eyebrow={col.eyebrow}
              title={col.title}
              lede={col.lede}
              aside={
                prongId && onView ? (
                  <button
                    type="button"
                    onClick={() => onView(prongId)}
                    className="caption rule-link mt-4 inline-block text-dune-orange"
                  >
                    How it works
                  </button>
                ) : null
              }
            >
              <ModuleList prongs={col.prongs} modules={col.modules} />
            </Group>
          );
        })}
      </div>

      {/* Where the crust ends up: the sand that arrives at a site, and what
          stopping it is worth. One destination, so the heading is the link and
          there is nothing to unfold. */}
      <div className="mt-12 border-t border-border pt-6">
        <div className="rail-row">
          <p className="caption pt-1">Wind and cost</p>
          <Link href="/exposure" className="group block">
            <span className="wght-head rule-link block text-[length:var(--text-h3)] text-foreground">
              Exposure and the commercial case
            </span>
            <span className="mt-2 block max-w-[62ch] text-[length:var(--text-micro)] leading-snug text-muted-foreground">
              The prongs set how well a treated surface holds. This takes that outward:
              how much sand reaches a given site, when in the year it arrives, and what
              stopping it is worth to whoever owns it.
            </span>
          </Link>
        </div>
      </div>

      {/* The archived option keeps its models, set apart rather than hidden. */}
      {ARCHIVED_MODULES.length > 0 && (
        <div className="mt-12 border-t border-border pt-6">
          <div className="rail-row">
            <p className="caption pt-1">Archived</p>
            <Group
              title={PRONG_TITLES[3]}
              lede={ALGINATE_RATIONALE}
              muted
              wide
              aside={
                onView ? (
                  <button
                    type="button"
                    onClick={() => onView(3)}
                    className="caption rule-link mt-4 inline-block text-dune-orange"
                  >
                    Why it was dropped
                  </button>
                ) : null
              }
            >
              <ModuleList prongs="3" modules={ARCHIVED_MODULES} />
            </Group>
          </div>
        </div>
      )}

    </motion.div>
  );
}

/**
 * One folded group. The whole header is the control, so the target is the size
 * of the heading rather than a chevron, and the sign in the corner says which
 * way it will go.
 */
function Group({
  eyebrow,
  title,
  lede,
  children,
  aside,
  muted,
  wide,
}: {
  eyebrow?: string;
  title: string;
  lede: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
  muted?: boolean;
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      {eyebrow && <p className="caption mb-2">{eyebrow}</p>}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="group block w-full text-left"
      >
        <span className="flex items-start justify-between gap-4">
          <span
            className={`wght-head rule-link text-[length:var(--text-h3)] ${
              muted ? "text-muted-foreground" : "text-foreground"
            }`}
          >
            {title}
          </span>
          <span aria-hidden className="caption shrink-0 pt-2 text-dune-orange">
            {open ? "−" : "+"}
          </span>
        </span>
        <span
          className={`mt-2 block text-[length:var(--text-micro)] leading-snug text-muted-foreground ${
            wide ? "max-w-[62ch]" : "max-w-[32ch]"
          }`}
        >
          {lede}
        </span>
      </button>
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
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ModuleList({
  prongs,
  modules,
}: {
  prongs: string;
  modules: ModuleMeta[];
}) {
  if (modules.length === 0) return null;
  return (
    <ol className="mt-6">
      {modules.map((m, i) => (
        <li key={m.id}>
          <Link
            href={moduleHref(prongs, m.id)}
            className="rail-row-tight border-t border-border py-2"
          >
            <span className="caption pt-1">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>
              <span className="wght-link rule-link block text-[length:var(--text-body)] leading-snug">
                {m.title}
              </span>
              <span className="caption mt-1 block opacity-60">{m.scale}</span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

