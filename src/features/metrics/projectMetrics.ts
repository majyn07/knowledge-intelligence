import type { KnowledgeOpportunity, OpportunityStatus } from "@/features/analysis/types/KnowledgeOpportunity";
import type { PlanWorkspaceItem } from "@/features/plans/types/PlanWorkspace";
import type { AnalysisRecord } from "@/models/KnowledgeLifecycle";
import type { ArticleStatus, KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { Ticket } from "@/models/Ticket";

export interface ProjectMetricsInput {
  projectId: string | null;
  analyses: AnalysisRecord[];
  plans: PlanWorkspaceItem[];
  articles: KnowledgeArticle[];
  /** Atendimentos do projeto, quando a tela precisa exibi-los. */
  tickets?: Ticket[];
}

export interface ProjectOpportunity extends KnowledgeOpportunity {
  analysisId: string;
  ticketId: string;
  analysisStartedAt: string;
}

/**
 * Read-only project selector shared by Dashboard and Indicators.
 * Coverage is the proportion of completed analyses classified as adequate.
 * Active plans are all plans not yet marked as published in the current plan workflow.
 */
export function selectProjectMetrics({ projectId, analyses, plans, articles, tickets = [] }: ProjectMetricsInput) {
  const projectTickets = projectId ? tickets.filter((ticket) => ticket.projectId === projectId) : [];
  const projectAnalyses = projectId ? analyses.filter((analysis) => analysis.projectId === projectId) : [];
  const projectPlans = projectId ? plans.filter((plan) => plan.projectId === projectId) : [];
  /*
    O acervo não se recorta por iniciativa, e por isso entra inteiro.

    O artigo é do hub: os 1.822 importados do portal têm `projectId` vazio, e
    filtrar por igualdade zerava todo contador de artigo — inclusive o cartão
    que diz "Disponíveis na Biblioteca", que mostrava zero com a Biblioteca
    cheia. O recorte legítimo do artigo é por equipe, e quem o faz é a tela de
    indicadores, antes de chamar aqui.
  */
  const projectArticles = articles;
  const opportunities: ProjectOpportunity[] = projectAnalyses.flatMap((analysis) =>
    analysis.result.opportunities.map((opportunity) => ({
      ...opportunity,
      analysisId: analysis.id,
      ticketId: analysis.ticketId,
      analysisStartedAt: analysis.startedAt,
    }))
  );

  const opportunityCount = (status: OpportunityStatus) => opportunities.filter((opportunity) => opportunity.status === status).length;
  const articleCount = (status: ArticleStatus) => projectArticles.filter((article) => article.status === status).length;
  const completedAnalyses = projectAnalyses.filter((analysis) => analysis.status === "completed");
  const adequateAnalyses = completedAnalyses.filter(
    (analysis) => analysis.result.classification.documentationStatus === "adequate"
  );

  const approvedWithoutPlan = opportunities.filter(
    (opportunity) => opportunity.status === "approved" && !opportunity.planId
  ).length;

  return {
    analyses: projectAnalyses,
    plans: projectPlans,
    articles: projectArticles,
    tickets: projectTickets,
    opportunities,
    ticket: {
      total: projectTickets.length,
      analyzed: new Set(projectAnalyses.map((analysis) => analysis.ticketId)).size,
    },
    analysis: {
      total: projectAnalyses.length,
      open: projectAnalyses.filter((analysis) => analysis.status === "open").length,
      inReview: projectAnalyses.filter((analysis) => analysis.status === "in_review").length,
      completed: completedAnalyses.length,
      coverage: completedAnalyses.length ? Math.round((adequateAnalyses.length / completedAnalyses.length) * 100) : 0,
    },
    opportunity: {
      total: opportunities.length,
      proposed: opportunityCount("proposed"),
      approved: opportunityCount("approved"),
      discarded: opportunityCount("discarded"),
      deferred: opportunityCount("deferred"),
      draft: opportunityCount("draft"),
      approvedWithoutPlan,
    },
    plan: {
      total: projectPlans.length,
      active: projectPlans.filter((plan) => plan.status !== "published").length,
      published: projectPlans.filter((plan) => plan.status === "published").length,
    },
    article: {
      total: projectArticles.length,
      draft: articleCount("draft"),
      review: articleCount("review"),
      published: articleCount("published"),
      archived: articleCount("archived"),
    },
    /*
      Vazio é sobre o **trabalho** da iniciativa, e o acervo não é trabalho
      dela: contá-lo faria uma iniciativa recém-criada nunca parecer vazia,
      porque o hub tem 1.822 artigos que ela não originou.
    */
    isEmpty: projectAnalyses.length === 0 && projectPlans.length === 0,
  };
}

export type ProjectMetrics = ReturnType<typeof selectProjectMetrics>;
