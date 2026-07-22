import type { KnowledgeSearchResult } from "./KnowledgeSearchResult";
import type { Ticket } from "./Ticket";

export interface AIContext {
  ticket?: Ticket;
  relatedArticles?: KnowledgeSearchResult[];
}