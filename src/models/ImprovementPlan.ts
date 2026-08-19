import type { Recommendation } from "./Recommendation";

export interface ImprovementPlan {
  id: string;
  projectId: string;
  ticketId: string;
  analysisId: string;
  opportunityId: string;
  title: string;
  generatedAt: string;
  recommendations: Recommendation[];
}
