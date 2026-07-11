"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useTheme } from "@/components/theme-context";
import { useToolkit } from "@/components/toolkit-provider";
import { PortalIntro } from "@/components/portal-intro";
import { PORTAL_INTROS } from "@/src/lib/portalIntros";
import WetLabSandbox2D from "@/src/components/WetLabSandbox2D";

export default function WetLabView() {
  const router = useRouter();
  const { isLightMode } = useTheme();
  const { pgaAccum, shearModulus } = useToolkit();
  const backToPortals = () => router.push("/portals");

  return (
    <div className="pt-24 pb-12 px-4 md:px-8 max-w-[1400px] mx-auto">
      <PortalIntro content={PORTAL_INTROS["wet-lab"]} />
      <button
        onClick={backToPortals}
        className="mb-6 flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-[3px] border border-border bg-secondary hover:brightness-95 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Portals
      </button>
      <WetLabSandbox2D
        onBack={backToPortals}
        universalVitals={{ pgaAccum, shearModulus }}
        isLightMode={isLightMode}
      />
    </div>
  );
}
