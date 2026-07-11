# Dunelock Toolkit — Design System

This document is the single source of truth for the look, feel, and motion of the
NYUAD iGEM 2026 modeling toolkit. It exists to kill the "generic AI dashboard"
aesthetic (rounded pill buttons, colored left/top accent bars, soft drop shadows,
indigo-on-slate everything) and replace it with a deliberate, editorial, earthy
system that matches the **Dunelock** brand.

Every new component and every edit to an existing one must conform to the rules
below. When in doubt, prefer *fewer* elements, *flatter* surfaces, and *hairline*
separation over shadows.

---

## 1. Brand foundation

The palette is taken directly from the Dunelock logo (sky → dune → cemented-grain
cross-section). We do **not** use the old indigo/cyan sci-fi palette anymore.

| Token            | Hex        | Role                                              |
|------------------|------------|---------------------------------------------------|
| `--dune-maroon`  | `#6E1E18`  | Primary ink / headings / primary buttons          |
| `--dune-orange`  | `#D6884A`  | Primary accent (dune band), CTAs, active states   |
| `--dune-teal`    | `#8FB3AC`  | Secondary accent (sky band), info, links          |
| `--dune-rose`    | `#C28A7C`  | Tertiary accent (grain cross-section), highlights |
| `--dune-sand`    | `#E7D8C4`  | Warm surface / card fill (light)                   |
| `--dune-paper`   | `#FBF7F0`  | Page background (light)                            |
| `--dune-basalt`  | `#241C19`  | Page background (dark) — warm near-black, no blue  |
| `--dune-slate`   | `#2E2622`  | Card fill (dark)                                   |
| `--dune-ash`     | `#8A7E75`  | Muted text / captions                             |

**Rule:** semantic status colors (success/warn/error) are drawn from the same
warm family — success = `--dune-teal`, warning = `--dune-orange`, error =
`--dune-maroon`. No stock emerald/rose/indigo tailwind ramps in UI chrome.
(Data-viz series may still use a wider accessible ramp — see §7.)

These are defined as CSS variables in `app/globals.css` and exposed to Tailwind
via `@theme`. Use the tokens, never raw hexes in components.

---

## 2. Typography

- **Headings / display:** **Super Dream** — the rounded retro face that matches
  the Dunelock wordmark. Used for h1–h3, portal titles, hero, section titles.
  Loaded via `@font-face` from `public/fonts/`. Fallback stack:
  `"Super Dream", "Fredoka", "Baloo 2", system-ui, sans-serif` so the site still
  reads on-brand if the file is missing.
- **Body / UI:** **Lexend** (Google font via `next/font`). Weights in use:
  - `300` — long-form captions, muted metadata
  - `400` — body copy
  - `500` — default UI text, labels
  - `600` — emphasized labels, table headers
  - `700` — buttons, small all-caps eyebrows
- **Monospace / numeric:** reserve for actual code/equations only. Numbers in the
  UI use Lexend with `font-variant-numeric: tabular-nums`.
- **Kill the old rule:** the blanket `* { font-family: Montserrat !important }`
  override in `globals.css` is removed. Fonts are assigned by the `@theme` tokens
  (`--font-display`, `--font-sans`) and Tailwind's `font-display` / `font-sans`.
- **Case:** all-caps only for short eyebrows/labels (≤ 3 words) with
  `letter-spacing: 0.15em`. Never all-caps a full heading sentence.

---

## 3. Anti-AI-slop rules (hard constraints)

These are the specific tells the user flagged. Treat each as a lint rule.

1. **No fully-rounded buttons/inputs.** Buttons use `rounded-none` or at most
   `rounded-[3px]` (`--radius-crisp`). Pills (`rounded-full`) are allowed **only**
   for: the theme toggle, avatar/logo, carousel dots, and true "tag/chip" data —
   never for actions.
2. **No colored left-accent or top-accent bars** (`border-l-4`, `border-t-4`
   colored strips on cards). Separation is a **1px hairline** in `--border`, or a
   change of surface tone. Emphasis is done with the heading, not a stripe.
3. **No soft drop shadows** (`shadow-lg/xl/2xl`, colored glows like
   `shadow-indigo-500/20`). Elevation is expressed by (a) a hairline border and
   (b) a one-step surface-tone change. A single, near-flat
   `--shadow-flat: 0 1px 0 rgba(0,0,0,.04)` is the only permitted shadow, used
   sparingly. Retro/arcade game surfaces are exempt (they keep neon/CRT styling).
4. **No glassmorphism stacks** — the page-wide `backdrop-blur` + translucent card
   look is replaced by opaque warm surfaces. One ambient background (the grain
   gradient) is fine; UI panels sit on solid fills.
5. **No gradient ring/`ring-4` focus halos as decoration.** Focus is a 2px solid
   `--dune-orange` outline for accessibility only.
6. **No repetition.** A concept appears once. The three "Back to Portals" buttons,
   duplicated headers, and repeated per-tab summary tiles get consolidated into
   shared components (`<PageHeader>`, `<BackLink>`).

---

## 4. Component conventions (shadcn/ui + motion-primitives)

- We scaffold **shadcn/ui** ("new-york" style is already configured in
  `components.json`) into `components/ui/` and restyle its tokens to the Dunelock
  palette. Use shadcn primitives (`Button`, `Card`, `Dialog`, `Tabs`, `Slider`,
  `Switch`, `Tooltip`, `Separator`) instead of bespoke divs going forward.
  - `Button` variants: `primary` (maroon fill), `accent` (orange fill),
    `outline` (hairline), `ghost`. All square-cornered.
  - `Card`: opaque `--dune-sand`/`--dune-slate` fill, 1px `--border`, **no**
    shadow, `rounded-[4px]`.
