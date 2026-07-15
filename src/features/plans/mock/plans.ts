export interface Recommendation {
  id: string;
  solution: string;
  type: "create" | "update" | "review" | "merge";
  article: string;
  justification: string;
}

export interface ImprovementPlan {
  id: string;
  projectId: string;
  title: string;
  generatedAt: string;
  recommendations: Recommendation[];
}

export const plans: ImprovementPlan[] = [
  {
    id: "plan-001",
    projectId: "project-001",
    title: "Plano de Melhoria - Alpha Engenharia",
    generatedAt: "15/07/2026",
    recommendations: [],
  },
];