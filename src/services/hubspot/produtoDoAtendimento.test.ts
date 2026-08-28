import { describe, expect, it } from "vitest";

import { produtosConhecidos, produtosNoTexto } from "./produtoDoAtendimento";

describe("produtosNoTexto", () => {
  /* Formato real do assunto que a HubSpot gera. */
  it("lê o produto do assunto do chamado", () => {
    expect(produtosNoTexto("Ticket AltoQi nº47954714157 - Falha Abrir Software - Builder")).toEqual(
      ["AltoQi Builder"]
    );
  });

  it("lê mais de um quando o atendimento cita mais de um", () => {
    expect(
      produtosNoTexto("Ticket AltoQi nº47968252511 - Dúvida Uso Funcionalidade - Eberick, Builder")
    ).toEqual(["AltoQi Builder", "AltoQi Eberick"]);
  });

  it("acha o produto no meio da frase, e não só no fim", () => {
    expect(produtosNoTexto("Importar IFC no Eberick")).toEqual(["AltoQi Eberick"]);
  });

  it("acha sem acento e sem caixa", () => {
    expect(produtosNoTexto("ACESSO AO ALTOQI EDUCATION")).toEqual(["AltoQi Education"]);
    expect(produtosNoTexto("problema na Área do Cliente")).toEqual(["Área do Cliente"]);
  });

  /* Os nomes antigos continuam aparecendo em atendimento de cliente. */
  it("reconhece o nome antigo do produto", () => {
    expect(produtosNoTexto("Download do QiBuilder e Eberick")).toEqual([
      "AltoQi Builder",
      "AltoQi Eberick",
    ]);
  });

  /*
    Casar por trecho faria "licenca" dentro de "licenciamento" produzir os dois,
    e um atendimento sobre licenciamento não é sobre dois produtos.
  */
  it("casa por palavra inteira", () => {
    expect(produtosNoTexto("Dúvida sobre licenciamento")).toEqual(["Licenciamento"]);
  });

  /*
    Vazio é resposta legítima: melhor campo em branco que produto chutado, que
    ninguém saberia ter sido chute.
  */
  it("devolve vazio quando o texto não cita produto nenhum", () => {
    expect(produtosNoTexto("Multa cancelamento MARIANA PESCA ARQUITETURA")).toEqual([]);
    expect(produtosNoTexto("Re: AltoQi - Cobrança rejeitada")).toEqual([]);
    expect(produtosNoTexto("")).toEqual([]);
  });

  /*
    Quem diz qual programa está usando é o cliente, e nem sempre no título. O
    assunto vem genérico e o produto aparece no meio da conversa.
  */
  it("acha o produto na fala do cliente quando o título não diz", () => {
    const titulo = "Não consigo abrir o projeto";
    const fala = "Bom dia, estou usando o Eberick 2024 e ele fecha ao carregar";

    expect(produtosNoTexto(titulo)).toEqual([]);
    expect(produtosNoTexto([titulo, fala].join(" "))).toEqual(["AltoQi Eberick"]);
  });

  it("não repete o produto citado duas vezes", () => {
    expect(produtosNoTexto("Builder trava, o Builder fecha sozinho")).toEqual(["AltoQi Builder"]);
  });
});

describe("produtosConhecidos", () => {
  it("lista os rótulos para a tela não inventar nome", () => {
    const nomes = produtosConhecidos();

    expect(nomes).toContain("AltoQi Builder");
    expect(nomes).toContain("AltoQi Visus");
    expect(new Set(nomes).size).toBe(nomes.length);
  });
});
