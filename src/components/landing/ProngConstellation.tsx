"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { gsap } from "gsap";
import {
  useMeasuredConnectors,
  type ConnectorSpec,
} from "@/src/components/connectors/useMeasuredConnectors";
import { KILL_SWITCH } from "@/src/lib/portalsData";
import { GRAIN_NOISE } from "@/src/lib/grain";
import ModelIndex from "./ModelIndex";
import { KILL_SWITCH_ROLE } from "@/content/copy";
import { PRONG_TITLES, PRONG_SHORTS } from "@/content/copy";

/**
 * ProngConstellation: "three prongs became two prongs plus a kill switch",
 * told in type and hairlines.
 * ==========================================================================
 * There are no cards here. The three options are labels under a fork; the
 * reframe is a rule drawn through one of them and its branch withering back
 * into the node. Below the figure sits the model index, so the reader goes
 * from "what is this project" to "open this simulation" in one click.
 *
 *   0 three   the fork branches to three labels
 *   1 strike  a hairline is drawn through Sodium Alginate
 *   2 wither  its branch retracts, the label leaves the row
 *   3 settle  the two survivors recentre, a branch grows down to the kill switch
 *   4 index   the model index resolves underneath
 *
 * The survivors recentre because removing the third flex item is enough; the
 * branches follow on their own because every endpoint is MEASURED from the
 * live rect of the label it points at (see useMeasuredConnectors). Nothing
 * here hard-codes a coordinate, which is exactly why the tips can no longer
 * fall short of their targets the way the old stretched-viewBox version did.
 */

type Phase = 0 | 1 | 2 | 3 | 4;
type ViewTarget = number | "killswitch";

const HOLDS = [0.9, 0.75, 0.85, 0.6];
const EASE = [0.22, 1, 0.36, 1] as const;

const LEAVES = [
  {
    key: "p1",
    title: PRONG_TITLES[1],
    lede: PRONG_SHORTS[1],
    target: 1 as ViewTarget,
  },
  {
    key: "p2",
    title: PRONG_TITLES[2],
    lede: PRONG_SHORTS[2],
    target: 2 as ViewTarget,
  },
  {
    key: "alg",
    title: PRONG_TITLES[3],
    lede: PRONG_SHORTS[3],
    target: 3 as ViewTarget,
  },
];

