'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, PlayCircle, BookText, FileText, Loader2 } from 'lucide-react';
import { lookupTerm, glossaryPhrases, type GlossaryEntry } from '../lib/glossary';
import { MODULE_MATH } from '../lib/moduleMath';
import { MODULE_VIDEOS, videoSrc, videoVtt } from '../lib/moduleVideos';
import { MODULE_SOURCES } from '../lib/moduleSources';
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
  /** Module id whose "Video Explanation" window is open, or null. */
  activeVideoId: ModuleId | null;
  openVideo: (id: ModuleId) => void;
  closeVideo: () => void;
  /** Module id whose "Sources" window is open, or null. */
  activeSourcesId: ModuleId | null;
  openSources: (id: ModuleId) => void;
  closeSources: () => void;
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
      activeMathId: null, openMath: () => {}, closeMath: () => {},
      activeVideoId: null, openVideo: () => {}, closeVideo: () => {},
      activeSourcesId: null, openSources: () => {}, closeSources: () => {},
      dragging: false,
      setDragging: () => {}, hoverId: null, setHoverId: () => {}, isLightMode: false,
    };
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Video player with a Sandyx "Please wait" loader
// ---------------------------------------------------------------------------
/**
 * The <video> used to flash its `poster` (a full-frame Sandyx image) for a single frame before the
 * mp4 started — the "buffer" glitch. Fix: no poster at all. Instead the video renders transparent
 * and a Sandyx "Please wait" panel sits on top of it, only fading away once the browser reports the
 * clip can actually play through. The reserved 16:9 box means nothing jumps as the loader swaps out.
 */
