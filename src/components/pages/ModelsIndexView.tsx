"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ModelIndex from "@/src/components/landing/ModelIndex";
import ProngModal, { type ProngTarget } from "@/src/components/ProngModal";

/** The model index on its own URL, so the list of models is linkable. */
export default function ModelsIndexView() {
  const router = useRouter();
  const [viewing, setViewing] = useState<ProngTarget | null>(null);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-32 pt-32 sm:px-8">
      <ModelIndex heading="Every model" onView={(t) => setViewing(t)} />

      <ProngModal
        viewing={viewing}
        onClose={() => setViewing(null)}
        onOpenModel={(target) => {
          setViewing(null);
          router.push(
            target === "killswitch"
              ? "/model?view=killswitch"
              : `/model?prongs=${target}`,
          );
        }}
      />
    </div>
  );
}
