/**
 * Deterministic geometry for the landing "dune story" (LandingCinematic).
 * =========================================================================
 * Every shape here is built from a seeded PRNG and rounded, so the server and
 * client render byte-identical markup (Math.sin can differ in its last bit
 * across engines, which would trip a hydration mismatch). Nothing here touches
 * the DOM or React; it is pure layout maths shared by the story SVGs.
 *
 * viewBox for every scene is "0 0 1200 800".
 */

export const VIEW_W = 1200;
export const VIEW_H = 800;

/** Round to 2 dp so SSR and client strings match exactly. */
export const r2 = (n: number) => Math.round(n * 100) / 100;

/** Cheap deterministic hash in [0,1). */
export function seeded(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * A closed, organic blob path around (cx, cy). Used for sand grains: a circle
 * with each vertex nudged in/out by the seeded PRNG so no two grains match.
 */
export function blobPath(
  cx: number,
  cy: number,
  radius: number,
  seedBase: number,
  points = 12,
  irregularity = 0.16,
): string {
  const verts: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const ang = (i / points) * Math.PI * 2;
    const wob = 1 + (seeded(seedBase + i * 1.7) - 0.5) * 2 * irregularity;
    const rr = radius * wob;
    verts.push([r2(cx + Math.cos(ang) * rr), r2(cy + Math.sin(ang) * rr)]);
  }
  // Catmull-Rom -> cubic bezier for a smooth closed outline.
  let d = `M${verts[0][0]} ${verts[0][1]}`;
  for (let i = 0; i < points; i++) {
    const p0 = verts[(i - 1 + points) % points];
    const p1 = verts[i];
    const p2 = verts[(i + 1) % points];
    const p3 = verts[(i + 2) % points];
    const c1x = r2(p1[0] + (p2[0] - p0[0]) / 6);
    const c1y = r2(p1[1] + (p2[1] - p0[1]) / 6);
    const c2x = r2(p2[0] - (p3[0] - p1[0]) / 6);
    const c2y = r2(p2[1] - (p3[1] - p1[1]) / 6);
    d += ` C${c1x} ${c1y} ${c2x} ${c2y} ${p2[0]} ${p2[1]}`;
  }
  return d + "Z";
}

/**
 * A filled dune band spanning the full width. A smooth sine crest across the
 * top, then straight down to the bottom edge and back, so it reads as a hill.
 */
export function dunePath(
  baseY: number,
  amplitude: number,
  wavelength: number,
  phase: number,
): string {
  const step = 60;
  let d = `M0 ${r2(baseY + Math.sin(phase) * amplitude)}`;
  for (let x = step; x <= VIEW_W; x += step) {
    const y = r2(baseY + Math.sin(x / wavelength + phase) * amplitude);
    d += ` L${x} ${y}`;
  }
  d += ` L${VIEW_W} ${VIEW_H} L0 ${VIEW_H} Z`;
  return d;
}

export interface Grain {
  cx: number;
  cy: number;
  r: number;
  path: string;
}

/**
 * The cluster of large sand grains at the micro scale. Placed in a loose ring
 * with real gaps between them, so the polymer bridges have somewhere to span.
 */
export function microGrains(): Grain[] {
  const spots: [number, number, number][] = [
    // cx, cy, radius
    [600, 410, 150],
    [330, 300, 110],
    [880, 300, 120],
    [340, 560, 118],
    [880, 560, 112],
    [600, 690, 96],
    [180, 430, 78],
    [1040, 440, 82],
  ];
  return spots.map(([cx, cy, r], i) => ({
    cx,
    cy,
    r,
    path: blobPath(cx, cy, r, i * 9 + 4),
  }));
}

export interface Bridge {
  path: string;
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

/**
 * γ-PGA bridges: a gently wavy strand from the rim of one grain to the rim of
 * a nearby grain. Returned as SVG paths (drawn 0->1 by anime.js) plus the two
 * anchor points (where a cross-link node sits).
 */
export function polymerBridges(grains: Grain[]): Bridge[] {
  const pairs: [number, number][] = [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [0, 5],
    [1, 3],
    [2, 4],
    [1, 6],
    [2, 7],
    [3, 5],
    [4, 5],
  ];
  return pairs.map(([i, j], k) => {
    const a = grains[i];
    const b = grains[j];
    const dx = b.cx - a.cx;
    const dy = b.cy - a.cy;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    // Anchor on each grain's rim, facing the other grain.
    const ax = r2(a.cx + ux * a.r * 0.92);
    const ay = r2(a.cy + uy * a.r * 0.92);
    const bx = r2(b.cx - ux * b.r * 0.92);
    const by = r2(b.cy - uy * b.r * 0.92);
    // Two control points offset perpendicular for a woven, strand-like curve.
    const nx = -uy;
    const ny = ux;
    const wobble = (seeded(k + 2) - 0.5) * 70 + 26;
    const mx1 = r2(ax + (bx - ax) * 0.33 + nx * wobble);
    const my1 = r2(ay + (by - ay) * 0.33 + ny * wobble);
    const mx2 = r2(ax + (bx - ax) * 0.66 - nx * wobble);
    const my2 = r2(ay + (by - ay) * 0.66 - ny * wobble);
    return {
      path: `M${ax} ${ay} C${mx1} ${my1} ${mx2} ${my2} ${bx} ${by}`,
      ax,
      ay,
      bx,
      by,
    };
  });
}

/**
 * Points for the faint crystal-lattice overlay that sits on the hero grain's
 * surface (a clipped hex-ish grid), showing the mineral face at micro scale.
 */
export function latticePoints(
  cx: number,
  cy: number,
  radius: number,
  cols = 7,
  rows = 7,
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const gap = (radius * 2) / (cols - 1);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const offset = r % 2 === 0 ? 0 : gap / 2;
      const x = cx - radius + c * gap + offset;
      const y = cy - radius + r * gap;
      if (Math.hypot(x - cx, y - cy) <= radius * 0.94) {
        pts.push({ x: r2(x), y: r2(y) });
      }
    }
  }
  return pts;
}
