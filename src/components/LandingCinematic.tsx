"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { createTimeline, svg, type Timeline } from "animejs";
import { gsap } from "gsap";
import StoryEscape, { skipToModels } from "@/src/components/landing/StoryEscape";
import { storyPinLength } from "@/src/lib/scrollRestore";
import { playCinematic, STORY_TRIGGER_ID } from "@/src/lib/storyPlayback";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion } from "motion/react";
import SandParticles from "./dune-story/SandParticles";
import Link from "next/link";
import { duneGradient, grainOverlayStyle } from "@/src/lib/grain";
import { moduleHref } from "@/src/lib/modelIndex";
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
  /** Roughly how wide the frame is at this beat. The story is one zoom. */
  scale: string;
  /** The model that puts a number on this beat. */
  model: { label: string; href: string };
}

// Each beat names the model that quantifies it, so the story doubles as an
// index: nothing is asserted on screen that is not computed somewhere else on
// the site, and the way there is one click.
const BEATS: BeatCopy[] = [
  {
    label: "The problem",
    line: "Loose desert sand lifts and blows away in the wind.",
    scale: "~10 m",
    model: { label: "Aeolian Wind Tunnel", href: moduleHref("1,2", "aeolian") },
  },
  {
    label: "Micro scale",
    line: (
      <>
        A single grain, and a living <i>Bacillus subtilis</i> cell.
      </>
    ),
    scale: "~100 µm",
    model: { label: "Grain-Size Coverage", href: moduleHref("1,2", "grainsize") },
  },
  {
    label: "Carbonic anhydrase",
    line: (
      <>
        A CA dimer on the cell surface grows CaCO<sub>3</sub> cement.
      </>
    ),
    scale: "~5 nm",
    model: { label: "CaCO₃ Precipitation", href: moduleHref("2", "caco3") },
  },
  {
    label: "The fix",
    line: "γ-PGA chains cross-link and lock grain to grain.",
    scale: "~100 nm",
    model: { label: "γ-PGA Cross-Linking", href: moduleHref("1", "crosslink") },
  },
  {
    label: "The result",
    line: "The surface holds together as a stabilized crust.",
    scale: "~10 m",
    model: { label: "Composite Strength", href: moduleHref("1,2", "composite") },
  },
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
  onOpenAdventure,
}: {
  isLightMode: boolean;
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
      // Named so storyPlayback can read this trigger's absolute scroll range
      // back and drive it for a reader who asked to just watch the story.
      id: STORY_TRIGGER_ID,
      start: "top top",
      // Pin length. Every beat is keyed to normalised progress, so this scales
      // the whole story uniformly rather than dropping any of it. A repeat
      // visit in the same session gets the recap length.
      end: storyPinLength(3100, 1400),
      pin: true,
      pinSpacing: true,
      scrub: 0.6,
      // Apply the pin a touch early so the fixed<->static swap at the top
      // boundary does not flash the hero out for a frame when scrolling up.
      anticipatePin: 1,
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

  // Warm the WebGL protein viewer while the browser is idle after load, so its
  // one-time init happens over the static hero instead of freezing a frame mid
  // scroll when the reader first reaches the protein beat.
  useEffect(() => {
    const warm = () => setCaMounted(true);
    const ric = (
      window as unknown as {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        cancelIdleCallback?: (id: number) => void;
      }
    ).requestIdleCallback;
    const id = ric ? ric(warm, { timeout: 2500 }) : window.setTimeout(warm, 1800);
    return () => {
      const cic = (window as unknown as { cancelIdleCallback?: (id: number) => void })
        .cancelIdleCallback;
      if (ric && cic) cic(id);
      else clearTimeout(id);
    };
  }, []);

  return (
    <section id="cinematic" ref={sectionRef} className="relative w-full scroll-mt-0">
      <div
        ref={scopeRef}
        className={`relative min-h-screen w-full overflow-hidden ${
          isLightMode ? "bg-[#e9c99a]" : "bg-[#0b0908]"
        }`}
      >
        {/* Skip / Escape / progress rule. Inside the pinned scope so it stays
            fixed with the story and disappears with it. */}
        {!staticMode && <StoryEscape progressRef={progressRef} />}

        {/* --- SCENE 1: desert (photo) --- */}
        <div
          ref={desertRef}
          className="absolute inset-0 will-change-transform"
          style={{ transformOrigin: "52% 82%" }}
        >
          {/* Dune backdrop: warm CSS grain (no WebGL, no photo), so it scales
              with the dive and never jitters. */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: duneGradient(isLightMode) }}
          >
            <div className="absolute inset-0" style={grainOverlayStyle(isLightMode)} />
          </div>
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

        {/* --- HERO OVERLAY (beat 0) ---
            Left-aligned on the site measure rather than centred in the middle
            of the frame, so it shares an edge with every other page. Two plain
            text affordances instead of a button: one into the models, one into
            the story. Sandyx moves off the headline to a third quiet link. */}
        {!staticMode && (
          <div
            ref={heroRef}
            className="absolute inset-0 z-20 flex items-center px-5 sm:px-8"
          >
            <div className="mx-auto w-full max-w-6xl">
              <span className="hero-reveal hero-reveal-1 caption mb-6 block text-dune-orange">
                NYUAD iGEM 2026
              </span>
              {/* Plain, always-painted hero copy. It used to use a per-segment
                  framer-motion reveal (AnimatePresence + blur), which could get
                  stuck in its hidden/blurred state during the re-render storm of
                  a fast programmatic scroll to the top, so the title vanished
                  while the Sandyx button kept showing. Static text has no
                  animation state to get stuck. text-shadow (paint) not
                  drop-shadow (a compositing filter that can drop out mid-pin). */}
              <h1
                style={{
                  textShadow: isLightMode
                    ? "0 2px 14px rgba(255,255,255,0.45)"
                    : "0 2px 18px rgba(0,0,0,0.5)",
                }}
                className={`hero-reveal hero-reveal-2 max-w-[16ch] text-[length:var(--text-display)] leading-[0.98] ${
                  isLightMode ? "text-dune-maroon" : "text-dune-paper"
                }`}
              >
                Locking down the dunes
              </h1>
              <p
                style={{
                  textShadow: isLightMode
                    ? "0 1px 8px rgba(255,255,255,0.45)"
                    : "0 1px 10px rgba(0,0,0,0.45)",
                }}
                className={`hero-reveal hero-reveal-3 mt-6 max-w-[46ch] text-[length:var(--text-lede)] leading-relaxed ${
                  isLightMode ? "text-dune-maroon/85" : "text-dune-paper/85"
                }`}
              >
                A modelling toolkit for a two-pronged engineered crust, plus a
                genetically-encoded kill switch, against wind-driven sand.
              </p>

              <div
                className={`hero-reveal hero-reveal-3 relative mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 ${
                  isLightMode ? "text-dune-maroon" : "text-dune-paper"
                }`}
              >
                <button
                  type="button"
                  onClick={skipToModels}
                  className="caption rule-link relative z-10 text-current"
                >
                  Explore the models
                </button>
                <button
                  type="button"
                  onClick={playCinematic}
                  className="caption rule-link relative z-10 text-current"
                >
                  Watch the story
                </button>
                {/* Sandyx leans out from behind this link a second after the
                    page has finished loading. Decoration only: she is
                    pointer-events-none, so the text keeps the whole hit area,
                    and she is placed past its trailing edge so nothing reads
                    through her. */}
                <span className="relative">
                  <HeroSandyx />
                  <button
                    type="button"
                    onClick={onOpenAdventure}
                    className="caption rule-link relative z-10 text-current opacity-80 transition-opacity hover:opacity-100"
                  >
                    Play as Sandyx
                  </button>
                </span>
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
                    <div className="flex flex-wrap items-baseline gap-x-3 text-[11px] font-bold uppercase tracking-[0.24em] text-dune-orange">
                      <span>{b.label}</span>
                      <span className="opacity-60">{b.scale} across</span>
                    </div>
                    <p className="text-lg font-medium leading-snug">{b.line}</p>
                    <Link href={b.model.href} className="caption rule-link mt-1 inline-block">
                      Model: {b.model.label}
                    </Link>
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
              {/* Stacked opacity cross-fade: only the active beat is shown, so a
                  fast scroll (or a jump to the top) can never pile up several
                  half-faded captions on top of each other. */}
              <div className="relative h-40 max-w-2xl">
                {BEATS.map((b, i) => (
                  <div
                    key={i}
                    className="absolute inset-x-0 bottom-0 transition-opacity duration-300"
                    style={{ opacity: i === active ? 1 : 0 }}
                    aria-hidden={i !== active}
                  >
                    <div className="mb-2 flex flex-wrap items-baseline gap-x-4 text-[11px] font-bold uppercase tracking-[0.28em] text-dune-orange">
                      <span>
                        {String(i + 1).padStart(2, "0")} / {String(BEATS.length).padStart(2, "0")}
                      </span>
                      <span>{b.label}</span>
                      <span className="opacity-60">{b.scale} across</span>
                    </div>
                    <p
                      className={`font-display text-2xl font-black leading-tight tracking-tight sm:text-4xl ${
                        isLightMode ? "text-dune-maroon" : "text-dune-paper"
                      }`}
                    >
                      {b.line}
                    </p>
                    <Link
                      href={b.model.href}
                      tabIndex={i === active ? 0 : -1}
                      className={`caption rule-link pointer-events-auto mt-3 inline-block ${
                        isLightMode ? "text-dune-maroon/80" : "text-dune-paper/75"
                      }`}
                    >
                      Model: {b.model.label}
                    </Link>
                  </div>
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
// Sandyx, leaning in diagonally behind the "Play as Sandyx" link.
// ---------------------------------------------------------------------------
function HeroSandyx() {
  const [shown, setShown] = useState(false);
  const [reduced, setReduced] = useState(false);

  // A second after the page has actually finished loading, not a second after
  // this component mounted: the point is that she arrives once the frame has
  // settled, so the entrance is not competing with the hero text reveal or the
  // first paint of the desert.
  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    let timer = 0;
    const arm = () => {
      timer = window.setTimeout(() => setShown(true), 1000);
    };
    if (document.readyState === "complete") arm();
    else window.addEventListener("load", arm, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("load", arm);
    };
  }, []);

  return (
    <motion.img
      src="/sandyx.png"
      alt=""
      aria-hidden
      draggable={false}
      className="pointer-events-none absolute bottom-[-24px] left-[92%] z-0 hidden w-[126px] max-w-none select-none sm:block"
      style={{ transformOrigin: "50% 100%" }}
      initial={reduced ? false : { opacity: 0, scale: 0.55, rotate: -34, y: 26 }}
      animate={
        shown
          ? { opacity: 0.92, scale: 1, rotate: -14, y: 0 }
          : { opacity: 0, scale: 0.55, rotate: -34, y: 26 }
      }
      transition={
        reduced
          ? { duration: 0 }
          : { type: "spring", stiffness: 190, damping: 14, mass: 0.8 }
      }
    />
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
