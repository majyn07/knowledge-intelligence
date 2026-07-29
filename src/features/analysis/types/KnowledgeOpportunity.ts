export type OpportunityType =
  | "new_article"
  | "update_article"
  | "faq"
  | "tip"
  | "warning";

export type OpportunityStatus =
  | "proposed"
  | "approved"
  | "discarded"
  | "draft";

export interface KnowledgeOpportunity {
  id: string;
  type: OpportunityType;
  title: string;
  description: string;
  justification: string;
  status: OpportunityStatus;
}

export const OpportunityTypeLabel: Record<
  OpportunityType,
  string
> = {
  new_article: "Novo artigo",
  update_article: "Atualizar artigo",
  faq: "FAQ",
  tip: "Dica",
  warning: "Alerta",
};

export const OpportunityStatusLabel: Record<
  OpportunityStatus,
  string
> = {
  proposed: "Proposta",
  approved: "Aprovada",
  discarded: "Descartada",
  draft: "Em rascunho",
};
