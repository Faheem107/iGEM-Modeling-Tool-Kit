"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Wind, Radio, Briefcase, ArrowRight } from "lucide-react";
import CompactModal from "@/src/components/CompactModal";
import { BUSINESS_SECTIONS, BUSINESS_SUMMARY } from "@/src/lib/businessModel";
import { useStick, useHighlight } from "@/src/lib/motion/pointer";

/**
 * The doorway from the landing page into the two exposure modules and the
 * business model. Sits directly under the prong row so it reads as the next
 * step after the kill switch rather than a separate destination.
 */

function Tile({
  icon: Icon,
  eyebrow,
  title,
  body,
  onClick,
}: {
  icon: typeof Wind;
  eyebrow: string;
  title: string;
  body: string;
  onClick: () => void;
}) {
  const stick = useStick();
  return (
    <button
      {...stick}
      onClick={onClick}
      data-cursor-radius="6"
      className="group flex w-full flex-col items-start gap-2 border-t border-border py-5 text-left"
    >
      <span className="caption flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-dune-orange" />
        {eyebrow}
      </span>
      <span className="wght-head rule-link text-[length:var(--text-h3)] leading-tight text-foreground">
        {title}
      </span>
      <span className="text-[0.875rem] leading-relaxed text-muted-foreground">
        {body}
      </span>
      <span className="caption mt-1 inline-flex items-center gap-1.5 text-dune-orange">
        Open
        <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

export default function ExposureEntry() {
  const router = useRouter();
  const [showBusiness, setShowBusiness] = useState(false);
  const hl = useHighlight();

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-24 sm:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
      >
        <p className="caption mb-2">From the crust to the site</p>
        <h2 className="mb-4 text-[length:var(--text-h1)] text-foreground">
          Where the sand goes, and what it costs
        </h2>
        <p className="mb-12 max-w-[60ch] text-[length:var(--text-lede)] leading-relaxed text-muted-foreground">
          The prongs above decide how well a treated surface holds. These two views take
          that result outward: how much sand reaches a given site, and what stopping it is
          worth to the people who own that site.
        </p>

        <div className="grid grid-cols-1 gap-x-10 md:grid-cols-3">
          <Tile
            icon={Wind}
            eyebrow="Module 1"
            title="Seasonal forecast"
            body="Wind climatology by season, sand hotspots and target sites on one map, with the fraction of sand reaching each site."
            onClick={() => router.push("/exposure")}
          />
          <Tile
            icon={Radio}
            eyebrow="Module 2"
            title="Live feed"
            body="The same model on the current wind and dust feed, for deployment timing and dynamic pricing."
            onClick={() => router.push("/exposure")}
          />
          <Tile
            icon={Briefcase}
            eyebrow="Commercial"
            title="Business model"
            body="Who buys this, what they are actually paying for, and the limits of what we claim."
            onClick={() => setShowBusiness(true)}
          />
        </div>
      </motion.div>

      <CompactModal
        open={showBusiness}
        onClose={() => setShowBusiness(false)}
        eyebrow="Commercial"
        title="Business model"
        tabs={BUSINESS_SECTIONS.map((s) => ({
          id: s.id,
          label: s.label,
          body: (
            <div className="space-y-3">
              <h3 className="text-[0.9375rem] leading-snug text-foreground">{s.heading}</h3>
              {s.body.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                  {p}
                </p>
              ))}
            </div>
          ),
        }))}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs leading-relaxed text-muted-foreground">{BUSINESS_SUMMARY}</p>
            <button
              {...hl}
              onClick={() => {
                setShowBusiness(false);
                router.push("/exposure");
              }}
              className="caption shrink-0 border border-border px-4 py-2.5 text-foreground transition-colors hover:border-dune-orange hover:text-dune-orange"
            >
              Open the model
            </button>
          </div>
        }
      />
    </section>
  );
}
