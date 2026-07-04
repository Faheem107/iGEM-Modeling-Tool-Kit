# CLAUDE.md

Guidance for working in this repository. Read this before making changes.

## What this is

**NYUAD iGEM 2026 Dry-Lab Toolkit** — an interactive, in-browser modeling suite for the
team's synthetic-biology project: *stabilizing loose desert sand with bacteria-produced
biopolymers to suppress dust storms and aeolian erosion*. It is a dry-lab companion that
takes a user from genetic design → intracellular kinetics → material properties → macro
wind-erosion performance → field economics, all with live, physically-grounded math.

It is a **Next.js 15 / React 19 single-page app** (App Router). There is no backend database;
the only server code is one Gemini-backed advisor API route. All modeling runs client-side.

## The biology: three "prongs"

The project pursues three independent-but-combinable binder strategies. A user picks any
non-empty subset (a single prong is a valid combination) and the app tailors itself.

| Prong | Molecule | Chassis | Strength metric | Physics module(s) |
|------|----------|---------|-----------------|-------------------|
| 1 | poly-γ-glutamic acid (γ-PGA) | engineered *B. subtilis* | shear modulus `G` | `metabolic`, `crosslink` |
| 2 | CaCO₃ via carbonic anhydrase (MICP) | engineered *B. subtilis* | UCS (compressive) | `ca-anchoring`, `caco3` |
| 3 | sodium alginate | **non-bacterial**, applied topically | shear modulus `G` | `alginate` |

Prongs 1 & 2 are "bacterial" and share cell-level modules (FBA, thermal stability, ecological
spread). Prong 3 has no living cells. When ≥2 prongs are active, their cohesions combine into
a single macro driver (see Composite below).

## Architecture

### Routing (`src/App.tsx`)
`app/page.tsx` renders `src/App.tsx` (a `"use client"` component). `App.tsx` is a manual
view-state router (`viewMode` state), not Next routing:
- **Landing page** — hero + prong selection. "Proceed to Model" sets `viewMode = 'simulation'`
  and passes the chosen `selectedProngs` to the workspace.
- **`SimulationWorkspace`** (`src/components/simulation/SimulationWorkspace.tsx`) — the primary
  destination. Dynamically composes a combination-specific set of modules. Has two views:
  **Explore** (all applicable modules) and **Guided** (a stepper narrative).
- **Wet-Lab sandbox** view — `WetLabSandbox2D`.
- `App.tsx` also retains a legacy tabbed portal (`AdvancedFbaPortal`, etc.) for direct module
  access; the workspace is the modern path.

### The shared physics core — `src/lib/physics/` (SINGLE SOURCE OF TRUTH)
**All model equations live here as pure, testable functions.** UI components import them;
they must never re-derive math inline. Import via `../../lib/physics` (barrel `index.ts`).

| File | Responsibility |
|------|----------------|
| `constants.ts` | Every numeric constant. Two tiers: `FUNDAMENTAL` (exact physics) and `CALIBRATION` (empirical `Calib` objects carrying units, source, plausible range, and a `wetlab` note). **No magic numbers elsewhere.** |
| `fba.ts` | Rigorous two-phase simplex LP solver for Flux Balance Analysis (`S·v = 0`): growth-vs-γ-PGA Pareto, pFBA, FVA, in-silico knockouts. |
| `network.ts` | The mass-balanced core metabolic stoichiometry consumed by FBA. |
| `metabolic.ts` | Flux→precursor conversion + intracellular γ-PGA ODE kinetics (RK4). |
| `crosslink.ts` | Prong 1 material: Langmuir binding θ → network density → shear modulus `G = νRT`. |
| `caco3.ts` | Prong 2 material: carbonate speciation → supersaturation (Ω/SI) → ACC→calcite kinetics → `UCS = k·(calcite%)ⁿ` + CO₂ sequestration + Sortase-vs-CWBD anchoring. |
| `alginate.ts` | Prong 3 material: Ca²⁺ egg-box gel modulus, moisture retention, rain-washout half-life. |
| `aeolian.ts` | Macro wind physics: Bagnold threshold friction velocity + saltation mass-flux. The universal endpoint every prong feeds. |
| `composite.ts` | Rule-of-mixtures cohesion combination: `γ_total = Σγ_i + Σ η_ij·√(γ_i·γ_j)`. Used when ≥2 prongs are selected. |

