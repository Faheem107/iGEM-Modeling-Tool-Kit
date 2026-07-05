'use client';

import React from 'react';
import { motion } from 'motion/react';
import { useGlossary } from './GlossaryTerm';

/**
 * Sandyx Companion
 * ================
 * The mascot rail that sits to the left of the modules. It shows:
 *   1. a hint bubble ("Drop me at any underlined word for an explanation!"),
 *   2. the draggable Sandyx mascot (drop it on an underlined <Term> to open its explanation),
 *   3. a "tree" of module names that fills in / highlights as the reader scrolls (scroll-spy).
 *
 * On phones the rail collapses to a small floating draggable Sandyx plus a current-section pill,
 * so the drag-to-explain interaction still works without a wide sidebar.
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

/** Pull viewport (client) coords out of any drag pointer/touch/mouse event. */
function clientPoint(e: MouseEvent | TouchEvent | PointerEvent): { x: number; y: number } | null {
  if ('clientX' in e && typeof (e as PointerEvent).clientX === 'number') {
    return { x: (e as PointerEvent).clientX, y: (e as PointerEvent).clientY };
  }
  const te = e as TouchEvent;
  const t = te.changedTouches?.[0] || te.touches?.[0];
  return t ? { x: t.clientX, y: t.clientY } : null;
}

/** Find the underlined <Term> currently under the pointer, seeing through the dragged mascot. */
function termAtPoint(x: number, y: number): string | null {
  const stack = document.elementsFromPoint(x, y);
  for (const el of stack) {
    const id = (el as HTMLElement).getAttribute?.('data-sandyx-term');
    if (id) return id;
  }
  return null;
}

export default function SandyxCompanion({ items, isLightMode }: Props) {
  const { open, setDragging, setHoverId, dragging } = useGlossary();
  const [activeId, setActiveId] = React.useState<string | null>(items[0]?.id ?? null);
  const hoverRef = React.useRef<string | null>(null);

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
        // pick the most-visible section; fall back to nearest-to-top
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

  // --- Drag handlers shared by desktop + mobile mascots ---
  const onDragStart = () => {
    setDragging(true);
  };
  const onDrag = (e: MouseEvent | TouchEvent | PointerEvent) => {
    const p = clientPoint(e);
    if (!p) return;
    const id = termAtPoint(p.x, p.y);
    hoverRef.current = id;
    setHoverId(id);
  };
  const onDragEnd = () => {
    const dropped = hoverRef.current;
    setDragging(false);
    setHoverId(null);
    hoverRef.current = null;
    if (dropped) open(dropped);
  };

  const Mascot = ({ size, floating }: { size: number; floating?: boolean }) => (
    <motion.img
      src="/sandyx.png"
      alt="Sandyx — drag me onto an underlined word"
      draggable={false}
      drag
      dragSnapToOrigin
      dragMomentum={false}
      dragElastic={0.12}
      onDragStart={onDragStart}
      onDrag={(e) => onDrag(e as PointerEvent)}
      onDragEnd={onDragEnd}
      whileHover={{ scale: 1.06, rotate: -2 }}
      whileTap={{ scale: 0.94 }}
      whileDrag={{ scale: 1.14, rotate: 4, cursor: 'grabbing' }}
      animate={dragging ? {} : { y: [0, -6, 0] }}
      transition={dragging ? { duration: 0 } : { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      style={{ width: size, height: 'auto', touchAction: 'none' }}
      className={`object-contain select-none cursor-grab drop-shadow-xl active:cursor-grabbing ${
        floating ? '' : 'mx-auto'
      }`}
    />
  );

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

          <Mascot size={128} />

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
        </div>
      </aside>

      {/* ---------------- Mobile floating mascot + section pill ---------------- */}
      <div className="lg:hidden">
        {/* current section pill */}
        {activeId && (
          <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[70] pointer-events-none">
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
        {/* floating draggable Sandyx */}
        <div className="fixed bottom-4 left-4 z-[75] flex flex-col items-center">
          {!dragging && (
            <span
              className={`mb-1 max-w-[120px] text-center text-[9px] font-semibold leading-tight px-2 py-1 rounded-xl border ${
                isLightMode ? 'bg-white/85 border-teal-200 text-slate-600' : 'bg-slate-900/85 border-teal-500/25 text-slate-300'
              }`}
              style={{ backdropFilter: 'blur(6px)' }}
            >
              Drag me onto underlined words!
            </span>
          )}
          <Mascot size={72} floating />
        </div>
      </div>
    </>
  );
}
