import { describe, expect, it } from "vitest";

import { resolveActiveProvider } from "./catalog";

describe("resolveActiveProvider", () => {
  it("sem chave nenhuma não há provedor", () => {
    // É o estado em que o produto roda até alguém configurar, e não um erro.
    const resultado = resolveActiveProvider({});

    expect(resultado.id).toBeNull();
    expect(resultado.reason).toBe("nenhum");
    expect(resultado.configured).toEqual([]);
  });

  it("com um só configurado, é ele, sem precisar declarar", () => {
    const resultado = resolveActiveProvider({ GEMINI_API_KEY: "abc" });

    expect(resultado.id).toBe("gemini");
    expect(resultado.reason).toBe("unico");
  });

  it("chave vazia não conta como configurada", () => {
    /*
      A integração da Vercel cria a variável antes de haver valor, e uma string
      vazia passaria por `Boolean(process.env.X)` só depois de virar `""` —
      mas `"   "` passaria. Nenhuma das duas é chave.
    */
    expect(resolveActiveProvider({ GEMINI_API_KEY: "" }).id).toBeNull();
    expect(resolveActiveProvider({ GEMINI_API_KEY: "   " }).id).toBeNull();
  });

  it("a declaração vence a ordem do catálogo", () => {
    const resultado = resolveActiveProvider({
      GEMINI_API_KEY: "abc",
      ANTHROPIC_API_KEY: "def",
      AI_PROVIDER: "claude",
    });

    expect(resultado.id).toBe("claude");
    expect(resultado.reason).toBe("declarado");
  });

  it("dois configurados e nenhum declarado vale a ordem escrita, e isso é dito", () => {
    /*
      Escolher em silêncio entre dois seria apresentar como decisão o que foi
      acaso. A razão sai junto para a tela poder contar.
    */
    const resultado = resolveActiveProvider({
      GEMINI_API_KEY: "abc",
      ANTHROPIC_API_KEY: "def",
    });

    expect(resultado.id).toBe("gemini");
    expect(resultado.reason).toBe("preferencia");
    expect(resultado.configured).toEqual(["gemini", "claude"]);
  });

  it("declarar um provedor sem chave não cai em outro", () => {
    /*
      Quem declarou quis aquele. Substituir por conta própria faria um erro de
      digitação virar uma análise feita por outro modelo, sem ninguém saber.
    */
    const resultado = resolveActiveProvider({
      GEMINI_API_KEY: "abc",
      AI_PROVIDER: "claude",
    });

    expect(resultado.id).toBeNull();
    expect(resultado.reason).toBe("declarado-sem-chave");
    expect(resultado.declared).toBe("claude");
  });

  it("provedor desconhecido é tratado como declarado sem chave", () => {
    // Erro de digitação em `AI_PROVIDER` não pode virar silêncio.
    const resultado = resolveActiveProvider({ GEMINI_API_KEY: "abc", AI_PROVIDER: "gemni" });

    expect(resultado.id).toBeNull();
    expect(resultado.declared).toBe("gemni");
  });

  it("a declaração não depende de caixa nem de espaço em volta", () => {
    const resultado = resolveActiveProvider({ GEMINI_API_KEY: "abc", AI_PROVIDER: " Gemini " });

    expect(resultado.id).toBe("gemini");
    expect(resultado.reason).toBe("declarado");
  });
});
