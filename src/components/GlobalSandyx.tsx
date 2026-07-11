"use client";

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import DraggableSandyx from "./DraggableSandyx";
import { useGlossary } from "./GlossaryTerm";

/**
 * GlobalSandyx
 * ============
 * The site-wide floating mascot (fixed, bottom-left). Present on every view so the reader can
 * always drag Sandyx onto an underlined word. On the LANDING page it stays hidden until the
 * reader scrolls past the hero ("Scroll to learn more") and slides back out when they return
 * to the top. On the desktop simulation view it steps aside (`lg:hidden`) because the module
 * rail already shows a mascot there.
 */
interface Props {
  /** Current app view; landing gets the scroll-reveal behavior. */
  isLanding: boolean;
  /** True on the simulation workspace, where a desktop rail mascot already exists. */
  hideOnDesktop?: boolean;
  isLightMode: boolean;
}

export default function GlobalSandyx({
  isLanding,
  hideOnDesktop,
  isLightMode,
}: Props) {
  const { dragging } = useGlossary();
  const [pastHero, setPastHero] = React.useState(false);

  React.useEffect(() => {
    if (!isLanding) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        // Reveal once the reader is ~60% past the first viewport (the hero section).
        setPastHero(window.scrollY > window.innerHeight * 0.6);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isLanding]);

  // On landing, only show after the hero; elsewhere always show.
  const visible = isLanding ? pastHero : true;

  return (
    <div
      className={`fixed bottom-4 left-4 z-[80] ${hideOnDesktop ? "lg:hidden" : ""}`}
    >
      <AnimatePresence>
        {visible && (
          <motion.div
            key="global-sandyx"
            initial={{ opacity: 0, x: -60, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: -60, y: 10 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="flex flex-col items-center"
          >
            {!dragging && (
              <motion.span
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className={`mb-1 max-w-[140px] text-center text-[9.5px] font-semibold leading-tight px-2.5 py-1 rounded-2xl border ${
                  isLightMode
                    ? "bg-white/85 border-teal-200 text-slate-600"
                    : "bg-slate-900/85 border-teal-500/25 text-slate-300"
                }`}
                style={{ backdropFilter: "blur(8px)" }}
              >
                Drop me at any{" "}
                <span className="text-teal-500 underline decoration-dotted">
                  underlined
                </span>{" "}
                word!
              </motion.span>
            )}
            <DraggableSandyx size={84} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
