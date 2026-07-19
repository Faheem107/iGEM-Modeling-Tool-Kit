# GSAP ScrollTrigger (pin + scrub)

Version 3.15.x. Register once per file that uses it:
`gsap.registerPlugin(ScrollTrigger)`.

Used for the two pinned scroll stories: `LandingCinematic.tsx` (dune story) and
`DesignCycleStory.tsx`.

## The pin + scrub pattern

```ts
const st = ScrollTrigger.create({
  trigger: innerStage,   // pin an INNER element, not the id-bearing section (see lenis.md)
  start: "top top",
  end: "+=3200",         // absolute px of scroll to spend pinned (~4 viewport heights)
  pin: true,
  pinSpacing: true,
  scrub: 0.6,            // smoothing lag in seconds, NOT `true`
  anticipatePin: 1,
  invalidateOnRefresh: true,
  onUpdate: (self) => renderFrame(self.progress), // progress is 0..1
});
```

`renderFrame(progress)` is the single place that positions every layer. It runs
imperatively (writes `style.transform` / `.opacity`) so there is no per-frame React
render. See dune-scroll-story.md.

## The "scroll breaks / animation reverse-plays" fix

Symptom: clicking a nav link that scrolls up past a pinned, scrubbed section made
the section's animation jump and reverse-play in visible steps.

Three causes, three fixes, all applied:

1. **`scrub: true` hard-snaps the timeline to the scroll.** A fast programmatic
   scroll makes it slam through the whole timeline in reverse. Use a smoothing lag,
   `scrub: 0.6`, so the timeline eases toward the scroll position.
2. **Stale pin measurements.** Fonts, images and tall sections settle a frame after
   build, so the pin start/end can be measured wrong. Call `ScrollTrigger.refresh()`
   after mount (double-rAF) and on resize. `ScrollTrigger.config({ ignoreMobileResize:
   true })` stops the mobile URL-bar collapse from re-measuring on every scroll.
   Both live in `SmoothScroll.tsx`.
3. **`anticipatePin: 1`** removes the one-frame jump as the pin engages.

Also give nav `scrollTo` a bounded eased duration (`duration: 1.1`) instead of an
open-ended one, so the trip past the pinned section is predictable.

## Notes

- `pinSpacing: true` inserts a spacer so following content is not pulled up. It also
  moves the pinned element to the spacer bottom when scrolled past — this is why the
  anchor id must be on an outer wrapper (lenis.md gotcha).
- Under `<768px` or `prefers-reduced-motion`, both stories skip the pin entirely and
  render a static frame + a plain list. Always keep that fallback.
- Lenis feeds ScrollTrigger via `lenis.on("scroll", ScrollTrigger.update)`; do not
  add a second RAF for ScrollTrigger.
