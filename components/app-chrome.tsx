"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Sun, Moon, ChevronUp } from "lucide-react";
import { useTheme } from "@/components/theme-context";
import GlobalSandyx from "@/src/components/GlobalSandyx";

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

  return (
    <>
      {/* Warm wash behind non-landing views — a solid tint, not a glass blur */}
      <div
        className={`fixed inset-0 z-[-1] pointer-events-none transition-colors duration-700 ${
          !isLanding
            ? isLightMode
              ? "bg-dune-paper/70"
              : "bg-dune-basalt/70"
            : "bg-transparent"
        }`}
      />

      {/* Dunelock home button + Theme Toggle (top-right) */}
      <div className="fixed top-4 right-6 z-[60] flex items-center gap-3">
        <button
          onClick={() => setIsLightMode(!isLightMode)}
          aria-label="Toggle light / dark theme"
          className={`p-2.5 rounded-[3px] transition-colors duration-300 border ${
            isLightMode
              ? "bg-white hover:bg-dune-sand text-dune-orange border-border"
              : "bg-dune-slate hover:brightness-110 text-dune-orange border-border"
          }`}
        >
          {isLightMode ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>
        <Link
          href="/"
          aria-label="Dunelock home — return to the start"
          className="transition-transform duration-300 hover:scale-105 active:scale-95"
        >
          <img
            src="/dunelock-logo.png"
            alt="Dunelock — return home"
            draggable={false}
            className="w-11 h-11 object-contain rounded-full"
          />
        </Link>
      </div>

      {/* Scroll To Top Arrow (landing only, top-left) */}
      <AnimatePresence>
        {isLanding && showTop && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Scroll to top"
            className={`fixed top-6 left-6 z-[100] p-2 transition-transform hover:-translate-y-1 ${
              isLightMode
                ? "text-dune-ash hover:text-dune-maroon"
                : "text-dune-ash hover:text-dune-paper"
            }`}
          >
            <ChevronUp className="w-8 h-8" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Site-wide draggable Sandyx */}
      <GlobalSandyx
        isLanding={isLanding}
        hideOnDesktop={isModel}
        isLightMode={isLightMode}
      />
    </>
  );
}
