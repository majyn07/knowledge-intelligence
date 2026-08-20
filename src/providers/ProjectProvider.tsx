"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useActivity } from "@/features/activities/providers/ActivityProvider";
import { useProjects } from "@/features/projects/hooks/useProjects";
import { readRaw, remove, writeRaw } from "@/lib/storage";
import type { ProjectFormData } from "@/features/projects/types/ProjectFormData";
import type { Project } from "@/models/Project";

const STORAGE_KEY = "visus-active-project-id";

interface ProjectContextValue {
  projects: Project[];
  activeProject: Project | null;
  activeProjectId: string | null;
  /** Falso até o estado guardado ser lido, após a montagem. */
  isHydrated: boolean;
  selectProject: (id: string) => void;
  createProject: (data: ProjectFormData) => Project;
  updateProject: (id: string, data: ProjectFormData) => Project | undefined;
  deleteProject: (id: string) => boolean;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { record } = useActivity();
  const { projects, isHydrated, createProject, updateProject, deleteProject } = useProjects();
  // Parte da base canônica: mesmo valor no servidor e no primeiro render.
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => projects[0]?.id ?? null);
  const restoredSelection = useRef(false);

  useEffect(() => {
    if (!isHydrated || restoredSelection.current) return;
    restoredSelection.current = true;

    const storedId = readRaw(STORAGE_KEY);
    if (storedId && projects.some((project) => project.id === storedId)) {
      setActiveProjectId(storedId);
    }
  }, [isHydrated, projects]);

  useEffect(() => {
    if (!isHydrated || !restoredSelection.current) return;
    setActiveProjectId((currentId) => currentId && projects.some((project) => project.id === currentId) ? currentId : projects[0]?.id ?? null);
  }, [isHydrated, projects]);

  useEffect(() => {
    if (!isHydrated || !restoredSelection.current) return;
    if (activeProjectId) writeRaw(STORAGE_KEY, activeProjectId);
    else remove(STORAGE_KEY);
  }, [activeProjectId, isHydrated]);

  const selectProject = useCallback((id: string) => {
    if (projects.some((project) => project.id === id)) setActiveProjectId(id);
  }, [projects]);

  const handleDeleteProject = useCallback((id: string) => {
    const deleted = deleteProject(id);
    if (deleted && activeProjectId === id) {
      setActiveProjectId(projects.find((project) => project.id !== id)?.id ?? null);
    }
    return deleted;
  }, [activeProjectId, deleteProject, projects]);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [activeProjectId, projects]
  );

  const handleCreateProject = useCallback((data: ProjectFormData) => {
    const project = createProject(data);
    record({
      type: "project_created",
      projectId: project.id,
      actor: project.owner,
      subject: { kind: "project", id: project.id, label: project.name },
      detail: "Projeto criado.",
    });
    return project;
  }, [createProject, record]);

  const handleUpdateProject = useCallback((id: string, data: ProjectFormData) => {
    const project = updateProject(id, data);
    if (project) {
      record({
        type: "project_updated",
        projectId: project.id,
        actor: project.owner,
        subject: { kind: "project", id: project.id, label: project.name },
        detail: "Identidade, contexto ou objetivo atualizados.",
      });
    }
    return project;
  }, [record, updateProject]);

  const value = useMemo(() => ({
    projects, activeProject, activeProjectId, isHydrated, selectProject,
    createProject: handleCreateProject, updateProject: handleUpdateProject, deleteProject: handleDeleteProject,
  }), [activeProject, activeProjectId, handleCreateProject, handleDeleteProject, handleUpdateProject, isHydrated, projects, selectProject]);

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) throw new Error("useProject deve ser utilizado dentro de ProjectProvider.");
  return context;
}
