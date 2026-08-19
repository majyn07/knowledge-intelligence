import type { ProjectStatus } from "@/models/Project";

export interface ProjectFormData {
  name: string;
  client: string;
  description: string;
  status: ProjectStatus;
}
