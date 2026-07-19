# anime.js v4 (SVG choreography)

Version 4.5.x. This is the ESM rewrite; the API differs from v3. Import named
helpers, there is no default `anime()` export:

```ts
import { createTimeline, svg, stagger, type Timeline } from "animejs";
```

Live examples: `DesignCycleStory.tsx` and `LandingCinematic.tsx`.

## Build a paused timeline and scrub it

For a scroll story, build the timeline with autoplay off and drive it from
ScrollTrigger by seeking:

```ts
const tl = createTimeline({
  autoplay: false,
  defaults: { ease: "inOutQuad", duration: 800 },
});

// tl.add(target, params, timePosition)
tl.add(bridgeEls,  { draw: ["0 0", "0 1"], duration: 900 }, 0);   // draw-on
tl.add(nodeEls,    { opacity: [0, 1], scale: [0, 1], duration: 500 }, 500);
tl.add(grainEls,   { fill: "#8fb3ac", duration: 700 }, 600);

// each frame, from ScrollTrigger onUpdate:
tl.seek(tl.duration * progress);   // progress 0..1
```

- The **third argument to `tl.add` is the absolute time offset** (ms) on the
  timeline, which is how you place beats. `tl.duration` is the full length.
- `tl.seek(t)` sets the timeline to time `t` without playing — this is the scrub.

## Draw-on paths: `svg.createDrawable`

```ts
const bridgeEls = svg.createDrawable(scope.querySelectorAll(".ds-bridge") as never);
tl.add(bridgeEls, { draw: ["0 0", "0 1"], duration: 900 }, 0);
```

`createDrawable` wraps each path so the `draw` property animates the visible portion:
`"0 0"` (nothing) to `"0 1"` (fully drawn). Pass the NodeList; the `as never` cast is
needed because the repo's types are strict about the target union.

## Function-based values and stagger

```ts
tl.add(grainEls, {
  cx: ((el: SVGElement) => Number(el.dataset.gx)) as never, // per-element target
  cy: ((el: SVGElement) => Number(el.dataset.gy)) as never,
  delay: stagger(7),          // 7ms between elements
});
```

## Gotchas

- **`scale` on SVG elements needs a transform box.** Set inline
  `style={{ transformBox: "fill-box", transformOrigin: "center" }}` on the element,
  or the scale pivots from the SVG origin.
- **Animating `fill` from a gradient URL to a solid colour does not interpolate.**
  If a shape is `fill="url(#grad)"`, an anime `fill: "#rrggbb"` tween will not blend
  smoothly. Use a solid start colour if you need to tween fill, or change the colour
  a different way.
- Keep the timeline **paused** for scrubbed stories; never `autoplay`. Autoplay +
  seek fight each other.
- Clean up with `tl.revert?.()` on unmount.
