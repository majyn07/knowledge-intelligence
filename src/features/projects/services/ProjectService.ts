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
      client: "",
      description: data.description.trim(),
      status: "active",
      product: "",
      module: "",
      goal: "",
      owner: "",
      ticketCount: 0,
      analysisCount: 0,
      planCount: 0,
      articleCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    return projectRepository.create(project);
  },

  update(project: Project, data: ProjectFormData): Project {
    return projectRepository.update({
      ...project,
      name: data.name.trim(),
      description: data.description.trim(),
      updatedAt: new Date(),
    });
  },

  delete(id: string): void {
    projectRepository.delete(id);
  },
};
