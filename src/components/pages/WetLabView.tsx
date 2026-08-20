"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useTheme } from "@/components/theme-context";
import { useToolkit } from "@/components/toolkit-provider";
import { PortalIntro } from "@/components/portal-intro";
import { PORTAL_INTROS } from "@/src/lib/portalIntros";
import WetLabSandbox2D from "@/src/components/WetLabSandbox2D";
import { NAV } from "@/content/copy";

export default function WetLabView() {
  const router = useRouter();
  const { isLightMode } = useTheme();
  const { pgaAccum, shearModulus } = useToolkit();
  const backToPortals = () => router.push("/portals");

  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 pb-24 pt-24">
      <PortalIntro content={PORTAL_INTROS["wet-lab"]} />
      <button
        onClick={backToPortals}
        className="mb-6 flex items-center gap-2 px-4 py-2 text-[length:var(--text-micro)] font-semibold rounded-[3px] border border-border bg-secondary hover:brightness-95 transition"
      >
        <ArrowLeft className="w-4 h-4" /> {NAV.backToPortals}
      </button>
      <WetLabSandbox2D
        onBack={backToPortals}
        universalVitals={{ pgaAccum, shearModulus }}
        isLightMode={isLightMode}
      />
    </div>
  );
}
