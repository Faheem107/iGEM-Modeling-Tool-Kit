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
            {"Wind picks sand up in one place and drops it in another. Pick a market and a site, and this page works out which sand hotspots feed that site, how much reaches it, and how much less would reach it if we treated the ground where the sand starts. One view runs on a wind climatology, what the wind usually does over three months. The other runs on the wind blowing right now. The fine part of that sand is what people end up breathing."}
          </GlossaryText>
        </p>
      </header>

      <ExposureWorkspace />
    </div>
  );
}
