import { Suspense } from "react";
import ModelView from "@/src/components/pages/ModelView";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ModelView />
    </Suspense>
  );
}
