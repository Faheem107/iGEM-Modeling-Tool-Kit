import { Suspense } from "react";
import ExposureView from "@/src/components/pages/ExposureView";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ExposureView />
    </Suspense>
  );
}
