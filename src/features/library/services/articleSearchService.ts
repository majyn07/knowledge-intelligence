import type { KnowledgeQuery } from "@/models/KnowledgeQuery";
import type { KnowledgeSearchResult } from "@/models/KnowledgeSearchResult";

import { getAllKnowledgeArticles } from "../repositories/knowledgeRepository";
import { searchKnowledge } from "../search/knowledgeSearchEngine";

export async function searchRelatedArticles(
  query: KnowledgeQuery
): Promise<KnowledgeSearchResult[]> {
  const articles = await getAllKnowledgeArticles();

  return searchKnowledge(articles, query);
}
