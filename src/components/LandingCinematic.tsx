"use client";

import React, { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "motion/react";
import { Term } from "./GlossaryTerm";
import type { MolstarApi } from "@/components/molstar-viewer";

/**
 * LandingCinematic, scroll-driven story
 * =====================================
 * The three story panes (Project Overview -> How the models help -> Lab usage) are now a
 * scroll-pinned narrative (DESIGN.md §6). A real Mol* protein sits pinned on one side and rotates
 * as you scroll; the text panes cross-fade in sequence driven by scroll progress, over the global
 * Antigravity-style grain-gradient background. Replaces the old auto-advancing carousel, each pane
 * still shows its title exactly once.
 */

// WebGL viewer is browser-only.
const MolstarViewer = dynamic(() => import("@/components/molstar-viewer"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-sm text-dune-ash">
      Preparing 3D structure…
    </div>
  ),
});

// A real deposited structure behind the engineered enzymes (CapB, the gamma-PGA synthase subunit).
const HERO_STRUCTURE = "/pdb/AF-P96736.pdb";

interface Scene {
  title: string;
  accentLight: string;
  accentDark: string;
  paragraphs: React.ReactNode[];
}

const SCENES: Scene[] = [
  {
    title: "Project Overview",
    accentLight: "text-dune-maroon",
    accentDark: "text-dune-orange",
    paragraphs: [
      <>
        This project fights wind-driven desert sand erosion. We engineer{" "}
        <Term k="bacillus-subtilis">
          <i>Bacillus subtilis</i>
        </Term>{" "}
        to bind and stabilize sandy surfaces.
      </>,
      <>
        Two engineered prongs do the work: <Term k="gamma-pga">γ-PGA</Term> and
        carbonic-anhydrase biomineralization. A genetically-encoded{" "}
        <Term k="kill-switch">kill switch</Term> keeps the strain contained.
      </>,
      <>
        Binding loose sand into a <Term k="gamma-pga">γ-PGA</Term> crust cuts
        airborne dust and improves air quality.
      </>,
    ],
  },
  {
    title: "How do these models help?",
    accentLight: "text-teal-700",
    accentDark: "text-teal-300",
    paragraphs: [
      <>
        These models connect what the bacteria do inside the cell to the effect
        on the ground.
      </>,
      <>
        Simulate polymer <Term k="cross-linking">cross-linking</Term>, optimize
        pathways with{" "}
        <Term k="flux-balance-analysis">flux balance analysis</Term>, and predict
        how treated sand resists <Term k="aeolian-transport">aeolian</Term> wind
        stress, before touching a single flask.
      </>,
    ],
  },
  {
    title: "How to use this toolkit in the lab",
    accentLight: "text-dune-orange",
    accentDark: "text-dune-orange",
    paragraphs: [
      <>
        Set your wet lab parameters here: incubation temperature,{" "}
        <Term k="precursor">precursor</Term> concentrations, and{" "}
        <Term k="od600">inoculum</Term> volumes.
      </>,
      <>
        The outputs guide your setup, so you hit the{" "}
        <Term k="shear-modulus">shear modulus</Term> and durability you need in
        your assays.
      </>,
    ],
  },
];

