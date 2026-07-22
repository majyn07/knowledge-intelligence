import type { KnowledgeArticle } from "./KnowledgeArticle";

export interface KnowledgeSearchResult {
  article: KnowledgeArticle;

  score: number;

  matchedTerms: string[];
}