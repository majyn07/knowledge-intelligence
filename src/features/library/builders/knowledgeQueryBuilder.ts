import type { KnowledgeQuery } from "@/models/KnowledgeQuery";
import type { SupportConversation } from "@/models/SupportConversation";
import type { Ticket } from "@/models/Ticket";

/**
 * Monta a consulta a partir de tudo que o atendimento oferece, incluindo o
 * registro da conversa quando existe — é onde estão os termos que descrevem
 * o problema real.
 */
export function buildKnowledgeQuery(
  ticket: Ticket,
  conversation?: SupportConversation
): KnowledgeQuery {
  const conversationText = (conversation?.messages ?? [])
    .map((message) => message.body)
    .join("\n");

  return {
    text: [ticket.title, ticket.solution, conversationText]
      .filter(Boolean)
      .join("\n\n"),

    projectId: ticket.projectId,

    company: ticket.company,

    limit: 5,
  };
}
