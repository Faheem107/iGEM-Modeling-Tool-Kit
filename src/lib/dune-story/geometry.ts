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

/**
 * A ring of small grains set further back than the eight in `microGrains`.
 * They exist only for depth: drawn first, blurred and dimmed, they fill the
 * black voids the front cluster leaves and give the scene a floor to sit on
 * instead of a hole to float over.
 */
export function backGrains(): Grain[] {
  const spots: [number, number, number][] = [
    [80, 150, 74],
    [1130, 130, 80],
    [130, 720, 78],
    [1090, 730, 70],
    [400, 70, 62],
    [800, 780, 66],
    [1175, 430, 58],
    [20, 450, 54],
    [470, 180, 44],
    [740, 160, 40],
    [250, 620, 46],
    [960, 660, 42],
  ];
  return spots.map(([cx, cy, r], i) => ({
    cx,
    cy,
    r,
    path: blobPath(cx, cy, r, i * 13 + 61, 10, 0.2),
  }));
}

/**
 * Speckle for a grain's surface: seeded dots scattered inside its radius, drawn
 * clipped to the grain. Sand is not a flat colour, and a scatter of grit reads
 * as material far more cheaply than an feTurbulence filter, which would have to
 * re-rasterise on every frame of the scrubbed zoom.
 */
export function speckle(
  cx: number,
  cy: number,
  radius: number,
  count: number,
  seedBase: number,
): { x: number; y: number; r: number }[] {
  const pts: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < count; i++) {
    const ang = seeded(seedBase + i * 2.3) * Math.PI * 2;
    // sqrt keeps the scatter even across the disc instead of piling at the centre
    const rad = Math.sqrt(seeded(seedBase + i * 3.7)) * radius * 0.93;
    pts.push({
      x: r2(cx + Math.cos(ang) * rad),
      y: r2(cy + Math.sin(ang) * rad),
      r: r2(1.1 + seeded(seedBase + i * 5.1) * 2.6),
    });
  }
  return pts;
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

/** Where the crust's ground plane meets the sky. */
export const CRUST_HORIZON = 296;

export interface CrustGrain {
  cx: number;
  cy: number;
  r: number;
  /** A modelled outline near the camera; null where a circle is the same pixels. */
  path: string | null;
}

export interface CrustRow {
  /** Screen scale of this row: 1 near the camera, small at the horizon. */
  depth: number;
  r: number;
  grains: CrustGrain[];
  /** Where two neighbours touch, which is where a cross-link sits. */
  joins: { x: number; y: number; r: number }[];
}

/**
 * The grain cluster seen from far enough back to be ground.
 *
 * Screen y and screen scale are one linear relation, y = H + 464·depth, which
 * is what makes this a plane rather than a stack of bands. Rows are stepped
 * down the screen by a grain and a half at their own depth, so the bed stays
 * packed all the way to the horizon instead of thinning out.
 */
export function crustBed(): CrustRow[] {
  const rows: CrustRow[] = [];
  const A = 464;
  const radius = (d: number) => 3 + 34 * d;

  for (let y = 900, j = 0; ; j++) {
    const depth = r2((y - CRUST_HORIZON) / A);
    const r = radius(depth);
    if (r < 11) break;

    const step = r * 2.45;
    const count = Math.ceil(1560 / step) + 1;
    const x0 = -160 + (j % 2 ? step / 2 : 0);
    const modelled = r > 26;

    const grains: CrustGrain[] = [];
    for (let i = 0; i < count; i++) {
      const seed = j * 97 + i * 13 + 5;
      const cx = r2(x0 + i * step + (seeded(seed) - 0.5) * step * 0.24);
      const cy = r2(y + (seeded(seed + 3) - 0.5) * r * 0.55);
      const rr = r2(r * (0.8 + seeded(seed + 7) * 0.4));
      grains.push({ cx, cy, r: rr, path: modelled ? blobPath(cx, cy, rr, seed, 12, 0.15) : null });
    }

    // At this scale the polymer itself is far under a pixel. What is left to
    // draw is the fact that neighbours are locked, so only the contact takes a
    // mark, and only where it is more than a dot.
    const joins: CrustRow["joins"] = [];
    if (r > 17) {
      for (let i = 0; i + 1 < grains.length; i += 2) {
        const a = grains[i];
        const b = grains[i + 1];
        joins.push({
          x: r2((a.cx + a.r + b.cx - b.r) / 2),
          y: r2((a.cy + b.cy) / 2),
          r: r2(Math.max(1.4, r * 0.17)),
        });
      }
    }

    rows.push({ depth, r: r2(r), grains, joins });
    y -= Math.max(8, r * 1.5);
  }

  // Painted far to near, so a nearer grain overlaps the one behind it.
  return rows.reverse();
}

/** Mix two hex colours, for the haze a row picks up with distance. */
export function blend(a: string, b: string, t: number): string {
  const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const [r1, g1, b1] = hex(a);
  const [r2c, g2, b2] = hex(b);
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${mix(r1, r2c)}${mix(g1, g2)}${mix(b1, b2)}`;
}

/** The near ridge of the field scene, so the hops land on it. */
export const RIDGE_Y = (x: number) => r2(656 + Math.sin(x / 175 + 1.2) * 58);

export interface Hop {
  x: number;
  y: number;
  r: number;
  dx: number;
  dy: number;
  delay: string;
}

/**
 * Grains hopping along the near ridge. Saltation: the wind carries a grain a
 * short way, it lands, and the impact passes the energy on. Each one starts at
 * a different point in the same cycle, so the surface is never in step.
 */
export function saltation(count = 22): Hop[] {
  const hops: Hop[] = [];
  for (let i = 0; i < count; i++) {
    const x = r2(-120 + (i / count) * 1440 + seeded(i * 3.1) * 60);
    const dx = r2(120 + seeded(i * 5.3) * 150);
    hops.push({
      x,
      y: RIDGE_Y(x),
      r: r2(2.4 + seeded(i * 7.7) * 2.6),
      dx,
      dy: r2(-(26 + seeded(i * 9.1) * 46)),
      delay: (-seeded(i * 11.3) * 2.9).toFixed(2),
    });
  }
  return hops;
}

export interface Streak {
  d: string;
  gust: number;
  delay: string;
  width: number;
  fade: number;
}

/** Wind combing across the surface, drawn as tapering strokes. */
export function windStreaks(y0: number, y1: number, count = 16): Streak[] {
  const out: Streak[] = [];
  for (let i = 0; i < count; i++) {
    const t = seeded(i * 2.7);
    const y = r2(y0 + ((y1 - y0) * i) / count + t * 26);
    const x = r2(-300 + seeded(i * 4.9) * 1200);
    const len = r2(110 + seeded(i * 6.1) * 220);
    out.push({
      d: `M${x} ${y} q${r2(len * 0.5)} ${r2(-6 - t * 8)} ${len} ${r2(-2 - t * 5)}`,
      gust: Math.round(300 + t * 320),
      delay: (-seeded(i * 8.3) * 5.5).toFixed(2),
      width: r2(0.9 + t * 1.5),
      fade: r2(0.22 + t * 0.34),
    });
  }
  return out;
}
