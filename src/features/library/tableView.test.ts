import { describe, expect, it } from "vitest";

import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { Taxonomy } from "@/models/Taxonomy";

import { cellValue, paginate, sortArticles, type ColumnContext } from "./tableView";

const taxonomy: Taxonomy = {
  categories: [{ id: "cat-visus", name: "AltoQi Visus", isProduct: true, order: 0 }],
  sections: [{ id: "sec-collab", categoryId: "cat-visus", name: "Collab", order: 0 }],
  genres: [{ id: "gen-faq", name: "FAQ", order: 0 }],
  opportunityTypes: [],
};

const context: ColumnContext = {
  taxonomy,
  nameOf: (ref) => (ref === "eq-visus" ? "Suporte Visus" : ""),
};

function artigo(over: Partial<KnowledgeArticle>): KnowledgeArticle {
  return {
    id: "a",
    title: "Artigo",
    summary: "",
    content: "",
    projectId: "p1",
    genreId: "gen-faq",
    status: "draft",
    sectionId: "sec-collab",
    tags: [],
    keywords: [],
    author: "eq-visus",
    contentFormat: "markdown" as const,
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    updatedAt: new Date("2026-08-01T00:00:00.000Z"),
    ...over,
  };
}

describe("cellValue", () => {
  it("traduz cada coluna para texto", () => {
    const article = artigo({ title: "Como publicar" });

    expect(cellValue(article, "title", context)).toBe("Como publicar");
    expect(cellValue(article, "status", context)).toBe("Rascunho");
    expect(cellValue(article, "section", context)).toBe("AltoQi Visus · Collab");
    expect(cellValue(article, "genre", context)).toBe("FAQ");
    expect(cellValue(article, "author", context)).toBe("Suporte Visus");
  });

  it("classificação que não resolve vira vazio, e não um identificador solto", () => {
    const article = artigo({ sectionId: "sec-que-sumiu", genreId: "", author: "" });

    expect(cellValue(article, "section", context)).toBe("");
    expect(cellValue(article, "genre", context)).toBe("");
    expect(cellValue(article, "author", context)).toBe("");
  });
});

describe("sortArticles", () => {
  const lista = [
    artigo({ id: "b", title: "Banana" }),
    artigo({ id: "a", title: "Abacaxi" }),
    artigo({ id: "c", title: "Caju" }),
  ];

  it("ordena por texto nos dois sentidos", () => {
    expect(
      sortArticles(lista, { column: "title", direction: "asc" }, context).map((a) => a.id)
    ).toEqual(["a", "b", "c"]);

    expect(
      sortArticles(lista, { column: "title", direction: "desc" }, context).map((a) => a.id)
    ).toEqual(["c", "b", "a"]);
  });

  it("acento não joga a palavra para o fim", () => {
    // Comparação crua colocaria "Ácido" depois de "Zebra".
    const comAcento = [artigo({ id: "z", title: "Zebra" }), artigo({ id: "a", title: "Ácido" })];

    expect(
      sortArticles(comAcento, { column: "title", direction: "asc" }, context).map((a) => a.id)
    ).toEqual(["a", "z"]);
  });

  it("data compara como instante, não como texto", () => {
    /*
      Comparar data como texto funcionaria só enquanto o formato fosse ISO, e
      quebraria em silêncio no dia em que deixasse de ser.
    */
    const datas = [
      artigo({ id: "novo", updatedAt: new Date("2026-08-20T00:00:00.000Z") }),
      artigo({ id: "velho", updatedAt: new Date("2026-01-05T00:00:00.000Z") }),
    ];

    expect(
      sortArticles(datas, { column: "updatedAt", direction: "desc" }, context).map((a) => a.id)
    ).toEqual(["novo", "velho"]);
  });

  it("vazio vai para o fim nas duas direções", () => {
    /*
      Ordenar por responsável para achar o que falta atribuir é o caso real, e
      a lista de "sem responsável" não pode mudar de ponta conforme a seta.
    */
    const comVazio = [
      artigo({ id: "sem", author: "" }),
      artigo({ id: "com", author: "eq-visus" }),
    ];

    expect(
      sortArticles(comVazio, { column: "author", direction: "asc" }, context).map((a) => a.id)
    ).toEqual(["com", "sem"]);

    expect(
      sortArticles(comVazio, { column: "author", direction: "desc" }, context).map((a) => a.id)
    ).toEqual(["com", "sem"]);
  });

  it("não altera a lista recebida", () => {
    const original = [...lista];
    sortArticles(lista, { column: "title", direction: "asc" }, context);

    expect(lista).toEqual(original);
  });
});

describe("paginate", () => {
  const itens = Array.from({ length: 25 }, (_, i) => i + 1);

  it("recorta a página pedida", () => {
    expect(paginate(itens, 2, 10).items).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(paginate(itens, 3, 10).items).toEqual([21, 22, 23, 24, 25]);
  });

  it("página fora do intervalo é corrigida, e não devolve vazio", () => {
    /*
      Filtrar estando na página 7 deixaria a tela em branco com registros logo
      ali, e ninguém entenderia por quê.
    */
    expect(paginate(itens, 99, 10).page).toBe(3);
    expect(paginate(itens, 99, 10).items).toHaveLength(5);
    expect(paginate(itens, 0, 10).page).toBe(1);
  });

  it("lista vazia tem uma página, e não zero", () => {
    // Zero páginas produziria "página 1 de 0", que não quer dizer nada.
    expect(paginate([], 1, 10)).toEqual({ items: [], page: 1, pages: 1, total: 0 });
  });

  it("o total é o da lista inteira, não o da página", () => {
    expect(paginate(itens, 1, 10).total).toBe(25);
  });
});
