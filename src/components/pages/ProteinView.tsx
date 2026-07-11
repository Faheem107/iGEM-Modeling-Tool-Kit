"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useTheme } from "@/components/theme-context";
import { PortalIntro } from "@/components/portal-intro";
import { PORTAL_INTROS } from "@/src/lib/portalIntros";
import MolstarProteinExplorer from "@/src/components/MolstarProteinExplorer";

export default function ProteinView() {
  const router = useRouter();
  const { isLightMode } = useTheme();

  return (
    <div className="pt-24 pb-12 px-4 md:px-8 max-w-[1600px] mx-auto">
      <PortalIntro content={PORTAL_INTROS.protein} />
      <button
        onClick={() => router.push("/portals")}
        className="mb-6 flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-[3px] border border-border bg-secondary hover:brightness-95 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Portals
      </button>
      <MolstarProteinExplorer isLightMode={isLightMode} />
    </div>
  );
}
