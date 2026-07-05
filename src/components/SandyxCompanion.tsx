'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp } from 'lucide-react';
import DraggableSandyx from './DraggableSandyx';

/**
 * Sandyx Companion (module rail)
 * ==============================
 * The desktop rail to the left of the modules. It shows:
 *   1. a hint bubble ("Drop me at any underlined word for an explanation!"),
 *   2. the draggable Sandyx mascot,
 *   3. a "tree" of module names that fills in / highlights as the reader scrolls (scroll-spy).
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
  const [activeId, setActiveId] = React.useState<string | null>(items[0]?.id ?? null);

  // "Back to Top" visibility — appears once the reader has scrolled past the first fold, and
  // fades away again near the top. Updated inside a rAF so we never thrash React on every tick.
  const [showTop, setShowTop] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setShowTop(window.scrollY > 400);
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // --- Scroll-spy: highlight whichever section is nearest the top of the viewport ---
  React.useEffect(() => {
    if (typeof window === 'undefined' || items.length === 0) return;
    const els = items
      .map((it) => document.getElementById(it.id))
      .filter((e): e is HTMLElement => !!e);
    if (els.length === 0) return;

    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.intersectionRatio);
          else visible.delete(entry.target.id);
        }
        let best: string | null = null;
        let bestRatio = -1;
        visible.forEach((ratio, id) => {
          if (ratio > bestRatio) { bestRatio = ratio; best = id; }
        });
        if (best) setActiveId(best);
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0, 0.15, 0.4, 0.75, 1] },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      {/* ---------------- Desktop rail ---------------- */}
      <aside className="hidden lg:block">
        <div className="sticky top-6 flex flex-col items-stretch">
          {/* Hint bubble */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative mx-auto mb-1 max-w-[190px] text-center text-[11px] font-semibold leading-snug px-3 py-2 rounded-2xl border ${
              isLightMode
                ? 'bg-white/80 border-teal-200 text-slate-700'
                : 'bg-slate-900/70 border-teal-500/25 text-slate-200'
            }`}
            style={{ backdropFilter: 'blur(8px)' }}
          >
            Drop me at any <span className="text-teal-500 underline decoration-dotted">underlined</span> word for an explanation!
            <span
              className={`absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 rotate-45 border-b border-r ${
                isLightMode ? 'bg-white/80 border-teal-200' : 'bg-slate-900/70 border-teal-500/25'
              }`}
            />
          </motion.div>

          <div className="flex justify-center">
            <DraggableSandyx size={128} />
          </div>

          {/* Module tree */}
          <div className="mt-4 relative pl-4">
            {/* trunk line */}
            <div
              className={`absolute left-1.5 top-2 bottom-2 w-px ${
                isLightMode ? 'bg-slate-200' : 'bg-slate-700/60'
              }`}
            />
            <p className={`text-[9px] font-black uppercase tracking-[0.15em] mb-2 ${isLightMode ? 'text-stone-400' : 'text-slate-500'}`}>
              Your path
            </p>
            <ul className="space-y-0.5">
              {items.map((it) => {
                const active = it.id === activeId;
                return (
                  <li key={it.id} className="relative">
                    {/* node */}
                    <span
                      className={`absolute -left-[9px] top-2.5 w-2 h-2 rounded-full border transition-all duration-300 ${
                        active
                          ? 'bg-teal-400 border-teal-400 scale-125 shadow-[0_0_8px_rgba(45,212,191,0.7)]'
                          : isLightMode
                            ? 'bg-white border-slate-300'
                            : 'bg-slate-900 border-slate-600'
                      }`}
                    />
                    <button
                      onClick={() => scrollTo(it.id)}
                      className={`block w-full text-left text-[12px] leading-snug py-1.5 pl-1.5 pr-1 rounded-lg transition-all duration-300 ${
                        active
                          ? isLightMode
                            ? 'font-bold text-teal-700 bg-teal-50'
                            : 'font-bold text-teal-300 bg-teal-500/10'
                          : isLightMode
                            ? 'text-slate-500 hover:text-slate-800'
                            : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {it.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Back to Top — pops up smoothly once scrolled, sits right below the module tree */}
          <AnimatePresence>
            {showTop && (
              <motion.button
                key="companion-back-to-top"
                onClick={scrollToTop}
                initial={{ opacity: 0, y: -8, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto', marginTop: 16 }}
                exit={{ opacity: 0, y: -8, height: 0, marginTop: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                className={`ml-4 flex items-center justify-center gap-1.5 rounded-xl border py-2 text-[11px] font-bold transition-colors ${
                  isLightMode
                    ? 'bg-white/80 border-teal-200 text-teal-700 hover:bg-teal-50'
                    : 'bg-slate-900/70 border-teal-500/25 text-teal-300 hover:bg-teal-500/10'
                }`}
                style={{ backdropFilter: 'blur(8px)' }}
              >
                <ArrowUp className="w-3.5 h-3.5" /> Back to top
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </aside>

      {/* ---------------- Mobile current-section pill ---------------- */}
      {activeId && (
        <div className="lg:hidden fixed top-3 left-1/2 -translate-x-1/2 z-[70] pointer-events-none">
          <div
            className={`px-3 py-1 rounded-full text-[10px] font-bold border shadow-sm ${
              isLightMode ? 'bg-white/85 border-slate-200 text-slate-700' : 'bg-slate-900/85 border-slate-700 text-slate-200'
            }`}
            style={{ backdropFilter: 'blur(8px)' }}
          >
            {items.find((i) => i.id === activeId)?.label}
          </div>
        </div>
      )}
    </>
  );
}
