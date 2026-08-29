import { describe, expect, it } from "vitest";

import type { SupportConversation } from "@/models/SupportConversation";
import type { Ticket } from "@/models/Ticket";

import { ticketService } from "./ticketService";
import type { TicketFormData } from "../types/TicketFormData";

/** Relógio fixo: é o que torna `importedAt` verificável. */
const AGORA = new Date("2026-08-27T10:00:00.000Z");

function form(overrides: Partial<TicketFormData> = {}): TicketFormData {
  return {
    title: "  Erro ao autenticar  ",
    company: " Alpha ",
    solution: " Workflow ",
    date: " 15/07/2026 ",
    projectId: "p1",
    externalId: "",
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
  causa: "",
  motivoDeContato: "",
  date: "",
  ...overrides,
});

describe("ticketService.create", () => {
  it("gera o próximo identificador a partir do maior existente", () => {
    const { ticket: created } = ticketService.create(form(), [
      ticket({ id: "45812" }),
      ticket({ id: "45820" }),
    ], AGORA);

    expect(created.id).toBe("45821");
  });

  it("parte de uma base conhecida quando não há atendimentos", () => {
    const { ticket: created } = ticketService.create(form(), [], AGORA);

    expect(created.id).toBe("45001");
  });

  it("ignora identificadores não numéricos ao calcular o próximo", () => {
    const { ticket: created } = ticketService.create(form(), [
      ticket({ id: "hubspot-ticket-abc" }),
      ticket({ id: "45900" }),
    ], AGORA);

    expect(created.id).toBe("45901");
  });

  it("apara os campos de texto", () => {
    const { ticket: created } = ticketService.create(form(), [], AGORA);

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
      [],
      AGORA
    );

    expect(conversation.ticketId).toBe(created.id);
    expect(conversation.messages).toEqual([
      /* Conversa digitada não declara papel, e deduzi-lo do nome seria adivinhar. */
      { id: "m1", author: "Cliente", role: "sistema", body: "Não consigo entrar", createdAt: "09:12" },
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
      [],
      AGORA
    );

    expect(conversation.messages).toHaveLength(1);
    expect(conversation.messages[0].id).toBe("m2");
  });

  it("nomeia o autor ausente em vez de gravar vazio", () => {
    const { conversation } = ticketService.create(
      form({ messages: [{ id: "m1", author: "  ", body: "Algo", createdAt: "" }] }),
      [],
      AGORA
    );

    expect(conversation.messages[0].author).toBe("Sem autor");
  });
});

describe("ticketService.update", () => {
  it("preserva o identificador e substitui os dados", () => {
    const { ticket: updated } = ticketService.update(ticket(), undefined, form(), AGORA);

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

    const { conversation } = ticketService.update(ticket(), existing, form(), AGORA);

    expect(conversation.source).toEqual(existing.source);
    expect(conversation.id).toBe("conversation-45812");
  });

  it("cria a conversa quando o atendimento ainda não tinha uma", () => {
    const { conversation } = ticketService.update(ticket(), undefined, form(), AGORA);

    expect(conversation.id).toBe("conversation-45812");
    expect(conversation.source).toBeUndefined();
  });
});

describe("ticketService e o número de origem", () => {
  it("grava a procedência quando o número é informado", () => {
    const { ticket: created } = ticketService.create(
      form({ externalId: " 47673917220 " }),
      [],
      AGORA
    );

    expect(created.source).toEqual({
      provider: "hubspot",
      externalId: "47673917220",
      importedAt: "2026-08-27T10:00:00.000Z",
    });
  });

  it("não inventa procedência quando o número está vazio", () => {
    const { ticket: created } = ticketService.create(form(), [], AGORA);

    expect(created.source).toBeUndefined();
  });

  /*
    `importedAt` registra quando o vínculo nasceu. Reescrevê-lo a cada gravação
    incidental apagaria o fato, e é o mesmo motivo de a parada de um plano se
    medir pelo histórico e não por `updatedAt`.
  */
  it("preserva a data original quando o número não mudou", () => {
    const original = {
      provider: "hubspot" as const,
      externalId: "47673917220",
      importedAt: "2026-01-05T08:00:00.000Z",
    };

    const { ticket: updated } = ticketService.update(
      ticket({ source: original }),
      undefined,
      form({ externalId: "47673917220" }),
      AGORA
    );

    expect(updated.source).toEqual(original);
  });

  it("carimba data nova quando o número é trocado", () => {
    const { ticket: updated } = ticketService.update(
      ticket({ source: { provider: "hubspot", externalId: "111", importedAt: "2026-01-05" } }),
      undefined,
      form({ externalId: "222" }),
      AGORA
    );

    expect(updated.source?.externalId).toBe("222");
    expect(updated.source?.importedAt).toBe("2026-08-27T10:00:00.000Z");
  });

  it("remove a procedência quando o número é apagado", () => {
    const { ticket: updated } = ticketService.update(
      ticket({ source: { provider: "hubspot", externalId: "111", importedAt: "2026-01-05" } }),
      undefined,
      form({ externalId: "  " }),
      AGORA
    );

    expect(updated.source).toBeUndefined();
  });

  it("devolve o número ao formulário para edição", () => {
    const data = ticketService.toFormData(
      ticket({ source: { provider: "hubspot", externalId: "999", importedAt: "2026-01-05" } }),
      undefined
    );

    expect(data.externalId).toBe("999");
  });

  it("devolve vazio quando o atendimento não tem origem", () => {
    expect(ticketService.toFormData(ticket(), undefined).externalId).toBe("");
  });
});

describe("ticketService.toFormData", () => {
  it("devolve o atendimento e a conversa prontos para edição", () => {
    const data = ticketService.toFormData(ticket({ title: "Caso" }), {
      id: "c1",
      ticketId: "45812",
      messages: [
        { id: "m1", author: "Cliente", role: "cliente" as const, body: "Oi", createdAt: "09:00" },
      ],
    });

    expect(data.title).toBe("Caso");
    expect(data.messages).toHaveLength(1);
  });

  it("devolve lista vazia quando não há conversa", () => {
    expect(ticketService.toFormData(ticket(), undefined).messages).toEqual([]);
  });
});
