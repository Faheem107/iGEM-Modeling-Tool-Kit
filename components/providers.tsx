"use client";

import { useEffect, type ReactNode } from "react";
import { useTheme } from "@/components/theme-context";
import { GlossaryProvider } from "@/src/components/GlossaryTerm";
import { ToolkitProvider } from "@/components/toolkit-provider";
import { AppChrome } from "@/components/app-chrome";
import SmoothScroll from "@/src/components/SmoothScroll";

/**
 * Client-side provider stack + persistent chrome that wraps every route. The
 * outer div carries the site-wide text/selection colors and the .light-mode-active
 * hook the CSS overrides key off.
 */
export function Providers({ children }: { children: ReactNode }) {
  const { isLightMode } = useTheme();

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
      </ToolkitProvider>
    </GlossaryProvider>
  );
}
