"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useTheme } from "@/components/theme-context";
import { PortalIntro } from "@/components/portal-intro";
import { PORTAL_INTROS } from "@/src/lib/portalIntros";
import MolstarProteinExplorer from "@/src/components/MolstarProteinExplorer";
import { NAV } from "@/content/copy";

export default function ProteinView() {
  const router = useRouter();
  const { isLightMode } = useTheme();

  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 pb-24 pt-24">
      <PortalIntro content={PORTAL_INTROS.protein} />
      <button
        onClick={() => router.push("/portals")}
        className="mb-6 flex items-center gap-2 px-4 py-2 text-[length:var(--text-micro)] font-semibold rounded-[3px] border border-border bg-secondary hover:brightness-95 transition"
      >
        <ArrowLeft className="h-4 w-4" /> {NAV.backToPortals}
      </button>
      <MolstarProteinExplorer isLightMode={isLightMode} />
    </div>
  );
}
