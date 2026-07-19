"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Site-wide smooth scroll (Lenis) wired to GSAP ScrollTrigger.
 * =========================================================================
 * Lenis drives the *real* window scroll position (no CSS transform hijack), so
 * Framer `motion`'s useScroll and GSAP ScrollTrigger both keep working, they
 * just move against an eased scroll. We:
 *   - skip entirely under prefers-reduced-motion (accessibility + the CSS
 *     media query already flattens animation),
 *   - feed every Lenis scroll frame into ScrollTrigger.update so pinned /
 *     scrubbed sections stay in sync,
 *   - expose the instance on window.__lenis so the landing's programmatic
 *     scrolls ("dive to cinematic", "scroll to top", sandyx:overview) can glide
 *     through Lenis instead of fighting it.
 */
declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

export default function SmoothScroll() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    // Ignore the mobile URL-bar show/hide resize so pinned sections do not
    // re-measure and jump every time the address bar collapses on scroll.
    ScrollTrigger.config({ ignoreMobileResize: true });

    // Lerp-based smoothing feels lighter and more responsive than a fixed
    // duration (the wheel tracks the finger instead of gliding on after it).
    const lenis = new Lenis({
      lerp: 0.12,
      wheelMultiplier: 1.05,
      touchMultiplier: 1.6,
      smoothWheel: true,
    });
    window.__lenis = lenis;

    lenis.on("scroll", ScrollTrigger.update);

    const onRaf = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(onRaf);
    gsap.ticker.lagSmoothing(0);

    // Pinned triggers measure their ranges at build time. Fonts, images and the
    // tall scroll stories settle a beat later, so refresh once the layout is
    // stable (and on resize) to keep pin start/end from going stale, which is the
    // other half of the fast-scroll "breaks".
    const refresh = () => ScrollTrigger.refresh();
    const raf1 = requestAnimationFrame(() =>
      requestAnimationFrame(() => ScrollTrigger.refresh()),
    );
    window.addEventListener("load", refresh);
    window.addEventListener("resize", refresh);

    return () => {
      cancelAnimationFrame(raf1);
      window.removeEventListener("load", refresh);
      window.removeEventListener("resize", refresh);
      gsap.ticker.remove(onRaf);
      lenis.destroy();
      if (window.__lenis === lenis) delete window.__lenis;
    };
  }, []);

  return null;
}
