"use client";

import { useEffect, useMemo, useRef } from "react";

/**
 * MolecularHero: a rotating 3D molecular structure rendered as SVG.
 * =========================================================================
 * Replaces the Mol* protein on the landing with a lighter, theme-aware,
 * Isomorphic/Harmonic-style molecule: atoms on a Fibonacci sphere joined by
 * bonds, projected from 3D and spun each frame (rAF). Depth drives node size and
 * opacity so it reads as a solid object turning in space. Reduced motion freezes
 * it on a clean three-quarter view.
 *
 * Pure SVG + attribute writes (no React re-render per frame, no WebGL), so it is
 * cheap and crisp at any size.
 */

interface Node3 {
  x: number;
  y: number;
  z: number;
}

const N = 30;
const R = 34; // sphere radius in viewBox units (viewBox is 100 x 100)
const CX = 50;
const CY = 50;
const BOND_DIST = 26; // 3D distance under which two atoms are bonded
const FOCAL = 190; // perspective focal length

function fibonacciSphere(n: number): Node3[] {
  const pts: Node3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = i * golden;
    pts.push({ x: Math.cos(theta) * r * R, y: y * R, z: Math.sin(theta) * r * R });
  }
  return pts;
}

export default function MolecularHero({
  isLightMode,
  className = "",
}: {
  isLightMode: boolean;
  className?: string;
}) {
  const nodes = useMemo(() => fibonacciSphere(N), []);
  const bonds = useMemo(() => {
    const list: [number, number][] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dz = nodes[i].z - nodes[j].z;
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) < BOND_DIST) list.push([i, j]);
      }
    }
    return list;
  }, [nodes]);

  const nodeColor = isLightMode ? "#3E8C82" : "#94C2BB"; // dune teal, per theme
  const bondColor = isLightMode ? "#6e1e18" : "#d6884a"; // maroon / orange

  const circleRefs = useRef<(SVGCircleElement | null)[]>([]);
  const lineRefs = useRef<(SVGLineElement | null)[]>([]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let a = 0.6; // yaw
    const tiltX = 0.42; // fixed pitch for depth
    const start = performance.now();

    const project = (n: Node3, yaw: number) => {
      // rotate around Y
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      let x = n.x * cosY + n.z * sinY;
      let z = -n.x * sinY + n.z * cosY;
      const y0 = n.y;
      // rotate around X (fixed tilt)
      const cosX = Math.cos(tiltX);
      const sinX = Math.sin(tiltX);
      const y = y0 * cosX - z * sinX;
      z = y0 * sinX + z * cosX;
      const scale = FOCAL / (FOCAL - z);
      return { sx: CX + x * scale, sy: CY + y * scale, z };
    };

    const render = (yaw: number, reveal: number) => {
      const proj = nodes.map((n) => project(n, yaw));
      const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
      for (let i = 0; i < proj.length; i++) {
        const c = circleRefs.current[i];
        if (!c) continue;
        const p = proj[i];
        const depth = clamp01((p.z + R) / (2 * R)); // 0 (back) .. 1 (front)
        c.setAttribute("cx", p.sx.toFixed(2));
        c.setAttribute("cy", p.sy.toFixed(2));
        c.setAttribute("r", Math.max(0, reveal * (1.1 + depth * 1.7)).toFixed(2));
        c.setAttribute("opacity", clamp01(reveal * (0.35 + depth * 0.65)).toFixed(2));
      }
      for (let k = 0; k < bonds.length; k++) {
        const l = lineRefs.current[k];
        if (!l) continue;
        const [i, j] = bonds[k];
        const pi = proj[i];
        const pj = proj[j];
        const depth = clamp01((pi.z + pj.z + 2 * R) / (4 * R));
        l.setAttribute("x1", pi.sx.toFixed(2));
        l.setAttribute("y1", pi.sy.toFixed(2));
        l.setAttribute("x2", pj.sx.toFixed(2));
        l.setAttribute("y2", pj.sy.toFixed(2));
        l.setAttribute("opacity", clamp01(reveal * (0.06 + depth * 0.4)).toFixed(2));
      }
    };

    if (reduce) {
      render(0.6, 1);
      return;
    }

    const tick = (now: number) => {
      a += 0.0035;
      const reveal = Math.min(1, (now - start) / 900);
      render(a, reveal);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [nodes, bonds]);

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      aria-hidden
      style={{ overflow: "visible" }}
    >
      <g stroke={bondColor} strokeWidth={0.4} strokeLinecap="round">
        {bonds.map((_, k) => (
          <line
            key={k}
            ref={(el) => {
              lineRefs.current[k] = el;
            }}
            opacity={0}
          />
        ))}
      </g>
      <g fill={nodeColor}>
        {nodes.map((_, i) => (
          <circle
            key={i}
            ref={(el) => {
              circleRefs.current[i] = el;
            }}
            r={0}
            opacity={0}
          />
        ))}
      </g>
    </svg>
  );
}
