"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, Moon } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTheme } from "@/components/theme-context";
import GlobalSandyx from "@/src/components/GlobalSandyx";
import CustomCursor from "@/src/components/CustomCursor";

/**
 * Smoothly scroll to a target that sits above one or more pinned, scroll-scrubbed
 * sections (the cinematic story and the design cycle).
 *
 * Those sections use a scrub *lag* (`scrub: 0.6`) so manual scrolling feels
 * eased. But when we drive a long programmatic jump to the top, that lag makes
 * each pinned timeline ease toward the moving scroll position a beat behind it,
 * so the sections visibly rewind to their first step out of sync with the page,
 * which reads as "the story resets, THEN the page scrolls". We remove the lag
 * only for the duration of the trip: on every frame we snap each scrub tween to
 * completion so the pinned timelines track the scroll exactly, then let the
 * normal easing resume once we arrive.
 */
function smoothNavTo(target: number | HTMLElement, offset = 0) {
  const lenis =
    typeof window !== "undefined" ? window.__lenis : undefined;

  const settleScrubs = () => {
    ScrollTrigger.getAll().forEach((st) => {
      const tw = (
        st as unknown as { getTween?: () => gsap.core.Tween | undefined }
      ).getTween?.();
      if (tw) tw.progress(1);
    });
  };

  if (!lenis) {
    if (typeof target === "number")
      window.scrollTo({ top: target, behavior: "smooth" });
    else target.scrollIntoView({ behavior: "smooth" });
    return;
  }

  let active = true;
  const sync = () => {
    if (!active) return;
    settleScrubs();
    requestAnimationFrame(sync);
  };
  requestAnimationFrame(sync);

  lenis.scrollTo(target, {
    offset,
    duration: 0.9,
    onComplete: () => {
      active = false;
      // Final settle so the pinned sections land exactly on their start frame
      // (ScrollTrigger only re-renders on movement, so nudge it once more).
      ScrollTrigger.update();
      settleScrubs();
    },
  });
}

// Minimal, toolkit-relevant landing nav (animejs.com-style). Each link scrolls
// to a section on the landing page.
const NAV_LINKS: { label: string; to: string }[] = [
  { label: "Story", to: "#cinematic" },
  { label: "Design", to: "#design-cycle" },
  { label: "Prongs", to: "#prongs" },
];

/**
 * Persistent site chrome shared by every route: the warm wash behind non-landing
 * views, the theme toggle, the Dunelock logo home button, the landing-only
 * scroll-to-top affordance, and the site-wide draggable Sandyx.
 */
export function AppChrome() {
  const { isLightMode, setIsLightMode } = useTheme();
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const isModel = pathname === "/model";

  // Hidden while the full-screen Sandyx game is open so the toggle + logo don't
  // overlap the game's own exit button (the game broadcasts sandyx:game).
  const [gameOpen, setGameOpen] = useState(false);
  useEffect(() => {
    const onGame = (e: Event) => {
      setGameOpen(Boolean((e as CustomEvent).detail?.open));
    };
    window.addEventListener("sandyx:game", onGame);
    return () => window.removeEventListener("sandyx:game", onGame);
  }, []);

  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setShowTop(window.scrollY > 400);
        ticking = false;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrolled = showTop;
  const scrollTop = () => smoothNavTo(0);
  const scrollToId = (sel: string) => {
    const el = document.querySelector(sel);
    if (!el) return;
    // #cinematic is the very top of the page (the pinned hero). Its own offset
    // would leave the reader a sliver below the true top, so treat it as 0.
    if (sel === "#cinematic") return smoothNavTo(0);
    smoothNavTo(el as HTMLElement, -70);
  };

  return (
    <>
      {/* Custom ring + dot cursor (pointer devices). The game runs its own
          crosshair, so step aside while it is open. */}
      {!gameOpen && <CustomCursor />}

      {/* Warm wash behind non-landing views, a solid tint, not a glass blur */}
      <div
        className={`fixed inset-0 z-[-1] pointer-events-none transition-colors duration-700 ${
          !isLanding
            ? isLightMode
              ? "bg-dune-paper/70"
              : "bg-dune-basalt/70"
            : "bg-transparent"
        }`}
      />

      {/* Theme toggle, shared across states. */}
      {(() => {
        const themeToggle = (
          <button
            onClick={() => setIsLightMode(!isLightMode)}
            aria-label={isLightMode ? "Switch to dark theme" : "Switch to light theme"}
            className={`grid place-items-center h-9 w-9 rounded-full border transition-colors duration-300 ${
              isLightMode
                ? "bg-white hover:bg-dune-sand text-dune-maroon border-border"
                : "bg-dune-slate hover:brightness-110 text-dune-paper border-border"
            }`}
          >
            {isLightMode ? (
              <Moon className="h-4 w-4" strokeWidth={2.2} />
            ) : (
              <Sun className="h-4 w-4" strokeWidth={2.2} />
            )}
          </button>
        );

        // Landing: a slim minimal nav (wordmark + toolkit links + toggle),
        // animejs.com-style. Elsewhere: the compact logo + toggle cluster.
        if (isLanding) {
          return (
            <nav
              className={`fixed top-0 left-0 right-0 z-[60] transition-opacity duration-200 ${
                gameOpen ? "pointer-events-none opacity-0" : "opacity-100"
              }`}
            >
              {/* Solid translucent bar, no backdrop-blur. A backdrop-filter over
                  the pinned hero (whose layers are transformed every frame with
                  will-change) re-rasterizes constantly and flickers, so we use a
                  plain background colour that fades in with a transition instead
                  of popping on at the scroll threshold. */}
              <div
                className={`mx-auto flex max-w-6xl items-center justify-between px-5 sm:px-8 py-3 transition-colors duration-500 ${
                  scrolled
                    ? isLightMode
                      ? "bg-dune-paper/90"
                      : "bg-[#0d0a08]/90"
                    : "bg-transparent"
                }`}
              >
                <button
                  onClick={scrollTop}
                  className="flex items-center gap-2.5"
                  aria-label="Dunelock, back to top"
                >
                  <img
                    src="/dunelock-logo.png"
                    alt=""
                    draggable={false}
                    className="w-8 h-8 object-contain rounded-full"
                  />
                  <span
                    className={`text-sm font-black uppercase tracking-[0.2em] font-display ${
                      isLightMode ? "text-dune-maroon" : "text-dune-paper"
                    }`}
                  >
                    Dunelock
                  </span>
                </button>
                <div className="flex items-center gap-1 sm:gap-2">
                  {NAV_LINKS.map((l) => (
                    <button
                      key={l.label}
                      onClick={() => scrollToId(l.to)}
                      className="hidden sm:inline-block rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-dune-ash transition-colors hover:text-dune-orange"
                    >
                      {l.label}
                    </button>
                  ))}
                  {themeToggle}
                </div>
              </div>
            </nav>
          );
        }

        return (
          <div
            className={`fixed top-4 right-6 z-[60] flex items-center gap-3 transition-opacity duration-200 ${
              gameOpen ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
          >
            {themeToggle}
            <Link
              href="/"
              aria-label="Dunelock home, return to the start"
              className="transition-transform duration-300 hover:scale-105 active:scale-95"
            >
              <img
                src="/dunelock-logo.png"
                alt="Dunelock, return home"
                draggable={false}
                className="w-11 h-11 object-contain rounded-full"
              />
            </Link>
          </div>
        );
      })()}

      {/* Site-wide draggable Sandyx */}
      <GlobalSandyx
        isLanding={isLanding}
        hideOnDesktop={isModel}
        isLightMode={isLightMode}
      />
    </>
  );
}
