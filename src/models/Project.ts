export type ProjectStatus = "active" | "inactive" | "archived";

import type { Trashable } from "./Trash";

export interface Project extends Trashable {
  id: string;
  name: string;
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
