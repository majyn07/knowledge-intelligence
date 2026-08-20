import { describe, expect, it } from "vitest";

import { normalizeEvent, parseEvents } from "./normalizeEvent";

const evento = {
  id: "ev1",
  at: "2026-05-01T10:00:00.000Z",
  type: "article_published",
  projectId: "p1",
  actor: "Raoni Milioli da Silva",
  subject: { kind: "article", id: "a1", label: "Erro ao autenticar" },
  detail: "Rascunho → Publicado",
};

describe("normalizeEvent", () => {
  it("preserva o evento bem formado", () => {
    const result = normalizeEvent({ ...evento, type: "article_updated" });

    expect(result.type).toBe("article_updated");
    expect(result.subject.label).toBe("Erro ao autenticar");
  });

  it("tipo desconhecido não some do histórico, cai no genérico", () => {
    // O histórico é acrescentado e nunca editado: um evento gravado por versão
    // anterior precisa continuar visível, ainda que com rótulo impreciso.
    const result = normalizeEvent(evento);

    expect(result.type).toBe("project_updated");
    expect(result.detail).toBe("Rascunho → Publicado");
  });

  it("assunto ausente vira assunto vazio em vez de derrubar a lista", () => {
    const result = normalizeEvent({ id: "ev2" });

    expect(result.subject).toEqual({ kind: "project", id: "", label: "" });
  });

  it("gera identificador quando o registro não tem", () => {
    expect(normalizeEvent({ at: "x" }).id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("sobrevive a conteúdo que não é objeto", () => {
    expect(() => normalizeEvent("texto solto")).not.toThrow();
  });
});

describe("parseEvents", () => {
  it("devolve vazio quando o conteúdo não é uma lista", () => {
    expect(parseEvents('{"a":1}')).toEqual([]);
  });

  it("normaliza a coleção inteira", () => {
    expect(parseEvents(JSON.stringify([evento, { id: "ev3" }]))).toHaveLength(2);
  });
});
