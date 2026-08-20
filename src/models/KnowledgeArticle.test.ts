import { describe, expect, it } from "vitest";

import { canTransitionArticle } from "./KnowledgeArticle";

describe("canTransitionArticle", () => {
  it("permite avançar o ciclo editorial", () => {
    expect(canTransitionArticle("draft", "review")).toBe(true);
    expect(canTransitionArticle("review", "published")).toBe(true);
    expect(canTransitionArticle("published", "archived")).toBe(true);
  });

  it("permite voltar quando a revisão reprova ou o conteúdo precisa de correção", () => {
    expect(canTransitionArticle("review", "draft")).toBe(true);
    expect(canTransitionArticle("published", "review")).toBe(true);
    expect(canTransitionArticle("archived", "draft")).toBe(true);
  });

  it("bloqueia saltos de estágio", () => {
    expect(canTransitionArticle("draft", "published")).toBe(false);
    expect(canTransitionArticle("draft", "archived")).toBe(false);
    expect(canTransitionArticle("review", "archived")).toBe(false);
    expect(canTransitionArticle("archived", "published")).toBe(false);
  });

  it("aceita permanecer no mesmo estágio", () => {
    expect(canTransitionArticle("draft", "draft")).toBe(true);
    expect(canTransitionArticle("published", "published")).toBe(true);
  });
});
