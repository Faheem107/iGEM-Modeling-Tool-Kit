"use client";

import { CaptionText } from "./CaptionText";
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
import { NAV, PROJECT_TEAM, PROJECT_TITLE } from "@/content/copy";
import { DUNE, TINT } from "@/src/lib/palette";
import {
  dunePath,
  microGrains,
  backGrains,
  speckle,
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

/**
 * Where in the frame this beat's caption sits.
 *
 * The caption used to be bottom-left for all five beats, so the reader's eye
 * parked in one corner while the scene changed behind it. Each beat now takes
 * the calm, low-detail part of its OWN scene: the sky over the desert, the dark
 * gap beside the grain cluster, the empty corner beside the protein. The walk
 * is top-left, bottom-left, bottom-right, mid-left, top-right, so the eye moves
 * with the story instead of waiting for it.
 */
type Place = "top-left" | "bottom-left" | "bottom-right" | "mid-left" | "top-right";

/** Right-placed beats mirror the rail, which the .rail-row grid cannot do. */
const isRight = (p: Place) => p === "top-right" || p === "bottom-right";

const PLACEMENT: Record<Place, string> = {
  // top-24 clears the fixed site header.
  "top-left": "left-0 top-24",
  "mid-left": "left-0 top-1/2 -translate-y-1/2",
  "bottom-left": "bottom-24 left-0",
  "top-right": "right-0 top-24 text-right",
  "bottom-right": "bottom-24 right-0 text-right",
};

interface BeatCopy {
  line: React.ReactNode;
  /**
   * Roughly how wide the frame is at this beat. The story is one zoom.
   * Written in the case it renders in: .caption-asis does not uppercase, so a
   * µ stays a µ.
   */
  scale: string;
  /** Where the caption sits in the frame at this beat. */
  place: Place;
  /** The model that puts a number on this beat. */
  model: { label: string; href: string };
}

// Each beat names the model that quantifies it, so the story doubles as an
// index: nothing is asserted on screen that is not computed somewhere else on
// the site, and the way there is one click.
const BEATS: BeatCopy[] = [
  {
    line: "Past a threshold wind speed, loose sand lifts off the surface.",
    scale: "~10 m",
    place: "top-left",
    model: { label: "Aeolian Wind Tunnel", href: moduleHref("1,2", "aeolian") },
  },
  {
    line: (
      <>
        A single grain, and a living <i>Bacillus subtilis</i> cell.
      </>
    ),
    scale: "~100 µm",
    place: "bottom-left",
    model: { label: "Grain-Size Coverage", href: moduleHref("1,2", "grainsize") },
  },
  {
    line: (
      <>
        Carbonic anhydrase on the cell wall grows CaCO<sub>3</sub> cement.
      </>
    ),
    scale: "~5 nm",
    place: "bottom-right",
    model: { label: "CaCO₃ Precipitation", href: moduleHref("2", "caco3") },
  },
  {
    line: "γ-PGA chains cross-link through calcium and lock grain to grain.",
    scale: "~100 nm",
    place: "mid-left",
    model: { label: "γ-PGA Cross-Linking", href: moduleHref("1", "crosslink") },
  },
  {
    line: "A crust a few millimetres thick, holding grains a tenth of a millimetre wide.",
    scale: "~10 m",
    place: "top-right",
    model: { label: "Composite Strength", href: moduleHref("1,2", "composite") },
  },
];

const C = {
  sand: DUNE.orange,
  sandDeep: TINT.orangeDeep,
  cured: DUNE.teal,
  teal: TINT.tealDeep,
  mesh: DUNE.rose,
};

/**
 * The micro scene is lit from the upper left. Every highlight, every terminator
 * and every contact shadow below follows that one direction, which is most of
 * what separates an illustration from a diagram.
 */
const LIGHT = { x: -0.42, y: -0.5 };

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
          {/* The dunes themselves. The backdrop under this is a gradient, and
              a gradient on its own is a wash, not a place: beat 1 read as an
              empty field. Four ridges lit from the same upper left as the micro
              world, each one paler and hazier than the one in front of it. */}
          <DesertScene isLightMode={isLightMode} />
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
            className="absolute inset-0 z-20 flex items-center px-6 sm:px-6"
          >
            <div className="mx-auto w-full max-w-6xl">
              <span className="hero-reveal hero-reveal-1 caption mb-6 block text-dune-orange">
                {PROJECT_TEAM}
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
                {PROJECT_TITLE}
              </h1>
              <p
                style={{
                  textShadow: isLightMode
                    ? "0 1px 8px rgba(255,255,255,0.45)"
                    : "0 1px 10px rgba(0,0,0,0.45)",
                }}
                className={`hero-reveal hero-reveal-3 mt-6 max-w-[46ch] text-[length:var(--text-body)] leading-relaxed ${
                  isLightMode ? "text-dune-maroon/85" : "text-dune-paper/85"
                }`}
              >
                Loose sand starts moving at a threshold wind speed. Two
                engineered routes bind the grains into a crust and raise that
                threshold. A kill switch ends the strain when the work is done.
              </p>

              <div
                className={`hero-reveal hero-reveal-3 relative mt-12 flex flex-wrap items-center gap-x-6 gap-y-4 ${
                  isLightMode ? "text-dune-maroon" : "text-dune-paper"
                }`}
              >
                <button
                  type="button"
                  onClick={skipToModels}
                  className="caption rule-link relative z-10 text-current"
                >
                  {NAV.toModels}
                </button>
                <button
                  type="button"
                  onClick={playCinematic}
                  className="caption rule-link relative z-10 text-current"
                >
                  Watch the story
                </button>
                {/* Sandyx leans out from behind this link a second after the
                    page has finished loading. She is pointer-events-none, so
                    the text keeps the whole hit area, and she sits under the
                    trailing end of the word at z-0 while the button holds
                    z-10, so she reads as peeking out from behind it. */}
                <span className="relative inline-flex items-center">
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
          <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-end px-6 pb-12">
            {/* Same beats, same rail, no scrub. The plate is the site's one
                surface primitive, so this and the scrubbed deck read as the
                same thing rather than two designs. */}
            <div className="plate w-full p-6">
              <ol
                className={`space-y-6 ${isLightMode ? "text-dune-maroon" : "text-dune-paper"}`}
              >
                {BEATS.map((b, i) => (
                  <li key={i} className="rail-row">
                    <div className="caption flex items-baseline gap-x-4 md:block">
                      <span className="text-dune-orange">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="md:mt-2 md:block">
                        <CaptionText>{b.scale}</CaptionText> across
                      </span>
                    </div>
                    <div>
                      <p
                        className="text-[length:var(--text-h3)] leading-snug"
                        style={{ fontVariationSettings: '"wght" 560' }}
                      >
                        {b.line}
                      </p>
                      <Link
                        href={b.model.href}
                        className="caption rule-link mt-2 inline-block"
                      >
                        <CaptionText>{b.model.label}</CaptionText>
                      </Link>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : (
          <div
            className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
            style={{ opacity: showCaption ? 1 : 0 }}
          >
            {/* Stacked opacity cross-fade: only the active beat is shown, so a
                fast scroll (or a jump to the top) can never pile up several
                half-faded captions on top of each other. Each one is placed by
                its own beat rather than all five sharing the bottom-left
                corner, see the Place type above. */}
            <div className="relative mx-auto h-full max-w-6xl">
              {BEATS.map((b, i) => (
                <div
                  key={i}
                  className={`absolute transition-opacity duration-300 ${
                    PLACEMENT[b.place]
                  } ${isRight(b.place) ? "max-w-2xl" : "max-w-4xl"}`}
                  style={{ opacity: i === active ? 1 : 0 }}
                  aria-hidden={i !== active}
                >
                  <BeatCaption
                    beat={b}
                    index={i}
                    active={i === active}
                    isLightMode={isLightMode}
                  />
                </div>
              ))}
            </div>
            {/* A rule per beat rather than a row of dots. Same idiom as
                .rule-link, and it reads as progress through a line instead of
                a carousel. It stays put while the captions move: it is the one
                thing on screen that has to mean "how far in are we". */}
            <div className="absolute inset-x-0 bottom-12">
              <div className="mx-auto flex max-w-6xl items-center gap-2 px-6" aria-hidden>
                {BEATS.map((_, i) => (
                  <span
                    key={i}
                    className={`h-px transition-all duration-300 ${
                      i === active
                        ? "w-10 bg-dune-orange"
                        : `w-5 ${isLightMode ? "bg-dune-maroon/25" : "bg-dune-paper/25"}`
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
// One beat's caption.
//
// The block is anchored to a different part of the frame each beat, so it has
// to carry its own legibility rather than borrowing a corner that happened to
// be dark. Two devices, both already used on this page: the hero's textShadow
// (paint, not a drop-shadow filter, which can drop out mid-pin), and a soft
// wash anchored to the same corner the block is, which is a gradient in the
// illustration layer rather than a card behind the words.
//
// Left-placed beats keep the .rail-row gutter for the index and scale. A
// right-placed one cannot mirror that grid, so it stacks the same two pieces
// above the headline, right-aligned, in the same register.
// ---------------------------------------------------------------------------
// A blurred field rather than a gradient inside a box: a gradient anchored to
// one corner of an element still ends at that element's edges, and on a block
// this wide the cut showed as a rectangle. A heavy blur has no edge to show.
const captionWash = (isLightMode: boolean) =>
  isLightMode ? "rgba(251, 247, 240, 0.5)" : "rgba(9, 7, 6, 0.55)";

const captionShadow = (isLightMode: boolean) =>
  isLightMode ? "0 1px 10px rgba(255,255,255,0.55)" : "0 1px 14px rgba(0,0,0,0.6)";

function BeatCaption({
  beat,
  index,
  active,
  isLightMode,
}: {
  beat: BeatCopy;
  index: number;
  active: boolean;
  isLightMode: boolean;
}) {
  const right = isRight(beat.place);
  const num = String(index + 1).padStart(2, "0");
  const meta = (
    <>
      <span className="text-dune-orange">{num}</span>
      <span className={right ? "" : "md:mt-2 md:block"}>
        <CaptionText>{beat.scale}</CaptionText> across
      </span>
    </>
  );
  const body = (
    <>
      <p
        className={`text-[length:var(--text-h1)] leading-[1.08] ${
          isLightMode ? "text-dune-maroon" : "text-dune-paper"
        }`}
        style={{
          fontVariationSettings: '"wght" 600',
          textShadow: captionShadow(isLightMode),
        }}
      >
        {beat.line}
      </p>
      <Link
        href={beat.model.href}
        tabIndex={active ? 0 : -1}
        className={`caption rule-link pointer-events-auto mt-4 inline-block ${
          isLightMode ? "text-dune-maroon/80" : "text-dune-paper/75"
        }`}
      >
        <CaptionText>{beat.model.label}</CaptionText>
      </Link>
    </>
  );
  const metaClass = `caption ${
    isLightMode ? "text-dune-maroon/70" : "text-dune-paper/65"
  }`;

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-4 -inset-y-6 rounded-[64px] blur-2xl"
        style={{ background: captionWash(isLightMode) }}
      />
      <div className="relative px-6">
        {right ? (
          <>
            <div
              className={`${metaClass} mb-4 flex items-baseline justify-end gap-x-4`}
              style={{ textShadow: captionShadow(isLightMode) }}
            >
              {meta}
            </div>
            {body}
          </>
        ) : (
          <div className="rail-row">
            <div
              className={`${metaClass} flex items-baseline gap-x-4 md:block`}
              style={{ textShadow: captionShadow(isLightMode) }}
            >
              {meta}
            </div>
            <div>{body}</div>
          </div>
        )}
      </div>
    </>
  );
}

/**
 * `.caption` uppercases, and CSS uppercase maps the symbols it meets: micro
 * sign to M, gamma to capital gamma. "~100 µm across" was rendering as
 * "~100 MM ACROSS", which states the wrong unit, and the beat-4 link read
 * "Γ-PGA". This leaves any such run in the case it was written in, so the
 * register stays uppercase and the units stay true.
 *
 * The run reaches past the symbol to any letters attached to it, because the
 * unit is the whole token: keeping only the µ gives "~100 µM", which is a
 * concentration, not a width.
 */

// ---------------------------------------------------------------------------
// Sandyx, peeking out from behind the "Play as Sandyx" link.
//
// She is front-facing in the source art with her tail sweeping to the canvas
// right, so a clockwise tilt turns her toward the upper right and carries the
// tail away from the words rather than across them. Small on purpose: she is a
// greeting on a text link, not a third element competing with the headline.
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
      className="pointer-events-none absolute bottom-[-19px] left-[calc(100%-13px)] z-0 hidden w-[62px] max-w-none select-none sm:block"
      style={{ transformOrigin: "50% 100%" }}
      initial={reduced ? false : { opacity: 0, scale: 0.6, rotate: 30, y: 18 }}
      animate={
        shown
          ? { opacity: 0.88, scale: 1, rotate: 13, y: 0 }
          : { opacity: 0, scale: 0.6, rotate: 30, y: 18 }
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
// The desert, beat 1.
//
// Four dune ridges from dunePath(), back to front. Aerial perspective does the
// depth: each ridge forward is warmer, more saturated and less hazy than the
// one behind it. The lit face of each crest catches the same upper-left light
// as the micro scene, and each ridge lays a soft shadow into the trough in
// front of it, so the sand reads as form rather than as four stacked bands.
// ---------------------------------------------------------------------------
function DesertScene({ isLightMode }: { isLightMode: boolean }) {
  // baseY, amplitude, wavelength, phase. Back ridges are flatter and higher.
  const ridges = useMemo(
    () =>
      [
        [352, 22, 300, 0.4],
        [430, 34, 250, 2.1],
        [530, 46, 210, 4.3],
        [656, 58, 175, 1.2],
      ].map(([b, a, w, p]) => dunePath(b, a, w, p)),
    [],
  );
  const tone = isLightMode
    ? ["#e3cba2", "#dfbe8c", "#d6ac72", "#c8965a"]
    : ["#241a12", "#2c2015", "#352618", "#3f2c1b"];
  const lit = isLightMode ? "#f7e6c4" : "#5c4025";

  return (
    <svg
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        {ridges.map((_, i) => (
          <linearGradient key={i} id={`ds-ridge-${i}`} x1="0" y1="0" x2="0.25" y2="1">
            <stop offset="0%" stopColor={lit} stopOpacity={0.5 + i * 0.1} />
            <stop offset="18%" stopColor={tone[i]} />
            <stop offset="100%" stopColor={tone[i]} />
          </linearGradient>
        ))}
        <filter id="ds-ridge-shadow" x="-10%" y="-30%" width="120%" height="180%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
      </defs>
      {ridges.map((d, i) => (
        <g key={i}>
          {/* the shadow this ridge lays into the trough ahead of it */}
          <path
            d={d}
            fill="#0d0805"
            opacity={isLightMode ? 0.1 : 0.34}
            filter="url(#ds-ridge-shadow)"
            transform="translate(26 22)"
          />
          <path d={d} fill={`url(#ds-ridge-${i})`} />
          {/* the crest line, catching the light along the top edge */}
          <path
            d={d}
            fill="none"
            stroke={lit}
            strokeWidth="1.4"
            opacity={isLightMode ? 0.5 : 0.3}
          />
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Micro world: a grain field, a living cell, the crystal lattice, the polymer.
//
// Lit from the upper left (LIGHT), and built in depth planes rather than as one
// flat layer: a back ring that is blurred and dimmed, a middle ring that is
// desaturated toward the ground, and one hero grain in full material with a
// specular, a terminator, a rim light and its own grit. Every grain sits on a
// contact shadow, so the cluster reads as sand in a bed instead of shapes on a
// black void. Nothing here is filtered except the back ring, because the whole
// layer is scaled every frame of the dive and a filter would re-rasterise with
// it.
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
  const mid = grains.slice(1);
  const back = useMemo(() => backGrains(), []);
  const grit = useMemo(() => speckle(hero.cx, hero.cy, hero.r, 130, 17), [hero]);
  // Shadow offset follows the light: away from it, and slightly longer than the
  // light is high, so the grains read as sitting rather than hovering.
  const sx = -LIGHT.x * 34;
  const sy = -LIGHT.y * 30;

  return (
    <div className="relative h-full w-full">
      <svg
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        <defs>
          {/* Ground: a cool well, with a warm bounce coming back up off the
              sand below. Two hues, both from the palette. */}
          <radialGradient id="ds-field" cx="50%" cy="38%" r="82%">
            {isLightMode ? (
              <>
                <stop offset="0%" stopColor="#eef6f2" />
                <stop offset="52%" stopColor="#cfe4dd" />
                <stop offset="100%" stopColor="#9dbfb5" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#123029" />
                <stop offset="52%" stopColor="#0a1c18" />
                <stop offset="100%" stopColor="#04100e" />
              </>
            )}
          </radialGradient>
          <radialGradient id="ds-bounce" cx="50%" cy="100%" r="66%">
            <stop offset="0%" stopColor={C.sand} stopOpacity={isLightMode ? 0.3 : 0.22} />
            <stop offset="100%" stopColor={C.sand} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ds-vignette" cx="50%" cy="46%" r="72%">
            <stop offset="55%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity={isLightMode ? 0.16 : 0.5} />
          </radialGradient>

          {/* Grain material, three depths of the same ramp. The highlight sits
              up and left of centre, the terminator falls away to the lower
              right, and each plane back loses saturation to the ground. */}
          <radialGradient id="ds-grain" cx="33%" cy="27%" r="86%">
            <stop offset="0%" stopColor="#f6d8a8" />
            <stop offset="26%" stopColor="#e8b276" />
            <stop offset="60%" stopColor={C.sand} />
            <stop offset="86%" stopColor={C.sandDeep} />
            <stop offset="100%" stopColor="#7d4a1d" />
          </radialGradient>
          <radialGradient id="ds-grain-far" cx="36%" cy="30%" r="88%">
            <stop offset="0%" stopColor="#a5865f" />
            <stop offset="60%" stopColor="#7d5c3a" />
            <stop offset="100%" stopColor="#4a301a" />
          </radialGradient>
          {/* Aerial perspective: the further back a plane is, the more of the
              ground colour is mixed into it. */}
          <radialGradient id="ds-haze" cx="50%" cy="38%" r="82%">
            <stop offset="0%" stopColor={isLightMode ? "#cfe4dd" : "#0a1c18"} stopOpacity="0.55" />
            <stop offset="100%" stopColor={isLightMode ? "#9dbfb5" : "#04100e"} stopOpacity="0.72" />
          </radialGradient>

          {/* The cell: a body that is lit from the same upper left, not a flat
              fill, so it sits in the same world as the sand around it. */}
          <linearGradient id="ds-cell" x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor={isLightMode ? "#8ecfc0" : "#7fcbba"} />
            <stop offset="55%" stopColor={isLightMode ? "#5fa89b" : "#57a294"} />
            <stop offset="100%" stopColor={isLightMode ? "#3d7d72" : "#2f6a60"} />
          </linearGradient>

          {/* Rim light along the lit edge, in the palette's rose. */}
          <linearGradient id="ds-rim" x1="0" y1="0" x2="0.7" y2="1">
            <stop offset="0%" stopColor={DUNE.rose} stopOpacity="0.85" />
            <stop offset="42%" stopColor={DUNE.rose} stopOpacity="0" />
          </linearGradient>

          <filter id="ds-far-blur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="13" />
          </filter>
          <filter id="ds-shadow" x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur stdDeviation="16" />
          </filter>

          <clipPath id="ds-hero-clip">
            <path d={hero.path} />
          </clipPath>
        </defs>

        <rect x="0" y="0" width="1200" height="800" fill="url(#ds-field)" />
        <rect x="0" y="0" width="1200" height="800" fill="url(#ds-bounce)" />

        {/* Depth plane 1: the back ring. Blurred and dimmed, it fills the voids
            the front cluster leaves so the scene has a floor. */}
        <g filter="url(#ds-far-blur)" opacity={isLightMode ? 0.42 : 0.3}>
          {back.map((g, i) => (
            <path key={i} d={g.path} fill="url(#ds-grain-far)" />
          ))}
        </g>

        {/* Contact shadows, cast away from the light, under everything in
            front of them. */}
        <g filter="url(#ds-shadow)" opacity={isLightMode ? 0.3 : 0.55}>
          {grains.map((g, i) => (
            <path key={i} d={g.path} fill="#1a0e05" transform={`translate(${sx} ${sy})`} />
          ))}
        </g>

        {/* The polymer, behind the grains it anchors into. */}
        <g fill="none" stroke={C.mesh} strokeWidth="5" strokeLinecap="round">
          {bridges.map((b, i) => (
            <path key={i} className="ds-bridge" d={b.path} opacity={0.9} />
          ))}
        </g>

        {/* Depth plane 2: the middle ring. Full shape, no filter, but pulled
            back with opacity and a cooler edge. */}
        <g>
          {mid.map((g, i) => (
            <g key={i} opacity={0.9 - (i % 3) * 0.06}>
              <path d={g.path} fill="url(#ds-grain)" />
              <path d={g.path} fill="url(#ds-haze)" opacity={isLightMode ? 0.2 : 0.3} />
              <path d={g.path} fill="url(#ds-rim)" opacity="0.4" />
              <path
                d={g.path}
                fill="none"
                stroke={C.sandDeep}
                strokeWidth="1"
                opacity="0.4"
              />
            </g>
          ))}
        </g>

        {/* Depth plane 3: the hero grain. The one focal object, and the only
            one carrying grit, lattice and a full rim. */}
        <g>
          <path d={hero.path} fill="url(#ds-grain)" />
          <g clipPath="url(#ds-hero-clip)">
            {/* grit: seeded speckle, two tones, so the surface is material */}
            <g fill="#6b3d13" opacity={isLightMode ? 0.2 : 0.26}>
              {grit.map((p, i) =>
                i % 2 === 0 ? <circle key={i} cx={p.x} cy={p.y} r={p.r} /> : null,
              )}
            </g>
            <g fill="#ffe4bb" opacity={isLightMode ? 0.24 : 0.2}>
              {grit.map((p, i) =>
                i % 2 === 1 ? (
                  <circle key={i} cx={p.x - 1} cy={p.y - 1} r={p.r * 0.8} />
                ) : null,
              )}
            </g>
            {/* the crystal lattice reading through the surface */}
            <g opacity={isLightMode ? 0.34 : 0.42}>
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
          </g>
          <path d={hero.path} fill="url(#ds-rim)" opacity="0.75" />
          <path
            d={hero.path}
            fill="none"
            stroke={C.sandDeep}
            strokeWidth="1.4"
            opacity="0.7"
          />
        </g>

        {/* Cross-link nodes where the polymer meets a rim. */}
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

        {/* B. subtilis, sitting on the hero grain rather than floating over it:
            its own contact shadow, a gradient body, a lit membrane rim, soft
            nucleoids, and the carbonic anhydrase studding the wall, which is
            what the next beat is about. */}
        <g transform="translate(600 410) rotate(-18)">
          <rect
            x="-92"
            y="-30"
            width="184"
            height="60"
            rx="30"
            fill="#1a0e05"
            opacity={isLightMode ? 0.22 : 0.42}
            transform={`translate(${sx * 0.45} ${sy * 0.45})`}
          />
          <rect
            x="-92"
            y="-30"
            width="184"
            height="60"
            rx="30"
            fill="url(#ds-cell)"
          />
          {/* membrane: brighter on the lit edge, dark on the far one */}
          <rect
            x="-92"
            y="-30"
            width="184"
            height="60"
            rx="30"
            fill="none"
            stroke={isLightMode ? "#d9efe8" : "#bfe3d9"}
            strokeWidth="2.5"
            opacity="0.75"
          />
          <path
            d="M-92 0 Q-92 30 -62 30 L62 30 Q92 30 92 0"
            fill="none"
            stroke={C.teal}
            strokeWidth="3"
            opacity="0.65"
          />
          <ellipse cx="-30" cy="-1" rx="27" ry="15" fill={C.teal} opacity="0.42" />
          <ellipse cx="38" cy="-3" rx="23" ry="13" fill={C.teal} opacity="0.38" />
          {/* carbonic anhydrase on the wall */}
          <g fill={isLightMode ? "#f2fbf8" : "#dff2ec"} opacity="0.8">
            {[-58, -36, -14, 8, 30, 52].map((x, i) => (
              <circle key={i} cx={x} cy={i % 2 === 0 ? -27 : 27} r="4" />
            ))}
          </g>
        </g>

        <rect x="0" y="0" width="1200" height="800" fill="url(#ds-vignette)" />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stabilized crust (pull back out).
//
// Same light and the same vignette as the micro world, so the pull-back reads
// as the last frame of one continuous shot rather than a different drawing: a
// warm ground under a cool sky, a haze along the horizon, the cured lattice
// sitting on its own shadow, and a low sun raking across the surface.
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
  // Same rake as the micro scene: light from the upper left.
  const sx = -LIGHT.x * 22;
  const sy = -LIGHT.y * 18;
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
              <stop offset="0%" stopColor="#e4f0ec" />
              <stop offset="42%" stopColor="#f3e6cd" />
              <stop offset="70%" stopColor="#e6cb99" />
              <stop offset="100%" stopColor="#cfa96e" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#0c1815" />
              <stop offset="42%" stopColor="#1d150f" />
              <stop offset="70%" stopColor="#2b1f15" />
              <stop offset="100%" stopColor="#3a291b" />
            </>
          )}
        </linearGradient>
        {/* A low sun sitting off to the left, the source of the rake below. */}
        <radialGradient id="ds-sun" cx="26%" cy="62%" r="46%">
          <stop offset="0%" stopColor={isLightMode ? "#fff2d2" : "#c98a45"} stopOpacity={isLightMode ? 0.7 : 0.3} />
          <stop offset="100%" stopColor={isLightMode ? "#fff2d2" : "#c98a45"} stopOpacity="0" />
        </radialGradient>
        {/* Haze thickening toward the horizon line, which is what makes a flat
            plane read as distance. */}
        <linearGradient id="ds-horizon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.cured} stopOpacity="0" />
          <stop offset="60%" stopColor={C.cured} stopOpacity={isLightMode ? 0.18 : 0.12} />
          <stop offset="100%" stopColor={C.cured} stopOpacity="0" />
        </linearGradient>
        <radialGradient id="ds-vignette2" cx="50%" cy="52%" r="74%">
          <stop offset="52%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity={isLightMode ? 0.14 : 0.48} />
        </radialGradient>
        <filter id="ds-crust-shadow" x="-20%" y="-40%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      <rect x="0" y="0" width="1200" height="800" fill="url(#ds-sky2)" />
      <rect x="0" y="0" width="1200" height="800" fill="url(#ds-sun)" />
      <rect x="0" y="460" width="1200" height="160" fill="url(#ds-horizon)" />

      <line x1="0" y1="540" x2="1200" y2="540" stroke={C.cured} strokeWidth="1.5" opacity="0.42" />

      {/* The lattice, on its own shadow so the crust has thickness. */}
      <g
        filter="url(#ds-crust-shadow)"
        opacity={isLightMode ? 0.2 : 0.42}
        transform={`translate(${sx} ${sy})`}
      >
        <g stroke="#1a0e05" strokeWidth="6">
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
      </g>

      <g stroke={C.cured} strokeWidth="2" opacity="0.55">
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
          <g key={i}>
            <circle cx={n.x} cy={n.y} r="7" fill={C.cured} opacity="0.95" />
            {/* a lit crescent on each node, from the same upper left */}
            <circle cx={n.x - 2} cy={n.y - 2} r="3.2" fill="#e8f4f0" opacity="0.5" />
          </g>
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
      <rect x="0" y="0" width="1200" height="800" fill="url(#ds-vignette2)" />
    </svg>
  );
}
