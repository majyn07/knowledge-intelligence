"use client";

import { useEffect } from "react";

import { projects } from "./mock/projects";

import { useApp } from "@/providers/AppProvider";

export function ProjectsWorkspace() {
  const {
    currentProjectId,
    setCurrentProjectId,
  } = useApp();

  useEffect(() => {
    if (!currentProjectId && projects.length > 0) {
      setCurrentProjectId(projects[0].id);
    }
  }, [
    currentProjectId,
    setCurrentProjectId,
  ]);

  return (
    <div className="space-y-6">

      <div>

        <h1 className="text-3xl font-semibold">
          Projetos
        </h1>

        <p className="mt-2 text-muted-foreground">
          Gerencie os projetos de evolução da Base de Conhecimento.
        </p>

      </div>

      <div className="grid gap-4">

        {projects.map((project) => {

          const selected =
            project.id === currentProjectId;

          return (

            <button
              key={project.id}
              onClick={() => setCurrentProjectId(project.id)}
              className={`rounded-xl border p-6 text-left transition-colors ${
                selected
                  ? "border-primary bg-muted"
                  : "bg-card hover:bg-muted/40"
              }`}
            >

              <div className="flex items-start justify-between">

                <div>

                  <h2 className="text-xl font-semibold">
                    {project.name}
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {project.client}
                  </p>

                </div>

                <span className="rounded-md border px-3 py-1 text-xs">
                  {project.status === "active"
                    ? "Em andamento"
                    : "Arquivado"}
                </span>

              </div>

              <p className="mt-6 text-sm text-muted-foreground">
                {project.description}
              </p>

              <div className="mt-6 border-t pt-4 text-sm">

                <p>
                  <strong>Criado em:</strong> {project.createdAt}
                </p>

              </div>

            </button>

          );

        })}

      </div>

    </div>
  );
}