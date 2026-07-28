import { AppShell } from "@/components/layout/AppShell";
import { AnalysisWorkspace } from "@/features/analysis/AnalysisWorkspace";

export default function AnalysisPage() {
  return (
    <AppShell>
      <AnalysisWorkspace />
    </AppShell>
  );
}
