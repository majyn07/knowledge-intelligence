"use client";

import { FolderKanban } from "lucide-react";

import { projects } from "@/features/projects/mock/projects";
import { useApp } from "@/providers/AppProvider";

export function CurrentProject() {
  const { currentProjectId } = useApp();

  const project = projects.find(
    (item) => item.id === currentProjectId
  );

  if (!project) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="text-muted-foreground">Projeto atual</span>

      <span className="flex items-center gap-2 font-medium text-foreground">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
          <FolderKanban className="h-3.5 w-3.5" />
        </span>
        {project.name}
      </span>

      <span className="hidden text-muted-foreground sm:inline">
        / {project.client}
      </span>
    </div>
  );
}
