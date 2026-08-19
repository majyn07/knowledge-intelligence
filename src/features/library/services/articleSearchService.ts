import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { KnowledgeQuery } from "@/models/KnowledgeQuery";
import type { KnowledgeSearchResult } from "@/models/KnowledgeSearchResult";

import { searchKnowledge } from "../search/knowledgeSearchEngine";

/**
 * Busca sobre o acervo recebido. Função pura: quem chama fornece os artigos,
 * porque hoje eles vivem no navegador e amanhã podem vir de uma fonte remota.
 */
export function searchRelatedArticles(
  articles: KnowledgeArticle[],
  query: KnowledgeQuery
): KnowledgeSearchResult[] {
  return searchKnowledge(articles, query);
}
