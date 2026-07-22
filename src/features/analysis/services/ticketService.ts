import type { Ticket } from "@/models/Ticket";

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

  createTicket(ticket: Ticket): Ticket {
    tickets.push(ticket);

    return ticket;
  },

  updateTicket(ticket: Ticket): Ticket {
    const index = tickets.findIndex(
      (currentTicket) =>
        currentTicket.id === ticket.id
    );

    if (index === -1) {
      throw new Error("Atendimento não encontrado.");
    }

    tickets[index] = ticket;

    return ticket;
  },

  deleteTicket(id: string): void {
    const index = tickets.findIndex(
      (ticket) => ticket.id === id
    );

    if (index !== -1) {
      tickets.splice(index, 1);
    }
  },
};