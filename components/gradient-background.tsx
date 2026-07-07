"use client"

import { GrainGradient } from "@paper-design/shaders-react"
// We MUST import from your context, not "next-themes"
import { useTheme } from "@/components/theme-context"
import { useEffect, useState } from "react"

export function GradientBackground() {
  // Grab your exact toggle state
  const { isLightMode } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="fixed inset-0 -z-10 bg-transparent" />
  }

  return (
    <div className="fixed inset-0 -z-10 bg-transparent">
      <GrainGradient
        // The 'key' forces the WebGL canvas to completely rebuild when you toggle the theme, guaranteeing the color change.
        key={isLightMode ? "light" : "dark"}
        style={{ height: "100%", width: "100%" }}
        colorBack={isLightMode ? "#FAF4EA" : "#080706"}
        softness={0.82}
        intensity={isLightMode ? 0.34 : 0.5}
        noise={0}
        shape="corners"
        colors={
          isLightMode
            // warm sand tones that sit under the desert scenes instead of fighting them
            ? ["#E7D2A9", "#EBDFC4", "#DFC79E"]
            // deep warm ember in the corners for dark mode
            : ["#4A3320", "#2E2114", "#43301E"]
        }
      />
    </div>
  )
}