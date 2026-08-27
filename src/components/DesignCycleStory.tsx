"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createTimeline, svg, stagger, type Timeline } from "animejs";
import StoryEscape from "@/src/components/landing/StoryEscape";
import { storyTravel } from "@/src/lib/scrollRestore";
import SandParticles from "./dune-story/SandParticles";
import { GlossaryText } from "@/src/components/GlossaryTerm";
import { DUNE } from "@/src/lib/palette";
import {
  CYCLE_BEATS as BEATS,
  CYCLE_STAGES,
  type CycleBeat,
} from "@/src/lib/designCycle";

/**
 * DesignCycleStory: the scroll-scrubbed Engineering Design Cycle.
 *
 * The stage is one full-width column: a caption rail, the beat headline with
 * its paragraph beside it, then the figure spread across the whole width
 * underneath. The figure is a laid-out band, not an overlay, so nothing has to
 * be masked away from the words.
 */

const C = {
  loose: DUNE.orange,
  cured: DUNE.teal,
  mesh: DUNE.rose,
  node: DUNE.orange,
  shield: DUNE.teal,
  cross: "#c0392b",
};

// The figure field. Wide and short, because it sits under the text across the
// full column rather than beside it.
const VB_W = 1300;
const VB_H = 400;
const MID_X = VB_W / 2;

// Each layer owns a horizontal band, so beats that are on screen together do
// not stack on top of each other.
const TILE_Y = 14;
const TILE_H = 88;
const TILE_W = 320;
const TILE_CX = [210, 650, 1090];
const GRID_X0 = 90;
const GRID_X1 = 1210;
const GRID_Y0 = 272;
const GRID_Y1 = 340;
const COLS = 16;
const ROWS = 3;

// Rounded so SSR and client render identically.
const r2 = (n: number) => Math.round(n * 100) / 100;
function seeded(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

interface Grain {
  gx: number;
  gy: number;
  sx: number;
  sy: number;
  r: number;
}

function buildLayout() {
  const grains: Grain[] = [];
  let i = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const gx = r2(GRID_X0 + (c / (COLS - 1)) * (GRID_X1 - GRID_X0));
      const gy = r2(GRID_Y0 + (r / (ROWS - 1)) * (GRID_Y1 - GRID_Y0));
      // Loose: drifting in the same bottom strip the crust later forms in.
      const sx = r2(50 + seeded(i + 1) * 1200);
      const sy = r2(268 + seeded(i + 7) * 104);
      grains.push({ gx, gy, sx, sy, r: r2(3.6 + seeded(i + 3) * 2.4) });
      i++;
    }
  }
  const line = (a: number, b: number) => {
    const A = grains[a];
    const B = grains[b];
    return `M${A.gx} ${A.gy} L${B.gx} ${B.gy}`;
  };
  const mesh: string[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const idx = r * COLS + c;
      if (c < COLS - 1) mesh.push(line(idx, idx + 1));
      if (r < ROWS - 1) mesh.push(line(idx, idx + COLS));
    }
  }
  return { grains, mesh };
}

