"use client";

import Link from "next/link";
import { PORTAL_CARDS } from "@/src/lib/portalsData";

/**
 * The sandbox portals, as a list.
 *
 * This was a carousel: four portals behind arrows, one visible at a time, each
 * on a gradient card. Paging through a set of four to find the one you want is
 * work the page should be doing, so all four are simply on screen, in the same
 * hairline rail rows the model index uses.
 */
export default function PortalsView() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 pb-24 pt-24">
      <div className="mb-12">
        <h1 className="text-[length:var(--text-h1)] text-foreground">
          Sandbox portals
        </h1>
        <p className="mt-4 max-w-[60ch] text-[length:var(--text-body)] leading-relaxed text-muted-foreground">
          Each portal is its own workspace, separate from the prong-tailored
          simulation.
        </p>
      </div>

      <ol>
        {PORTAL_CARDS.map((card, i) => (
          <li key={card.id}>
            <Link
              href={card.href}
              className="rail-row group border-t border-border py-6"
            >
              <span className="caption pt-2">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>
                <span className="wght-head rule-link block text-[length:var(--text-h3)] text-foreground">
                  {card.title}
                </span>
                <span className="mt-2 block max-w-[58ch] text-[length:var(--text-body)] leading-relaxed text-muted-foreground">
                  {card.desc}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
