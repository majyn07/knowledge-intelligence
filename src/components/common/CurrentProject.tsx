"use client";

import {
  Building2,
  FolderKanban,
  CalendarDays,
} from "lucide-react";

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
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Projeto Atual
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            {project.name}
          </h2>

          <div className="mt-4 flex flex-wrap gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>{project.client}</span>
            </div>

            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4" />
              <span>Projeto ativo</span>
            </div>

            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              <span>Última atualização hoje</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}