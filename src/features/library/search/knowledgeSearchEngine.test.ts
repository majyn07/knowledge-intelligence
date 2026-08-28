import { describe, expect, it } from "vitest";

import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

import { searchKnowledge } from "./knowledgeSearchEngine";

function article(overrides: Partial<KnowledgeArticle> = {}): KnowledgeArticle {
  return {
    id: "a1",
    title: "Erro ao autenticar",
    summary: "Falhas de login após atualização",
    content: "Verifique o token e as permissões.",
    projectId: "p1",
    genreId: "gen-artigo",
    status: "published",
    sectionId: "sec-altoqi-visus-workflow",
    tags: ["acesso"],
    keywords: ["login"],
    author: "",
    contentFormat: "markdown" as const,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

const query = (text: string, extra = {}) => ({ text, ...extra });

describe("searchKnowledge", () => {
  it("considera apenas artigos publicados", () => {
    const articles = [
      article({ id: "publicado", status: "published" }),
      article({ id: "rascunho", status: "draft" }),
      article({ id: "revisao", status: "review" }),
      article({ id: "arquivado", status: "archived" }),
    ];

    const results = searchKnowledge(articles, query("autenticar"));

    expect(results.map((result) => result.article.id)).toEqual(["publicado"]);
  });

  /*
    O acervo é do hub: o artigo do portal não tem iniciativa, e recortar por
    ela fazia a análise não encontrar nenhum dos 1.822 artigos importados.
  */
  it("procura no acervo inteiro, sem recorte por iniciativa", () => {
    const articles = [
      article({ id: "do-portal", projectId: "" }),
      article({ id: "de-outra", projectId: "p2" }),
    ];

    const results = searchKnowledge(articles, query("autenticar"));

    expect(results.map((result) => result.article.id).sort()).toEqual([
      "de-outra",
      "do-portal",
    ]);
  });

  it("ignora palavras vazias do português", () => {
    const articles = [article({ title: "Guia", summary: "", content: "", keywords: [], tags: [] })];

    expect(searchKnowledge(articles, query("para com que uma"))).toHaveLength(0);
  });

  it("descarta termos de até duas letras e mantém os de três", () => {
    const articles = [article({ title: "ab abc", summary: "", content: "", keywords: [], tags: [] })];

    expect(searchKnowledge(articles, query("ab"))).toHaveLength(0);
    expect(searchKnowledge(articles, query("abc"))).toHaveLength(1);
  });

  it("pontua título acima de conteúdo", () => {
    const noTitulo = article({
      id: "titulo",
      title: "sincronizacao",
      summary: "",
      content: "",
      keywords: [],
      tags: [],
    });
    const noConteudo = article({
      id: "conteudo",
      title: "Outro",
      summary: "",
      content: "sincronizacao",
      keywords: [],
      tags: [],
    });

    const results = searchKnowledge([noConteudo, noTitulo], query("sincronizacao"));

    expect(results[0].article.id).toBe("titulo");
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it("devolve os termos que casaram", () => {
    const results = searchKnowledge([article()], query("autenticar login inexistente"));

    expect(results[0].matchedTerms).toContain("autenticar");
    expect(results[0].matchedTerms).toContain("login");
    expect(results[0].matchedTerms).not.toContain("inexistente");
  });

  it("respeita o limite e ordena por relevância", () => {
    const articles = [
      article({ id: "fraco", title: "Outro", content: "autenticar", summary: "", keywords: [], tags: [] }),
      article({ id: "forte", title: "autenticar", summary: "autenticar", keywords: ["autenticar"], tags: [] }),
      article({ id: "medio", title: "Outro", summary: "autenticar", content: "", keywords: [], tags: [] }),
    ];

    const results = searchKnowledge(articles, query("autenticar", { limit: 2 }));

    expect(results).toHaveLength(2);
    expect(results[0].article.id).toBe("forte");
  });

  it("não devolve nada quando a consulta não tem termo útil", () => {
    expect(searchKnowledge([article()], query("   "))).toHaveLength(0);
  });

  it("expõe apenas a identificação do artigo, não o conteúdo inteiro", () => {
    const [result] = searchKnowledge([article()], query("autenticar"));

    expect(Object.keys(result.article).sort()).toEqual(["id", "summary", "title"]);
  });
});
