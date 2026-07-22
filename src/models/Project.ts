export type ProjectStatus =
  | "active"
  | "inactive"
  | "archived";

export interface Project {
  id: string;

  name: string;
  client: string;
  description: string;

  status: ProjectStatus;

  createdAt: Date;
  updatedAt: Date;
}