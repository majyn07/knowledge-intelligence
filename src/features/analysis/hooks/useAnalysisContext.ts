"use client";

import { useMemo } from "react";

import type { AIContext } from "@/models/AIContext";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { Ticket } from "@/models/Ticket";

import { buildKnowledgeQuery } from "@/features/library/builders/knowledgeQueryBuilder";
import { searchRelatedArticles } from "@/features/library/services/articleSearchService";

import { ticketService } from "../services/ticketService";

/**
 * O acervo vive no navegador, então a busca acontece aqui e segue junto com o
 * contexto. O servidor recebe a evidência já resolvida, em vez de tentar ler
 * uma base à qual não tem acesso.
 */
export function useAnalysisContext(
  articles: KnowledgeArticle[],
  ticket?: Ticket
): AIContext {
  return useMemo(() => {
    if (!ticket) return {};

    const conversation = ticketService.getConversation(ticket.id);
    const query = buildKnowledgeQuery(ticket, conversation);

    return {
      ticket,
      conversation,
      relatedArticles: searchRelatedArticles(articles, query),
      projectId: ticket.projectId,
    };
  }, [articles, ticket]);
}
