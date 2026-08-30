import { describe, expect, it } from "vitest";

import type { SupportConversation } from "@/models/SupportConversation";

import { falaDoCliente, falasDeBotao } from "./clientVoice";

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

/** Um lote de conversas idênticas, para o limiar de 2% ter onde morder. */
const muitas = (fala: string, quantas: number) =>
  Array.from({ length: quantas }, (_, i) => conversa(`t${i}`, [["cliente", fala]]));

describe("falasDeBotao", () => {
  /*
    Medido nas 974 do acervo: 5.318 falas distintas do cliente, e 5.148
    aparecem numa conversa só. Passando de 2%, sobram dezoito — e as dezoito
    são clique de menu ou saudação.
  */
  it("fala repetida em muitas conversas é botão, não descrição", () => {
    const botoes = falasDeBotao([
      ...muitas("Estou ciente e desejo continuar", 50),
      conversa("x", [["cliente", "O modelo IFC abre deslocado"]]),
    ]);

    expect(botoes.has("estou ciente e desejo continuar")).toBe(true);
    expect(botoes.has("o modelo ifc abre deslocado")).toBe(false);
  });

  it("fala de uma conversa só nunca é botão", () => {
    const botoes = falasDeBotao([
      ...muitas("qualquer coisa", 50),
      conversa("x", [["cliente", "A viga some ao recalcular"]]),
    ]);

    expect(botoes.has("a viga some ao recalcular")).toBe(false);
  });

  /*
    Clicar cinco vezes no mesmo botão não o torna mais botão do que já era.

    Cem conversas põem o limiar em duas: contada por mensagem, a repetição
    dentro de **uma** conversa passaria; contada por conversa, não.
  */
  it("conta por conversa, e não por mensagem", () => {
    const botoes = falasDeBotao([
      conversa("t1", [
        ["cliente", "ok"],
        ["cliente", "ok"],
        ["cliente", "ok"],
        ["cliente", "ok"],
        ["cliente", "ok"],
      ]),
      ...Array.from({ length: 99 }, (_, i) =>
        conversa(`u${i}`, [["cliente", `descrição única ${i}`]])
      ),
    ] as SupportConversation[]);

    expect(botoes.has("ok")).toBe(false);
  });

  /* O mesmo botão chega com caixa e espaço diferentes conforme o canal. */
  it("caixa e espaço não criam dois botões", () => {
    const botoes = falasDeBotao([
      ...muitas("Setup e Suporte ao Produto", 25),
      ...muitas("  setup e  suporte ao produto  ", 25),
    ]);

    expect(botoes.has("setup e suporte ao produto")).toBe(true);
  });

  /* O que o suporte respondeu não é fala do cliente. */
  it("só a voz do cliente entra na conta", () => {
    const botoes = falasDeBotao(
      Array.from({ length: 50 }, (_, i) =>
        conversa(`t${i}`, [["suporte", "Atenciosamente, equipe AltoQi"]])
      )
    );

    expect(botoes.size).toBe(0);
  });

  it("indexa uma vez por coleção", () => {
    const lista = muitas("ok", 50);

    expect(falasDeBotao(lista)).toBe(falasDeBotao(lista));
  });

  it("sem conversa nenhuma, nenhum botão", () => {
    expect(falasDeBotao([]).size).toBe(0);
  });
});

describe("falaDoCliente", () => {
  it("junta o que o cliente descreveu", () => {
    const texto = falaDoCliente(
      conversa("t1", [
        ["cliente", "O modelo IFC abre deslocado"],
        ["suporte", "Bom dia, atenciosamente"],
        ["cliente", "acontece desde a atualização"],
      ]),
      new Set()
    );

    expect(texto).toBe("O modelo IFC abre deslocado acontece desde a atualização");
  });

  /*
    O clique não descreve nada, e era ele que dominava: "estou ciente e desejo
    continuar" aparece em 44% das conversas.
  */
  it("o que foi clicado fica de fora", () => {
    const texto = falaDoCliente(
      conversa("t1", [
        ["cliente", "Estou ciente e desejo continuar"],
        ["cliente", "A viga some ao recalcular"],
      ]),
      new Set(["estou ciente e desejo continuar"])
    );

    expect(texto).toBe("A viga some ao recalcular");
  });

  /*
    Vazio é resposta, e quem chama decide: na triagem, é voltar para o título,
    que é pouco mas é do atendimento.
  */
  it("conversa só de cliques devolve vazio", () => {
    expect(falaDoCliente(conversa("t1", [["cliente", "ok"]]), new Set(["ok"]))).toBe("");
  });

  it("sem conversa devolve vazio", () => {
    expect(falaDoCliente(undefined, new Set())).toBe("");
  });
});
