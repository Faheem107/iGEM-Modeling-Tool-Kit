"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { H, W } from "./mapExtent";

/**
 * Pan and zoom for the exposure map, as a viewBox window rather than a tile
 * library. Units match project(), so existing coordinate maths is untouched.
 *
 * Callers must divide strokes and font sizes by `k`, and hand `view` to
 * WindFieldCanvas, which is canvas and will otherwise drift off the coastline.
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
  /** `drag` is cleared on pointerup, which fires before click, so keep a copy. */
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

  // Bound non-passively: React attaches wheel listeners passively at the root,
  // so preventDefault would be ignored and the page would scroll behind the map.
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
      // Left button or touch only.
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

  /** Did the pointer travel far enough that this gesture was a pan, not a click?
   *  Narrow parameter type because React fires click with a MouseEvent. */
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
    /** True after a pan, so a marker underneath ignores the release. */
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
