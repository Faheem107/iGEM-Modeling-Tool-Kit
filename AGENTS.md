# Working rules for this repository

`CLAUDE.md` carries the house rules for anything a reader sees: writing style,
tone, information order, and the design language. Read it first. This file is
about how to work, and applies to every assistant and every contributor.

## Working approach

- Read the relevant code, the components near it, and the styles it uses before
  editing.
- Make the smallest coherent change that gets the requested outcome. Avoid
  unrelated refactoring, redesigns, formatting churn, and dependency updates.
- Reuse the existing primitives before writing new ones: `Fold`, `Note`,
  `Panel`, `StatCard`, `Slider`, `ModuleShell` in
  `src/components/simulation/_shared.tsx`, and the `.caption` / `.plate` /
  `.rail-row` / `.wght-head` utilities in `app/globals.css`.
- Avoid new dependencies unless the repository genuinely cannot already do it.
  Seventeen unused ones were removed in August 2026; do not put them back.

## Scientific integrity

- Never invent results, measurements, citations, costs, or stakeholder
  feedback. This is a judged competition entry.
- Keep plans, methods, observations, interpretations and limitations distinct.
- Where a value is missing, leave it a stated absence or a labelled input, not a
  plausible number. `StatCard` renders `value={null}` as "no source yet" for
  exactly this reason.
- Every section that reports a number should be able to say what would make that
  number wrong.

## Frontend quality

- No production CDN dependencies. Bundle it or commit the asset.
- Preserve semantic HTML, keyboard access, focus visibility, labels and
  contrast. Every disclosure needs `aria-expanded`.
- Preserve `prefers-reduced-motion`, and give new animation a reduced-motion
  path.
- Check user-visible work in both themes and at desktop and mobile widths.

## Verification

- `npm run verify` before handing anything over. It runs `tsc --noEmit`, ESLint,
  a production build, and the content-integrity audit.
- Do not claim a check passed unless it was actually run. Report what failed.
- `git diff --check` and read the diff for unrelated changes before committing.
- Commit subjects are short and plain. No AI signature, no `Co-Authored-By`, no
  session trailer, in commits or in committed content. The content audit fails
  the build on the common forms.
