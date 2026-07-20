"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "@/components/theme-context";
import LandingCinematic from "@/src/components/LandingCinematic";
import DesignCycleStory from "@/src/components/DesignCycleStory";
import ProngReframeSequence from "@/src/components/ProngReframeSequence";
import SandyxAdventure from "@/src/components/SandyxAdventure";
import { GlossaryText } from "@/src/components/GlossaryTerm";
import { PRONGS, KILL_SWITCH } from "@/src/lib/portalsData";

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

      {/* --- PRONG / KILL-SWITCH INFORMATION MODAL --- */}
      <AnimatePresence>
        {(activeProng || showingKill) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/55"
            onClick={() => setViewing(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[88vh] overflow-y-auto p-8 md:p-10 rounded-[4px] relative bg-popover text-popover-foreground border border-border"
            >
              <button
                onClick={() => setViewing(null)}
                aria-label="Close"
                className="absolute top-6 right-6 px-3 h-8 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] transition-colors bg-secondary hover:brightness-95"
              >
                Close
              </button>

              {showingKill ? (
                <>
                  <h2 className="text-3xl font-extrabold mb-2 tracking-tight">
                    {KILL_SWITCH.title}
                  </h2>
                  <p className="text-sm font-semibold text-dune-orange mb-8 uppercase tracking-[0.12em]">
                    The third element, replaces the applied alginate prong
                  </p>
                  <div className="space-y-6">
                    <ModalBlock
                      accent="text-dune-orange"
                      label="What it is"
                      body={KILL_SWITCH.whatItIs}
                    />
                    <ModalBlock
                      accent="text-dune-teal"
                      label="What the model does"
                      body={KILL_SWITCH.modelDoes}
                    />
                    <ModalBlock
                      accent="text-dune-rose"
                      label="Impact"
                      body={KILL_SWITCH.impact}
                      bold
                    />
                  </div>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        setViewing(null);
                        router.push(`/model?view=killswitch`);
                      }}
                      className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-[3px] uppercase tracking-[0.12em] text-sm transition-opacity hover:opacity-90 flex items-center gap-2"
                    >
                      Open the kill switch model
                    </button>
                  </div>
                </>
              ) : activeProng ? (
                <>
                  <h2 className="text-3xl font-extrabold mb-8 tracking-tight">
                    {activeProng.title}
                  </h2>

                  {activeProng.whyDropped && (
                    <div className="mb-8 rounded-[4px] border border-dune-rose/40 bg-dune-rose/5 p-5">
                      <div className="mb-3 flex items-center gap-2 text-dune-rose">
                        <span className="text-xs font-bold uppercase tracking-[0.15em]">
                          Why we did not proceed with it as a prong
                        </span>
                      </div>
                      <ol className="space-y-2.5 list-decimal pl-5 text-sm leading-relaxed opacity-90">
                        {activeProng.whyDropped.map((r, i) => (
                          <li key={i}>
                            <GlossaryText>{r}</GlossaryText>
                          </li>
                        ))}
                      </ol>
                      <p className="mt-3 text-xs italic opacity-70">
                        It is still fully modelled here for comparison, you can
                        open it in the model workspace below.
                      </p>
                    </div>
                  )}

                  <div className="space-y-6">
                    <ModalBlock
                      accent="text-dune-orange"
                      label="What it is"
                      body={activeProng.whatItIs}
                    />
                    <ModalBlock
                      accent="text-dune-teal"
                      label="What the model does"
                      body={activeProng.modelDoes}
                    />
                    <ModalBlock
                      accent="text-dune-rose"
                      label="Impact"
                      body={activeProng.impact}
                      bold
                    />
                  </div>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        const id = activeProng.id;
                        setViewing(null);
                        goToModel([id]);
                      }}
                      className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-[3px] uppercase tracking-[0.12em] text-sm transition-opacity hover:opacity-90 flex items-center gap-2"
                    >
                      Simulate this prong
                    </button>
                    {activeProng.id !== 3 && (
                      <button
                        onClick={() => {
                          setViewing(null);
                          goToModel([1, 2]);
                        }}
                        className="px-6 py-3 bg-secondary font-bold rounded-[3px] uppercase tracking-[0.12em] text-sm transition-colors hover:brightness-95"
                      >
                        Both prongs together
                      </button>
                    )}
                  </div>
                </>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

function ModalBlock({
  accent,
  label,
  body,
  bold,
}: {
  accent: string;
  label: string;
  body: string;
  bold?: boolean;
}) {
  return (
    <div>
      <h4
        className={`text-xs font-bold uppercase tracking-[0.15em] mb-2 ${accent}`}
      >
        {label}
      </h4>
      <p
        className={`text-base leading-relaxed opacity-90 ${bold ? "font-medium" : ""}`}
      >
        <GlossaryText>{body}</GlossaryText>
      </p>
    </div>
  );
}
