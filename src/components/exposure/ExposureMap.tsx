"use client";

import { useEffect, useMemo, useState } from "react";
import { DUNE, HAIRLINE, INK, TINT } from "@/src/lib/palette";
import { EXTENT, H, W, project } from "./mapExtent";
import WindFieldCanvas from "./WindFieldCanvas";
import type { WindField } from "@/src/lib/windField";

export { EXTENT, H, W, project };

/**
 * The shared map for both exposure modules.
 *
 * Plain SVG rather than a tile library: the extent is fixed to the Gulf, there
 * is no basemap to licence, and the whole thing is a few hundred kB of GeoJSON
 * we already ship.
 *
 * The projection is equirectangular with the standard parallel at the middle of
 * the extent, so a degree of longitude is drawn cos(lat) times a degree of
 * latitude. Plate carree without that factor stretches the Gulf about 9 percent
 * horizontally, which is enough to make a coastline look wrong once one is
 * drawn on it.
 *
 * The two marker layers mean different things and are drawn differently on
 * purpose. Ginoux polygons are REGIONAL dust source activity on a 0.1 degree
 * grid. Target sites are point assets. A line between them represents the
 * suspension and drift pathways, never saltating sand, which travels tens of
 * metres. See DUST_EXPOSURE_MODULE_SPEC.md section 2.
 */

interface BoundaryFeature {
  properties: { name: string; iso: string };
  geometry: { type: "MultiPolygon"; coordinates: number[][][][] };
}

/**
 * Countries worth naming on the map. The rest are drawn but left unlabelled:
 * a reader needs the Gulf states to place a site, not every land mass at the
 * edge of the frame.
 */
const LABELLED = new Set([
  "United Arab Emirates", "Oman", "Saudi Arabia", "Qatar",
  "Bahrain", "Kuwait", "Iraq", "Iran",
]);

export interface SourceFeature {
  type: "Feature";
  properties: { source_type: "natural" | "anthro" | "hydro"; foo_threshold: number };
  geometry: { type: "Polygon"; coordinates: number[][][] };
}

export interface TargetSite {
  id: string;
  name: string;
  lat: number;
  lon: number;
  market: string;
  capacityMw?: number;
  nearestSourceKm?: number;
  nearestSourceType?: string;
  nearestSourceFoo?: number;
  nearestSourceLat?: number;
  nearestSourceLon?: number;
}

/** Nested contours: a flat opacity turns four overlapping bands into one wash. */
const FOO_ALPHA: Record<number, number> = { 10: 0.1, 20: 0.2, 40: 0.42, 60: 0.66 };

const SOURCE_COLOR: Record<string, string> = {
  natural: "var(--dune-orange)",
  anthro: "var(--dune-rose)",
  hydro: "var(--dune-teal)",
};

const MARKET_GLYPH: Record<string, string> = {
  solar: "M0,-5 L4.3,2.5 L-4.3,2.5 Z",
  industrial: "M-4,-4 H4 V4 H-4 Z",
  aviation: "M0,-5 L5,4 L0,1.5 L-5,4 Z",
  agriculture: "M0,-5 A5,5 0 1,1 -0.01,-5 Z",
};