**Data flow:** each prong's material module emits a binder output (γ-PGA→`shearModulus`,
CaCO₃→`ucs`, alginate→`modulus`); the workspace converts each to a cohesion
(`cohesionFromShearModulus` / `cohesionFromUCS`), combines them via `compositeCohesion`, and
feeds `composite.totalCohesion` into `solveAeolian` for the headline macro result.

### Module registry (`src/lib/prongs.ts`)
`MODULE_REGISTRY` is the catalogue of UI modules. Each entry has an `appliesTo(selected)`
predicate encoding the biology (e.g. γ-PGA modules need Prong 1; FBA needs any bacterial
prong; Aeolian/Economic are universal; Composite only appears for ≥2 prongs).
`modulesForSelection()` filters + orders modules micro→macro→synthesis. To add a module,
register it here **and** add its render case in `SimulationWorkspace.renderModule`.

### UI conventions
- Modules lead with a **visual simulation** (Recharts for analytical charts; HTML5 Canvas /
  SVG for physical sims like the crosslink lattice and the wind tunnel). Dense formulae go in
  expandable "Show the math" disclosures.
- Every component takes an `isLightMode` prop and themes both light/dark explicitly via
  Tailwind classes — there is no automatic dark-mode class strategy to rely on.
- shadcn/Radix primitives live in the root `components/` dir; `@/*` path alias → repo root.
- The **Economic Scalability & LCA Engine** (`EconomicScalabilityEngine.tsx`) is the *single*
  owner of deployment cost / carbon-offset math. Do not reintroduce per-hectare cost
  calculations into other modules (e.g. the Aeolian tunnel deliberately delegates economics
  to it rather than duplicating a simpler, inconsistent cost model).

## Calibration & wet-lab grounding
Placeholder empirical constants are flagged with `// WETLAB_TODO` in code and mirrored in
**`WETLAB_TODO.md`**, which lists the experiments needed to ground the models (UCS-vs-calcite
regression, CA pNPA assay, synergy `η_ij` assays, etc.). When you touch a `CALIBRATION`
constant, keep its `wetlab` provenance note and `WETLAB_TODO.md` in sync.

## The Gemini advisor
`app/api/gemini/analyze/route.ts` is the only server route: a POST endpoint that wraps
`@google/genai` to answer as the "Dry Lab iGEM Advisor." It requires `GEMINI_API_KEY` in the
environment and returns a structured `API_KEY_MISSING` error if absent.

## Commands
```bash
npm run dev     # next dev on :3000 (host 0.0.0.0)
npm run build   # production build
npm run start   # serve production build on :3000
npm run lint    # tsc --noEmit  ← the real type gate; run this before finishing
```
Note: `next.config.mjs` sets `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds`,
so **`next build` will NOT catch type errors** — always run `npm run lint` (`tsc --noEmit`)
yourself. The tree is expected to be at 0 TypeScript errors.

## Reference docs in the repo
- `README.md` — project intro.
- `modeling_subteam_theory.md`, `wet_lab_prongs_approach.md`,
  `Research Table iGEM 2026.md`, `Toolkit in layman's terminology.md` — domain background.
- `WETLAB_TODO.md` — required calibration experiments.

## Working agreements
- **Physics belongs in `src/lib/physics/`.** If a component needs a new equation, add a pure
  function there and import it — never inline duplicate math.
- **No magic numbers.** New empirical constants go in `constants.ts` as `Calib` objects with a
  `wetlab` note.
- Keep light/dark theming explicit and consistent with neighboring modules.
- **Git:** commits and PRs for this repo must contain **no AI/Claude authorship tags** — no
  `Co-Authored-By: Claude`, no "Generated with Claude" footers. Match the existing history.
