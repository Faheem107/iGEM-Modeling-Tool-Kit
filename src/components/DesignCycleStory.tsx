"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createTimeline, svg, stagger, type Timeline } from "animejs";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SandParticles from "./dune-story/SandParticles";
import { GlossaryText } from "@/src/components/GlossaryTerm";

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

interface Beat {
  label: string;
  title: string;
  body: string;
}

const BEATS: Beat[] = [
  {
    label: "Where we started",
    title: "Wind moves the sand",
    body: "Loose desert grains lift and drift with the wind. We wanted a living surface treatment that binds those grains into a stable crust, so the first job was to describe the problem in numbers a model could work with.",
  },
  {
    label: "The first design",
    title: "Three prongs",
    body: "We began with three routes to a crust: γ-PGA overexpression, carbonic-anhydrase biomineralization, and a sodium-alginate binder. Each one became a module we could simulate on its own.",
  },
  {
    label: "What we learned",
    title: "Two prongs and a kill switch",
    body: "Alginate did not hold up as a prong, so we dropped it and added a genetically encoded kill switch for biocontainment. The plan became two engineered prongs plus a safety brake.",
  },
  {
    label: "Where it is now",
    title: "The model links cell to crust",
    body: "We simulate polymer cross-linking, weigh metabolic trade-offs with flux balance analysis, and estimate how a treated surface resists wind shear. In the model the grains lock into a cured crust.",
  },
  {
    label: "What comes next",
    title: "From bench to field",
    body: "The outputs point to the assays worth running and the field scale to aim for. The toolkit is built to keep growing as real measurements come back from the lab.",
  },
];

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
      end: "+=4500",
      pin: true,
      pinSpacing: true,
      // Smoothing lag: the timeline eases toward the scroll position instead of
      // hard-snapping. This is what stops the reverse-play "breaks" when you fling
      // back up to this section from lower on the page. anticipatePin avoids the
      // one-frame jump as the pin engages; invalidateOnRefresh re-measures cleanly.
      scrub: 0.6,
      anticipatePin: 1,
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

          {/* three prong nodes (beat 2), rise in, in the open right area */}
          <g ref={prongsRef}>
            {[770, 945].map((x, i) => (
              <g
                key={i}
                className="dcs-prong"
                style={{ opacity: 0, transformBox: "fill-box", transformOrigin: "center" }}
              >
                <circle cx={x} cy={270} r={32} fill="none" stroke={C.node} strokeWidth={4} />
                <circle cx={x} cy={270} r={9} fill={C.node} />
              </g>
            ))}
            {/* alginate node (crossed + dimmed at the pivot) */}
            <g
              ref={algRef}
              className="dcs-prong"
              style={{ opacity: 0, transformBox: "fill-box", transformOrigin: "center" }}
            >
              <circle cx={1120} cy={270} r={32} fill="none" stroke={C.node} strokeWidth={4} />
              <circle cx={1120} cy={270} r={9} fill={C.node} />
            </g>
          </g>

          {/* cross over the alginate node (beat 3) */}
          <g ref={crossRef} style={{ opacity: 0 }} stroke={C.cross} strokeWidth={5} strokeLinecap="round">
            <path d="M1096 246 L1144 294" />
            <path d="M1144 246 L1096 294" />
          </g>

          {/* kill-switch shield (beat 3), centred in the right field */}
          <g ref={shieldRef} style={{ opacity: 0 }}>
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
              className={`rounded-[16px] border p-6 sm:p-8 backdrop-blur-[2px] ${
                isLightMode
                  ? "border-dune-maroon/12 bg-dune-paper/55"
                  : "border-dune-paper/12 bg-[#120d0a]/50"
              }`}
            >
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] text-dune-ash">
                Engineering Design Cycle
              </span>

              {staticMode ? (
                // Mobile / reduced motion: the full five-beat story as a list.
                <ol className="mt-4 space-y-6">
                  {BEATS.map((b, i) => (
                    <li key={i}>
                      <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-dune-orange">
                        {b.label}
                      </div>
                      <h3
                        className={`mb-2 text-xl font-black uppercase tracking-tight font-display ${
                          isLightMode ? "text-dune-maroon" : "text-dune-orange"
                        }`}
                      >
                        {b.title}
                      </h3>
                      <p
                        className={`text-sm leading-relaxed ${
                          isLightMode ? "text-slate-800" : "text-slate-200"
                        }`}
                      >
                        <GlossaryText>{b.body}</GlossaryText>
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <>
                  <div className="mt-2 mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-dune-orange">
                    {BEATS[active].label}
                  </div>
                  {/* Cross-fade the active beat's title + body. Sized for the
                      longest beat so the text never spills onto the dot rail. */}
                  <div className="relative min-h-[320px] sm:min-h-[280px]">
                    {BEATS.map((b, i) => (
                      <div
                        key={i}
                        className="absolute inset-0 transition-opacity duration-500"
                        style={{ opacity: i === active ? 1 : 0 }}
                        aria-hidden={i !== active}
                      >
                        <h2
                          className={`mb-3 text-2xl sm:text-4xl font-black uppercase tracking-tight font-display ${
                            isLightMode ? "text-dune-maroon" : "text-dune-orange"
                          }`}
                        >
                          {b.title}
                        </h2>
                        <p
                          className={`text-sm sm:text-lg leading-relaxed ${
                            isLightMode ? "text-slate-800" : "text-slate-200"
                          }`}
                        >
                          <GlossaryText>{b.body}</GlossaryText>
                        </p>
                      </div>
                    ))}
                  </div>
                  {/* dot rail */}
                  <div className="mt-6 flex items-center gap-2.5">
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
