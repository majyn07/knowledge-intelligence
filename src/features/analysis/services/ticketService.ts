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
      /*
        Conversa digitada à mão não declara papel, e deduzi-lo do nome do autor
        seria adivinhar. O formulário ganha o campo quando alguém precisar dele.
      */
      role: "sistema" as const,
      body: message.body.trim(),
      createdAt: message.createdAt.trim(),
    }));
}

/**
 * A procedência, quando há número de origem.
 *
 * `importedAt` é o momento em que o vínculo foi registrado. Na importação é
 * quando o lote entrou, aqui é quando alguém digitou o número. O relógio vem
 * de fora porque serviço que lê a hora sozinho não tem como ser testado.
 */
function externalSource(externalId: string, now: Date) {
  const limpo = externalId.trim();
  if (!limpo) return {};

  return {
    source: {
      provider: "hubspot" as const,
      externalId: limpo,
      importedAt: now.toISOString(),
    },
  };
}

export const ticketService = {
  create(data: TicketFormData, existing: Ticket[], now: Date) {
    const id = nextTicketId(existing);

    const ticket: Ticket = {
      id,
      projectId: data.projectId,
      title: data.title.trim(),
      solution: data.solution.trim(),
      company: data.company.trim(),
      /* Cadastro à mão não classifica: quem classifica é o suporte, na HubSpot. */
      causa: "",
      motivoDeContato: "",
      date: data.date.trim(),
      ...externalSource(data.externalId, now),
    };

    const conversation: SupportConversation = {
      id: `conversation-${id}`,
      ticketId: id,
      messages: normalizeMessages(data),
    };

    return { ticket, conversation };
  },

  update(
    ticket: Ticket,
    conversation: SupportConversation | undefined,
    data: TicketFormData,
    now: Date
  ) {
    /*
      Número inalterado preserva o `importedAt` original: ele registra quando
      aquele vínculo nasceu, e reescrevê-lo a cada gravação incidental apagaria
      o fato. Só número novo (ou trocado) carimba data nova.
    */
    const informado = data.externalId.trim();
    const procedencia =
      informado && informado === ticket.source?.externalId
        ? { source: ticket.source }
        : externalSource(informado, now);

    /*
      Montado campo a campo em vez de espalhar o registro antigo: apagar o
      número precisa apagar a procedência junto, e `...ticket` a traria de
      volta por baixo.
    */
    const updated: Ticket = {
      id: ticket.id,
      projectId: data.projectId,
      title: data.title.trim(),
      solution: data.solution.trim(),
      company: data.company.trim(),
      date: data.date.trim(),
      /*
        O que o formulário não edita, ele preserva.

        Campo a campo tem um preço: o campo que entra no modelo depois e não é
        citado aqui some na primeira edição, sem erro nenhum. `raw` é de onde a
        lista tira o nome do cliente e o número do chamado, e a classificação do
        suporte não é nossa para reescrever — corrigir a data de um atendimento
        apagaria os três.
      */
      causa: ticket.causa,
      motivoDeContato: ticket.motivoDeContato,
      ...(ticket.raw ? { raw: ticket.raw } : {}),
      ...(ticket.deletedAt ? { deletedAt: ticket.deletedAt } : {}),
      ...procedencia,
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
      externalId: ticket.source?.externalId ?? "",
      messages: (conversation?.messages ?? []).map((message) => ({
        id: message.id,
        author: message.author,
        body: message.body,
        createdAt: message.createdAt,
      })),
    };
  },
};
