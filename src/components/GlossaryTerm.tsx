"use client";

import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  PlayCircle,
  BookText,
  FileText,
  Loader2,
  ExternalLink,
  ArrowRight,
  Code2,
  Download,
  Copy,
  Check,
} from "lucide-react";
import {
  lookupTerm,
  glossaryPhrases,
  type GlossaryEntry,
} from "../lib/glossary";
import { MODULE_MATH } from "../lib/moduleMath";
import { MODULE_VIDEOS, videoSrc, videoVtt } from "../lib/moduleVideos";
import { MODULE_SOURCES, type SourceRef } from "../lib/moduleSources";
import { MODULE_CODE } from "../lib/moduleCode";
import type { ModuleId } from "../lib/prongs";
import Katex from "./Katex";
import { TextEffect } from "@/components/motion-primitives/text-effect";

/**
 * Resolve a clickable target for a source. A verified `url` (DOI / dataset) is used directly;
 * otherwise we send the reader to a Google Scholar search of the exact label so the link still
 * lands on the primary work rather than a guessed URL.
 */
function sourceHref(s: SourceRef): string {
  if (s.url) return s.url;
  return `https://scholar.google.com/scholar?q=${encodeURIComponent(s.label)}`;
}

/**
 * Sandyx Glossary system
 * ======================
 * - <GlossaryProvider> holds the active term + Sandyx drag state and renders one glassy,
 * transparent explanation pop-up for the whole page.
 * - <Term k="..."> underlines a difficult word. Tapping it (or dropping Sandyx on it) opens
 * the explanation. Each Term is a drop target: it carries data-sandyx-term so the dragging
 * mascot can find it with document.elementFromPoint.
 * - <GlossaryTerm term="..."> is kept as a backward-compatible alias of <Term>.
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
  /** Module id whose "Code & Plots" window is open, or null. */
  activeCodeId: ModuleId | null;
  openCode: (id: ModuleId) => void;
  closeCode: () => void;
  dragging: boolean;
  setDragging: (b: boolean) => void;
  hoverId: string | null;
  setHoverId: (id: string | null) => void;
  isLightMode: boolean;
}

export const GlossaryContext = React.createContext<GlossaryContextValue | null>(
  null,
);

