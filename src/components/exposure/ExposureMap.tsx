"use client";

import { useMemo } from "react";

/**
 * The shared map for both exposure modules.
 *
 * Plain SVG on an equirectangular projection rather than a tile library: the
 * extent is fixed to the Gulf, there is no basemap to licence, and the whole
 * thing is a few hundred kB of GeoJSON we already ship.
 *
 * The two marker layers mean different things and are drawn differently on
 * purpose. Ginoux polygons are REGIONAL dust source activity on a 0.1 degree
 * grid. Target sites are point assets. A line between them represents the
 * suspension and drift pathways, never saltating sand, which travels tens of
 * metres. See DUST_EXPOSURE_MODULE_SPEC.md section 2.
 */

export const EXTENT = { lonMin: 44, lonMax: 60, latMin: 16, latMax: 33 };
const W = 800;
const H = Math.round((W * (EXTENT.latMax - EXTENT.latMin)) / (EXTENT.lonMax - EXTENT.lonMin));

export const project = (lon: number, lat: number) => ({
  x: ((lon - EXTENT.lonMin) / (EXTENT.lonMax - EXTENT.lonMin)) * W,
  y: ((EXTENT.latMax - lat) / (EXTENT.latMax - EXTENT.latMin)) * H,
});

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
  isLightMode,
}: {
  sources: SourceFeature[];
  sites: TargetSite[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Resultant drift direction, degrees the sand moves toward. */
  driftDeg?: number | null;
  showSources?: boolean;
  isLightMode: boolean;
}) {
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
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto rounded-[6px] border border-border"
      style={{ background: isLightMode ? "#faf5ec" : "#191311" }}
      role="img"
      aria-label="Gulf dust source and target site map"
    >
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
      <g fontSize={9} fill={isLightMode ? "rgb(0 0 0 / 0.38)" : "rgb(255 255 255 / 0.34)"}>
        {Array.from({ length: 5 }, (_, i) => EXTENT.lonMin + i * 4).map((lon) => (
          <text key={`lx${lon}`} x={project(lon, 0).x + 3} y={H - 5}>{lon}E</text>
        ))}
        {Array.from({ length: 5 }, (_, i) => EXTENT.latMin + i * 4).map((lat) => (
          <text key={`ly${lat}`} x={4} y={project(0, lat).y - 4}>{lat}N</text>
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
              style={{ cursor: "pointer" }}
            >
              {on && <circle r={13} fill="var(--dune-orange)" fillOpacity={0.18} />}
              <path
                d={MARKET_GLYPH[s.market] ?? MARKET_GLYPH.industrial}
                fill={on ? "var(--dune-orange)" : isLightMode ? "#3a2a24" : "#f3e9db"}
                stroke={isLightMode ? "#faf5ec" : "#191311"}
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
              fill={isLightMode ? "#2a1a16" : "#f3e9db"}
            >
              {selected.name}
            </text>
          );
        })()
      )}
    </svg>
  );
}
