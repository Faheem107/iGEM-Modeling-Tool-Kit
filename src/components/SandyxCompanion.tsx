"use client";

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUp } from "lucide-react";
import DraggableSandyx from "./DraggableSandyx";

/**
 * Sandyx Companion (module rail)
 * ==============================
 * The desktop rail to the left of the modules. It shows:
 * 1. a hint bubble ("Drop me at any underlined word for an explanation!"),
 * 2. the draggable Sandyx mascot,
 * 3. a "tree" of module names that fills in / highlights as the reader scrolls (scroll-spy).
 *
 * On phones the rail collapses to a slim current-section pill; the site-wide GlobalSandyx
 * provides the draggable mascot there.
 */

export interface CompanionItem {
  /** DOM id of the section (without '#'). */
  id: string;
  label: string;
}

interface Props {
  items: CompanionItem[];
  isLightMode: boolean;
}

export default function SandyxCompanion({ items, isLightMode }: Props) {
  const [activeId, setActiveId] = React.useState<string | null>(
    items[0]?.id ?? null,
  );

  // "Back to Top" visibility, appears once the reader has scrolled past the first fold, and
  // fades away again near the top. Updated inside a rAF so we never thrash React on every tick.
  const [showTop, setShowTop] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setShowTop(window.scrollY > 400);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  // --- Scroll-spy: highlight whichever section is nearest the top of the viewport ---
  React.useEffect(() => {
    if (typeof window === "undefined" || items.length === 0) return;
    const els = items
      .map((it) => document.getElementById(it.id))
      .filter((e): e is HTMLElement => !!e);
    if (els.length === 0) return;

    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting)
            visible.set(entry.target.id, entry.intersectionRatio);
          else visible.delete(entry.target.id);
        }
        let best: string | null = null;
        let bestRatio = -1;
        visible.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = id;
          }
        });
        if (best) setActiveId(best);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.15, 0.4, 0.75, 1] },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      {/* ---------------- Desktop rail ---------------- */}
      <aside className="hidden lg:block">
        <div className="sticky top-6 flex flex-col items-stretch">
          {/* Hint bubble */}
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-2 max-w-[190px] text-center text-[length:var(--text-caption)] leading-snug text-muted-foreground"
          >
            Drop me at any{" "}
            <span className="text-dune-teal underline decoration-dotted underline-offset-2">
              underlined
            </span>{" "}
            word for an explanation
          </motion.p>

          <div className="flex justify-center">
            <DraggableSandyx size={128} />
          </div>

          {/* Module tree */}
          <div className="mt-6">
            <p className="caption mb-4">Your path</p>
            {/* The <ul> carries the rule; each item carries a transparent one
                pulled back over it, so the active item claims the shared line
                instead of adding a second bar next to it. */}
            <ul className="border-l border-border">
              {items.map((it) => {
                const active = it.id === activeId;
                return (
                  <li key={it.id}>
                    <button
                      onClick={() => scrollTo(it.id)}
                      data-active={active}
                      aria-current={active ? "true" : undefined}
                      className="wght-link -ml-px block w-full border-l border-transparent py-2 pl-4 text-left text-[length:var(--text-micro)] leading-snug data-[active=true]:border-dune-orange"
                    >
                      {it.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Back to Top, pops up smoothly once scrolled, sits right below the module tree */}
          <AnimatePresence>
            {showTop && (
              <motion.button
                key="companion-back-to-top"
                onClick={scrollToTop}
                initial={{ opacity: 0, y: -8, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto", marginTop: 16 }}
                exit={{ opacity: 0, y: -8, height: 0, marginTop: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                className="caption flex items-center gap-2 pl-4 transition-colors hover:text-foreground"
              >
                <ArrowUp className="h-3.5 w-3.5" /> Back to top
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </aside>

      {/* ---------------- Mobile current-section pill ---------------- */}
      {activeId && (
        <div className="lg:hidden fixed top-3 left-1/2 -translate-x-1/2 z-[70] pointer-events-none">
          <div className="caption plate px-4 py-2 text-foreground">
            {items.find((i) => i.id === activeId)?.label}
          </div>
        </div>
      )}
    </>
  );
}
