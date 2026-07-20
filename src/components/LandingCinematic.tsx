"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { createTimeline, svg, type Timeline } from "animejs";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTransition, animated } from "@react-spring/web";
import { motion, AnimatePresence } from "motion/react";
import { GrainGradient } from "@paper-design/shaders-react";
import { TextEffect } from "@/components/motion-primitives/text-effect";
import SandParticles from "./dune-story/SandParticles";
import type { MolstarApi } from "@/components/molstar-viewer";
import {
  microGrains,
  polymerBridges,
  latticePoints,
  type Grain,
} from "@/src/lib/dune-story/geometry";

// Mol* is WebGL + heavy; load it client-only and only once the story nears the
// protein beat (see caMounted below), so it never blocks first paint or SSR.
const MolstarViewer = dynamic(() => import("@/components/molstar-viewer"), {
  ssr: false,
});

/**
 * LandingCinematic: the whole top-of-page as one pinned, scroll-scrubbed shot.
 * =========================================================================
 * animejs.com "engine" feel: there is no separate hero and then a story, it is
 * one continuous pinned canvas from the very top. Beats:
 *   hero title over the desert -> dive DOWN into the sand -> a grain + a
 *   B. subtilis cell -> zoom into the carbonic-anhydrase dimer (real 3D, PDB
 *   1JD0) -> the gamma-PGA polymer locks grain to grain -> pull back to the
 *   stabilized crust.
 * Scenes cross-fade over a continuous camera scale, so it reads as one move.
 *
 * Motion split: GSAP ScrollTrigger owns the pin + progress; scenes are placed
 * imperatively per frame (no React re-render); anime.js draws the polymer;
 * react-spring cross-fades the captions; a Canvas layer carries drifting sand;
 * Mol* renders the spinning protein.
 */

interface BeatCopy {
  label: string;
  line: React.ReactNode;
}

const BEATS: BeatCopy[] = [
  { label: "The problem", line: "Loose desert sand lifts and blows away in the wind." },
  {
    label: "Micro scale",
    line: (
      <>
        A single grain, and a living <i>Bacillus subtilis</i> cell.
      </>
    ),
  },
  {
    label: "Carbonic anhydrase",
    line: (
      <>
        A CA dimer on the cell surface grows CaCO<sub>3</sub> cement.
      </>
    ),
  },
  { label: "The fix", line: "γ-PGA chains cross-link and lock grain to grain." },
  { label: "The result", line: "The surface holds together as a stabilized crust." },
];

const C = {
  sand: "#d6884a",
  sandDeep: "#b5702f",
  cured: "#8fb3ac",
  teal: "#3E8C82",
  mesh: "#c28a7c",
};

