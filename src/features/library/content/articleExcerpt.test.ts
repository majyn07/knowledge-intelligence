import { describe, expect, it } from "vitest";

import { excerptAround, foldText } from "./articleExcerpt";

const texto =
  "No decorrer de um projeto, devido a quantidade de elementos lançados, " +
  "pode ser necessário ocultar elementos para tornar a visualização mais limpa " +
  "e organizada na plataforma AltoQi Builder.";

describe("foldText", () => {
  it("tira acento e caixa preservando o tamanho", () => {
    expect(foldText("Seção")).toBe("secao");
    expect(foldText("Seção")).toHaveLength("Seção".length);
  });
});

describe("excerptAround", () => {
  it("devolve o pedaço em volta da ocorrência", () => {
    const trecho = excerptAround(texto, "ocultar")!;

    expect(trecho.match).toBe("ocultar");
    expect(trecho.before).toContain("necessário");
    expect(trecho.after).toContain("elementos");
  });

  /* Quem digita sem acento tem de achar: exigir o acento certo é fazer errar duas vezes. */
  it("encontra sem acento e devolve o texto como está escrito", () => {
    const trecho = excerptAround("a visualização do projeto", "visualizacao")!;
    expect(trecho.match).toBe("visualização");
  });

  it("marca reticências só onde houve corte", () => {
    // Raio curto força o corte dos dois lados.
    const cortado = excerptAround(texto, "ocultar", 20)!;
    expect(cortado.before.startsWith("…")).toBe(true);
    expect(cortado.after.endsWith("…")).toBe(true);

    // Raio largo alcança as duas pontas: nada a marcar.
    const inteiro = excerptAround(texto, "ocultar", 500)!;
    expect(inteiro.before.startsWith("…")).toBe(false);
    expect(inteiro.after.endsWith("…")).toBe(false);
  });

  it("não corta no meio de uma palavra à esquerda", () => {
    const trecho = excerptAround(texto, "visualização")!;
    // Depois das reticências vem palavra inteira, nunca um pedaço dela.
    expect(trecho.before.replace("…", "").startsWith(" ")).toBe(false);
    expect(texto).toContain(trecho.before.replace("…", ""));
  });

  it("devolve nulo quando não encontra", () => {
    expect(excerptAround(texto, "supercalifragilistico")).toBeNull();
  });

  it("devolve nulo para termo curto demais", () => {
    expect(excerptAround(texto, "a")).toBeNull();
    expect(excerptAround(texto, "  ")).toBeNull();
  });

  it("não põe reticências quando a ocorrência está no começo", () => {
    const trecho = excerptAround("Ocultar elementos do projeto", "ocultar")!;
    expect(trecho.before).toBe("");
  });
});
