"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ModelIndex from "@/src/components/landing/ModelIndex";
import CompactModal from "@/src/components/CompactModal";
import { GlossaryText } from "@/src/components/GlossaryTerm";
import { PRONGS, KILL_SWITCH } from "@/src/lib/portalsData";

type ViewTarget = number | "killswitch";

/** The model index on its own URL, so the list of models is linkable. */
export default function ModelsIndexView() {
  const router = useRouter();
  const [viewing, setViewing] = useState<ViewTarget | null>(null);

  const activeProng =
    typeof viewing === "number" ? PRONGS.find((p) => p.id === viewing) : undefined;
  const showingKill = viewing === "killswitch";

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-32 pt-32 sm:px-8">
      <ModelIndex heading="Every model" onView={(t) => setViewing(t)} />

      <CompactModal
        open={Boolean(activeProng || showingKill)}
        onClose={() => setViewing(null)}
        eyebrow={
          showingKill
            ? "Biosafety layer over both prongs"
            : activeProng?.whyDropped
              ? "Modelled for comparison, not carried forward"
              : "Prong"
        }
        title={showingKill ? KILL_SWITCH.title : (activeProng?.title ?? "")}
        tabs={
          showingKill
            ? [
                { id: "what", label: "What it is", body: <Body text={KILL_SWITCH.whatItIs} /> },
                { id: "model", label: "Model", body: <Body text={KILL_SWITCH.modelDoes} /> },
                { id: "impact", label: "Impact", body: <Body text={KILL_SWITCH.impact} /> },
              ]
            : activeProng
              ? [
                  { id: "what", label: "What it is", body: <Body text={activeProng.whatItIs} /> },
                  { id: "model", label: "Model", body: <Body text={activeProng.modelDoes} /> },
                  { id: "impact", label: "Impact", body: <Body text={activeProng.impact} /> },
                  ...(activeProng.whyDropped
                    ? [
                        {
                          id: "why",
                          label: "Why not",
                          body: (
                            <ol className="list-decimal space-y-2 pl-4 text-sm leading-relaxed text-muted-foreground">
                              {activeProng.whyDropped.map((r, i) => (
                                <li key={i}>
                                  <GlossaryText>{r}</GlossaryText>
                                </li>
                              ))}
                            </ol>
                          ),
                        },
                      ]
                    : []),
                ]
              : []
        }
        footer={
          <button
            onClick={() => {
              if (showingKill) {
                setViewing(null);
                router.push("/model?view=killswitch");
              } else if (activeProng) {
                const id = activeProng.id;
                setViewing(null);
                router.push(`/model?prongs=${id}`);
              }
            }}
            className="caption w-full border border-border py-3 text-center text-foreground transition-colors hover:border-dune-orange hover:text-dune-orange"
          >
            {showingKill ? "Open the kill switch model" : "Simulate this prong"}
          </button>
        }
      />
    </div>
  );
}

function Body({ text }: { text: string }) {
  return (
    <p className="text-sm leading-relaxed text-muted-foreground">
      <GlossaryText>{text}</GlossaryText>
    </p>
  );
}
