import type { Metadata } from "next";
import ModelsIndexView from "@/src/components/pages/ModelsIndexView";
import { PROJECT_META_DESCRIPTION } from "@/content/copy";

export const metadata: Metadata = {
  title: "Models · Dunelock",
  description: PROJECT_META_DESCRIPTION,
};

export default function ModelsPage() {
  return <ModelsIndexView />;
}
