"use client";

import { useEffect, useRef, useState } from "react";
import { smoothNavTo, MODELS_ANCHOR } from "@/src/lib/scrollRestore";

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
 * The rule is driven from a ref inside one rAF loop and written straight to
 * the DOM, because the stories deliberately avoid re-rendering React on scroll
 * and a progress bar is not a good enough reason to start.
 *
 * Renders nothing under reduced motion, where neither story pins.
 */
export function skipToModels() {
  const el = document.getElementById(MODELS_ANCHOR);
  if (el) smoothNavTo(el, -70);
}

export default function StoryEscape({
  progressRef,
  label = "Skip the story",
}: {
  /** Live 0..1 progress through this story. Read every frame, never rendered. */
  progressRef: React.RefObject<number>;
  label?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
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
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[45] px-5 pb-6 sm:px-8"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-5">
        <div className="h-px flex-1 bg-current/20">
          <div
            ref={barRef}
            className="h-px origin-left bg-dune-orange"
            style={{ transform: "scaleX(0)" }}
          />
        </div>
        <button
          type="button"
          onClick={skipToModels}
          className="caption pointer-events-auto shrink-0 transition-colors hover:text-foreground"
        >
          {label}
          <span className="ml-2 opacity-50">esc</span>
        </button>
      </div>
    </div>
  );
}
