import type { KnowledgeSearchResult } from "./KnowledgeSearchResult";
import type { SupportConversation } from "./SupportConversation";
import type { Ticket } from "./Ticket";

export interface AIContext {
  ticket?: Ticket;

  /** Conversa do atendimento, quando disponível no domínio. Preenchida no servidor. */
  conversation?: SupportConversation;

  relatedArticles?: KnowledgeSearchResult[];

  knowledgeBaseId?: string;

  projectId?: string;

  analysisMode?: "ticket" | "article";
}
