"use client";

import { DUNE } from "@/src/lib/palette";

/**
 * Jumping past a pinned story without showing the trip.
 * ==========================================================================
 * The landing carries two scroll-driven stories, which between them add roughly
 * 5800px to the document. A smooth scroll to the model index therefore has to
 * travel through both of them, and every frame of that travel
 * is a real frame of the story: the camera dives, the protein spins, the crust
 * assembles, all at ten times the intended speed. It reads as a fault.
 *
 * The fix is to stop animating the trip. Cover the viewport, move the scroll
 * position in one frame, then uncover. The reader sees a 220ms fade to the page
 * ground and then the destination. The instant move itself is the same
 * mechanism restoreLandingScroll() already uses on a return trip: a forced
 * immediate Lenis scroll, so the
 * pinned timelines are rendered at their new position rather than easing toward
 * it afterwards.
 *
 * Under reduced motion there is no curtain and no pin, so it is a bare jump.
 */

const VEIL_ID = "dunelock-curtain";
const FADE_MS = 220;

/** Set by storyPlayback so a skip can stop an autoplay in flight. */
let onJump: (() => void) | null = null;
export function setCurtainInterrupt(fn: (() => void) | null) {
  onJump = fn;
}

function targetY(target: HTMLElement | number, offset: number): number {
  if (typeof target === "number") return target;
  return target.getBoundingClientRect().top + window.scrollY + offset;
}

function land(target: HTMLElement | number, offset: number) {
  const y = Math.max(0, targetY(target, offset));
  // `force` matters: Lenis can be stopped mid route transition, and without it
  // the call is silently a no-op.
  if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo(0, y);
  // Nothing to nudge afterwards: each story reads its own progress off its own
  // rect on the next frame, so landing somewhere new is already the answer.
}

/** Page ground behind the curtain, matching the nav's own scrolled colours. */
function veilColour(): string {
  const dark = document.documentElement.classList.contains("dark");
  return dark ? DUNE.ink : DUNE.paper;
}

export function curtainJumpTo(
  target: HTMLElement | number,
  offset = -70,
  /** Runs once the curtain is gone and the page has settled. */
  onArrive?: () => void,
) {
  if (typeof window === "undefined") return;
  onJump?.();

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    land(target, offset);
    onArrive?.();
    return;
  }

  // A second call while one is already running would leave an orphaned veil.
  document.getElementById(VEIL_ID)?.remove();

  const veil = document.createElement("div");
  veil.id = VEIL_ID;
  veil.setAttribute("aria-hidden", "true");
  veil.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:300",
    "opacity:0",
    "pointer-events:none",
    `background:${veilColour()}`,
    `transition:opacity ${FADE_MS}ms ease`,
  ].join(";");
  document.body.appendChild(veil);

  requestAnimationFrame(() => {
    veil.style.opacity = "1";
  });

  window.setTimeout(() => {
    land(target, offset);
    // The pin spacers can re-measure on the frame after a jump, which moves the
    // target out from under it. Re-assert twice while still covered.
    requestAnimationFrame(() => {
      land(target, offset);
      requestAnimationFrame(() => {
        land(target, offset);
        veil.style.opacity = "0";
        window.setTimeout(() => {
          veil.remove();
          onArrive?.();
        }, FADE_MS + 60);
      });
    });
  }, FADE_MS + 20);
}