export default function ExposureMap({
  sources,
  sites,
  selectedId,
  onSelect,
  driftDeg,
  showSources = true,
  windField = null,
  isLightMode,
}: {
  sources: SourceFeature[];
  sites: TargetSite[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Resultant drift direction, degrees the sand moves toward. */
  driftDeg?: number | null;
  showSources?: boolean;
  /** 10 m wind vectors to animate over the map, or null while loading. */
  windField?: WindField | null;
  isLightMode: boolean;
}) {
  // Country outlines are a map concern, so the map fetches them rather than
  // threading another prop through the workspace. Public domain Natural Earth,
  // clipped and rounded by scripts/fetch_boundaries.py.
  const [borders, setBorders] = useState<BoundaryFeature[]>([]);
  useEffect(() => {
    let live = true;
    fetch("/data/gulf_boundaries.geojson")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (live) setBorders(d.features ?? []); })
      .catch(() => undefined);   // the map still reads without them
    return () => { live = false; };
  }, []);

  const land = useMemo(
    () =>
      borders.map((f) => {
        const d = f.geometry.coordinates
          .map(([ring]) =>
            ring
              .map(([lon, lat], j) => {
                const q = project(lon, lat);
                return `${j === 0 ? "M" : "L"}${q.x.toFixed(1)},${q.y.toFixed(1)}`;
              })
              .join(" ") + " Z",
          )
          .join(" ");

        // Label at the centroid of the largest ring, which after clipping is
        // the part of the country actually on screen.
        let best: number[][] = [];
        let bestArea = -1;
        for (const [ring] of f.geometry.coordinates) {
          let a = 0;
          for (let i = 0; i < ring.length; i++) {
            const [x1, y1] = ring[i];
            const [x2, y2] = ring[(i + 1) % ring.length];
            a += x1 * y2 - x2 * y1;
          }
          if (Math.abs(a) > bestArea) { bestArea = Math.abs(a); best = ring; }
        }
        const cx = best.reduce((t, c) => t + c[0], 0) / (best.length || 1);
        const cy = best.reduce((t, c) => t + c[1], 0) / (best.length || 1);
        return { d, name: f.properties.name, at: project(cx, cy) };
      }),
    [borders],
  );

  const paths = useMemo(
    () =>
      sources.map((f, i) => {
        const ring = f.geometry.coordinates[0];
        const d =
          ring
            .map(([lon, lat], j) => {
              const p = project(lon, lat);
              return `${j === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
            })
            .join(" ") + " Z";
        return { d, ...f.properties, key: i };
      }),
    [sources],
  );

  const selected = sites.find((s) => s.id === selectedId) ?? null;
  const grid = isLightMode ? "rgb(0 0 0 / 0.07)" : "rgb(255 255 255 / 0.07)";

  return (
    <div
      className="relative w-full overflow-hidden rounded-[6px] border border-border"
      style={{ aspectRatio: `${W} / ${H}` }}
    >
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="absolute inset-0 h-full w-full"
      style={{ background: isLightMode ? TINT.tealWash : DUNE.ink }}
      role="img"
      aria-label="Gulf dust source and target site map"
    >
      {/* Land first, so everything else sits on it. The ground colour behind is
          the sea, which is why the Gulf and the Arabian Sea read as water
          without a single extra path. */}
      <g>
        {land.map((c) => (
          <path
            key={c.name}
            d={c.d}
            fill={isLightMode ? TINT.sandWash : "rgb(255 255 255 / 0.05)"}
            stroke="none"
          />
        ))}
      </g>

      {/* graticule, every 2 degrees */}
      <g stroke={grid} strokeWidth={1}>
        {Array.from({ length: 9 }, (_, i) => EXTENT.lonMin + i * 2).map((lon) => (
          <line key={`v${lon}`} x1={project(lon, 0).x} x2={project(lon, 0).x} y1={0} y2={H} />
        ))}
        {Array.from({ length: 9 }, (_, i) => EXTENT.latMin + i * 2).map((lat) => (
          <line key={`h${lat}`} y1={project(0, lat).y} y2={project(0, lat).y} x1={0} x2={W} />
        ))}
      </g>

      {/* degree labels, so the extent is readable without a basemap */}
      <g fontSize={10} fill={isLightMode ? "rgb(0 0 0 / 0.38)" : "rgb(255 255 255 / 0.34)"}>
        {Array.from({ length: 5 }, (_, i) => EXTENT.lonMin + i * 4).map((lon) => (
          <text key={`lx${lon}`} x={project(lon, 0).x + 3} y={H - 5}>{lon}°E</text>
        ))}
        {Array.from({ length: 5 }, (_, i) => EXTENT.latMin + i * 4).map((lat) => (
          <text key={`ly${lat}`} x={4} y={project(0, lat).y - 4}>{lat}°N</text>
        ))}
      </g>

      {/* Ginoux source polygons. The bands are nested contours, so they are drawn
          weakest first and given a stepped alpha: overlapping them at a flat
          opacity smears the whole map into one wash. */}
      {showSources && (
        <g>
          {[10, 20, 40, 60].map((band) => (
            <g key={band}>
              {paths
                .filter((p) => p.foo_threshold === band)
                .map((p) => (
                  <path
                    key={p.key}
                    d={p.d}
                    fill={SOURCE_COLOR[p.source_type]}
                    fillOpacity={FOO_ALPHA[band]}
                    stroke="none"
                  />
                ))}
            </g>
          ))}
        </g>
      )}

      {/* Coastline and borders are drawn AFTER the source polygons, not before.
          Four nested bands of orange over a sand fill will otherwise bury the
          one thing that tells a reader where they are. */}
      <g
        fill="none"
        stroke={isLightMode ? "rgb(0 0 0 / 0.30)" : "rgb(255 255 255 / 0.30)"}
        strokeWidth={1}
        strokeLinejoin="round"
      >
        {land.map((c) => (
          <path key={c.name} d={c.d} />
        ))}
      </g>

      {/* Country names. Set in the caption register and kept quiet: they place
          the reader, they are not data. */}
      <g
        fontSize={11}
        letterSpacing={1.6}
        fill={isLightMode ? "rgb(0 0 0 / 0.42)" : "rgb(255 255 255 / 0.38)"}
        textAnchor="middle"
        aria-hidden
      >
        {land
          .filter((c) => LABELLED.has(c.name))
          .map((c) => (
            <text key={c.name} x={c.at.x} y={c.at.y}>
              {c.name.toUpperCase()}
            </text>
          ))}
      </g>

    </svg>

      {/* The moving wind field sits between the basemap and the marks. Streaks
          over a coastline read as wind; streaks over a site marker just hide
          it, which is why this is two SVG layers and not one. */}
      <WindFieldCanvas field={windField} isLightMode={isLightMode} />

    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    >
      {/* drift pathway from the selected site, pointing upwind to the origin */}
      {selected && driftDeg != null && Number.isFinite(driftDeg) && (
        (() => {
          const p = project(selected.lon, selected.lat);
          const up = ((driftDeg + 180) % 360) * (Math.PI / 180);
          const len = 130;
          const x2 = p.x + Math.sin(up) * len;
          const y2 = p.y - Math.cos(up) * len;
          return (
            <g>
              <defs>
                <marker id="arrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5"
                        orient="auto">
                  <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--dune-orange)" />
                </marker>
              </defs>
              <line
                x1={p.x} y1={p.y} x2={x2} y2={y2}
                stroke="var(--dune-orange)" strokeWidth={2}
                strokeDasharray="6 4" markerEnd="url(#arrow)" opacity={0.85}
              />
            </g>
          );
        })()
      )}

      {/* target sites */}
      <g>
        {sites.map((s) => {
          const p = project(s.lon, s.lat);
          const on = s.id === selectedId;
          return (
            <g
              key={s.id}
              transform={`translate(${p.x},${p.y})`}
              onClick={() => onSelect(s.id)}
              style={{ cursor: "pointer", pointerEvents: "auto" }}
            >
              {on && <circle r={13} fill="var(--dune-orange)" fillOpacity={0.18} />}
              <path
                d={MARKET_GLYPH[s.market] ?? MARKET_GLYPH.industrial}
                fill={on ? "var(--dune-orange)" : isLightMode ? HAIRLINE.dark : INK.dark}
                stroke={isLightMode ? TINT.sandWash : DUNE.ink}
                strokeWidth={1.2}
              />
              <title>{s.name}</title>
            </g>
          );
        })}
      </g>

      {/* the nearest mapped source, and the line to it. Regional context for the
          suspension and drift pathways only, never saltation. */}
      {selected?.nearestSourceLat != null && selected?.nearestSourceLon != null && (
        (() => {
          const a = project(selected.nearestSourceLon!, selected.nearestSourceLat!);
          const b = project(selected.lon, selected.lat);
          return (
            <g>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke="var(--dune-teal)" strokeWidth={1.4} strokeDasharray="3 3" opacity={0.75} />
              <circle cx={a.x} cy={a.y} r={4} fill="none"
                      stroke="var(--dune-teal)" strokeWidth={1.6} />
            </g>
          );
        })()
      )}

      {selected && (
        (() => {
          const p = project(selected.lon, selected.lat);
          const flip = p.x > W * 0.62;
          return (
            <text
              x={p.x + (flip ? -12 : 12)}
              y={p.y + 4}
              textAnchor={flip ? "end" : "start"}
              fontSize={13}
              fontWeight={600}
              fill={isLightMode ? INK.light : INK.dark}
            >
              {selected.name}
            </text>
          );
        })()
      )}
    </svg>
    </div>
  );
}
