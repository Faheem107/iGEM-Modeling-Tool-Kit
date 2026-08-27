import { MODULE_REGISTRY, type ModuleMeta } from "./prongs";
import { PRONG_TITLES } from "@/content/copy";

/**
 * The landing/model index, derived from MODULE_REGISTRY rather than hand-written.
 * Every module already declares which prong selection it belongs to via
 * `appliesTo`, so the columns below are just that predicate read three ways.
 * Add a module to the registry and it appears in the index automatically.
 */

export interface IndexColumn {
  key: string;
  /** Rail label, e.g. "Prong 1". */
  /** Only where the group is not a prong, e.g. "Shared biology". */
  eyebrow?: string;
  title: string;
  lede: string;
  /** Prong query for the links in this column. */
  prongs: string;
  modules: ModuleMeta[];
}

const p1Only = MODULE_REGISTRY.filter(
  (m) => m.appliesTo([1]) && !m.appliesTo([2]),
);
const p2Only = MODULE_REGISTRY.filter(
  (m) => m.appliesTo([2]) && !m.appliesTo([1]),
);
// Everything that needs both prongs present, or neither in particular: the
// whole-system layer. `composite` only applies at length >= 2, so it can only
// be found by asking for the pair.
const shared = MODULE_REGISTRY.filter(
  (m) =>
    m.appliesTo([1, 2]) && !p1Only.includes(m) && !p2Only.includes(m),
);

// The whole-system layer splits at the point the biology stops and the
// material starts, which also keeps the four columns close to even. A single
// ten-item column next to a two-item one reads as an afterthought.
const CELL_SCALES = new Set(["genetic", "molecular", "protein", "ecology"]);
const cellLayer = shared.filter((m) => CELL_SCALES.has(m.scale));
const fieldLayer = shared.filter((m) => !CELL_SCALES.has(m.scale));

export const INDEX_COLUMNS: IndexColumn[] = [
  {
    key: "prong-1",
    eyebrow: "Prong one",
    title: PRONG_TITLES[1],
    lede: "The cells make more of a sticky chain, and the sand is held in it.",
    prongs: "1",
    modules: p1Only,
  },
  {
    key: "prong-2",
    eyebrow: "Prong two",
    title: PRONG_TITLES[2],
    lede: "An enzyme on the cell wall grows CaCO₃ cement, with no ammonia.",
    prongs: "2",
    modules: p2Only,
  },
  {
    key: "cell",
    eyebrow: "Shared biology",
    title: "Cell, Protein and Containment",
    lede: "What is true of the cell whichever route it is running.",
    prongs: "1,2",
    modules: cellLayer,
  },
  {
    key: "field",
    eyebrow: "Shared physics",
    title: "Crust, Field and Cost",
    lede: "What the crust has to survive once it is out there, and what it costs.",
    prongs: "1,2",
    modules: fieldLayer,
  },
];


/** The archived option, kept modelled for comparison. */
export const ARCHIVED_MODULES = MODULE_REGISTRY.filter((m) => m.appliesTo([3]) && !m.appliesTo([1, 2]));

/** Deep link into a module's section inside the workspace. */
export function moduleHref(prongs: string, id: string) {
  return `/model?prongs=${prongs}#mod-${id}`;
}

export const TOTAL_MODULES = MODULE_REGISTRY.length;
