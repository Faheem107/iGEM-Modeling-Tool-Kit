import { Workflow, Bug, Dna, FlaskConical } from "lucide-react";
import type { ReactNode } from "react";
import { PRONGS } from "./portalsData";

// The 3-step explainer shown when a portal (or a prong combination) is opened —
// what it is / what it does / what we plan to model. See DESIGN.md §5.

export interface IntroStep {
  label: string;
  body: string;
}

export interface PortalIntroContent {
  /** localStorage key so a per-portal "don't show again" choice can be remembered. */
  storageKey: string;
  title: string;
  icon: ReactNode;
  steps: [IntroStep, IntroStep, IntroStep];
}

export const PORTAL_INTROS: Record<
  "pipeline" | "wet-lab" | "protein",
  PortalIntroContent
> = {
  pipeline: {
    storageKey: "portal-intro:pipeline-fba",
    title: "Flux Balance Analysis",
    icon: <Workflow className="w-7 h-7 text-dune-teal" />,
    steps: [
      {
        label: "What it is",
        body: "A constraint-based model of the engineered B. subtilis metabolism — the mathematical core that decides how the cell splits its carbon between growing and making bio-adhesive.",
      },
      {
        label: "What it does",
        body: "It solves a real linear program on the mass-balanced reaction network (S·v = 0, subject to the glucose and oxygen limits you set) to find the best the cell can do — then lets you knock out genes and watch the carbon re-route.",
      },
      {
        label: "What we plan to model",
        body: "The optimal flux distribution: the maximum γ-PGA (or carbonic-anhydrase) yield, the growth trade-off (production envelope), and which reactions are the true bottlenecks.",
      },
    ],
  },
  "wet-lab": {
    storageKey: "portal-intro:wet-lab",
    title: "Wet Lab Sandbox",
    icon: <Bug className="w-7 h-7 text-dune-orange" />,
    steps: [
      {
        label: "What it is",
        body: "A 2-D sandbox that mirrors the physical bench assays the wet-lab team runs on treated sand.",
      },
      {
        label: "What it does",
        body: "It simulates the engineered biopolymer spreading across a sand bed so you can watch a cohesive crust form under conditions you set.",
      },
      {
        label: "What we plan to model",
        body: "Surface coverage, propagation rate, and crust cohesion — driven by the same γ-PGA yield and shear-modulus values the pipeline computes.",
      },
    ],
  },
  protein: {
    storageKey: "portal-intro:protein",
    title: "3D Protein Suite",
    icon: <Dna className="w-7 h-7 text-dune-rose" />,
    steps: [
      {
        label: "What it is",
        body: "A structural viewer for the engineered enzymes at the heart of the project — carbonic anhydrase and the sortase anchor.",
      },
      {
        label: "What it does",
        body: "It renders the real deposited PDB structures in 3-D and simulates how the protein fold destabilises as temperature climbs.",
      },
      {
        label: "What we plan to model",
        body: "Thermal stability of the enzyme — the fraction of protein that stays correctly folded and active across the desert's temperature swings.",
      },
    ],
  },
};

/**
 * Build the explainer for a prong-tailored /model run by composing each selected
 * prong's own summary, plus a combined "what we model together" line.
 */
export function buildModelIntro(prongIds: number[]): PortalIntroContent {
  const chosen = PRONGS.filter((p) => prongIds.includes(p.id));
  const key = prongIds.slice().sort().join(",");

  const names = chosen.map((p) => p.title);
  const namesJoined =
    names.length <= 1
      ? names[0] ?? "your selection"
      : names.slice(0, -1).join(", ") + " and " + names[names.length - 1];

  return {
    storageKey: `portal-intro:model:${key}`,
    // Title carries the selected prong(s), e.g. "Tailored Simulation of γ-PGA …".
    title:
      chosen.length === 0
        ? "Tailored Simulation"
        : `Tailored Simulation of ${namesJoined}`,
    icon: <FlaskConical className="w-7 h-7 text-dune-orange" />,
    steps: [
      {
        label: "What it is",
        body:
          chosen.length === 0
            ? "A simulation workspace tailored to the engineering prongs you picked."
            : `A simulation workspace tailored to ${namesJoined}.`,
      },
      {
        // The biological job the prong(s) do in the desert during deployment.
        label: "What it does",
        body:
          chosen.length === 0
            ? "It stabilises the dune surface by binding loose sand grains into a cohesive crust."
            : chosen.map((p) => p.inDesert).join(" "),
      },
      {
        label: "What we plan to model",
        body:
          chosen.length > 1
            ? "How the selected prongs combine — the total crust strength, CO₂ captured, and wind resistance you get when they work together."
            : (chosen[0]?.impact ??
              "The crust strength and durability this approach delivers."),
      },
    ],
  };
}
