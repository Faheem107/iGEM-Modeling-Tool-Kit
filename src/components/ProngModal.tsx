"use client";

import CompactModal from "@/src/components/CompactModal";
import { GlossaryText } from "@/src/components/GlossaryTerm";
import { PRONGS, KILL_SWITCH } from "@/src/lib/portalsData";
import { KILL_SWITCH_ROLE, ALGINATE_STATUS } from "@/content/copy";

export type ProngTarget = number | "killswitch";

/**
 * The prong / kill-switch explainer.
 *
 * The landing and the model index both open this, and until now each carried
 * its own copy of the whole thing: same eyebrows, same four tabs, same footer,
 * written out twice. Two copies of one modal is two places for the wording to
 * drift, which is exactly what had happened to the eyebrows.
 *
 * The only thing that differed was where the footer button sends you, so that
 * is the prop.
 */
export default function ProngModal({
  viewing,
  onClose,
  onOpenModel,
}: {
  viewing: ProngTarget | null;
  onClose: () => void;
  /** Where "Simulate this prong" goes. The landing restores scroll, the index does not. */
  onOpenModel: (target: ProngTarget) => void;
}) {
  const activeProng =
    typeof viewing === "number" ? PRONGS.find((p) => p.id === viewing) : undefined;
  const showingKill = viewing === "killswitch";

  const tabs = showingKill
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
      : [];

  return (
    <CompactModal
      open={Boolean(activeProng || showingKill)}
      onClose={onClose}
      eyebrow={
        showingKill
          ? KILL_SWITCH_ROLE
          : activeProng?.whyDropped
            ? ALGINATE_STATUS
            : "Prong"
      }
      title={showingKill ? KILL_SWITCH.title : (activeProng?.title ?? "")}
      tabs={tabs}
      footer={
        <button
          onClick={() => {
            if (showingKill) onOpenModel("killswitch");
            else if (activeProng) onOpenModel(activeProng.id);
          }}
          className="caption w-full border border-border py-4 text-center text-foreground transition-colors hover:border-dune-orange hover:text-dune-orange"
        >
          {showingKill ? "Open the kill switch model" : "Simulate this prong"}
        </button>
      }
    />
  );
}

function Body({ text }: { text: string }) {
  return (
    <p className="text-sm leading-relaxed text-muted-foreground">
      <GlossaryText>{text}</GlossaryText>
    </p>
  );
}
