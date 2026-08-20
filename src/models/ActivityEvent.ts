/**
 * Tipos de evento e assuntos possíveis.
 *
 * Declarados como array e não como união escrita à mão porque o normalizador
 * precisa da lista em tempo de execução para recusar valor desconhecido.
 * Manter as duas formas separadas convida a desalinho — e foi exatamente o que
 * aconteceu na primeira tentativa de escrever o normalizador.
 */
export const ACTIVITY_TYPES = [
  "ticket_created",
  "ticket_updated",
  "ticket_deleted",
  "analysis_started",
  "analysis_completed",
  "opportunity_approved",
  "opportunity_discarded",
  "opportunity_deferred",
  "plan_created",
  "plan_status_changed",
  "plan_updated",
  "article_created",
  "article_updated",
  "article_status_changed",
  "project_created",
  "project_updated",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_SUBJECT_KINDS = [
  "ticket",
  "analysis",
  "opportunity",
  "plan",
  "article",
  "project",
] as const;

export type ActivitySubjectKind = (typeof ACTIVITY_SUBJECT_KINDS)[number];

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
  ticket_created: "Atendimento registrado",
  ticket_updated: "Atendimento atualizado",
  ticket_deleted: "Atendimento excluído",
  analysis_started: "Análise realizada",
  analysis_completed: "Análise concluída",
  opportunity_approved: "Oportunidade aprovada",
  opportunity_discarded: "Oportunidade descartada",
  opportunity_deferred: "Oportunidade adiada",
  plan_created: "Plano criado",
  plan_status_changed: "Estágio do plano alterado",
  plan_updated: "Plano atualizado",
  article_created: "Artigo criado",
  article_updated: "Artigo atualizado",
  article_status_changed: "Estágio do artigo alterado",
  project_created: "Projeto criado",
  project_updated: "Projeto atualizado",
};

/** Agrupamento usado para filtrar a linha do tempo por etapa do ciclo. */
export const activityStage: Record<ActivityType, "atendimento" | "analise" | "decisao" | "execucao" | "conhecimento" | "projeto"> = {
  ticket_created: "atendimento",
  ticket_updated: "atendimento",
  ticket_deleted: "atendimento",
  analysis_started: "analise",
  analysis_completed: "analise",
  opportunity_approved: "decisao",
  opportunity_discarded: "decisao",
  opportunity_deferred: "decisao",
  plan_created: "execucao",
  plan_status_changed: "execucao",
  plan_updated: "execucao",
  article_created: "conhecimento",
  article_updated: "conhecimento",
  article_status_changed: "conhecimento",
  project_created: "projeto",
  project_updated: "projeto",
};
