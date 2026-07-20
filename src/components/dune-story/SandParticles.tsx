"use client";

import { useEffect, useRef, type MutableRefObject } from "react";

/**
 * SandParticles: an ambient, interactive field of drifting sand grains on a
 * Canvas 2D layer.
 * =========================================================================
 * Grains blow slowly across the stage on their own rAF loop (never a React
 * re-render). The field is interactive: the cursor pushes grains aside in a soft
 * bulge, and scrolling briefly speeds the drift, then it settles. Two grain
 * tones (sand + rose) keep it warm.
 *
 * Two modes, chosen by `fadeWithDive`:
 *   - Cinematic (fadeWithDive = true): the field thins as the camera dives under
 *     the sand and returns as a calm haze on the crust, tracking scroll progress.
 *   - Ambient (fadeWithDive = false, the default): a steady drift, used where the
 *     scroll progress does not describe a dive (e.g. the design-cycle story), so
 *     grains never blink out mid-section.
 *
 * The loop pauses whenever the canvas is off-screen (IntersectionObserver) and
 * whenever the field is invisible, so no cycles are burnt in the background.
 * Skips entirely on coarse pointers / reduced motion.
 */

interface Particle {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  a: number;
  rose: boolean;
  seed: number;
}

export default function SandParticles({
  progressRef,
  isLightMode,
  className = "",
  fadeWithDive = false,
  interactive = true,
}: {
  progressRef: MutableRefObject<number>;
  isLightMode: boolean;
  className?: string;
  /** Fade the field with the cinematic dive/crust curve instead of a steady drift. */
  fadeWithDive?: boolean;
  /** Mouse repulsion + scroll boost. */
  interactive?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduce) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let particles: Particle[] = [];

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Lighter, tank-style density: sparse enough to stay smooth, dense enough
      // to read as a field. Slow base drift so the grains barely creep.
      const target = coarse ? 55 : Math.min(180, Math.round((w * h) / 11000));
      particles = Array.from({ length: target }, (_, i) => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.9 + 0.5,
        vx: Math.random() * 0.12 + 0.03,
        vy: (Math.random() - 0.5) * 0.06,
        a: Math.random() * 0.34 + 0.16,
        rose: Math.random() < 0.34,
        seed: i * 12.9898,
      }));
    };

    build();
    let resizeTimer: number | undefined;
    const onResize = () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(build, 160);
    };
    window.addEventListener("resize", onResize);

    // Grain tones per theme (warm sand + a dusty rose accent). Precomputed as
    // full strings so the loop never builds them per grain.
    const sandStr = isLightMode ? "rgb(184, 138, 74)" : "rgb(224, 178, 120)";
    const roseStr = isLightMode ? "rgb(170, 112, 108)" : "rgb(205, 150, 150)";

    // Interaction state.
    const R = 130; // cursor influence radius
    let mx = -9999;
    let my = -9999;
    let boost = 0;
    let lastScroll = window.scrollY;

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mx = e.clientX - rect.left;
      my = e.clientY - rect.top;
    };
    const onLeave = () => {
      mx = -9999;
      my = -9999;
    };
    const onScroll = () => {
      boost = Math.min(6, boost + Math.abs(window.scrollY - lastScroll) * 0.04);
      lastScroll = window.scrollY;
    };
    if (interactive && !coarse) {
      window.addEventListener("mousemove", onMove, { passive: true });
      window.addEventListener("mouseout", onLeave, { passive: true });
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    // Pause the loop when the canvas is off-screen so background sections cost
    // nothing.
    let onScreen = true;
    const io = new IntersectionObserver(
      (entries) => {
        onScreen = entries[0]?.isIntersecting ?? true;
        if (onScreen && raf === 0) raf = requestAnimationFrame(render);
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    let raf = 0;
    let t = 0;
    const render = () => {
      raf = 0;
      if (!onScreen) return; // resumes via the observer
      t += 0.016;
      const p = progressRef.current;

      let vis = 1;
      if (fadeWithDive) {
        const desert = 1 - smooth(p, 0.18, 0.32); // 1 -> 0 as we dive in
        const crust = smooth(p, 0.74, 0.9) * 0.62; // 0 -> settled haze
        vis = Math.max(desert, crust);
      }

      ctx.clearRect(0, 0, w, h);
      if (vis < 0.02) {
        raf = requestAnimationFrame(render);
        return;
      }

      boost *= 0.92;
      const speed = 1 + boost;

      for (const pt of particles) {
        pt.x += pt.vx * speed;
        pt.y += (pt.vy + Math.sin(t * 0.6 + pt.seed) * 0.05) * speed;

        // Cursor repulsion: a soft bulge/void that follows the pointer, with the
        // grains near it brightening and swelling a touch.
        let near = 0;
        if (mx > -9990) {
          const dx = pt.x - mx;
          const dy = pt.y - my;
          const d2 = dx * dx + dy * dy;
          if (d2 < R * R) {
            const d = Math.sqrt(d2) || 1;
            near = 1 - d / R;
            const f = near * near * 5;
            pt.x += (dx / d) * f;
            pt.y += (dy / d) * f;
          }
        }

        if (pt.x > w + 4) pt.x = -4;
        else if (pt.x < -4) pt.x = w + 4;
        if (pt.y > h + 4) pt.y = -4;
        else if (pt.y < -4) pt.y = h + 4;

        ctx.globalAlpha = Math.min(1, pt.a * (1 + near * 1.1) * vis);
        ctx.fillStyle = pt.rose ? roseStr : sandStr;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r * (1 + near * 0.9), 0, 6.283);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (resizeTimer) window.clearTimeout(resizeTimer);
      io.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, [isLightMode, progressRef, fadeWithDive, interactive]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}

/** Smoothstep from 0 to 1 across [a, b]. */
function smooth(x: number, a: number, b: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
