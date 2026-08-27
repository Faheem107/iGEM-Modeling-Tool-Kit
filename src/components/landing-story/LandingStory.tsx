"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createTimeline, svg, type Timeline } from "animejs";
import StoryEscape, { skipToModels } from "@/src/components/landing/StoryEscape";
import { playCinematic } from "@/src/lib/storyPlayback";
import SandParticles from "@/src/components/dune-story/SandParticles";
import { CaptionText } from "@/src/components/CaptionText";
import { duneGradient, grainOverlayStyle } from "@/src/lib/grain";
import {
  NAV,
  PROJECT_ONE_LINER,
  PROJECT_TEAM,
  PROJECT_TITLE,
} from "@/content/copy";
import {
  microGrains,
  polymerBridges,
  latticePoints,
  type Grain,
} from "@/src/lib/dune-story/geometry";
import { BEATS } from "./beats";
import { CrustScene, EnzymeScene, FieldScene, GrainScene } from "./scenes";
import HeroSandyx from "./HeroSandyx";

// Hero, five beats, tail. The stage is sticky for the first block, so the
// scroll travel is the six blocks that follow it.
const LAST = BEATS.length + 1;

const smooth = (x: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export default function LandingStory({
  isLightMode,
  onOpenAdventure,
}: {
  isLightMode: boolean;
  onOpenAdventure?: () => void;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const beatsRef = useRef<HTMLOListElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const descentRef = useRef<HTMLDivElement>(null);
  const grainRef = useRef<HTMLDivElement>(null);
  const enzymeRef = useRef<HTMLDivElement>(null);
  const crustRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);

  const [active, setActive] = useState(0);
  const [staticMode, setStaticMode] = useState(false);

  const grains = useMemo<Grain[]>(() => microGrains(), []);
  const bridges = useMemo(() => polymerBridges(grains), [grains]);
  const lattice = useMemo(
    () => latticePoints(grains[0].cx, grains[0].cy, grains[0].r),
    [grains],
  );

  useEffect(() => {
    const section = sectionRef.current;
    const hero = heroRef.current;
    const beats = beatsRef.current;
    if (!section || !hero || !beats) return;

    const tl: Timeline = createTimeline({
      autoplay: false,
      defaults: { ease: "inOutQuad", duration: 800 },
    });
    tl.add(
      svg.createDrawable(section.querySelectorAll(".ls-bridge") as never),
      { draw: ["0 0", "0 1"], duration: 900 },
      0,
    );
    tl.add(
      section.querySelectorAll(".ls-node"),
      { opacity: [0, 1], scale: [0, 1], duration: 500 },
      500,
    );

    const place = (el: HTMLElement | null, transform: string, opacity: number) => {
      if (!el) return;
      el.style.transform = transform;
      el.style.opacity = opacity.toFixed(3);
    };

    // s runs 0..6, one unit per block, so the scene and the words on screen are
    // the same number. Every cross-fade finishes before the next whole number:
    // on a beat the frame is one scene, never two half-faded ones.
    const render = (s: number) => {
      const dive = smooth(s, 0.9, 1.85);
      place(fieldRef.current, `scale(${(1 + dive * 4.5).toFixed(4)})`, 1 - smooth(s, 1.25, 1.8));
      if (fieldRef.current) {
        // The hero has wind; beat 1 is where it crosses the threshold and the
        // surface starts to move.
        fieldRef.current.style.setProperty("--wind", (0.3 + 0.7 * smooth(s, 0.4, 1.0)).toFixed(3));
        fieldRef.current.style.setProperty("--lift", smooth(s, 0.55, 1.05).toFixed(3));
      }

      if (descentRef.current)
        descentRef.current.style.opacity = (
          0.6 * smooth(s, 1.15, 1.5) * (1 - smooth(s, 1.55, 1.9))
        ).toFixed(3);

      const arrive = smooth(s, 1.2, 1.8);
      const intoCell = smooth(s, 2.25, 2.8);
      const backOut = smooth(s, 3.25, 3.75);
      const inCell = intoCell * (1 - backOut);
      const leave = smooth(s, 4.3, 4.8);
      place(
        grainRef.current,
        // Shrinking on the way out, so the cluster is the size the crust's
        // front row is when the crust takes over from it.
        `scale(${((2.4 - arrive * 1.4) * (1 + inCell * 1.1) * (1 - leave * 0.62)).toFixed(4)})`,
        arrive * (1 - leave) * (1 - inCell),
      );

      place(enzymeRef.current, `scale(${(0.88 + intoCell * 0.12).toFixed(4)})`, inCell);
      if (enzymeRef.current) {
        enzymeRef.current.style.setProperty("--ca-draw", smooth(s, 2.25, 2.65).toFixed(3));
        enzymeRef.current.style.setProperty("--ca-grow", smooth(s, 2.5, 3.3).toFixed(3));
      }

      tl.seek(tl.duration * smooth(s, 3.35, 3.95));

      const crust = smooth(s, 4.25, 4.85);
      place(crustRef.current, `scale(${(1.35 - crust * 0.35).toFixed(4)})`, crust);
      // The same wind as the opening, over ground that no longer answers it.
      crustRef.current?.style.setProperty("--wind", crust.toFixed(3));

      if (heroRef.current) {
        const o = 1 - smooth(s, 0.08, 0.5);
        heroRef.current.style.opacity = o.toFixed(3);
        heroRef.current.style.pointerEvents = o < 0.05 ? "none" : "auto";
      }

      const block = Math.min(LAST, Math.max(0, Math.round(s)));
      setActive((prev) => (prev === block ? prev : block));
    };

    const wide = window.matchMedia("(min-width: 768px)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let heroH = 0;
    let beatH = 0;
    const measure = () => {
      heroH = hero.offsetHeight;
      beatH = beats.offsetHeight / BEATS.length;
      // Nothing to move the subject aside for once the beats span the frame.
      const room = window.matchMedia("(min-width: 768px)").matches;
      section.style.setProperty("--subject", room ? "230px" : "0px");
    };
    measure();

    // Block index straight off the section's own rect, measured rather than
    // assumed, so an unequal hero cannot drift the scene off the words.
    const readStage = () => {
      const rect = section.getBoundingClientRect();
      const y = -rect.top;
      const travel = rect.height - window.innerHeight;
      progressRef.current = travel > 0 ? Math.min(1, Math.max(0, y / travel)) : 0;
      const s = y <= heroH ? y / heroH : 1 + (y - heroH) / beatH;
      return Math.min(LAST, Math.max(0, s));
    };

    if (!wide || reduce) {
      setStaticMode(true);
      tl.seek(tl.duration);
      const draw = () => render(readStage());
      draw();
      window.addEventListener("scroll", draw, { passive: true });
      window.addEventListener("resize", () => {
        measure();
        draw();
      });
      return () => {
        window.removeEventListener("scroll", draw);
        tl.revert?.();
      };
    }

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(measure, 120);
    };
    window.addEventListener("resize", onResize);

    let onScreen = true;
    const vis = new IntersectionObserver(([e]) => (onScreen = e.isIntersecting), {
      rootMargin: "200px",
    });
    vis.observe(section);

    // dt-scaled, so a 120Hz display and a 60Hz one travel the same distance per
    // second. 5.5 tracks the finger and still absorbs a wheel's discrete steps.
    const SMOOTH = 5.5;
    let shown = readStage();
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!onScreen) return;
      const target = readStage();
      shown += (target - shown) * Math.min(1, dt * SMOOTH);
      if (Math.abs(target - shown) < 0.001) shown = target;
      render(shown);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      vis.disconnect();
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      tl.revert?.();
    };
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

  const ink = isLightMode ? "text-dune-maroon" : "text-dune-paper";
  const shadow = isLightMode
    ? "0 1px 10px rgba(255,255,255,0.55)"
    : "0 1px 14px rgba(0,0,0,0.6)";

  return (
    <section id="cinematic" ref={sectionRef} className="relative w-full scroll-mt-0">
      <div
        className={`pointer-events-none sticky top-0 h-[100svh] w-full overflow-hidden ${
          isLightMode ? "bg-[#e9c99a]" : "bg-[#0b0908]"
        }`}
      >
        <div ref={fieldRef} className="absolute inset-0 will-change-transform" style={{ transformOrigin: "52% 82%" }}>
          <div aria-hidden className="absolute inset-0" style={{ background: duneGradient(isLightMode) }}>
            <div className="absolute inset-0" style={grainOverlayStyle(isLightMode)} />
          </div>
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: isLightMode
                ? "radial-gradient(120% 90% at 50% 14%, rgba(244,220,174,0) 34%, rgba(214,167,101,0.34) 78%, rgba(181,112,47,0.5) 100%)"
                : "radial-gradient(120% 95% at 50% 10%, rgba(42,29,19,0) 26%, rgba(18,11,8,0.5) 70%, rgba(11,9,8,0.82) 100%)",
            }}
          />
          <FieldScene isLightMode={isLightMode} />
          <div
            aria-hidden
            className={`absolute inset-0 ${
              isLightMode
                ? "bg-gradient-to-b from-transparent via-transparent to-[#e9c99a]/70"
                : "bg-gradient-to-b from-[#0b0908]/35 via-transparent to-[#0b0908]/85"
            }`}
          />
        </div>

        <div ref={grainRef} className="absolute inset-0 will-change-transform" style={{ transformOrigin: "center", opacity: 0 }}>
          <GrainScene isLightMode={isLightMode} grains={grains} bridges={bridges} lattice={lattice} />
        </div>

        <div ref={enzymeRef} className="absolute inset-0 will-change-transform" style={{ transformOrigin: "center", opacity: 0 }}>
          <EnzymeScene isLightMode={isLightMode} />
        </div>

        <div ref={crustRef} className="absolute inset-0 will-change-transform" style={{ transformOrigin: "center", opacity: 0 }}>
          <CrustScene isLightMode={isLightMode} />
        </div>

        {/* A quick pass under the surface, not a black hold. */}
        <div ref={descentRef} aria-hidden className="absolute inset-0 z-[4] bg-[#0b0705]" style={{ opacity: 0 }} />

        <SandParticles
          progressRef={progressRef}
          isLightMode={isLightMode}
          fadeWithDive
          className="pointer-events-none absolute inset-0 z-[5]"
        />
      </div>

      <div className="relative z-10 -mt-[100svh]">
        <div ref={heroRef} className="flex min-h-[100svh] items-center px-6">
          <div className="mx-auto w-full max-w-6xl">
            <span className="hero-reveal hero-reveal-1 caption mb-6 block text-dune-orange">
              {PROJECT_TEAM}
            </span>
            <h1
              style={{
                textShadow: isLightMode
                  ? "0 2px 14px rgba(255,255,255,0.45)"
                  : "0 2px 18px rgba(0,0,0,0.5)",
              }}
              className={`hero-reveal hero-reveal-2 max-w-[16ch] text-[length:var(--text-display)] leading-[0.98] ${ink}`}
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
              {PROJECT_ONE_LINER}
            </p>
            <div className={`hero-reveal hero-reveal-3 relative mt-12 flex flex-wrap items-center gap-x-6 gap-y-4 ${ink}`}>
              <button type="button" onClick={skipToModels} className="caption rule-link relative z-10 text-current">
                {NAV.toModels}
              </button>
              <button type="button" onClick={playCinematic} className="caption rule-link relative z-10 text-current">
                Watch the story
              </button>
              {/* Sandyx leans out from behind this link, pointer-events-none, so
                  the text keeps the whole hit area. */}
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

        <ol ref={beatsRef}>
          {BEATS.map((beat, i) => {
            const on = staticMode || active === i + 1;
            return (
              <li key={beat.id} className="flex h-[82svh] items-center px-6 md:h-[100svh]">
                <div className="mx-auto w-full max-w-6xl">
                  <div
                    className="relative max-w-[46rem] transition-[opacity,transform] duration-700 ease-out"
                    style={{ opacity: on ? 1 : 0.14, transform: on ? "none" : "translateY(14px)" }}
                  >
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -inset-x-6 -inset-y-8 rounded-[64px] blur-2xl"
                      style={{
                        background: isLightMode ? "rgba(251, 247, 240, 0.5)" : "rgba(9, 7, 6, 0.55)",
                      }}
                    />
                    <div className="rail-row relative">
                      <div
                        className={`caption flex items-baseline gap-x-4 md:block ${
                          isLightMode ? "text-dune-maroon/70" : "text-dune-paper/65"
                        }`}
                        style={{ textShadow: shadow }}
                      >
                        <span className="text-dune-orange">{String(i + 1).padStart(2, "0")}</span>
                        <span className="md:mt-2 md:block">
                          <CaptionText>{beat.scale}</CaptionText> across
                        </span>
                      </div>
                      <p
                        className={`text-[length:var(--text-h1)] leading-[1.08] ${ink}`}
                        style={{ fontVariationSettings: '"wght" 600', textShadow: shadow }}
                      >
                        {beat.line}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="flex h-[82svh] items-center px-6 md:h-[100svh]">
          <div className="mx-auto w-full max-w-6xl">
            <div
              className="relative max-w-[46rem] transition-opacity duration-700 ease-out"
              style={{ opacity: staticMode || active === LAST ? 1 : 0.14 }}
            >
              <div className="rail-row">
                <span className="caption text-dune-orange">Next</span>
                <p
                  className={`max-w-[var(--measure)] text-[length:var(--text-body)] leading-relaxed ${
                    isLightMode ? "text-dune-maroon/85" : "text-dune-paper/85"
                  }`}
                  style={{ textShadow: shadow }}
                >
                  None of those numbers is measured yet. What follows is how the models
                  that produce them were built, and what each one assumes.
                </p>
              </div>
            </div>
          </div>
        </div>

        {!staticMode && (
          <div className="pointer-events-none sticky bottom-0 h-0">
            <StoryEscape progressRef={progressRef} />
          </div>
        )}
      </div>
    </section>
  );
}
