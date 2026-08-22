import { describe, expect, it } from "vitest";

import type { Taxonomy } from "@/models/Taxonomy";

import {
  fromParams,
  LIBRARY_URL_DEFAULTS,
  sameParams,
  toParams,
} from "./libraryUrlState";

const taxonomy: Taxonomy = {
  categories: [{ id: "cat-builder", name: "AltoQi Builder", isProduct: true, order: 0 }],
  sections: [],
  genres: [],
  opportunityTypes: [],
};

const recorte = {
  filters: { search: "viga", status: "published" as const, categoryId: "cat-builder" },
  sort: { column: "title" as const, direction: "asc" as const },
  page: 3,
};

describe("toParams", () => {
  it("traduz o recorte inteiro", () => {
    expect(toParams(recorte.filters, recorte.sort, recorte.page)).toEqual({
      busca: "viga",
      estagio: "published",
      categoria: "cat-builder",
      ordem: "title",
      sentido: "asc",
      pagina: "3",
    });
  });

  it("a busca vai sem espaço em volta", () => {
    // Senão o mesmo recorte gera dois endereços diferentes.
    expect(toParams({ ...recorte.filters, search: "  viga  " }, recorte.sort, 1).busca).toBe("viga");
  });
});

describe("fromParams", () => {
  it("volta o recorte que foi escrito", () => {
    const params = toParams(recorte.filters, recorte.sort, recorte.page);

    expect(fromParams(params, taxonomy, 5)).toEqual(recorte);
  });

  it("categoria que não existe mais volta para todas", () => {
    /*
      O endereço é colado por outra pessoa e envelhece. Filtrar por uma
      categoria removida mostra tela vazia com cara de acervo vazio, e quem
      abriu o link não tem como saber que o problema é o link.
    */
    const params = { ...LIBRARY_URL_DEFAULTS, categoria: "cat-que-sumiu" };

    expect(fromParams(params, taxonomy, 5).filters.categoryId).toBe("all");
  });

  it("sem seção continua sendo um recorte válido", () => {
    // É o filtro que a importação torna útil: apontar para os que ficaram sem.
    const params = { ...LIBRARY_URL_DEFAULTS, categoria: "unset" };

    expect(fromParams(params, taxonomy, 5).filters.categoryId).toBe("unset");
  });

  it("estágio e coluna inventados voltam ao padrão", () => {
    const params = { ...LIBRARY_URL_DEFAULTS, estagio: "lixo", ordem: "coluna-inventada" };
    const resultado = fromParams(params, taxonomy, 5);

    expect(resultado.filters.status).toBe("all");
    expect(resultado.sort.column).toBe("updatedAt");
  });

  it("página fora do intervalo volta para a primeira", () => {
    // Devolver vazio deixaria a tela em branco com registros logo ali.
    expect(fromParams({ ...LIBRARY_URL_DEFAULTS, pagina: "9" }, taxonomy, 3).page).toBe(1);
    expect(fromParams({ ...LIBRARY_URL_DEFAULTS, pagina: "2" }, taxonomy, 3).page).toBe(2);
  });

  it("URL vazia devolve o padrão", () => {
    const resultado = fromParams(LIBRARY_URL_DEFAULTS, taxonomy, 1);

    expect(resultado.filters).toEqual({ search: "", status: "all", categoryId: "all" });
    expect(resultado.sort).toEqual({ column: "updatedAt", direction: "desc" });
    expect(resultado.page).toBe(1);
  });
});

describe("sameParams", () => {
  it("compara só o que é nosso", () => {
    const a = toParams(recorte.filters, recorte.sort, 1);

    expect(sameParams(a, { ...a })).toBe(true);
    expect(sameParams(a, { ...a, ticket: "t1" })).toBe(true);
    expect(sameParams(a, { ...a, busca: "outra" })).toBe(false);
  });
});
