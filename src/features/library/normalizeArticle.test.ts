import { describe, expect, it } from "vitest";

import { buildPortalTaxonomy } from "@/features/taxonomy/mock/portalTaxonomy";

import { normalizeArticle, parseArticles } from "./normalizeArticle";

const taxonomy = buildPortalTaxonomy();

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
    expect(normalizeArticle(legado, taxonomy).author).toBe("");
  });

  it("o registro legado sobrevive a .trim() em todo campo de texto", () => {
    const article = normalizeArticle(legado, taxonomy);

    expect(() =>
      [
        article.title,
        article.summary,
        article.content,
        article.author,
        article.sectionId,
        article.genreId,
      ].map((field) => field.trim())
    ).not.toThrow();
  });

  it("preserva o que já estava correto", () => {
    const article = normalizeArticle(legado, taxonomy);

    expect(article.title).toBe("Artigo antigo");
    expect(article.tags).toEqual(["x"]);
    expect(article.status).toBe("review");
  });

  it("converte datas e resiste a data inválida", () => {
    expect(normalizeArticle(legado, taxonomy).createdAt).toBeInstanceOf(Date);
    expect(
      normalizeArticle({ ...legado, createdAt: "não é data" }, taxonomy).createdAt.getTime()
    ).toBe(0);
  });

  it("recusa estágio desconhecido em vez de propagá-lo", () => {
    expect(normalizeArticle({ ...legado, status: "aprovadissimo" }, taxonomy).status).toBe("draft");
  });

  it("descarta itens não textuais dentro das listas", () => {
    expect(normalizeArticle({ ...legado, tags: ["ok", 3, null] }, taxonomy).tags).toEqual(["ok"]);
  });

  it("substitui listas ausentes por vazias", () => {
    const article = normalizeArticle({ id: "x" }, taxonomy);

    expect(article.tags).toEqual([]);
    expect(article.keywords).toEqual([]);
  });

  it("gera identificador quando o registro não tem", () => {
    expect(normalizeArticle({ title: "Sem id" }, taxonomy).id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("não inventa url, origem nem id do portal quando não existem", () => {
    const article = normalizeArticle(legado, taxonomy);

    expect(article.url).toBeUndefined();
    expect(article.source).toBeUndefined();
    expect(article.portalArticleId).toBeUndefined();
  });

  it("guarda o id do portal quando ele existe, para sincronizar sem duplicar", () => {
    const article = normalizeArticle({ ...legado, portalArticleId: "360012345" }, taxonomy);

    expect(article.portalArticleId).toBe("360012345");
  });
});

describe("migração da classificação antiga", () => {
  it("converte produto e módulo em seção do cadastro", () => {
    const article = normalizeArticle(legado, taxonomy);

    expect(article.sectionId).toBe("sec-altoqi-visus-workflow");
  });

  it("converte o tipo antigo no gênero correspondente", () => {
    expect(normalizeArticle(legado, taxonomy).genreId).toBe("gen-artigo");
    expect(normalizeArticle({ ...legado, type: "faq" }, taxonomy).genreId).toBe("gen-faq");
  });

  it("aceita a classificação vinda do campo `category` quando o módulo não bate", () => {
    const article = normalizeArticle(
      { ...legado, module: "não existe", category: "Collab" },
      taxonomy
    );

    expect(article.sectionId).toBe("sec-altoqi-visus-collab");
  });

  it("ignora acento e caixa ao corresponder", () => {
    const article = normalizeArticle(
      { ...legado, product: "eletrico", module: "cadastro" },
      taxonomy
    );

    expect(article.sectionId).toBe("sec-eletrico-cadastro");
  });

  it("deixa vazio quando o produto não existe no cadastro, em vez de chutar", () => {
    const article = normalizeArticle({ ...legado, product: "Produto Fantasma" }, taxonomy);

    expect(article.sectionId).toBe("");
  });

  it("deixa vazio quando o produto bate mas o módulo não, em vez de usar a primeira seção", () => {
    const article = normalizeArticle(
      { ...legado, module: "não existe", category: "também não" },
      taxonomy
    );

    expect(article.sectionId).toBe("");
  });

  it("recusa gênero desconhecido em vez de inventar um", () => {
    expect(normalizeArticle({ ...legado, type: "podcast" }, taxonomy).genreId).toBe("");
  });

  it("não sobrescreve a classificação de um artigo já migrado", () => {
    const article = normalizeArticle(
      { ...legado, sectionId: "sec-altoqi-visus-bid", genreId: "gen-template" },
      taxonomy
    );

    expect(article.sectionId).toBe("sec-altoqi-visus-bid");
    expect(article.genreId).toBe("gen-template");
  });
});

describe("parseArticles", () => {
  it("normaliza a coleção inteira", () => {
    const articles = parseArticles(JSON.stringify([legado, { id: "b" }]), taxonomy);

    expect(articles).toHaveLength(2);
    expect(articles.every((article) => typeof article.author === "string")).toBe(true);
  });

  it("devolve vazio quando o conteúdo não é uma lista", () => {
    expect(parseArticles('{"a":1}', taxonomy)).toEqual([]);
  });
});
