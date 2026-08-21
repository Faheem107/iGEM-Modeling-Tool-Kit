"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-context";
import { useToolkit } from "@/components/toolkit-provider";
import { PortalIntro } from "@/components/portal-intro";
import { PORTAL_INTROS } from "@/src/lib/portalIntros";
import AdvancedFbaPortal from "@/src/components/AdvancedFbaPortal";
import ModuleErrorBoundary from "@/src/components/ErrorBoundary";
import { NAV } from "@/content/copy";
import { PORTAL_NAMES } from "@/content/copy";

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
    <div className="mx-auto w-full max-w-[1600px] px-6 pb-24 pt-24">
      <PortalIntro content={PORTAL_INTROS.pipeline} />
      <button
        onClick={() => router.push("/portals")}
        className="mb-6 flex items-center gap-2 px-4 py-2 text-[length:var(--text-micro)] font-semibold rounded-[4px] border border-border bg-secondary hover:brightness-95 transition"
      >
        {NAV.backToPortals}
      </button>
      <ModuleErrorBoundary isLightMode={isLightMode} label={PORTAL_NAMES.pipeline}>
        <AdvancedFbaPortal
          isLightMode={isLightMode}
          onUpdatePrecursorFlux={tk.updatePrecursorFlux}
        />
      </ModuleErrorBoundary>
    </div>
  );
}
