"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { gsap } from "gsap";
import { PRONGS, KILL_SWITCH } from "@/src/lib/portalsData";

/**
 * ProngReframeSequence: the scroll-triggered "3 prongs to 2 prongs plus kill switch" story.
 * =========================================================================================
 * When the section reaches the middle of the viewport it plays once, all the way through:
 *
 *   0 initial    three prongs, a tree fork branching to all three, title "The Three Prongs"
 *   1 cross      a cross is drawn over Prong 3 (Sodium Alginate)
 *   2 retract    the three branches withdraw into the fork node
 *   3 pivot      the title cross-fades to "The Two Prongs" while an arrow draws from under the
 *                alginate window, down then left, toward where the kill switch will appear
 *   4 killswitch the kill-switch window fades in at the arrow head
 *   5 separate   the crossed alginate window slides to the right and shrinks; the arrow fades
 *   6 regrow     the two prongs recentre and two branches grow back to them; the kill switch
 *                settles centred below the pair
 *   7 grow       the two prongs and the kill switch grow larger and clicks turn on; the
 *                "explore the sandbox portals" link appears
 *
 * At most two things move at once. Nothing is clickable until the sequence ends.
 *
 * The section is PINNED (GSAP ScrollTrigger) and the phases are scrubbed by scroll: the viewport
 * locks on "The Three Prongs" and the reframe plays forward as you scroll and reverses as you
 * scroll back, so nobody can slip past a half-played animation. Under reduced motion or on small
 * screens there is no pin, the finished (two prongs + kill switch) layout is shown outright.
 */

type Phase = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
type ViewTarget = number | "killswitch";

// Smooth motion curves.
const EASE = [0.22, 1, 0.36, 1] as const; // easeOutQuint-ish for position moves
const SPRING = { type: "spring" as const, stiffness: 120, damping: 18 };

// Coordinate system (SVG userSpace 1000 x 600, stretched to the stage). Cards are positioned by
// the same fractions so branch heads and card centres line up at any stage width.
const NODE_INIT = { x: 500, y: 55 };
const NODE_FINAL = { x: 445, y: 55 };
const HEAD_INIT = 113;
const HEAD_FINAL = 95;

const POS = {
  p1Init: { x: 200, y: 200 },
  p2Init: { x: 500, y: 200 },
  p1Final: { x: 290, y: 190 },
  p2Final: { x: 600, y: 190 },
  algInit: { x: 800, y: 200 },
  algFinal: { x: 885, y: 250 },
  killSpawn: { x: 500, y: 412 },
  killFinal: { x: 445, y: 406 },
};

const branch = (nx: number, ny: number, hx: number, hy: number) =>
  `M${nx} ${ny} C${nx} ${ny + 75}, ${hx + (hx > nx ? -32 : hx < nx ? 32 : 0)} ${hy - 58}, ${hx} ${hy}`;

const threeBranches = [
  branch(NODE_INIT.x, NODE_INIT.y, POS.p1Init.x, HEAD_INIT),
  branch(NODE_INIT.x, NODE_INIT.y, POS.p2Init.x, HEAD_INIT),
  branch(NODE_INIT.x, NODE_INIT.y, POS.algInit.x, HEAD_INIT),
];
const twoBranches = [
  branch(NODE_FINAL.x, NODE_FINAL.y, POS.p1Final.x, HEAD_FINAL),
  branch(NODE_FINAL.x, NODE_FINAL.y, POS.p2Final.x, HEAD_FINAL),
];
// Arrow: from under the alginate window, down, then left toward the kill-switch window.
const ARROW_PATH = `M800 300 L800 407 L642 407`;

interface CardData {
  title: string;
  short: string;
  icon: React.ReactNode;
}

