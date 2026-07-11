"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Term } from "./GlossaryTerm";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselIndicator,
  CarouselNavigation,
} from "@/components/motion-primitives/carousel";

/**
 * LandingCinematic — "Sandyx presents" (carousel edition)
 * =======================================================
 * The three story panes (Project Overview → How the models help → Lab usage) now live in a
 * motion-primitives <Carousel>: swipe/drag, arrow buttons, dot indicators, and a gentle
 * auto-advance. Sandyx stands at the window's bottom-left, "presenting" each pane. The old
 * duplicated top-left scene-title chip is gone — each pane shows its title exactly once.
 */

type Accent = "indigo" | "emerald" | "amber";

const ACCENT: Record<
  Accent,
  { text: string; textLight: string; ring: string; dot: string }
> = {
  indigo: {
    text: "text-amber-300",
    textLight: "text-amber-600",
    ring: "ring-amber-400/30",
    dot: "bg-amber-400",
  },
  emerald: {
    text: "text-teal-300",
    textLight: "text-teal-600",
    ring: "ring-teal-400/30",
    dot: "bg-teal-400",
  },
  amber: {
    text: "text-amber-300",
    textLight: "text-amber-600",
    ring: "ring-amber-400/30",
    dot: "bg-amber-400",
  },
};

interface Scene {
  bg: string;
  title: string;
  accent: Accent;
  paragraphs: React.ReactNode[];
}

const SCENES: Scene[] = [
  {
    bg: "/landing/desert.jpg",
    title: "Project Overview",
    accent: "indigo",
    paragraphs: [
      <>
        This project tackles the environmental crisis of wind-driven desert sand
        erosion by engineering{" "}
        <Term k="bacillus-subtilis">
          <i>Bacillus subtilis</i>
        </Term>{" "}
        to biologically stabilize sandy surfaces.
      </>,
      <>
        We employ a three-pronged synthetic biology approach to maximize soil
        cohesion, utilize native desert resources, and ensure strict{" "}
        <Term k="kill-switch">biosafety</Term>.
      </>,
      <>
        By binding loose particulate matter into a durable{" "}
        <Term k="gamma-pga">γ-PGA</Term> crust, we aim to significantly reduce
        airborne dust and improve regional air quality.
      </>,
    ],
  },
  {
    bg: "/landing/city.jpg",
    title: "How do these models help?",
    accent: "emerald",
    paragraphs: [
      <>
        These computational models bridge the gap between microscopic bacterial
        behaviors and macroscopic environmental impact.
      </>,
      <>
        They let researchers simulate polymer{" "}
        <Term k="cross-linking">cross-linking</Term> dynamics, optimize
        metabolic pathways with{" "}
        <Term k="flux-balance-analysis">flux balance analysis</Term>, and
        predict the real-world <Term k="aeolian-transport">aeolian</Term> stress
        resistance of treated sand — before touching a single flask.
      </>,
    ],
  },
  {
    bg: "/landing/lab.jpg",
    title: "How to use this toolkit in the lab",
    accent: "amber",
    paragraphs: [
      <>
        Use this suite to fine-tune your wet lab parameters — incubation
        temperature, <Term k="precursor">precursor</Term> concentrations, and{" "}
        <Term k="od600">inoculum</Term> volumes.
      </>,
      <>
        The simulated outputs guide exact experimental setups, so you hit the
        optimal <Term k="shear-modulus">shear modulus</Term> and environmental
        durability in your physical assays.
      </>,
    ],
  },
];

// ---------------------------------------------------------------------------
// A single carousel pane: background + the presented text card.
// ---------------------------------------------------------------------------
function Pane({ scene, isLightMode }: { scene: Scene; isLightMode: boolean }) {
  const a = ACCENT[scene.accent];
  return (
    <div className="relative w-full h-[68vh] min-h-[420px] max-h-[620px] overflow-hidden">
      <img
        src={scene.bg}
        alt=""
        aria-hidden
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/25" />
      {/* presented text — full-width top on mobile, right-hand card on desktop */}
      <div className="absolute z-20 left-4 right-4 top-8 sm:left-auto sm:top-1/2 sm:-translate-y-1/2 sm:right-[6%] sm:w-[56%] sm:max-w-lg">
        <motion.div
          key={scene.title}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`rounded-3xl border p-6 sm:p-8 backdrop-blur-xl ring-1 ${a.ring} ${
            isLightMode
              ? "bg-white/80 border-white/70 text-slate-900"
              : "bg-slate-950/70 border-white/10 text-slate-100"
          }`}
        >
          <h2
            className={`text-xl sm:text-3xl font-black uppercase tracking-widest mb-4 ${isLightMode ? a.textLight : a.text}`}
          >
            {scene.title}
          </h2>
          <div className="space-y-3 text-sm sm:text-lg leading-relaxed opacity-90">
            {scene.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The carousel cinematic
// ---------------------------------------------------------------------------
export default function LandingCinematic({
  isLightMode,
}: {
  isLightMode: boolean;
}) {
  const [index, setIndex] = useState(0);
  const a = ACCENT[SCENES[index].accent];

  // Gentle auto-advance; each manual change resets the timer.
  useEffect(() => {
    const id = setTimeout(() => setIndex((i) => (i + 1) % SCENES.length), 7000);
    return () => clearTimeout(id);
  }, [index]);

  // Returning from the adventure ("see how we model this") snaps back to Project Overview.
  useEffect(() => {
    const h = () => setIndex(0);
    window.addEventListener("sandyx:overview", h);
    return () => window.removeEventListener("sandyx:overview", h);
  }, []);

  return (
    <section
      id="cinematic"
      className="relative w-full flex justify-center px-4 py-14 sm:py-24 scroll-mt-20"
    >
      <div className="relative w-full max-w-5xl">
        <div
          className={`relative rounded-[2rem] overflow-hidden border ring-1 ${a.ring} ${
            isLightMode ? "border-white/70" : "border-white/10"
          }`}
        >
          <Carousel index={index} onIndexChange={setIndex}>
            <CarouselContent className="items-stretch">
              {SCENES.map((s) => (
                <CarouselItem key={s.bg} className="h-full">
                  <Pane scene={s} isLightMode={isLightMode} />
                </CarouselItem>
              ))}
            </CarouselContent>

            <CarouselNavigation
              alwaysShow
              className="left-0 w-full px-3 sm:px-4"
              classNameButton="bg-white/90 hover:bg-white border border-black/10 h-9 w-9 flex items-center justify-center"
            />
            <CarouselIndicator
              className="bottom-5"
              classNameButton="!w-2.5 !h-2.5"
            />
          </Carousel>

          {/* Sandyx — large, bottom-left, presenting each pane */}
          <motion.img
            src="/sandyx.png"
            alt="Sandyx"
            draggable={false}
            className="pointer-events-none absolute z-30 left-[2%] sm:left-[3%] bottom-0 w-24 sm:w-48 md:w-56 object-contain drop-shadow-[0_14px_22px_rgba(0,0,0,0.5)]"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* glassy frame edge */}
          <div
            className="pointer-events-none absolute inset-0 z-40 rounded-[2rem]"
            style={{
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.35), inset 0 0 70px rgba(0,0,0,0.4)",
            }}
          />
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Branch-split connector — grows from the centre into three roots above the prong cards.
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
 branch — an objectBoundingBox gradient is degenerate on a zero-width line and would
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
        {/* three sibling branches (left, MIDDLE, right) — all identical treatment */}
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
        {/* junction node where the trunk splits — makes the split read as a tree fork */}
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
