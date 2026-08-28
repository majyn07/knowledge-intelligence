import type { ActivityEvent, ActivityType } from "@/models/ActivityEvent";
import type { AnalysisRecord } from "@/models/KnowledgeLifecycle";

/** Janelas oferecidas na tela. `null` significa todo o histórico guardado. */
export type MetricPeriod = 7 | 30 | 90 | null;

export interface PeriodComparison {
  current: number;
  previous: number;
}

export interface PeriodMetricsInput {
  projectId: string | null;
  events: ActivityEvent[];
  analyses: AnalysisRecord[];
  days: MetricPeriod;
  /** Instante de referência, recebido para a função permanecer pura. */
  now: Date;
}

const DAY = 24 * 60 * 60 * 1000;

function withinWindow(at: string, start: number, end: number) {
  const moment = new Date(at).getTime();
  return Number.isFinite(moment) && moment >= start && moment < end;
}

/**
 * Leitura temporal do ciclo, montada sobre o registro de eventos.
 *
 * Só reporta o que o evento expressa sem ambiguidade, criações e conclusões.
 * Movimentações de estágio entram somadas, porque o evento guarda a transição
 * como texto e inferir o destino a partir dele seria adivinhação.
 */
export function selectPeriodMetrics({
  projectId,
  events,
  analyses,
  days,
  now,
}: PeriodMetricsInput) {
  const end = now.getTime();
  const start = days === null ? 0 : end - days * DAY;
  const previousStart = days === null ? 0 : start - days * DAY;

  const projectEvents = projectId
    ? events.filter((event) => event.projectId === projectId)
    : [];

  const count = (type: ActivityType): PeriodComparison => ({
    current: projectEvents.filter(
      (event) => event.type === type && withinWindow(event.at, start, end)
    ).length,
    previous:
      days === null
        ? 0
        : projectEvents.filter(
            (event) => event.type === type && withinWindow(event.at, previousStart, start)
          ).length,
  });

  const stageMoves: PeriodComparison = {
    current: projectEvents.filter(
      (event) =>
        (event.type === "article_status_changed" || event.type === "plan_status_changed") &&
        withinWindow(event.at, start, end)
    ).length,
    previous:
      days === null
        ? 0
        : projectEvents.filter(
            (event) =>
              (event.type === "article_status_changed" || event.type === "plan_status_changed") &&
              withinWindow(event.at, previousStart, start)
          ).length,
  };

  /** Cobertura das análises concluídas na janela, medida na própria análise. */
  function coverage(from: number, to: number) {
    const completed = (projectId ? analyses.filter((a) => a.projectId === projectId) : []).filter(
      (analysis) => analysis.completedAt && withinWindow(analysis.completedAt, from, to)
    );

    const adequate = completed.filter(
      (analysis) => analysis.result.classification.documentationStatus === "adequate"
    );

    return {
      completed: completed.length,
      percentage: completed.length
        ? Math.round((adequate.length / completed.length) * 100)
        : null,
    };
  }

  return {
    days,
    ticketsRegistered: count("ticket_created"),
    analysesStarted: count("analysis_started"),
    analysesCompleted: count("analysis_completed"),
    opportunitiesApproved: count("opportunity_approved"),
    opportunitiesDiscarded: count("opportunity_discarded"),
    plansCreated: count("plan_created"),
    articlesCreated: count("article_created"),
    stageMoves,
    coverage: {
      current: coverage(start, end),
      previous: days === null ? { completed: 0, percentage: null } : coverage(previousStart, start),
    },
    /** Falso quando não houve nenhum movimento na janela. */
    hasMovement: projectEvents.some((event) => withinWindow(event.at, start, end)),
  };
}

export type PeriodMetrics = ReturnType<typeof selectPeriodMetrics>;
