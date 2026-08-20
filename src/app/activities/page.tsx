import { AppShell } from "@/components/layout/AppShell";
import { ActivitiesWorkspace } from "@/features/activities/ActivitiesWorkspace";

export default function ActivitiesPage() {
  return (
    <AppShell>
      <ActivitiesWorkspace />
    </AppShell>
  );
}
