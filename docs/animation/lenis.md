# Lenis (smooth scroll)

Version 1.3.x, imported as `import Lenis from "lenis"`. One instance for the whole
site, created in `src/components/SmoothScroll.tsx` and exposed as `window.__lenis`.

## Setup (verbatim from SmoothScroll.tsx)

```ts
gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const lenis = new Lenis({
  lerp: 0.12,          // lerp smoothing, feels lighter than a fixed duration
  wheelMultiplier: 1.05,
  touchMultiplier: 1.6,
  smoothWheel: true,
});
window.__lenis = lenis;

lenis.on("scroll", ScrollTrigger.update);      // keep pinned sections in sync
gsap.ticker.add((time) => lenis.raf(time * 1000)); // one shared RAF loop
gsap.ticker.lagSmoothing(0);
```

Key points:

- **Lerp, not duration.** `lerp: 0.12` tracks the input instead of gliding on after
  it. This is what makes the wheel feel responsive rather than heavy.
- **Drive Lenis off `gsap.ticker`,** not its own RAF, so GSAP and Lenis share one
  loop and never fight.
- **`lenis.on("scroll", ScrollTrigger.update)`** is the bridge that keeps GSAP pins
  aligned with the eased scroll.
- **Skip under `prefers-reduced-motion`.** When skipped, `window.__lenis` is never
  set, so every programmatic scroll must fall back to native `scrollIntoView` /
  `window.scrollTo`.

## Programmatic scroll

```ts
window.__lenis?.scrollTo(target, { offset: -70, duration: 1.1 });
// target: number (px) | HTMLElement | selector string
```

- Nav links use `{ offset: -70, duration: 1.1 }` — a bounded eased duration keeps a
  trip up from far down the page predictable (see gsap-scrolltrigger.md for why the
  bounded duration matters next to a pinned section).
- `{ immediate: true }` jumps with no animation (useful in tests / to reset scroll).

## GOTCHA: scrolling to a pinned section lands at the wrong end

`lenis.scrollTo(element)` resolves to the element's current document position. If
that element is the one GSAP pinned with `pinSpacing: true`, GSAP has moved it to
the **bottom of its pin spacer**, so you scroll to the END of the story, not the
start.

Fix: keep the anchor `id` on a stable **outer** wrapper and pin an **inner** child.
The dune story and the design cycle both do this now:

```tsx
<section id="cinematic">           {/* id anchor, stays at the section start */}
  <div ref={scopeRef}>...</div>     {/* this inner div is what ScrollTrigger pins */}
</section>
```

with `ScrollTrigger.create({ trigger: scopeRef.current, pin: true, ... })`.
