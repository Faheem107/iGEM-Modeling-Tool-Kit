"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createTimeline, svg, type Timeline } from "animejs";
import StoryEscape, { skipToModels } from "@/src/components/landing/StoryEscape";
import { playCinematic } from "@/src/lib/storyPlayback";
import SandParticles from "@/src/components/dune-story/SandParticles";
import { readScroll } from "@/src/components/SmoothScroll";
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
import { WikiBeatLink } from "@/src/components/landing/WikiBeatLink";
import { CrustScene, EnzymeScene, FieldScene, GrainScene } from "./scenes";
import HeroSandyx from "./HeroSandyx";

// Hero, five beats, tail. The stage is sticky for the first block, so the
// scroll travel is the six blocks that follow it.
const LAST = BEATS.length + 1;

// How far a scene drifts as it arrives or leaves, in vh. The scene layers
// overscan by this much above and below, so a drift never shows an edge.
const DRIFT = 3;
const shift = (vh: number) => `translate3d(0, ${vh.toFixed(3)}vh, 0)`;

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

    // Only touch the DOM when a value changes. A scene at zero has its CSS
    // clock paused, so the wind of a scene nobody can see is not repainted
    // under the one they can. It stays painted, not hidden: a hidden scene is
    // first rasterised when it fades in, and that cost lands mid-scroll.
    let lastDraw = -1;
    const backdrop = document.getElementById("site-backdrop");
    const written = new Map<string, string>();
    const write = (el: HTMLElement | null, key: string, prop: string, value: string) => {
      if (!el) return;
      const id = `${key}:${prop}`;
      if (written.get(id) === value) return;
      written.set(id, value);
      el.style.setProperty(prop, value);
    };
    // `near` is whether the scene is on screen or about to be. Only then is it
    // a GPU layer at all. Every full-screen layer costs its pixels in GPU
    // memory whether it is visible or not, and with all four scenes held at
    // once the browser ran out of tile memory and drew the story with blocks
    // missing. A scene is brought back a little before it fades in, so it is
    // rasterised while still at zero opacity.
    const place = (el: HTMLElement | null, transform: string, opacity: number, near: boolean) => {
      if (!el) return;
      const key = el.dataset.layer ?? "";
      const o = opacity < 0.002 ? 0 : opacity;
      write(el, key, "visibility", near ? "visible" : "hidden");
      write(el, key, "will-change", near ? "transform, opacity" : "auto");
      write(el, key, "transform", transform);
      write(el, key, "opacity", o.toFixed(3));
      const idle = o === 0 ? "1" : "0";
      if (written.get(`${key}:idle`) !== idle) {
        written.set(`${key}:idle`, idle);
        el.toggleAttribute("data-idle", idle === "1");
      }
    };

    // s runs 0..6, one unit per block, so the scene and the words on screen are
    // the same number. Every cross-fade finishes before the next whole number:
    // on a beat the frame is one scene, never two half-faded ones.
    const render = (s: number) => {
      const dive = smooth(s, 0.9, 1.85);
      // Scenes drift, they do not zoom. A layer whose scale changes is
      // re-rasterised at every new scale, and on a slower GPU the tiles could
      // not keep up, so the story was drawn with blocks missing. A translation
      // reuses the tiles it already has. The descent wash carries the move
      // under the surface.
      place(fieldRef.current, shift(-dive * DRIFT), 1 - smooth(s, 1.25, 1.8), s < 2.2);
      // The hero has wind; beat 1 is where it crosses the threshold and the
      // surface starts to move.
      write(fieldRef.current, "field", "--wind", (0.3 + 0.7 * smooth(s, 0.4, 1.0)).toFixed(3));
      write(fieldRef.current, "field", "--lift", smooth(s, 0.55, 1.05).toFixed(3));

      write(
        descentRef.current,
        "descent",
        "opacity",
        (0.6 * smooth(s, 1.15, 1.5) * (1 - smooth(s, 1.55, 1.9))).toFixed(3),
      );

      const arrive = smooth(s, 1.2, 1.8);
      const intoCell = smooth(s, 2.25, 2.8);
      const backOut = smooth(s, 3.25, 3.75);
      const inCell = intoCell * (1 - backOut);
      const leave = smooth(s, 4.3, 4.8);
      place(
        grainRef.current,
        // Shrinking on the way out, so the cluster is the size the crust's
        // front row is when the crust takes over from it.
        // Scaling down reuses tiles already drawn at full size, so this one
        // scale stays.
        `${shift((1 - arrive) * DRIFT - inCell * DRIFT)} scale(${(1 - leave * 0.62).toFixed(4)})`,
        arrive * (1 - leave) * (1 - inCell),
        s > 0.8 && s < 5.2,
      );

      place(
        enzymeRef.current,
        shift((1 - intoCell) * DRIFT),
        inCell,
        s > 1.85 && s < 4.15,
      );
      write(enzymeRef.current, "enzyme", "--ca-draw", smooth(s, 2.25, 2.65).toFixed(3));
      write(enzymeRef.current, "enzyme", "--ca-grow", smooth(s, 2.5, 3.3).toFixed(3));

      const draw = smooth(s, 3.35, 3.95);
      if (draw !== lastDraw) {
        lastDraw = draw;
        tl.seek(tl.duration * draw);
      }

      const crust = smooth(s, 4.25, 4.85);
      place(crustRef.current, shift((1 - crust) * DRIFT), crust, s > 3.85);
      // The same wind as the opening, over ground that no longer answers it.
      write(crustRef.current, "crust", "--wind", crust.toFixed(3));

      const o = 1 - smooth(s, 0.08, 0.5);
      write(heroRef.current, "hero", "opacity", o.toFixed(3));
      write(heroRef.current, "hero", "pointer-events", o < 0.05 ? "none" : "auto");

      // The stage is opaque and covers the viewport until the story ends, so
      // the site backdrop behind it is taken off the GPU meanwhile.
      write(backdrop, "backdrop", "visibility", progressRef.current < 0.999 ? "hidden" : "visible");

      const block = Math.min(LAST, Math.max(0, Math.round(s)));
      setActive((prev) => (prev === block ? prev : block));
    };

    const wide = window.matchMedia("(min-width: 768px)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let heroH = 0;
    let beatH = 0;
    let top = 0;
    let travel = 0;
    const measure = () => {
      // Document offsets, read once here rather than a rect every frame: a
      // rect read after the frame's style writes forces a layout each time.
      top = section.getBoundingClientRect().top + window.scrollY;
      travel = section.offsetHeight - window.innerHeight;
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
      const y = readScroll() - top;
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
        backdrop?.style.removeProperty("visibility");
        tl.revert?.();
      };
    }

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        measure();
        render(readStage());
      }, 120);
    };
    window.addEventListener("resize", onResize);
    // Fonts and the sections below settle after mount and can move the story.
    const ro = new ResizeObserver(onResize);
    ro.observe(document.body);

    let onScreen = true;
    const vis = new IntersectionObserver(([e]) => (onScreen = e.isIntersecting), {
      rootMargin: "200px",
    });
    vis.observe(section);

    // Lenis already eases the scroll, so the scene is drawn from its scroll
    // event, in the same frame Lenis moves the words. A second ease on top made
    // the scene trail the text and settle late. Without Lenis the loop smooths
    // a wheel's discrete steps itself. Lenis mounts after this effect runs, so
    // the loop hands over to it once it exists.
    const SMOOTH = 9;
    let shown = readStage();
    let last = performance.now();
    let raf = 0;
    let offLenis: (() => void) | undefined;
    const onLenis = () => {
      if (onScreen) render(readStage());
    };
    const loop = (now: number) => {
      const lenis = window.__lenis;
      if (lenis) {
        offLenis = lenis.on("scroll", onLenis);
        raf = 0;
        render(readStage());
        return;
      }
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!onScreen) return;
      const target = readStage();
      shown += (target - shown) * Math.min(1, dt * SMOOTH);
      if (Math.abs(target - shown) < 0.001) shown = target;
      render(shown);
    };
    render(shown);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      offLenis?.();
      backdrop?.style.removeProperty("visibility");
      ro.disconnect();
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
        <div ref={fieldRef} data-layer="field" className="absolute inset-x-0 -inset-y-[3vh]" style={{ transformOrigin: "52% 82%" }}>
          <div aria-hidden className="absolute inset-0" style={{ background: duneGradient(isLightMode) }}>
            {/* No blend mode here: a blended layer inside a zooming one is
                recomposited against its backdrop on every frame. */}
            <div
              className="absolute inset-0"
              style={{ ...grainOverlayStyle(isLightMode), mixBlendMode: "normal", opacity: isLightMode ? 0.05 : 0.035 }}
            />
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
          <FieldScene
            isLightMode={isLightMode}
            shade={
              <div
                aria-hidden
                className={`absolute inset-0 ${
                  isLightMode
                    ? "bg-gradient-to-b from-transparent via-transparent to-[#e9c99a]/70"
                    : "bg-gradient-to-b from-[#0b0908]/35 via-transparent to-[#0b0908]/85"
                }`}
              />
            }
          />
        </div>

        <div ref={grainRef} data-layer="grain" className="absolute inset-x-0 -inset-y-[3vh]" style={{ transformOrigin: "center", opacity: 0 }}>
          <GrainScene isLightMode={isLightMode} grains={grains} bridges={bridges} lattice={lattice} />
        </div>

        <div ref={enzymeRef} data-layer="enzyme" className="absolute inset-x-0 -inset-y-[3vh]" style={{ transformOrigin: "center", opacity: 0 }}>
          <EnzymeScene isLightMode={isLightMode} />
        </div>

        <div ref={crustRef} data-layer="crust" className="absolute inset-x-0 -inset-y-[3vh]" style={{ transformOrigin: "center", opacity: 0 }}>
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
                      className="pointer-events-none absolute -inset-x-16 -inset-y-20"
                      style={{
                        // A soft wash drawn as a gradient. A CSS blur filter here
                        // was re-applied by the compositor on every frame.
                        background: `radial-gradient(closest-side, ${
                          isLightMode ? "rgba(251, 247, 240, 0.5)" : "rgba(9, 7, 6, 0.55)"
                        } 55%, transparent)`,
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
                      <span className="hidden md:block" />
                      <WikiBeatLink link={beat.wiki} shadow={shadow} />
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
                  Curious where those numbers come from? Keep scrolling. Next up is how we
                  built each model, and what each one assumes.
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
