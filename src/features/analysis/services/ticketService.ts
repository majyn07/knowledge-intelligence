import type { SupportConversation, SupportConversationMessage } from "@/models/SupportConversation";
import type { Ticket } from "@/models/Ticket";

import type { TicketFormData } from "../types/TicketFormData";

/** Identificador curto e legível, no formato dos atendimentos existentes. */
function nextTicketId(existing: Ticket[]): string {
  const numeric = existing
    .map((ticket) => Number.parseInt(ticket.id, 10))
    .filter((value) => Number.isFinite(value));

  const highest = numeric.length > 0 ? Math.max(...numeric) : 45000;
  return String(highest + 1);
}

function normalizeMessages(data: TicketFormData): SupportConversationMessage[] {
  return data.messages
    .filter((message) => message.body.trim().length > 0)
    .map((message) => ({
      id: message.id,
      author: message.author.trim() || "Sem autor",
      body: message.body.trim(),
      createdAt: message.createdAt.trim(),
    }));
}

export const ticketService = {
  create(data: TicketFormData, existing: Ticket[]) {
    const id = nextTicketId(existing);

    const ticket: Ticket = {
      id,
      projectId: data.projectId,
      title: data.title.trim(),
      solution: data.solution.trim(),
      company: data.company.trim(),
      date: data.date.trim(),
    };

    const conversation: SupportConversation = {
      id: `conversation-${id}`,
      ticketId: id,
      messages: normalizeMessages(data),
    };

    return { ticket, conversation };
  },

  update(ticket: Ticket, conversation: SupportConversation | undefined, data: TicketFormData) {
    const updated: Ticket = {
      ...ticket,
      projectId: data.projectId,
      title: data.title.trim(),
      solution: data.solution.trim(),
      company: data.company.trim(),
      date: data.date.trim(),
    };

    const updatedConversation: SupportConversation = {
      id: conversation?.id ?? `conversation-${ticket.id}`,
      ticketId: ticket.id,
      messages: normalizeMessages(data),
      ...(conversation?.source ? { source: conversation.source } : {}),
    };

    return { ticket: updated, conversation: updatedConversation };
  },

  toFormData(ticket: Ticket, conversation: SupportConversation | undefined): TicketFormData {
    return {
      title: ticket.title,
      company: ticket.company,
      solution: ticket.solution,
      date: ticket.date,
      projectId: ticket.projectId,
      messages: (conversation?.messages ?? []).map((message) => ({
        id: message.id,
        author: message.author,
        body: message.body,
        createdAt: message.createdAt,
      })),
    };
  },
};
