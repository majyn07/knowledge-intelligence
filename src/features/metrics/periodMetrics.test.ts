import { describe, expect, it } from "vitest";

import type { ActivityEvent, ActivityType } from "@/models/ActivityEvent";
import type { AnalysisRecord } from "@/models/KnowledgeLifecycle";

import { selectPeriodMetrics } from "./periodMetrics";

const NOW = new Date("2026-08-20T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

function daysAgo(days: number) {
  return new Date(NOW.getTime() - days * DAY).toISOString();
}

function event(type: ActivityType, at: string, projectId = "p1"): ActivityEvent {
  return {
    id: `${type}-${at}`,
    at,
    type,
    projectId,
    actor: "",
    subject: { kind: "ticket", id: "t1", label: "Caso" },
    detail: "",
  };
}

function analysis(completedAt: string | undefined, adequate: boolean, projectId = "p1"): AnalysisRecord {
  return {
    id: `an-${completedAt ?? "aberta"}-${adequate}`,
    projectId,
    ticketId: "t1",
    status: completedAt ? "completed" : "in_review",
    startedAt: daysAgo(10),
    completedAt,
    relatedArticles: [],
    messages: [],
    result: {
      identification: { ticketId: "t1", title: "", company: "", solution: "", analyzedAt: "" },
      summary: { resume: "", customerProblem: "", rootCause: "", supportAction: "", outcome: "" },
      classification: {
        documentationStatus: adequate ? "adequate" : "missing",
        confidenceLevel: "high",
      },
      confidence: 90,
      relatedArticles: 0,
      opportunities: [],
    },
  };
}

const base = { projectId: "p1", analyses: [], now: NOW };

describe("selectPeriodMetrics", () => {
  it("conta apenas eventos dentro da janela", () => {
    const metrics = selectPeriodMetrics({
      ...base,
      days: 7,
      events: [
        event("ticket_created", daysAgo(1)),
        event("ticket_created", daysAgo(6)),
        event("ticket_created", daysAgo(20)),
      ],
    });

    expect(metrics.ticketsRegistered.current).toBe(2);
  });

  it("compara com a janela anterior de mesmo tamanho", () => {
    const metrics = selectPeriodMetrics({
      ...base,
      days: 7,
      events: [
        event("ticket_created", daysAgo(2)),
        event("ticket_created", daysAgo(9)),
        event("ticket_created", daysAgo(12)),
        event("ticket_created", daysAgo(30)),
      ],
    });

    expect(metrics.ticketsRegistered.current).toBe(1);
    expect(metrics.ticketsRegistered.previous).toBe(2);
  });

  it("ignora eventos de outro projeto", () => {
    const metrics = selectPeriodMetrics({
      ...base,
      days: 30,
      events: [event("ticket_created", daysAgo(1)), event("ticket_created", daysAgo(1), "p2")],
    });

    expect(metrics.ticketsRegistered.current).toBe(1);
  });

  it("sem projeto ativo não conta nada", () => {
    const metrics = selectPeriodMetrics({
      ...base,
      projectId: null,
      days: 30,
      events: [event("ticket_created", daysAgo(1))],
    });

    expect(metrics.ticketsRegistered.current).toBe(0);
    expect(metrics.hasMovement).toBe(false);
  });

  it("com janela aberta conta tudo e não compara", () => {
    const metrics = selectPeriodMetrics({
      ...base,
      days: null,
      events: [event("ticket_created", daysAgo(1)), event("ticket_created", daysAgo(400))],
    });

    expect(metrics.ticketsRegistered.current).toBe(2);
    expect(metrics.ticketsRegistered.previous).toBe(0);
  });

  it("soma as movimentações de estágio de artigo e de plano", () => {
    const metrics = selectPeriodMetrics({
      ...base,
      days: 30,
      events: [
        event("article_status_changed", daysAgo(1)),
        event("plan_status_changed", daysAgo(2)),
        event("ticket_created", daysAgo(3)),
      ],
    });

    expect(metrics.stageMoves.current).toBe(2);
  });

  it("calcula a cobertura das análises concluídas na janela", () => {
    const metrics = selectPeriodMetrics({
      ...base,
      days: 30,
      events: [],
      analyses: [
        analysis(daysAgo(2), true),
        analysis(daysAgo(3), false),
        analysis(daysAgo(4), true),
        analysis(daysAgo(4), true, "p2"),
      ],
    });

    expect(metrics.coverage.current.completed).toBe(3);
    expect(metrics.coverage.current.percentage).toBe(67);
  });

  it("devolve cobertura nula quando nada foi concluído na janela", () => {
    const metrics = selectPeriodMetrics({
      ...base,
      days: 7,
      events: [],
      analyses: [analysis(daysAgo(40), true), analysis(undefined, true)],
    });

    expect(metrics.coverage.current.completed).toBe(0);
    expect(metrics.coverage.current.percentage).toBeNull();
  });

  it("compara a cobertura com a janela anterior", () => {
    const metrics = selectPeriodMetrics({
      ...base,
      days: 7,
      events: [],
      analyses: [analysis(daysAgo(2), true), analysis(daysAgo(9), false)],
    });

    expect(metrics.coverage.current.percentage).toBe(100);
    expect(metrics.coverage.previous.percentage).toBe(0);
  });

  it("aponta ausência de movimento na janela", () => {
    const metrics = selectPeriodMetrics({
      ...base,
      days: 7,
      events: [event("ticket_created", daysAgo(30))],
    });

    expect(metrics.hasMovement).toBe(false);
  });

  it("ignora data inválida em vez de contar errado", () => {
    const metrics = selectPeriodMetrics({
      ...base,
      days: 7,
      events: [event("ticket_created", "data-quebrada")],
    });

    expect(metrics.ticketsRegistered.current).toBe(0);
  });
});
