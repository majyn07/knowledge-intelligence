import type { Project } from "@/models/Project";

import { projectRepository } from "../repository/projectRepository";
import type { ProjectFormData } from "../types/ProjectFormData";

function normalize(data: ProjectFormData) {
  return {
    name: data.name.trim(),
    client: data.client.trim(),
    description: data.description.trim(),
    status: data.status,
    product: data.product.trim(),
    module: data.module.trim(),
    goal: data.goal.trim(),
    owner: data.owner.trim(),
  };
}

export const projectService = {
  /** Base canônica usada no render inicial, antes da hidratação. */
  getSeed(): Project[] {
    return projectRepository.getSeed();
  },

  getAll(): Project[] {
    return projectRepository.getAll();
  },

  create(data: ProjectFormData): Project {
    const now = new Date();
    const project: Project = {
      id: crypto.randomUUID(),
      ...normalize(data),
      createdAt: now,
      updatedAt: now,
    };

    return projectRepository.create(project);
  },

  update(project: Project, data: ProjectFormData): Project {
    return projectRepository.update({
      ...project,
      ...normalize(data),
      updatedAt: new Date(),
    });
  },

  delete(id: string): void {
    projectRepository.delete(id);
  },

  toFormData(project: Project): ProjectFormData {
    return {
      name: project.name,
      client: project.client,
      description: project.description,
      status: project.status,
      product: project.product,
      module: project.module,
      goal: project.goal,
      owner: project.owner,
    };
  },
};
