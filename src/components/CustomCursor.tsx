"use client";

import { useEffect, useRef } from "react";

/**
 * Custom cursor (Tank-site style, a touch more interactive).
 * =========================================================================
 * A lagging ring plus a near-instant dot, both following the pointer. The ring
 * grows over interactive targets and pinches on press. The native cursor is
 * hidden (html.has-cursor) only on real pointer devices, so touch is untouched.
 * A rAF lerp drives the follow (the right tool for per-frame tracking); anime.js
 * carries the discrete state changes elsewhere on the page.
 */
export default function CustomCursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(hover: none) and (pointer: coarse)").matches
    ) {
      return;
    }

    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!ring || !dot) return;

    const root = document.documentElement;
    root.classList.add("has-cursor");

    // Target (true pointer) vs eased ring position.
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let rx = tx;
    let ry = ty;
    let visible = false;
    let raf = 0;

    const interactiveSel =
      'a, button, [role="button"], input, textarea, select, label, summary, .cursor-pointer, [data-cursor="grow"]';

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!visible) {
        visible = true;
        ring.style.opacity = "1";
        dot.style.opacity = "1";
        rx = tx;
        ry = ty;
      }
      const el = e.target as Element | null;
      const grow = !!el?.closest?.(interactiveSel);
      ring.classList.toggle("cur-grow", grow);
    };
    const onDown = () => ring.classList.add("cur-down");
    const onUp = () => ring.classList.remove("cur-down");
    const onLeave = () => {
      visible = false;
      ring.style.opacity = "0";
      dot.style.opacity = "0";
    };

    const tick = () => {
      rx += (tx - rx) * 0.18;
      ry += (ty - ry) * 0.18;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      dot.style.transform = `translate3d(${tx}px, ${ty}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointerleave", onLeave);
      root.classList.remove("has-cursor");
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className="cursor-ring" aria-hidden style={{ opacity: 0 }} />
      <div ref={dotRef} className="cursor-dot" aria-hidden style={{ opacity: 0 }} />
    </>
  );
}
