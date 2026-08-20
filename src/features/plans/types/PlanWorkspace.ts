export type PlanStatus = "analysis" | "development" | "review" | "approved" | "published";
export type PlanPriority = "high" | "medium" | "normal";

export interface PlanTask {
  id: string;
  label: string;
  completed: boolean;
  owner: string;
}

export interface PlanComment {
  id: string;
  author: string;
  message: string;
  date: string;
}

export interface PlanDocument {
  executiveSummary: string;
  context: string;
  problem: string;
  diagnosis: string;
  evidence: string[];
  decisions: string[];
  proposal: string;
  acceptanceCriteria: string[];
  notes: string;
  references: string[];
}

/** References the decision that originated the plan without copying the analysis. */
export interface PlanSource {
  projectId: string;
  ticketId: string;
  analysisId: string;
  opportunityId: string;
  articleId?: string;
  analysisLabel: string;
  opportunityTitle: string;
}

export interface PlanWorkspaceItem {
  id: string;
  title: string;
  projectName: string;
  projectId: string;
  status: PlanStatus;
  priority: PlanPriority;
  owner: string;
  createdAt: string;
  updatedAt: string;
  source: PlanSource;
  document: PlanDocument;
  tasks: PlanTask[];
  comments: PlanComment[];
}

export const planStatusLabel: Record<PlanStatus, string> = {
  analysis: "Em análise",
  development: "Em desenvolvimento",
  review: "Em revisão",
  approved: "Aprovado",
  published: "Publicado",
};

export const planPriorityLabel: Record<PlanPriority, string> = {
  high: "Alta prioridade",
  medium: "Prioridade média",
  normal: "Prioridade normal",
};

/**
 * Estágios de execução do plano. Como no artigo, o caminho de volta existe:
 * uma revisão reprovada devolve o trabalho ao desenvolvimento.
 */
export const allowedPlanTransitions: Record<PlanStatus, PlanStatus[]> = {
  analysis: ["development"],
  development: ["review", "analysis"],
  review: ["approved", "development"],
  approved: ["published", "review"],
  published: ["approved"],
};

export function canTransitionPlan(current: PlanStatus, next: PlanStatus) {
  return current === next || allowedPlanTransitions[current].includes(next);
}
