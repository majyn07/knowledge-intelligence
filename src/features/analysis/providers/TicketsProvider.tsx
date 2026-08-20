"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import { toast } from "sonner";

import { useSharedCollection } from "@/hooks/useSharedCollection";
import { fromConversation, fromTicket, toConversation, toTicket } from "@/lib/supabase/domainRows";
import { STORAGE_KEYS } from "@/lib/storage";
import { useActivity } from "@/features/activities/providers/ActivityProvider";
import { usePeople } from "@/features/people/providers/PeopleProvider";
import type { SupportConversation } from "@/models/SupportConversation";
import type { Ticket } from "@/models/Ticket";

import { parseConversations, parseTickets } from "../normalizeSupport";
import { ticketRepository } from "../repositories/ticketRepository";
import { ticketService } from "../services/ticketService";
import type { TicketFormData } from "../types/TicketFormData";

const TICKETS_KEY = STORAGE_KEYS.tickets;
const CONVERSATIONS_KEY = STORAGE_KEYS.conversations;

interface TicketsContextValue {
  tickets: Ticket[];
  /** Falso até o conteúdo guardado ser lido, após a montagem. */
  isHydrated: boolean;
  conversations: SupportConversation[];
  ticketsOf: (projectId: string | null) => Ticket[];
  conversationOf: (ticketId: string) => SupportConversation | undefined;
  createTicket: (data: TicketFormData) => Ticket;
  updateTicket: (id: string, data: TicketFormData) => void;
  deleteTicket: (id: string) => void;
}

const TicketsContext = createContext<TicketsContextValue | null>(null);

export function TicketsProvider({ children }: { children: ReactNode }) {
  const { record } = useActivity();
  const { currentPerson } = usePeople();

  const [tickets, setTickets, isHydrated] = useSharedCollection<Ticket>({
    key: TICKETS_KEY,
    table: "tickets",
    fallback: ticketRepository.getSeedTickets(),
    parseLocal: parseTickets,
    fromRows: (rows) => rows.map(toTicket),
    toRow: fromTicket,
    identify: (ticket) => ticket.id,
  });

  const [conversations, setConversations] = useSharedCollection<SupportConversation>({
    key: CONVERSATIONS_KEY,
    table: "support_conversations",
    fallback: ticketRepository.getSeedConversations(),
    parseLocal: parseConversations,
    fromRows: (rows) => rows.map(toConversation),
    toRow: fromConversation,
    identify: (conversation) => conversation.id,
  });

  const ticketsOf = useCallback(
    (projectId: string | null) =>
      projectId ? tickets.filter((ticket) => ticket.projectId === projectId) : [],
    [tickets]
  );

  const conversationOf = useCallback(
    (ticketId: string) => conversations.find((item) => item.ticketId === ticketId),
    [conversations]
  );

  const createTicket = useCallback(
    (data: TicketFormData) => {
      const { ticket, conversation } = ticketService.create(data, tickets);

      setTickets((current) => [ticket, ...current]);
      setConversations((current) => [conversation, ...current]);

      record({
        type: "ticket_created",
        projectId: ticket.projectId,
        actor: currentPerson,
        subject: { kind: "ticket", id: ticket.id, label: ticket.title },
        detail: `Atendimento registrado com ${conversation.messages.length} mensagem(ns) de evidência.`,
      });

      toast.success(`Atendimento #${ticket.id} criado.`);
      return ticket;
    },
    [currentPerson, record, setConversations, setTickets, tickets]
  );

  const updateTicket = useCallback(
    (id: string, data: TicketFormData) => {
      const current = tickets.find((ticket) => ticket.id === id);
      if (!current) return;

      const { ticket, conversation } = ticketService.update(current, conversationOf(id), data);

      setTickets((all) => all.map((item) => (item.id === id ? ticket : item)));
      setConversations((all) => {
        const exists = all.some((item) => item.ticketId === id);
        return exists
          ? all.map((item) => (item.ticketId === id ? conversation : item))
          : [conversation, ...all];
      });

      record({
        type: "ticket_updated",
        projectId: ticket.projectId,
        actor: currentPerson,
        subject: { kind: "ticket", id: ticket.id, label: ticket.title },
        detail: "Dados do atendimento ou o registro da conversa foram alterados.",
      });

      toast.success("Atendimento atualizado.");
    },
    [conversationOf, currentPerson, record, setConversations, setTickets, tickets]
  );

  const deleteTicket = useCallback(
    (id: string) => {
      const ticket = tickets.find((item) => item.id === id);
      if (!ticket) return;

      setTickets((all) => all.filter((item) => item.id !== id));
      setConversations((all) => all.filter((item) => item.ticketId !== id));

      // O histórico guarda o rótulo, então o registro sobrevive ao assunto.
      record({
        type: "ticket_deleted",
        projectId: ticket.projectId,
        actor: currentPerson,
        subject: { kind: "ticket", id: ticket.id, label: ticket.title },
        detail: `Atendimento #${ticket.id} e seu registro de conversa foram excluídos.`,
      });

      toast.success("Atendimento excluído.");
    },
    [currentPerson, record, setConversations, setTickets, tickets]
  );

  const value = useMemo(
    () => ({
      tickets,
      conversations,
      isHydrated,
      ticketsOf,
      conversationOf,
      createTicket,
      updateTicket,
      deleteTicket,
    }),
    [conversationOf, conversations, createTicket, deleteTicket, isHydrated, ticketsOf, tickets, updateTicket]
  );

  return <TicketsContext.Provider value={value}>{children}</TicketsContext.Provider>;
}

export function useTickets() {
  const context = useContext(TicketsContext);
  if (!context) throw new Error("useTickets deve ser utilizado dentro de TicketsProvider.");
  return context;
}
