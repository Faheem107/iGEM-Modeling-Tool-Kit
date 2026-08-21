"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { H, W } from "./mapExtent";

/**
 * Pan and zoom for the exposure map.
 *
 * The map is hand-rolled SVG, so this is a viewBox window rather than a tile
 * library. `view` is expressed in the same units `project()` returns, which
 * means every existing coordinate calculation keeps working untouched and only
 * the viewBox string changes.
 *
 * Two things do not come for free with a viewBox. Strokes and glyphs scale with
 * it, so anything meant to stay a hairline or a legible label has to be divided
 * by `k`. And the wind field is a canvas, not SVG, so it has to be handed the
 * same window and apply it itself, or the streaks slide off the coastline on
 * the first zoom.
 */

export interface MapView {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const FULL_VIEW: MapView = { x: 0, y: 0, w: W, h: H };

const MAX_SCALE = 14;

/** Keep the window inside the extent, so the map cannot be dragged off screen. */
function clamp(view: MapView): MapView {
  const w = Math.min(W, Math.max(W / MAX_SCALE, view.w));
  const h = w * (H / W);
  return {
    w,
    h,
    x: Math.min(W - w, Math.max(0, view.x)),
    y: Math.min(H - h, Math.max(0, view.y)),
  };
}

export function useMapView() {
  const [view, setView] = useState<MapView>(FULL_VIEW);
  const hostRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; view: MapView } | null>(null);
  /** Where the last gesture began. `drag` is cleared on pointerup, which fires
   *  before click, so `moved` needs its own copy to compare against. */
  const lastDrag = useRef<{ x: number; y: number } | null>(null);

  const scale = W / view.w;
  const atFullExtent = view.w >= W - 0.5;

  const reset = useCallback(() => setView(FULL_VIEW), []);

  /** Zoom about a point given in [0,1] of the host box, so the spot under the
   *  pointer stays under the pointer. */
  const zoomAt = useCallback((factor: number, fx: number, fy: number) => {
    setView((v) => {
      const w = Math.min(W, Math.max(W / MAX_SCALE, v.w / factor));
      const h = w * (H / W);
      const anchorX = v.x + fx * v.w;
      const anchorY = v.y + fy * v.h;
      return clamp({ w, h, x: anchorX - fx * w, y: anchorY - fy * h });
    });
  }, []);

  const zoomBy = useCallback(
    (factor: number) => zoomAt(factor, 0.5, 0.5),
    [zoomAt],
  );

  /**
   * Wheel zoom is registered non-passively on the element rather than through
   * React's onWheel, because React attaches wheel listeners passively at the
   * root and preventDefault is then ignored. Without preventDefault the page
   * scrolls behind the map. `data-lenis-prevent` on the host keeps Lenis off it
   * as well, the same way CompactModal keeps Lenis off its scroller.
   */
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const box = host.getBoundingClientRect();
      const fx = (e.clientX - box.left) / box.width;
      const fy = (e.clientY - box.top) / box.height;
      zoomAt(Math.exp(-e.deltaY * 0.0016), fx, fy);
    };
    host.addEventListener("wheel", onWheel, { passive: false });
    return () => host.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Left button or touch only, and never on a site marker, which handles
      // its own click.
      if (e.button !== 0) return;
      const host = hostRef.current;
      if (!host) return;
      drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, view };
      lastDrag.current = { x: e.clientX, y: e.clientY };
      host.setPointerCapture(e.pointerId);
    },
    [view],
  );

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const host = hostRef.current;
    if (!d || !host || d.id !== e.pointerId) return;
    const box = host.getBoundingClientRect();
    // Screen pixels to view units. The map is drawn to fit the box, so one
    // screen pixel is view.w / box.width of the window.
    const dx = ((e.clientX - d.x) / box.width) * d.view.w;
    const dy = ((e.clientY - d.y) / box.height) * d.view.h;
    setView(clamp({ ...d.view, x: d.view.x - dx, y: d.view.y - dy }));
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const host = hostRef.current;
    if (drag.current?.id === e.pointerId) {
      drag.current = null;
      host?.releasePointerCapture?.(e.pointerId);
    }
  }, []);

  /**
   * A pan that begins on top of a marker would otherwise also select it, so a
   * marker asks whether the pointer actually travelled. React fires click with
   * a MouseEvent rather than a PointerEvent, hence the narrow parameter type:
   * only the two coordinates are needed.
   */
  const moved = useCallback(
    (e: { clientX: number; clientY: number }) =>
      lastDrag.current != null &&
      Math.hypot(e.clientX - lastDrag.current.x, e.clientY - lastDrag.current.y) > 4,
    [],
  );

  return {
    view,
    scale,
    atFullExtent,
    hostRef,
    reset,
    zoomBy,
    /** True when the pointer has been dragged far enough that the gesture was a
     *  pan, so a marker underneath should not treat the release as a click. */
    moved,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onDoubleClick: reset,
    },
  };
}
