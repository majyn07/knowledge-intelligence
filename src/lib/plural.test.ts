import { describe, expect, it } from "vitest";

import { concordar, contar } from "./plural";

describe("concordar", () => {
  it("um fica no singular", () => {
    expect(concordar(1, "publicado")).toBe("publicado");
  });

  it("mais de um vai para o plural", () => {
    expect(concordar(3, "publicado")).toBe("publicados");
  });

  /* Zero é plural em português: "0 artigos", nunca "0 artigo". */
  it("zero é plural", () => {
    expect(concordar(0, "artigo")).toBe("artigos");
  });

  /* Acrescentar `s` erraria os dois em silêncio, que é o pior resultado. */
  it("plural irregular vai explícito", () => {
    expect(concordar(2, "sugestão", "sugestões")).toBe("sugestões");
    expect(concordar(2, "visível", "visíveis")).toBe("visíveis");
    expect(concordar(1, "sugestão", "sugestões")).toBe("sugestão");
  });
});

describe("contar", () => {
  it("junta o número com a palavra concordando", () => {
    expect(contar(1, "artigo")).toBe("1 artigo");
    expect(contar(12, "artigo")).toBe("12 artigos");
    expect(contar(0, "artigo")).toBe("0 artigos");
  });

  it("aceita o plural irregular", () => {
    expect(contar(52, "sugestão", "sugestões")).toBe("52 sugestões");
  });
});
