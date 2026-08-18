"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Landing scroll restoration and programmatic navigation.
 * ==========================================================================
 * The landing pins two scroll-scrubbed stories with `pinSpacing`, which adds
 * several thousand pixels of spacer to the document. Those spacers do not
 * exist until ScrollTrigger has built and refreshed them, so any scroll
 * performed before that refresh clamps against a document that is still far
 * too short and lands in the wrong place. Everything here is built around
 * that one fact.
 */

const RETURN_KEY = "dunelock:landing-return";

/** Where a return from a module should land. */
export const MODELS_ANCHOR = "models";

/**
 * Called by a module's back button, immediately before routing to "/".
 * A session flag rather than a "/#models" URL: a hash would stay in the
 * address bar, so a later reload would silently skip the story for good.
 */
export function markReturnToModels() {
  decision = true;
  try {
    sessionStorage.setItem(RETURN_KEY, MODELS_ANCHOR);
  } catch {
    /* private mode, fall through to a normal top-of-page load */
  }
}

/**
 * Whether this landing mount is a return trip.
 *
 * The answer is cached at module scope rather than read-and-cleared, because
 * React StrictMode invokes effects twice in development: a read-and-clear
 * would hand `true` to the first invocation, then `false` to the second, whose
 * cleanup has already cancelled the first one's work. The page would scroll to
 * the top and the whole mechanism would look broken in dev only. The flag is
 * cleared by `settleRestore()` once the scroll has actually landed.
 */
let decision: boolean | null = null;

function shouldRestore(): boolean {
  if (decision !== null) return decision;
  try {
    decision = sessionStorage.getItem(RETURN_KEY) === MODELS_ANCHOR;
  } catch {
    decision = false;
  }
  return decision;
}

function settleRestore() {
  decision = false;
  try {
    sessionStorage.removeItem(RETURN_KEY);
  } catch {
    /* nothing to clean up */
  }
}

/**
 * Scrub triggers carry a lag (`scrub: 0.6`) so manual scrolling feels eased.
 * During a programmatic jump that lag makes each pinned timeline ease toward
 * the moving scroll position a beat behind it, which reads as "the story
 * rewinds, THEN the page moves". Snapping every scrub tween to completion
 * removes the lag for the duration of the trip only.
 */
export function settleScrubs() {
  ScrollTrigger.getAll().forEach((st) => {
    const tw = (
      st as unknown as { getTween?: () => gsap.core.Tween | undefined }
    ).getTween?.();
    if (tw) tw.progress(1);
  });
}

/**
 * Smoothly scroll to a target that sits below one or more pinned sections,
 * keeping the pinned timelines in sync the whole way (see settleScrubs).
 */
export function smoothNavTo(target: number | HTMLElement, offset = 0) {
  const lenis = typeof window !== "undefined" ? window.__lenis : undefined;

  if (!lenis) {
    // Reduced motion: SmoothScroll never starts, so there is no Lenis instance.
    if (typeof target === "number")
      window.scrollTo({ top: target, behavior: "auto" });
    else target.scrollIntoView({ behavior: "auto", block: "start" });
    return;
  }

  let active = true;
  const sync = () => {
    if (!active) return;
    settleScrubs();
    requestAnimationFrame(sync);
  };
  requestAnimationFrame(sync);

  lenis.scrollTo(target, {
    offset,
    duration: 0.9,
    onComplete: () => {
      active = false;
      // ScrollTrigger only re-renders on movement, so nudge it once on arrival.
      ScrollTrigger.update();
      settleScrubs();
    },
  });
}

/** Jump straight to the model index with no animation. */
function jumpToModels(offset = -70) {
  const el = document.getElementById(MODELS_ANCHOR);
  if (!el) return false;
  const y = el.getBoundingClientRect().top + window.scrollY + offset;
  // `force` matters: Lenis can be stopped mid route transition, and without it
  // the call is silently a no-op.
  if (window.__lenis)
    window.__lenis.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo(0, y);
  ScrollTrigger.update();
  settleScrubs();
  return true;
}

/**
 * Run once per landing mount, in place of an unconditional scrollTo(0, 0).
 *
 * A genuine first load or a reload still starts at the top of the story. A
 * return from a module lands on the model index instead, once the pinned
 * spacers exist, so nobody has to re-scroll the whole cinematic to get back to
 * where they were. Returns a cleanup.
 */
export function restoreLandingScroll(): () => void {
  if (typeof window === "undefined") return () => {};

  if (!shouldRestore()) {
    window.scrollTo(0, 0);
    return () => {};
  }

  // Re-assert the position over a window rather than jumping once. Three
  // separate things move the page out from under a single jump:
  //   - Next scrolls to the top of the new route after this effect runs
  //     (ModelView passes scroll: false, this is the belt to that brace),
  //   - the pinned ScrollTriggers do not add their pin spacers until they
  //     build and refresh, so an early jump clamps to a much shorter document,
  //   - the cinematic mounts a dynamic Mol* viewer that changes height again.
  // The loop stops as soon as the target has held still for a few frames.
  let raf = 0;
  let stable = 0;
  const deadline = performance.now() + 3000;

  const attempt = () => {
    const el = document.getElementById(MODELS_ANCHOR);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 70;
      if (Math.abs(window.scrollY - y) > 2) {
        if (window.__lenis)
          window.__lenis.scrollTo(y, { immediate: true, force: true });
        else window.scrollTo(0, y);
        stable = 0;
      } else {
        stable++;
      }
      ScrollTrigger.update();
      settleScrubs();
    }
    if (stable < 5 && performance.now() < deadline) {
      raf = requestAnimationFrame(attempt);
    } else {
      // Landed (or gave up). Only now is it safe to clear the flag.
      settleRestore();
    }
  };

  // A refresh means the pins just re-measured and the target has moved, so
  // start counting for stability again.
  const onRefresh = () => {
    stable = 0;
  };
  ScrollTrigger.addEventListener("refresh", onRefresh);
  raf = requestAnimationFrame(attempt);

  return () => {
    cancelAnimationFrame(raf);
    ScrollTrigger.removeEventListener("refresh", onRefresh);
  };
}

/**
 * Pin length for a scroll story. A first visit gets the full travel; a repeat
 * visit in the same session gets a recap, because a reader who has already
 * seen it should not have to scroll it again to reach the models.
 */
export function storyPinLength(full: number, recap: number): string {
  try {
    const key = "dunelock:story-seen";
    const seen = sessionStorage.getItem(key) === "1";
    sessionStorage.setItem(key, "1");
    return `+=${seen ? recap : full}`;
  } catch {
    return `+=${full}`;
  }
}
