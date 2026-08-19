import type { Project } from "@/models/Project";

import { projects as projectMocks } from "../mock/projects";

const STORAGE_KEY = "visus-projects";

/** Nomes curtos usados antes de o produto virar uma lista controlada. */
const LEGACY_PRODUCTS: Record<string, string> = {
  Visus: "AltoQi Visus",
  Builder: "AltoQi Builder",
  Eberick: "AltoQi Eberick",
};

function cloneProject(project: Project): Project {
  return {
    ...project,
    product: LEGACY_PRODUCTS[project.product] ?? project.product,
    createdAt: new Date(project.createdAt),
    updatedAt: new Date(project.updatedAt),
  };
}

function getSeedProjects(): Project[] {
  return projectMocks.map(cloneProject);
}

function loadProjects(): Project[] {
  if (typeof window === "undefined") {
    return getSeedProjects();
  }

  const storedProjects = localStorage.getItem(STORAGE_KEY);
  if (!storedProjects) {
    return getSeedProjects();
  }

  try {
    return (JSON.parse(storedProjects) as Project[]).map(cloneProject);
  } catch {
    return getSeedProjects();
  }
}

function persist(projects: Project[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }
}

/** Local data boundary, ready to be replaced by a future remote repository. */
export const projectRepository = {
  /**
   * Conjunto canônico, idêntico no servidor e no primeiro render do cliente.
   * Serve de base estável para a hidratação.
   */
  getSeed(): Project[] {
    return getSeedProjects();
  },

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
