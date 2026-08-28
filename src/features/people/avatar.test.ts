import { describe, expect, it } from "vitest";

import { avatarHue, initialsOf } from "./avatar";

describe("initialsOf", () => {
  it("nome completo usa a primeira e a última palavra", () => {
    // O nome do meio não distingue ninguém numa lista de suporte.
    expect(initialsOf("Raoni Milioli da Silva")).toBe("RS");
  });

  it("nome único usa as duas primeiras letras", () => {
    expect(initialsOf("Raoni")).toBe("RA");
  });

  it("nome vazio não quebra a tela", () => {
    expect(initialsOf("")).toBe("?");
    expect(initialsOf("   ")).toBe("?");
  });

  it("espaços a mais não viram iniciais vazias", () => {
    expect(initialsOf("  Ana   Souza  ")).toBe("AS");
  });
});

describe("avatarHue", () => {
  it("a mesma pessoa tem sempre a mesma cor", () => {
    /*
      Determinística de propósito: sorteada, a cor mudaria a cada
      carregamento, e cor que muda não distingue ninguém.
    */
    expect(avatarHue("Raoni")).toBe(avatarHue("Raoni"));
  });

  it("fica dentro do círculo de cores", () => {
    for (const nome of ["Ana", "Bruno", "Suporte Visus", ""]) {
      const hue = avatarHue(nome);

      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });

  it("nomes diferentes tendem a cores diferentes", () => {
    expect(avatarHue("Ana Souza")).not.toBe(avatarHue("Bruno Lima"));
  });
});
