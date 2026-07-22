import type { KnowledgeQuery } from "@/models/KnowledgeQuery";
import type { Ticket } from "@/models/Ticket";

export function buildKnowledgeQuery(
  ticket: Ticket
): KnowledgeQuery {
  return {
    text: [
      ticket.title,
      ticket.solution,
    ]
      .filter(Boolean)
      .join("\n\n"),

    projectId: ticket.projectId,

    company: ticket.company,

    limit: 5,
  };
}