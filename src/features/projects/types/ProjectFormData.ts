import type { ProjectStatus } from "@/models/Project";

export interface ProjectFormData {
  name: string;
  description: string;
  status: ProjectStatus;

  product: string;
  module: string;
  goal: string;
  owner: string;
}
