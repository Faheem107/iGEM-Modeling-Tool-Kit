"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { MODULE_REGISTRY } from "@/src/lib/prongs";
import { INDEX_COLUMNS, ARCHIVED_MODULES, moduleHref } from "@/src/lib/modelIndex";
import { PORTAL_CARDS, KILL_SWITCH } from "@/src/lib/portalsData";

/**
 * ⌘K palette: every model, prong and portal, one keystroke away.
 * ==========================================================================
 * Sources are the existing registries (MODULE_REGISTRY, PORTAL_CARDS), so no
 * content is authored here and nothing can drift out of sync with the pages
 * themselves. Add a module to the registry and it becomes searchable.
 */

interface Entry {
  id: string;
  label: string;
  hint: string;
  group: string;
  href: string;
}

function buildEntries(): Entry[] {
  const out: Entry[] = [];

  // Which prong query each module should open under. First column that owns it
  // wins; the whole-system column is the fallback.
  const owner = new Map<string, string>();
  for (const col of INDEX_COLUMNS)
    for (const m of col.modules) if (!owner.has(m.id)) owner.set(m.id, col.prongs);
  for (const m of ARCHIVED_MODULES) if (!owner.has(m.id)) owner.set(m.id, "3");

  for (const m of MODULE_REGISTRY) {
    out.push({
      id: `mod-${m.id}`,
      label: m.title,
      hint: m.blurb,
      group: "Models",
      href: moduleHref(owner.get(m.id) ?? "1,2", m.id),
    });
  }

  out.push(
    {
      id: "prong-1",
      label: "Polymer Overexpression",
      hint: "γ-PGA bio-adhesive matrix",
      group: "Prongs",
      href: "/model?prongs=1",
    },
    {
      id: "prong-2",
      label: "Carbonic Anhydrase & Sortase",
      hint: "Ammonia-free biomineralisation",
      group: "Prongs",
      href: "/model?prongs=2",
    },
    {
      id: "prong-both",
      label: "Both prongs together",
      hint: "The full combined simulation",
      group: "Prongs",
      href: "/model?prongs=1,2",
    },
    {
      id: "killswitch",
      label: KILL_SWITCH.title,
      hint: KILL_SWITCH.short,
      group: "Prongs",
      href: "/model?view=killswitch",
    },
  );

  for (const c of PORTAL_CARDS)
    out.push({
      id: c.id,
      label: c.title,
      hint: c.desc,
      group: "Portals",
      href: c.href,
    });

  out.push(
    { id: "home", label: "Home", hint: "The dune story", group: "Pages", href: "/" },
    { id: "models", label: "All models", hint: "The full index", group: "Pages", href: "/models" },
    { id: "portals", label: "Sandbox portals", hint: "Standalone tools", group: "Pages", href: "/portals" },
    { id: "exposure", label: "Dust exposure", hint: "Seasonal forecast and live feed", group: "Pages", href: "/exposure" },
  );

  return out;
}

function score(e: Entry, q: string): number {
  if (!q) return 0;
  const l = e.label.toLowerCase();
  const h = e.hint.toLowerCase();
  if (l.startsWith(q)) return 0;
  if (l.includes(q)) return 1;
  if (h.includes(q)) return 2;
  return -1;
}

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const entries = useMemo(buildEntries, []);

  useEffect(() => setMounted(true), []);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return entries;
    return entries
      .map((e) => ({ e, s: score(e, needle) }))
      .filter((r) => r.s >= 0)
      .sort((a, b) => a.s - b.s)
      .map((r) => r.e);
  }, [entries, q]);

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
    setCursor(0);
  }, []);

  const go = useCallback(
    (e: Entry) => {
      close();
      router.push(e.href);
    },
    [close, router],
  );

  // Open on ⌘K / Ctrl+K, or "/" when not already typing somewhere.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const target = ev.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "k") {
        ev.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (ev.key === "/" && !typing && !open) {
        ev.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => setCursor(0), [q]);

  const onInputKey = (ev: React.KeyboardEvent) => {
    if (ev.key === "Escape") {
      ev.preventDefault();
      ev.stopPropagation();
      close();
    } else if (ev.key === "ArrowDown") {
      ev.preventDefault();
      setCursor((c) => Math.min(results.length - 1, c + 1));
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (ev.key === "Enter" && results[cursor]) {
      ev.preventDefault();
      go(results[cursor]);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          // Lets StoryEscape know not to grab Escape while this is up.
          data-modal-open="true"
          className="fixed inset-0 z-[200] flex items-start justify-center px-4 pt-[14vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div
            className="absolute inset-0 bg-dune-basalt/50"
            onClick={close}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search the toolkit"
            className="plate-solid relative w-full max-w-xl overflow-hidden"
            initial={{ opacity: 0, y: -12, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onInputKey}
              placeholder="Search models, prongs and portals"
              // text-base so iOS Safari does not zoom the page on focus.
              className="w-full border-b border-border bg-transparent px-5 py-4 text-base text-foreground outline-none placeholder:text-muted-foreground"
            />
            <ul className="max-h-[52vh] overflow-y-auto py-2">
              {results.length === 0 && (
                <li className="caption px-5 py-6">Nothing matches that</li>
              )}
              {results.map((e, i) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => go(e)}
                    data-active={i === cursor}
                    className="grid w-full grid-cols-[1fr_auto] items-baseline gap-4 px-5 py-2.5 text-left data-[active=true]:bg-dune-orange/10"
                  >
                    <span>
                      <span className="wght-link block text-[0.9375rem] leading-snug" data-active={i === cursor}>
                        {e.label}
                      </span>
                      <span className="mt-0.5 block truncate text-[0.8125rem] text-muted-foreground">
                        {e.hint}
                      </span>
                    </span>
                    <span className="caption shrink-0">{e.group}</span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
