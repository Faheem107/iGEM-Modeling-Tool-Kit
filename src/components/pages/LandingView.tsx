"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useTheme } from "@/components/theme-context";
import LandingCinematic from "@/src/components/LandingCinematic";
import DesignCycleStory from "@/src/components/DesignCycleStory";
import ProngConstellation from "@/src/components/landing/ProngConstellation";
import SandyxAdventure from "@/src/components/SandyxAdventure";
import ProngModal, { type ProngTarget } from "@/src/components/ProngModal";
import { restoreLandingScroll } from "@/src/lib/scrollRestore";

export default function LandingView() {
  const router = useRouter();
  const { isLightMode } = useTheme();

  const [viewing, setViewing] = useState<ProngTarget | null>(null);
  const [showAdventure, setShowAdventure] = useState(false);

  // A fresh load opens at the top (the hero beat of the pinned story): browsers
  // would otherwise restore a mid-story position where the scene transforms are
  // part-way through their curve. But coming BACK from a module lands on the
  // model index instead, so nobody has to re-scroll the whole cinematic to
  // reach the simulations again. restoreLandingScroll waits for the pinned
  // spacers to exist before it moves, see src/lib/scrollRestore.ts.
  useEffect(() => {
    const prev = history.scrollRestoration;
    history.scrollRestoration = "manual";
    const cleanup = restoreLandingScroll();
    return () => {
      cleanup();
      history.scrollRestoration = prev;
    };
  }, []);

  const diveToCinematic = () => {
    const el = document.getElementById("cinematic");
    const top = el
      ? el.getBoundingClientRect().top + window.scrollY + 4
      : window.innerHeight;
    if (window.__lenis) window.__lenis.scrollTo(top, { duration: 1.2 });
    else window.scrollTo({ top, behavior: "smooth" });
  };

  // "See how we actually model this" → close the overlay, then glide back to the
  // start of the dune story.
  const handleSeeModel = () => {
    setShowAdventure(false);
    setTimeout(() => {
      window.dispatchEvent(new Event("sandyx:overview"));
      diveToCinematic();
    }, 280);
  };

  const goToModel = (prongs: number[]) => {
    if (prongs.length === 0) return;
    router.push(`/model?prongs=${[...prongs].sort().join(",")}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative w-full z-10 pb-12"
    >
      {/* --- CINEMATIC DUNE STORY: hero title over the desert, then dive into a
          grain + cell → carbonic-anhydrase 3D → polymer lock → stabilized crust.
          The hero is beat 0 of this one pinned canvas, so there is no separate
          hero section and no gap. --- */}
      <LandingCinematic
        isLightMode={isLightMode}
        onOpenAdventure={() => setShowAdventure(true)}
      />

      {/* --- ENGINEERING DESIGN CYCLE: scroll-scrubbed 5-beat story --- */}
      <DesignCycleStory isLightMode={isLightMode} />

      {/* --- THE PRONGS + THE MODEL INDEX: the 3 → 2 reframe and the added
          kill switch, told in type and hairlines, with every model, the
          exposure views and the commercial case folded underneath. --- */}
      <ProngConstellation
        onView={(t) => setViewing(t)}
        onExplorePortals={() => router.push("/portals")}
        onSimulateBoth={() => goToModel([1, 2])}
      />

      {/* --- PRONG / KILL-SWITCH INFORMATION MODAL --- */}
      <ProngModal
        viewing={viewing}
        onClose={() => setViewing(null)}
        onOpenModel={(target) => {
          setViewing(null);
          if (target === "killswitch") router.push("/model?view=killswitch");
          else goToModel([target]);
        }}
      />

      {/* --- SANDYX ADVENTURE (full-screen story + retro arcade) --- */}
      <SandyxAdventure
        open={showAdventure}
        onClose={() => setShowAdventure(false)}
        onSeeModel={handleSeeModel}
        onProceedToModel={() => {
          setShowAdventure(false);
          router.push(`/model?prongs=1,2`);
        }}
      />
    </motion.div>
  );
}

