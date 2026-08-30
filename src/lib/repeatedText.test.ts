import { describe, expect, it } from "vitest";

import { chaveDoTrecho, paragrafosDe, trechosRepetidosEm } from "./repeatedText";

const lote = (quantas: number, texto: string) =>
  Array.from({ length: quantas }, () => [texto]);

describe("trechosRepetidosEm", () => {
  /*
    Medido nas 974 conversas: 8.717 dos 9.005 parágrafos aparecem numa conversa
    só, e acima de 2% sobra o que é enfeite de verdade.
  */
  it("trecho repetido em muitas conversas é enfeite", () => {
    const repetidos = trechosRepetidosEm(
      [...lote(50, "Atenciosamente,"), ["A viga some ao recalcular"]],
      (fala) => fala
    );

    expect(repetidos.has("atenciosamente,")).toBe(true);
    expect(repetidos.has("a viga some ao recalcular")).toBe(false);
  });

  /* Quem repete dentro da mesma conversa não a torna mais repetida. */
  it("conta por conversa, e não por ocorrência", () => {
    const repetidos = trechosRepetidosEm(
      [["ok", "ok", "ok", "ok", "ok"], ...lote(99, "descrição diferente")],
      (fala) => fala
    );

    expect(repetidos.has("ok")).toBe(false);
  });

  /*
    Com duas conversas, 2% dá 0,04 e qualquer trecho passaria — a descrição
    inteira viraria enfeite e a triagem cairia no título.
  */
  it("acervo raso não transforma tudo em enfeite", () => {
    const repetidos = trechosRepetidosEm(
      [["A inércia fissurada não bate"], ["A flecha continua alta"]],
      (fala) => fala
    );

    expect(repetidos.size).toBe(0);
  });

  /* O alcance é de quem chama: a triagem ouve só o cliente, a IA ouve todos. */
  it("quem chama escolhe o que entra na conta", () => {
    const conversas = Array.from({ length: 50 }, () => ({
      cliente: ["Problema único"],
      suporte: ["Atenciosamente,"],
    }));

    expect(trechosRepetidosEm(conversas, (c) => c.cliente).has("atenciosamente,")).toBe(false);
    expect(trechosRepetidosEm(conversas, (c) => c.suporte).has("atenciosamente,")).toBe(true);
  });

  it("sem conversa nenhuma, nada é enfeite", () => {
    expect(trechosRepetidosEm([], () => []).size).toBe(0);
  });
});

describe("chaveDoTrecho", () => {
  it("caixa e espaço não criam dois trechos", () => {
    expect(chaveDoTrecho("  Setup e  Suporte ao Produto ")).toBe(
      chaveDoTrecho("setup e suporte ao produto")
    );
  });
});

describe("paragrafosDe", () => {
  it("separa por linha em branco e corta o que vem pendurado", () => {
    expect(paragrafosDe("O erro aparece.\n\nAtenciosamente,\n--\nFulano")).toEqual([
      "O erro aparece.",
      "Atenciosamente,",
    ]);
  });

  it("mensagem vazia não vira parágrafo", () => {
    expect(paragrafosDe("   \n\n  ")).toEqual([]);
  });
});
