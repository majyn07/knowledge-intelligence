import { describe, expect, it } from "vitest";

import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

import { articlePublishChecks } from "./publishChecks";

function article(overrides: Partial<KnowledgeArticle> = {}): KnowledgeArticle {
  return {
    id: "a1",
    title: "Erro ao autenticar",
    summary: "Como resolver",
    content: "## Problema\n\nDetalhe.",
    projectId: "p1",
    genreId: "gen-artigo",
    status: "review",
    sectionId: "sec-altoqi-visus-workflow",
    tags: [],
    keywords: ["login"],
    author: "Raoni Milioli da Silva",
    contentFormat: "markdown" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const failing = (a: KnowledgeArticle) =>
  articlePublishChecks(a).filter((check) => !check.ok).map((check) => check.label);

describe("articlePublishChecks", () => {
  it("aprova um artigo completo", () => {
    expect(failing(article())).toEqual([]);
  });

  it("aponta resumo ausente", () => {
    expect(failing(article({ summary: "   " }))).toContain("Tem resumo");
  });

  it("aponta conteúdo vazio", () => {
    expect(failing(article({ content: "" }))).toContain("Tem conteúdo escrito");
  });

  it("exige seção, que é para onde o artigo vai ser publicado", () => {
    expect(failing(article({ sectionId: "" }))).toContain("Seção definida");
  });

  it("aponta gênero e palavras-chave ausentes", () => {
    const pendencias = failing(article({ genreId: "", keywords: [] }));

    expect(pendencias).toContain("Gênero definido");
    expect(pendencias).toContain("Tem palavras-chave");
  });

  it("aponta autor ausente", () => {
    expect(failing(article({ author: "" }))).toContain("Tem autor");
  });

  it("acumula todas as pendências de um artigo vazio", () => {
    const vazio = article({
      summary: "",
      content: "",
      sectionId: "",
      genreId: "",
      keywords: [],
      author: "",
      contentFormat: "markdown" as const,
    });

    expect(failing(vazio)).toHaveLength(6);
  });

  it("toda pendência explica o que falta", () => {
    const pendentes = articlePublishChecks(
      article({ summary: "", content: "", author: "" })
    ).filter((check) => !check.ok);

    expect(pendentes.every((check) => Boolean(check.hint))).toBe(true);
  });
});
