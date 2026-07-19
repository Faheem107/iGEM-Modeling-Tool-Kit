"use client";

import { useEffect, useRef, type MutableRefObject } from "react";

/**
 * SandParticles: an ambient field of drifting sand grains on a Canvas 2D layer.
 * =========================================================================
 * Hundreds of grains blow across the stage on their own rAF loop (never a React
 * re-render). The story's scroll `progress` (0..1) is read from a ref every frame
 * and shapes the field: heavy wind-blown drift in the wide desert (beat 1), the
 * field thinning out as we dive under the sand (beats 2-3), then a calm, settled
 * haze once the crust has formed (beat 4). Skips on coarse pointers / reduced
 * motion for battery and to respect the user's motion preference.
 */

interface Particle {
  x: number;
  y: number;
  z: number; // 0 far .. 1 near, drives size + speed (parallax)
  size: number;
  drift: number;
  seed: number;
}

export default function SandParticles({
  progressRef,
  isLightMode,
  className = "",
}: {
  progressRef: MutableRefObject<number>;
  isLightMode: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
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
      // Fewer on small / coarse devices; scale with area otherwise.
      const target = coarse ? 90 : Math.min(420, Math.round((w * h) / 3400));
      particles = Array.from({ length: target }, (_, i) => {
        const z = Math.random();
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          z,
          size: 0.6 + z * 2.4,
          drift: (Math.random() - 0.5) * 0.4,
          seed: i * 12.9898,
        };
      });
    };

    build();
    const onResize = () => build();
    window.addEventListener("resize", onResize);

    // grain colour per theme (warm sand vs pale ember dust)
    const rgb = isLightMode ? "184, 138, 74" : "224, 178, 120";

    let raf = 0;
    let t = 0;
    const render = () => {
      t += 0.016;
      const p = progressRef.current;
      // Field visibility: strong desert (beat 1), thin underground (beats 2-3),
      // calm haze on the crust (beat 4).
      const desert = 1 - smooth(p, 0.18, 0.32); // 1 -> 0 as we dive in
      const crust = smooth(p, 0.74, 0.9) * 0.62; // 0 -> settled haze
      const vis = Math.max(desert, crust);
      // Wind: brisk while sand is loose, near still once it is locked.
      const wind = (1.7 - smooth(p, 0.5, 1) * 1.4) * (0.4 + desert * 0.9);

      ctx.clearRect(0, 0, w, h);
      if (vis < 0.02) {
        raf = requestAnimationFrame(render);
        return;
      }

      for (const pt of particles) {
        // Drift right + gentle vertical sway; near grains move faster (parallax).
        pt.x += wind * (0.3 + pt.z * 1.3);
        pt.y += pt.drift + Math.sin(t * 0.7 + pt.seed) * 0.18 * pt.z;
        if (pt.x > w + 6) pt.x = -6;
        if (pt.x < -6) pt.x = w + 6;
        if (pt.y > h + 6) pt.y = -6;
        if (pt.y < -6) pt.y = h + 6;
        const a = (0.12 + pt.z * 0.5) * vis;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${rgb}, ${a.toFixed(3)})`;
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(render);
    };

    if (!reduce) raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [isLightMode, progressRef]);

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
