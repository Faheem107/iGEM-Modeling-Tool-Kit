"use client";

import { useState } from "react";
import CompactModal from "./CompactModal";
import { BUSINESS_SECTIONS, BUSINESS_SUMMARY } from "@/src/lib/businessModel";
import { useHighlight } from "@/src/lib/motion/pointer";

/**
 * The business case, as a tag on the edge of the page.
 *
 * It used to be a panel sitting under the model outputs, which put a page of
 * commercial prose in the middle of a page of numbers. Neither reads well next
 * to the other: the prose interrupts the model, and the model makes the prose
 * look like a footnote.
 *
 * So it becomes a bookmark. Fixed to the right edge near the top, vertical, and
 * it opens a dialog. z-[80] is the layer the Sandyx mascot already uses for
 * page-edge furniture, below PortalIntro at 110 and dialogs at 200.
 *
 * The dialog itself is CompactModal, which already portals to document.body,
 * locks scroll, handles Escape, keeps Lenis off its scroller and renders tabs
 * as an underline rather than as pills, which the design language bans.
 */
export default function BusinessCaseBookmark() {
  const [open, setOpen] = useState(false);
  const hl = useHighlight();

  return (
    <>
      <button
        type="button"
        {...hl}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="plate-solid plate-interactive caption fixed right-0 top-28 z-[80] rounded-l-[6px] border border-r-0 border-border py-4 pl-2 pr-1.5 hover:text-dune-orange"
        style={{ writingMode: "vertical-rl" }}
      >
        The business case
      </button>

      <CompactModal
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="Exposure"
        title="The business case"
        widthClass="max-w-2xl"
        bodyHeightClass="max-h-[62vh]"
        tabs={BUSINESS_SECTIONS.map((sec) => ({
          id: sec.id,
          label: sec.label,
          body: (
            <div className="space-y-4">
              <h3 className="wght-head text-[length:var(--text-body)] leading-snug text-foreground">
                {sec.heading}
              </h3>
              {sec.body.map((para, i) => (
                <p key={i} className="leading-relaxed text-muted-foreground">
                  {para}
                </p>
              ))}
            </div>
          ),
        }))}
        footer={
          <p className="text-[length:var(--text-micro)] leading-relaxed text-muted-foreground">
            {BUSINESS_SUMMARY}
          </p>
        }
      />
    </>
  );
}
