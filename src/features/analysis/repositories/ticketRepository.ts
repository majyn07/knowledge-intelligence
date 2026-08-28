import type { SupportConversation } from "@/models/SupportConversation";
import type { Ticket } from "@/models/Ticket";

import { readJSON, writeJSON } from "@/lib/storage";

import { conversations as conversationSeed } from "../mock/conversations";
import { tickets as ticketSeed } from "../mock/tickets";

const TICKETS_KEY = "visus-tickets";
const CONVERSATIONS_KEY = "visus-support-conversations";

function read<T>(key: string, seed: T[]): T[] {
  return readJSON<T[]>(key, seed);
}

function persist<T>(key: string, value: T[]): void {
  writeJSON(key, value);
}

/**
 * Fronteira local dos atendimentos e das conversas.
 *
 * Quando a origem passar a ser a HubSpot, é este arquivo que muda: o serviço,
 * o provider e as telas continuam como estão.
 */
export const ticketRepository = {
  getSeedTickets(): Ticket[] {
    return ticketSeed;
  },

  getSeedConversations(): SupportConversation[] {
    return conversationSeed;
  },

  getTickets(): Ticket[] {
    return read(TICKETS_KEY, ticketSeed);
  },

  getConversations(): SupportConversation[] {
    return read(CONVERSATIONS_KEY, conversationSeed);
  },

  saveTickets(tickets: Ticket[]): void {
    persist(TICKETS_KEY, tickets);
  },

  saveConversations(conversations: SupportConversation[]): void {
    persist(CONVERSATIONS_KEY, conversations);
  },
};
