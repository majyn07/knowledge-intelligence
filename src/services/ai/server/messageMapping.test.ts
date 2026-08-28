import { describe, expect, it } from "vitest";

import type { AIChatMessage } from "@/models/AIChatMessage";

import { conversationOf, systemInstructionOf } from "./messageMapping";

const mensagens: AIChatMessage[] = [
  { role: "system", content: "A regra" },
  { role: "system", content: "O artigo inteiro" },
  { role: "user", content: "Resuma" },
  { role: "assistant", content: "Aqui está" },
  { role: "user", content: "E o que falta?" },
];

describe("systemInstructionOf", () => {
  /*
    O defeito que este teste existe para impedir: era `find`, que pegava a
    primeira instrução e descartava as demais em silêncio. O artigo ia no
    segundo bloco, e o modelo respondia "como o artigo não foi fornecido". Sem
    erro em lugar nenhum, com o pedido parecendo certo dos dois lados.
  */
  it("junta todas as instruções de sistema, não só a primeira", () => {
    expect(systemInstructionOf(mensagens)).toBe("A regra\n\nO artigo inteiro");
  });

  it("devolve vazio quando não há instrução", () => {
    expect(systemInstructionOf([{ role: "user", content: "oi" }])).toBe("");
  });

  it("preserva a ordem em que as instruções chegaram", () => {
    const invertidas: AIChatMessage[] = [
      { role: "system", content: "primeiro" },
      { role: "user", content: "meio" },
      { role: "system", content: "segundo" },
    ];

    expect(systemInstructionOf(invertidas)).toBe("primeiro\n\nsegundo");
  });
});

describe("conversationOf", () => {
  it("deixa de fora as instruções de sistema", () => {
    expect(conversationOf(mensagens)).toBe("Resuma\n\nAqui está\n\nE o que falta?");
  });

  it("devolve vazio quando só há instrução", () => {
    expect(conversationOf([{ role: "system", content: "regra" }])).toBe("");
  });
});
