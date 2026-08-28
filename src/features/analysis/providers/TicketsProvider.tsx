"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import { toast } from "sonner";

import { trashToast } from "@/components/common/trashToast";
import { alive, trashed } from "@/models/Trash";
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
  /** Grava uma importação inteira: novos e atualizados numa passada. */
  importTickets: (create: Ticket[], update: Ticket[]) => void;
  /** O que veio da caixa do suporte: atendimento e conversa juntos. */
  importFromHelpDesk: (
    novos: { ticket: Ticket; conversation: SupportConversation }[]
  ) => void;
  updateTicket: (id: string, data: TicketFormData) => void;
  deleteTicket: (id: string) => void;
  /** O que está na lixeira, para a tela de recuperação. */
  deletedTickets: Ticket[];
  restoreTicket: (id: string) => void;
  purgeTicket: (id: string) => void;
}

const TicketsContext = createContext<TicketsContextValue | null>(null);

export function TicketsProvider({ children }: { children: ReactNode }) {
  const { record } = useActivity();
  const { currentPerson } = usePeople();

  const [allTickets, setTickets, isHydrated] = useSharedCollection<Ticket>({
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

  /*
    A coleção guarda vivos e excluídos juntos; as telas só querem os vivos.
    Separar aqui, e não em cada tela, é o que impede um atendimento na lixeira
    de reaparecer numa listagem que alguém esqueceu de filtrar.
  */
  const tickets = useMemo(() => alive(allTickets), [allTickets]);
  const deletedTickets = useMemo(() => trashed(allTickets), [allTickets]);

  const ticketsOf = useCallback(
    (projectId: string | null) =>
      projectId ? tickets.filter((ticket) => ticket.projectId === projectId) : [],
    [tickets]
  );

  const conversationOf = useCallback(
    (ticketId: string) => conversations.find((item) => item.ticketId === ticketId),
    [conversations]
  );


  /**
   * Grava o resultado de uma importação numa passada só.
   *
   * Mesma razão da Biblioteca: cada gravação da coleção compartilhada é uma ida
   * ao servidor, e um evento de histórico por atendimento enterraria tudo que
   * aconteceu antes.
   *
   * A conversa não vem junto de propósito. A exportação da HubSpot traz o
   * ticket, não o fio de mensagens. Inventar uma conversa vazia faria a
   * análise achar que tem evidência quando não tem.
   */
  /**
   * O que veio da caixa do suporte: atendimento e conversa, de uma vez.
   *
   * Separado de `importTickets` porque o arquivo exportado não traz o fio de
   * mensagens e a API traz. Gravar em duas chamadas faria a análise poder rodar
   * no intervalo, sobre um atendimento cuja evidência ainda não chegou.
   *
   * Uma escrita, um evento, um aviso, como a importação do acervo. Uma a uma
   * custaria centenas de avisos empilhados e centenas de linhas iguais
   * enterrando o histórico.
   */
  const importFromHelpDesk = useCallback(
    (novos: { ticket: Ticket; conversation: SupportConversation }[]) => {
      if (novos.length === 0) return;

      const porId = new Map(novos.map((item) => [item.ticket.id, item.ticket]));
      const existentes = new Set(tickets.map((item) => item.id));

      setTickets((current) => [
        ...current.map((item) => porId.get(item.id) ?? item),
        ...novos.filter((item) => !existentes.has(item.ticket.id)).map((item) => item.ticket),
      ]);

      const conversasPorTicket = new Map(
        novos.map((item) => [item.conversation.ticketId, item.conversation])
      );

      setConversations((current) => [
        ...current.map((item) => conversasPorTicket.get(item.ticketId) ?? item),
        ...novos
          .filter((item) => !current.some((c) => c.ticketId === item.ticket.id))
          .map((item) => item.conversation),
      ]);

      const criados = novos.filter((item) => !existentes.has(item.ticket.id)).length;
      const atualizados = novos.length - criados;

      const partes = [
        criados > 0 ? criados + " novo(s)" : "",
        atualizados > 0 ? atualizados + " atualizado(s)" : "",
      ].filter(Boolean);

      record({
        type: "ticket_created",
        projectId: novos[0].ticket.projectId,
        actor: currentPerson,
        subject: {
          kind: "ticket",
          id: "help-desk",
          label: "Busca de " + novos.length + " atendimentos na HubSpot",
        },
        detail: partes.join(", "),
      });

      toast.success("Busca concluída: " + partes.join(", ") + ".");
    },
    [currentPerson, record, setConversations, setTickets, tickets]
  );

  const importTickets = useCallback(
    (create: Ticket[], update: Ticket[]) => {
      if (create.length === 0 && update.length === 0) return;

      const porId = new Map(update.map((item) => [item.id, item]));

      setTickets((current) => [
        ...current.map((item) => porId.get(item.id) ?? item),
        ...create,
      ]);

      const partes = [
        create.length > 0 ? create.length + " novo(s)" : "",
        update.length > 0 ? update.length + " atualizado(s)" : "",
      ].filter(Boolean);

      record({
        type: "ticket_created",
        projectId: (create[0] ?? update[0]).projectId,
        actor: currentPerson,
        subject: {
          kind: "ticket",
          id: "import",
          label: "Importação de " + (create.length + update.length) + " atendimentos",
        },
        detail: partes.join(", "),
      });

      toast.success("Importação concluída: " + partes.join(", ") + ".");
    },
    [currentPerson, record, setTickets]
  );

  const createTicket = useCallback(
    (data: TicketFormData) => {
      const { ticket, conversation } = ticketService.create(data, tickets, new Date());

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

      const { ticket, conversation } = ticketService.update(
        current,
        conversationOf(id),
        data,
        new Date()
      );

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

  const restoreTicket = useCallback(
    (id: string) => {
      setTickets((all) => all.map((item) => (item.id === id ? { ...item, deletedAt: "" } : item)));
    },
    [setTickets]
  );

  /** Sai do banco de vez, com a conversa dele. Só a lixeira chama. */
  const purgeTicket = useCallback(
    (id: string) => {
      setTickets((all) => all.filter((item) => item.id !== id));
      setConversations((all) => all.filter((item) => item.ticketId !== id));
    },
    [setConversations, setTickets]
  );

  /**
   * Excluir manda para a lixeira.
   *
   * A conversa não ganha marca própria: ela não tem vida fora do atendimento e
   * some junto quando a tela filtra por ele.
   */
  const deleteTicket = useCallback(
    (id: string) => {
      const ticket = tickets.find((item) => item.id === id);
      if (!ticket) return;

      const at = new Date().toISOString();
      setTickets((all) => all.map((item) => (item.id === id ? { ...item, deletedAt: at } : item)));

      // O histórico guarda o rótulo, então o registro sobrevive ao assunto.
      record({
        type: "ticket_deleted",
        projectId: ticket.projectId,
        actor: currentPerson,
        subject: { kind: "ticket", id: ticket.id, label: ticket.title },
        detail: `Atendimento #${ticket.id} foi movido para a lixeira.`,
      });

      trashToast({
        label: "Atendimento",
        subject: ticket.title,
        onUndo: () => restoreTicket(id),
      });
    },
    [currentPerson, record, restoreTicket, setTickets, tickets]
  );

  const value = useMemo(
    () => ({
      tickets,
      conversations,
      isHydrated,
      ticketsOf,
      conversationOf,
      createTicket,
      importFromHelpDesk,
      importTickets,
      updateTicket,
      deleteTicket,
      deletedTickets,
      restoreTicket,
      purgeTicket,
    }),
    [conversationOf, conversations, createTicket, deleteTicket, deletedTickets, importFromHelpDesk, importTickets, isHydrated, purgeTicket, restoreTicket, ticketsOf, tickets, updateTicket]
  );

  return <TicketsContext.Provider value={value}>{children}</TicketsContext.Provider>;
}

export function useTickets() {
  const context = useContext(TicketsContext);
  if (!context) throw new Error("useTickets deve ser utilizado dentro de TicketsProvider.");
  return context;
}