export default function ProngConstellation({
  onView,
  onExplorePortals,
  onSimulateBoth,
}: {
  onView: (t: ViewTarget) => void;
  onExplorePortals: () => void;
  onSimulateBoth: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const forkRef = useRef<HTMLDivElement>(null);
  const killRef = useRef<HTMLDivElement>(null);
  const p1Ref = useRef<HTMLDivElement>(null);
  const p2Ref = useRef<HTMLDivElement>(null);
  const algRef = useRef<HTMLDivElement>(null);

  const started = useInView(hostRef, { amount: 0.25 });
  const armed = useRef(true);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const [phase, setPhase] = useState<Phase>(0);
  const [nudge, setNudge] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(m.matches);
    apply();
    m.addEventListener("change", apply);
    return () => m.removeEventListener("change", apply);
  }, []);

  // Below md the figure is not rendered, so its useInView never fires and the
  // sequence would never start, leaving the index hidden. There is nothing to
  // animate at that width anyway: resolve straight to the finished state.
  useEffect(() => {
    const m = window.matchMedia("(min-width: 768px)");
    const apply = () => {
      if (!m.matches) {
        armed.current = false;
        tlRef.current?.kill();
        setPhase(4);
      }
    };
    apply();
    m.addEventListener("change", apply);
    return () => m.removeEventListener("change", apply);
  }, []);

  // Landing here through a curtain jump means the section can already be in
  // view on the frame the observer is attached, and a hard-refresh at this
  // scroll position can leave useInView reporting stale. There is no Skip
  // control any more, so the sequence has to be self-starting: if the host is
  // inside the viewport and nothing has fired shortly after mount, start it.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const el = hostRef.current;
      if (!el || !armed.current) return;
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) setNudge(true);
    }, 900);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if ((!started && !nudge) || !armed.current) return;
    armed.current = false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase(4);
      return;
    }
    const tl = gsap.timeline();
    let acc = 0;
    HOLDS.forEach((h, i) => {
      acc += h;
      tl.call(() => setPhase((i + 1) as Phase), undefined, acc);
    });
    tlRef.current = tl;
    return () => {
      tl.kill();
    };
  }, [started, nudge]);

  const struck = phase >= 1;
  const withered = phase >= 2;
  const settled = phase >= 3;
  const indexed = phase >= 4;

  const connectors: ConnectorSpec[] = useMemo(
    () => [
      { id: "b1", from: "fork", to: "p1" },
      { id: "b2", from: "fork", to: "p2" },
      { id: "b3", from: "fork", to: "alg", hidden: withered },
      { id: "b4", from: "fork", to: "kill", hidden: !settled },
    ],
    [withered, settled],
  );

  const nodes = useMemo(
    () => ({ fork: forkRef, p1: p1Ref, p2: p2Ref, alg: algRef, kill: killRef }),
    [],
  );

  const { box, segments, remeasure } = useMeasuredConnectors(
    hostRef,
    svgRef,
    nodes,
    connectors,
    [phase],
  );

  // The leaves move for ~700ms on each phase change, so a single remeasure at
  // the change would leave the branches pointing at where the leaves were.
  // Track them every frame for the length of the transition, then stop.
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const until = performance.now() + 800;
    const tick = () => {
      remeasure();
      if (performance.now() < until) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, reduced, remeasure]);

  const refFor = (key: string) =>
    key === "p1" ? p1Ref : key === "p2" ? p2Ref : algRef;

  return (
    <section
      id="models"
      className="relative w-full scroll-mt-24 overflow-hidden pb-24 pt-[8vh]"
    >
      {/* Sand, at the strength of paper texture. The section this sits behind is
          about ground, so the ground is present rather than described. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: GRAIN_NOISE,
          backgroundSize: "160px 160px",
          opacity: 0.045,
          mixBlendMode: "soft-light",
        }}
      />

      <div className="relative mx-auto w-full max-w-6xl px-6 sm:px-6">
        {/* Section head */}
        <div className="mb-4 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="caption mb-4">The design, and every model in it</p>
            <h2 className="text-[length:var(--text-h1)] text-foreground">
              {settled ? "Two prongs, and a kill switch" : "Three prongs"}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <button
              onClick={onSimulateBoth}
              className="caption rule-link text-dune-orange transition-colors hover:text-foreground"
            >
              Simulate both prongs together
            </button>
            <button
              onClick={onExplorePortals}
              className="caption rule-link transition-colors hover:text-foreground"
            >
              Sandbox portals
            </button>
          </div>
        </div>

        {/* The rule under the head is a dune profile, not a straight line. */}
        <DuneRule className="mb-12" />

      {/* ---- The figure. Desktop only; below md the index speaks for itself. ---- */}
      <div ref={hostRef} className="relative mb-24 hidden md:block">
        {/* 1:1 with the host, so a line drawn to a measured rect lands on it.
            No preserveAspectRatio override and no non-scaling-stroke: those two
            together are what made the old branches stop short. */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${box.w || 1} ${box.h || 1}`}
          className="pointer-events-none absolute inset-0 z-20 h-full w-full"
          aria-hidden
        >
          {segments.map((s) => (
            <Branch key={s.id} d={s.d} length={s.length} reduced={reduced} />
          ))}
        </svg>

        {/* Fork */}
        <div className="flex justify-center">
          <div
            ref={forkRef}
            className="h-[7px] w-[7px] rounded-full bg-dune-orange"
          />
        </div>

        {/* Leaves. Dropping the third item is what recentres the survivors, and
            the branches follow because they are measured, not positioned. */}
        <div className="flex items-start justify-around gap-6 pt-24">
          <AnimatePresence onExitComplete={remeasure}>
            {LEAVES.map((l) => {
              const isAlg = l.key === "alg";
              // Removed from the DOM, not just faded: keeping the slot is what
              // would stop the two survivors from recentring.
              if (isAlg && withered) return null;
              return (
                <motion.div
                  key={l.key}
                  ref={refFor(l.key)}
                  className="max-w-[15rem] flex-1"
                  layout
                  initial={false}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.55, ease: EASE }}
                  onLayoutAnimationComplete={remeasure}
                >
                  <Leaf
                    title={l.title}
                    lede={l.lede}
                    struck={isAlg && struck}
                    onClick={() => onView(l.target)}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* The kill switch grows in where the third branch used to lead. */}
        <div className="flex justify-center pt-24">
          <motion.div
            ref={killRef}
            className="max-w-[19rem]"
            initial={false}
            animate={{ opacity: settled ? 1 : 0, y: settled ? 0 : 12 }}
            transition={{ duration: 0.6, ease: EASE }}
            style={{ pointerEvents: settled ? "auto" : "none" }}
          >
            <Leaf
              eyebrow={KILL_SWITCH_ROLE}
              title={KILL_SWITCH.title}
              lede={KILL_SWITCH.short}
              onClick={() => onView("killswitch")}
            />
          </motion.div>
        </div>
      </div>

        {/* Where the figure meets the list: the same ridge, mirrored, so the
            index reads as the layer under the surface. */}
        <DuneRule className="mb-12" flip />

        {/* ---- The index. Everything, grouped and folded. ---- */}
        <ModelIndex show={indexed || reduced} onView={onView} />
      </div>
    </section>
  );
}

/**
 * A hairline in the shape of a dune profile, with a second crest behind it. It
 * does the job the border-b did, and it says desert without a photograph, a
 * gradient or a filled shape.
 */
function DuneRule({
  className = "",
  flip,
}: {
  className?: string;
  flip?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 1200 44"
      preserveAspectRatio="none"
      aria-hidden
      className={`block h-[44px] w-full ${flip ? "scale-y-[-1]" : ""} ${className}`}
    >
      <path
        d="M0 34 C 150 34, 250 10, 420 12 C 560 14, 640 33, 800 31 C 940 29, 1050 15, 1200 17"
        fill="none"
        stroke="var(--dune-orange)"
        strokeWidth="1"
        strokeOpacity="0.5"
      />
      <path
        d="M0 42 C 190 42, 300 26, 470 28 C 640 30, 720 41, 900 39 C 1030 38, 1100 30, 1200 31"
        fill="none"
        stroke="var(--dune-rose)"
        strokeWidth="1"
        strokeOpacity="0.25"
      />
    </svg>
  );
}


/**
 * One measured branch. The draw-in animates a dash offset derived from the
 * path's REAL length, never framer's normalised `pathLength`, and the dash is
 * cleared the moment it finishes so no later reflow can reopen a gap at the
 * tip. There is deliberately no `vectorEffect="non-scaling-stroke"` here: with
 * a 1:1 viewBox it buys nothing, and combined with a normalised dash it is the
 * exact defect this component was written to remove.
 */
function Branch({
  d,
  length,
  reduced,
}: {
  d: string;
  length: number;
  reduced: boolean;
}) {
  const ref = useRef<SVGPathElement>(null);
  const drawn = useRef(false);

  // Only the first appearance animates. Later remeasures just move the line.
  useEffect(() => {
    if (!ref.current) return;
    if (reduced) {
      ref.current.style.strokeDasharray = "none";
      drawn.current = true;
      return;
    }
    if (drawn.current) {
      ref.current.style.strokeDasharray = "none";
      ref.current.style.strokeDashoffset = "0";
    }
  }, [d, reduced]);

  return (
    <motion.path
      ref={ref}
      d={d}
      fill="none"
      stroke="var(--dune-orange)"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeOpacity={0.75}
      // +2 so a dash measured a frame before the final layout can only ever
      // over-draw. Under-drawing is what leaves a hairline gap at the tip.
      initial={reduced ? false : { strokeDashoffset: length + 2 }}
      animate={{ strokeDashoffset: 0 }}
      style={{ strokeDasharray: drawn.current ? "none" : length + 2 }}
      transition={{ duration: reduced ? 0 : 0.7, ease: EASE }}
      onAnimationComplete={() => {
        drawn.current = true;
        if (ref.current) ref.current.style.strokeDasharray = "none";
      }}
    />
  );
}

/** A label under the fork. The strike is a rule through the words, not a cross. */
function Leaf({
  eyebrow,
  title,
  lede,
  struck,
  onClick,
}: {
  /** Only for the kill switch, which is not one of the numbered routes. */
  eyebrow?: string;
  title: string;
  lede: string;
  struck?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group block w-full text-center"
    >
      {eyebrow && <p className="caption mb-2">{eyebrow}</p>}
      <h3 className="wght-head relative inline-block text-[length:var(--text-h3)] text-foreground">
        {title}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute left-0 top-1/2 h-px w-full origin-left bg-dune-maroon"
          initial={false}
          animate={{ scaleX: struck ? 1 : 0 }}
          transition={{ duration: 0.55, ease: EASE }}
        />
      </h3>
      <p className="mx-auto mt-2 max-w-[24ch] text-[length:var(--text-micro)] leading-snug text-muted-foreground">
        {lede}
      </p>
    </button>
  );
}
