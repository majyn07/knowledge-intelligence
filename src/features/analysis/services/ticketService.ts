import type { SupportConversation } from "@/models/SupportConversation";
import type { Ticket } from "@/models/Ticket";

import { conversations } from "../mock/conversations";
import { tickets } from "../mock/tickets";

export const ticketService = {
  getTickets(projectId: string): Ticket[] {
    return tickets.filter(
      (ticket) => ticket.projectId === projectId
    );
  },

  getTicket(id: string): Ticket | undefined {
    return tickets.find(
      (ticket) => ticket.id === id
    );
  },

  getConversation(
    ticketId: string
  ): SupportConversation | undefined {
    return conversations.find(
      (conversation) => conversation.ticketId === ticketId
    );
  },
};
