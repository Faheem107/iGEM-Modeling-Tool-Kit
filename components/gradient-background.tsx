"use client"

import { GrainGradient } from "@paper-design/shaders-react";
import { useTheme } from "@/components/theme-context";

export function GradientBackground() {
  const { isLightMode } = useTheme();

  return (
    <div className="fixed inset-0 -z-50 pointer-events-none select-none w-screen h-screen overflow-hidden">
      <GrainGradient
        style={{ height: "100%", width: "100%" }}
        colorBack={isLightMode ? "#FFFFFF" : "#05070a"}
        softness={0.76}
        intensity={0.45}
        noise={0}
        shape="corners"
        offsetX={0}
        offsetY={0}
        scale={1.2}
        rotation={0}
        speed={0.6}
        colors={isLightMode ? ["#D96A5D", "#D96A5D", "#D96A5D"] : ["#E8A7A0", "#E8A7A0", "#E8A7A0"]}
      />
    </div>
  )
}
