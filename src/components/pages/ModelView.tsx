"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/components/theme-context";
import { PortalIntro } from "@/components/portal-intro";
import { buildModelIntro, KILL_SWITCH_INTRO } from "@/src/lib/portalIntros";
import SimulationWorkspace from "@/src/components/simulation/SimulationWorkspace";
import KillSwitchWorkspace from "@/src/components/simulation/KillSwitchWorkspace";
import { parseProngsParam } from "@/src/lib/portalsData";
import type { ProngId } from "@/src/lib/prongs";

export default function ModelView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLightMode } = useTheme();

  // The kill switch is the biosafety element, modelled on its own.
  if (searchParams.get("view") === "killswitch") {
    return (
      <>
        <PortalIntro content={KILL_SWITCH_INTRO} />
        <KillSwitchWorkspace
          isLightMode={isLightMode}
          onBack={() => router.push("/")}
        />
      </>
    );
  }

  const prongs = parseProngsParam(searchParams.get("prongs")) as ProngId[];

  return (
    <>
      <PortalIntro content={buildModelIntro(prongs)} />
      <SimulationWorkspace
        selectedProngs={prongs}
        isLightMode={isLightMode}
        onBack={() => router.push("/")}
      />
    </>
  );
}