const smooth = (x: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export default function LandingCinematic({
  isLightMode,
  heroPeek = false,
  onOpenAdventure,
}: {
  isLightMode: boolean;
  heroPeek?: boolean;
  onOpenAdventure?: () => void;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const scopeRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const desertRef = useRef<HTMLDivElement>(null);
  const descentRef = useRef<HTMLDivElement>(null);
  const microRef = useRef<HTMLDivElement>(null);
  const caRef = useRef<HTMLDivElement>(null);
  const crustRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<Timeline | null>(null);
  const molApiRef = useRef<MolstarApi | null>(null);
  const lastSpinRef = useRef<number>(-1);
  const progressRef = useRef(0);

  const [active, setActive] = useState(0);
  const [showCaption, setShowCaption] = useState(false);
  const [staticMode, setStaticMode] = useState(false);
  const [caMounted, setCaMounted] = useState(false);

  const grains = useMemo<Grain[]>(() => microGrains(), []);
  const bridges = useMemo(() => polymerBridges(grains), [grains]);
  const lattice = useMemo(
    () => latticePoints(grains[0].cx, grains[0].cy, grains[0].r),
    [grains],
  );

  useEffect(() => {
    const scope = scopeRef.current;
    const section = sectionRef.current;
    if (!scope || !section) return;

    const wide = window.matchMedia("(min-width: 768px)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const bridgeEls = svg.createDrawable(
      scope.querySelectorAll(".ds-bridge") as never,
    );
    const tl = createTimeline({
      autoplay: false,
      defaults: { ease: "inOutQuad", duration: 800 },
    });
    tl.add(bridgeEls, { draw: ["0 0", "0 1"], duration: 900 }, 0);
    tl.add(
      scope.querySelectorAll(".ds-node"),
      { opacity: [0, 1], scale: [0, 1], duration: 500 },
      500,
    );
    tlRef.current = tl;

    const setLayer = (
      el: HTMLElement | null,
      transform: string,
      opacity: number,
    ) => {
      if (!el) return;
      el.style.transform = transform;
      el.style.opacity = opacity.toFixed(3);
    };

    const renderFrame = (p: number) => {
      progressRef.current = p;

      // Hero title fades out as the dive begins.
      if (heroRef.current) {
        const o = 1 - smooth(p, 0.03, 0.1);
        heroRef.current.style.opacity = o.toFixed(3);
        heroRef.current.style.pointerEvents = o < 0.05 ? "none" : "auto";
      }

      // Desert (photo) zooms into the near sand and fades. Low origin so the
      // camera plunges INTO the surface rather than flying over the dunes.
      const dive = smooth(p, 0.1, 0.24);
      setLayer(desertRef.current, `scale(${(1 + dive * 4.4).toFixed(4)})`, 1 - smooth(p, 0.16, 0.27));

      // A brief, light darkening as we pass under the surface (quick pass, not a
      // black hold, so it never reads as a gap).
      if (descentRef.current)
        descentRef.current.style.opacity = (
          0.62 * smooth(p, 0.13, 0.19) * (1 - smooth(p, 0.2, 0.3))
        ).toFixed(3);

      // Micro world: settle in, then zoom toward the cell for the CA beat and
      // pull back for the polymer, then fade to the crust.
      const microIn = smooth(p, 0.14, 0.3);
      const caZoom = smooth(p, 0.4, 0.52);
      const caBack = smooth(p, 0.56, 0.66);
      const caPeak = caZoom * (1 - caBack);
      const microOut = smooth(p, 0.8, 0.9);
      setLayer(
        microRef.current,
        `scale(${((2.2 - microIn * 1.2) * (1 + caPeak * 0.9)).toFixed(4)})`,
        microIn * (1 - microOut) * (1 - 0.62 * caPeak),
      );

      // Carbonic-anhydrase 3D layer fades in for its beat, then recedes.
      setLayer(caRef.current, `scale(${(0.86 + caZoom * 0.14).toFixed(4)})`, caPeak);
      // Mount the WebGL viewer once as we approach the protein beat and keep it
      // mounted. Turning the spin OFF when the beat is off-screen lets Mol* idle
      // with no render loop, so we avoid both the always-spinning cost of the
      // original and the ~400ms freeze of remounting the GL context on every pass.
      if (!caMounted && p > 0.28) setCaMounted(true);
      const inCaBeat = p > 0.34 && p < 0.72;
      if (molApiRef.current) {
        const speed = inCaBeat ? (caPeak > 0.4 ? 1.1 : 0.14) : 0;
        if (speed !== lastSpinRef.current) {
          molApiRef.current.setSpinSpeed(speed);
          lastSpinRef.current = speed;
        }
      }

      // Polymer bridges draw over the fix beat.
      tl.seek(tl.duration * smooth(p, 0.58, 0.78));

      // Crust rises into place and holds.
      const crustIn = smooth(p, 0.8, 0.94);
      setLayer(crustRef.current, `scale(${(1.4 - crustIn * 0.4).toFixed(4)})`, crustIn);

      // Caption: hidden during the hero, then tracks the beat.
      setShowCaption((prev) => {
        const next = p >= 0.095;
        return prev === next ? prev : next;
      });
      const beat = p < 0.22 ? 0 : p < 0.4 ? 1 : p < 0.58 ? 2 : p < 0.78 ? 3 : 4;
      setActive((prev) => (prev === beat ? prev : beat));
    };

    if (!wide || reduce) {
      tl.seek(tl.duration);
      setStaticMode(true);
      setShowCaption(true);
      setCaMounted(true);
      renderFrame(0.62);
      return () => {
        tl.revert?.();
        tlRef.current = null;
      };
    }

    gsap.registerPlugin(ScrollTrigger);
    renderFrame(0);
    const st = ScrollTrigger.create({
      trigger: scope,
      start: "top top",
      end: "+=5200",
      pin: true,
      pinSpacing: true,
      scrub: 0.6,
      invalidateOnRefresh: true,
      onUpdate: (self) => renderFrame(self.progress),
    });

    return () => {
      st.kill();
      tl.revert?.();
      tlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const h = () => {
      const el = sectionRef.current;
      if (!el) return;
      if (window.__lenis) window.__lenis.scrollTo(el, { duration: 1.2 });
      else el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    window.addEventListener("sandyx:overview", h);
    return () => window.removeEventListener("sandyx:overview", h);
  }, []);

  const transitions = useTransition(active, {
    keys: active,
    from: { opacity: 0, y: 26 },
    enter: { opacity: 1, y: 0 },
    leave: { opacity: 0, y: -20 },
    config: { tension: 260, friction: 26 },
  });

  return (
    <section id="cinematic" ref={sectionRef} className="relative w-full scroll-mt-0">
      <div
        ref={scopeRef}
        className={`relative min-h-screen w-full overflow-hidden ${
          isLightMode ? "bg-[#e9c99a]" : "bg-[#0b0908]"
        }`}
      >
        {/* --- SCENE 1: desert (photo) --- */}
        <div
          ref={desertRef}
          className="absolute inset-0 will-change-transform"
          style={{ transformOrigin: "52% 82%" }}
        >
          {/* Dune backdrop: the warm grain gradient from the earlier landing
              (no photo to load), so it scales with the dive. */}
          <GrainGradient
            style={{ height: "100%", width: "100%" }}
            colorBack={isLightMode ? "#e9c99a" : "#0b0908"}
            softness={0.82}
            intensity={isLightMode ? 0.34 : 0.5}
            noise={0}
            shape="corners"
            colors={
              isLightMode
                ? ["#E7D2A9", "#EBDFC4", "#DFC79E"]
                : ["#4A3320", "#2E2114", "#43301E"]
            }
          />
          {/* CSS depth gradient over the grain: darker toward the edges, clear
              in the middle so the title reads. */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: isLightMode
                ? "radial-gradient(120% 90% at 50% 14%, rgba(244,220,174,0) 34%, rgba(214,167,101,0.34) 78%, rgba(181,112,47,0.5) 100%)"
                : "radial-gradient(120% 95% at 50% 10%, rgba(42,29,19,0) 26%, rgba(18,11,8,0.5) 70%, rgba(11,9,8,0.82) 100%)",
            }}
          />
          {/* legibility + theme scrim over the backdrop */}
          <div
            aria-hidden
            className={`absolute inset-0 ${
              isLightMode
                ? "bg-gradient-to-b from-transparent via-transparent to-[#e9c99a]/70"
                : "bg-gradient-to-b from-[#0b0908]/35 via-transparent to-[#0b0908]/85"
            }`}
          />
        </div>

        {/* --- SCENE 2-4: micro world + polymer --- */}
        <div
          ref={microRef}
          className="absolute inset-0 will-change-transform"
          style={{ transformOrigin: "center", opacity: 0 }}
        >
          <MicroScene
            isLightMode={isLightMode}
            grains={grains}
            bridges={bridges}
            lattice={lattice}
          />
        </div>

        {/* --- SCENE 3: carbonic-anhydrase dimer (real 3D) --- */}
        <div
          ref={caRef}
          className="absolute inset-0 flex items-center justify-center will-change-transform"
          style={{ transformOrigin: "center", opacity: 0 }}
        >
          <div className="relative h-[76%] w-[76%] max-w-[820px]">
            {caMounted && (
              <MolstarViewer
                url="/pdb/1JD0.pdb"
                emphasis
                showControls={false}
                color={0x8fb3ac}
                baseSpeed={0.14}
                className="h-full w-full"
                onReady={(api) => {
                  molApiRef.current = api;
                }}
              />
            )}
          </div>
        </div>

        {/* --- SCENE 5: stabilized crust --- */}
        <div
          ref={crustRef}
          className="absolute inset-0 will-change-transform"
          style={{ transformOrigin: "center", opacity: 0 }}
        >
          <CrustScene isLightMode={isLightMode} />
        </div>

        {/* descent darkening (going under the surface) */}
        <div
          ref={descentRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[4] bg-[#0b0705]"
          style={{ opacity: 0 }}
        />

        {/* drifting sand atmosphere */}
        <SandParticles
          progressRef={progressRef}
          isLightMode={isLightMode}
          fadeWithDive
          className="pointer-events-none absolute inset-0 z-[5]"
        />

        {/* --- HERO OVERLAY (beat 0) --- */}
        {!staticMode && (
          <div
            ref={heroRef}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center px-4 text-center"
          >
            <div className="mx-auto mt-[-6vh] flex w-full max-w-[1100px] flex-col items-center">
              <div className="relative flex flex-col items-center">
                <AnimatePresence>
                  {heroPeek && (
                    <motion.button
                      type="button"
                      onClick={onOpenAdventure}
                      initial={{ y: 120, opacity: 0, scale: 0.7 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={{ y: 120, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 240, damping: 17 }}
                      className="group absolute -top-[74px] left-1/2 z-30 flex -translate-x-1/2 cursor-pointer flex-col items-center"
                      aria-label="Click Sandyx to play the interactive story"
                    >
                      <motion.span
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55 }}
                        className="absolute -top-9 z-20 whitespace-nowrap rounded-full bg-dune-orange px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#241c19] md:text-[11px]"
                      >
                        Click me to fight sandstorms!
                      </motion.span>
                      <motion.img
                        src="/sandyx.png"
                        alt="Sandyx"
                        draggable={false}
                        className="w-24 object-contain drop-shadow-xl transition-transform duration-300 group-hover:scale-110 md:w-28"
                        animate={{ rotate: [0, -4, 4, 0] }}
                        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </motion.button>
                  )}
                </AnimatePresence>
                <span className="relative z-10 mb-6 block text-sm font-bold uppercase tracking-[0.2em] text-dune-orange md:text-base">
                  NYUAD iGEM 2026
                </span>
              </div>
              <TextEffect
                as="h1"
                per="line"
                preset="fade-in-blur"
                speedReveal={1.2}
                className={`mb-4 whitespace-pre-line font-display text-2xl font-extrabold uppercase leading-[1.1] tracking-tight md:text-4xl lg:text-5xl ${
                  isLightMode
                    ? "text-dune-maroon drop-shadow-[0_2px_14px_rgba(255,255,255,0.5)]"
                    : "text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.55)]"
                }`}
              >
                {"iGEM Modeling Toolkit To\nStudy Sand Stabilization"}
              </TextEffect>
              <TextEffect
                as="p"
                per="word"
                preset="fade"
                delay={0.6}
                className={`mx-auto max-w-3xl text-base font-medium leading-relaxed md:text-lg lg:text-xl ${
                  isLightMode
                    ? "text-dune-maroon/85 drop-shadow-[0_1px_8px_rgba(255,255,255,0.5)]"
                    : "text-white/90 drop-shadow-[0_1px_10px_rgba(0,0,0,0.5)]"
                }`}
              >
                Explore our simulated two-pronged engineered solution, plus a
                genetically-encoded kill switch, to tackle wind-driven sand movement
              </TextEffect>
            </div>
            <div
              className={`absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 ${
                isLightMode ? "text-dune-maroon/75" : "text-white/80"
              }`}
            >
              <span className="text-xs font-bold uppercase tracking-[0.3em]">
                Scroll to learn more
              </span>
              <div className="relative h-9 w-px overflow-hidden bg-current/25">
                <motion.div
                  animate={{ y: ["-100%", "140%"] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                  className="absolute inset-x-0 top-0 h-3 bg-current"
                />
              </div>
            </div>
          </div>
        )}

        {/* Captions + rail (react-spring), or static list on mobile. */}
        {staticMode ? (
          <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-end px-4 pb-14">
            <div
              className={`w-full rounded-[16px] border p-6 backdrop-blur-[3px] ${
                isLightMode
                  ? "border-dune-maroon/12 bg-dune-paper/80"
                  : "border-dune-paper/12 bg-[#120d0a]/78"
              }`}
            >
              <ol
                className={`space-y-4 ${isLightMode ? "text-dune-maroon" : "text-dune-paper"}`}
              >
                {BEATS.map((b, i) => (
                  <li key={i}>
                    <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-dune-orange">
                      {b.label}
                    </div>
                    <p className="text-lg font-medium leading-snug">{b.line}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 transition-opacity duration-300"
            style={{ opacity: showCaption ? 1 : 0 }}
          >
            <div className="mx-auto max-w-6xl px-5 pb-14 sm:px-8">
              <div className="relative h-28 max-w-xl">
                {transitions((style, i) => (
                  <animated.div style={style} className="absolute inset-x-0 bottom-0">
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.28em] text-dune-orange">
                      {BEATS[i].label}
                    </div>
                    <p
                      className={`font-display text-2xl font-black leading-tight tracking-tight sm:text-4xl ${
                        isLightMode ? "text-dune-maroon" : "text-dune-paper"
                      }`}
                    >
                      {BEATS[i].line}
                    </p>
                  </animated.div>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-2.5">
                {BEATS.map((_, i) => (
                  <span
                    key={i}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === active ? "w-8 bg-dune-orange" : "w-2 bg-dune-ash/45"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Micro world: photo backdrop + SVG grains, a cell, crystal lattice, polymer.
// ---------------------------------------------------------------------------
function MicroScene({
  isLightMode,
  grains,
  bridges,
  lattice,
}: {
  isLightMode: boolean;
  grains: Grain[];
  bridges: ReturnType<typeof polymerBridges>;
  lattice: { x: number; y: number }[];
}) {
  const hero = grains[0];
  return (
    <div className="relative h-full w-full">
      {/* Micro-field backdrop, pure CSS. A soft teal well so the grains and
          cell read with depth, no image to load. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: isLightMode
            ? "radial-gradient(100% 80% at 50% 42%, #eaf5f1 0%, #cfe6df 55%, #a7cabf 100%)"
            : "radial-gradient(100% 80% at 50% 42%, #0d2420 0%, #081714 55%, #04100e 100%)",
        }}
      />
      <svg
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        <defs>
          <radialGradient id="ds-grain" cx="38%" cy="34%" r="75%">
            <stop offset="0%" stopColor="#e6b579" />
            <stop offset="60%" stopColor={C.sand} />
            <stop offset="100%" stopColor={C.sandDeep} />
          </radialGradient>
          <clipPath id="ds-hero-clip">
            <path d={hero.path} />
          </clipPath>
        </defs>

        <g fill="none" stroke={C.mesh} strokeWidth="5" strokeLinecap="round">
          {bridges.map((b, i) => (
            <path key={i} className="ds-bridge" d={b.path} opacity={0.9} />
          ))}
        </g>

        <g>
          {grains.map((g, i) => (
            <path
              key={i}
              d={g.path}
              fill="url(#ds-grain)"
              stroke={C.sandDeep}
              strokeWidth="1.5"
              opacity={0.98}
            />
          ))}
        </g>

        <g clipPath="url(#ds-hero-clip)" opacity={isLightMode ? 0.4 : 0.5}>
          {lattice.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill="#fff3d8" opacity="0.7" />
          ))}
          {lattice.map((p, i) =>
            i % 2 === 0 ? (
              <line
                key={`l${i}`}
                x1={p.x}
                y1={p.y}
                x2={p.x + 44}
                y2={p.y}
                stroke="#fff3d8"
                strokeWidth="1"
                opacity="0.3"
              />
            ) : null,
          )}
        </g>

        <g>
          {bridges.map((b, i) => (
            <g key={i}>
              <circle
                className="ds-node"
                cx={b.ax}
                cy={b.ay}
                r="8"
                fill={C.cured}
                style={{ opacity: 0, transformBox: "fill-box", transformOrigin: "center" }}
              />
              <circle
                className="ds-node"
                cx={b.bx}
                cy={b.by}
                r="8"
                fill={C.cured}
                style={{ opacity: 0, transformBox: "fill-box", transformOrigin: "center" }}
              />
            </g>
          ))}
        </g>

        {/* B. subtilis cell (rod) */}
        <g transform="translate(600 410) rotate(-18)">
          <rect
            x="-92"
            y="-30"
            width="184"
            height="60"
            rx="30"
            fill={isLightMode ? "#5fa89b" : "#6fbdae"}
            stroke={C.teal}
            strokeWidth="4"
            opacity="0.96"
          />
          <ellipse cx="-30" cy="0" rx="26" ry="15" fill={C.teal} opacity="0.55" />
          <ellipse cx="38" cy="-2" rx="22" ry="13" fill={C.teal} opacity="0.5" />
        </g>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stabilized crust (pull back out).
// ---------------------------------------------------------------------------
function CrustScene({ isLightMode }: { isLightMode: boolean }) {
  const cols = 16;
  const rows = 4;
  const x0 = 120;
  const x1 = 1080;
  const y0 = 560;
  const y1 = 700;
  const nodes: { x: number; y: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      nodes.push({
        x: Math.round(x0 + (c / (cols - 1)) * (x1 - x0)),
        y: Math.round(y0 + (r / (rows - 1)) * (y1 - y0)),
      });
    }
  }
  return (
    <svg
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id="ds-sky2" x1="0" y1="0" x2="0" y2="1">
          {isLightMode ? (
            <>
              <stop offset="0%" stopColor="#eaf3f0" />
              <stop offset="60%" stopColor="#f4e7cf" />
              <stop offset="100%" stopColor="#e2c793" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#101a17" />
              <stop offset="60%" stopColor="#241a12" />
              <stop offset="100%" stopColor="#33251a" />
            </>
          )}
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="1200" height="800" fill="url(#ds-sky2)" />
      <line x1="0" y1="540" x2="1200" y2="540" stroke={C.cured} strokeWidth="1.5" opacity="0.5" />
      <g stroke={C.cured} strokeWidth="2" opacity="0.5">
        {nodes.map((n, i) => {
          const right = i % cols < cols - 1 ? nodes[i + 1] : null;
          const down = i + cols < nodes.length ? nodes[i + cols] : null;
          return (
            <g key={i}>
              {right && <line x1={n.x} y1={n.y} x2={right.x} y2={right.y} />}
              {down && <line x1={n.x} y1={n.y} x2={down.x} y2={down.y} />}
            </g>
          );
        })}
      </g>
      <g>
        {nodes.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r="7" fill={C.cured} opacity="0.92" />
        ))}
      </g>
      <image
        href="/sandyx.png"
        x="556"
        y="410"
        width="110"
        height="130"
        preserveAspectRatio="xMidYMax meet"
      />
    </svg>
  );
}
