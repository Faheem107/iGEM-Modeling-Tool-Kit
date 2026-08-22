"use client";

import { useEffect, useMemo, useState } from "react";
import { DUNE, HAIRLINE, INK, TINT } from "@/src/lib/palette";
import { EXTENT, H, W, project } from "./mapExtent";
import { useMapView } from "./useMapView";
import WindFieldCanvas from "./WindFieldCanvas";
import type { WindField } from "@/src/lib/windField";
import type { CamsClimatology } from "@/src/lib/camsDust";

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
  /** Groups the picker. Assigned by polygon, not by latitude band. */
  emirate: string;
  /** The original OSM name where an English one had to be resolved. */
  nameLocal?: string;
  /** Which route produced `name`: name:en, int_name, override, transliterated. */
  nameSource?: string;
  capacityMw?: number;
  nearestSourceKm?: number;
  nearestSourceType?: string;
  nearestSourceFoo?: number;
  nearestSourceLat?: number;
  nearestSourceLon?: number;
}

/** Nested contours, so the alpha steps: a flat one smears them into a wash. */
const FOO_ALPHA: Record<number, number> = { 10: 0.13, 20: 0.24, 40: 0.42, 60: 0.62 };

/**
 * Source colours per theme. Orange over the light-mode sand wash is the same
 * warm family as the land under it, which is why band 10 was invisible; maroon
 * separates from both sand and sea. Dark mode keeps orange against near-black.
 *
 * MapLegend imports this rather than repeating the values, which drifted before.
 */
export const SOURCE_COLOR_LIGHT: Record<string, string> = {
  natural: DUNE.maroon,
  anthro: "#8a5a2b",
  hydro: "#2f6f66",
};

export const SOURCE_COLOR_DARK: Record<string, string> = {
  natural: DUNE.orange,
  anthro: DUNE.rose,
  hydro: DUNE.teal,
};

export const sourceColor = (kind: string, isLightMode: boolean) =>
  (isLightMode ? SOURCE_COLOR_LIGHT : SOURCE_COLOR_DARK)[kind] ??
  (isLightMode ? DUNE.maroon : DUNE.orange);

export const FOO_BANDS = [10, 20, 40, 60] as const;
export { FOO_ALPHA };

/**
 * The airborne dust ramp, which is a different quantity from the source
 * colours above and must not read like them.
 *
 * Ginoux says where dust is RAISED, on a mask published for March to May only.
 * CAMS says where dust IS, month by month. Reading one as the other is the
 * error DUST_EXPOSURE_MODULE_SPEC.md section 7 warns against, so the two layers
 * get different hues, different shapes and separate names in the legend.
 *
 * Breaks are quintiles of the whole 2020-2024 monthly distribution, fixed
 * rather than rescaled per season. Rescaling would give winter the same colours
 * as summer and hide the six-fold difference the data actually shows: the
 * seasonal medians are 89, 149, 210 and 83 ug/m3 for DJF, MAM, JJA and SON.
 *
 * A linear ramp reads as flat here. The field spans 1.5 to 3896 ug/m3 with a
 * median of 121, so almost every cell would land in the bottom tenth of it.
 */
export const DUST_BREAKS = [40, 90, 180, 350, 600] as const;
// Capped well below the source bands' 0.62. This layer covers the entire
// frame, so at the alpha a standalone choropleth would use it buries the
// coastline and the source polygons both.
const DUST_ALPHA = [0.04, 0.09, 0.15, 0.22, 0.3, 0.38] as const;

/** Index into DUST_ALPHA for a concentration in ug/m3. */
export function dustBand(ugM3: number): number {
  let i = 0;
  while (i < DUST_BREAKS.length && ugM3 >= DUST_BREAKS[i]) i++;
  return i;
}

/** Ash in light mode, sand in dark: a neutral haze either way, and neither is
 *  one of the three saturated source hues. */
export const dustColor = (isLightMode: boolean) =>
  isLightMode ? DUNE.ash : DUNE.sand;

