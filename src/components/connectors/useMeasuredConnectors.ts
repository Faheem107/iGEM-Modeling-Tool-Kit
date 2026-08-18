"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";

/**
 * Connector lines that cannot miss their targets.
 * ==========================================================================
 * The previous implementation drew branches into an
 * `<svg viewBox="0 0 1000 600" preserveAspectRatio="none">` and positioned the
 * targets separately in CSS pixels. Two things went wrong with that:
 *
 *  1. The viewBox transform was anisotropic (x scaled with the stage width,
 *     y did not), so a path drawn to a fixed user-space coordinate did not
 *     land on a target whose size was in pixels. Below a ~900px stage the
 *     targets overlapped and swallowed the line ends entirely.
 *
 *  2. Every path carried BOTH `vectorEffect="non-scaling-stroke"` and an
 *     animated `pathLength`. `pathLength` is implemented as a normalised
 *     stroke-dasharray; with a non-scaling stroke the dash resolves in
 *     post-transform screen space while the length is in user space, so under
 *     an anisotropic transform a "fully drawn" line rendered 4-30% short. The
 *     missing piece was the final descent onto the target, which is why the
 *     curve appeared to flatten out and stop in mid-air.
 *
 * This hook removes both causes. The SVG is 1:1 with its container
 * (`viewBox="0 0 w h"`, no preserveAspectRatio override) and every endpoint is
 * MEASURED from the live DOM rect of the element it connects to. A line is
 * drawn to where its target actually is, so it cannot miss at any width. The
 * draw-in animates strokeDasharray/strokeDashoffset from a real
 * `getTotalLength()` instead of trusting pathLength normalisation.
 *
 * Never put `vectorEffect="non-scaling-stroke"` on a path from this hook.
 * With a 1:1 viewBox there is no scale to correct for, and combining it with a
 * normalised dash length is precisely the defect above.
 */

/** Which edge of the target rect the line should terminate on. */
export type Anchor = "top" | "bottom" | "left" | "right" | "center";

export interface ConnectorSpec {
  id: string;
  /** Key of the source node, as registered on the node map. */
  from: string;
  /** Key of the target node. */
  to: string;
  fromAnchor?: Anchor;
  toAnchor?: Anchor;
  /** Skip this connector for now (e.g. a branch that has been retracted). */
  hidden?: boolean;
}

export interface Segment {
  id: string;
  d: string;
  /** Real path length in pixels, for the dash-offset draw-in. */
  length: number;
}

export interface ConnectorGeometry {
  box: { w: number; h: number };
  segments: Segment[];
  /** Forces a re-measure. Call after a layout-affecting state change settles. */
  remeasure: () => void;
}

type NodeMap = Record<string, RefObject<HTMLElement | null>>;

function anchorPoint(r: DOMRect, host: DOMRect, a: Anchor): [number, number] {
  const x = r.left - host.left;
  const y = r.top - host.top;
  switch (a) {
    case "top":
      return [x + r.width / 2, y];
    case "bottom":
      return [x + r.width / 2, y + r.height];
    case "left":
      return [x, y + r.height / 2];
    case "right":
      return [x + r.width, y + r.height / 2];
    default:
      return [x + r.width / 2, y + r.height / 2];
  }
}

/**
 * A vertical cubic. Both control points sit BETWEEN the endpoints on the y
 * axis, so the curve always approaches its target from the correct side and
 * terminates cleanly on the edge. The old helper put its second control point
 * above the endpoint, which made the tail flatten out and read as a broken
 * line even on the occasions it drew in full.
 */
function curve(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): string {
  const dy = y2 - y1;
  const c1y = y1 + dy * 0.55;
  const c2y = y2 - dy * 0.45;
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} C${x1.toFixed(2)} ${c1y.toFixed(2)}, ${x2.toFixed(2)} ${c2y.toFixed(2)}, ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/** Measures a path's true length without putting it in the document flow. */
function measureLength(d: string, svg: SVGSVGElement | null): number {
  if (!svg) return 0;
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", d);
  svg.appendChild(p);
  const len = p.getTotalLength();
  svg.removeChild(p);
  return len;
}

export function useMeasuredConnectors(
  hostRef: RefObject<HTMLElement | null>,
  svgRef: RefObject<SVGSVGElement | null>,
  nodes: NodeMap,
  connectors: ConnectorSpec[],
  /** Anything that moves a node. A phase index, a layout mode, a width. */
  deps: unknown[],
): ConnectorGeometry {
  const [geo, setGeo] = useState<{ box: { w: number; h: number }; segments: Segment[] }>({
    box: { w: 0, h: 0 },
    segments: [],
  });
  const frame = useRef<number | null>(null);
  // Kept in refs so the measure callback is stable and the ResizeObserver is
  // created exactly once.
  const specRef = useRef(connectors);
  specRef.current = connectors;
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const measure = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    // One frame, all reads batched, one write. No interleaving, so no thrash.
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const host = hostRef.current;
      if (!host) return;
      const hostRect = host.getBoundingClientRect();
      if (hostRect.width === 0) return;

      const rects: Record<string, DOMRect> = {};
      for (const [key, ref] of Object.entries(nodesRef.current)) {
        const el = ref.current;
        if (el) rects[key] = el.getBoundingClientRect();
      }

      const segments: Segment[] = [];
      for (const c of specRef.current) {
        if (c.hidden) continue;
        const a = rects[c.from];
        const b = rects[c.to];
        if (!a || !b) continue;
        const [x1, y1] = anchorPoint(a, hostRect, c.fromAnchor ?? "bottom");
        const [x2, y2] = anchorPoint(b, hostRect, c.toAnchor ?? "top");
        const d = curve(x1, y1, x2, y2);
        segments.push({ id: c.id, d, length: measureLength(d, svgRef.current) });
      }

      setGeo({
        box: { w: hostRect.width, h: hostRect.height },
        segments,
      });
    });
  }, [hostRef, svgRef]);

  // Measure synchronously after every layout-affecting change, before paint,
  // so a phase change never shows a frame of stale geometry.
  useLayoutEffect(() => {
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure, ...deps]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const ro = new ResizeObserver(measure);
    ro.observe(host);
    // The targets are headings, and headings reflow when the webfont swaps in.
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });

    window.addEventListener("resize", measure);
    return () => {
      cancelled = true;
      ro.disconnect();
      window.removeEventListener("resize", measure);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [hostRef, measure]);

  return { ...geo, remeasure: measure };
}