- **motion-primitives** (already in `components/motion-primitives/`) supply the
  motion layer and are used **throughout**, not just on the landing page:
  - `TextEffect` — heading/intro reveals (word or char `fade-in-blur`).
  - `AnimatedBackground` — active-tab/nav highlight (already used in the pipeline
    nav; extend to portal cards and sub-nav).
  - `Carousel` — portal chooser and any multi-panel step flow.
  - Add as needed: `InView`/scroll-reveal wrapper for graphs (§6).
- Icons: `lucide-react`, stroke width `1.5`, sized to the text. No filled icon
  chips with colored backgrounds (that's an AI tell) — icons sit inline.

---

## 5. Portal explainer modal (required on every portal open)

When any portal — or any prong **combination** — is opened, a smooth modal
presents a **3-step explainer** before the tool loads. Component:
`<PortalIntro>` driven by data in `src/lib/prongs.ts`.

Three steps, in order, each revealed with `TextEffect`:

1. **What it is** — one plain-language sentence.
2. **What it does** — what the biology/physics accomplishes.
3. **What we plan to model** — the specific quantities/equations this portal
   simulates.

Behavior:
- Appears as a centered, opaque, square-cornered panel (no glass, no big shadow).
- "Enter" dismisses and reveals the tool; a "Don't show again for this portal"
  choice is persisted in `localStorage` so repeat visits aren't nagged.
- Combinations compose their steps from each selected prong plus a combined
  "what we model together" line.

This **replaces** the current always-present prong info modal and unifies it with
portal entry.

---

## 6. Motion & scroll

- **Graph fade-in on scroll:** every chart/plot/canvas is wrapped in a scroll
  reveal (`opacity 0→1`, `y 24→0`, `scale .98→1`, `once: true`, `amount: 0.3`,
  `700ms ease-out`). One shared `<Reveal>` component; do not hand-roll per graph.
- Page/section transitions: 300–500ms, `ease-out`. No bounce on chrome; light
  spring (`bounce ≤ 0.2`) only on playful/mascot elements.
- Respect `prefers-reduced-motion` (already handled globally — keep it).

---

## 7. Data visualization

- Follow the `dataviz` skill for any chart. Series palette derives from the brand
  accents first (orange, teal, rose, maroon), extended with accessible tints only
  when > 4 series.
- Axes/gridlines: hairline `--border`, muted labels in `--dune-ash`. No heavy
  chart borders, no drop-shadowed tooltips.
- **Explain every headline number.** The per-portal summary values at the top of
  each module must either be removed or carry a one-line plain-language caption of
  what the number means and its unit. No bare metric tiles.

---

## 8. Remove / rename (dead or jargon UI)

- Remove decorative status noise that serves no user purpose:
  - `"Cartoon Mode Enabled"` badge (`HighFidelityProteinExplorer.tsx:1098`).
  - `"LP: {status}"` chip (`FbaOptimizationModule.tsx:373`) — fold the solver
    status into a single explained line, not a floating chip.
  - `"Optimal (FBA)"` raw label (`AdvancedFbaPortal.tsx:504`) — replace with a
    human sentence ("Solver found an optimal flux distribution").
- Any button that only toggles a cosmetic label with no functional effect is
  deleted.

---

## 9. Navigation / routing

Portals become real **URLs** (Next.js App Router), so each portal/combination is a
shareable link and the browser back button works:

```
/                         landing
/portal/pipeline          physical pipeline (with ?tab=fba|metabolic|…)
/portal/wet-lab           wet lab sandbox
/portal/protein           3D protein suite
/model?prongs=1,2         prong-tailored simulation workspace
```

The current single-page `viewMode` state machine in `src/App.tsx` is migrated to
route segments under `app/`. Shared chrome (theme toggle, logo home button, global
Sandyx) lives in the root layout.

---

## 10. Logo / home affordance

- The Dunelock logo (`public/dunelock-logo.png`, from `attachments/`) sits in the
  **top-right** as a home button. Clicking it routes to `/` and resets transient
  state (selected prongs, open modals) to the start.
- It is a plain image link — round badge is fine (it's a logo, exempt from the
  no-pills rule), **no** added shadow, ring, or hover glow beyond a subtle
  scale/opacity.

---

## 11. Protein Explorer (PyMOL question)

PyMOL is a **desktop OpenGL application** — it cannot run inside a web page, so it
can't be embedded in this Next.js site directly. The correct web-native, equally
high-fidelity path is **Mol\*** (molstar, the viewer RCSB PDB itself uses) or
**3Dmol.js**. Recommendation: **Mol\*** for publication-quality cartoon/surface
rendering of our real PDB files (already in `public/pdb/`), replacing the
hand-rolled `HighFidelityProteinExplorer` canvas cartoon. PyMOL can still be used
**offline** by the team to render figures/movies that we ship as assets.

---

## 12. Dependencies to add

See the accompanying report. Summary: `shadcn` UI primitives (via `npx shadcn
add …`), `molstar` (protein viewer), and the **Super Dream** font file (not on
Google Fonts — must be supplied). Lexend loads via `next/font/google` (no
download).

---

## 13. Definition of done (per component)

A component is "on-brand" when: square-cornered actions, no drop shadow, no accent
stripe, opaque warm surface, Dunelock tokens (no raw indigo/cyan), Super
Dream headings + Lexend body, motion-primitive reveal on entry, and every headline
number is explained.
