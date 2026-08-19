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

  ticketCount: number;
  analysisCount: number;
  planCount: number;
  articleCount: number;

  createdAt: Date;
  updatedAt: Date;
}