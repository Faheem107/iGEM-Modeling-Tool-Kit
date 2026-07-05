'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { lookupTerm, glossaryPhrases, type GlossaryEntry } from '../lib/glossary';
import { MODULE_MATH } from '../lib/moduleMath';
import type { ModuleId } from '../lib/prongs';
import Katex from './Katex';

/**
 * Sandyx Glossary system
 * ======================
 *  - <GlossaryProvider> holds the active term + Sandyx drag state and renders one glassy,
 *    transparent explanation pop-up for the whole page.
 *  - <Term k="..."> underlines a difficult word. Tapping it (or dropping Sandyx on it) opens
 *    the explanation. Each Term is a drop target: it carries data-sandyx-term so the dragging
 *    mascot can find it with document.elementFromPoint.
 *  - <GlossaryTerm term="..."> is kept as a backward-compatible alias of <Term>.
 */

interface GlossaryContextValue {
  activeId: string | null;
  open: (id: string) => void;
  close: () => void;
  /** Module id whose "Show the Math" window is open, or null. */
  activeMathId: ModuleId | null;
  openMath: (id: ModuleId) => void;
  closeMath: () => void;
  dragging: boolean;
  setDragging: (b: boolean) => void;
  hoverId: string | null;
  setHoverId: (id: string | null) => void;
  isLightMode: boolean;
}

export const GlossaryContext = React.createContext<GlossaryContextValue | null>(null);

