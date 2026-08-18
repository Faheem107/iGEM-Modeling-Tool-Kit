import type { Metadata } from "next";
import ModelsIndexView from "@/src/components/pages/ModelsIndexView";

export const metadata: Metadata = {
  title: "Models · Dunelock",
  description:
    "Every simulation in the Dunelock toolkit, from metabolic flux to aeolian erosion and deployment cost.",
};

export default function ModelsPage() {
  return <ModelsIndexView />;
}
