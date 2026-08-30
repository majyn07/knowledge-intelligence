import { describe, expect, it } from "vitest";

import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

import { montarPedidoDeCobertura, TRECHO } from "./coverageRequest";

let sequencia = 0;

const artigo = (extra: Partial<KnowledgeArticle> = {}): KnowledgeArticle => ({
  id: `art-${(sequencia += 1)}`,
  title: "Exportando o modelo IFC do Eberick",
  summary: "Passo a passo da exportação do IFC",
  content: "Para exportar o IFC do Eberick, abra o menu Arquivo e escolha Exportar.",
  contentFormat: "markdown",
  projectId: "",
  genreId: "",
  status: "published",
  sectionId: "sec-ifc",
  tags: [],
  keywords: [],
  author: "",
  createdAt: new Date("2026-08-01T10:00:00.000Z"),
  updatedAt: new Date("2026-08-01T10:00:00.000Z"),
  ...extra,
});

const material = "Como exportar o modelo IFC do Eberick sem que ele abra deslocado da origem";

describe("montarPedidoDeCobertura", () => {
  it("leva o material e os artigos próximos", () => {
    const alvo = artigo();

    const pedido = montarPedidoDeCobertura({
      articles: [alvo],
      material,
      sectionId: "",
    });

    expect(pedido.material).toBe(material);
    expect(pedido.candidatos.map((c) => c.id)).toEqual([alvo.id]);
  });

  /*
    A mesma regra da cobertura documental em todo o produto: rascunho e revisão
    não respondem ninguém, e apontá-los como "o acervo já cobre" mandaria alguém
    confiar num texto que não está no ar.
  */
  it("só artigo publicado entra", () => {
    const pedido = montarPedidoDeCobertura({
      articles: [artigo({ status: "draft" }), artigo({ status: "review" })],
      material,
      sectionId: "sec-ifc",
    });

    expect(pedido.candidatos).toEqual([]);
    expect(pedido.modelos).toEqual([]);
  });

  it("não se compara um artigo consigo mesmo", () => {
    const emEdicao = artigo();

    const pedido = montarPedidoDeCobertura({
      articles: [emEdicao],
      material,
      sectionId: "sec-ifc",
      excludeId: emEdicao.id,
    });

    expect(pedido.candidatos).toEqual([]);
    expect(pedido.modelos).toEqual([]);
  });

  /*
    O trecho sai do **conteúdo**, e não do resumo: julgar cobertura lendo título
    e resumo é o mesmo que a busca léxica já fazia.
  */
  it("o trecho sai do conteúdo do artigo", () => {
    const pedido = montarPedidoDeCobertura({
      articles: [artigo({ content: "Abra o menu Arquivo e escolha Exportar para IFC." })],
      material,
      sectionId: "",
    });

    expect(pedido.candidatos[0].excerpt).toContain("menu Arquivo");
  });

  /* HTML do portal vira texto: o modelo não deve gastar contexto com marcação. */
  it("artigo em HTML entra sem as tags", () => {
    const pedido = montarPedidoDeCobertura({
      articles: [
        artigo({
          contentFormat: "html",
          content: "<h2>Exportar</h2><p>Abra o menu <b>Arquivo</b>.</p>",
        }),
      ],
      material,
      sectionId: "",
    });

    expect(pedido.candidatos[0].excerpt).not.toContain("<");
    expect(pedido.candidatos[0].excerpt).toContain("Arquivo");
  });

  it("artigo longo entra cortado no teto", () => {
    const pedido = montarPedidoDeCobertura({
      articles: [artigo({ content: "exportar ".repeat(5_000) })],
      material,
      sectionId: "",
    });

    expect(pedido.candidatos[0].excerpt.length).toBe(TRECHO);
  });

  /*
    Os modelos são os artigos da mesma seção: o mais próximo em assunto, saindo
    da taxonomia que já existe.
  */
  it("os modelos vêm da seção de destino", () => {
    const daSecao = artigo({ sectionId: "sec-ifc", title: "Exportando para o Revit" });
    const deOutra = artigo({ sectionId: "sec-licenca", title: "Ativando a licença" });

    const pedido = montarPedidoDeCobertura({
      articles: [daSecao, deOutra],
      material,
      sectionId: "sec-ifc",
    });

    expect(pedido.modelos.map((m) => m.title)).toEqual(["Exportando para o Revit"]);
  });

  /* Sem seção escolhida não há modelo, e o prompt diz isso em vez de fingir. */
  it("sem seção, nenhum modelo", () => {
    const pedido = montarPedidoDeCobertura({
      articles: [artigo({ sectionId: "sec-ifc" })],
      material,
      sectionId: "",
    });

    expect(pedido.modelos).toEqual([]);
  });

  /*
    Sem teto, alguém com uma seção de duzentos artigos mandaria os duzentos num
    prompt só e receberia uma resposta truncada que ninguém saberia estar
    truncada.
  */
  it("respeita os tetos de candidatos e de modelos", () => {
    const muitos = Array.from({ length: 20 }, () => artigo({ sectionId: "sec-ifc" }));

    const pedido = montarPedidoDeCobertura({
      articles: muitos,
      material,
      sectionId: "sec-ifc",
    });

    expect(pedido.candidatos.length).toBeLessThanOrEqual(5);
    expect(pedido.modelos.length).toBeLessThanOrEqual(3);
  });

  it("material longo demais entra cortado", () => {
    const pedido = montarPedidoDeCobertura({
      articles: [],
      material: "a".repeat(80_000),
      sectionId: "",
    });

    expect(pedido.material.length).toBe(60_000);
  });

  it("acervo vazio devolve pedido sem evidência, e não quebra", () => {
    const pedido = montarPedidoDeCobertura({ articles: [], material, sectionId: "sec-ifc" });

    expect(pedido).toMatchObject({ candidatos: [], modelos: [] });
  });
});
