"use client";

/**
 * How well a number is backed up, said next to the number itself.
 *
 * Four values rather than three. `fitted` is the one the validation section
 * needed: the Weibull A and k are neither measured in a lab nor taken from a
 * paper, they fall out of a reanalysis record, and calling that "literature"
 * would credit them with a review they never had. It reads muted on purpose,
 * because it sits between the two.
 *
 * The word itself is defined in the glossary under `evidence-grade`.
 */
export type EvidenceGrade = "measured" | "literature" | "fitted" | "unsourced";

const TONE: Record<EvidenceGrade, string> = {
  measured: "text-dune-teal border-dune-teal/40",
  literature: "text-dune-orange border-dune-orange/40",
  fitted: "text-muted-foreground border-border",
  unsourced: "text-dune-rose border-dune-rose/40",
};

const LABEL: Record<EvidenceGrade, string> = {
  measured: "measured",
  literature: "literature",
  fitted: "fitted to ERA5",
  unsourced: "unsourced",
};

/** Map the strings the verify scripts write into the four grades above. */
export function gradeFromScript(s: string): EvidenceGrade {
  if (s === "measured") return "measured";
  if (s === "literature") return "literature";
  if (s === "unsourced") return "unsourced";
  return "fitted";
}

export default function Grade({ grade }: { grade: EvidenceGrade }) {
  return (
    <span className={`caption rounded-[4px] border px-2 py-1 ${TONE[grade]}`}>
      {LABEL[grade]}
    </span>
  );
}
