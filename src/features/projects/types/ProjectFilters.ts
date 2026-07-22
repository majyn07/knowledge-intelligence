import type { ProjectStatus } from "@/models/Project";

export interface ProjectFilters {
  search: string;
  status: ProjectStatus | "all";
}