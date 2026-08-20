"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  INDEX_COLUMNS,
  ARCHIVED_MODULES,
  FIELD_LINKS,
  moduleHref,
  type IndexLink,
} from "@/src/lib/modelIndex";
import type { ModuleMeta } from "@/src/lib/prongs";
import CompactModal from "@/src/components/CompactModal";
import { BUSINESS_SECTIONS, BUSINESS_SUMMARY } from "@/src/lib/businessModel";
import { PRONG_TITLES, ALGINATE_RATIONALE } from "@/content/copy";

/**
 * Every model on the site, grouped, with nothing open until it is asked for.
 * ==========================================================================
 * Six groups: the two engineered prongs, the two layers they share, the field
 * and cost view, and the archived option. Each one shows its name, what it
 * covers and how many models sit under it. The list itself stays folded, so the
 * reader picks a layer before reading forty link titles.
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
  const router = useRouter();
  const [showBusiness, setShowBusiness] = useState(false);

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
              count={col.modules.length}
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
          stopping it is worth. Same fold, same rail, one section. */}
      <div className="mt-12 border-t border-border pt-6">
        <div className="rail-row">
          <p className="caption pt-1">Wind and cost</p>
          <Group
            title="Exposure and the commercial case"
            lede="The prongs set how well a treated surface holds. These take that outward: how much sand reaches a given site, and what stopping it is worth to whoever owns it."
            count={FIELD_LINKS.length}
            unit="view"
            wide
          >
            <LinkList
              links={FIELD_LINKS}
              onAction={() => setShowBusiness(true)}
            />
          </Group>
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
              count={ARCHIVED_MODULES.length}
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

      <CompactModal
        open={showBusiness}
        onClose={() => setShowBusiness(false)}
        title="Business model"
        tabs={BUSINESS_SECTIONS.map((s) => ({
          id: s.id,
          label: s.label,
          body: (
            <div className="space-y-4">
              <h3 className="text-[0.9375rem] leading-snug text-foreground">
                {s.heading}
              </h3>
              {s.body.map((para, i) => (
                <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                  {para}
                </p>
              ))}
            </div>
          ),
        }))}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {BUSINESS_SUMMARY}
            </p>
            <button
              onClick={() => {
                setShowBusiness(false);
                router.push("/exposure");
              }}
              className="caption shrink-0 border border-border px-4 py-2 text-foreground transition-colors hover:border-dune-orange hover:text-dune-orange"
            >
              Open the model
            </button>
          </div>
        }
      />
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
  count,
  unit = "model",
  children,
  aside,
  muted,
  wide,
}: {
  eyebrow?: string;
  title: string;
  lede: string;
  count: number;
  unit?: string;
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
          <span aria-hidden className="caption shrink-0 pt-2 tabular-nums text-dune-orange">
            {open ? "−" : "+"}
            {count}
          </span>
        </span>
        <span
          className={`mt-2 block text-[0.875rem] leading-snug text-muted-foreground ${
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

function LinkList({
  links,
  onAction,
}: {
  links: IndexLink[];
  onAction: () => void;
}) {
  return (
    <ol className="mt-6 max-w-[42rem]">
      {links.map((l, i) => {
        const inner = (
          <>
            <span className="caption pt-1">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>
              <span className="wght-link rule-link block text-[0.9375rem] leading-snug">
                {l.title}
              </span>
              <span className="caption mt-1 block opacity-60">{l.meta}</span>
            </span>
          </>
        );
        return (
          <li key={l.id}>
            {l.href ? (
              <Link
                href={l.href}
                className="rail-row-tight border-t border-border py-2"
              >
                {inner}
              </Link>
            ) : (
              <button
                type="button"
                onClick={onAction}
                className="rail-row-tight w-full border-t border-border py-2 text-left"
              >
                {inner}
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}
