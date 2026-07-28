import { AppShell } from "@/components/layout/AppShell";
import { PlansWorkspace } from "@/features/plans/PlansWorkspace";
import { PlansProvider } from "@/features/plans/providers/PlansProvider";

export default function ImprovementPlanPage() {
  return (
    <PlansProvider>
      <AppShell>
        <PlansWorkspace />
      </AppShell>
    </PlansProvider>
  );
}