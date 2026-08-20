"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ExposureWorkspace from "@/src/components/exposure/ExposureWorkspace";
import { useHighlight } from "@/src/lib/motion/pointer";
import { NAV } from "@/content/copy";

export default function ExposureView() {
  const hl = useHighlight();
  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-28 md:px-8">
      <Link
        href="/"
        {...hl}
        className="caption mb-8 inline-flex items-center gap-2 transition-colors hover:text-dune-orange"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {NAV.backToOverview}
      </Link>

      <header className="mb-10 max-w-3xl">
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight md:text-5xl">
          Where the sand comes from, and what reaches a site
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          Pick a market, pick a site, and the model estimates how much wind-blown sand
          reaches it and how much less would reach it if the source were treated. The
          seasonal view uses a wind climatology window. The live view runs the same model
          on the current feed, which is what makes deployment timing and pricing possible.
        </p>
      </header>

      <ExposureWorkspace />
    </div>
  );
}
