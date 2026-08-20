import { items, record, text } from "@/lib/shape";
import type { SupportConversation } from "@/models/SupportConversation";
import type { Ticket } from "@/models/Ticket";

function externalSource(raw: unknown) {
  const source = record(raw);
  if (!text(source.externalId)) return {};

  return {
    source: {
      provider: "hubspot" as const,
      externalId: text(source.externalId),
      importedAt: text(source.importedAt),
    },
  };
}

/** Garante a forma do atendimento vinda do armazenamento. */
export function normalizeTicket(raw: unknown): Ticket {
  const value = record(raw);

  return {
    id: text(value.id),
    projectId: text(value.projectId),
    title: text(value.title),
    solution: text(value.solution),
    company: text(value.company),
    date: text(value.date),
    ...externalSource(value.source),
  };
}

export function normalizeConversation(raw: unknown): SupportConversation {
  const value = record(raw);

  return {
    id: text(value.id),
    ticketId: text(value.ticketId),
    messages: items(value.messages).map((entry) => {
      const message = record(entry);
      return {
        id: text(message.id) || crypto.randomUUID(),
        author: text(message.author),
        body: text(message.body),
        createdAt: text(message.createdAt),
      };
    }),
    ...externalSource(value.source),
  };
}

export function parseTickets(raw: string): Ticket[] {
  return items(JSON.parse(raw)).map(normalizeTicket);
}

export function parseConversations(raw: string): SupportConversation[] {
  return items(JSON.parse(raw)).map(normalizeConversation);
}
