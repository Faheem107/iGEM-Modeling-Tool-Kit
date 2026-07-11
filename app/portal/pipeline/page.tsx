import { Suspense } from "react";
import PipelineView from "@/src/components/pages/PipelineView";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PipelineView />
    </Suspense>
  );
}
