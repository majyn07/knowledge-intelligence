import type { Project } from "@/models/Project";

import { projectRepository } from "../repository/projectRepository";
import type { ProjectFormData } from "../types/ProjectFormData";

export const projectService = {
  getAll(): Project[] {
    return projectRepository.getAll();
  },

  create(data: ProjectFormData): Project {
    const now = new Date();
    const project: Project = {
      id: crypto.randomUUID(),
      name: data.name.trim(),
      client: data.client.trim(),
      description: data.description.trim(),
      status: data.status,
      product: "",
      module: "",
      goal: "",
      owner: "",
      createdAt: now,
      updatedAt: now,
    };

    return projectRepository.create(project);
  },

  update(project: Project, data: ProjectFormData): Project {
    return projectRepository.update({
      ...project,
      name: data.name.trim(),
      client: data.client.trim(),
      description: data.description.trim(),
      status: data.status,
      updatedAt: new Date(),
    });
  },

  delete(id: string): void {
    projectRepository.delete(id);
  },
};
