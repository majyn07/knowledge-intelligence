import { describe, expect, it } from "vitest";

import { normalizeArticle, parseArticles } from "./normalizeArticle";

/** Como um artigo era gravado antes de `author` e `category` existirem. */
const legado = {
  id: "legado-1",
  title: "Artigo antigo",
  summary: "Resumo",
  content: "Corpo",
  projectId: "project-001",
  type: "article",
  status: "review",
  product: "AltoQi Visus",
  module: "Workflow",
  tags: ["x"],
  keywords: ["y"],
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

describe("normalizeArticle", () => {
  it("preenche campos que versões anteriores não gravavam", () => {
    const article = normalizeArticle(legado);

    expect(article.author).toBe("");
    expect(article.category).toBe("");
  });

  it("o registro legado sobrevive a .trim() em todo campo de texto", () => {
    const article = normalizeArticle(legado);

    expect(() =>
      [
        article.title,
        article.summary,
        article.content,
        article.product,
        article.module,
        article.category,
        article.author,
      ].map((field) => field.trim())
    ).not.toThrow();
  });

  it("preserva o que já estava correto", () => {
    const article = normalizeArticle(legado);

    expect(article.title).toBe("Artigo antigo");
    expect(article.tags).toEqual(["x"]);
    expect(article.status).toBe("review");
  });

  it("converte datas e resiste a data inválida", () => {
    expect(normalizeArticle(legado).createdAt).toBeInstanceOf(Date);
    expect(
      normalizeArticle({ ...legado, createdAt: "não é data" }).createdAt.getTime()
    ).toBe(0);
  });

  it("recusa tipo e estágio desconhecidos em vez de propagá-los", () => {
    const article = normalizeArticle({
      ...legado,
      type: "inventado",
      status: "aprovadissimo",
    });

    expect(article.type).toBe("article");
    expect(article.status).toBe("draft");
  });

  it("descarta itens não textuais dentro das listas", () => {
    const article = normalizeArticle({ ...legado, tags: ["ok", 3, null] });

    expect(article.tags).toEqual(["ok"]);
  });

  it("substitui listas ausentes por vazias", () => {
    const article = normalizeArticle({ id: "x" });

    expect(article.tags).toEqual([]);
    expect(article.keywords).toEqual([]);
  });

  it("gera identificador quando o registro não tem", () => {
    expect(normalizeArticle({ title: "Sem id" }).id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("não inventa url nem origem quando não existem", () => {
    const article = normalizeArticle(legado);

    expect(article.url).toBeUndefined();
    expect(article.source).toBeUndefined();
  });
});

describe("parseArticles", () => {
  it("normaliza a coleção inteira", () => {
    const articles = parseArticles(JSON.stringify([legado, { id: "b" }]));

    expect(articles).toHaveLength(2);
    expect(articles.every((article) => typeof article.author === "string")).toBe(true);
  });

  it("devolve vazio quando o conteúdo não é uma lista", () => {
    expect(parseArticles('{"a":1}')).toEqual([]);
  });
});
