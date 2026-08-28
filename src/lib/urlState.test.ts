import { describe, expect, it } from "vitest";

import { applyParams, oneOf, pageNumber, readParams } from "./urlState";

const defaults = { busca: "", status: "all", pagina: "1" };

describe("applyParams", () => {
  it("escreve só o que difere do padrão", () => {
    /*
      Endereço que carrega `status=all&pagina=1` é mais difícil de ler e não diz
      nada além do que a tela já faria sozinha.
    */
    expect(applyParams("", { busca: "viga", status: "all", pagina: "1" }, defaults)).toBe(
      "?busca=viga"
    );
  });

  it("recorte no padrão devolve endereço limpo", () => {
    expect(applyParams("?busca=viga", { ...defaults }, defaults)).toBe("");
  });

  it("preserva parâmetro que não é nosso", () => {
    /*
      `?ticket=` e `?plan=` já existem. Um deles sumir por causa de um filtro
      seria a tela derrubando a navegação de outra.
    */
    const resultado = applyParams("?ticket=t1", { busca: "viga" }, defaults);

    expect(resultado).toContain("ticket=t1");
    expect(resultado).toContain("busca=viga");
  });

  it("valor vazio sai da URL em vez de virar parâmetro vazio", () => {
    expect(applyParams("?busca=viga", { busca: "" }, defaults)).toBe("");
  });
});

describe("readParams", () => {
  it("lê o que está lá e completa com o padrão", () => {
    expect(readParams("?busca=viga", defaults)).toEqual({
      busca: "viga",
      status: "all",
      pagina: "1",
    });
  });

  it("ignora parâmetro que não foi declarado", () => {
    /*
      Aceitar qualquer parâmetro faria a tela obedecer a algo que ninguém
      escreveu, e o endereço vem de fora, colado por outra pessoa.
    */
    const resultado = readParams("?busca=viga&intruso=1", defaults);

    expect(resultado).not.toHaveProperty("intruso");
  });

  it("parâmetro presente e vazio vale como ausente", () => {
    expect(readParams("?status=", defaults).status).toBe("all");
  });
});

describe("oneOf", () => {
  it("recusa o que não está na lista", () => {
    /*
      Link colado envelhece: o estágio pode ter mudado de nome. Filtrar por um
      valor que não existe mais mostra tela vazia com cara de acervo vazio.
    */
    expect(oneOf("published", ["draft", "published"] as const, "draft")).toBe("published");
    expect(oneOf("inventado", ["draft", "published"] as const, "draft")).toBe("draft");
    expect(oneOf(undefined, ["draft", "published"] as const, "draft")).toBe("draft");
  });
});

describe("pageNumber", () => {
  it("página fora do intervalo volta para a primeira", () => {
    // Devolver vazio deixaria a tela em branco com registros logo ali.
    expect(pageNumber("3", 5)).toBe(3);
    expect(pageNumber("9", 5)).toBe(1);
    expect(pageNumber("0", 5)).toBe(1);
    expect(pageNumber("-2", 5)).toBe(1);
  });

  it("o que não é número inteiro vira a primeira", () => {
    expect(pageNumber("duas", 5)).toBe(1);
    expect(pageNumber("1.5", 5)).toBe(1);
    expect(pageNumber(undefined, 5)).toBe(1);
  });
});
