"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createTimeline, svg, stagger, type Timeline } from "animejs";
import { gsap } from "gsap";
import StoryEscape from "@/src/components/landing/StoryEscape";
import { storyPinLength } from "@/src/lib/scrollRestore";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import SandParticles from "./dune-story/SandParticles";
import { GlossaryText } from "@/src/components/GlossaryTerm";
import {
  CYCLE_BEATS as BEATS,
  CYCLE_STAGES,
  type CycleBeat,
} from "@/src/lib/designCycle";

/**
 * DesignCycleStory: the scroll-scrubbed "Engineering Design Cycle" story.
 * =========================================================================
 * A pinned, full-screen stage. One large SVG fills the right (or the whole
 * background on mobile) and MORPHS live as you scroll, telling the story of the
 * model in five beats: loose sand -> the first three-prong design -> the pivot
 * to two prongs plus a kill switch -> the model linking cell to crust -> field
 * scale-up. A panel on the left and a dot rail track which beat you are on.
 *
 * Motion split (per the brief): GSAP ScrollTrigger owns the pin + scroll
 * progress; an anime.js timeline (autoplay off) owns the SVG choreography and is
 * scrubbed by seeking it to `progress * duration`. No image frames, so it stays
 * crisp at any size and reads in both themes. Under reduced motion / small
 * screens there is no pin: the finished crust is shown and the panel is a list.
 */

// Palette (Dunelock) picked to read on both the warm sand and dark ember stages.
const C = {
  loose: "#d6884a", // dune-orange, loose grains
  cured: "#8fb3ac", // dune-teal, bound crust
  mesh: "#c28a7c", // dune-rose, cross-links
  node: "#d6884a",
  shield: "#8fb3ac",
  cross: "#c0392b",
};

// Deterministic layout so scatter/grid/mesh are stable across renders. The
// crust (grid) sits low-right so it clears the text panel on the left; the loose
// grains scatter across the open sky above and to the right of the panel.
const COLS = 9;
const ROWS = 3;
const GRID_X0 = 580;
const GRID_X1 = 1150;
const GRID_Y0 = 575;
const GRID_Y1 = 685;

