import { describe, expect, it } from "vitest";

import type { SupportConversation } from "@/models/SupportConversation";

import type { Ticket } from "@/models/Ticket";

import { indexarAtendimentos, indexarConversas } from "./ticketSearchIndex";

const ticket = (id: string, title: string, solution = ""): Ticket =>
  ({ id, title, company: "", solution, projectId: "p1" }) as Ticket;

const conversa = (ticketId: string, corpos: string[]): SupportConversation => ({
  id: `conv-${ticketId}`,
  ticketId,
  messages: corpos.map((body, indice) => ({
    id: `m${indice}`,
    author: "Alguém",
    role: indice % 2 === 0 ? "cliente" : "suporte",
    body,
    createdAt: "2026-08-20T10:00:00.000Z",
  })),
});

describe("indexarConversas", () => {
  /*
    O problema do cliente está dentro da conversa: quem procura "modelo IFC
    deslocado" procura uma frase da terceira mensagem, e não o assunto que o
    robô de triagem gerou.
  */
  it("junta o texto de todas as mensagens por atendimento", () => {
    const indice = indexarConversas([conversa("t1", ["primeira", "segunda", "terceira"])]);

    expect(indice.get("t1")).toContain("primeira");
    expect(indice.get("t1")).toContain("terceira");
  });

  /* Sem acento e sem caixa, porque é assim que a busca compara. */
  it("normaliza para a forma que a busca usa", () => {
    const indice = indexarConversas([conversa("t1", ["Modelo IFC DESLOCADO na Laje"])]);

    expect(indice.get("t1")).toBe("modelo ifc deslocado na laje");
  });

  it("guarda por atendimento, e não por conversa", () => {
    const indice = indexarConversas([conversa("t1", ["um"]), conversa("t2", ["dois"])]);

    expect(indice.get("t1")).toBe("um");
    expect(indice.get("t2")).toBe("dois");
  });

  /*
    Refazer a limpeza a cada tecla seria varrer quatro megabytes por toque: são
    974 conversas e 16.488 mensagens no acervo real.
  */
  it("indexa uma vez por coleção", () => {
    const lista = [conversa("t1", ["um"])];

    expect(indexarConversas(lista)).toBe(indexarConversas(lista));
  });

  it("coleção nova refaz o índice", () => {
    const primeira = indexarConversas([conversa("t1", ["um"])]);
    const segunda = indexarConversas([conversa("t1", ["outro"])]);

    expect(segunda).not.toBe(primeira);
    expect(segunda.get("t1")).toBe("outro");
  });

  it("conversa sem mensagem não quebra", () => {
    expect(indexarConversas([conversa("t1", [])]).get("t1")).toBe("");
  });

  it("lista vazia devolve índice vazio", () => {
    expect(indexarConversas([]).size).toBe(0);
  });
});

describe("indexarAtendimentos", () => {
  it("quebra os campos do atendimento em palavras", () => {
    const indice = indexarAtendimentos([ticket("t1", "Modelo IFC deslocado")]);

    expect(indice.get("t1")).toContain("deslocado");
  });

  /*
    Quatro segundos e meio por tecla, medidos: `searchTerms` sobre o e-mail
    inteiro do suporte, vezes mil atendimentos, vezes cada letra digitada.
  */
  it("indexa uma vez por coleção", () => {
    const lista = [ticket("t1", "um")];

    expect(indexarAtendimentos(lista)).toBe(indexarAtendimentos(lista));
  });

  it("coleção nova refaz o índice", () => {
    const primeira = indexarAtendimentos([ticket("t1", "viga")]);
    const segunda = indexarAtendimentos([ticket("t1", "laje")]);

    expect(segunda).not.toBe(primeira);
    expect(segunda.get("t1")).toContain("laje");
  });
});
