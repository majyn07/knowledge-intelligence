import type { Project } from "@/models/Project";
import type { ProjectFormData } from "@/features/projects/types/ProjectFormData";

import { projects } from "@/features/projects/mock/projects";

export const ProjectService = {
  getAll(): Project[] {
    return projects;
  },

  getById(id: string): Project | undefined {
    return projects.find(
      (project) => project.id === id
    );
  },

  create(data: ProjectFormData): Project {
    const now = new Date();

    return {
      id: crypto.randomUUID(),
      name: data.name.trim(),
      client: "",
      description: data.description.trim(),
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
  },

  update(
    project: Project,
    data: ProjectFormData
  ): Project {
    return {
      ...project,
      name: data.name.trim(),
      description: data.description.trim(),
      updatedAt: new Date(),
    };
  },

  delete(): void {
    throw new Error("Not implemented");
  },
};