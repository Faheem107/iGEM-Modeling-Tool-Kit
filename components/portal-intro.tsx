"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, X } from "lucide-react";
import { TextEffect } from "@/components/motion-primitives/text-effect";
import type { PortalIntroContent } from "@/src/lib/portalIntros";

const STEP_ACCENTS = [
  "text-dune-orange",
  "text-dune-teal",
  "text-dune-rose",
] as const;

/**
 * The 3-step "what it is / does / we model" explainer shown on portal entry.
 * It reads its own dismissal from localStorage so a "don't show again for this
 * portal" choice is remembered, and reveals each step with the TextEffect
 * motion-primitive. Rendering it is idempotent — it decides for itself whether
 * to appear.
 */
export function PortalIntro({ content }: { content: PortalIntroContent }) {
  const [open, setOpen] = useState(false);
  const [dontShow, setDontShow] = useState(false);

  // Decide visibility after mount (localStorage is client-only). Re-checks when
  // the storageKey changes so a different prong combination re-introduces itself.
  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(content.storageKey) === "1";
    } catch {
      dismissed = false;
    }
    setDontShow(false);
    setOpen(!dismissed);
  }, [content.storageKey]);

  const enter = () => {
    if (dontShow) {
      try {
        localStorage.setItem(content.storageKey, "1");
      } catch {
        /* ignore private-mode storage failures */
      }
    }
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/55"
          onClick={enter}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl p-8 md:p-10 rounded-[4px] relative bg-popover text-popover-foreground border border-border"
          >
            <button
              onClick={enter}
              aria-label="Close and enter"
              className="absolute top-6 right-6 p-2 rounded-[3px] transition-colors bg-secondary hover:brightness-95"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6 inline-block p-4 rounded-[4px] bg-secondary">
              {content.icon}
            </div>

            <TextEffect
              as="h2"
              per="word"
              preset="fade-in-blur"
              className="text-3xl font-extrabold mb-8 tracking-tight"
            >
              {content.title}
            </TextEffect>

            <ol className="space-y-6">
              {content.steps.map((step, i) => (
                <motion.li
                  key={step.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.12, duration: 0.4 }}
                >
                  <div className="flex items-baseline gap-3 mb-1.5">
                    <span className="text-xs font-bold tabular-nums opacity-40">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h4
                      className={`text-xs font-bold uppercase tracking-[0.15em] ${STEP_ACCENTS[i]}`}
                    >
                      {step.label}
                    </h4>
                  </div>
                  <p className="text-base leading-relaxed opacity-90 pl-8">
                    {step.body}
                  </p>
                </motion.li>
              ))}
            </ol>

            <div className="mt-9 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <label className="flex items-center gap-2 text-sm opacity-70 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={dontShow}
                  onChange={(e) => setDontShow(e.target.checked)}
                  className="w-4 h-4"
                />
                Don&apos;t show this again
              </label>
              <button
                onClick={enter}
                className="px-8 py-3 rounded-[3px] bg-primary text-primary-foreground font-bold uppercase tracking-[0.15em] text-sm transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
              >
                Enter <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
