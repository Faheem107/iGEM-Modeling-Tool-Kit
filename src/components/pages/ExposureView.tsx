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
            {"Pick a market and pick a site. The model works out which sand hotspots feed it, how much material lands there, and how much less would land if we treated the ground at those hotspots. The seasonal view uses the average wind over a three month window. The live view runs the same model on the wind blowing right now."}
          </GlossaryText>
        </p>
        <p className="mt-4 text-[length:var(--text-body)] leading-relaxed text-muted-foreground">
          <GlossaryText max={3}>
            {"Two parts of this are not equally well tested, and it is worth knowing which. Where the sand travels has been checked against airport wind records and comes out well. How much of it travels has never been checked against a measurement of sand. The last section says how far each test went."}
          </GlossaryText>
        </p>
      </header>

      <ExposureWorkspace />
    </div>
  );
}
