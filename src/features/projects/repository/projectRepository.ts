import type { Project } from "@/models/Project";

import { projects as projectMocks } from "../mock/projects";

const STORAGE_KEY = "visus-projects";

function cloneProject(project: Project): Project {
  return {
    ...project,
    createdAt: new Date(project.createdAt),
    updatedAt: new Date(project.updatedAt),
  };
}

function getMockProjects(): Project[] {
  return projectMocks.map(cloneProject);
}

function loadProjects(): Project[] {
  if (typeof window === "undefined") {
    return getMockProjects();
  }

  const storedProjects = localStorage.getItem(STORAGE_KEY);
  if (!storedProjects) {
    return getMockProjects();
  }

  try {
    return (JSON.parse(storedProjects) as Project[]).map(cloneProject);
  } catch {
    return getMockProjects();
  }
}

function persist(projects: Project[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }
}

/** Local data boundary, ready to be replaced by a future remote repository. */
export const projectRepository = {
  getAll(): Project[] {
    return loadProjects();
  },

  create(project: Project): Project {
    const projects = [project, ...loadProjects()];
    persist(projects);
    return project;
  },

  update(project: Project): Project {
    const projects = loadProjects().map((current) =>
      current.id === project.id ? project : current
    );
    persist(projects);
    return project;
  },

  delete(id: string): void {
    persist(loadProjects().filter((project) => project.id !== id));
  },
};
