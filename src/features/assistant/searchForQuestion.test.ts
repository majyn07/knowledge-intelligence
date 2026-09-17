import { describe, expect, it } from "vitest";

import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

import { ENCONTRADOS_NO_PEDIDO, encontrarNoAcervo } from "./searchForQuestion";

let sequencia = 0;

const artigo = (extra: Partial<KnowledgeArticle> = {}): KnowledgeArticle => ({
  id: `art-${(sequencia += 1)}`,
  title: "Exportando o modelo IFC do Eberick",
  summary: "Passo a passo da exportação",
  content: "Abra o menu Arquivo e escolha Exportar para IFC.",
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

describe("encontrarNoAcervo", () => {
  /*
    A pergunta mais óbvia que alguém faz no assistente: "isto já existe?". Sem
    isto ele dizia que não alcançava o acervo, que era verdade e era inútil.
  */
  it("acha o artigo que casa com a pergunta, com trecho", () => {
    const alvo = artigo();

    const achados = encontrarNoAcervo(
      [alvo, artigo({ title: "Ativando a licença", content: "Abra a área do cliente." })],
      "já existe artigo sobre exportar IFC do Eberick?"
    );

    expect(achados.map((a) => a.id)).toEqual([alvo.id]);
    expect(achados[0].excerpt).toContain("menu Arquivo");
  });

  /* Rascunho não responde ninguém, e apontá-lo como "já existe" engana. */
  it("só artigo publicado entra", () => {
    const achados = encontrarNoAcervo(
      [artigo({ status: "draft" })],
      "exportar IFC do Eberick"
    );

    expect(achados).toEqual([]);
  });

  it("pergunta sem relação devolve vazio, e o modelo diz que não achou", () => {
    expect(encontrarNoAcervo([artigo()], "quantos planos existem?")).toEqual([]);
  });

  it("respeita o teto", () => {
    const muitos = Array.from({ length: 20 }, () => artigo());

    expect(encontrarNoAcervo(muitos, "exportar IFC").length).toBeLessThanOrEqual(
      ENCONTRADOS_NO_PEDIDO
    );
  });
});
