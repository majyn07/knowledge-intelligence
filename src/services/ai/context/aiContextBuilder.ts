import type { AIChatRequest } from "@/models/AIChatRequest";
import type { AIContext } from "@/models/AIContext";

import { buildKnowledgeQuery } from "@/features/library/builders/knowledgeQueryBuilder";
import { searchRelatedArticles } from "@/features/library/services/articleSearchService";

export async function buildAIContext(
  request: AIChatRequest
): Promise<AIContext | undefined> {
  if (!request.context) {
    return undefined;
  }

  const context: AIContext = {
    ...request.context,
  };

  if (context.ticket) {
    const query = buildKnowledgeQuery(context.ticket);

    context.relatedArticles =
      await searchRelatedArticles(query);
  }

  return context;
}