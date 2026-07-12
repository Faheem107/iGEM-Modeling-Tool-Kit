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

## Responsible & honest use
@.claude/RESPONSIBLE_AI_USE.md
