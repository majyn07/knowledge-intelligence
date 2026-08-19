import type { SupportConversation } from "@/models/SupportConversation";
import type { Ticket } from "@/models/Ticket";

/** Internal persistence boundary for imported or locally created support data. */
export interface SupportRepository {
  listTickets(projectId: string): Promise<Ticket[]>;
  getTicket(id: string): Promise<Ticket | undefined>;
  getConversation(ticketId: string): Promise<SupportConversation | undefined>;
}
