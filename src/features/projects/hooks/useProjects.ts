"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { toast } from "sonner";

import type { Project } from "@/models/Project";
import type { ProjectFormData } from "@/features/projects/types/ProjectFormData";

import { ProjectService } from "@/features/projects/services/ProjectService";

const STORAGE_KEY = "visus-projects";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>(
    ProjectService.getAll()
  );

  useEffect(() => {
    const storedProjects =
      localStorage.getItem(STORAGE_KEY);

    if (!storedProjects) {
      return;
    }

    try {
      const parsedProjects = JSON.parse(
        storedProjects
      ) as Project[];

      setProjects(
        parsedProjects.map((project) => ({
          ...project,
          createdAt: new Date(project.createdAt),
          updatedAt: new Date(project.updatedAt),
        }))
      );
    } catch {
      console.error(
        "Erro ao carregar projetos do localStorage."
      );
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(projects)
    );
  }, [projects]);

  const createProject = useCallback(
    (data: ProjectFormData) => {
      const newProject = ProjectService.create(data);

      setProjects((previous) => [
        newProject,
        ...previous,
      ]);

      toast.success("Projeto criado com sucesso.");
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

      toast.success("Projeto atualizado com sucesso.");
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

      toast.success("Projeto excluído com sucesso.");
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