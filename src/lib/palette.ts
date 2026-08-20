/**
 * The dune palette as JavaScript values.
 *
 * Most of the site colours through Tailwind classes, which read the CSS custom
 * properties directly. Three places cannot: an SVG `stroke`/`fill` prop, a
 * recharts series colour, and a canvas `fillStyle`. Those took hex literals, and
 * the literals drifted: `#8fb3ac` was retyped 26 times, `#d6884a` 19, and a
 * handful of Tailwind default-palette values (`#f59e0b`, `#ef4444`, `#475569`)
 * were smuggled in by hex to dodge the class-name ban on those families.
 *
 * Import from here instead. These are the same nine values `globals.css`
 * defines, so a change to the brand is still a change in one file.
 */

export const DUNE = {
  maroon: "#6e1e18",
  orange: "#d6884a",
  teal: "#8fb3ac",
  rose: "#c28a7c",
  sand: "#e7d8c4",
  paper: "#fbf7f0",
  basalt: "#241c19",
  slate: "#2e2622",
  ash: "#8a7e75",
  ink: "#1c1512",
} as const;

/**
 * Semantic pairs, light and dark.
 *
 * Anything drawn into a canvas or an SVG has to pick its own colour per theme,
 * because it is not inheriting a CSS variable. These mirror the semantic tokens
 * in `globals.css` so a chart and the panel around it agree.
 */
export const INK = { light: "#2a1a16", dark: "#f3e9db" } as const;
export const MUTED_INK = { light: "#6f6157", dark: "#b3a496" } as const;
export const SURFACE = { light: "#ffffff", dark: DUNE.slate } as const;
export const GROUND = { light: DUNE.paper, dark: DUNE.ink } as const;
export const HAIRLINE = { light: "#e0d3c1", dark: "#43362e" } as const;

/** Pick the right half of a light/dark pair. */
export const pick = (
  pair: { light: string; dark: string },
  isLightMode: boolean,
) => (isLightMode ? pair.light : pair.dark);

/**
 * Series colours for charts, in order.
 *
 * Five is the limit on purpose. A chart that needs a sixth series is a chart
 * that needs splitting, and reaching for a sixth hue is how the Tailwind
 * defaults got in here in the first place.
 */
export const SERIES = [
  DUNE.orange,
  DUNE.teal,
  DUNE.rose,
  DUNE.maroon,
  DUNE.ash,
] as const;

/**
 * Status colours.
 *
 * The old code used Tailwind's amber-500, red-500, green-500 and slate-400 by
 * hex. These are the dune equivalents, and they are the only three states the
 * UI actually distinguishes.
 */
export const STATUS = {
  /** Working, holding, alive. */
  good: DUNE.teal,
  /** Marginal, approaching a limit. */
  warn: DUNE.orange,
  /** Failed, killed, over threshold. */
  bad: DUNE.maroon,
  /** Not applicable, or off. */
  idle: DUNE.ash,
} as const;

/**
 * The tint ramp.
 *
 * A chart needs more than one step of a hue: a fill under a stroke, a light-mode
 * wash under a dark-mode line. The modules were reaching for Tailwind's pastel
 * scales (`orange-100`, `sky-200`, `amber-100`, `cyan-100`) by hex, which put
 * cold blues next to a warm palette and gave four different washes for one idea.
 *
 * Two steps either side of each dune hue, and nothing else.
 */
export const TINT = {
  orangeWash: "#f0dcc6",
  orangeLight: "#e0a878",
  orangeDeep: "#b5702f",

  tealWash: "#d3e2df",
  tealLight: "#a9c6c0",
  tealDeep: "#4a8f86",

  roseWash: "#e8d3cd",
  roseLight: "#cf9d90",
  roseDeep: "#b07568",

  sandWash: "#eae1cd",
  sandLight: "#c4a988",
  sandDeep: "#a88f6f",

  maroonDeep: "#4d1410",
} as const;
