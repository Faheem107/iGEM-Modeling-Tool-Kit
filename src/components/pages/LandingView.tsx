"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  X,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { useTheme } from "@/components/theme-context";
import { TextEffect } from "@/components/motion-primitives/text-effect";
import LandingCinematic, {
  BranchConnector,
} from "@/src/components/LandingCinematic";
import SandyxAdventure from "@/src/components/SandyxAdventure";
import { PRONGS, prongsToParam } from "@/src/lib/portalsData";

export default function LandingView() {
  const router = useRouter();
  const { isLightMode } = useTheme();

  const [isComboMode, setIsComboMode] = useState(false);
  const [selectedProngs, setSelectedProngs] = useState<number[]>([]);
  const [viewingProng, setViewingProng] = useState<number | null>(null);
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
    router.push(`/model?prongs=${prongsToParam(prongs)}`);
  };

  const activeProngData = PRONGS.find((p) => p.id === viewingProng);

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
            Explore our Simulated 3-pronged solution to tackle wind-driven sand
            movement
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

      {/* --- THE THREE PRONGS --- */}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-[4vh]">
        <motion.div {...fadeAnimProps} className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b border-border pb-4">
            <h2 className="text-3xl font-black uppercase tracking-widest">
              The Three Prongs
            </h2>

            <div className="flex items-center gap-4 mt-6 md:mt-0">
              <span className="text-xs font-bold uppercase tracking-[0.15em] opacity-60">
                Select Combination
              </span>
              <button
                onClick={() => {
                  setIsComboMode(!isComboMode);
                  setSelectedProngs([]);
                }}
                aria-label="Toggle combination-select mode"
                className={`w-14 h-7 rounded-full relative transition-colors duration-300 ${isComboMode ? "bg-dune-orange" : "bg-dune-sand dark:bg-[#3a2f29]"}`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-300 ${isComboMode ? "left-8" : "left-1"}`}
                />
              </button>
            </div>
          </div>

          <BranchConnector isLightMode={isLightMode} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRONGS.map((prong) => {
              const isSelected = selectedProngs.includes(prong.id);
              return (
                <div
                  key={prong.id}
                  onClick={() => {
                    if (isComboMode) {
                      setSelectedProngs((prev) =>
                        prev.includes(prong.id)
                          ? prev.filter((id) => id !== prong.id)
                          : [...prev, prong.id],
                      );
                    } else {
                      setViewingProng(prong.id);
                    }
                  }}
                  className={`cursor-pointer p-8 rounded-[4px] transition-colors duration-300 flex flex-col items-center text-center group border ${
                    isLightMode
                      ? "bg-card border-border hover:bg-dune-sand"
                      : "bg-card border-border hover:brightness-110"
                  } ${isSelected ? "border-dune-orange outline outline-2 outline-dune-orange/40" : ""}`}
                >
                  <div className="mb-5 p-4 rounded-[4px] bg-secondary group-hover:scale-105 transition-transform duration-300">
                    {prong.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3 tracking-tight">
                    {prong.title}
                  </h3>
                  <p className="text-sm font-medium opacity-70 leading-relaxed">
                    {prong.short}
                  </p>

                  {isComboMode && (
                    <div
                      className={`mt-6 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-dune-orange border-dune-orange text-[#241c19]"
                          : "border-border text-transparent"
                      }`}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <AnimatePresence>
            {isComboMode && selectedProngs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mt-16 flex justify-center"
              >
                <button
                  onClick={() => goToModel(selectedProngs)}
                  className="px-10 py-4 bg-primary text-primary-foreground font-bold rounded-[3px] uppercase tracking-[0.15em] transition-opacity hover:opacity-90 flex items-center gap-3"
                >
                  Proceed to Model <ArrowRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Direct entry to the standalone sandbox portals */}
          <div className="mt-14 flex justify-center">
            <button
              onClick={() => router.push("/portals")}
              className="group inline-flex items-center gap-2 text-sm font-semibold text-dune-ash hover:text-dune-orange transition-colors"
            >
              Or explore the individual sandbox portals
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* --- PRONG INFORMATION MODAL --- */}
      <AnimatePresence>
        {viewingProng !== null && !isComboMode && activeProngData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/55"
            onClick={() => setViewingProng(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl p-8 md:p-10 rounded-[4px] relative overflow-hidden bg-popover text-popover-foreground border border-border"
            >
              <button
                onClick={() => setViewingProng(null)}
                aria-label="Close"
                className="absolute top-6 right-6 p-2 rounded-[3px] transition-colors bg-secondary hover:brightness-95"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-6 inline-block p-4 rounded-[4px] bg-secondary">
                {activeProngData.icon}
              </div>

              <h2 className="text-3xl font-extrabold mb-8 tracking-tight">
                {activeProngData.title}
              </h2>

              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-dune-orange mb-2">
                    What it is
                  </h4>
                  <p className="text-base leading-relaxed opacity-90">
                    {activeProngData.whatItIs}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-dune-teal mb-2">
                    What the model does
                  </h4>
                  <p className="text-base leading-relaxed opacity-90">
                    {activeProngData.modelDoes}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-dune-rose mb-2">
                    Impact
                  </h4>
                  <p className="text-base leading-relaxed opacity-90 font-medium">
                    {activeProngData.impact}
                  </p>
                </div>
              </div>
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
