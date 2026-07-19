# Dune scroll story architecture (`LandingCinematic.tsx`)

The landing `#cinematic` section is one pinned, scroll-scrubbed shot that reads as a
single continuous zoom: **wide desert → down into a grain and a B. subtilis cell →
γ-PGA polymer locking grain to grain → pull back to a stabilized crust.** No hard
cuts; layers cross-fade over a continuous camera scale.

## Files

- `src/components/LandingCinematic.tsx` — orchestrator + the three scene SVGs
  (`DesertScene`, `MicroScene`, `CrustScene`) and the caption block.
- `src/lib/dune-story/geometry.ts` — seeded, SSR-stable geometry (dune paths, grain
  blobs, polymer bridges, crystal lattice). Pure maths, no DOM.
- `src/components/dune-story/SandParticles.tsx` — Canvas 2D drifting sand, own RAF,
  reads scroll progress from a ref.

## The progress model

GSAP ScrollTrigger pins the inner stage and gives `progress` 0..1 (see
gsap-scrolltrigger.md). A single `renderFrame(progress)` positions every layer
**imperatively** (writes `style.transform` and `style.opacity`); it only calls React
`setActive` when the integer beat index changes, so there is no per-frame re-render.

Layers are three absolutely-stacked `<div>`s, each holding a full-bleed SVG
(`viewBox="0 0 1200 800"`, `preserveAspectRatio="xMidYMid slice"`). `renderFrame`
scales + fades them:

| progress | desert | micro | crust | caption |
|---|---|---|---|---|
| 0.00–0.12 | scale 1, full | hidden | hidden | The problem |
| 0.12–0.31 | scales up to ~7×, fades out | fades/scales in from ~2.5× | hidden | dive |
| 0.31–0.46 | gone | settled at 1× | hidden | Micro scale |
| 0.46–0.72 | gone | holds; polymer draws (anime seek) | hidden | The fix |
| 0.72–0.86 | gone | scales down + fades out | fades in from ~1.45× | pull back |
| 0.86–1.00 | gone | gone | settled at 1× | The result |

Seamlessness comes from **overlapping fade windows** (desert fades 0.20–0.31 while
micro fades in 0.16–0.30, so both are visible mid-dive — never a blank frame) plus a
**continuous scale** on each wrapper. `smooth(x, a, b)` is a smoothstep used for
every ramp.

The desert wrapper's `transform-origin` is set to the dive patch (`54% 70%`) so the
zoom heads into the sand where Sandyx stands, selling a match-cut into the micro
world.

## Library split (matches docs/animation/README.md)

- GSAP ScrollTrigger: pin + `progress`.
- Imperative `style` writes: the scene scale/opacity every frame.
- anime.js: `MicroScene` polymer bridges draw-on (`svg.createDrawable`) + cross-link
  node pops, scrubbed via `tl.seek(tl.duration * smooth(p, 0.46, 0.72))`.
- react-spring: the beat caption cross-fade (`useTransition`).
- Canvas 2D: `SandParticles`, faded by progress (heavy in the desert, thin
  underground, calm haze on the crust).

## Invariants to keep

- **SSR stability.** All geometry is seeded and rounded (`r2`) so server and client
  markup match. Do not introduce `Math.random()` in render.
- **Anchor id on the outer `<section>`, pin the inner scope div** (lenis.md gotcha),
  or nav "Story" lands at the end of the story.
- **Keep the reduced-motion / `<768px` fallback:** no pin, a single representative
  frame, and the four beats as a list inside a legibility card.
- **Preserve the `sandyx:overview` window-event listener** — "see how we model this"
  in the Sandyx adventure scrolls back here through it.
- The rotating-molecule component `MolecularHero.tsx` is no longer used by the
  landing (kept on disk); its 3D projection maths can be reused if a future beat
  needs a spinning molecule.
