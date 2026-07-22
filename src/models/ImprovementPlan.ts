import type { Recommendation } from "./Recommendation";

export interface ImprovementPlan {
  id: string;
  projectId: string;
  title: string;
  generatedAt: string;
  recommendations: Recommendation[];
}