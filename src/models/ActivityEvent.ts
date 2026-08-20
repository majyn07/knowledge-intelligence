export type ActivityType =
  | "analysis_started"
  | "analysis_completed"
  | "opportunity_approved"
  | "opportunity_discarded"
  | "opportunity_deferred"
  | "plan_created"
  | "article_created"
  | "article_updated"
  | "article_status_changed"
  | "project_created"
  | "project_updated";

export type ActivitySubjectKind =
  | "ticket"
  | "analysis"
  | "opportunity"
  | "plan"
  | "article"
  | "project";

export interface ActivitySubject {
  kind: ActivitySubjectKind;
  id: string;
  label: string;
}

/**
 * Um fato ocorrido no ciclo de conhecimento.
 *
 * Eventos são acrescentados, nunca editados: é o registro do que aconteceu,
 * não um espelho do estado atual. É o que sustenta o princípio de
 * rastreabilidade e permite reconstruir a história de qualquer entidade.
 */
export interface ActivityEvent {
  id: string;
  /** ISO 8601. */
  at: string;
  type: ActivityType;
  projectId: string;
  /** Quem realizou. Vazio enquanto não existir autenticação. */
  actor: string;
  subject: ActivitySubject;
  detail: string;
}

export const activityTypeLabel: Record<ActivityType, string> = {
  analysis_started: "Análise realizada",
  analysis_completed: "Análise concluída",
  opportunity_approved: "Oportunidade aprovada",
  opportunity_discarded: "Oportunidade descartada",
  opportunity_deferred: "Oportunidade adiada",
  plan_created: "Plano criado",
  article_created: "Artigo criado",
  article_updated: "Artigo atualizado",
  article_status_changed: "Estágio do artigo alterado",
  project_created: "Projeto criado",
  project_updated: "Projeto atualizado",
};

/** Agrupamento usado para filtrar a linha do tempo por etapa do ciclo. */
export const activityStage: Record<ActivityType, "analise" | "decisao" | "execucao" | "conhecimento" | "projeto"> = {
  analysis_started: "analise",
  analysis_completed: "analise",
  opportunity_approved: "decisao",
  opportunity_discarded: "decisao",
  opportunity_deferred: "decisao",
  plan_created: "execucao",
  article_created: "conhecimento",
  article_updated: "conhecimento",
  article_status_changed: "conhecimento",
  project_created: "projeto",
  project_updated: "projeto",
};
