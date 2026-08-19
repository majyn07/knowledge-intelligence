export type ArticleStatus =
  | "draft"
  | "review"
  | "published"
  | "archived";

export type ArticleType =
  | "article"
  | "faq"
  | "workflow"
  | "document"
  | "template";

/** Origem do conteúdo, quando ele nasceu de uma decisão do ciclo de conhecimento. */
export interface KnowledgeContentSource {
  projectId: string;
  ticketId: string;
  analysisId: string;
  opportunityId: string;
  planId: string;
}

/**
 * Artigo da Base de Conhecimento — a única representação de conteúdo do
 * produto. É o que a Biblioteca edita e o que a análise consulta.
 */
export interface KnowledgeArticle {
  id: string;

  title: string;
  /** Resumo curto, usado nas listagens e no contexto enviado à IA. */
  summary: string;
  content: string;

  projectId: string;

  type: ArticleType;
  status: ArticleStatus;

  /** Taxonomia alinhada à usada no atendimento e no portal de suporte. */
  product: string;
  module: string;
  category: string;

  tags: string[];
  keywords: string[];

  /** Quem conduz o conteúdo. Campo simples até existir sistema de usuários. */
  author: string;

  /** Endereço público do artigo, quando já publicado fora da plataforma. */
  url?: string;

  source?: KnowledgeContentSource;

  createdAt: Date;
  updatedAt: Date;
}

export const articleStatusLabel: Record<ArticleStatus, string> = {
  draft: "Rascunho",
  review: "Em revisão",
  published: "Publicado",
  archived: "Arquivado",
};

export const articleTypeLabel: Record<ArticleType, string> = {
  article: "Artigo",
  faq: "FAQ",
  workflow: "Workflow",
  document: "Documento",
  template: "Template",
};

/**
 * Transições permitidas do ciclo editorial. Além de avançar, o conteúdo pode
 * voltar: revisão reprovada volta para rascunho, publicado pode ser recolhido
 * para correção, e arquivado pode ser retomado.
 */
export const allowedArticleTransitions: Record<ArticleStatus, ArticleStatus[]> = {
  draft: ["review"],
  review: ["published", "draft"],
  published: ["archived", "review"],
  archived: ["draft"],
};

export function canTransitionArticle(current: ArticleStatus, next: ArticleStatus) {
  return current === next || allowedArticleTransitions[current].includes(next);
}
