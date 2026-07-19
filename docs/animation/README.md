# Landing animation stack

This folder documents the animation libraries the landing page uses and how they
fit together, so a future session can extend the scroll story without relearning
each API from scratch. Everything here is grounded in code that is live in the
repo and verified in the browser, not from memory.

## Installed versions (package.json)

| Library | Version | Import | Role on the landing |
|---|---|---|---|
| `lenis` | 1.3.x | `import Lenis from "lenis"` | Site-wide smooth scroll. One instance on `window.__lenis`. |
| `gsap` | 3.15.x | `import { gsap } from "gsap"` + `import { ScrollTrigger } from "gsap/ScrollTrigger"` | Pin + scrub for the scroll stories. |
| `animejs` | 4.5.x | `import { createTimeline, svg, stagger } from "animejs"` | SVG path draw / morph, scrubbed by `seek`. |
| `@react-spring/web` | 10.x | `import { useTransition, useSpring, animated } from "@react-spring/web"` | Spring-physics UI reactions (caption cross-fade). |
| `motion` (Framer Motion) | 12.x | `import { motion, useScroll, useTransform } from "motion/react"` | Simple opacity / parallax transforms, hero + modals. |

There is no three.js / R3F and no `@studio-freight/lenis` (that is the old package
name; we use `lenis`).

## Which library owns what, and why

- **Scroll position** is always Lenis. It drives the real window scroll (no CSS
  transform hijack), so both Framer `useScroll` and GSAP ScrollTrigger keep working
  against an eased scroll. See `src/components/SmoothScroll.tsx`.
- **Pinned, scrubbed stories** (the dune story, the design cycle) are GSAP
  ScrollTrigger. GSAP owns the pin and gives you a normalized `self.progress`.
- **SVG choreography inside a scrubbed story** is anime.js: build a paused timeline,
  then `tl.seek(tl.duration * progress)` each frame. Draw-on effects use
  `svg.createDrawable`.
- **Discrete, event-driven springs** (a caption swapping when the beat changes) are
  react-spring. Do not use react-spring for scrub-driven motion; springs are
  time-based and fight a scrubbed progress value.
- **Framer Motion** stays for the hero text, modals, and the odd `useTransform`
  parallax. Keep it; do not port working Framer code to another library for its own
  sake.

## The golden rule for scrubbed scenes

Update the DOM **imperatively** inside the ScrollTrigger `onUpdate`, not through
React state, when it needs to run every frame. Writing React state per frame causes
re-renders and jank. The dune story writes `element.style.transform` / `.opacity`
directly and only calls `setState` when the integer beat index changes. See
`dune-scroll-story.md`.

## Files

- `lenis.md` — smooth scroll setup, `scrollTo`, the pinned-anchor gotcha.
- `gsap-scrolltrigger.md` — pin, scrub smoothing, refresh, the "scroll breaks" fix.
- `animejs-v4.md` — v4 timeline API, `svg.createDrawable`, seeking.
- `react-spring.md` — `useTransition` for the caption, config.
- `dune-scroll-story.md` — architecture of `LandingCinematic` (the desert→crust story).
