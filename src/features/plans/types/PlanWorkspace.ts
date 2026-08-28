export type PlanStatus = "analysis" | "development" | "review" | "approved" | "published";
export type PlanPriority = "high" | "medium" | "normal";

export interface PlanTask {
  id: string;
  label: string;
  completed: boolean;
  owner: string;
  /** Prazo em ISO. Ausente é ausente: a tarefa simplesmente não tem data. */
  dueDate?: string;
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

import type { Trashable } from "@/models/Trash";

export interface PlanWorkspaceItem extends Trashable {
  id: string;
  title: string;
  projectName: string;
  projectId: string;
  status: PlanStatus;
  priority: PlanPriority;
  owner: string;

  /**
   * Prazo do plano, em ISO.
   *
   * Separado do prazo das tarefas de propósito: o plano vence quando o
   * trabalho precisa estar entregue, e as tarefas dentro dele têm o próprio
   * ritmo. Amarrar um ao outro obrigaria a inventar datas para as tarefas.
   */
  dueDate?: string;

  /**
   * Criado e atualizado, em ISO.
   *
   * Eram texto de exibição, "15 jul. 2026", "Ontem, 16:20": o que impedia
   * ordenar, comparar e calcular atraso. Registros anteriores continuam com o
   * texto original: a tela mostra o que tem, e o cálculo simplesmente não
   * acontece para eles, porque converter exigiria inventar o instante.
   */
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
