"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useTheme } from "@/components/theme-context";
import { useToolkit } from "@/components/toolkit-provider";
import { PortalIntro } from "@/components/portal-intro";
import { PORTAL_INTROS } from "@/src/lib/portalIntros";
import AdvancedFbaPortal from "@/src/components/AdvancedFbaPortal";
import ModuleErrorBoundary from "@/src/components/ErrorBoundary";

/**
 * Physical Pipeline portal, Flux Balance Analysis only. The other biophysical
 * modules live in the prong-tailored /model workspace; this standalone portal is
 * dedicated to the constraint-based metabolic optimisation.
 */
export default function PipelineView() {
  const router = useRouter();
  const { isLightMode } = useTheme();
  const tk = useToolkit();

  return (
    <div className="pt-24 pb-12 px-4 md:px-8 max-w-[1600px] mx-auto">
      <PortalIntro content={PORTAL_INTROS.pipeline} />
      <button
        onClick={() => router.push("/portals")}
        className="mb-6 flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-[3px] border border-border bg-secondary hover:brightness-95 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Portals
      </button>
      <ModuleErrorBoundary isLightMode={isLightMode} label="Flux Balance Analysis">
        <AdvancedFbaPortal
          isLightMode={isLightMode}
          onUpdatePrecursorFlux={tk.updatePrecursorFlux}
        />
      </ModuleErrorBoundary>
    </div>
  );
}
