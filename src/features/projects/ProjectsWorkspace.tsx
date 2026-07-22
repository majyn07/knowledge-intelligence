"use client";

import { useEffect, useMemo, useState } from "react";

import { ProjectEditor } from "./components/ProjectEditor";
import { ProjectViewer } from "./components/ProjectViewer";
import { projectService } from "./services/projectService";

import type { Project } from "@/models/Project";

import { useApp } from "@/providers/AppProvider";

export function ProjectsWorkspace() {
  const {
    currentProjectId,
    setCurrentProjectId,
  } = useApp();

  const [refreshKey, setRefreshKey] = useState(0);

  const [editingProjectId, setEditingProjectId] =
    useState<string | null>(null);

  const [creatingProject, setCreatingProject] =
    useState(false);

  const projectList = useMemo(
    () => projectService.getProjects(),
    [refreshKey]
  );

  useEffect(() => {
    if (
      !currentProjectId &&
      projectList.length > 0
    ) {
      setCurrentProjectId(projectList[0].id);
    }
  }, [
    currentProjectId,
    projectList,
    setCurrentProjectId,
  ]);

  const editingProject = useMemo(
    () =>
      projectList.find(
        (project) =>
          project.id === editingProjectId
      ) ?? null,
    [editingProjectId, projectList]
  );

  function handleDeleteProject(id: string) {
    projectService.deleteProject(id);

    if (currentProjectId === id) {
      setCurrentProjectId("");
    }

    setRefreshKey((value) => value + 1);
  }

  const newProject: Project = {
    id: crypto.randomUUID(),
    name: "",
    client: "",
    description: "",
    createdAt: new Date().toLocaleDateString(
      "pt-BR"
    ),
    status: "active",
  };

  if (projectList.length === 0 && !creatingProject) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Nenhum projeto cadastrado.
        </p>

        <button
          onClick={() =>
            setCreatingProject(true)
          }
          className="mt-6 rounded-lg border px-4 py-2"
        >
          Novo projeto
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold">
            Projetos
          </h1>

          <p className="mt-2 text-muted-foreground">
            Gerencie os projetos de evolução da Base de Conhecimento.
          </p>
        </div>

        <button
          onClick={() =>
            setCreatingProject(true)
          }
          className="rounded-lg border px-4 py-2"
        >
          Novo projeto
        </button>
      </div>

      <div className="grid gap-4">
        {projectList.map((project) => (
          <ProjectViewer
            key={project.id}
            project={project}
            selected={
              project.id === currentProjectId
            }
            onSelect={() =>
              setCurrentProjectId(project.id)
            }
            onEdit={() =>
              setEditingProjectId(project.id)
            }
            onDelete={() =>
              handleDeleteProject(project.id)
            }
          />
        ))}
      </div>

      {editingProject && (
        <ProjectEditor
          project={editingProject}
          onSave={(project) => {
            projectService.updateProject(project);

            setRefreshKey(
              (value) => value + 1
            );

            setEditingProjectId(null);
          }}
          onCancel={() =>
            setEditingProjectId(null)
          }
        />
      )}

      {creatingProject && (
        <ProjectEditor
          project={newProject}
          onSave={(project) => {
            projectService.createProject(
              project
            );

            setRefreshKey(
              (value) => value + 1
            );

            setCurrentProjectId(project.id);

            setCreatingProject(false);
          }}
          onCancel={() =>
            setCreatingProject(false)
          }
        />
      )}
    </div>
  );
}