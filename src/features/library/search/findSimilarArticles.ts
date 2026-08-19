import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { KnowledgeSearchResult } from "@/models/KnowledgeSearchResult";

import { searchKnowledge } from "./knowledgeSearchEngine";

interface SimilarArticlesInput {
  articles: KnowledgeArticle[];
  /** Texto de referência: o próprio artigo, ou o título sendo digitado. */
  text: string;
  projectId?: string;
  excludeId?: string;
  limit?: number;
}

/**
 * Reaproveita o motor de busca da análise para relacionar artigos entre si.
 * Serve tanto para sugerir leitura relacionada quanto para avisar sobre
 * conteúdo duplicado antes de escrever algo que já existe.
 */
export function findSimilarArticles({
  articles,
  text,
  projectId,
  excludeId,
  limit = 3,
}: SimilarArticlesInput): KnowledgeSearchResult[] {
  if (text.trim().length < 4) {
    return [];
  }

  return searchKnowledge(
    articles.filter((article) => article.id !== excludeId),
    { text, projectId, limit }
  );
}