function VideoPanel({ id, isLightMode }: { id: ModuleId; isLightMode: boolean }) {
  const [ready, setReady] = React.useState(false);
  // A fresh clip is loading whenever the id changes.
  React.useEffect(() => { setReady(false); }, [id]);

  return (
    <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-black/10 bg-black shadow-inner">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        key={id}
        controls
        autoPlay
        playsInline
        preload="auto"
        onCanPlayThrough={() => setReady(true)}
        onPlaying={() => setReady(true)}
        className={`absolute inset-0 w-full h-full block transition-opacity duration-300 ${ready ? 'opacity-100' : 'opacity-0'}`}
      >
        <source src={videoSrc(id)} type="video/mp4" />
        <track kind="subtitles" srcLang="en" label="English" src={videoVtt(id)} default />
        Your browser does not support embedded video.
      </video>

      <AnimatePresence>
        {!ready && (
          <motion.div
            key="video-loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className={`absolute inset-0 flex flex-col items-center justify-center gap-3 text-center ${
              isLightMode ? 'bg-slate-900' : 'bg-slate-950'
            }`}
          >
            <motion.img
              src="/sandyx.png"
              alt="Sandyx"
              draggable={false}
              className="w-20 h-20 object-contain drop-shadow-lg"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="flex items-center gap-2 text-slate-200">
              <Loader2 className="w-4 h-4 animate-spin text-fuchsia-400" />
              <span className="text-sm font-bold">Please wait — loading the animation…</span>
            </div>
            <span className="text-[11px] text-slate-400">Sandyx is fetching the explainer for you.</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared pop-up shell (glossary / math / video / sources)
// ---------------------------------------------------------------------------
/**
 * One shell for every Sandyx window so all four open with the *same* seamless transition.
 *
 * The blur layer is the fix for the old "flash of the un-blurred page" glitch: it is promoted to
 * its own compositor layer up front (`translateZ(0)` + `will-change`) and fades its OWN opacity —
 * it is never nested inside an opacity-animating ancestor, so the `backdrop-filter` is already
 * realised on the first painted frame instead of one frame late.
 */
const DIALOG_SPRING = { type: 'spring' as const, stiffness: 320, damping: 26 };

function SandyxOverlay({
  overlayKey, onClose, isLightMode, ariaLabel, maxWidthClass, scroll = false, glowA, glowB, children,
}: {
  overlayKey: string;
  onClose: () => void;
  isLightMode: boolean;
  ariaLabel: string;
  maxWidthClass: string;
  scroll?: boolean;
  /** tailwind bg-* class for the top-right / bottom-left accent glows */
  glowA: string;
  glowB: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      key={overlayKey}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <motion.div
        aria-hidden
        className={`absolute inset-0 ${isLightMode ? 'bg-white/40' : 'bg-slate-950/45'}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        style={{
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          transform: 'translateZ(0)',
          willChange: 'opacity',
        }}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.92, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 16 }}
        transition={DIALOG_SPRING}
        className={`relative w-full ${maxWidthClass} ${scroll ? 'max-h-[88vh] overflow-y-auto no-scrollbar' : 'overflow-hidden'} rounded-3xl border shadow-2xl ${
          isLightMode ? 'bg-white/90 border-white/70 text-slate-900' : 'bg-slate-900/85 border-white/10 text-slate-100'
        }`}
        style={{
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
          transform: 'translateZ(0)',
        }}
      >
        <div className={`pointer-events-none absolute -top-16 -right-10 w-48 h-48 rounded-full ${glowA} blur-3xl`} />
        <div className={`pointer-events-none absolute -bottom-16 -left-10 w-48 h-48 rounded-full ${glowB} blur-3xl`} />
        {children}
      </motion.div>
    </motion.div>
  );
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
  const [activeVideoId, setActiveVideoId] = React.useState<ModuleId | null>(null);
  const [activeSourcesId, setActiveSourcesId] = React.useState<ModuleId | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [hoverId, setHoverId] = React.useState<string | null>(null);

  // Only ever one pop-up at a time: opening any window closes all the others.
  const open = React.useCallback((id: string) => { setActiveMathId(null); setActiveVideoId(null); setActiveSourcesId(null); setActiveId(id); }, []);
  const close = React.useCallback(() => setActiveId(null), []);
  const openMath = React.useCallback((id: ModuleId) => { setActiveId(null); setActiveVideoId(null); setActiveSourcesId(null); setActiveMathId(id); }, []);
  const closeMath = React.useCallback(() => setActiveMathId(null), []);
  const openVideo = React.useCallback((id: ModuleId) => { setActiveId(null); setActiveMathId(null); setActiveSourcesId(null); setActiveVideoId(id); }, []);
  const closeVideo = React.useCallback(() => setActiveVideoId(null), []);
  const openSources = React.useCallback((id: ModuleId) => { setActiveId(null); setActiveMathId(null); setActiveVideoId(null); setActiveSourcesId(id); }, []);
  const closeSources = React.useCallback(() => setActiveSourcesId(null), []);

  // Close any open window on Escape.
  React.useEffect(() => {
    if (!activeId && !activeMathId && !activeVideoId && !activeSourcesId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); closeMath(); closeVideo(); closeSources(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeId, activeMathId, activeVideoId, activeSourcesId, close, closeMath, closeVideo, closeSources]);

  const entry: GlossaryEntry | null = activeId ? GLOSSARY_BY_ID(activeId) : null;
  const math = activeMathId ? MODULE_MATH[activeMathId] : null;
  const video = activeVideoId ? MODULE_VIDEOS[activeVideoId] : null;
  const sources = activeSourcesId ? MODULE_SOURCES[activeSourcesId] : null;

  return (
    <GlossaryContext.Provider
      value={{
        activeId, open, close,
        activeMathId, openMath, closeMath,
        activeVideoId, openVideo, closeVideo,
        activeSourcesId, openSources, closeSources,
        dragging, setDragging, hoverId, setHoverId, isLightMode,
      }}
    >
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {activeId && entry && (
              <SandyxOverlay
                overlayKey="sandyx-glossary-overlay"
                onClose={close}
                isLightMode={isLightMode}
                ariaLabel={entry.title}
                maxWidthClass="max-w-md"
                glowA="bg-teal-400/20"
                glowB="bg-indigo-400/20"
              >
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
              </SandyxOverlay>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {/* Second portal: the "Show the Math" window (LaTeX via KaTeX). */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {activeMathId && math && (
              <SandyxOverlay
                overlayKey="sandyx-math-overlay"
                onClose={closeMath}
                isLightMode={isLightMode}
                ariaLabel={`${math.title} — mathematics`}
                maxWidthClass="max-w-lg"
                scroll
                glowA="bg-indigo-400/20"
                glowB="bg-teal-400/20"
              >
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
              </SandyxOverlay>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {/* Third portal: the "Video Explanation" window (narrated Manim animation + layman text). */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {activeVideoId && video && (
              <SandyxOverlay
                overlayKey="sandyx-video-overlay"
                onClose={closeVideo}
                isLightMode={isLightMode}
                ariaLabel={`${video.title} — video explanation`}
                maxWidthClass="max-w-2xl"
                scroll
                glowA="bg-fuchsia-400/20"
                glowB="bg-indigo-400/20"
              >
                  <div className="relative p-6 sm:p-7">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img src="/sandyx.png" alt="Sandyx" className="w-11 h-11 object-contain shrink-0 drop-shadow" draggable={false} />
                        <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] px-2 py-1 rounded-full ${
                          isLightMode ? 'bg-fuchsia-100 text-fuchsia-800' : 'bg-fuchsia-500/15 text-fuchsia-300'
                        }`}>
                          <PlayCircle className="w-3.5 h-3.5" /> Video Explanation
                        </span>
                      </div>
                      <button
                        onClick={closeVideo}
                        aria-label="Close video"
                        className={`shrink-0 flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border transition-colors ${
                          isLightMode ? 'border-slate-300 text-slate-600 hover:bg-slate-100' : 'border-white/15 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <X className="w-3.5 h-3.5" /> Close
                      </button>
                    </div>

                    <h3 className="text-lg sm:text-xl font-black tracking-tight mb-3">{video.title}</h3>

                    {video.ready ? (
                      <VideoPanel id={activeVideoId} isLightMode={isLightMode} />
                    ) : (
                      <div className={`rounded-2xl border border-dashed p-6 text-center ${
                        isLightMode ? 'border-fuchsia-300/60 bg-fuchsia-50/50 text-slate-600' : 'border-fuchsia-400/30 bg-fuchsia-500/5 text-slate-300'
                      }`}>
                        <PlayCircle className={`w-8 h-8 mx-auto mb-2 ${isLightMode ? 'text-fuchsia-500' : 'text-fuchsia-400'}`} />
                        <p className="text-sm font-semibold">Animation rendering soon</p>
                        <p className="text-xs mt-1 opacity-80">The narrated {video.length} explainer for this module is being produced. The plain-language walkthrough below is the same story it tells.</p>
                      </div>
                    )}

                    <p className={`mt-4 text-sm leading-relaxed ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                      {video.plain}
                    </p>
                    <p className={`mt-3 pt-3 border-t text-[11px] font-mono ${isLightMode ? 'border-slate-200 text-slate-500' : 'border-white/10 text-slate-500'}`}>
                      {video.length} · narrated · subtitles included
                    </p>
                  </div>
              </SandyxOverlay>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {/* Fourth portal: the "Sources" window (the model's grounding references). */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {activeSourcesId && sources && (
              <SandyxOverlay
                overlayKey="sandyx-sources-overlay"
                onClose={closeSources}
                isLightMode={isLightMode}
                ariaLabel={`Sources for ${activeSourcesId}`}
                maxWidthClass="max-w-lg"
                scroll
                glowA="bg-amber-400/20"
                glowB="bg-teal-400/20"
              >
                  <div className="relative p-6 sm:p-7">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img src="/sandyx.png" alt="Sandyx" className="w-11 h-11 object-contain shrink-0 drop-shadow" draggable={false} />
                        <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] px-2 py-1 rounded-full ${
                          isLightMode ? 'bg-amber-100 text-amber-800' : 'bg-amber-500/15 text-amber-300'
                        }`}>
                          <BookText className="w-3.5 h-3.5" /> Sources
                        </span>
                      </div>
                      <button
                        onClick={closeSources}
                        aria-label="Close sources"
                        className={`shrink-0 flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border transition-colors ${
                          isLightMode ? 'border-slate-300 text-slate-600 hover:bg-slate-100' : 'border-white/15 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <X className="w-3.5 h-3.5" /> Close
                      </button>
                    </div>

                    <p className={`text-sm leading-relaxed mb-5 ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                      {sources.intro}
                    </p>

                    <ol className="space-y-3">
                      {sources.sources.map((s, i) => (
                        <li
                          key={i}
                          className={`rounded-2xl border p-4 flex gap-3 ${
                            isLightMode ? 'bg-white/70 border-slate-200' : 'bg-slate-950/50 border-white/10'
                          }`}
                        >
                          <FileText className={`w-4 h-4 mt-0.5 shrink-0 ${
                            s.kind === 'internal'
                              ? (isLightMode ? 'text-teal-600' : 'text-teal-400')
                              : s.kind === 'model'
                                ? (isLightMode ? 'text-indigo-600' : 'text-indigo-400')
                                : (isLightMode ? 'text-amber-600' : 'text-amber-400')
                          }`} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[13px] font-bold leading-snug">{s.label}</span>
                              <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                                s.kind === 'internal'
                                  ? (isLightMode ? 'bg-teal-100 text-teal-700' : 'bg-teal-500/15 text-teal-300')
                                  : s.kind === 'model'
                                    ? (isLightMode ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-500/15 text-indigo-300')
                                    : (isLightMode ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/15 text-amber-300')
                              }`}>
                                {s.kind === 'internal' ? 'Team / wet-lab' : s.kind === 'model' ? 'Framework' : 'Literature'}
                              </span>
                            </div>
                            <p className={`mt-1 text-xs leading-relaxed ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                              {s.detail}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>

                    <p className={`mt-4 pt-3 border-t text-[11px] leading-relaxed ${isLightMode ? 'border-slate-200 text-slate-500' : 'border-white/10 text-slate-500'}`}>
                      These are the model&apos;s grounding references, drawn from the team&apos;s Research Table and the calibration provenance in the code. Verify each against the primary source before citing it on your wiki.
                    </p>
                  </div>
              </SandyxOverlay>
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
