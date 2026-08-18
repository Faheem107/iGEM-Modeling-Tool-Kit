"use client";

import React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  INDEX_COLUMNS,
  ARCHIVED_MODULES,
  moduleHref,
  TOTAL_MODULES,
} from "@/src/lib/modelIndex";
import type { ModuleMeta } from "@/src/lib/prongs";

/**
 * Every model on the site, in one block.
 * ==========================================================================
 * This is the thing the prong cards used to stand between the reader and.
 * Three columns of plain text links, hairline-divided, index in the rail. No
 * boxes, no modal step: each row is a real deep link into that module's
 * section inside the workspace.
 *
 * The columns come from MODULE_REGISTRY via src/lib/modelIndex.ts, so adding a
 * module to the registry lists it here automatically.
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
        <div className="mb-10 border-b border-border pb-5">
          <p className="caption mb-3">{TOTAL_MODULES} models</p>
          <h2 className="text-[length:var(--text-h1)] text-foreground">
            {heading}
          </h2>
        </div>
      )}

      <div className="grid gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
        {INDEX_COLUMNS.map((col) => {
          // The two prong columns double as the way into their explainer.
          const prongId =
            col.key === "prong-1" ? 1 : col.key === "prong-2" ? 2 : null;
          return (
          <div key={col.key}>
            <p className="caption mb-2">{col.eyebrow}</p>
            {prongId && onView ? (
              <button
                type="button"
                onClick={() => onView(prongId)}
                className="block text-left"
              >
                <h3 className="wght-head rule-link text-[length:var(--text-h3)] text-foreground">
                  {col.title}
                </h3>
              </button>
            ) : (
              <h3 className="text-[length:var(--text-h3)] text-foreground">
                {col.title}
              </h3>
            )}
            <p className="mt-2 max-w-[32ch] text-[0.875rem] leading-snug text-muted-foreground">
              {col.lede}
            </p>
            <List prongs={col.prongs} modules={col.modules} />
          </div>
          );
        })}
      </div>

      {/* The archived option keeps its models, set apart rather than hidden. */}
      {ARCHIVED_MODULES.length > 0 && (
        <div className="mt-16 border-t border-border pt-8">
          <div className="rail-row">
            <p className="caption pt-1">Archived</p>
            <div>
              <h3 className="text-[length:var(--text-h3)] text-muted-foreground">
                Sodium Alginate
              </h3>
              <p className="mt-2 max-w-[52ch] text-[0.875rem] leading-snug text-muted-foreground">
                Dropped as a prong, still fully modelled so its trade-offs
                against the engineered pair stay quantifiable.
                {onView && (
                  <>
                    {" "}
                    <button
                      type="button"
                      onClick={() => onView(3)}
                      className="rule-link text-foreground"
                    >
                      Why it was dropped
                    </button>
                  </>
                )}
              </p>
              <List prongs="3" modules={ARCHIVED_MODULES} />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function List({ prongs, modules }: { prongs: string; modules: ModuleMeta[] }) {
  if (modules.length === 0) return null;
  return (
    <ol className="mt-6">
      {modules.map((m, i) => (
        <li key={m.id}>
          <Link
            href={moduleHref(prongs, m.id)}
            className="rail-row-tight border-t border-border py-2.5"
          >
            <span className="caption pt-1">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>
              <span className="wght-link rule-link block text-[0.9375rem] leading-snug">
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
