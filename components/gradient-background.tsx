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
        colorBack={isLightMode ? "#FFFFFF" : "#000000"}
        softness={0.76}
        intensity={0.45}
        noise={0}
        shape="corners"
        colors={
          isLightMode
            ? ["#D96A5D", "#D96A5D", "#D96A5D"]
            : ["#E8A7A0", "#E8A7A0", "#E8A7A0"]
        }
      />
    </div>
  )
}