"use client";

import { useCallback, useMemo, useState } from "react";

import { toast } from "sonner";

import type { Project } from "@/models/Project";

import { projectService } from "../services/ProjectService";
import type { ProjectFormData } from "../types/ProjectFormData";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>(() => projectService.getAll());

  const createProject = useCallback((data: ProjectFormData): Project => {
    const project = projectService.create(data);
    setProjects((current) => [project, ...current]);
    toast.success("Projeto criado com sucesso.");
    return project;
  }, []);

  const updateProject = useCallback((id: string, data: ProjectFormData): Project | undefined => {
    const project = projects.find((current) => current.id === id);
    if (!project) return undefined;

    const updatedProject = projectService.update(project, data);
    setProjects((current) => current.map((item) => item.id === id ? updatedProject : item));
    toast.success("Projeto atualizado com sucesso.");
    return updatedProject;
  }, [projects]);

  const deleteProject = useCallback((id: string): boolean => {
    if (!projects.some((project) => project.id === id)) return false;

    projectService.delete(id);
    setProjects((current) => current.filter((project) => project.id !== id));
    toast.success("Projeto excluído com sucesso.");
    return true;
  }, [projects]);

  return {
    projects,
    totalProjects: useMemo(() => projects.length, [projects]),
    createProject,
    updateProject,
    deleteProject,
  };
}
