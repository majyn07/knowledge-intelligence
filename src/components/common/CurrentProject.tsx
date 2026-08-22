"use client";

import { FolderKanban } from "lucide-react";

import { useProject } from "@/providers/ProjectProvider";

export function CurrentProject() {
  const { activeProject: project } = useProject();

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

    </div>
  );
}
