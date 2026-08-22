import type { Project } from "@/models/Project";

import { getSeedProjects } from "../repository/projectRepository";

import type { ProjectFormData } from "../types/ProjectFormData";

function normalize(data: ProjectFormData) {
  return {
    name: data.name.trim(),
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
    return getSeedProjects();
  },

  /**
   * Constrói o registro. Não persiste: quem grava é a coleção compartilhada,
   * que sabe se o destino é o banco ou o navegador. Antes disto o serviço
   * escrevia direto no `localStorage`, o que o prendia a uma fonte só.
   */
  build(data: ProjectFormData): Project {
    const now = new Date();

    return {
      id: crypto.randomUUID(),
      ...normalize(data),
      createdAt: now,
      updatedAt: now,
    };
  },

  apply(project: Project, data: ProjectFormData): Project {
    return {
      ...project,
      ...normalize(data),
      updatedAt: new Date(),
    };
  },

  toFormData(project: Project): ProjectFormData {
    return {
      name: project.name,
      description: project.description,
      status: project.status,
      product: project.product,
      module: project.module,
      goal: project.goal,
      owner: project.owner,
    };
  },
};
