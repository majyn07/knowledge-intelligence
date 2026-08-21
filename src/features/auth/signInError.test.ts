import { describe, expect, it } from "vitest";

import { signInErrorMessage } from "./signInError";

describe("signInErrorMessage", () => {
  it("explica o limite de envio em vez de repetir a mensagem crua", () => {
    /*
      `email rate limit exceeded` apareceu na tela de acesso: idioma errado,
      causa técnica nomeada, e nenhuma pista do que fazer.
    */
    const texto = signInErrorMessage("email rate limit exceeded");

    expect(texto).toContain("limite");
    expect(texto).toContain("configuração");
    expect(texto).not.toContain("rate limit");
  });

  it("reconhece a mensagem independente de caixa", () => {
    expect(signInErrorMessage("Email Rate Limit Exceeded")).toContain("limite");
  });

  it("mensagem desconhecida vai junto, e não vira texto genérico", () => {
    /*
      "Não foi possível enviar" sem o motivo original tira de quem administra a
      única pista que existe.
    */
    const texto = signInErrorMessage("unexpected failure from provider");

    expect(texto).toContain("unexpected failure from provider");
  });

  it("erro vazio ainda produz uma frase", () => {
    expect(signInErrorMessage("   ")).toBe("Não foi possível enviar o link de acesso.");
  });

  it("endereço recusado aponta para quem administra", () => {
    expect(signInErrorMessage("Email address not authorized")).toContain("administra");
  });
});
