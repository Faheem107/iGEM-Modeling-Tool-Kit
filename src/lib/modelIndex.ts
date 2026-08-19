import { MODULE_REGISTRY, type ModuleMeta } from "./prongs";

/**
 * The landing/model index, derived from MODULE_REGISTRY rather than hand-written.
 * Every module already declares which prong selection it belongs to via
 * `appliesTo`, so the columns below are just that predicate read three ways.
 * Add a module to the registry and it appears in the index automatically.
 */

export interface IndexColumn {
  key: string;
  /** Rail label, e.g. "Prong 1". */
  eyebrow: string;
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
    eyebrow: "Prong 1",
    title: "Polymer Overexpression",
    lede: "γ-PGA bio-adhesive matrix in B. subtilis.",
    prongs: "1",
    modules: p1Only,
  },
  {
    key: "prong-2",
    eyebrow: "Prong 2",
    title: "Carbonic Anhydrase & Sortase",
    lede: "Non-ureolytic MICP, an ammonia-free route to CaCO₃.",
    prongs: "2",
    modules: p2Only,
  },
  {
    key: "cell",
    eyebrow: "Shared biology",
    title: "Cell, Protein and Containment",
    lede: "The layers both engineered prongs run through.",
    prongs: "1,2",
    modules: cellLayer,
  },
  {
    key: "field",
    eyebrow: "Shared physics",
    title: "Crust, Field and Cost",
    lede: "What the crust does once it is out in the desert.",
    prongs: "1,2",
    modules: fieldLayer,
  },
];


/**
 * The rows in the "Wind and cost" group. These are not simulation modules, so
 * they carry their own destinations rather than a prong query: two views on the
 * exposure model, and the commercial case that model prices against.
 */
export interface IndexLink {
  id: string;
  title: string;
  /** The caption under the title, in the same register as a module's scale. */
  meta: string;
  /** A route, or "business" for the modal the component owns. */
  href?: string;
  action?: "business";
}

export const FIELD_LINKS: IndexLink[] = [
  {
    id: "forecast",
    title: "Seasonal forecast",
    meta: "wind climatology",
    href: "/exposure",
  },
  {
    id: "live",
    title: "Live feed",
    meta: "current wind and dust",
    href: "/exposure",
  },
  {
    id: "business",
    title: "Business model",
    meta: "who pays, and for what",
    action: "business",
  },
];

/** The archived option, kept modelled for comparison. */
export const ARCHIVED_MODULES = MODULE_REGISTRY.filter((m) => m.appliesTo([3]) && !m.appliesTo([1, 2]));

/** Deep link into a module's section inside the workspace. */
export function moduleHref(prongs: string, id: string) {
  return `/model?prongs=${prongs}#mod-${id}`;
}

export const TOTAL_MODULES = MODULE_REGISTRY.length;
