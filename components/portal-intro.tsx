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
 * motion-primitive. Rendering it is idempotent, it decides for itself whether
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
            className="plate-solid relative w-full max-w-2xl p-6 text-popover-foreground md:p-12"
          >
            <button
              onClick={enter}
              aria-label="Close and enter"
              className="absolute right-6 top-6 rounded-[4px] border border-border p-2 text-muted-foreground transition-colors hover:border-dune-orange hover:text-dune-orange"
            >
              <X className="h-4 w-4" />
            </button>

            <TextEffect
              as="h2"
              per="word"
              preset="fade-in-blur"
              className="mb-6 text-[length:var(--text-h1)]"
            >
              {content.title}
            </TextEffect>

            <ol className="space-y-6">
              {content.steps.map((step, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.12, duration: 0.4 }}
                >
                  <div className="flex gap-4">
                    <span
                      aria-hidden
                      className={`caption shrink-0 pt-1 tabular-nums ${STEP_ACCENTS[i]}`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="text-[length:var(--text-body)] leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ol>

            <div className="mt-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <label className="flex cursor-pointer select-none items-center gap-2 text-[length:var(--text-micro)] text-muted-foreground">
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
                className="caption flex items-center justify-center gap-2 border border-border px-6 py-4 text-foreground transition-colors hover:border-dune-orange hover:text-dune-orange"
              >
                Enter <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
