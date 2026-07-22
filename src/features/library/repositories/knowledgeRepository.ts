import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

import { MOCK_KNOWLEDGE_BASE } from "./mockKnowledgeBase";

export async function getAllKnowledgeArticles(): Promise<
  KnowledgeArticle[]
> {
  return MOCK_KNOWLEDGE_BASE;
}