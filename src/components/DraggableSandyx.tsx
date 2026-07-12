"use client";

import React from "react";
import { motion } from "motion/react";
import { useGlossary } from "./GlossaryTerm";
import type { ModuleId } from "../lib/prongs";

/**
 * DraggableSandyx
 * ===============
 * The mascot itself, with the drag-to-explain behavior shared by the module rail and the
 * site-wide floating companion. Drop it on an underlined <Term> to open that explanation;
 * it snaps back home afterwards. Uses elementsFromPoint so the hit-test sees THROUGH the
 * mascot to the word underneath.
 */

/** Pull viewport (client) coords out of any drag pointer/touch/mouse event. */
function clientPoint(
  e: MouseEvent | TouchEvent | PointerEvent,
): { x: number; y: number } | null {
  if ("clientX" in e && typeof (e as PointerEvent).clientX === "number") {
    return { x: (e as PointerEvent).clientX, y: (e as PointerEvent).clientY };
  }
  const te = e as TouchEvent;
  const t = te.changedTouches?.[0] || te.touches?.[0];
  return t ? { x: t.clientX, y: t.clientY } : null;
}

/** A drop target under the pointer, an underlined <Term> or one of the three module toggles. */
type DropTarget =
  | { kind: "term"; id: string }
  | { kind: "math"; id: ModuleId }
  | { kind: "video"; id: ModuleId }
  | { kind: "sources"; id: ModuleId }
  | { kind: "code"; id: ModuleId };

/** Radius (px) of the forgiving drop zone sampled around the pointer. */
const DROP_RADIUS = 42;

function targetInStack(stack: Element[]): DropTarget | null {
  for (const el of stack) {
    const node = el as HTMLElement;
    const term = node.getAttribute?.("data-sandyx-term");
    if (term) return { kind: "term", id: term };
    const math = node.getAttribute?.("data-sandyx-math");
    if (math) return { kind: "math", id: math as ModuleId };
    const video = node.getAttribute?.("data-sandyx-video");
    if (video) return { kind: "video", id: video as ModuleId };
    const sources = node.getAttribute?.("data-sandyx-sources");
    if (sources) return { kind: "sources", id: sources as ModuleId };
    const codeTarget = node.getAttribute?.("data-sandyx-code");
    if (codeTarget) return { kind: "code", id: codeTarget as ModuleId };
  }
  return null;
}

/**
 * Find the nearest drop target to the pointer, seeing THROUGH the dragged mascot. We don't
 * require the cursor to land exactly on the word: we probe the exact point first, then a ring
 * of points within DROP_RADIUS, so getting *close* to an underlined term (or a math toggle) is
 * enough to drop on it.
 */
function targetAtPoint(x: number, y: number): DropTarget | null {
  const exact = targetInStack(document.elementsFromPoint(x, y));
  if (exact) return exact;
  // Probe outward in rings so the closest target wins.
  for (const r of [DROP_RADIUS * 0.5, DROP_RADIUS]) {
    for (let a = 0; a < 360; a += 45) {
      const rad = (a * Math.PI) / 180;
      const hit = targetInStack(
        document.elementsFromPoint(
          x + r * Math.cos(rad),
          y + r * Math.sin(rad),
        ),
      );
      if (hit) return hit;
    }
  }
  return null;
}

interface Props {
  size: number;
  className?: string;
}

export default function DraggableSandyx({ size, className }: Props) {
  const {
    open,
    openMath,
    openVideo,
    openSources,
    openCode,
    setDragging,
    setHoverId,
    dragging,
  } = useGlossary();
  const hoverRef = React.useRef<DropTarget | null>(null);
  const hoverIdRef = React.useRef<string | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const pendingPoint = React.useRef<{ x: number; y: number } | null>(null);

  const onDragStart = () => setDragging(true);

  // Hit-testing is expensive (elementsFromPoint forces a layout flush), so run it at most once
  // per animation frame, and only push a new hoverId into context when it actually changed, // otherwise every drag tick re-renders the whole provider subtree.
  const runHitTest = React.useCallback(() => {
    rafRef.current = null;
    const p = pendingPoint.current;
    if (!p) return;
    const target = targetAtPoint(p.x, p.y);
    hoverRef.current = target;
    const nextId = target ? target.id : null;
    if (nextId !== hoverIdRef.current) {
      hoverIdRef.current = nextId;
      setHoverId(nextId);
    }
  }, [setHoverId]);

  const onDrag = (e: MouseEvent | TouchEvent | PointerEvent) => {
    const p = clientPoint(e);
    if (!p) return;
    pendingPoint.current = p;
    if (rafRef.current == null)
      rafRef.current = requestAnimationFrame(runHitTest);
  };

  const onDragEnd = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const dropped = hoverRef.current;
    setDragging(false);
    setHoverId(null);
    hoverIdRef.current = null;
    hoverRef.current = null;
    pendingPoint.current = null;
    if (dropped?.kind === "term") open(dropped.id);
    else if (dropped?.kind === "math") openMath(dropped.id);
    else if (dropped?.kind === "video") openVideo(dropped.id);
    else if (dropped?.kind === "sources") openSources(dropped.id);
    else if (dropped?.kind === "code") openCode(dropped.id);
  };

  React.useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  return (
    <motion.img
      src="/sandyx.png"
      alt="Sandyx, drag me onto an underlined word, or a Show-the-Math toggle, for an explanation"
      draggable={false}
      drag
      dragSnapToOrigin
      dragMomentum={false}
      dragElastic={0.16}
      dragTransition={{
        power: 0.18,
        timeConstant: 200,
        bounceStiffness: 200,
        bounceDamping: 28,
      }}
      onDragStart={onDragStart}
      onDrag={(e) => onDrag(e as PointerEvent)}
      onDragEnd={onDragEnd}
      whileHover={{ scale: 1.06, rotate: -2 }}
      whileTap={{ scale: 0.96 }}
      whileDrag={{ scale: 1.1, cursor: "grabbing", zIndex: 300 }}
      animate={dragging ? {} : { y: [0, -6, 0] }}
      transition={
        dragging
          ? { type: "spring", stiffness: 500, damping: 40 }
          : { duration: 3.5, repeat: Infinity, ease: "easeInOut" }
      }
      style={{ width: size, height: "auto", touchAction: "none" }}
      className={`object-contain select-none cursor-grab drop-shadow-xl active:cursor-grabbing ${className || ""}`}
    />
  );
}