// Rounded so the SSR and client renders are byte-identical (Math.sin can differ
// in its last bit across engines, which would trip a hydration mismatch).
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
      // Loose: blown up into the open sky, spread across the top and right.
      const sx = r2(220 + seeded(i + 1) * 940);
      const sy = r2(70 + seeded(i + 7) * 300);
      grains.push({ gx, gy, sx, sy, r: r2(5 + seeded(i + 3) * 3) });
      i++;
    }
  }
  // Mesh: connect each grid node to its right and bottom neighbour.
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
  // On mobile / reduced motion there is no scrub, so the whole story is shown as
  // a readable stacked list instead of the single cross-fading beat.
  const [staticMode, setStaticMode] = useState(false);

  useEffect(() => {
    const scope = svgRef.current;
    const stage = stageRef.current;
    if (!scope || !stage) return;

    const wide = window.matchMedia("(min-width: 768px)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Build the morph timeline (kept paused; we scrub it by seeking).
    const q = (sel: string) => scope.querySelectorAll(sel);
    const drawables = svg.createDrawable(q(".dcs-mesh") as never);
    const tl = createTimeline({
      autoplay: false,
      defaults: { ease: "inOutQuad", duration: 800 },
    });
    // Beat 1 -> 2: wind dies down, the three prong nodes rise.
    tl.add(windRef.current!, { opacity: [0.85, 0], duration: 700 }, 700);
    tl.add(
      q(".dcs-prong"),
      { opacity: [0, 1], scale: [0.5, 1], delay: stagger(140) },
      1000,
    );
    // Beat 3: pivot. Alginate node crossed and dimmed, kill-switch shield rises.
    tl.add(crossRef.current!, { opacity: [0, 1], duration: 500 }, 2000);
    tl.add(algRef.current!, { opacity: [1, 0.28], duration: 600 }, 2100);
    tl.add(
      shieldRef.current!,
      { opacity: [0, 1], translateY: [34, 0], duration: 700 },
      2150,
    );
    // Beat 4: grains snap to the grid, warm to the cured colour, mesh draws.
    tl.add(
      q(".dcs-grain"),
      {
        // anime.js function values: (target) => value, per grain's grid coords.
        cx: ((el: SVGElement) => Number(el.dataset.gx)) as never,
        cy: ((el: SVGElement) => Number(el.dataset.gy)) as never,
        fill: C.cured,
        duration: 900,
        delay: stagger(7),
      },
      3000,
    );
    tl.add(drawables, { draw: ["0 0", "0 1"], duration: 1000 }, 3100);
    // Beat 5: the field/horizon and the glow open up.
    tl.add(fieldRef.current!, { opacity: [0, 1], duration: 800 }, 4000);
    tl.add(
      glowRef.current!,
      { opacity: [0.4, 0.85], scale: [0.9, 1.12], duration: 1000 },
      4000,
    );
    tlRef.current = tl;

    if (!wide || reduce) {
      // No pin: jump to the finished crust and show the panel as a static list.
      tl.seek(tl.duration);
      setStaticMode(true);
      return () => {
        tl.revert?.();
      };
    }

    gsap.registerPlugin(ScrollTrigger);
    const st = ScrollTrigger.create({
      trigger: stage,
      start: "top top",
      // Longer travel (~900px/beat) so a small scroll no longer jumps between
      // beats; the scrub smoothing keeps it from feeling heavy.
      // Pin length, see the note in LandingCinematic: normalised progress, so
      // this is a uniform speed-up rather than a change to any beat.
      end: storyPinLength(2700, 1200),
      pin: true,
      pinSpacing: true,
      // Apply the pin slightly early to avoid a one-frame flash at the top
      // boundary when scrolling up out of the pinned range.
      anticipatePin: 1,
      // Smoothing lag: the timeline eases toward the scroll position instead of
      // hard-snapping. This is what stops the reverse-play "breaks" when you fling
      // back up to this section from lower on the page. invalidateOnRefresh
      // re-measures cleanly on resize.
      scrub: 0.6,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        progressRef.current = self.progress;
        tl.seek(tl.duration * self.progress);
        setActive(Math.min(BEATS.length - 1, Math.floor(self.progress * BEATS.length)));
      },
    });

    return () => {
      st.kill();
      tl.revert?.();
      tlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section id="design-cycle" className="relative w-full">
      <div
        ref={stageRef}
        className="relative flex min-h-screen w-full flex-col overflow-hidden py-20 md:justify-center md:py-0"
      >
        {/* Skip / Escape / progress rule, inside the pinned stage. */}
        {!staticMode && (
          <StoryEscape progressRef={progressRef} label="Skip to the models" />
        )}

        {/* Ambient drifting sand, consistent with the dune story. */}
        <SandParticles
          progressRef={progressRef}
          isLightMode={isLightMode}
          className="pointer-events-none absolute inset-0 z-0"
        />

        {/* Soft accent glow behind the SVG (scaled by the timeline). */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div
            ref={glowRef}
            style={{ opacity: 0.4 }}
            className={`h-[70%] w-[70%] rounded-full blur-[120px] ${
              isLightMode
                ? "bg-[radial-gradient(circle,rgba(143,179,172,0.5),rgba(214,136,74,0.25),transparent_70%)]"
                : "bg-[radial-gradient(circle,rgba(143,179,172,0.42),rgba(214,136,74,0.22),transparent_70%)]"
            }`}
          />
        </div>

        {/* The morphing story SVG: fills the stage, bleeds off the right edge. */}
        <svg
          ref={svgRef}
          viewBox="0 0 1200 800"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-90"
          aria-hidden
        >
          {/* wind streaks (beat 1) */}
          <g ref={windRef} style={{ opacity: 0.85 }} stroke={C.loose} strokeWidth={2} strokeLinecap="round">
            {[160, 250, 340, 430].map((y, i) => (
              <path
                key={i}
                d={`M${120 + i * 40} ${y} q 90 -18 180 0 t 180 0`}
                fill="none"
                opacity={0.5 - i * 0.06}
              />
            ))}
          </g>

          {/* cross-link mesh (beat 4), drawn on scroll */}
          <g fill="none" stroke={C.mesh} strokeWidth={2.2} strokeLinecap="round">
            {mesh.map((d, i) => (
              <path key={i} className="dcs-mesh" d={d} opacity={0.75} />
            ))}
          </g>

          {/* grains: scatter -> grid */}
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

          {/* three prong tiles (beat 2): clear, labelled cards so "three prongs"
              actually reads as three named routes, not faint dots. */}
          <g ref={prongsRef}>
            {[
              { x: 700, label: "γ-PGA" },
              { x: 905, label: "CA · MICP" },
            ].map((p, i) => (
              <g
                key={i}
                className="dcs-prong"
                style={{ opacity: 0, transformBox: "fill-box", transformOrigin: "center" }}
              >
                <rect
                  x={p.x - 92}
                  y={226}
                  width={184}
                  height={92}
                  rx={14}
                  fill="rgba(214,136,74,0.12)"
                  stroke={C.node}
                  strokeWidth={3}
                />
                <circle cx={p.x - 60} cy={272} r={16} fill={C.node} />
                <text x={p.x - 60} y={279} textAnchor="middle" fontSize={19} fontWeight={800} fill="#1a120c">
                  {i + 1}
                </text>
                <text x={p.x + 26} y={279} textAnchor="middle" fontSize={20} fontWeight={700} fill={C.node}>
                  {p.label}
                </text>
              </g>
            ))}
            {/* alginate tile (crossed + dimmed at the pivot) */}
            <g
              ref={algRef}
              className="dcs-prong"
              style={{ opacity: 0, transformBox: "fill-box", transformOrigin: "center" }}
            >
              <rect
                x={1110 - 92}
                y={226}
                width={184}
                height={92}
                rx={14}
                fill="rgba(214,136,74,0.12)"
                stroke={C.node}
                strokeWidth={3}
              />
              <circle cx={1110 - 60} cy={272} r={16} fill={C.node} />
              <text x={1110 - 60} y={279} textAnchor="middle" fontSize={19} fontWeight={800} fill="#1a120c">
                3
              </text>
              <text x={1110 + 24} y={279} textAnchor="middle" fontSize={20} fontWeight={700} fill={C.node}>
                Alginate
              </text>
            </g>
          </g>

          {/* cross over the alginate tile (beat 3), with the reason on it, so a
              still frame cannot be read as "replaced by the shield below" */}
          <g ref={crossRef} style={{ opacity: 0 }}>
            <g stroke={C.cross} strokeWidth={5} strokeLinecap="round">
              <path d="M1030 232 L1190 312" />
              <path d="M1190 232 L1030 312" />
            </g>
            <text
              x={1110}
              y={344}
              textAnchor="middle"
              fontSize={15}
              fontWeight={700}
              letterSpacing={2}
              fill={C.cross}
            >
              DROPPED
            </text>
          </g>

          {/* kill-switch shield (beat 3), centred in the right field. It is an
              addition over both prongs, not a stand-in for the tile above. */}
          <g ref={shieldRef} style={{ opacity: 0 }}>
            <text
              x={945}
              y={484}
              textAnchor="middle"
              fontSize={15}
              fontWeight={700}
              letterSpacing={2}
              fill={C.shield}
            >
              KILL SWITCH, ADDED
            </text>
            <path
              d="M945 360 L983 375 L983 407 Q983 441 945 458 Q907 441 907 407 L907 375 Z"
              fill="none"
              stroke={C.shield}
              strokeWidth={4}
              strokeLinejoin="round"
            />
            <path d="M928 408 L941 423 L964 390" fill="none" stroke={C.shield} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </g>

          {/* field / horizon opening up (beat 5) */}
          <g ref={fieldRef} style={{ opacity: 0 }} stroke={C.cured} strokeWidth={1.6} opacity={0.6}>
            <path d="M120 690 L1080 690" />
            {[720, 752, 784].map((y, i) => (
              <path key={i} d={`M${180 - i * 30} ${y} L${1020 + i * 30} ${y}`} opacity={0.5 - i * 0.12} />
            ))}
            {[300, 500, 700, 900].map((x, i) => (
              <path key={`v${i}`} d={`M${x} 690 L${x + (x - 600) * 0.4} 790`} opacity={0.4} />
            ))}
          </g>
        </svg>

        {/* Panel + dots (left). Sits above the SVG. */}
        <div className="relative z-10 mx-auto w-full max-w-6xl px-5 sm:px-8">
          <div className="max-w-xl">
            <div
              className={`rounded-[16px] border p-6 ${
                isLightMode
                  ? "border-dune-maroon/12 bg-dune-paper/80"
                  : "border-dune-paper/12 bg-[#120d0a]/78"
              }`}
            >
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] text-dune-ash">
                Engineering Design Cycle
              </span>

              {staticMode ? (
                // Mobile / reduced motion: every turn of the loop as a list.
                <ol className="mt-4 space-y-8">
                  {BEATS.map((b, i) => (
                    <li key={i}>
                      <BeatBody beat={b} isLightMode={isLightMode} />
                    </li>
                  ))}
                </ol>
              ) : (
                <>
                  <CycleRing
                    stage={BEATS[active].stage}
                    turn={BEATS[active].turn}
                    isLightMode={isLightMode}
                  />
                  {/* Cross-fade the active beat. Sized for the longest one so
                      the text never spills onto the ring. */}
                  <div className="relative min-h-[380px] sm:min-h-[350px]">
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
                        <BeatBody
                          beat={b}
                          isLightMode={isLightMode}
                          active={i === active}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-2.5">
                    {BEATS.map((_, i) => (
                      <span
                        key={i}
                        className={`h-2.5 rounded-full transition-all duration-300 ${
                          i === active
                            ? "w-7 bg-dune-orange"
                            : "w-2.5 bg-dune-ash/50"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * One beat: the question, what was run, what it changed, and where the evidence
 * is. Four labelled lines rather than a paragraph, because a judge reading the
 * page is checking for exactly those four things.
 */
function BeatBody({
  beat,
  isLightMode,
  active = true,
}: {
  beat: CycleBeat;
  isLightMode: boolean;
  active?: boolean;
}) {
  return (
    <>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3 text-[11px] font-bold uppercase tracking-[0.2em] text-dune-orange">
        <span>{beat.stage}</span>
        <span className="opacity-60">
          {beat.turn === 1 ? "first turn" : "second turn"}
        </span>
      </div>
      <h2
        className={`mb-3.5 font-display text-2xl font-black uppercase tracking-tight ${
          isLightMode ? "text-dune-maroon" : "text-dune-orange"
        }`}
      >
        {beat.title}
      </h2>
      <dl className="space-y-3 text-sm leading-relaxed text-foreground">
        <Line term="Asked">{beat.question}</Line>
        <Line term="Ran">{beat.did}</Line>
        <Line term="Changed">{beat.changed}</Line>
      </dl>
      {beat.evidence && (
        <Link
          href={beat.evidence.href}
          tabIndex={active ? 0 : -1}
          className="caption rule-link mt-4 inline-block text-dune-orange"
        >
          Evidence: {beat.evidence.label}
        </Link>
      )}
    </>
  );
}

function Line({ term, children }: { term: string; children: string }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-x-3">
      <dt className="caption pt-1">{term}</dt>
      <dd>
        <GlossaryText>{children}</GlossaryText>
      </dd>
    </div>
  );
}

/**
 * Where we are in the loop. Four arcs, the current one lit. A cycle that is
 * drawn as a cycle is checkable at a glance; a list of five paragraphs is not.
 */
function CycleRing({
  stage,
  turn,
  isLightMode,
}: {
  stage: string;
  turn: number;
  isLightMode: boolean;
}) {
  const R = 26;
  const C = 2 * Math.PI * R;
  const seg = C / 4;
  const idx = CYCLE_STAGES.indexOf(stage as never);
  return (
    <div className="mb-5 mt-3 flex items-center gap-4">
      <svg viewBox="0 0 64 64" className="h-12 w-12 shrink-0" aria-hidden>
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
              strokeWidth={i === idx ? 3 : 1}
              strokeDasharray={`${seg - 5} ${C - seg + 5}`}
              strokeDashoffset={-i * seg}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          ))}
        </g>
        <text
          x="32"
          y="37"
          textAnchor="middle"
          fontSize="15"
          fontWeight="700"
          fill={isLightMode ? "#6e1e18" : "#d6884a"}
        >
          {turn}
        </text>
      </svg>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {CYCLE_STAGES.map((st, i) => (
          <span
            key={st}
            className={`caption transition-colors duration-500 ${
              i === idx ? "text-dune-orange" : "text-muted-foreground opacity-50"
            }`}
          >
            {st}
          </span>
        ))}
      </div>
    </div>
  );
}
