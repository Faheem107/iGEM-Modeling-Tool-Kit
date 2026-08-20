# Notes for AI assistants

Read **[README.md](README.md)** first. It explains what this repository is for,
how to install and use the tool, and the license.

## Writing style (applies to all website text)

Keep every user-facing string simple and easy to follow.

- Never use em dashes anywhere. Use a period, a comma, or split the sentence.
- Cut adjectives, filler words, and sentences that do not add information.
- Prefer short, plain sentences. Say the thing directly.
- The only exceptions are the game/Sandyx flavour text, which can be playful, and
  the deeper module bodies, which may stay technical. Even there, no em dashes.
- Do not add AI signatures or credits anywhere (code, commits, or GitHub). Do not
  mention specific AI assistants by name in committed content.

## Component gotchas (see DESIGN.md §14–16)

- **Mol\* viewer** (`components/molstar-viewer.tsx`): give it a real height via the
  `className` (`h-full` on a sized parent, or `h-[NNNpx]`). Never pass
  `absolute inset-0`, it collapses the viewer to 0px and the protein renders
  invisibly. Baseline spin speed is `0.3` (Mol\*'s own default is `1.0`).
- **One title per module:** the workspace already renders each module's title via
  `sectionHeader`. A module component must not render its own title; gate any
  standalone header behind a `showHeader` prop.
- **Aeolian and other modules** should use the shared `Panel` / `ModuleShell` /
  `StatCard` primitives and radii (`rounded-[6px]` / `rounded-[4px]`), not bespoke
  `rounded-2xl` cards or decorative `animate-pulse` tape.
- **Connector lines** must be drawn with
  `src/components/connectors/useMeasuredConnectors.ts`, which measures the real
  DOM rects of the elements it joins. Never hand-place endpoints in a stretched
  viewBox, and never put `vectorEffect="non-scaling-stroke"` on a path whose
  `pathLength` is animated: framer implements `pathLength` as a normalised
  dasharray, and under an anisotropic viewBox transform the two disagree, so a
  "fully drawn" line renders visibly short of its target. That combination is
  what made the old prong branches stop in mid-air.

## Design language

The site follows the discipline of the portfolio at `faheemmmm.xyz`: hairline
rules, a metadata rail, plain text link lists, and weight-on-hover. Concretely:

- **No cards.** Rows are separated by `border-t border-border`, never by a
  filled, rounded, shadowed box. `.plate` is the only surface primitive.
- **Banned:** gradient fills, drop shadows, pill badges, hover lifts,
  `rounded-xl` / `rounded-2xl`, decorative `animate-pulse`.
- **Four utilities carry it** (`app/globals.css`): `.caption` for every label,
  index and unit; `.wght-link` for links (weight thickens on hover, and
  `data-active="true"` reuses that end state); `.wght-head` for headings;
  `.rule-link` for the underline that draws from the leading edge.
- **`.rail-row`** is the signature layout: metadata right-aligned in a
  `--rail` (8.5rem) gutter, content in `1fr`.
- **Colour comes from the dune tokens only.** No raw `slate-*` / `stone-*` /
  `amber-*` Tailwind families anywhere; use `dune-orange`, `dune-teal`,
  `dune-rose`, `dune-maroon` and the semantic `foreground` /
  `muted-foreground` / `border` / `card` tokens.
- **Lexend is loaded as a variable font.** Do not pin a `weight` array in
  `app/layout.tsx`; the hover weight animation needs the axis.

## Responsible & honest use
@.claude/RESPONSIBLE_AI_USE.md
