"use client";

import { useEffect, useRef, useState } from "react";
import { MODELS_ANCHOR } from "@/src/lib/scrollRestore";
import { curtainJumpTo } from "@/src/lib/curtainJump";
import { NAV } from "@/content/copy";
import {
  AUTOPLAY_EVENT,
  cancelAutoplay,
  isPlaying,
} from "@/src/lib/storyPlayback";

/**
 * The way out of a pinned story.
 * ==========================================================================
 * The landing pins two scroll-scrubbed sections. Without an escape, a reader
 * who is not here for the story has to scroll all of it with no idea how much
 * is left. This gives them three things:
 *
 *   - a Skip control that jumps straight to the model index,
 *   - Escape bound to the same action while the story is actually on screen,
 *   - a 1px progress rule, so the remaining length is visible rather than
 *     guessed at.
 *
 * The skip goes through curtainJumpTo rather than a smooth scroll. Scrolling
 * smoothly out of a pinned scrub means playing the whole story at speed on the
 * way past, which reads as a fault rather than as navigation.
 *
 * The rule is driven from a ref inside one rAF loop and written straight to
 * the DOM, because the stories deliberately avoid re-rendering React on scroll
 * and a progress bar is not a good enough reason to start.
 *
 * Renders nothing under reduced motion, where neither story pins.
 */
export function skipToModels() {
  const el = document.getElementById(MODELS_ANCHOR);
  if (el) curtainJumpTo(el, -70);
}

export default function StoryEscape({
  progressRef,
  label = NAV.skipStory,
}: {
  /** Live 0..1 progress through this story. Read every frame, never rendered. */
  progressRef: React.RefObject<number>;
  label?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Autoplay is owned by a plain module, not React, so it reports its state
  // back on an event rather than through a provider nobody else needs.
  useEffect(() => {
    setPlaying(isPlaying());
    const on = (e: Event) =>
      setPlaying(Boolean((e as CustomEvent).detail?.playing));
    window.addEventListener(AUTOPLAY_EVENT, on);
    return () => window.removeEventListener(AUTOPLAY_EVENT, on);
  }, []);

  // Drive the rule straight to the DOM.
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let last = -1;
    const tick = () => {
      const p = Math.max(0, Math.min(1, progressRef.current ?? 0));
      if (barRef.current && Math.abs(p - last) > 0.001) {
        barRef.current.style.transform = `scaleX(${p})`;
        last = p;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progressRef, reduced]);

  // Escape only while this story is the thing on screen, so it does not steal
  // the key from a modal or the search palette further down the page.
  useEffect(() => {
    if (reduced) return;
    const el = hostRef.current;
    if (!el) return;
    let onScreen = false;
    const io = new IntersectionObserver(
      ([e]) => {
        onScreen = e.isIntersecting;
      },
      { threshold: 0.1 },
    );
    io.observe(el);

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !onScreen) return;
      if (document.querySelector("[data-modal-open='true']")) return;
      e.preventDefault();
      skipToModels();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      io.disconnect();
      window.removeEventListener("keydown", onKey);
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <div
      ref={hostRef}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[45] px-6 pb-6 sm:px-6"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-6">
        {playing && (
          <span className="caption shrink-0 text-dune-orange">
            Playing. Scroll to take over.
          </span>
        )}
        <div className="h-px flex-1 bg-current/20">
          <div
            ref={barRef}
            className="h-px origin-left bg-dune-orange"
            style={{ transform: "scaleX(0)" }}
          />
        </div>
        {playing ? (
          <button
            type="button"
            onClick={cancelAutoplay}
            className="caption pointer-events-auto shrink-0 transition-colors hover:text-foreground"
          >
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={skipToModels}
            className="caption pointer-events-auto shrink-0 transition-colors hover:text-foreground"
          >
            {label}
            <span className="ml-2 opacity-50">esc</span>
          </button>
        )}
      </div>
    </div>
  );
}