export const dustOpacity = (ugM3: number) => DUST_ALPHA[dustBand(ugM3)];
export { DUST_ALPHA };

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
  camsClim = null,
  dustMonths,
  showDust = true,
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
  /** Seasonal airborne dust, or null while the file loads. */
  camsClim?: CamsClimatology | null;
  /** 1-based calendar months to average the dust over. */
  dustMonths: readonly number[];
  showDust?: boolean;
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

  /**
   * One rect per CAMS cell, averaged over the chosen months.
   *
   * The grid is 1 degree over exactly the map extent, so a cell key maps
   * straight onto a rect with no reprojection. Rects are grown by half a
   * hairline on the right and bottom: at fractional zoom levels the browser
   * rounds adjacent edges apart and a lattice of pale seams appears over the
   * whole Gulf.
   */
  const dustCells = useMemo(() => {
    if (!camsClim) return [];
    const step = camsClim.step;
    const out: { key: string; x: number; y: number; w: number; h: number; v: number }[] = [];
    for (const [key, cell] of Object.entries(camsClim.cells)) {
      const [lat, lon] = key.split(",").map(Number);
      const vals = dustMonths
        .map((m) => cell.monthly[m - 1])
        .filter((v): v is number => typeof v === "number");
      if (!vals.length) continue;
      const v = vals.reduce((t, x) => t + x, 0) / vals.length;
      const a = project(lon, lat + step);
      const b = project(lon + step, lat);
      out.push({ key, x: a.x, y: a.y, w: b.x - a.x + 0.5, h: b.y - a.y + 0.5, v });
    }
    return out;
  }, [camsClim, dustMonths]);

  const selected = sites.find((s) => s.id === selectedId) ?? null;
  const grid = isLightMode ? "rgb(0 0 0 / 0.07)" : "rgb(255 255 255 / 0.07)";

  // `k` is the magnification; strokes and font sizes below divide by it.
  const { view, scale: k, atFullExtent, hostRef, reset, zoomBy, moved, handlers } = useMapView();
  const box = `${view.x} ${view.y} ${view.w} ${view.h}`;

  // Names only past this zoom, or the markers become a wall of text.
  const showSiteLabels = k >= 3.5;

  return (
    <div
      ref={hostRef}
      data-lenis-prevent
      className="relative w-full touch-none overflow-hidden rounded-[6px] border border-border"
      style={{ aspectRatio: `${W} / ${H}`, cursor: atFullExtent ? "default" : "grab" }}
      {...handlers}
    >
    <svg
      viewBox={box}
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

      {/* Airborne dust for the chosen season. Under the graticule and the
          source polygons, because it is context for both rather than a mark
          of its own, and it covers the entire frame. */}
      {showDust && dustCells.length > 0 && (
        <g shapeRendering="crispEdges">
          {dustCells.map((c) => (
            <rect
              key={c.key}
              x={c.x}
              y={c.y}
              width={c.w}
              height={c.h}
              fill={dustColor(isLightMode)}
              fillOpacity={dustOpacity(c.v)}
            />
          ))}
        </g>
      )}

      {/* graticule, every 2 degrees */}
      <g stroke={grid} strokeWidth={1 / k}>
        {Array.from({ length: 9 }, (_, i) => EXTENT.lonMin + i * 2).map((lon) => (
          <line key={`v${lon}`} x1={project(lon, 0).x} x2={project(lon, 0).x} y1={0} y2={H} />
        ))}
        {Array.from({ length: 9 }, (_, i) => EXTENT.latMin + i * 2).map((lat) => (
          <line key={`h${lat}`} y1={project(0, lat).y} y2={project(0, lat).y} x1={0} x2={W} />
        ))}
      </g>

      {/* degree labels, so the extent is readable without a basemap */}
      {/* Pinned to the visible window so they stay on screen when zoomed. */}
      <g fontSize={10 / k} fill={isLightMode ? "rgb(0 0 0 / 0.38)" : "rgb(255 255 255 / 0.34)"}>
        {Array.from({ length: 17 }, (_, i) => EXTENT.lonMin + i).map((lon) => (
          <text key={`lx${lon}`} x={project(lon, 0).x + 3 / k} y={view.y + view.h - 5 / k}>
            {lon}°E
          </text>
        ))}
        {Array.from({ length: 18 }, (_, i) => EXTENT.latMin + i).map((lat) => (
          <text key={`ly${lat}`} x={view.x + 4 / k} y={project(0, lat).y - 4 / k}>
            {lat}°N
          </text>
        ))}
      </g>

      {/* Ginoux source polygons. The bands are nested contours, so they are drawn
          weakest first and given a stepped alpha: overlapping them at a flat
          opacity smears the whole map into one wash. */}
      {showSources && (
        <g>
          {FOO_BANDS.map((band) => (
            <g key={band}>
              {paths
                .filter((p) => p.foo_threshold === band)
                .map((p) => (
                  <path
                    key={p.key}
                    d={p.d}
                    fill={sourceColor(p.source_type, isLightMode)}
                    fillOpacity={FOO_ALPHA[band]}
                    /* Outline the weakest band only: the rest read by fill. */
                    stroke={band === 10 ? sourceColor(p.source_type, isLightMode) : "none"}
                    strokeWidth={band === 10 ? 1 / k : 0}
                    strokeOpacity={band === 10 ? 0.75 : 0}
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
        strokeWidth={1 / k}
        strokeLinejoin="round"
      >
        {land.map((c) => (
          <path key={c.name} d={c.d} />
        ))}
      </g>

      {/* Country names. Set in the caption register and kept quiet: they place
          the reader, they are not data. */}
      <g
        fontSize={11 / k}
        letterSpacing={1.6 / k}
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
      <WindFieldCanvas field={windField} view={view} isLightMode={isLightMode} />

    <svg
      viewBox={box}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    >
      {/* The drift and suspension pathway: drawn FROM upwind INTO the site, so
          the arrowhead lands on the receptor. It used to be drawn the other
          way, pointing back at the origin, which reads as sand leaving. */}
      {selected && driftDeg != null && Number.isFinite(driftDeg) && (
        (() => {
          const p = project(selected.lon, selected.lat);
          const up = ((driftDeg + 180) % 360) * (Math.PI / 180);
          const len = 130 / k;
          const x1 = p.x + Math.sin(up) * len;
          const y1 = p.y - Math.cos(up) * len;
          return (
            <g>
              <defs>
                {/* Namespaced: a bare id="arrow" collides the moment two maps
                    are on one page, and SVG marker ids are document-global. */}
                <marker id="exposure-drift-arrow" markerWidth="7" markerHeight="7"
                        refX="5" refY="3.5" orient="auto">
                  <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--dune-orange)" />
                </marker>
              </defs>
              <line
                x1={x1} y1={y1} x2={p.x} y2={p.y}
                stroke="var(--dune-orange)" strokeWidth={2 / k}
                strokeDasharray={`${6 / k} ${4 / k}`} markerEnd="url(#exposure-drift-arrow)"
                opacity={0.9}
              />
            </g>
          );
        })()
      )}

      {/* Target sites. There are a few hundred of them now, so markers off the
          visible window are skipped rather than drawn and clipped, and the
          glyph carries its own inverse scale so it stays the size it was drawn
          at instead of growing into a blob as the reader zooms in. */}
      <g>
        {sites.map((s) => {
          const p = project(s.lon, s.lat);
          const pad = 20 / k;
          if (
            p.x < view.x - pad || p.x > view.x + view.w + pad ||
            p.y < view.y - pad || p.y > view.y + view.h + pad
          ) {
            return null;
          }
          const on = s.id === selectedId;
          const flip = p.x > view.x + view.w * 0.7;
          return (
            <g
              key={s.id}
              transform={`translate(${p.x},${p.y}) scale(${1 / k})`}
              /* A pan starting on a marker must not also select it. */
              onClick={(e) => { if (!moved(e)) onSelect(s.id); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(s.id);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`${s.name}, ${s.market}`}
              aria-pressed={on}
              style={{ cursor: "pointer", pointerEvents: "auto" }}
            >
              {/* An invisible disc gives the 10 unit glyph a target big enough
                  to hit on a touch screen. */}
              <circle r={12} fill="transparent" />
              {on && <circle r={13} fill="var(--dune-orange)" fillOpacity={0.18} />}
              <path
                d={MARKET_GLYPH[s.market] ?? MARKET_GLYPH.industrial}
                fill={on ? "var(--dune-orange)" : isLightMode ? HAIRLINE.dark : INK.dark}
                stroke={isLightMode ? TINT.sandWash : DUNE.ink}
                strokeWidth={1.2}
              />
              {showSiteLabels && !on && (
                <text
                  x={flip ? -9 : 9}
                  y={3.5}
                  textAnchor={flip ? "end" : "start"}
                  fontSize={10}
                  fill={isLightMode ? "rgb(0 0 0 / 0.62)" : "rgb(255 255 255 / 0.6)"}
                  style={{ pointerEvents: "none" }}
                >
                  {s.name}
                </text>
              )}
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
                    stroke="var(--dune-teal)" strokeWidth={1.4 / k}
                    strokeDasharray={`${3 / k} ${3 / k}`} opacity={0.75} />
              <circle cx={a.x} cy={a.y} r={4 / k} fill="none"
                      stroke="var(--dune-teal)" strokeWidth={1.6 / k} />
            </g>
          );
        })()
      )}

      {selected && (
        (() => {
          const p = project(selected.lon, selected.lat);
          const flip = p.x > view.x + view.w * 0.62;
          return (
            <text
              x={p.x + (flip ? -12 : 12)}
              y={p.y + 4}
              textAnchor={flip ? "end" : "start"}
              fontSize={13 / k}
              fontWeight={600}
              fill={isLightMode ? INK.light : INK.dark}
            >
              {selected.name}
            </text>
          );
        })()
      )}
    </svg>

      {/* plate-solid because these sit on the map, and the glyphs are larger
          than the caption register: a muted + at caption size is not legible
          over a coastline. */}
      <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => zoomBy(1.6)}
          aria-label="Zoom in"
          className="plate-solid plate-interactive flex h-7 w-7 items-center justify-center rounded-[4px] border border-border text-[15px] leading-none text-foreground"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.6)}
          aria-label="Zoom out"
          disabled={atFullExtent}
          className="plate-solid plate-interactive flex h-7 w-7 items-center justify-center rounded-[4px] border border-border text-[15px] leading-none text-foreground disabled:opacity-35"
        >
          −
        </button>
        {!atFullExtent && (
          <button
            type="button"
            onClick={reset}
            aria-label="Reset the map view"
            className="plate-solid plate-interactive caption rounded-[4px] border border-border px-1.5 py-1"
          >
            reset
          </button>
        )}
        {!atFullExtent && (
          <p className="plate-solid caption rounded-[4px] px-1.5 py-0.5">
            {k.toFixed(1)}x
          </p>
        )}
      </div>
    </div>
  );
}
