import { AppShell } from "@/components/layout/AppShell";
import { AnalysisWorkspace } from "@/features/analysis/AnalysisWorkspace";
import { PlansProvider } from "@/features/plans/providers/PlansProvider";

export default function AnalysisPage() {
  return (
    <PlansProvider>
      <AppShell>
        <AnalysisWorkspace />
      </AppShell>
    </PlansProvider>
  );
}