export default function DesignCycleStory({
  isLightMode,
}: {
  isLightMode: boolean;
}) {
  const { grains, mesh } = useMemo(buildLayout, []);
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const progressRef = useRef(0);
  const glowRef = useRef<HTMLDivElement>(null);
  const windRef = useRef<SVGGElement>(null);
  const prongsRef = useRef<SVGGElement>(null);
  const algRef = useRef<SVGGElement>(null);
  const crossRef = useRef<SVGGElement>(null);
  const shieldRef = useRef<SVGGElement>(null);
  const fieldRef = useRef<SVGGElement>(null);
  const tlRef = useRef<Timeline | null>(null);

  const [active, setActive] = useState(0);
  const [staticMode, setStaticMode] = useState(false);

  useEffect(() => {
    const scope = svgRef.current;
    const stage = stageRef.current;
    const section = sectionRef.current;
    if (!scope || !stage || !section) return;

    const wide = window.matchMedia("(min-width: 768px)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const q = (sel: string) => scope.querySelectorAll(sel);
    const drawables = svg.createDrawable(q(".dcs-mesh") as never);
    const tl = createTimeline({
      autoplay: false,
      defaults: { ease: "inOutQuad", duration: 800 },
    });
    // Beat 1 -> 2: wind dies down, the three prong tiles rise.
    tl.add(windRef.current!, { opacity: [0.85, 0], duration: 700 }, 700);
    tl.add(
      q(".dcs-prong"),
      { opacity: [0, 1], scale: [0.5, 1], delay: stagger(140) },
      1000,
    );
    // Beat 3: pivot. Alginate crossed and dimmed, kill-switch shield rises.
    tl.add(crossRef.current!, { opacity: [0, 1], duration: 500 }, 2000);
    tl.add(algRef.current!, { opacity: [1, 0.28], duration: 600 }, 2100);
    tl.add(
      shieldRef.current!,
      { opacity: [0, 1], translateY: [34, 0], duration: 700 },
      2150,
    );
    // Beat 4: grains snap to the grid and cure, mesh draws. The bands above
    // recede so the crust is the thing being read, not one more layer.
    tl.add(
      q(".dcs-grain"),
      {
        cx: ((el: SVGElement) => Number(el.dataset.gx)) as never,
        cy: ((el: SVGElement) => Number(el.dataset.gy)) as never,
        fill: C.cured,
        duration: 900,
        delay: stagger(7),
      },
      3000,
    );
    tl.add(drawables, { draw: ["0 0", "0 1"], duration: 1000 }, 3100);
    tl.add(prongsRef.current!, { opacity: [1, 0.34], duration: 700 }, 3000);
    tl.add(crossRef.current!, { opacity: [1, 0.34], duration: 700 }, 3000);
    tl.add(shieldRef.current!, { opacity: [1, 0.34], duration: 700 }, 3000);
    // Beat 5: the ground plane and the glow open up.
    tl.add(fieldRef.current!, { opacity: [0, 1], duration: 800 }, 4000);
    tl.add(
      glowRef.current!,
      { opacity: [0.4, 0.8], scale: [0.9, 1.1], duration: 1000 },
      4000,
    );
    tlRef.current = tl;

    if (!wide || reduce) {
      tl.seek(tl.duration);
      setStaticMode(true);
      return () => {
        tl.revert?.();
      };
    }

    // Sticky, not pinned: a pin swaps the stage to position: fixed inside a
    // generated spacer, and crossing that boundary upward flips it back on a
    // frame the browser has already laid out.
    const TRAVEL = storyTravel(2700, 1200);
    const stageEl = stage;
    const sectionEl = section;
    // Sized from the measured viewport. 100vh is the large viewport height,
    // which browser chrome and a classic scrollbar move independently of the
    // height the page is actually laid out in.
    const sizeStage = () => {
      const vh = document.documentElement.clientHeight;
      stageEl.style.height = `${vh}px`;
      sectionEl.style.height = `${vh + TRAVEL}px`;
    };
    stageEl.style.position = "sticky";
    stageEl.style.top = "0";
    stageEl.style.width = "100%";
    sizeStage();

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(sizeStage, 120);
    };
    window.addEventListener("resize", onResize);

    const SMOOTH = 5.5;
    let smoothP = 0;
    let last = performance.now();
    let raf = 0;
    let onScreen = true;

    const readProgress = () => {
      const rect = section.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      if (travel <= 0) return 0;
      return Math.min(1, Math.max(0, -rect.top / travel));
    };

    const vis = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
      },
      { rootMargin: "200px" },
    );
    vis.observe(section);

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!onScreen) return;
      const targetP = readProgress();
      smoothP += (targetP - smoothP) * Math.min(1, dt * SMOOTH);
      if (Math.abs(targetP - smoothP) < 0.0002) smoothP = targetP;
      progressRef.current = smoothP;
      tl.seek(tl.duration * smoothP);
      // Only on a band change, so a scrolling reader is not re-rendering React
      // on every frame.
      const beat = Math.min(BEATS.length - 1, Math.floor(smoothP * BEATS.length));
      setActive((prev) => (prev === beat ? prev : beat));
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      vis.disconnect();
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      section.style.height = "";
      stage.style.position = "";
      stage.style.top = "";
      stage.style.width = "";
      stage.style.height = "";
      tl.revert?.();
      tlRef.current = null;
    };
  }, []);

  return (
    <section id="design-cycle" ref={sectionRef} className="relative w-full">
      <div
        ref={stageRef}
        className="relative flex min-h-screen w-full flex-col overflow-hidden"
      >
        {!staticMode && <StoryEscape progressRef={progressRef} />}

        <SandParticles
          progressRef={progressRef}
          isLightMode={isLightMode}
          densityScale={0.6}
          className="pointer-events-none absolute inset-0 z-0"
        />

        {/* Accent glow, behind the figure band rather than behind the words. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 flex h-[62%] items-center justify-center"
        >
          <div
            ref={glowRef}
            style={{ opacity: 0.4 }}
            className={`h-[80%] w-[72%] rounded-full blur-[130px] ${
              isLightMode
                ? "bg-[radial-gradient(circle,rgba(143,179,172,0.5),rgba(214,136,74,0.25),transparent_70%)]"
                : "bg-[radial-gradient(circle,rgba(143,179,172,0.42),rgba(214,136,74,0.22),transparent_70%)]"
            }`}
          />
        </div>

        <div className="relative z-10 mx-auto flex h-full w-full max-w-[1240px] flex-col px-6 pb-16 pt-28 md:px-10 md:pb-20 md:pt-32">
          {/* Caption rail: what this section is, and where in the loop we are. */}
          <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 border-b border-border pb-4">
            <span className="caption-head">Engineering Design Cycle</span>
            {!staticMode && (
              <StageRail
                stage={BEATS[active].stage}
                turn={BEATS[active].turn}
                isLightMode={isLightMode}
              />
            )}
          </div>

          {staticMode ? (
            <ol className="mt-10 space-y-14">
              {BEATS.map((b, i) => (
                <li key={i}>
                  <BeatBody beat={b} isLightMode={isLightMode} />
                </li>
              ))}
            </ol>
          ) : (
            <>
              {/* The beat. Headline across the left, its paragraph beside it. */}
              <div className="relative mt-9 min-h-[200px] shrink-0 md:mt-10 lg:min-h-[176px]">
                {BEATS.map((b, i) => (
                  <div
                    key={i}
                    className="absolute inset-0 transition-opacity duration-500"
                    style={{
                      opacity: i === active ? 1 : 0,
                      pointerEvents: i === active ? "auto" : "none",
                    }}
                    aria-hidden={i !== active}
                  >
                    <BeatBody beat={b} isLightMode={isLightMode} />
                  </div>
                ))}
              </div>

              {/* The figure, across the full width. */}
              <div className="relative mt-4 min-h-0 w-full flex-1">
                <StoryFigure
                  svgRef={svgRef}
                  grains={grains}
                  mesh={mesh}
                  windRef={windRef}
                  prongsRef={prongsRef}
                  algRef={algRef}
                  crossRef={crossRef}
                  shieldRef={shieldRef}
                  fieldRef={fieldRef}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * One beat: the claim as a headline, the whole turn of the loop beside it.
 */
function BeatBody({
  beat,
  isLightMode,
}: {
  beat: CycleBeat;
  isLightMode: boolean;
}) {
  return (
    <div className="grid gap-x-14 gap-y-5 lg:grid-cols-12">
      <h2
        className={`wght-head text-[length:var(--text-beat)] lg:col-span-6 xl:col-span-5 ${
          isLightMode ? "text-dune-maroon" : "text-dune-paper"
        }`}
        style={{ fontVariationSettings: '"wght" 600' }}
      >
        {beat.title}
      </h2>
      <p className="max-w-[var(--measure)] text-[length:var(--text-micro)] leading-[1.75] text-foreground lg:col-span-6 xl:col-start-7 xl:col-span-6">
        <GlossaryText>{beat.body}</GlossaryText>
      </p>
    </div>
  );
}

/** Where we are in the loop, set on one line in the caption rail. */
function StageRail({
  stage,
  turn,
  isLightMode,
}: {
  stage: string;
  turn: number;
  isLightMode: boolean;
}) {
  const R = 26;
  const CIRC = 2 * Math.PI * R;
  const seg = CIRC / 4;
  const idx = CYCLE_STAGES.indexOf(stage as never);
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 64 64" className="h-8 w-8 shrink-0" aria-hidden>
        <g transform="rotate(-90 32 32)">
          {CYCLE_STAGES.map((_, i) => (
            <circle
              key={i}
              cx="32"
              cy="32"
              r={R}
              fill="none"
              stroke={i === idx ? "var(--dune-orange)" : "var(--dune-ash)"}
              strokeOpacity={i === idx ? 1 : 0.3}
              strokeWidth={i === idx ? 4 : 1.5}
              strokeDasharray={`${seg - 5} ${CIRC - seg + 5}`}
              strokeDashoffset={-i * seg}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          ))}
        </g>
        <text
          x="32"
          y="39"
          textAnchor="middle"
          fontSize="22"
          fontWeight="700"
          fill={isLightMode ? DUNE.maroon : DUNE.orange}
        >
          {turn}
        </text>
      </svg>
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {CYCLE_STAGES.map((st, i) => (
          <span
            key={st}
            className={`caption transition-colors duration-500 ${
              i === idx ? "text-dune-orange" : "text-muted-foreground opacity-45"
            }`}
          >
            {st}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The figure. Every layer gets its own horizontal band across the full width,
 * so the beats that are on screen together sit side by side rather than piling
 * into one corner.
 */
function StoryFigure({
  svgRef,
  grains,
  mesh,
  windRef,
  prongsRef,
  algRef,
  crossRef,
  shieldRef,
  fieldRef,
}: {
  svgRef: React.RefObject<SVGSVGElement | null>;
  grains: Grain[];
  mesh: string[];
  windRef: React.RefObject<SVGGElement | null>;
  prongsRef: React.RefObject<SVGGElement | null>;
  algRef: React.RefObject<SVGGElement | null>;
  crossRef: React.RefObject<SVGGElement | null>;
  shieldRef: React.RefObject<SVGGElement | null>;
  fieldRef: React.RefObject<SVGGElement | null>;
}) {
  const tiles = [
    { cx: TILE_CX[0], n: 1, label: "γ-PGA" },
    { cx: TILE_CX[1], n: 2, label: "CA · MICP" },
  ];
  const algCx = TILE_CX[2];
  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    >
      {/* wind, across the lane the shield later takes */}
      <g
        ref={windRef}
        style={{ opacity: 0.85 }}
        stroke={C.loose}
        strokeWidth={2}
        strokeLinecap="round"
      >
        {[152, 178, 204, 230].map((y, i) => (
          <path
            key={i}
            d={`M${20 + i * 20} ${y} q 160 -18 320 0 t 320 0 t 320 0 t 320 0`}
            fill="none"
            opacity={0.5 - i * 0.07}
          />
        ))}
      </g>

      {/* cross-link mesh, drawn on scroll */}
      <g fill="none" stroke={C.mesh} strokeWidth={1.8} strokeLinecap="round">
        {mesh.map((d, i) => (
          <path key={i} className="dcs-mesh" d={d} opacity={0.7} />
        ))}
      </g>

      {/* grains: loose -> bound */}
      <g>
        {grains.map((g, i) => (
          <circle
            key={i}
            className="dcs-grain"
            data-gx={g.gx}
            data-gy={g.gy}
            cx={g.sx}
            cy={g.sy}
            r={g.r}
            fill={C.loose}
          />
        ))}
      </g>

      {/* the three routes, one band, spread across the whole width */}
      <g ref={prongsRef}>
        {tiles.map((p) => (
          <Tile key={p.n} cx={p.cx} n={p.n} label={p.label} />
        ))}
        <g
          ref={algRef}
          className="dcs-prong"
          style={{ opacity: 0, transformBox: "fill-box", transformOrigin: "center" }}
        >
          <TileBody cx={algCx} n={3} label="Alginate" />
        </g>
      </g>

      {/* the route that was dropped, and why it reads as dropped */}
      <g ref={crossRef} style={{ opacity: 0 }}>
        <g stroke={C.cross} strokeWidth={4.5} strokeLinecap="round">
          <path d={`M${algCx - TILE_W / 2 + 22} ${TILE_Y + 18} L${algCx + TILE_W / 2 - 22} ${TILE_Y + TILE_H - 18}`} />
          <path d={`M${algCx + TILE_W / 2 - 22} ${TILE_Y + 18} L${algCx - TILE_W / 2 + 22} ${TILE_Y + TILE_H - 18}`} />
        </g>
        <text
          x={algCx}
          y={TILE_Y + TILE_H + 30}
          textAnchor="middle"
          fontSize={14}
          fontWeight={700}
          letterSpacing={2.5}
          fill={C.cross}
        >
          DROPPED
        </text>
      </g>

      {/* the layer added over both survivors */}
      <g ref={shieldRef} style={{ opacity: 0 }}>
        <path
          d={`M${MID_X} 132 L${MID_X + 40} 148 L${MID_X + 40} 182 Q${MID_X + 40} 216 ${MID_X} 232 Q${MID_X - 40} 216 ${MID_X - 40} 182 L${MID_X - 40} 148 Z`}
          fill="none"
          stroke={C.shield}
          strokeWidth={3.5}
          strokeLinejoin="round"
        />
        <path
          d={`M${MID_X - 18} 183 L${MID_X - 4} 198 L${MID_X + 20} 163`}
          fill="none"
          stroke={C.shield}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          x={MID_X}
          y={252}
          textAnchor="middle"
          fontSize={14}
          fontWeight={700}
          letterSpacing={2.5}
          fill={C.shield}
        >
          KILL SWITCH ADDED
        </text>
      </g>

      {/* the ground it ends up on */}
      <g
        ref={fieldRef}
        style={{ opacity: 0 }}
        stroke={C.cured}
        strokeWidth={1.4}
        opacity={0.55}
      >
        <path d="M50 362 L1250 362" />
        {[374, 384, 392].map((y, i) => (
          <path key={i} d={`M${40 - i * 12} ${y} L${1260 + i * 12} ${y}`} opacity={0.5 - i * 0.13} />
        ))}
        {[170, 410, 650, 890, 1130].map((x, i) => (
          <path key={`v${i}`} d={`M${x} 362 L${x + (x - MID_X) * 0.2} 400`} opacity={0.35} />
        ))}
      </g>
    </svg>
  );
}

function Tile({ cx, n, label }: { cx: number; n: number; label: string }) {
  return (
    <g
      className="dcs-prong"
      style={{ opacity: 0, transformBox: "fill-box", transformOrigin: "center" }}
    >
      <TileBody cx={cx} n={n} label={label} />
    </g>
  );
}

function TileBody({ cx, n, label }: { cx: number; n: number; label: string }) {
  return (
    <>
      <rect
        x={cx - TILE_W / 2}
        y={TILE_Y}
        width={TILE_W}
        height={TILE_H}
        rx={6}
        fill="rgba(214,136,74,0.08)"
        stroke={C.node}
        strokeWidth={2}
      />
      <circle cx={cx - TILE_W / 2 + 44} cy={TILE_Y + TILE_H / 2} r={17} fill={C.node} />
      <text
        x={cx - TILE_W / 2 + 44}
        y={TILE_Y + TILE_H / 2 + 6}
        textAnchor="middle"
        fontSize={18}
        fontWeight={800}
        fill="#1a120c"
      >
        {n}
      </text>
      <text
        x={cx + 24}
        y={TILE_Y + TILE_H / 2 + 7}
        textAnchor="middle"
        fontSize={20}
        fontWeight={700}
        fill={C.node}
      >
        {label}
      </text>
    </>
  );
}
