"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

/**
 * Pointer state for the custom cursor.
 *
 * Deliberately not React state. Every element using useStick consumes this, so
 * held in a provider it would re-render the whole subtree on each hover, which
 * across the prong cards and the map markers is most of a frame. A module-level
 * store instead: writers mutate, and the cursor reads from one rAF loop.
 */

export type CursorVariant = "default" | "interactive" | "stuck" | "text";

type Store = {
  x: number;
  y: number;
  variant: CursorVariant;
  /** the element to snap to, kept as an element rather than a rect */
  target: HTMLElement | null;
  inside: boolean;
  pressed: boolean;
};

const store: Store = {
  x: -100, y: -100, variant: "default", target: null, inside: false, pressed: false,
};

export const getCursorState = (): Readonly<Store> => store;

export function setCursorPosition(x: number, y: number) {
  store.x = x;
  store.y = y;
  store.inside = true;
}

export const setCursorInside = (inside: boolean) => {
  store.inside = inside;
};

export function setCursorVariant(variant: CursorVariant) {
  if (store.variant === variant) return;
  store.variant = variant;
  if (variant !== "stuck") store.target = null;
}

export function setCursorTarget(el: HTMLElement | null) {
  store.target = el;
  store.variant = el ? "stuck" : "default";
}

/** Corner radius of a snap target. getComputedStyle forces a recalc, so cache it. */
const radiusCache = new WeakMap<HTMLElement, number>();

export function targetRadius(el: HTMLElement): number {
  const declared = el.dataset.cursorRadius;
  if (declared) return Number(declared) || 6;
  const cached = radiusCache.get(el);
  if (cached !== undefined) return cached;
  const measured = parseFloat(getComputedStyle(el).borderRadius) || 6;
  radiusCache.set(el, measured);
  return measured;
}

const TEXT_SELECTOR = 'p, li, blockquote, h1, h2, h3, h4, [data-cursor="text"]';

const PointerContext = createContext<{ hasPointer: boolean } | null>(null);

export function PointerProvider({ children }: { children: React.ReactNode }) {
  const [hasPointer, setHasPointer] = useState(false);

  useEffect(() => {
    // Replacing the system cursor is only safe on a fine pointer that hovers.
    // Touch and stylus keep theirs, and reduced motion opts out entirely.
    const mq = window.matchMedia("(pointer: fine) and (hover: hover)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setHasPointer(mq.matches && !reduced.matches);
    sync();
    mq.addEventListener("change", sync);
    reduced.addEventListener("change", sync);
    return () => {
      mq.removeEventListener("change", sync);
      reduced.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (!hasPointer) return;
    document.documentElement.classList.add("has-custom-cursor");
    return () => document.documentElement.classList.remove("has-custom-cursor");
  }, [hasPointer]);

  useEffect(() => {
    if (!hasPointer) return;
    const onMove = (e: PointerEvent) => setCursorPosition(e.clientX, e.clientY);
    const onLeave = (e: PointerEvent) => {
      if (e.relatedTarget) return;
      setCursorInside(false);
    };
    const onDown = () => { store.pressed = true; };
    const onUp = () => { store.pressed = false; };
    // Resolved on pointerover, which fires once per element crossed rather than
    // per frame. Stuck and interactive are explicit and win over this.
    const onOver = (e: Event) => {
      if (store.variant === "stuck" || store.variant === "interactive") return;
      const t = e.target as HTMLElement | null;
      setCursorVariant(t?.closest?.(TEXT_SELECTOR) ? "text" : "default");
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onLeave);
    document.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onLeave);
      document.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [hasPointer]);

  const value = useMemo(() => ({ hasPointer }), [hasPointer]);
  return <PointerContext.Provider value={value}>{children}</PointerContext.Provider>;
}

export function usePointer() {
  const ctx = useContext(PointerContext);
  return ctx ?? { hasPointer: false };
}

/**
 * Makes an element a snap target: the cursor takes its shape on enter and
 * releases on leave. Isolated controls only. A dense list wants useHighlight,
 * since snapping between neighbours a few pixels apart reads as jitter.
 */
export function useStick() {
  return useMemo(
    () => ({
      onMouseEnter: (e: React.MouseEvent) => setCursorTarget(e.currentTarget as HTMLElement),
      onMouseLeave: () => setCursorTarget(null),
    }),
    [],
  );
}

/** Marks an element as merely interactive: the cursor fills but does not snap. */
export function useHighlight() {
  return useMemo(
    () => ({
      onMouseEnter: () => setCursorVariant("interactive"),
      onMouseLeave: () => setCursorVariant("default"),
    }),
    [],
  );
}
