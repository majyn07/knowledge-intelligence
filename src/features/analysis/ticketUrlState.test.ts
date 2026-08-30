import { describe, expect, it } from "vitest";

import { applyParams, readParams } from "@/lib/urlState";

import {
  defaultTicketFilters,
  defaultTicketSort,
  readTicketRecorte,
  TICKET_URL_DEFAULTS,
  toTicketParams,
} from "./ticketUrlState";

const EMPRESAS = ["Construtora Alfa", "Beta Engenharia"];

describe("readTicketRecorte", () => {
  it("lê o recorte inteiro do endereço", () => {
    const params = readParams(
      "?busca=flecha&etapa=a-analisar&empresa=Construtora%20Alfa&ordem=antigos&pagina=3",
      TICKET_URL_DEFAULTS
    );

    const recorte = readTicketRecorte(params, EMPRESAS, 5);

    expect(recorte.filters).toEqual({
      client: "all",
      product: "all",
      search: "flecha",
      stage: "a-analisar",
      company: "Construtora Alfa",
    });
    expect(recorte.sort).toBe("antigos");
    expect(recorte.page).toBe(3);
  });

  it("sem parâmetro nenhum, devolve o padrão", () => {
    const recorte = readTicketRecorte(readParams("", TICKET_URL_DEFAULTS), EMPRESAS, 1);

    expect(recorte.filters).toEqual(defaultTicketFilters);
    expect(recorte.sort).toBe("atividade");
    expect(recorte.page).toBe(1);
  });

  /*
    Link colado envelhece. Filtrar por uma etapa que não existe mostraria tela
    vazia com cara de fila vazia, sem quem abriu ter como saber que é o link.
  */
  it("etapa desconhecida volta para todas", () => {
    const params = readParams("?etapa=inventada", TICKET_URL_DEFAULTS);

    expect(readTicketRecorte(params, EMPRESAS, 1).filters.stage).toBe("all");
  });

  /* Empresa aqui não é cadastro: é o que veio escrito no arquivo. */
  it("empresa que não está mais na base volta para todas", () => {
    const params = readParams("?empresa=Sumiu%20Ltda", TICKET_URL_DEFAULTS);

    expect(readTicketRecorte(params, EMPRESAS, 1).filters.company).toBe("all");
  });

  it("ordem desconhecida volta para a padrão", () => {
    const params = readParams("?ordem=aleatoria", TICKET_URL_DEFAULTS);

    expect(readTicketRecorte(params, EMPRESAS, 1).sort).toBe("atividade");
  });

  /* Página fora do intervalo volta para a primeira, em vez de mostrar vazio. */
  it("página além do total volta para a primeira", () => {
    const params = readParams("?pagina=40", TICKET_URL_DEFAULTS);

    expect(readTicketRecorte(params, EMPRESAS, 3).page).toBe(1);
  });

  it("página que não é número volta para a primeira", () => {
    const params = readParams("?pagina=abc", TICKET_URL_DEFAULTS);

    expect(readTicketRecorte(params, EMPRESAS, 3).page).toBe(1);
  });
});

describe("toTicketParams", () => {
  /* O que está no padrão sai da URL: endereço que só repete o padrão não diz nada. */
  it("o padrão não aparece no endereço", () => {
    const query = applyParams(
      "",
      toTicketParams(defaultTicketFilters, defaultTicketSort, 1),
      TICKET_URL_DEFAULTS
    );

    expect(query).toBe("");
  });

  it("escreve só o que difere do padrão", () => {
    const query = applyParams(
      "",
      toTicketParams({ search: "flecha", stage: "a-analisar", company: "all", client: "all", product: "all" }, defaultTicketSort, 2),
      TICKET_URL_DEFAULTS
    );

    expect(query).toContain("busca=flecha");
    expect(query).toContain("etapa=a-analisar");
    expect(query).toContain("pagina=2");
    expect(query).not.toContain("empresa");
    expect(query).not.toContain("ordem");
  });

  /*
    `?ticket=` já existe nesta tela, e sumir por causa de um filtro seria uma
    parte da tela derrubando a navegação da outra.
  */
  it("preserva o parâmetro que não é nosso", () => {
    const query = applyParams(
      "?ticket=tic-7",
      toTicketParams({ ...defaultTicketFilters, search: "viga" }, defaultTicketSort, 1),
      TICKET_URL_DEFAULTS
    );

    expect(query).toContain("ticket=tic-7");
    expect(query).toContain("busca=viga");
  });

  it("a busca vai sem espaço em volta", () => {
    const query = applyParams(
      "",
      toTicketParams({ ...defaultTicketFilters, search: "  flecha  " }, defaultTicketSort, 1),
      TICKET_URL_DEFAULTS
    );

    expect(query).toBe("?busca=flecha");
  });
});

/*
  Cliente e produto entram pela mesma regra da empresa: link colado envelhece, e
  filtrar por alguém que sumiu da base mostra tela vazia com cara de fila vazia.
*/
describe("cliente e produto no endereço", () => {
  it("lê os dois quando existem hoje", () => {
    const recorte = readTicketRecorte(
      { cliente: "Guilherme Barcelos", produto: "AltoQi Eberick" },
      EMPRESAS,
      5,
      ["Guilherme Barcelos"],
      ["AltoQi Eberick"]
    );

    expect(recorte.filters.client).toBe("Guilherme Barcelos");
    expect(recorte.filters.product).toBe("AltoQi Eberick");
  });

  it("volta para todos quando o valor não existe mais", () => {
    const recorte = readTicketRecorte(
      { cliente: "Quem Saiu", produto: "Produto Extinto" },
      EMPRESAS,
      5,
      ["Guilherme Barcelos"],
      ["AltoQi Eberick"]
    );

    expect(recorte.filters.client).toBe("all");
    expect(recorte.filters.product).toBe("all");
  });

  it("o que está no padrão sai do endereço", () => {
    const params = toTicketParams(
      { ...defaultTicketFilters, client: "Ana" },
      defaultTicketSort,
      1
    );

    expect(params.cliente).toBe("Ana");
    expect(params.produto).toBe("all");
  });
});