export function useGlossary(): GlossaryContextValue {
  const ctx = React.useContext(GlossaryContext);
  if (!ctx) {
    // Safe no-op fallback so <Term> still renders (plain) outside a provider.
    return {
      activeId: null, open: () => {}, close: () => {},
      activeMathId: null, openMath: () => {}, closeMath: () => {}, dragging: false,
      setDragging: () => {}, hoverId: null, setHoverId: () => {}, isLightMode: false,
    };
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider + glassy pop-up
// ---------------------------------------------------------------------------
export const GlossaryProvider: React.FC<{ children: React.ReactNode; isLightMode?: boolean }> = ({
  children,
  isLightMode = false,
}) => {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [activeMathId, setActiveMathId] = React.useState<ModuleId | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [hoverId, setHoverId] = React.useState<string | null>(null);

  // Opening one window closes the other so we never stack pop-ups.
  const open = React.useCallback((id: string) => { setActiveMathId(null); setActiveId(id); }, []);
  const close = React.useCallback(() => setActiveId(null), []);
  const openMath = React.useCallback((id: ModuleId) => { setActiveId(null); setActiveMathId(id); }, []);
  const closeMath = React.useCallback(() => setActiveMathId(null), []);

  // Close either window on Escape.
  React.useEffect(() => {
    if (!activeId && !activeMathId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { close(); closeMath(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeId, activeMathId, close, closeMath]);

  const entry: GlossaryEntry | null = activeId ? GLOSSARY_BY_ID(activeId) : null;
  const math = activeMathId ? MODULE_MATH[activeMathId] : null;

  return (
    <GlossaryContext.Provider
      value={{ activeId, open, close, activeMathId, openMath, closeMath, dragging, setDragging, hoverId, setHoverId, isLightMode }}
    >
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {activeId && entry && (
              <motion.div
                key="sandyx-glossary-overlay"
                className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                onClick={close}
              >
                {/* Glassy transparent backdrop — page stays faintly visible behind it */}
                <div
                  className={`absolute inset-0 backdrop-blur-xl ${
                    isLightMode ? 'bg-white/40' : 'bg-slate-950/45'
                  }`}
                />

                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label={entry.title}
                  onClick={(e) => e.stopPropagation()}
                  initial={{ scale: 0.92, opacity: 0, y: 24 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.94, opacity: 0, y: 16 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                  className={`relative w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden ${
                    isLightMode
                      ? 'bg-white/85 border-white/70 text-slate-900'
                      : 'bg-slate-900/80 border-white/10 text-slate-100'
                  }`}
                  style={{ backdropFilter: 'blur(24px) saturate(1.4)' }}
                >
                  {/* soft accent glow */}
                  <div className="pointer-events-none absolute -top-16 -right-10 w-48 h-48 rounded-full bg-teal-400/20 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-indigo-400/20 blur-3xl" />

                  <div className="relative p-6 sm:p-7">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src="/sandyx.png"
                          alt="Sandyx"
                          className="w-11 h-11 object-contain shrink-0 drop-shadow"
                          draggable={false}
                        />
                        <span
                          className={`text-[10px] font-black uppercase tracking-[0.15em] px-2 py-1 rounded-full ${
                            isLightMode ? 'bg-teal-100 text-teal-800' : 'bg-teal-500/15 text-teal-300'
                          }`}
                        >
                          {entry.category}
                        </span>
                      </div>
                      <button
                        onClick={close}
                        aria-label="Close explanation"
                        className={`shrink-0 flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border transition-colors ${
                          isLightMode
                            ? 'border-slate-300 text-slate-600 hover:bg-slate-100'
                            : 'border-white/15 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <X className="w-3.5 h-3.5" /> Close
                      </button>
                    </div>

                    <h3 className="text-lg sm:text-xl font-black tracking-tight mb-2.5">
                      {entry.title}
                    </h3>
                    <p
                      className={`text-sm leading-relaxed ${
                        isLightMode ? 'text-slate-700' : 'text-slate-300'
                      }`}
                    >
                      {entry.plain}
                    </p>

                    {entry.module && (
                      <p
                        className={`mt-4 pt-3 border-t text-[11px] font-mono ${
                          isLightMode
                            ? 'border-slate-200 text-slate-500'
                            : 'border-white/10 text-slate-500'
                        }`}
                      >
                        Appears in · {entry.module}
                      </p>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {/* Second portal: the "Show the Math" window (LaTeX via KaTeX). */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {activeMathId && math && (
              <motion.div
                key="sandyx-math-overlay"
                className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                onClick={closeMath}
              >
                <div
                  className={`absolute inset-0 backdrop-blur-xl ${
                    isLightMode ? 'bg-white/40' : 'bg-slate-950/45'
                  }`}
                />

                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label={`${math.title} — mathematics`}
                  onClick={(e) => e.stopPropagation()}
                  initial={{ scale: 0.92, opacity: 0, y: 24 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.94, opacity: 0, y: 16 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                  className={`relative w-full max-w-lg max-h-[85vh] overflow-y-auto no-scrollbar rounded-3xl border shadow-2xl ${
                    isLightMode
                      ? 'bg-white/90 border-white/70 text-slate-900'
                      : 'bg-slate-900/85 border-white/10 text-slate-100'
                  }`}
                  style={{ backdropFilter: 'blur(24px) saturate(1.4)' }}
                >
                  <div className="pointer-events-none absolute -top-16 -right-10 w-48 h-48 rounded-full bg-indigo-400/20 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-teal-400/20 blur-3xl" />

                  <div className="relative p-6 sm:p-7">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img src="/sandyx.png" alt="Sandyx" className="w-11 h-11 object-contain shrink-0 drop-shadow" draggable={false} />
                        <span className={`text-[10px] font-black uppercase tracking-[0.15em] px-2 py-1 rounded-full ${
                          isLightMode ? 'bg-indigo-100 text-indigo-800' : 'bg-indigo-500/15 text-indigo-300'
                        }`}>
                          The Math
                        </span>
                      </div>
                      <button
                        onClick={closeMath}
                        aria-label="Close mathematics"
                        className={`shrink-0 flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border transition-colors ${
                          isLightMode ? 'border-slate-300 text-slate-600 hover:bg-slate-100' : 'border-white/15 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <X className="w-3.5 h-3.5" /> Close
                      </button>
                    </div>

                    <h3 className="text-lg sm:text-xl font-black tracking-tight mb-2">{math.title}</h3>
                    <p className={`text-sm leading-relaxed mb-5 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                      {math.intro}
                    </p>

                    <div className="space-y-4">
                      {math.blocks.map((b, i) => (
                        <div
                          key={i}
                          className={`rounded-2xl border p-4 ${
                            isLightMode ? 'bg-white/70 border-slate-200' : 'bg-slate-950/50 border-white/10'
                          }`}
                        >
                          <div className="overflow-x-auto no-scrollbar text-[15px]">
                            <Katex tex={b.tex} />
                          </div>
                          <p className={`mt-2.5 text-xs leading-relaxed ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                            {b.caption}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </GlossaryContext.Provider>
  );
};

// Helper: resolve an already-canonical id to its entry.
function GLOSSARY_BY_ID(id: string): GlossaryEntry | null {
  const found = lookupTerm(id);
  return found ? found.entry : null;
}

// ---------------------------------------------------------------------------
// <Term> — underlined, tappable, Sandyx drop target
// ---------------------------------------------------------------------------
export interface TermProps {
  /** Canonical or alias key into the glossary. */
  k?: string;
  /** Backward-compatible alias for `k`. */
  term?: string;
  children?: React.ReactNode;
  className?: string;
}

export const Term: React.FC<TermProps> = ({ k, term, children, className }) => {
  const key = (k || term || '').toString();
  const resolved = lookupTerm(key);
  const { open, hoverId, isLightMode } = useGlossary();

  // Unknown term → render plain so we never crash or show a dead link.
  if (!resolved) return <span className={className}>{children || key}</span>;

  const id = resolved.id;
  const isHovered = hoverId === id;

  return (
    <span
      data-sandyx-term={id}
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        open(id);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open(id);
        }
      }}
      title={`${resolved.entry.title} — tap or drop Sandyx for an explanation`}
      className={`sandyx-term cursor-help underline decoration-dotted decoration-2 underline-offset-2 font-semibold transition-colors duration-150 rounded px-0.5 -mx-0.5 py-1 -my-1 ${
        isLightMode
          ? 'decoration-teal-500/70 text-slate-900 hover:text-teal-700'
          : 'decoration-teal-300/70 text-slate-100 hover:text-teal-300'
      } ${isHovered ? (isLightMode ? 'bg-teal-200/70 text-teal-900' : 'bg-teal-400/25 text-teal-100') : ''} ${
        className || ''
      }`}
    >
      {children || resolved.entry.title}
    </span>
  );
};

// ---------------------------------------------------------------------------
// <GlossaryText> — auto-underline every known glossary term in a block of prose
// ---------------------------------------------------------------------------
// Build the matcher once. Longest phrases first so multi-word terms win over substrings.
const PHRASES = glossaryPhrases();
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let MATCHER: RegExp | null = null;
function matcher(): RegExp {
  if (!MATCHER) {
    // Unicode-aware boundaries: not preceded/followed by a letter or digit (handles γ, ², etc.).
    const body = PHRASES.map((p) => esc(p.phrase)).join('|');
    MATCHER = new RegExp(`(?<![\\p{L}\\p{N}])(${body})(?![\\p{L}\\p{N}])`, 'giu');
  }
  return MATCHER;
}

/**
 * Renders a string, auto-wrapping known glossary terms in <Term> so dense scientific prose gets
 * the drop-Sandyx underlines without hand-annotating every sentence. Each distinct term is linked
 * at most once per block, up to `max`, so the text stays readable.
 */
export const GlossaryText: React.FC<{ children: string; max?: number; className?: string }> = ({ children, max = 5, className }) => {
  const text = children;
  const nodes: React.ReactNode[] = [];
  const re = matcher();
  re.lastIndex = 0;
  const used = new Set<string>();
  let last = 0;
  let linked = 0;
  let m: RegExpExecArray | null;
  while (linked < max && (m = re.exec(text)) !== null) {
    const found = lookupTerm(m[1]);
    if (!found || used.has(found.id)) continue;
    used.add(found.id);
    if (m.index > last) nodes.push(text.slice(last, m.index));
    nodes.push(<Term key={`${found.id}-${m.index}`} k={found.id}>{m[1]}</Term>);
    last = m.index + m[1].length;
    linked++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <span className={className}>{nodes}</span>;
};

// Backward-compatible default export (old API: term / children / theme / id).
const GlossaryTerm: React.FC<{
  term: string;
  children?: React.ReactNode;
  theme?: 'light' | 'dark';
  id?: string;
}> = ({ term, children }) => <Term term={term}>{children}</Term>;

export default GlossaryTerm;
