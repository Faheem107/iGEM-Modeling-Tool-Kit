"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { curtainJumpTo, setCurtainInterrupt } from "./curtainJump";

/**
 * Playing the dune story without the reader having to drive it.
 * ==========================================================================
 * The cinematic is scroll-scrubbed, so "play it" means "move the scroll
 * position for them". A GSAP timeline tweens a proxy number and writes it to
 * Lenis every frame with `immediate`, which is the same path a programmatic
 * jump takes, so the pinned ScrollTrigger sees ordinary scrolling and every
 * beat renders exactly as it would by hand.
 *
 * It rests on each beat instead of gliding through at a constant rate. The beat
 * boundaries live in LandingCinematic's renderFrame (p < 0.22 / 0.40 / 0.58 /
 * 0.78), so the rest points below are the centres of those five bands.
 *
 * Any real input from the reader cancels it. Programmatic scrolling raises no
 * wheel, touch or key event, so there is nothing to distinguish and no way for
 * the playback to cancel itself.
 */

export const STORY_TRIGGER_ID = "cinematic-story";
export const AUTOPLAY_EVENT = "dunelock:story-autoplay";

/** Beat centres, then the end of the story. */
const RESTS = [0.16, 0.34, 0.5, 0.7, 1];
const MOVE = 2.0; // seconds easing into a beat
const HOLD = 1.7; // seconds resting on it

let tl: gsap.core.Timeline | null = null;
let detach: (() => void) | null = null;

function announce(playing: boolean) {
  window.dispatchEvent(
    new CustomEvent(AUTOPLAY_EVENT, { detail: { playing } }),
  );
}

export function isPlaying(): boolean {
  return Boolean(tl);
}

export function cancelAutoplay() {
  if (!tl) return;
  tl.kill();
  tl = null;
  detach?.();
  detach = null;
  announce(false);
}

// A skip should not leave a timeline still driving the scroll position.
setCurtainInterrupt(cancelAutoplay);

export function playCinematic() {
  if (typeof window === "undefined") return;
  if (tl) {
    cancelAutoplay();
    return;
  }

  const st = ScrollTrigger.getById(STORY_TRIGGER_ID);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // No pin under reduced motion or on a narrow screen: the story is already a
  // static list, so the honest equivalent of playing it is showing the end.
  if (!st || reduced) {
    const models = document.getElementById("models");
    if (models) curtainJumpTo(models, -70);
    return;
  }

  const span = st.end - st.start;
  const proxy = { y: window.scrollY };

  const write = () => {
    if (window.__lenis)
      window.__lenis.scrollTo(proxy.y, { immediate: true, force: true });
    else window.scrollTo(0, proxy.y);
    ScrollTrigger.update();
  };

  const t = gsap.timeline({
    onComplete: () => {
      tl = null;
      detach?.();
      detach = null;
      announce(false);
    },
  });

  // Start from wherever the reader already is, and only play forward.
  const from = window.scrollY;
  for (const p of RESTS) {
    const y = st.start + p * span;
    if (y <= from + 8) continue;
    t.to(proxy, {
      y,
      duration: MOVE,
      ease: "power1.inOut",
      onUpdate: write,
    });
    if (p < 1) t.to({}, { duration: HOLD });
  }

  if (t.duration() === 0) {
    t.kill();
    return;
  }

  const stop = () => cancelAutoplay();
  const opts = { passive: true } as AddEventListenerOptions;
  window.addEventListener("wheel", stop, opts);
  window.addEventListener("touchstart", stop, opts);
  window.addEventListener("keydown", stop);
  window.addEventListener("mousedown", stop);
  detach = () => {
    window.removeEventListener("wheel", stop, opts);
    window.removeEventListener("touchstart", stop, opts);
    window.removeEventListener("keydown", stop);
    window.removeEventListener("mousedown", stop);
  };

  tl = t;
  announce(true);
}
