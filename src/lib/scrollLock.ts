"use client";

import { useEffect } from "react";

/**
 * Holding the page still while something is open on top of it.
 * ==========================================================================
 * Lenis drives the window scroll from its own wheel handler, and that handler
 * is global. A dialog with `overflow-y-auto` therefore never receives the
 * wheel: Lenis takes it and scrolls the page behind the dialog instead, which
 * is why every module window (Show the Math, Video Explanation, Sources, Code
 * and Plots) looked like only the background moved.
 *
 * The fix has two halves and needs both:
 *
 *   1. `data-lenis-prevent` on the element that is meant to scroll. Lenis walks
 *      up from the wheel target, sees the attribute and leaves the event alone,
 *      so the browser scrolls that element natively. Pair it with
 *      `overscroll-contain` so hitting the end does not chain back to the page.
 *   2. This lock, so the page does not move when the pointer is over the
 *      backdrop rather than the panel. A dialog whose page creeps behind it is
 *      the same defect in a quieter form.
 *
 * Locks nest. Opening the glossary pop-up over an already-open module window
 * must not release the page when only the pop-up closes, so a depth count
 * decides when the page is handed back.
 *
 * Under reduced motion Lenis never starts, in which case the page is held with
 * `overflow: hidden` instead.
 */

let depth = 0;
let restoreOverflow: string | null = null;

export function lockPageScroll() {
  depth += 1;
  if (depth > 1) return;
  const lenis = window.__lenis;
  if (lenis) {
    lenis.stop();
  } else {
    restoreOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
}

export function unlockPageScroll() {
  depth = Math.max(0, depth - 1);
  if (depth > 0) return;
  const lenis = window.__lenis;
  if (lenis) {
    lenis.start();
  } else if (restoreOverflow !== null) {
    document.body.style.overflow = restoreOverflow;
    restoreOverflow = null;
  }
}

/** Hold the page still for as long as `active` is true. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lockPageScroll();
    return unlockPageScroll;
  }, [active]);
}
