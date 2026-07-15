import { AppShell } from "@/components/layout/AppShell";
import { AnalysisWorkspace } from "@/features/analysis/AnalysisWorkspace";

export default function Home() {
  return (
    <AppShell>
      <AnalysisWorkspace />
    </AppShell>
  );
}