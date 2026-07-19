"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme-context";
import GlobalSandyx from "@/src/components/GlobalSandyx";
import CustomCursor from "@/src/components/CustomCursor";

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
  const scrollTop = () =>
    window.__lenis
      ? window.__lenis.scrollTo(0, { duration: 1 })
      : window.scrollTo({ top: 0, behavior: "smooth" });
  const scrollToId = (sel: string) => {
    const el = document.querySelector(sel);
    if (!el) return;
    // A bounded eased duration keeps the trip predictable, so scrolling up from
    // far down the page past a pinned section reads as one smooth glide.
    if (window.__lenis)
      window.__lenis.scrollTo(el as HTMLElement, { offset: -70, duration: 1.1 });
    else (el as HTMLElement).scrollIntoView({ behavior: "smooth" });
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
              <div
                className={`mx-auto flex max-w-6xl items-center justify-between px-5 sm:px-8 py-3 ${
                  scrolled
                    ? "backdrop-blur-md " +
                      (isLightMode ? "bg-dune-paper/70" : "bg-[#0d0a08]/60")
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
