"use client";

import { projects } from "@/features/projects/mock/projects";
import { useApp } from "@/providers/AppProvider";

export function CurrentProject() {
  const { currentProjectId } = useApp();

  const project = projects.find(
    (project) => project.id === currentProjectId
  );

  if (!project) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-card px-4 py-3">

      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        Projeto Atual
      </p>

      <p className="mt-1 font-semibold">
        {project.name}
      </p>

      <p className="text-sm text-muted-foreground">
        {project.client}
      </p>

    </div>
  );
}