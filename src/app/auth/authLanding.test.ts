import { describe, expect, it } from "vitest";

import { authLandingParams } from "./authLanding";

function params(query: string): Record<string, string> | null {
  const resultado = authLandingParams(new URLSearchParams(query));

  return resultado === null ? null : Object.fromEntries(resultado);
}

describe("authLandingParams", () => {
  it("resgata o código do PKCE que caiu na raiz", () => {
    expect(params("?code=abc123")).toEqual({ code: "abc123" });
  });

  it("resgata o token_hash, que é o formato do link novo", () => {
    /*
      Encaminhar um formato e esquecer o outro deixaria metade dos links no
      silêncio que o encaminhamento existe para impedir, e seria a metade
      nova, que ninguém ainda sabe diagnosticar.
    */
    expect(params("?token_hash=xyz&type=email")).toEqual({
      token_hash: "xyz",
      type: "email",
    });
  });

  it("o tipo é opcional, porque o callback tem padrão para a ausência dele", () => {
    expect(params("?token_hash=xyz")).toEqual({ token_hash: "xyz" });
  });

  it("com os dois formatos, vale o que funciona em qualquer navegador", () => {
    /*
      Nenhum template nosso produz isso, mas um ambiente mal configurado
      poderia, e escolher o PKCE ali seria escolher o que depende do
      navegador de origem.
    */
    expect(params("?code=abc&token_hash=xyz")).toEqual({ token_hash: "xyz" });
  });

  it("sem nada de acesso, não há o que encaminhar", () => {
    /*
      A raiz é a tela inicial do produto. Encaminhar quem só abriu o site
      mandaria todo mundo para o callback a cada visita.
    */
    expect(params("")).toBeNull();
    expect(params("?utm_source=email")).toBeNull();
  });

  it("ignora o parâmetro presente e vazio", () => {
    expect(params("?code=")).toBeNull();
  });
});
