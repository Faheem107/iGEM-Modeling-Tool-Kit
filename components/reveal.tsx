"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";

/**
 * Reveal — the single scroll-fade primitive used across the toolkit (DESIGN.md §6).
 * Wrap any graph, canvas, panel, or section so it fades + rises into view once.
 * Respects prefers-reduced-motion via the global CSS reset (animations collapse
 * to ~0ms), so no special-casing is needed here.
 */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  amount = 0.3,
  className,
  ...rest
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  amount?: number;
} & Omit<HTMLMotionProps<"div">, "children">) {
  return (
    <motion.div
      initial={{ opacity: 0, y, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.7, ease: "easeOut", delay }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export default Reveal;
