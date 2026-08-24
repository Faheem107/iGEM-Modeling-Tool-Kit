"use client";

/**
 * Landing scroll restoration and programmatic navigation.
 * ==========================================================================
 * This file used to be built around one fact: the landing pinned its two
 * stories with GSAP, `pinSpacing` added several thousand pixels of spacer, and
 * those spacers did not exist until ScrollTrigger had built and refreshed them.
 * Any scroll before that refresh clamped against a document still far too short
 * and landed in the wrong place, so everything here compensated for it.
 *
 * The stories are sticky now. A sticky stage inside a tall section means the
 * section has its real height from the first layout, so the document is never
 * the wrong length and there is nothing to wait for. What survives is the part
 * that was never about pinning: remembering that a reader came back from a
 * module and belongs at the model index rather than the top of the story.
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
 * Smoothly scroll to a target below the stories.
 *
 * This used to run a rAF loop alongside the trip, snapping every scrub tween to
 * completion so the pinned timelines did not lag a beat behind the moving
 * scroll position and read as "the story rewinds, THEN the page moves". Each
 * story reads its own progress off its own rect every frame now, so a moving
 * scroll position is simply where the story is. Nothing to keep in sync.
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

  lenis.scrollTo(target, { offset, duration: 0.9 });
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

  // Re-assert the position over a window rather than jumping once. The pin
  // spacers are gone, so the document is the right length immediately, but Next
  // still scrolls to the top of the new route after this effect runs (ModelView
  // passes scroll: false, this is the belt to that brace) and the stories set
  // their section heights on mount. The loop stops as soon as the target has
  // held still for a few frames.
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
    }
    if (stable < 5 && performance.now() < deadline) {
      raf = requestAnimationFrame(attempt);
    } else {
      // Landed (or gave up). Only now is it safe to clear the flag.
      settleRestore();
    }
  };

  raf = requestAnimationFrame(attempt);

  return () => {
    cancelAnimationFrame(raf);
  };
}

/**
 * How far a scroll story travels, in pixels, on top of its one viewport of
 * stage. A first visit gets the full travel; a repeat visit in the same session
 * gets a recap, because a reader who has already seen it should not have to
 * scroll it again to reach the models.
 *
 * A number now, not a GSAP `+=` string: it is the section's height minus a
 * viewport, applied as a style, rather than the end of a pinned range.
 */
export function storyTravel(full: number, recap: number): number {
  try {
    const key = "dunelock:story-seen";
    const seen = sessionStorage.getItem(key) === "1";
    sessionStorage.setItem(key, "1");
    return seen ? recap : full;
  } catch {
    return full;
  }
}
