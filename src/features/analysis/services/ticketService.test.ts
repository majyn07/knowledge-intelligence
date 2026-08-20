import { describe, expect, it } from "vitest";

import type { SupportConversation } from "@/models/SupportConversation";
import type { Ticket } from "@/models/Ticket";

import { ticketService } from "./ticketService";
import type { TicketFormData } from "../types/TicketFormData";

function form(overrides: Partial<TicketFormData> = {}): TicketFormData {
  return {
    title: "  Erro ao autenticar  ",
    company: " Alpha ",
    solution: " Workflow ",
    date: " 15/07/2026 ",
    projectId: "p1",
    messages: [],
    ...overrides,
  };
}

const ticket = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: "45812",
  projectId: "p1",
  title: "Antigo",
  solution: "",
  company: "",
  date: "",
  ...overrides,
});

describe("ticketService.create", () => {
  it("gera o próximo identificador a partir do maior existente", () => {
    const { ticket: created } = ticketService.create(form(), [
      ticket({ id: "45812" }),
      ticket({ id: "45820" }),
    ]);

    expect(created.id).toBe("45821");
  });

  it("parte de uma base conhecida quando não há atendimentos", () => {
    const { ticket: created } = ticketService.create(form(), []);

    expect(created.id).toBe("45001");
  });

  it("ignora identificadores não numéricos ao calcular o próximo", () => {
    const { ticket: created } = ticketService.create(form(), [
      ticket({ id: "hubspot-ticket-abc" }),
      ticket({ id: "45900" }),
    ]);

    expect(created.id).toBe("45901");
  });

  it("apara os campos de texto", () => {
    const { ticket: created } = ticketService.create(form(), []);

    expect(created.title).toBe("Erro ao autenticar");
    expect(created.company).toBe("Alpha");
    expect(created.solution).toBe("Workflow");
    expect(created.date).toBe("15/07/2026");
  });

  it("cria a conversa vinculada ao atendimento", () => {
    const { ticket: created, conversation } = ticketService.create(
      form({
        messages: [
          { id: "m1", author: " Cliente ", body: " Não consigo entrar ", createdAt: " 09:12 " },
        ],
      }),
      []
    );

    expect(conversation.ticketId).toBe(created.id);
    expect(conversation.messages).toEqual([
      { id: "m1", author: "Cliente", body: "Não consigo entrar", createdAt: "09:12" },
    ]);
  });

  it("descarta mensagens sem conteúdo", () => {
    const { conversation } = ticketService.create(
      form({
        messages: [
          { id: "m1", author: "Cliente", body: "   ", createdAt: "" },
          { id: "m2", author: "Suporte", body: "Resolvido", createdAt: "" },
        ],
      }),
      []
    );

    expect(conversation.messages).toHaveLength(1);
    expect(conversation.messages[0].id).toBe("m2");
  });

  it("nomeia o autor ausente em vez de gravar vazio", () => {
    const { conversation } = ticketService.create(
      form({ messages: [{ id: "m1", author: "  ", body: "Algo", createdAt: "" }] }),
      []
    );

    expect(conversation.messages[0].author).toBe("Sem autor");
  });
});

describe("ticketService.update", () => {
  it("preserva o identificador e substitui os dados", () => {
    const { ticket: updated } = ticketService.update(ticket(), undefined, form());

    expect(updated.id).toBe("45812");
    expect(updated.title).toBe("Erro ao autenticar");
  });

  it("preserva a proveniência externa da conversa", () => {
    const existing: SupportConversation = {
      id: "conversation-45812",
      ticketId: "45812",
      messages: [],
      source: { provider: "hubspot", externalId: "abc", importedAt: "2026-01-01" },
    };

    const { conversation } = ticketService.update(ticket(), existing, form());

    expect(conversation.source).toEqual(existing.source);
    expect(conversation.id).toBe("conversation-45812");
  });

  it("cria a conversa quando o atendimento ainda não tinha uma", () => {
    const { conversation } = ticketService.update(ticket(), undefined, form());

    expect(conversation.id).toBe("conversation-45812");
    expect(conversation.source).toBeUndefined();
  });
});

describe("ticketService.toFormData", () => {
  it("devolve o atendimento e a conversa prontos para edição", () => {
    const data = ticketService.toFormData(ticket({ title: "Caso" }), {
      id: "c1",
      ticketId: "45812",
      messages: [{ id: "m1", author: "Cliente", body: "Oi", createdAt: "09:00" }],
    });

    expect(data.title).toBe("Caso");
    expect(data.messages).toHaveLength(1);
  });

  it("devolve lista vazia quando não há conversa", () => {
    expect(ticketService.toFormData(ticket(), undefined).messages).toEqual([]);
  });
});