function StageCard({
  data,
  crossed,
  dimmed,
  clickable,
  onClick,
  compact,
}: {
  data: CardData;
  crossed?: boolean;
  dimmed?: boolean;
  clickable: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={onClick}
      className={`group relative flex h-full w-full flex-col items-center justify-center rounded-[8px] border bg-card p-4 text-center transition-shadow duration-300 ${
        compact ? "gap-1.5" : "gap-3"
      } ${
        clickable
          ? "cursor-pointer ring-1 ring-dune-orange/40 hover:shadow-xl hover:ring-dune-orange"
          : "cursor-default"
      } ${dimmed ? "opacity-70 grayscale-[0.4]" : ""}`}
      style={{ borderColor: "var(--border)" }}
    >
      {data.icon && (
        <span
          className={`grid place-items-center ${compact ? "[&_svg]:h-6 [&_svg]:w-6" : "[&_svg]:h-8 [&_svg]:w-8"}`}
          aria-hidden
        >
          {data.icon}
        </span>
      )}
      <h3 className={`font-bold tracking-tight ${compact ? "text-sm" : "text-base leading-tight"}`}>
        {data.title}
      </h3>
      <p className="text-xs font-medium leading-snug opacity-70">{data.short}</p>

      {crossed !== undefined && (
        <motion.svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
          initial={false}
          animate={{ opacity: crossed ? 1 : 0, scale: crossed ? 1 : 0.72 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ transformOrigin: "center" }}
        >
          {["M16 18 L84 82", "M84 18 L16 82"].map((d, i) => (
            <path
              key={i}
              d={d}
              stroke="#c0392b"
              strokeOpacity={0.85}
              strokeWidth={4}
              strokeLinecap="round"
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </motion.svg>
      )}
    </button>
  );
}


export default function ProngReframeSequence({
  isLightMode,
  onView,
  onExplorePortals,
}: {
  isLightMode: boolean;
  onView: (t: ViewTarget) => void;
  onExplorePortals: () => void;
}) {
  const p1 = PRONGS[0];
  const p2 = PRONGS[1];
  const alg = PRONGS[2];

  const stageRef = useRef<HTMLDivElement>(null);
  const started = useInView(stageRef, { amount: 0.45 });
  const anyVisible = useInView(stageRef, { amount: 0 });
  const armedRef = useRef(true);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const [phase, setPhase] = useState<Phase>(0);

  // Stage is a fixed 600px tall (so the 0..600 coordinate space maps 1:1 to px)
  // and full width, so we only measure the width to place cards with a
  // compositor-only transform instead of animating left/top (layout + paint).
  const [stageW, setStageW] = useState(960);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => setStageW(el.clientWidth || 960);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const px = (x: number) => (x / 1000) * stageW;

  // Self-playing sequence: once the stage is on screen it plays the 3 -> 2 + kill
  // switch reframe on a GSAP timeline (auto, not scroll-scrubbed). It re-arms only
  // after the stage fully leaves the viewport, so a scroll away and back replays
  // it cleanly.
  useEffect(() => {
    if (!started || !armedRef.current) return;
    armedRef.current = false;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setPhase(7);
      return;
    }
    const tl = gsap.timeline();
    // Seconds each phase holds before the next; roughly the old cadence.
    const holds = [0.9, 1.1, 1.2, 1.1, 1.3, 1.3, 1.0];
    let acc = 0;
    for (let i = 0; i < holds.length; i++) {
      acc += holds[i];
      tl.call(() => setPhase((i + 1) as Phase), undefined, acc);
    }
    tlRef.current = tl;
    return () => {
      tl.kill();
    };
  }, [started]);

  // Reset + re-arm once the stage is fully off screen.
  useEffect(() => {
    if (!anyVisible) {
      tlRef.current?.kill();
      setPhase(0);
      armedRef.current = true;
    }
  }, [anyVisible]);

  const done = phase >= 7;

  // Skip straight to the finished layout; motion tweens each card to its final
  // spot so it glides rather than cuts.
  const skip = () => {
    tlRef.current?.kill();
    setPhase(7);
  };
  const skipVisible = started && phase < 7;
  const showTwo = phase >= 3;
  const killVisible = phase >= 4;
  const algFinal = phase >= 5;
  const arrowVisible = phase >= 3 && phase < 5;
  const retracted = phase >= 2;
  const regrown = phase >= 6;
  const grown = phase >= 7;

  const trioScale = grown ? 1.1 : 1;
  const p1c = regrown ? POS.p1Final : POS.p1Init;
  const p2c = regrown ? POS.p2Final : POS.p2Init;
  const killc = regrown ? POS.killFinal : POS.killSpawn;
  const algc = algFinal ? POS.algFinal : POS.algInit;
  const node = regrown ? NODE_FINAL : NODE_INIT;

  const cardP1: CardData = { title: p1.title, short: p1.short, icon: p1.icon };
  const cardP2: CardData = { title: p2.title, short: p2.short, icon: p2.icon };
  const cardAlg: CardData = { title: alg.title, short: "Sodium Alginate, not pursued", icon: alg.icon };
  const cardKill: CardData = { title: KILL_SWITCH.title, short: KILL_SWITCH.short, icon: KILL_SWITCH.icon };

  // Anchor the card at the stage origin and centre it with static margins, so
  // the only thing that animates is the transform (x/y), never left/top.
  const cardBox = (w: number, h: number): React.CSSProperties => ({
    width: w,
    height: h,
    left: 0,
    top: 0,
    marginLeft: -w / 2,
    marginTop: -h / 2,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-8 pt-[8vh] pb-[3vh]">
      {/* Heading: cross-fading Three -> Two */}
      <div className="mb-4 flex items-end justify-between gap-4 border-b border-border pb-4">
        <div className="relative h-10 sm:h-11">
          <motion.h2
            className="absolute left-0 top-0 whitespace-nowrap text-2xl font-black uppercase tracking-widest sm:text-3xl"
            initial={false}
            animate={{ opacity: showTwo ? 0 : 1, y: showTwo ? -10 : 0 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
          >
            The Three Prongs
          </motion.h2>
          <motion.h2
            className="absolute left-0 top-0 whitespace-nowrap text-2xl font-black uppercase tracking-widest sm:text-3xl"
            initial={false}
            animate={{ opacity: showTwo ? 1 : 0, y: showTwo ? 0 : 10 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
          >
            The Two Prongs
          </motion.h2>
        </div>
        {/* Plain, boxless prompt once the reframe finishes. */}
        <motion.span
          className="hidden whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.14em] text-dune-orange sm:block"
          initial={false}
          animate={{ opacity: done ? 1 : 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          Click on the prongs to proceed to modeling
        </motion.span>
      </div>

      {/* DESKTOP: animated stage */}
      <div ref={stageRef} className="relative hidden h-[600px] w-full md:block">
        {/* Skip: fades in as the sequence plays, out when it finishes or the reader scrolls up */}
        <motion.button
          type="button"
          onClick={skip}
          initial={false}
          animate={{ opacity: skipVisible ? 1 : 0, y: skipVisible ? 0 : -6 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ pointerEvents: skipVisible ? "auto" : "none" }}
          className="absolute right-0 top-0 z-30 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/85 px-3 py-1.5 text-[11px] font-semibold text-dune-ash backdrop-blur transition-colors hover:text-dune-orange"
        >
          Skip
        </motion.button>

        <svg
          viewBox="0 0 1000 600"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        >
          <defs>
            <linearGradient id="reframeBranch" gradientUnits="userSpaceOnUse" x1="500" y1="0" x2="500" y2="220">
              <stop offset="0%" stopColor="#d6884a" />
              <stop offset="100%" stopColor="#c28a7c" />
            </linearGradient>
            <marker id="reframeArrowHead" markerWidth="10" markerHeight="10" refX="6.5" refY="5" orient="auto-start-reverse">
              <path d="M0 0 L8 5 L0 10 Z" fill="#d6884a" />
            </marker>
          </defs>

          {/* fork node */}
          <motion.circle
            r={7}
            fill="#d6884a"
            initial={false}
            animate={{ cx: node.x, cy: node.y, opacity: retracted && !regrown ? 0.45 : 1 }}
            transition={{ duration: 1, ease: EASE }}
          />

          {/* three initial branches: draw in, then retract at phase 2 */}
          {threeBranches.map((d, i) => (
            <motion.path
              key={`three-${i}`}
              d={d}
              fill="none"
              stroke="url(#reframeBranch)"
              strokeWidth={3}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: retracted ? 0 : 1 }}
              transition={{ duration: retracted ? 0.9 : 1.1, ease: "easeInOut", delay: retracted ? (2 - i) * 0.08 : 0.15 + i * 0.1 }}
            />
          ))}

          {/* two branches: grow back to Prong 1 and 2 at phase 6 */}
          {twoBranches.map((d, i) => (
            <motion.path
              key={`two-${i}`}
              d={d}
              fill="none"
              stroke="url(#reframeBranch)"
              strokeWidth={3}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: regrown ? 1 : 0 }}
              transition={{ duration: 1, ease: "easeInOut", delay: i * 0.12 }}
            />
          ))}

          {/* leaf nodes over the two kept prongs */}
          {[
            { x: regrown ? POS.p1Final.x : POS.p1Init.x, y: regrown ? HEAD_FINAL : HEAD_INIT },
            { x: regrown ? POS.p2Final.x : POS.p2Init.x, y: regrown ? HEAD_FINAL : HEAD_INIT },
          ].map((pp, i) => (
            <motion.circle
              key={`leaf-${i}`}
              r={5.5}
              fill="#c28a7c"
              initial={false}
              animate={{ cx: pp.x, cy: pp.y, opacity: regrown ? 1 : phase < 2 ? 1 : 0 }}
              transition={{ duration: 1, ease: EASE }}
            />
          ))}

          {/* arrow: from under alginate, down then left, into the kill-switch window */}
          <motion.path
            d={ARROW_PATH}
            fill="none"
            stroke="#d6884a"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            markerEnd="url(#reframeArrowHead)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: phase >= 3 ? 1 : 0, opacity: arrowVisible ? 1 : 0 }}
            transition={{ pathLength: { duration: 1.1, ease: "easeInOut" }, opacity: { duration: 0.7, ease: "easeInOut" } }}
          />
        </svg>

        {/* Prong 1 */}
        <motion.div
          className="absolute"
          style={cardBox(250, 176)}
          initial={false}
          animate={{ x: px(p1c.x), y: p1c.y, scale: trioScale }}
          transition={{ x: { duration: 1.2, ease: EASE }, y: { duration: 1.2, ease: EASE }, scale: SPRING }}
        >
          <StageCard data={cardP1} clickable={done} onClick={() => onView(1)} />
        </motion.div>

        {/* Prong 2 */}
        <motion.div
          className="absolute"
          style={cardBox(250, 176)}
          initial={false}
          animate={{ x: px(p2c.x), y: p2c.y, scale: trioScale }}
          transition={{ x: { duration: 1.2, ease: EASE }, y: { duration: 1.2, ease: EASE }, scale: SPRING }}
        >
          <StageCard data={cardP2} clickable={done} onClick={() => onView(2)} />
        </motion.div>

        {/* Kill switch */}
        <motion.div
          className="absolute"
          style={cardBox(258, 178)}
          initial={false}
          animate={{
            x: px(killc.x),
            y: killc.y,
            scale: killVisible ? trioScale : 0.82,
            opacity: killVisible ? 1 : 0,
          }}
          transition={{
            x: { duration: 1.2, ease: EASE },
            y: { duration: 1.2, ease: EASE },
            scale: killVisible ? SPRING : { duration: 0.5 },
            opacity: { duration: 0.7, ease: "easeOut" },
          }}
        >
          <StageCard data={cardKill} clickable={done} onClick={() => onView("killswitch")} />
        </motion.div>

        {/* Sodium Alginate: crossed out, then slides right and shrinks */}
        <motion.div
          className="absolute z-10"
          style={cardBox(230, 162)}
          initial={false}
          animate={{ x: px(algc.x), y: algc.y, scale: algFinal ? 0.8 : 1 }}
          transition={{ x: { duration: 1.3, ease: EASE }, y: { duration: 1.3, ease: EASE }, scale: { duration: 1.3, ease: EASE } }}
        >
          <StageCard data={cardAlg} crossed={phase >= 1} dimmed={phase >= 1} clickable={done} onClick={() => onView(3)} />
        </motion.div>
      </div>

      {/* MOBILE: static final layout */}
      <div className="flex flex-col items-center gap-4 md:hidden">
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="h-[150px]">
            <StageCard data={cardP1} clickable onClick={() => onView(1)} compact />
          </div>
          <div className="h-[150px]">
            <StageCard data={cardP2} clickable onClick={() => onView(2)} compact />
          </div>
        </div>
        <div className="h-[140px] w-full sm:w-2/3">
          <StageCard data={cardKill} clickable onClick={() => onView("killswitch")} compact />
        </div>
        <div className="h-[120px] w-2/3 opacity-80">
          <StageCard data={cardAlg} crossed dimmed clickable onClick={() => onView(3)} compact />
        </div>
      </div>

      {/* End CTA: once the sequence finishes, spell out that each card is now a
          door into its model, so testers are not left guessing what to do. */}
      <motion.div
        initial={false}
        animate={{ opacity: done ? 1 : 0, y: done ? 0 : 8 }}
        transition={{ duration: 0.7 }}
        className="mt-8 flex flex-col items-center gap-3"
        style={{ pointerEvents: done ? "auto" : "none" }}
      >
        {/* Boxless prompt on mobile; on sm+ it lives in the heading. */}
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-dune-orange sm:hidden">
          Click on the prongs to proceed to modeling
        </span>
        <button
          onClick={onExplorePortals}
          className="group inline-flex items-center gap-2 text-sm font-semibold text-dune-ash transition-colors hover:text-dune-orange"
        >
          Or explore the individual sandbox portals
        </button>
      </motion.div>
    </div>
  );
}
