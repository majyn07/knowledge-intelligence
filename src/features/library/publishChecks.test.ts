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
    type: "article",
    status: "review",
    product: "AltoQi Visus",
    module: "Workflow",
    category: "Troubleshooting",
    tags: [],
    keywords: ["login"],
    author: "Mariana Costa",
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

  it("exige produto e módulo juntos", () => {
    expect(failing(article({ module: "" }))).toContain("Produto e módulo definidos");
    expect(failing(article({ product: "" }))).toContain("Produto e módulo definidos");
  });

  it("aponta categoria e palavras-chave ausentes", () => {
    const pendencias = failing(article({ category: "", keywords: [] }));

    expect(pendencias).toContain("Categoria definida");
    expect(pendencias).toContain("Tem palavras-chave");
  });

  it("aponta autor ausente", () => {
    expect(failing(article({ author: "" }))).toContain("Tem autor");
  });

  it("acumula todas as pendências de um artigo vazio", () => {
    const vazio = article({
      summary: "",
      content: "",
      product: "",
      module: "",
      category: "",
      keywords: [],
      author: "",
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
