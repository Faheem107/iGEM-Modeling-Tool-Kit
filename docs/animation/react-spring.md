# react-spring (@react-spring/web)

Version 10.x. Added for spring-physics UI reactions where Framer Motion's tweened
feel is less lively. Keep its use **concise** — the repo already has Framer Motion,
so only reach for react-spring when a real spring (a caption that springs in as the
beat changes, a trail) reads better.

```ts
import { useTransition, useSpring, useTrail, animated } from "@react-spring/web";
```

Live example: the beat caption cross-fade in `LandingCinematic.tsx`.

## Caption cross-fade with `useTransition`

`useTransition` is the right tool for "swap A out and B in" on a key change, with
enter/leave springs:

```tsx
const transitions = useTransition(active, {   // `active` is the beat index (state)
  keys: active,
  from:  { opacity: 0, y: 26 },
  enter: { opacity: 1, y: 0 },
  leave: { opacity: 0, y: -20 },
  config: { tension: 260, friction: 26 },
  exitBeforeEnter: false,   // let old + new overlap for a soft hand-off
});

return transitions((style, i) => (
  <animated.div style={style} className="absolute inset-x-0 bottom-0">
    {BEATS[i].label} / {BEATS[i].line}
  </animated.div>
));
```

- Render animated values through `animated.div` (or `animated.span`, etc.), never a
  plain element. The `style` object holds `SpringValue`s that `animated` reads.
- `config: { tension, friction }` is the spring. Higher tension = snappier; higher
  friction = more damped. `{ tension: 260, friction: 26 }` is a lively-but-settled
  caption.
- Presets exist (`config.gentle`, `config.wobbly`, `config.stiff`) via
  `import { config } from "@react-spring/web"` if you want a named feel.

## When NOT to use it

- **Do not drive react-spring from a scroll `progress` value.** Springs are
  time-based; a scrubbed progress and a spring fight each other and stutter. Scrubbed
  motion belongs to GSAP + anime.js (imperative transforms). react-spring is for
  discrete, event-driven state changes (a beat index flipping, a hover, a mount).
- Do not re-implement working Framer Motion (`motion/react`) animations in
  react-spring. Two systems is fine; duplicated systems for the same effect is not.
