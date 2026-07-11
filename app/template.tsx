"use client";

import { motion } from "motion/react";

/**
 * A template re-mounts on every navigation, so it gives each route a clean
 * fade-in as the user moves between portals (DESIGN.md §6, §9).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
