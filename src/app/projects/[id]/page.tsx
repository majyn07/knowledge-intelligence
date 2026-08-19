"use client";

import { use } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { ProjectWorkspace } from "@/features/projects/ProjectWorkspace";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <AppShell>
      <ProjectWorkspace projectId={id} />
    </AppShell>
  );
}
