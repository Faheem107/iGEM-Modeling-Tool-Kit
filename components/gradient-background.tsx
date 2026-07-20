"use client";

import { useTheme } from "@/components/theme-context";
import { useEffect, useState } from "react";
import { duneGradient, grainOverlayStyle } from "@/src/lib/grain";

/**
 * Site-wide warm backdrop. Pure CSS (a dune gradient + a static noise overlay),
 * so there is no WebGL context or animation loop to jitter or eat frames. Fixed
 * behind all content.
 */
export function GradientBackground() {
  const { isLightMode } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keep the first paint dark to avoid a light flash before the theme resolves.
  const light = mounted ? isLightMode : false;

  return (
    <div
      className="fixed inset-0 -z-10"
      style={{ background: duneGradient(light) }}
      aria-hidden
    >
      <div className="absolute inset-0" style={grainOverlayStyle(light)} />
    </div>
  );
}
