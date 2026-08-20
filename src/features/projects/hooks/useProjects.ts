"use client";

import { useCallback, useMemo } from "react";

import { toast } from "sonner";

import { useSharedCollection } from "@/hooks/useSharedCollection";
import { fromProject, toProject } from "@/lib/supabase/domainRows";
import type { Project } from "@/models/Project";

import { parseProjects } from "../normalizeProject";
import { projectService } from "../services/ProjectService";
import type { ProjectFormData } from "../types/ProjectFormData";
import { STORAGE_KEYS } from "@/lib/storage";

const STORAGE_KEY = STORAGE_KEYS.projects;

/**
 * Projetos, do servidor quando há e do navegador quando não há.
 *
 * Antes o estado era carregado pelo `projectService`, que escrevia direto no
 * `localStorage` a cada operação. Agora quem persiste é a coleção
 * compartilhada, e o serviço volta a fazer só o que o nome dele diz: construir
 * e atualizar o registro. Persistência não era responsabilidade dele.
 */
export function useProjects() {
  const [projects, setProjects, isHydrated] = useSharedCollection<Project>({
    key: STORAGE_KEY,
    table: "projects",
    fallback: projectService.getSeed(),
    parseLocal: parseProjects,
    fromRows: (rows) => rows.map(toProject),
    toRow: fromProject,
    identify: (project) => project.id,
  });

  const createProject = useCallback(
    (data: ProjectFormData): Project => {
      const project = projectService.build(data);

      setProjects((current) => [project, ...current]);
      toast.success("Projeto criado com sucesso.");

      return project;
    },
    [setProjects]
  );

  const updateProject = useCallback(
    (id: string, data: ProjectFormData): Project | undefined => {
      const project = projects.find((current) => current.id === id);
      if (!project) return undefined;

      const updated = projectService.apply(project, data);

      setProjects((current) => current.map((item) => (item.id === id ? updated : item)));
      toast.success("Projeto atualizado com sucesso.");

      return updated;
    },
    [projects, setProjects]
  );

  const deleteProject = useCallback(
    (id: string): boolean => {
      if (!projects.some((project) => project.id === id)) return false;

      setProjects((current) => current.filter((project) => project.id !== id));
      toast.success("Projeto excluído com sucesso.");

      return true;
    },
    [projects, setProjects]
  );

  return {
    projects,
    isHydrated,
    totalProjects: useMemo(() => projects.length, [projects]),
    createProject,
    updateProject,
    deleteProject,
  };
}
