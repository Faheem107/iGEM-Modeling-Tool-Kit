/**
 * Pure-CSS warm "grain" backdrop, a drop-in replacement for the WebGL
 * GrainGradient shader. It is a static radial dune gradient plus a tiled SVG
 * fractal-noise overlay, so it costs nothing per frame (no WebGL context, no
 * animation loop) and never jitters. Used for the site background and the hero
 * desert scene.
 */

// A single grayscale noise tile (SVG feTurbulence), rasterised once by the
// browser and tiled. Inlined as a data URI so nothing has to load.
export const GRAIN_NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** Warm dune gradient, brighter sand up top in light mode, deep ember in dark. */
export const duneGradient = (light: boolean) =>
  light
    ? "radial-gradient(130% 105% at 50% 6%, #f6e2bd 0%, #ecd3a5 40%, #dcb880 72%, #c89a5e 100%)"
    : "radial-gradient(130% 105% at 50% 4%, #2a1e14 0%, #1c140f 45%, #130d0a 74%, #0b0807 100%)";

/** Style props for the noise overlay div layered over the gradient. */
export const grainOverlayStyle = (light: boolean): React.CSSProperties => ({
  backgroundImage: GRAIN_NOISE,
  backgroundSize: "160px 160px",
  opacity: light ? 0.09 : 0.05,
  mixBlendMode: light ? "multiply" : "soft-light",
});
