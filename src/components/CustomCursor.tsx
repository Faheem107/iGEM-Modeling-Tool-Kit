"use client";

import { useEffect, useRef } from "react";
import { getCursorState, targetRadius, usePointer } from "@/src/lib/motion/pointer";

/**
 * The pointer. One rAF loop writing transforms straight to the DOM: nothing goes
 * through React state and nothing re-renders while the pointer moves.
 *
 * The ring reads as an aperture rather than a dot, which suits a mapping tool:
 * default is a hollow ring with a centre pip, interactive fills it, and a snap
 * target draws the ring around the element itself.
 *
 * No mix-blend-mode. It flickers over any surface with a backdrop-filter, and the
 * contrast shadow below does the same job more cheaply.
 *
 * The stuck ELEMENT is stored rather than its rect, and re-measured each frame,
 * because Lenis fires scroll every frame and a cached rect drops the cursor.
 */

type Shape = { w: number; h: number; r: number; fill: number; pip: number };

const SHAPES = {
  default: { w: 16, h: 16, r: 999, fill: 0, pip: 1 },
  interactive: { w: 40, h: 40, r: 999, fill: 0.16, pip: 0 },
  text: { w: 2, h: 20, r: 1, fill: 1, pip: 0 },
} satisfies Record<string, Shape>;

/** Frame-rate independent exponential smoothing. */
const approach = (cur: number, goal: number, dt: number, rate: number) =>
  cur + (goal - cur) * (1 - Math.exp(-dt * rate));

export default function CustomCursor() {
  const { hasPointer } = usePointer();
  const rootRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const pipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasPointer) return;
    const root = rootRef.current;
    const box = boxRef.current;
    const pip = pipRef.current;
    if (!root || !box || !pip) return;

    const state = getCursorState();
    let x = -100, y = -100;
    let w = SHAPES.default.w, h = SHAPES.default.h, r = SHAPES.default.r;
    let fill = 0, pipA = 1, opacity = 0, press = 1;
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      let goalX = state.x;
      let goalY = state.y;
      let shape: Shape = SHAPES.default;

      if (state.variant === "stuck" && state.target?.isConnected) {
        const rect = state.target.getBoundingClientRect();
        goalX = rect.left + rect.width / 2;
        goalY = rect.top + rect.height / 2;
        shape = {
          w: rect.width + 14,
          h: rect.height + 12,
          r: targetRadius(state.target) + 6,
          fill: 0.06,
          pip: 0,
        };
      } else if (state.variant === "interactive") {
        shape = SHAPES.interactive;
      } else if (state.variant === "text") {
        shape = SHAPES.text;
      }

      x = approach(x, goalX, dt, 24);
      y = approach(y, goalY, dt, 24);
      w = approach(w, shape.w, dt, 18);
      h = approach(h, shape.h, dt, 18);
      r = approach(r, shape.r, dt, 18);
      fill = approach(fill, shape.fill, dt, 16);
      pipA = approach(pipA, shape.pip, dt, 20);
      opacity = approach(opacity, state.inside ? 1 : 0, dt, 14);
      press = approach(press, state.pressed ? 0.82 : 1, dt, 28);

      root.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${press})`;
      root.style.opacity = String(opacity);
      box.style.width = `${w}px`;
      box.style.height = `${h}px`;
      box.style.borderRadius = `${r}px`;
      box.style.backgroundColor = `rgb(var(--cursor) / ${fill})`;
      box.style.borderColor = `rgb(var(--cursor) / ${0.55 + 0.45 * pipA})`;
      pip.style.opacity = String(pipA);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [hasPointer]);

  if (!hasPointer) return null;

  return (
    <div
      ref={rootRef}
      aria-hidden
      // Above every overlay on the site so the cursor never vanishes behind one.
      // The loop owns this element's transform, so no translate utilities here.
      className="pointer-events-none fixed left-0 top-0 z-[10000] will-change-transform"
      style={{ opacity: 0 }}
    >
      <div
        ref={boxRef}
        className="border"
        style={{
          transform: "translate(-50%, -50%)",
          boxShadow: "0 0 0 1px rgb(var(--cursor-contrast) / 0.28)",
        }}
      />
      <div
        ref={pipRef}
        className="absolute left-0 top-0 h-[3px] w-[3px] rounded-full"
        style={{
          transform: "translate(-50%, -50%)",
          background: "rgb(var(--cursor) / 0.95)",
        }}
      />
    </div>
  );
}
