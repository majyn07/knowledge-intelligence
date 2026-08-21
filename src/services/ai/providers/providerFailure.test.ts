import { describe, expect, it } from "vitest";

import { classifyProviderFailure, isRetryable } from "./providerFailure";

describe("classifyProviderFailure", () => {
  it("cota estourada é limite, e não indisponibilidade", () => {
    /*
      A diferença muda o que a tela diz: limite pede esperar, indisponível pede
      tentar de novo. Antes as duas davam "tente novamente".
    */
    const falha = classifyProviderFailure(
      new Error("429 RESOURCE_EXHAUSTED: Quota exceeded for quota metric")
    );

    expect(falha.kind).toBe("limite");
    expect(isRetryable(falha.kind)).toBe(true);
  });

  it("chave inválida é credencial, e tentar de novo não resolve", () => {
    // "Tente novamente" com a chave errada é convite a tentar para sempre.
    const falha = classifyProviderFailure(new Error("API key not valid. Please pass a valid API key."));

    expect(falha.kind).toBe("credencial");
    expect(isRetryable(falha.kind)).toBe(false);
  });

  it("o cancelamento pelo nosso prazo é reconhecido pelo nome", () => {
    /*
      `AbortError` chega sem código e às vezes sem mensagem — só o nome
      identifica quem foi.
    */
    const abort = new Error("");
    abort.name = "AbortError";

    expect(classifyProviderFailure(abort).kind).toBe("prazo");
  });

  it("modelo sobrecarregado é indisponibilidade", () => {
    expect(classifyProviderFailure(new Error("The model is overloaded")).kind).toBe("indisponivel");
    expect(classifyProviderFailure({ status: 503, message: "" }).kind).toBe("indisponivel");
  });

  it("o código HTTP classifica mesmo sem texto reconhecível", () => {
    // O SDK nem sempre repete o motivo na mensagem.
    expect(classifyProviderFailure({ status: 429, message: "erro" }).kind).toBe("limite");
    expect(classifyProviderFailure({ statusCode: 401, message: "erro" }).kind).toBe("credencial");
  });

  it("falha não reconhecida preserva a mensagem original", () => {
    /*
      A original é a única pista de quem administra. Trocá-la por texto
      genérico apaga a investigação inteira.
    */
    const falha = classifyProviderFailure(new Error("something nobody predicted"));

    expect(falha.kind).toBe("desconhecida");
    expect(falha.detail).toBe("something nobody predicted");
  });

  it("erro sem mensagem não quebra a classificação", () => {
    expect(classifyProviderFailure(null).kind).toBe("desconhecida");
    expect(classifyProviderFailure(undefined).detail).toBe("");
    expect(classifyProviderFailure({}).detail).toBe("");
  });

  it("texto solto também é lido", () => {
    expect(classifyProviderFailure("Rate limit exceeded").kind).toBe("limite");
  });

  it("código fora da faixa de HTTP não é confundido com status", () => {
    /*
      Alguns SDKs usam `code` para outra coisa — `code: 42` não é um status, e
      tratá-lo como um classificaria errado.
    */
    expect(classifyProviderFailure({ code: 42, message: "erro qualquer" }).kind).toBe("desconhecida");
  });
});