export function useGlossary(): GlossaryContextValue {
  const ctx = React.useContext(GlossaryContext);
  if (!ctx) {
    // Safe no-op fallback so <Term> still renders (plain) outside a provider.
    return {
      activeId: null,
      open: () => {},
      close: () => {},
      activeMathId: null,
      openMath: () => {},
      closeMath: () => {},
      activeVideoId: null,
      openVideo: () => {},
      closeVideo: () => {},
      activeSourcesId: null,
      openSources: () => {},
      closeSources: () => {},
      activeCodeId: null,
      openCode: () => {},
      closeCode: () => {},
      dragging: false,
      setDragging: () => {},
      hoverId: null,
      setHoverId: () => {},
      isLightMode: false,
    };
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Video player with a Sandyx "Please wait" loader
// ---------------------------------------------------------------------------
/**
 * The <video> used to flash its `poster` (a full-frame Sandyx image) for a single frame before the
 * mp4 started, the "buffer" glitch. Fix: no poster at all. Instead the video renders transparent
 * and a Sandyx "Please wait" panel sits on top of it, only fading away once the browser reports the
 * clip can actually play through. The reserved 16:9 box means nothing jumps as the loader swaps out.
 */
function VideoPanel({
  id,
  isLightMode,
}: {
  id: ModuleId;
  isLightMode: boolean;
}) {
  const [ready, setReady] = React.useState(false);
  // A fresh clip is loading whenever the id changes.
  React.useEffect(() => {
    setReady(false);
  }, [id]);

  return (
    <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-black/10 bg-black ">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        key={id}
        controls
        autoPlay
        playsInline
        preload="auto"
        onCanPlayThrough={() => setReady(true)}
        onPlaying={() => setReady(true)}
        className={`absolute inset-0 w-full h-full block transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"}`}
      >
        <source src={videoSrc(id)} type="video/mp4" />
        <track
          kind="subtitles"
          srcLang="en"
          label="English"
          src={videoVtt(id)}
          default
        />
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
              isLightMode ? "bg-slate-900" : "bg-slate-950"
            }`}
          >
            <motion.img
              src="/sandyx.png"
              alt="Sandyx"
              draggable={false}
              className="w-20 h-20 object-contain drop-shadow-lg"
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <div className="flex items-center gap-2 text-slate-200">
              <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
              <span className="text-sm font-bold">
                Please wait, loading the animation…
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Sandyx is fetching the explainer for you.
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Code panel: fetches the runnable script and offers copy + download
// ---------------------------------------------------------------------------
function CodePanel({
  codeUrl,
  filename,
  isLightMode,
}: {
  codeUrl: string;
  filename: string;
  isLightMode: boolean;
}) {
  const [code, setCode] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setCode(null);
    setFailed(false);
    fetch(codeUrl)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      })
      .then((t) => {
        if (!cancelled) setCode(t);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [codeUrl]);

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked; the download button still works */
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span
          className={`text-[11px] font-mono ${isLightMode ? "text-slate-500" : "text-slate-400"}`}
        >
          {filename}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={copy}
            disabled={!code}
            className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-[3px] border transition-colors disabled:opacity-50 ${
              isLightMode
                ? "border-slate-300 text-slate-600 hover:bg-slate-100"
                : "border-white/15 text-slate-300 hover:bg-white/10"
            }`}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
          <a
            href={codeUrl}
            download={filename}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-[3px] bg-dune-orange text-[#241c19] transition-opacity hover:opacity-90"
          >
            <Download className="w-3.5 h-3.5" /> Download .py
          </a>
        </div>
      </div>
      <div
        className={`rounded-2xl border overflow-hidden ${
          isLightMode ? "border-slate-200 bg-slate-950" : "border-white/10 bg-slate-950"
        }`}
      >
        {code === null && !failed ? (
          <div className="flex items-center gap-2 p-4 text-sm text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading code…
          </div>
        ) : failed ? (
          <div className="p-4 text-sm text-slate-400">
            Could not load the script. Use the Download button to fetch it directly.
          </div>
        ) : (
          <pre className="max-h-[42vh] overflow-auto no-scrollbar p-4 text-[11.5px] leading-relaxed text-slate-100">
            <code>{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared pop-up shell (glossary / math / video / sources / code)
// ---------------------------------------------------------------------------
/**
 * One shell for every Sandyx window so all four open with the *same* seamless transition.
 *
 * The blur layer is the fix for the old "flash of the un-blurred page" glitch: it is promoted to
 * its own compositor layer up front (`translateZ(0)` + `will-change`) and fades its OWN opacity, * it is never nested inside an opacity-animating ancestor, so the `backdrop-filter` is already
 * realised on the first painted frame instead of one frame late.
 */
const DIALOG_SPRING = { type: "spring" as const, stiffness: 320, damping: 26 };

function SandyxOverlay({
  overlayKey,
  onClose,
  isLightMode,
  ariaLabel,
  maxWidthClass,
  scroll = false,
  glowA,
  glowB,
  children,
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
        className={`absolute inset-0 ${isLightMode ? "bg-white/40" : "bg-slate-950/45"}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        style={{
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          transform: "translateZ(0)",
          willChange: "opacity",
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
        className={`relative w-full ${maxWidthClass} ${scroll ? "max-h-[88vh] overflow-y-auto no-scrollbar" : "overflow-hidden"} rounded-3xl border ${
          isLightMode
            ? "bg-white/90 border-white/70 text-slate-900"
            : "bg-slate-900/85 border-white/10 text-slate-100"
        }`}
        style={{
          backdropFilter: "blur(24px) saturate(1.4)",
          WebkitBackdropFilter: "blur(24px) saturate(1.4)",
          transform: "translateZ(0)",
        }}
      >
        <div
          className={`pointer-events-none absolute -top-16 -right-10 w-48 h-48 rounded-full ${glowA} blur-3xl`}
        />
        <div
          className={`pointer-events-none absolute -bottom-16 -left-10 w-48 h-48 rounded-full ${glowB} blur-3xl`}
        />
        {children}
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Provider + glassy pop-up
// ---------------------------------------------------------------------------
export const GlossaryProvider: React.FC<{
  children: React.ReactNode;
  isLightMode?: boolean;
}> = ({ children, isLightMode = false }) => {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [activeMathId, setActiveMathId] = React.useState<ModuleId | null>(null);
  const [activeVideoId, setActiveVideoId] = React.useState<ModuleId | null>(
    null,
  );
  const [activeSourcesId, setActiveSourcesId] = React.useState<ModuleId | null>(
    null,
  );
  const [activeCodeId, setActiveCodeId] = React.useState<ModuleId | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [hoverId, setHoverId] = React.useState<string | null>(null);

  // Only ever one pop-up at a time: opening any window closes all the others.
  const closeAll = React.useCallback(() => {
    setActiveId(null);
    setActiveMathId(null);
    setActiveVideoId(null);
    setActiveSourcesId(null);
    setActiveCodeId(null);
  }, []);
  const open = React.useCallback(
    (id: string) => {
      closeAll();
      setActiveId(id);
    },
    [closeAll],
  );
  const close = React.useCallback(() => setActiveId(null), []);
  const openMath = React.useCallback(
    (id: ModuleId) => {
      closeAll();
      setActiveMathId(id);
    },
    [closeAll],
  );
  const closeMath = React.useCallback(() => setActiveMathId(null), []);
  const openVideo = React.useCallback(
    (id: ModuleId) => {
      closeAll();
      setActiveVideoId(id);
    },
    [closeAll],
  );
  const closeVideo = React.useCallback(() => setActiveVideoId(null), []);
  const openSources = React.useCallback(
    (id: ModuleId) => {
      closeAll();
      setActiveSourcesId(id);
    },
    [closeAll],
  );
  const closeSources = React.useCallback(() => setActiveSourcesId(null), []);
  const openCode = React.useCallback(
    (id: ModuleId) => {
      closeAll();
      setActiveCodeId(id);
    },
    [closeAll],
  );
  const closeCode = React.useCallback(() => setActiveCodeId(null), []);

  // Close any open window on Escape.
  React.useEffect(() => {
    if (
      !activeId &&
      !activeMathId &&
      !activeVideoId &&
      !activeSourcesId &&
      !activeCodeId
    )
      return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId, activeMathId, activeVideoId, activeSourcesId, activeCodeId, closeAll]);

  const entry: GlossaryEntry | null = activeId
    ? GLOSSARY_BY_ID(activeId)
    : null;
  const math = activeMathId ? MODULE_MATH[activeMathId] : null;
  const video = activeVideoId ? MODULE_VIDEOS[activeVideoId] : null;
  const sources = activeSourcesId ? MODULE_SOURCES[activeSourcesId] : null;
  const code = activeCodeId ? MODULE_CODE[activeCodeId] : null;

  return (
    <GlossaryContext.Provider
      value={{
        activeId,
        open,
        close,
        activeMathId,
        openMath,
        closeMath,
        activeVideoId,
        openVideo,
        closeVideo,
        activeSourcesId,
        openSources,
        closeSources,
        activeCodeId,
        openCode,
        closeCode,
        dragging,
        setDragging,
        hoverId,
        setHoverId,
        isLightMode,
      }}
    >
      {children}
      {typeof document !== "undefined" &&
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
                glowB="bg-amber-400/20"
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
                          isLightMode
                            ? "bg-teal-100 text-teal-800"
                            : "bg-teal-500/15 text-teal-300"
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
                          ? "border-slate-300 text-slate-600 hover:bg-slate-100"
                          : "border-white/15 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      <X className="w-3.5 h-3.5" /> Close
                    </button>
                  </div>

                  <TextEffect
                    as="h3"
                    per="char"
                    preset="fade-in-blur"
                    speedReveal={2.4}
                    className="text-lg sm:text-xl font-black tracking-tight mb-2.5"
                  >
                    {entry.title}
                  </TextEffect>
                  <TextEffect
                    as="p"
                    per="word"
                    preset="fade-in-blur"
                    speedReveal={2.2}
                    delay={0.12}
                    className={`text-sm leading-relaxed ${
                      isLightMode ? "text-slate-700" : "text-slate-300"
                    }`}
                  >
                    {entry.plain}
                  </TextEffect>

                  {entry.derivation && (
                    <div
                      className={`mt-4 pt-3 border-t ${isLightMode ? "border-slate-200" : "border-white/10"}`}
                    >
                      <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-dune-orange mb-1.5">
                        How we got it
                      </h4>
                      <p
                        className={`text-[13px] leading-relaxed ${isLightMode ? "text-slate-700" : "text-slate-300"}`}
                      >
                        {entry.derivation}
                      </p>
                    </div>
                  )}

                  {(() => {
                    if (!entry.jumpTo?.length || typeof document === "undefined")
                      return null;
                    const targetId = entry.jumpTo.find((mid) =>
                      document.getElementById(`mod-${mid}`),
                    );
                    if (!targetId) return null;
                    return (
                      <button
                        onClick={() => {
                          const el = document.getElementById(`mod-${targetId}`);
                          close();
                          requestAnimationFrame(() =>
                            el?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            }),
                          );
                        }}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-[3px] bg-dune-orange text-[#241c19] text-[12px] font-bold uppercase tracking-[0.1em] transition-opacity hover:opacity-90"
                      >
                        {entry.jumpLabel ?? "Go to the module"}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    );
                  })()}

                  {entry.module && !entry.derivation && (
                    <p
                      className={`mt-4 pt-3 border-t text-[11px] font-mono ${
                        isLightMode
                          ? "border-slate-200 text-slate-500"
                          : "border-white/10 text-slate-500"
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
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {activeMathId && math && (
              <SandyxOverlay
                overlayKey="sandyx-math-overlay"
                onClose={closeMath}
                isLightMode={isLightMode}
                ariaLabel={`${math.title}, mathematics`}
                maxWidthClass="max-w-lg"
                scroll
                glowA="bg-amber-400/20"
                glowB="bg-teal-400/20"
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
                          isLightMode
                            ? "bg-amber-100 text-amber-800"
                            : "bg-amber-500/15 text-amber-300"
                        }`}
                      >
                        The Math
                      </span>
                    </div>
                    <button
                      onClick={closeMath}
                      aria-label="Close mathematics"
                      className={`shrink-0 flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border transition-colors ${
                        isLightMode
                          ? "border-slate-300 text-slate-600 hover:bg-slate-100"
                          : "border-white/15 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      <X className="w-3.5 h-3.5" /> Close
                    </button>
                  </div>

                  <h3 className="text-lg sm:text-xl font-black tracking-tight mb-2">
                    {math.title}
                  </h3>
                  <TextEffect
                    as="p"
                    per="word"
                    preset="fade-in-blur"
                    speedReveal={2.2}
                    className={`text-sm leading-relaxed mb-5 ${isLightMode ? "text-slate-700" : "text-slate-300"}`}
                  >
                    {math.intro}
                  </TextEffect>

                  <div className="space-y-4">
                    {math.blocks.map((b, i) => (
                      <div
                        key={i}
                        className={`rounded-2xl border p-4 ${
                          isLightMode
                            ? "bg-white/70 border-slate-200"
                            : "bg-slate-950/50 border-white/10"
                        }`}
                      >
                        <div className="overflow-x-auto no-scrollbar text-[15px]">
                          <Katex tex={b.tex} />
                        </div>
                        <p
                          className={`mt-2.5 text-xs leading-relaxed ${isLightMode ? "text-slate-600" : "text-slate-400"}`}
                        >
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
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {activeVideoId && video && (
              <SandyxOverlay
                overlayKey="sandyx-video-overlay"
                onClose={closeVideo}
                isLightMode={isLightMode}
                ariaLabel={`${video.title}, video explanation`}
                maxWidthClass="max-w-2xl"
                scroll
                glowA="bg-rose-400/20"
                glowB="bg-amber-400/20"
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
                        className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] px-2 py-1 rounded-full ${
                          isLightMode
                            ? "bg-rose-100 text-rose-800"
                            : "bg-rose-500/15 text-rose-300"
                        }`}
                      >
                        <PlayCircle className="w-3.5 h-3.5" /> Video Explanation
                      </span>
                    </div>
                    <button
                      onClick={closeVideo}
                      aria-label="Close video"
                      className={`shrink-0 flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border transition-colors ${
                        isLightMode
                          ? "border-slate-300 text-slate-600 hover:bg-slate-100"
                          : "border-white/15 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      <X className="w-3.5 h-3.5" /> Close
                    </button>
                  </div>

                  <h3 className="text-lg sm:text-xl font-black tracking-tight mb-3">
                    {video.title}
                  </h3>

                  {video.ready ? (
                    <VideoPanel id={activeVideoId} isLightMode={isLightMode} />
                  ) : (
                    <div
                      className={`rounded-2xl border border-dashed p-6 text-center ${
                        isLightMode
                          ? "border-rose-300/60 bg-rose-50/50 text-slate-600"
                          : "border-rose-400/30 bg-rose-500/5 text-slate-300"
                      }`}
                    >
                      <PlayCircle
                        className={`w-8 h-8 mx-auto mb-2 ${isLightMode ? "text-rose-500" : "text-rose-400"}`}
                      />
                      <p className="text-sm font-semibold">
                        Animation rendering soon
                      </p>
                      <p className="text-xs mt-1 opacity-80">
                        The narrated {video.length} explainer for this module is
                        being produced. The plain-language walkthrough below is
                        the same story it tells.
                      </p>
                    </div>
                  )}

                  <TextEffect
                    as="p"
                    per="word"
                    preset="fade-in-blur"
                    speedReveal={2.4}
                    className={`mt-4 text-sm leading-relaxed ${isLightMode ? "text-slate-700" : "text-slate-300"}`}
                  >
                    {video.plain}
                  </TextEffect>
                  <p
                    className={`mt-3 pt-3 border-t text-[11px] font-mono ${isLightMode ? "border-slate-200 text-slate-500" : "border-white/10 text-slate-500"}`}
                  >
                    {video.length} · narrated · subtitles included
                  </p>
                </div>
              </SandyxOverlay>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {/* Fourth portal: the "Sources" window (the model's grounding references). */}
      {typeof document !== "undefined" &&
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
                      <img
                        src="/sandyx.png"
                        alt="Sandyx"
                        className="w-11 h-11 object-contain shrink-0 drop-shadow"
                        draggable={false}
                      />
                      <span
                        className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] px-2 py-1 rounded-full ${
                          isLightMode
                            ? "bg-amber-100 text-amber-800"
                            : "bg-amber-500/15 text-amber-300"
                        }`}
                      >
                        <BookText className="w-3.5 h-3.5" /> Sources
                      </span>
                    </div>
                    <button
                      onClick={closeSources}
                      aria-label="Close sources"
                      className={`shrink-0 flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border transition-colors ${
                        isLightMode
                          ? "border-slate-300 text-slate-600 hover:bg-slate-100"
                          : "border-white/15 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      <X className="w-3.5 h-3.5" /> Close
                    </button>
                  </div>

                  <TextEffect
                    as="p"
                    per="word"
                    preset="fade-in-blur"
                    speedReveal={2.2}
                    className={`text-sm leading-relaxed mb-5 ${isLightMode ? "text-slate-700" : "text-slate-300"}`}
                  >
                    {sources.intro}
                  </TextEffect>

                  <ol className="space-y-3">
                    {sources.sources.map((s, i) => (
                      <li
                        key={i}
                        className={`rounded-2xl border p-4 flex gap-3 ${
                          isLightMode
                            ? "bg-white/70 border-slate-200"
                            : "bg-slate-950/50 border-white/10"
                        }`}
                      >
                        <FileText
                          className={`w-4 h-4 mt-0.5 shrink-0 ${
                            s.kind === "internal"
                              ? isLightMode
                                ? "text-teal-600"
                                : "text-teal-400"
                              : s.kind === "model"
                                ? isLightMode
                                  ? "text-amber-600"
                                  : "text-amber-400"
                                : isLightMode
                                  ? "text-amber-600"
                                  : "text-amber-400"
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <a
                              href={sourceHref(s)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`group/src inline-flex items-baseline gap-1 text-[13px] font-bold leading-snug underline decoration-dotted underline-offset-2 transition-colors ${
                                isLightMode
                                  ? "text-amber-700 hover:text-amber-900 decoration-amber-400"
                                  : "text-amber-300 hover:text-amber-100 decoration-amber-400/60"
                              }`}
                            >
                              <span>{s.label}</span>
                              <ExternalLink className="w-3 h-3 shrink-0 self-center opacity-60 group-hover/src:opacity-100" />
                            </a>
                            <span
                              className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                                s.kind === "internal"
                                  ? isLightMode
                                    ? "bg-teal-100 text-teal-700"
                                    : "bg-teal-500/15 text-teal-300"
                                  : s.kind === "model"
                                    ? isLightMode
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-amber-500/15 text-amber-300"
                                    : isLightMode
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-amber-500/15 text-amber-300"
                              }`}
                            >
                              {s.kind === "internal"
                                ? "Team / wet-lab"
                                : s.kind === "model"
                                  ? "Framework"
                                  : "Literature"}
                            </span>
                          </div>
                          <p
                            className={`mt-1 text-xs leading-relaxed ${isLightMode ? "text-slate-600" : "text-slate-400"}`}
                          >
                            {s.detail}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>

                  <p
                    className={`mt-4 pt-3 border-t text-[11px] leading-relaxed ${isLightMode ? "border-slate-200 text-slate-500" : "border-white/10 text-slate-500"}`}
                  >
                    These are the model&apos;s grounding references, drawn from
                    the calibration provenance in the code. Each title links out
                    to the source, verify it against the primary work before
                    citing it on your wiki.
                  </p>
                </div>
              </SandyxOverlay>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {/* Fifth portal: the "Code & Plots" window (downloadable Python + matplotlib previews). */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {activeCodeId && code && (
              <SandyxOverlay
                overlayKey="sandyx-code-overlay"
                onClose={closeCode}
                isLightMode={isLightMode}
                ariaLabel={`${code.title}, code and preliminary plots`}
                maxWidthClass="max-w-3xl"
                scroll
                glowA="bg-teal-400/20"
                glowB="bg-amber-400/20"
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
                        className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] px-2 py-1 rounded-full ${
                          isLightMode
                            ? "bg-teal-100 text-teal-800"
                            : "bg-teal-500/15 text-teal-300"
                        }`}
                      >
                        <Code2 className="w-3.5 h-3.5" /> Code &amp; Plots
                      </span>
                    </div>
                    <button
                      onClick={closeCode}
                      aria-label="Close code"
                      className={`shrink-0 flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border transition-colors ${
                        isLightMode
                          ? "border-slate-300 text-slate-600 hover:bg-slate-100"
                          : "border-white/15 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      <X className="w-3.5 h-3.5" /> Close
                    </button>
                  </div>

                  <h3 className="text-lg sm:text-xl font-black tracking-tight mb-1.5">
                    {code.title}
                  </h3>
                  <TextEffect
                    as="p"
                    per="word"
                    preset="fade-in-blur"
                    speedReveal={2.2}
                    className={`text-sm leading-relaxed mb-4 ${isLightMode ? "text-slate-700" : "text-slate-300"}`}
                  >
                    {code.intro}
                  </TextEffect>
                  <p
                    className={`mb-4 text-[11px] font-mono ${isLightMode ? "text-slate-500" : "text-slate-500"}`}
                  >
                    {code.language}
                  </p>

                  <CodePanel
                    codeUrl={code.codeUrl}
                    filename={code.filename}
                    isLightMode={isLightMode}
                  />

                  <h4 className="mt-6 mb-3 text-[10px] font-black uppercase tracking-[0.15em] text-dune-orange">
                    Preliminary output
                  </h4>
                  <div className="space-y-4">
                    {code.plots.map((pl, i) => (
                      <figure
                        key={i}
                        className={`rounded-2xl border overflow-hidden ${
                          isLightMode
                            ? "bg-white/70 border-slate-200"
                            : "bg-slate-950/50 border-white/10"
                        }`}
                      >
                        <img
                          src={pl.src}
                          alt={pl.caption}
                          loading="lazy"
                          className="w-full h-auto block"
                        />
                        <figcaption
                          className={`px-4 py-2.5 text-xs leading-relaxed border-t ${
                            isLightMode
                              ? "border-slate-200 text-slate-600"
                              : "border-white/10 text-slate-400"
                          }`}
                        >
                          {pl.caption}
                        </figcaption>
                      </figure>
                    ))}
                  </div>

                  <p
                    className={`mt-4 pt-3 border-t text-[11px] leading-relaxed ${isLightMode ? "border-slate-200 text-slate-500" : "border-white/10 text-slate-500"}`}
                  >
                    This script ports the module&apos;s physics from the toolkit
                    source; running it reproduces the plots above. Every constant
                    traces to the model code or a cited source. Verify against the
                    primary work before citing it on your wiki.
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
// <Term>, underlined, tappable, Sandyx drop target
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
  const key = (k || term || "").toString();
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
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open(id);
        }
      }}
      title={`${resolved.entry.title}, tap or drop Sandyx for an explanation`}
      className={`sandyx-term cursor-help underline decoration-dotted decoration-2 underline-offset-2 font-semibold transition-colors duration-150 rounded px-0.5 -mx-0.5 py-1 -my-1 ${
        isLightMode
          ? "decoration-teal-500/70 text-slate-900 hover:text-teal-700"
          : "decoration-teal-300/70 text-slate-100 hover:text-teal-300"
      } ${isHovered ? (isLightMode ? "bg-teal-200/70 text-teal-900" : "bg-teal-400/25 text-teal-100") : ""} ${
        className || ""
      }`}
    >
      {children || resolved.entry.title}
    </span>
  );
};

// ---------------------------------------------------------------------------
// <GlossaryText>, auto-underline every known glossary term in a block of prose
// ---------------------------------------------------------------------------
// Build the matcher once. Longest phrases first so multi-word terms win over substrings.
const PHRASES = glossaryPhrases();
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
let MATCHER: RegExp | null = null;
function matcher(): RegExp {
  if (!MATCHER) {
    // Unicode-aware boundaries: not preceded/followed by a letter or digit (handles γ, ², etc.).
    const body = PHRASES.map((p) => esc(p.phrase)).join("|");
    MATCHER = new RegExp(
      `(?<![\\p{L}\\p{N}])(${body})(?![\\p{L}\\p{N}])`,
      "giu",
    );
  }
  return MATCHER;
}

/**
 * Renders a string, auto-wrapping known glossary terms in <Term> so dense scientific prose gets
 * the drop-Sandyx underlines without hand-annotating every sentence. Each distinct term is linked
 * at most once per block, up to `max`, so the text stays readable.
 */
export const GlossaryText: React.FC<{
  children: string;
  max?: number;
  className?: string;
}> = ({ children, max = 5, className }) => {
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
    nodes.push(
      <Term key={`${found.id}-${m.index}`} k={found.id}>
        {m[1]}
      </Term>,
    );
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
  theme?: "light" | "dark";
  id?: string;
}> = ({ term, children }) => <Term term={term}>{children}</Term>;

export default GlossaryTerm;
