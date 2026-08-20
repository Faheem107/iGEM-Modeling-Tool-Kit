"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { useScrollLock } from "@/src/lib/scrollLock";
import { X } from "lucide-react";
import { useHighlight, useStick } from "@/src/lib/motion/pointer";

/**
 * A small tabbed dialog.
 *
 * The previous prong dialog was a single tall scroll at max-w-2xl, which meant
 * three long sections and a scrollbar before you could see what was on offer.
 * Tabs keep the box short enough to read at a glance and make each section one
 * click away rather than one scroll.
 *
 * Portals to document.body: fixed positioning resolves against the nearest
 * transformed ancestor, and the landing page is full of scroll transforms.
 */

export interface ModalTab {
  id: string;
  label: string;
  body: React.ReactNode;
}

export default function CompactModal({
  open,
  onClose,
  eyebrow,
  title,
  tabs,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  tabs: ModalTab[];
  footer?: React.ReactNode;
}) {
  const [active, setActive] = useState(0);
  const [mounted, setMounted] = useState(false);
  const hl = useHighlight();
  const stick = useStick();

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (open) setActive(0);
  }, [open, title]);

  // Hold the page still while this is up, see src/lib/scrollLock.ts.
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          data-modal-open="true"
          className="fixed inset-0 z-[200] flex items-center justify-center bg-dune-basalt/55 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="plate-solid relative w-full max-w-md overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div className="border-b border-border px-6 pb-4 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  {eyebrow && <p className="caption mb-2 text-dune-orange">{eyebrow}</p>}
                  <h2 className="text-[length:var(--text-h3)] leading-tight">{title}</h2>
                </div>
                <button
                  {...stick}
                  onClick={onClose}
                  aria-label="Close"
                  data-cursor-radius="4"
                  className="-mr-1 -mt-1 shrink-0 rounded-[4px] border border-border p-2 text-muted-foreground transition-colors hover:border-dune-orange/50 hover:text-dune-orange"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {tabs.length > 1 && (
                <div className="-mb-4 mt-6 flex flex-wrap gap-6">
                  {tabs.map((t, i) => (
                    <button
                      key={t.id}
                      {...hl}
                      onClick={() => setActive(i)}
                      data-active={i === active}
                      className="caption border-b-2 border-transparent pb-2 transition-colors data-[active=true]:border-dune-orange data-[active=true]:text-dune-orange hover:text-foreground"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div
              data-lenis-prevent
              className="max-h-[46vh] overflow-y-auto overscroll-contain px-6 py-6"
            >
              <motion.div
                key={tabs[active]?.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="text-[length:var(--text-micro)] leading-relaxed"
              >
                {tabs[active]?.body}
              </motion.div>
            </div>

            {footer && (
              <div className="border-t border-border px-6 py-4">{footer}</div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
