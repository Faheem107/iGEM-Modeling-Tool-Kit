/**
 * NYUAD iGEM 2026 — Dry-Lab Physics Core (single source of truth)
 * ==============================================================
 * Every model equation lives here as a pure, testable function so the FBA portal, the
 * simulation workspace, and the wet-lab sandbox all compute the SAME physics.
 * Import from '@/src/lib/physics' (or relative) — never re-derive inline.
 */

export * from './constants';
export * from './fba';
export * from './network';
export * from './metabolic';
export * from './crosslink';
export * from './caco3';
export * from './alginate';
export * from './aeolian';
export * from './grainsize';
export * from './curing';
export * from './composite';
export * from './interactions';
export * from './economic';
export * from './ecology';
