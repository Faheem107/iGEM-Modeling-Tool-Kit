"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-context";
import { PortalIntro } from "@/components/portal-intro";
import { PORTAL_INTROS } from "@/src/lib/portalIntros";
import MolstarProteinExplorer from "@/src/components/MolstarProteinExplorer";
import { VideoExplanationToggle } from "@/src/components/simulation/_shared";
import { NAV } from "@/content/copy";

export default function ProteinView() {
  const router = useRouter();
  const { isLightMode } = useTheme();

  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 pb-24 pt-24">
      <PortalIntro content={PORTAL_INTROS.protein} />
      <div className="mb-6 flex items-center justify-between gap-4">
        <button
          onClick={() => router.push("/portals")}
          className="flex items-center gap-2 px-4 py-2 text-[length:var(--text-micro)] font-semibold rounded-[4px] border border-border bg-secondary hover:brightness-95 transition"
        >
          {NAV.backToPortals}
        </button>
        <div className="w-full max-w-[16rem]">
          <VideoExplanationToggle moduleId="protein-3d" isLightMode={isLightMode} />
        </div>
      </div>
      <MolstarProteinExplorer isLightMode={isLightMode} />
    </div>
  );
}
