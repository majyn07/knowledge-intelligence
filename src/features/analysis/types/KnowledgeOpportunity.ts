/**
 * Chaves que o modelo devolve na análise estruturada.
 *
 * Não são o vocabulário do produto — o tipo de oportunidade virou cadastro, e
 * a lista é da equipe. Estas cinco são o que a IA conhece hoje, e existem para
 * ser **traduzidas** para um item do cadastro pelo nome. Ensinar o cadastro ao
 * modelo é trabalho da sprint de IA.
 */
export const AI_OPPORTUNITY_KEYS = [
  "new_article",
  "update_article",
  "faq",
  "tip",
  "warning",
] as const;

export type AIOpportunityKey = (typeof AI_OPPORTUNITY_KEYS)[number];

/** Nome no cadastro correspondente a cada chave da IA. */
export const aiOpportunityName: Record<AIOpportunityKey, string> = {
  new_article: "Novo artigo",
  update_article: "Atualizar artigo",
  faq: "FAQ",
  tip: "Dica",
  warning: "Alerta",
};

export type OpportunityStatus =
  | "proposed"
  | "approved"
  | "discarded"
  | "draft"
  | "deferred";

export interface KnowledgeOpportunity {
  id: string;
  /** Set only after an approved opportunity is materialized as a plan. */
  planId?: string;
  /**
   * Identificador do tipo no cadastro. Vazio é estado legítimo: a IA sugeriu
   * algo que a equipe não tem cadastrado, e quem revisa decide.
   */
  type: string;
  title: string;
  description: string;
  justification: string;
  status: OpportunityStatus;
}

export const OpportunityStatusLabel: Record<
  OpportunityStatus,
  string
> = {
  proposed: "Proposta",
  approved: "Aprovada",
  discarded: "Descartada",
  draft: "Em rascunho",
  deferred: "Adiada",
};
