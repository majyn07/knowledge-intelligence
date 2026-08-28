"use client";

import { useCallback, useMemo } from "react";

import { toast } from "sonner";

import { trashToast } from "@/components/common/trashToast";

import { useSharedCollection } from "@/hooks/useSharedCollection";
import { fromProject, toProject } from "@/lib/supabase/domainRows";
import type { Project } from "@/models/Project";
import { alive, trashed } from "@/models/Trash";

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
  const [all, setProjects, isHydrated] = useSharedCollection<Project>({
    key: STORAGE_KEY,
    table: "projects",
    fallback: projectService.getSeed(),
    parseLocal: parseProjects,
    fromRows: (rows) => rows.map(toProject),
    toRow: fromProject,
    identify: (project) => project.id,
  });

  /*
    A coleção guarda vivos e excluídos juntos; as telas só querem os vivos.
    Separar aqui, e não em cada tela, é o que impede um registro na lixeira de
    reaparecer numa listagem que alguém esqueceu de filtrar.
  */
  const projects = useMemo(() => alive(all), [all]);
  const deletedProjects = useMemo(() => trashed(all), [all]);

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

  const restoreProject = useCallback(
    (id: string) => {
      setProjects((current) =>
        current.map((project) =>
          project.id === id ? { ...project, deletedAt: "" } : project
        )
      );
    },
    [setProjects]
  );

  /**
   * Excluir manda para a lixeira.
   *
   * O registro sai da vista e continua existindo. Com dado compartilhado quem
   * apaga apaga para catorze pessoas, e o diálogo de confirmação era a única
   * barreira, que quem clica rápido não lê.
   */
  const deleteProject = useCallback(
    (id: string): boolean => {
      if (!projects.some((project) => project.id === id)) return false;

      const at = new Date().toISOString();
      setProjects((current) =>
        current.map((project) => (project.id === id ? { ...project, deletedAt: at } : project))
      );

      trashToast({
        label: "Projeto",
        subject: projects.find((project) => project.id === id)?.name ?? "",
        onUndo: () => restoreProject(id),
      });

      return true;
    },
    [projects, restoreProject, setProjects]
  );

  /** Sai do banco de vez. Só a lixeira chama, e ela avisa antes. */
  const purgeProject = useCallback(
    (id: string) => {
      setProjects((current) => current.filter((project) => project.id !== id));
    },
    [setProjects]
  );

  return {
    projects,
    deletedProjects,
    isHydrated,
    totalProjects: useMemo(() => projects.length, [projects]),
    createProject,
    updateProject,
    deleteProject,
    restoreProject,
    purgeProject,
  };
}
