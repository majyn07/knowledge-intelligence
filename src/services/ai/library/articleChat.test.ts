import { describe, expect, it } from "vitest";

import { buildArticleChatPrompt } from "../prompts/articleChatPrompt";
import {
  articleChatRequestSchema,
  boundArticleText,
  MAXIMO_DE_CARACTERES,
} from "./articleChat";

const artigo = {
  title: "Como ocultar elementos",
  summary: "Resumo publicado",
  text: "Os comandos ficam na guia Operações.",
  sectionPath: "AltoQi Builder › Geral",
  status: "Publicado",
  updatedAt: "2026-08-01",
  truncated: false,
};

describe("boundArticleText", () => {
  it("passa o texto que cabe, sem marcar corte", () => {
    expect(boundArticleText("curto")).toEqual({ text: "curto", truncated: false });
  });

  /*
    Resposta baseada em meio artigo apresentada como se fosse sobre o artigo
    inteiro é o tipo de erro que ninguém percebe. Cortar é aceitável; cortar
    calado, não.
  */
  it("corta o que passa do teto e avisa", () => {
    const longo = "a".repeat(MAXIMO_DE_CARACTERES + 500);
    const resultado = boundArticleText(longo);

    expect(resultado.text).toHaveLength(MAXIMO_DE_CARACTERES);
    expect(resultado.truncated).toBe(true);
  });
});

describe("articleChatRequestSchema", () => {
  it("aceita um pedido bem formado", () => {
    const pedido = { article: artigo, messages: [{ role: "user", content: "Resuma" }] };
    expect(articleChatRequestSchema.safeParse(pedido).success).toBe(true);
  });

  it("recusa artigo sem texto", () => {
    const pedido = { article: { ...artigo, text: "" }, messages: [{ role: "user", content: "x" }] };
    expect(articleChatRequestSchema.safeParse(pedido).success).toBe(false);
  });

  it("recusa conversa vazia", () => {
    expect(articleChatRequestSchema.safeParse({ article: artigo, messages: [] }).success).toBe(false);
  });

  /* A conversa inteira vai a cada pedido: sem teto, uma sessão longa estoura o prazo. */
  it("recusa conversa longa demais", () => {
    const messages = Array.from({ length: 21 }, () => ({ role: "user" as const, content: "x" }));
    expect(articleChatRequestSchema.safeParse({ article: artigo, messages }).success).toBe(false);
  });

  it("recusa texto acima do teto", () => {
    const article = { ...artigo, text: "a".repeat(MAXIMO_DE_CARACTERES + 1) };
    expect(articleChatRequestSchema.safeParse({ article, messages: [{ role: "user", content: "x" }] }).success).toBe(
      false
    );
  });
});

describe("buildArticleChatPrompt", () => {
  const prompt = buildArticleChatPrompt({
    article: artigo,
    messages: [{ role: "user", content: "Resuma" }],
  });

  it("põe a regra antes do artigo, e o artigo antes da pergunta", () => {
    expect(prompt[0].role).toBe("system");
    expect(prompt[1].role).toBe("system");
    expect(prompt[2]).toEqual({ role: "user", content: "Resuma" });
  });

  /*
    A instrução central é a mesma regra do resto do produto: um modelo
    perguntado sobre artigo técnico responde do treinamento se o texto não
    disser, e a resposta chega com a mesma cara de quem leu.
  */
  it("manda responder só a partir do artigo", () => {
    expect(prompt[0].content).toContain("somente");
    expect(prompt[0].content).toContain("não trata disso");
  });

  it("leva o contexto de classificação junto do texto", () => {
    expect(prompt[1].content).toContain("AltoQi Builder › Geral");
    expect(prompt[1].content).toContain("Os comandos ficam na guia Operações.");
    expect(prompt[1].content).toContain("Publicado");
  });

  it("avisa o modelo quando o texto foi cortado", () => {
    const cortado = buildArticleChatPrompt({
      article: { ...artigo, truncated: true },
      messages: [{ role: "user", content: "x" }],
    });

    expect(cortado[1].content).toContain("cortado");
  });

  it("não avisa de corte quando não houve", () => {
    expect(prompt[1].content).not.toContain("cortado");
  });

  it("diz que o artigo não tem resumo, em vez de deixar vazio", () => {
    const semResumo = buildArticleChatPrompt({
      article: { ...artigo, summary: "" },
      messages: [{ role: "user", content: "x" }],
    });

    expect(semResumo[1].content).toContain("não tem resumo");
  });
});
