"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, X, Ban } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { useTheme } from "@/components/theme-context";
import { TextEffect } from "@/components/motion-primitives/text-effect";
import LandingCinematic from "@/src/components/LandingCinematic";
import ProngReframeSequence from "@/src/components/ProngReframeSequence";
import SandyxAdventure from "@/src/components/SandyxAdventure";
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

  const diveToCinematic = () => {
    const el = document.getElementById("cinematic");
    const top = el
      ? el.getBoundingClientRect().top + window.scrollY + 4
      : window.innerHeight;
    window.scrollTo({ top, behavior: "smooth" });
  };

  // "See how we actually model this" → close the overlay, snap the carousel to
  // Project Overview, then glide there smoothly.
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

  const fadeAnimProps = {
    initial: { opacity: 0, y: 50, scale: 0.98 },
    whileInView: { opacity: 1, y: 0, scale: 1 },
    viewport: { once: true, amount: 0.3 },
    transition: { duration: 0.7, ease: "easeOut" as const },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative w-full z-10 pb-48"
    >
      {/* --- HERO SECTION --- */}
      <motion.div
        {...fadeAnimProps}
        className="h-screen flex flex-col items-center justify-center text-center relative px-4 w-full"
      >
        <div className="max-w-[1100px] mx-auto w-full flex flex-col items-center justify-center mt-[-8vh]">
          <div className="relative flex flex-col items-center">
            <AnimatePresence>
              {heroPeek && (
                <motion.button
                  type="button"
                  onClick={() => setShowAdventure(true)}
                  initial={{ y: 120, opacity: 0, scale: 0.7 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 120, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 240, damping: 17 }}
                  className="absolute -top-[74px] left-1/2 -translate-x-1/2 z-30 flex flex-col items-center cursor-pointer group"
                  aria-label="Click Sandyx to play the interactive story and fight the sandstorm"
                >
                  <motion.span
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 }}
                    className="absolute -top-9 z-20 px-3 py-1.5 rounded-full bg-dune-orange text-[#241c19] text-[10px] md:text-[11px] font-black uppercase tracking-wider whitespace-nowrap"
                  >
                    Click me to fight sandstorms!
                  </motion.span>
                  <motion.img
                    src="/sandyx.png"
                    alt="Sandyx"
                    draggable={false}
                    className="w-24 md:w-28 object-contain drop-shadow-xl transition-transform duration-300 group-hover:scale-110"
                    animate={{ rotate: [0, -4, 4, 0] }}
                    transition={{
                      duration: 3.2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </motion.button>
              )}
            </AnimatePresence>
            <span className="relative z-10 text-sm md:text-base font-bold tracking-[0.2em] uppercase mb-6 block text-dune-orange">
              NYUAD iGEM 2026
            </span>
          </div>
          <TextEffect
            as="h1"
            per="line"
            preset="fade-in-blur"
            speedReveal={1.2}
            className={`text-2xl md:text-4xl lg:text-5xl font-extrabold tracking-tight uppercase leading-[1.1] mb-4 font-display whitespace-pre-line ${isLightMode ? "text-dune-maroon" : "text-white"}`}
          >
            {"iGEM Modeling Toolkit To\nStudy Sand Stabilization"}
          </TextEffect>
          <TextEffect
            as="p"
            per="word"
            preset="fade"
            delay={0.6}
            className="text-base md:text-lg lg:text-xl font-medium max-w-3xl mx-auto opacity-70 leading-relaxed"
          >
            Explore our simulated two-pronged engineered solution, plus a
            genetically-encoded kill switch, to tackle wind-driven sand movement
          </TextEffect>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 opacity-60"
        >
          <span className="text-xs font-bold tracking-[0.3em] uppercase">
            Scroll to learn more
          </span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <ChevronDown className="w-6 h-6" />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* --- CINEMATIC STORY (desert → dusty city → lab) --- */}
      <LandingCinematic isLightMode={isLightMode} />

      {/* --- THE PRONGS: 3 → 2 + kill-switch reframe animation --- */}
      <div className="pt-[4vh]">
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
                className="absolute top-6 right-6 p-2 rounded-[3px] transition-colors bg-secondary hover:brightness-95"
              >
                <X className="w-5 h-5" />
              </button>

              {showingKill ? (
                <>
                  <div className="mb-6 inline-block p-4 rounded-[4px] bg-secondary">
                    {KILL_SWITCH.icon}
                  </div>
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
                      Open the kill switch model <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : activeProng ? (
                <>
                  <div className="mb-6 inline-block p-4 rounded-[4px] bg-secondary">
                    {activeProng.icon}
                  </div>
                  <h2 className="text-3xl font-extrabold mb-8 tracking-tight">
                    {activeProng.title}
                  </h2>

                  {activeProng.whyDropped && (
                    <div className="mb-8 rounded-[4px] border border-dune-rose/40 bg-dune-rose/5 p-5">
                      <div className="mb-3 flex items-center gap-2 text-dune-rose">
                        <Ban className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-[0.15em]">
                          Why we did not proceed with it as a prong
                        </span>
                      </div>
                      <ol className="space-y-2.5 list-decimal pl-5 text-sm leading-relaxed opacity-90">
                        {activeProng.whyDropped.map((r, i) => (
                          <li key={i}>{r}</li>
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
                      Simulate this prong <ArrowRight className="w-4 h-4" />
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
        {body}
      </p>
    </div>
  );
}
