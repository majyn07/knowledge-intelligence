import { describe, expect, it } from "vitest";

import type { SupportConversation } from "@/models/SupportConversation";

import { enfeiteDaConversa, prepararTranscrito } from "./transcript";

const conversa = (
  ticketId: string,
  falas: [SupportConversation["messages"][number]["role"], string][]
): SupportConversation => ({
  id: `c-${ticketId}`,
  ticketId,
  messages: falas.map(([role, body], i) => ({
    id: `${ticketId}-${i}`,
    author: role === "cliente" ? "Cliente" : "Suporte",
    role,
    body,
    createdAt: "2026-08-20T10:00:00.000Z",
  })),
});

const lote = (quantas: number, monta: (i: number) => SupportConversation) =>
  Array.from({ length: quantas }, (_, i) => monta(i));

describe("enfeiteDaConversa", () => {
  /*
    Aqui entram **todos os papéis**, ao contrário da triagem: o rodapé do
    suporte pesa tanto quanto o do cliente, e é ele que aparece em 67% das
    conversas ("Atenciosamente,").
  */
  it("o rodapé do suporte também é enfeite", () => {
    const enfeite = enfeiteDaConversa(
      lote(50, (i) =>
        conversa(`t${i}`, [
          ["cliente", `Problema específico ${i}`],
          ["suporte", "Atenciosamente,\n\nEquipe AltoQi"],
        ])
      )
    );

    expect(enfeite.has("atenciosamente,")).toBe(true);
    expect(enfeite.has("problema específico 1")).toBe(false);
  });

  it("indexa uma vez por coleção", () => {
    const lista = lote(50, (i) => conversa(`t${i}`, [["suporte", "Atenciosamente,"]]));

    expect(enfeiteDaConversa(lista)).toBe(enfeiteDaConversa(lista));
  });

  it("acervo raso não transforma tudo em enfeite", () => {
    const enfeite = enfeiteDaConversa([
      conversa("t1", [["cliente", "A viga some ao recalcular"]]),
      conversa("t2", [["cliente", "O modelo IFC abre deslocado"]]),
    ]);

    expect(enfeite.size).toBe(0);
  });
});

describe("prepararTranscrito", () => {
  it("tira o enfeite e mantém o que descreve", () => {
    const alvo = conversa("t1", [
      ["cliente", "O modelo IFC abre deslocado.\n\nAtenciosamente,"],
      ["suporte", "Vamos verificar.\n\nAtenciosamente,"],
    ]);

    const { messages } = prepararTranscrito(alvo, new Set(["atenciosamente,"]));

    expect(messages.map((m) => m.body)).toEqual([
      "O modelo IFC abre deslocado.",
      "Vamos verificar.",
    ]);
  });

  /* Linha de autor sem corpo só ocupa espaço no pedido. */
  it("mensagem que era só enfeite sai da conversa", () => {
    const alvo = conversa("t1", [
      ["cliente", "Estou ciente e desejo continuar"],
      ["cliente", "A licença não ativa."],
    ]);

    const preparado = prepararTranscrito(alvo, new Set(["estou ciente e desejo continuar"]));

    expect(preparado.messages).toHaveLength(1);
    expect(preparado.messages[0].body).toBe("A licença não ativa.");
  });

  /*
    A maior conversa do acervo tem 407.519 caracteres, cerca de cem mil tokens
    num pedido só. Sem teto, ela chega perto do limite do modelo e volta
    cortada sem ninguém saber por quê.
  */
  it("corta no teto e avisa", () => {
    const alvo = conversa("t1", [
      ["cliente", "a".repeat(30_000)],
      ["suporte", "b".repeat(30_000)],
    ]);

    const preparado = prepararTranscrito(alvo, new Set());

    expect(preparado.truncated).toBe(true);
    expect(preparado.messages).toHaveLength(1);
  });

  /*
    Corta pelo fim: numa conversa de suporte o problema é descrito no início, e
    o fim costuma ser confirmação e despedida. Cortar a cabeça deixaria o
    modelo com a resposta e sem a pergunta.
  */
  it("o começo da conversa é o que fica", () => {
    const alvo = conversa("t1", [
      ["cliente", "O problema é este"],
      ["suporte", "c".repeat(45_000)],
    ]);

    const preparado = prepararTranscrito(alvo, new Set());

    expect(preparado.messages[0].body).toBe("O problema é este");
    expect(preparado.truncated).toBe(true);
  });

  /*
    Devolver conversa vazia porque a primeira fala é longa seria pior que
    devolver metade dela — e a ressalva diz que foi cortada.
  */
  it("uma fala sozinha maior que o teto entra cortada", () => {
    const alvo = conversa("t1", [["cliente", "d".repeat(60_000)]]);

    const preparado = prepararTranscrito(alvo, new Set());

    expect(preparado.messages).toHaveLength(1);
    expect(preparado.messages[0].body.length).toBe(40_000);
    expect(preparado.truncated).toBe(true);
  });

  it("conversa curta atravessa inteira e sem ressalva", () => {
    const alvo = conversa("t1", [["cliente", "A viga some ao recalcular"]]);

    expect(prepararTranscrito(alvo, new Set())).toMatchObject({ truncated: false });
  });

  it("sem conversa devolve vazio", () => {
    expect(prepararTranscrito(undefined, new Set())).toEqual({
      messages: [],
      truncated: false,
    });
  });
});
