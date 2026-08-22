import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import { SurveyWorkspace } from "@/features/survey/SurveyWorkspace";

export const metadata: Metadata = {
  title: "Levantamento",
};

export default function SurveyPage() {
  return (
    <AppShell>
      <SurveyWorkspace />
    </AppShell>
  );
}
