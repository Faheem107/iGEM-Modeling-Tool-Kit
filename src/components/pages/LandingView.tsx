"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useTheme } from "@/components/theme-context";
import LandingCinematic from "@/src/components/LandingCinematic";
import DesignCycleStory from "@/src/components/DesignCycleStory";
import ProngReframeSequence from "@/src/components/ProngReframeSequence";
import SandyxAdventure from "@/src/components/SandyxAdventure";
import { GlossaryText } from "@/src/components/GlossaryTerm";
import { PRONGS, KILL_SWITCH } from "@/src/lib/portalsData";
import ExposureEntry from "@/src/components/exposure/ExposureEntry";
import CompactModal from "@/src/components/CompactModal";

type ViewTarget = number | "killswitch";

export default function LandingView() {
  const router = useRouter();
  const { isLightMode } = useTheme();

  const [viewing, setViewing] = useState<ViewTarget | null>(null);
  const [showAdventure, setShowAdventure] = useState(false);
  const [heroPeek, setHeroPeek] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroPeek(true), 1000);
    return () => clearTimeout(t);
  }, []);

  // Always open the landing at the top (the hero beat of the pinned story).
  // Browsers restore the last scroll position on reload, which would drop the
  // reader mid-story where the scene scale transforms are part-way through their
  // curve. Pin restoration to manual and jump to the top on mount.
  useEffect(() => {
    const prev = history.scrollRestoration;
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    return () => {
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

  const activeProng =
    typeof viewing === "number"
      ? PRONGS.find((p) => p.id === viewing)
      : undefined;
  const showingKill = viewing === "killswitch";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative w-full z-10 pb-16"
    >
      {/* --- CINEMATIC DUNE STORY: hero title over the desert, then dive into a
          grain + cell → carbonic-anhydrase 3D → polymer lock → stabilized crust.
          The hero is beat 0 of this one pinned canvas, so there is no separate
          hero section and no gap. --- */}
      <LandingCinematic
        isLightMode={isLightMode}
        heroPeek={heroPeek}
        onOpenAdventure={() => setShowAdventure(true)}
      />

      {/* --- ENGINEERING DESIGN CYCLE: scroll-scrubbed 5-beat story --- */}
      <DesignCycleStory isLightMode={isLightMode} />

      {/* --- THE PRONGS: 3 → 2 + kill-switch reframe animation --- */}
      <div id="prongs" className="pt-[4vh] scroll-mt-20">
        <ProngReframeSequence
          isLightMode={isLightMode}
          onView={(t) => setViewing(t)}
          onExplorePortals={() => router.push("/portals")}
        />
      </div>

      {/* --- DOORWAY: the two exposure modules and the business model. Sits
          directly under the prong row so it reads as the next step. --- */}
      <ExposureEntry />

      {/* --- PRONG / KILL-SWITCH INFORMATION MODAL --- */}
      <CompactModal
        open={Boolean(activeProng || showingKill)}
        onClose={() => setViewing(null)}
        eyebrow={
          showingKill
            ? "Replaces the applied alginate prong"
            : activeProng?.whyDropped
              ? "Modelled for comparison, not carried forward"
              : "Prong"
        }
        title={showingKill ? KILL_SWITCH.title : (activeProng?.title ?? "")}
        tabs={
          showingKill
            ? [
                { id: "what", label: "What it is", body: <Body text={KILL_SWITCH.whatItIs} /> },
                { id: "model", label: "Model", body: <Body text={KILL_SWITCH.modelDoes} /> },
                { id: "impact", label: "Impact", body: <Body text={KILL_SWITCH.impact} /> },
              ]
            : activeProng
              ? [
                  { id: "what", label: "What it is", body: <Body text={activeProng.whatItIs} /> },
                  { id: "model", label: "Model", body: <Body text={activeProng.modelDoes} /> },
                  { id: "impact", label: "Impact", body: <Body text={activeProng.impact} /> },
                  ...(activeProng.whyDropped
                    ? [
                        {
                          id: "why",
                          label: "Why not",
                          body: (
                            <ol className="list-decimal space-y-2 pl-4 text-sm leading-relaxed text-muted-foreground">
                              {activeProng.whyDropped.map((r, i) => (
                                <li key={i}>
                                  <GlossaryText>{r}</GlossaryText>
                                </li>
                              ))}
                            </ol>
                          ),
                        },
                      ]
                    : []),
                ]
              : []
        }
        footer={
          <button
            onClick={() => {
              if (showingKill) {
                setViewing(null);
                router.push("/model?view=killswitch");
              } else if (activeProng) {
                const id = activeProng.id;
                setViewing(null);
                goToModel([id]);
              }
            }}
            className="w-full rounded-[4px] bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-primary-foreground transition-opacity hover:opacity-90"
          >
            {showingKill ? "Open the kill switch model" : "Simulate this prong"}
          </button>
        }
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

function Body({ text }: { text: string }) {
  return (
    <p className="text-sm leading-relaxed text-muted-foreground">
      <GlossaryText>{text}</GlossaryText>
    </p>
  );
}
