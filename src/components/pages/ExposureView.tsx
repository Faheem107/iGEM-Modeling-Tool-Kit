"use client";

import Link from "next/link";
import ExposureWorkspace from "@/src/components/exposure/ExposureWorkspace";
import { GlossaryText } from "@/src/components/GlossaryTerm";
import { useHighlight } from "@/src/lib/motion/pointer";
import { NAV } from "@/content/copy";

export default function ExposureView() {
  const hl = useHighlight();
  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 pb-24 pt-24">
      <Link
        href="/"
        {...hl}
        className="caption mb-6 inline-flex items-center gap-2 transition-colors hover:text-dune-orange"
      >
        {NAV.backToOverview}
      </Link>

      <header className="mb-12 max-w-3xl">
        <h1 className="mb-4 text-[length:var(--text-h1)] font-extrabold tracking-tight">
          Where the sand comes from, and what reaches a site
        </h1>
        <p className="text-[length:var(--text-body)] leading-relaxed text-muted-foreground">
          <GlossaryText max={4}>
            {"Pick a market, pick a site, and the model estimates how much wind-blown sand reaches it and how much less would reach it if the source were treated. The seasonal view runs on a fitted wind climatology, month by month. The live view runs the same model on the current feed, which is what makes deployment timing and pricing possible."}
          </GlossaryText>
        </p>
        <p className="mt-4 text-[length:var(--text-body)] leading-relaxed text-muted-foreground">
          <GlossaryText max={3}>
            {"Two of those numbers are not equally well supported, and it is worth knowing which before reading any of them. Where the sand travels has been checked against airport wind records and comes out well. How much of it travels has never been checked against a measurement of sand at all. The last section says how far each test went, including the two that failed."}
          </GlossaryText>
        </p>
      </header>

      <ExposureWorkspace />
    </div>
  );
}
