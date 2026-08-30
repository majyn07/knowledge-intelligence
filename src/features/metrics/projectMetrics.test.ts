import { describe, expect, it } from "vitest";

import type { AnalysisRecord } from "@/models/KnowledgeLifecycle";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { PlanWorkspaceItem } from "@/features/plans/types/PlanWorkspace";
import type { Ticket } from "@/models/Ticket";
import { emptyClassification } from "@/models/TicketClassification";

import { selectProjectMetrics } from "./projectMetrics";

function analysis(overrides: Partial<AnalysisRecord> = {}): AnalysisRecord {
  return {
    id: "an1",
    projectId: "p1",
    ticketId: "t1",
    status: "completed",
    startedAt: "2026-01-01T10:00:00.000Z",
    relatedArticles: [],
    messages: [],
    result: {
      identification: {
        ticketId: "t1",
        title: "Caso",
        company: "",
        solution: "Workflow",
        analyzedAt: "2026-01-01T10:00:00.000Z",
      },
      summary: {
        resume: "",
        customerProblem: "",
        rootCause: "",
        supportAction: "",
        outcome: "",
      },
      classification: { documentationStatus: "adequate", confidenceLevel: "high" },
      confidence: 90,
      relatedArticles: 0,
      opportunities: [],
    },
    ...overrides,
  };
}

const article = (overrides: Partial<KnowledgeArticle> = {}): KnowledgeArticle => ({
  id: "ar1",
  title: "",
  summary: "",
  content: "",
  projectId: "p1",
  genreId: "gen-artigo",
  status: "published",
  sectionId: "",
  tags: [],
  keywords: [],
  author: "",
  contentFormat: "markdown" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const plan = (overrides: Partial<PlanWorkspaceItem> = {}) =>
  ({ id: "pl1", projectId: "p1", status: "analysis", ...overrides }) as PlanWorkspaceItem;

const ticket = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: "t1",
  projectId: "p1",
  title: "",
  solution: "",
  company: "",
  ...emptyClassification(),
  date: "",
  ...overrides,
});

describe("selectProjectMetrics", () => {
  it("escopa o trabalho ao projeto informado", () => {
    const metrics = selectProjectMetrics({
      projectId: "p1",
      analyses: [analysis(), analysis({ id: "an2", projectId: "p2" })],
      plans: [plan(), plan({ id: "pl2", projectId: "p2" })],
      articles: [article(), article({ id: "ar2", projectId: "p2" })],
      tickets: [ticket(), ticket({ id: "t2", projectId: "p2" })],
    });

    expect(metrics.analysis.total).toBe(1);
    expect(metrics.plan.total).toBe(1);
    expect(metrics.ticket.total).toBe(1);
  });

  /*
    O acervo é do hub e não tem iniciativa. Recortá-lo aqui zerava o cartão
    "Conteúdos publicados" com a Biblioteca cheia, porque todo artigo vindo do
    portal tem `projectId` vazio.
  */
  it("conta o acervo inteiro, que não se recorta por iniciativa", () => {
    const metrics = selectProjectMetrics({
      projectId: "p1",
      analyses: [],
      plans: [],
      articles: [article({ projectId: "" }), article({ id: "ar2", projectId: "p2" })],
    });

    expect(metrics.article.total).toBe(2);
  });

  /* Iniciativa nova continua parecendo nova, mesmo com o hub cheio. */
  it("não considera o acervo ao dizer que a iniciativa está vazia", () => {
    const metrics = selectProjectMetrics({
      projectId: "p1",
      analyses: [],
      plans: [],
      articles: [article({ projectId: "" })],
    });

    expect(metrics.isEmpty).toBe(true);
  });

  it("devolve tudo zerado quando não há projeto ativo", () => {
    const metrics = selectProjectMetrics({
      projectId: null,
      analyses: [analysis()],
      plans: [plan()],
      articles: [article()],
      tickets: [ticket()],
    });

    expect(metrics.isEmpty).toBe(true);
    expect(metrics.analysis.total).toBe(0);
  });

  it("conta cada atendimento analisado uma única vez", () => {
    const metrics = selectProjectMetrics({
      projectId: "p1",
      analyses: [analysis(), analysis({ id: "an2" })],
      plans: [],
      articles: [],
      tickets: [ticket(), ticket({ id: "t2" })],
    });

    expect(metrics.ticket.total).toBe(2);
    expect(metrics.ticket.analyzed).toBe(1);
  });

  it("calcula cobertura sobre as análises concluídas", () => {
    const metrics = selectProjectMetrics({
      projectId: "p1",
      analyses: [
        analysis(),
        analysis({
          id: "an2",
          result: { ...analysis().result, classification: { documentationStatus: "missing", confidenceLevel: "low" } },
        }),
        analysis({ id: "an3", status: "in_review" }),
      ],
      plans: [],
      articles: [],
    });

    expect(metrics.analysis.completed).toBe(2);
    expect(metrics.analysis.coverage).toBe(50);
  });

  it("não divide por zero sem análise concluída", () => {
    const metrics = selectProjectMetrics({
      projectId: "p1",
      analyses: [analysis({ status: "in_review" })],
      plans: [],
      articles: [],
    });

    expect(metrics.analysis.coverage).toBe(0);
  });

  it("aponta oportunidades aprovadas que ainda não viraram plano", () => {
    const withOpportunities = analysis({
      result: {
        ...analysis().result,
        opportunities: [
          { id: "o1", type: "new_article", title: "", description: "", justification: "", status: "approved" },
          { id: "o2", type: "new_article", title: "", description: "", justification: "", status: "approved", planId: "pl1" },
          { id: "o3", type: "new_article", title: "", description: "", justification: "", status: "discarded" },
        ],
      },
    });

    const metrics = selectProjectMetrics({
      projectId: "p1",
      analyses: [withOpportunities],
      plans: [],
      articles: [],
    });

    expect(metrics.opportunity.approved).toBe(2);
    expect(metrics.opportunity.approvedWithoutPlan).toBe(1);
  });

  it("trata plano publicado como inativo", () => {
    const metrics = selectProjectMetrics({
      projectId: "p1",
      analyses: [],
      plans: [plan(), plan({ id: "pl2", status: "published" })],
      articles: [],
    });

    expect(metrics.plan.active).toBe(1);
    expect(metrics.plan.published).toBe(1);
  });
});
