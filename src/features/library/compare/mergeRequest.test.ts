import { describe, expect, it } from "vitest";

import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import { TEXTO_NO_PEDIDO } from "@/services/ai/library/mergeAdvice";

import { montarPedidoDeComparacao } from "./mergeRequest";

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

describe("montarPedidoDeComparacao", () => {
  it("leva os dois artigos com identificador, título e texto", () => {
    const a = artigo();
    const b = artigo({ title: "Exportando para o Revit" });

    const pedido = montarPedidoDeComparacao(a, b);

    expect(pedido.a.id).toBe(a.id);
    expect(pedido.b.title).toBe("Exportando para o Revit");
    expect(pedido.a.text).toContain("menu Arquivo");
  });

  /* HTML do portal vira texto: o modelo não deve gastar contexto com marcação. */
  it("artigo em HTML entra sem as tags", () => {
    const pedido = montarPedidoDeComparacao(
      artigo({ contentFormat: "html", content: "<h2>Exportar</h2><p>Menu <b>Arquivo</b>.</p>" }),
      artigo()
    );

    expect(pedido.a.text).not.toContain("<");
    expect(pedido.a.text).toContain("Arquivo");
  });

  /*
    Veredito sobre meio artigo apresentado como se fosse sobre o inteiro é erro
    que ninguém percebe, então o corte é anunciado — à tela e ao modelo.
  */
  it("artigo longo entra cortado e avisando", () => {
    const pedido = montarPedidoDeComparacao(artigo({ content: "exportar ".repeat(9_000) }), artigo());

    expect(pedido.a.text.length).toBe(TEXTO_NO_PEDIDO);
    expect(pedido.a.truncated).toBe(true);
    expect(pedido.b.truncated).toBe(false);
  });
});
