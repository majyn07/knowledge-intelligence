export type ProjectStatus = "active" | "inactive" | "archived";

export interface Project {
  id: string;
  name: string;
  client: string;
  description: string;
  status: ProjectStatus;

  product: string;
  module: string;
  goal: string;
  owner: string;

  createdAt: Date;
  updatedAt: Date;
}

export const projectStatusLabel: Record<ProjectStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  archived: "Arquivado",
};