// One text pane, cross-faded over its slice of the scroll.
function Pane({
  scene,
  progress,
  index,
  count,
  isLightMode,
}: {
  scene: Scene;
  progress: MotionValue<number>;
  index: number;
  count: number;
  isLightMode: boolean;
}) {
  // Each scene owns a window of scroll; it fades/slides in as that window opens and out as it closes.
  const span = 1 / count;
  const start = index * span;
  const inAt = index === 0 ? 0 : start - span * 0.15;
  const peakA = start + span * 0.18;
  const peakB = start + span * 0.82;
  const outAt = index === count - 1 ? 1 : start + span + span * 0.02;

  const opacity = useTransform(
    progress,
    [inAt, peakA, peakB, outAt],
    [0, 1, 1, 0],
  );
  const y = useTransform(progress, [inAt, peakA, peakB, outAt], [40, 0, 0, -40]);

  return (
    <motion.div
      style={{ opacity, y }}
      className="absolute inset-0 flex flex-col justify-center"
    >
      <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] text-dune-ash mb-3">
        {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
      </span>
      <h2
        className={`text-2xl sm:text-4xl font-black uppercase tracking-tight mb-5 font-display ${
          isLightMode ? scene.accentLight : scene.accentDark
        }`}
      >
        {scene.title}
      </h2>
      <div
        className={`space-y-3 text-sm sm:text-lg leading-relaxed max-w-xl ${
          isLightMode ? "text-slate-800" : "text-slate-200"
        }`}
      >
        {scene.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </motion.div>
  );
}

export default function LandingCinematic({
  isLightMode,
}: {
  isLightMode: boolean;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const apiRef = useRef<MolstarApi | null>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // Active dot: which scene owns the current scroll position.
  const activeIndex = useTransform(scrollYProgress, (p) =>
    Math.min(SCENES.length - 1, Math.floor(p * SCENES.length)),
  );

  // The protein spins gently by default and speeds up while the page is scrolling, then eases back.
  useEffect(() => {
    if (reduced) return;
    let idle: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      apiRef.current?.setSpinSpeed(1.3);
      clearTimeout(idle);
      idle = setTimeout(() => apiRef.current?.setSpinSpeed(0.3), 200);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(idle);
    };
  }, [reduced]);

  // Returning from the adventure ("see how we model this") scrolls back to this section's start.
  useEffect(() => {
    const h = () => {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    window.addEventListener("sandyx:overview", h);
    return () => window.removeEventListener("sandyx:overview", h);
  }, []);

  return (
    <section
      id="cinematic"
      ref={sectionRef}
      className="relative w-full scroll-mt-0"
      style={{ height: "320vh" }}
    >
      {/* Sticky stage: protein + narrating panes, held in view while the section scrolls past. */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center">
        {/* soft vignette so the text stays legible over the ambient gradient */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 ${
            isLightMode
              ? "bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(251,247,240,0.65)_100%)]"
              : "bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(8,7,6,0.7)_100%)]"
          }`}
        />

        <div className="relative z-10 w-full max-w-6xl mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 items-center">
          {/* Rotating protein. The wrapper carries the height; the viewer fills it with
              h-full (passing `absolute inset-0` collapses the viewer root to 0px). */}
          <div className="order-1 lg:order-none relative h-[34vh] sm:h-[42vh] lg:h-[64vh] w-full">
            <MolstarViewer
              url={HERO_STRUCTURE}
              className="h-full w-full"
              showControls={false}
              spinByDefault
              onReady={(api) => {
                apiRef.current = api;
              }}
            />
          </div>

          {/* Narrating panes (cross-faded on scroll) */}
          <div className="order-2 lg:order-none relative min-h-[260px] sm:min-h-[320px] lg:h-[64vh]">
            {SCENES.map((s, i) => (
              <Pane
                key={s.title}
                scene={s}
                progress={scrollYProgress}
                index={i}
                count={SCENES.length}
                isLightMode={isLightMode}
              />
            ))}
          </div>
        </div>

        {/* Progress dots */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2.5">
          {SCENES.map((_, i) => (
            <Dot key={i} index={i} active={activeIndex} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Dot({
  index,
  active,
}: {
  index: number;
  active: MotionValue<number>;
}) {
  const opacity = useTransform(active, (a) => (a === index ? 1 : 0.35));
  const scale = useTransform(active, (a) => (a === index ? 1.35 : 1));
  return (
    <motion.span
      style={{ opacity, scale }}
      className="w-2.5 h-2.5 rounded-full bg-dune-orange block"
    />
  );
}

// ---------------------------------------------------------------------------
// Branch-split connector, grows from the centre into three roots above the prong cards.
// ---------------------------------------------------------------------------
export function BranchConnector({
  isLightMode: _isLightMode,
}: {
  isLightMode: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.9", "end 0.55"],
  });
  const draw = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const nodeOpacity = useTransform(scrollYProgress, [0.6, 1], [0, 1]);

  // Three sibling branches fan out from a single junction node at (500, 66). The middle branch is
  // drawn on the SAME footing as the left/right ones (its own path + end node) so all three read as
  // limbs of one tree rather than the trunk merely continuing straight down to the centre card.
  const branches = [
    "M500 66 C500 132, 210 118, 167 196", // left
    "M500 66 L500 196", // middle
    "M500 66 C500 132, 790 118, 833 196", // right
  ];
  return (
    <div ref={ref} className="relative w-full h-24 sm:h-32 -mb-2">
      <svg
        viewBox="0 0 1000 200"
        preserveAspectRatio="none"
        className="w-full h-full overflow-visible"
      >
        <defs>
          {/* userSpaceOnUse so the gradient still resolves on the perfectly vertical middle
 branch, an objectBoundingBox gradient is degenerate on a zero-width line and would
 render it invisible (which is why the middle prong had no branch before). */}
          <linearGradient
            id="branchGrad"
            gradientUnits="userSpaceOnUse"
            x1="500"
            y1="0"
            x2="500"
            y2="200"
          >
            <stop offset="0%" stopColor="#d6884a" />
            <stop offset="100%" stopColor="#c28a7c" />
          </linearGradient>
        </defs>
        {/* trunk */}
        <motion.path
          d="M500 0 L500 66"
          fill="none"
          stroke="url(#branchGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          style={{ pathLength: draw }}
        />
        {/* three sibling branches (left, MIDDLE, right), all identical treatment */}
        {branches.map((d, i) => (
          <motion.path
            key={i}
            d={d}
            fill="none"
            stroke="url(#branchGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            style={{ pathLength: draw }}
          />
        ))}
        {/* junction node where the trunk splits, makes the split read as a tree fork */}
        <motion.circle
          cx={500}
          cy={66}
          r={7}
          fill="#d6884a"
          style={{ opacity: nodeOpacity }}
        />
        {/* leaf node at the head of each branch (over each prong card) */}
        {[167, 500, 833].map((x, i) => (
          <motion.circle
            key={i}
            cx={x}
            cy={196}
            r={6}
            fill="#c28a7c"
            style={{ opacity: nodeOpacity }}
          />
        ))}
      </svg>
    </div>
  );
}
