"use client";

import { useCallback, useMemo, useState } from "react";

import type { Project } from "@/models/Project";
import type { ProjectFormData } from "@/features/projects/types/ProjectFormData";

import { ProjectService } from "@/features/projects/services/ProjectService";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>(
    () => ProjectService.getAll()
  );

  const createProject = useCallback(
    (data: ProjectFormData) => {
      const newProject = ProjectService.create(data);

      setProjects((previous) => [
        newProject,
        ...previous,
      ]);
    },
    []
  );

  const updateProject = useCallback(
    (id: string, data: ProjectFormData) => {
      setProjects((previous) =>
        previous.map((project) =>
          project.id === id
            ? ProjectService.update(project, data)
            : project
        )
      );
    },
    []
  );

  const deleteProject = useCallback(
    (id: string) => {
      setProjects((previous) =>
        previous.filter(
          (project) => project.id !== id
        )
      );
    },
    []
  );

  const totalProjects = useMemo(
    () => projects.length,
    [projects]
  );

  return {
    projects,
    totalProjects,
    createProject,
    updateProject,
    deleteProject,
  };
}