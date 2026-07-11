"use client";

import type { ReactNode } from "react";
import { useTheme } from "@/components/theme-context";
import { GlossaryProvider } from "@/src/components/GlossaryTerm";
import { ToolkitProvider } from "@/components/toolkit-provider";
import { AppChrome } from "@/components/app-chrome";

/**
 * Client-side provider stack + persistent chrome that wraps every route. The
 * outer div carries the site-wide text/selection colors and the .light-mode-active
 * hook the CSS overrides key off.
 */
export function Providers({ children }: { children: ReactNode }) {
  const { isLightMode } = useTheme();
  return (
    <GlossaryProvider isLightMode={isLightMode}>
      <ToolkitProvider>
        <div
          className={`min-h-screen font-sans relative ${
            isLightMode
              ? "bg-transparent text-foreground selection:bg-dune-maroon selection:text-white light-mode-active"
              : "bg-transparent text-foreground selection:bg-dune-orange selection:text-black"
          }`}
        >
          <AppChrome />
          <main className="relative min-h-screen">{children}</main>
        </div>
      </ToolkitProvider>
    </GlossaryProvider>
  );
}
