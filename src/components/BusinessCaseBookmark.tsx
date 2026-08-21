"use client";

import { useState } from "react";
import CompactModal from "./CompactModal";
import { BUSINESS_SECTIONS, BUSINESS_SUMMARY } from "@/src/lib/businessModel";
import { useHighlight } from "@/src/lib/motion/pointer";

/**
 * The business case as a tag on the right edge, opening a dialog.
 *
 * z-[80] is the page-edge furniture layer the Sandyx mascot uses, below
 * PortalIntro at 110 and dialogs at 200.
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
