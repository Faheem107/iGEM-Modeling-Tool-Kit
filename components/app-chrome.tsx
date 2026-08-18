"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme-context";
import GlobalSandyx from "@/src/components/GlobalSandyx";
import CustomCursor from "@/src/components/CustomCursor";
import CommandPalette from "@/components/search/command-palette";
import { smoothNavTo } from "@/src/lib/scrollRestore";

/**
 * Persistent site chrome: the nav, the theme toggle, the search palette, the
 * custom cursor and the site-wide draggable Sandyx.
 *
 * The nav is lowercase text on a hairline, no pills and no fills. Links use
 * .wght-link, so the current page shows the same weight the hovered one does
 * (data-active reuses the hover end state) and nothing needs a coloured chip
 * to say where you are.
 */

// On the landing these scroll; elsewhere they navigate.
const LANDING_LINKS: { label: string; to: string }[] = [
  { label: "models", to: "#models" },
  { label: "story", to: "#cinematic" },
  { label: "design", to: "#design-cycle" },
];

const SITE_LINKS: { label: string; href: string }[] = [
  { label: "models", href: "/models" },
  { label: "portals", href: "/portals" },
  { label: "exposure", href: "/exposure" },
];

export function AppChrome() {
  const { isLightMode, setIsLightMode } = useTheme();
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const isModel = pathname === "/model";

  // Hidden while the full-screen Sandyx game is open so the chrome does not
  // overlap the game's own exit button (the game broadcasts sandyx:game).
  const [gameOpen, setGameOpen] = useState(false);
  useEffect(() => {
    const onGame = (e: Event) => {
      setGameOpen(Boolean((e as CustomEvent).detail?.open));
    };
    window.addEventListener("sandyx:game", onGame);
    return () => window.removeEventListener("sandyx:game", onGame);
  }, []);

  // The bar takes a ground only once the reader has left the hero, so it never
  // sits as a band over the opening frame.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 400);
        ticking = false;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTop = () => smoothNavTo(0);
  const scrollToId = (sel: string) => {
    const el = document.querySelector(sel);
    if (!el) return;
    // #cinematic is the very top of the page (the pinned hero); its own offset
    // would leave the reader a sliver below the true top.
    if (sel === "#cinematic") return smoothNavTo(0);
    smoothNavTo(el as HTMLElement, -70);
  };

  const themeToggle = (
    <button
      onClick={() => setIsLightMode(!isLightMode)}
      aria-label={isLightMode ? "Switch to dark theme" : "Switch to light theme"}
      className="grid h-8 w-8 shrink-0 place-items-center border border-border text-muted-foreground transition-colors hover:border-dune-orange hover:text-dune-orange"
    >
      {isLightMode ? (
        <Moon className="h-3.5 w-3.5" strokeWidth={2} />
      ) : (
        <Sun className="h-3.5 w-3.5" strokeWidth={2} />
      )}
    </button>
  );

  const searchHint = (
    <button
      type="button"
      onClick={() =>
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", metaKey: true }),
        )
      }
      aria-label="Search the toolkit"
      className="caption hidden items-center gap-2 border border-border px-3 py-1.5 text-muted-foreground transition-colors hover:border-dune-orange hover:text-dune-orange sm:inline-flex"
    >
      search
      <span className="opacity-50">⌘K</span>
    </button>
  );

  return (
    <>
      {/* Custom ring + dot cursor (pointer devices). The game runs its own
          crosshair, so step aside while it is open. */}
      {!gameOpen && <CustomCursor />}

      <CommandPalette />

      {/* Warm wash behind non-landing views, a solid tint, not a glass blur */}
      <div
        className={`pointer-events-none fixed inset-0 z-[-1] transition-colors duration-700 ${
          !isLanding
            ? isLightMode
              ? "bg-dune-paper/70"
              : "bg-dune-basalt/70"
            : "bg-transparent"
        }`}
      />

      {/* The ground goes on the <nav> itself, not on the inner measure: put it
          on the max-w-6xl child and the bar reads as a floating white slab with
          the page showing either side of it.

          A plain background colour that fades in, not a backdrop-filter: a
          backdrop-filter over the pinned hero (whose layers are transformed
          every frame with will-change) re-rasterizes constantly and flickers. */}
      <nav
        className={`fixed inset-x-0 top-0 z-[60] transition-[opacity,background-color] duration-500 ${
          gameOpen ? "pointer-events-none opacity-0" : "opacity-100"
        } ${
          scrolled
            ? isLightMode
              ? "border-b border-border bg-dune-paper/92"
              : "border-b border-border bg-[#0d0a08]/92"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-4 sm:px-8">
          {isLanding ? (
            <button
              onClick={scrollTop}
              className="wght-link text-[0.9375rem] tracking-tight text-foreground"
              aria-label="Dunelock, back to top"
            >
              dunelock.
            </button>
          ) : (
            <Link
              href="/"
              className="wght-link text-[0.9375rem] tracking-tight text-foreground"
              aria-label="Dunelock, return home"
            >
              dunelock.
            </Link>
          )}

          <div className="flex items-center gap-6">
            <div className="hidden items-center gap-6 sm:flex">
              {isLanding
                ? LANDING_LINKS.map((l) => (
                    <button
                      key={l.label}
                      onClick={() => scrollToId(l.to)}
                      className="wght-link text-[0.9375rem] tracking-tight"
                    >
                      {l.label}
                    </button>
                  ))
                : SITE_LINKS.map((l) => (
                    <Link
                      key={l.label}
                      href={l.href}
                      data-active={pathname.startsWith(l.href)}
                      className="wght-link text-[0.9375rem] tracking-tight"
                    >
                      {l.label}
                    </Link>
                  ))}
            </div>
            {searchHint}
            {themeToggle}
          </div>
        </div>
      </nav>

      {/* Site-wide draggable Sandyx */}
      <GlobalSandyx
        isLanding={isLanding}
        hideOnDesktop={isModel}
        isLightMode={isLightMode}
      />
    </>
  );
}
