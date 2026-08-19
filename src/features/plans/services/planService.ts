import type { AnalysisRecord } from "@/models/KnowledgeLifecycle";
import type { KnowledgeOpportunity } from "@/features/analysis/types/KnowledgeOpportunity";

import type { PlanWorkspaceItem } from "../types/PlanWorkspace";

export interface CreatePlanFromOpportunityInput {
  projectName: string;
  analysis: AnalysisRecord;
  opportunity: KnowledgeOpportunity;
}

function nowLabel() {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
}

/** Creates the execution shell from an approved decision, retaining only origin references. */
export const planService = {
  createFromApprovedOpportunity({
    projectName,
    analysis,
    opportunity,
  }: CreatePlanFromOpportunityInput): PlanWorkspaceItem {
    if (opportunity.status !== "approved") {
      throw new Error("Apenas oportunidades aprovadas podem originar um plano.");
    }

    const createdAt = nowLabel();

    return {
      id: crypto.randomUUID(),
      title: opportunity.title,
      projectId: analysis.projectId,
      projectName,
      status: "analysis",
      priority: "normal",
      owner: "A definir",
      createdAt,
      updatedAt: createdAt,
      source: {
        projectId: analysis.projectId,
        ticketId: analysis.ticketId,
        analysisId: analysis.id,
        opportunityId: opportunity.id,
        analysisLabel: `Análise ${analysis.id.slice(0, 8)}`,
        opportunityTitle: opportunity.title,
      },
      document: {
        executiveSummary: opportunity.description,
        context: "Plano criado a partir de uma oportunidade aprovada na revisão humana.",
        problem: "Detalhes disponíveis na análise de origem vinculada a este plano.",
        diagnosis: "A oportunidade foi aprovada para execução.",
        evidence: [opportunity.justification],
        decisions: ["Oportunidade aprovada pela revisão humana."],
        proposal: opportunity.description,
        acceptanceCriteria: ["Definir critérios de aceite antes da publicação."],
        notes: "",
        references: [
          `Projeto ${analysis.projectId}`,
          `Ticket #${analysis.ticketId}`,
          `Análise ${analysis.id}`,
          `Oportunidade ${opportunity.id}`,
        ],
      },
      tasks: [],
      timeline: [
        { id: crypto.randomUUID(), label: "Plano criado a partir de decisão aprovada", date: createdAt, completed: true },
      ],
      comments: [],
      attachments: [],
      copilotInsights: [],
    };
  },
};
