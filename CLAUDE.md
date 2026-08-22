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
- Tone is covered separately below, and the two sections are one rule, not two.
  This one is about the sentence. The next one is about the stance.

## Writing tone (applies to all body copy)

We are undergraduate researchers on an iGEM team. We are not a startup and we are
not selling anything, so nothing on this site should read like a pitch deck. Write
the way a student explains a problem they find genuinely interesting to another
student.

Take the register from Feynman's lectures. Pick the one thing that makes the
mechanism obvious and start there. Simple and clear, still technical, never
softened to sound friendly.

- **No grandiose framing.** "Until now", "nobody is doing this", "everyone pays
  for", "no one has", "the only", "world first". If a sentence positions us as
  having solved what others could not, cut it.
- **No pitch-deck rhythm.** A short punchy line placed to land as a mic drop is
  the thing to avoid, even when the line is true. Write in a slower register,
  sentences that show the reasoning rather than only the conclusion.
- **Reflective, not declarative.** Prefer explaining why a modelling choice was
  made, and what it assumes or leaves out, over asserting a result as fact. Saying
  where a number is uncertain, where a source is missing, or where the model does
  not yet reach is more credible than confidence we have not earned, and it is
  what a judge is actually reading for.
- **Describe existing approaches neutrally.** Panel washing, road sweeping and
  filter replacement are what they are. Say what they cost and what they address.
  Do not reduce them to a phrase like "treats the symptom" in order to leave ours
  looking obviously better.
- **Say what the model does not do.** Every section that reports a number should
  be able to say what would make that number wrong.

Exceptions, unchanged: Sandyx and game flavour text may be playful, and deep
module bodies may stay technical. Neither is licence for the register above, and
no em dashes anywhere, including there.

`WRITING_STYLE.md` is the longer version of this with worked examples. It is
local-only and not committed, so this section has to stand on its own.

## Information order (applies wherever a number is shown)

The two sections above are about the sentence and the stance. This one is about
where the sentence goes. All three are one rule.

**The number or result speaks first, alone.** No sentence sits between a figure
and the next figure explaining what the first one meant. A reader who has not
yet looked at a number should not be reading about it.

The test before keeping any line of explanatory text: does the reader need this
*before* they have seen the number, or *after*? If after, it does not sit above
the fold of that section.

- A clarification goes behind a `Note` (`src/components/simulation/_shared.tsx`),
  or into one caption-size line, or nowhere. Never a body-size paragraph under a
  heading or a number. `Note` collapses to a single muted line and opens to
  prose in place.
- Prefer cutting to relocating. If prose only restates the figure above it,
  delete it. Moving it behind a disclosure keeps clutter that had no reader.
- Editorial commentary is cut, not relocated. Telling the reader how to read a
  result, or answering a question they have not asked, is not a caveat.
- A **conditional** warning tied to the state on screen right now stays visible.
  "Read as a range, this plant has no published price" is not background; it
  says the number in front of the reader is qualified. Background is what goes
  behind the `Note`.
- A missing number renders as a stated absence in the figure's own slot
  ("under $1,000", "no source yet"), never as a sentence where a figure belongs.
- Words that are hard to follow get the dotted glossary underline, via `Term` or
  `GlossaryText`. Not a parenthetical, not a gloss in the next sentence.

**No decorative rules inside a `Fold`, a `Note` or a dialog.** Pass
`rule={false}` to every `StatCard` inside a `Fold`; a single card that keeps its
top rule reads as a stray line across the grid. Spacing separates things. A
hairline is for the boundary between sections, not for the inside of one.

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
