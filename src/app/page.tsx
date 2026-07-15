import { AppShell } from "@/components/layout/AppShell";
import { DashboardPage } from "@/features/dashboard/DashboardPage";

export default function Home() {
  return (
    <AppShell>
      <DashboardPage />
    </AppShell>
  );
}