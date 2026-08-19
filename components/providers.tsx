"use client";

import { useEffect, type ReactNode } from "react";
import { useTheme, THEME_KEY } from "@/components/theme-context";
import { GlossaryProvider } from "@/src/components/GlossaryTerm";
import { ToolkitProvider } from "@/components/toolkit-provider";
import { AppChrome } from "@/components/app-chrome";
import SmoothScroll from "@/src/components/SmoothScroll";
import { PointerProvider } from "@/src/lib/motion/pointer";

/**
 * Client-side provider stack + persistent chrome that wraps every route. The
 * outer div carries the site-wide text/selection colors and the .light-mode-active
 * hook the CSS overrides key off.
 */
export function Providers({ children }: { children: ReactNode }) {
  const { isLightMode, setIsLightMode } = useTheme();

  // Pick up a saved theme choice here rather than in the provider itself. The
  // provider sits outside the Suspense boundary this subtree is inside, so an
  // effect there commits before this boundary hydrates, and the boundary would
  // then hydrate against a value the server never rendered. Reading it here
  // means the update lands after hydration, which is the only order that is
  // free of a mismatch.
  useEffect(() => {
    try {
      if (localStorage.getItem(THEME_KEY) === "light") setIsLightMode(true);
    } catch {
      /* private mode: the default stands */
    }
    // Run once on mount. setIsLightMode is stable enough for that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror the theme onto <html> so portalled UI (Radix dialogs, tooltips,
  // toasts) that renders outside this subtree still picks up the .dark tokens.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", !isLightMode);
    return () => root.classList.remove("dark");
  }, [isLightMode]);

  return (
    <GlossaryProvider isLightMode={isLightMode}>
      <ToolkitProvider>
        <PointerProvider>
        <div
          className={`min-h-screen font-sans relative ${
            isLightMode
              ? "bg-transparent text-foreground selection:bg-dune-maroon selection:text-white light-mode-active"
              : "dark bg-transparent text-foreground selection:bg-dune-orange selection:text-black"
          }`}
        >
          <SmoothScroll />
          <AppChrome />
          <main className="relative min-h-screen">{children}</main>
        </div>
        </PointerProvider>
      </ToolkitProvider>
    </GlossaryProvider>
  );
}
