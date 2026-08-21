import { describe, expect, it } from "vitest";

import {
  fromSavedView,
  matchesView,
  normalizeSavedView,
  parseSavedViews,
  toSavedView,
} from "./savedViews";
import { defaultColumns } from "./tableView";

describe("normalizeSavedView", () => {
  it("garante a forma a partir de um registro incompleto", () => {
    const view = normalizeSavedView({ id: "v1", name: "Elétrica pendente" });

    expect(view).toEqual({
      id: "v1",
      name: "Elétrica pendente",
      filters: { search: "", status: "all", categoryId: "all" },
      sort: { column: "updatedAt", direction: "desc" },
      columns: defaultColumns,
      order: 0,
    });
  });

  it("estágio desconhecido vira todos, e não derruba a tela", () => {
    const view = normalizeSavedView({ id: "v", filters: { status: "inventado" } });

    expect(view.filters.status).toBe("all");
  });

  it("coluna que não existe mais é descartada", () => {
    const view = normalizeSavedView({ id: "v", columns: ["title", "coluna-que-sumiu", "status"] });

    expect(view.columns).toEqual(["title", "status"]);
  });

  it("o título nunca some, mesmo se a visão não o guardar", () => {
    /*
      Sem ele a linha deixa de identificar o registro, e a tabela vira um
      conjunto de atributos sem sujeito.
    */
    const view = normalizeSavedView({ id: "v", columns: ["status", "author"] });

    expect(view.columns).toContain("title");
  });

  it("as colunas voltam na ordem do cadastro, não na ordem gravada", () => {
    // Senão a tabela trocaria de forma a cada leitura.
    const view = normalizeSavedView({ id: "v", columns: ["author", "status", "title"] });

    expect(view.columns).toEqual(["title", "status", "author"]);
  });

  it("lista de colunas vazia cai no padrão", () => {
    expect(normalizeSavedView({ id: "v", columns: [] }).columns).toEqual(defaultColumns);
  });
});

describe("parseSavedViews", () => {
  it("lê na ordem", () => {
    const raw = JSON.stringify([
      { id: "b", name: "B", order: 1 },
      { id: "a", name: "A", order: 0 },
    ]);

    expect(parseSavedViews(raw).map((v) => v.id)).toEqual(["a", "b"]);
  });

  it("conteúdo que não é lista vira lista vazia", () => {
    expect(parseSavedViews(JSON.stringify({ id: "a" }))).toEqual([]);
  });
});

describe("linha do banco", () => {
  it("ida e volta preserva a visão", () => {
    const view = normalizeSavedView({
      id: "v1",
      name: "Sem responsável",
      filters: { search: "erro", status: "review", categoryId: "cat-builder" },
      sort: { column: "author", direction: "asc" },
      columns: ["title", "author"],
      order: 3,
    });

    expect(toSavedView(fromSavedView(view))).toEqual(view);
  });
});

describe("matchesView", () => {
  const view = normalizeSavedView({
    id: "v",
    filters: { search: "erro", status: "review", categoryId: "all" },
    sort: { column: "title", direction: "asc" },
  });

  it("reconhece o recorte que está na tela", () => {
    expect(
      matchesView(
        view,
        { search: "erro", status: "review", categoryId: "all" },
        { column: "title", direction: "asc" }
      )
    ).toBe(true);
  });

  it("espaço em volta da busca não desfaz a correspondência", () => {
    // Quem digita costuma deixar um espaço, e a visão deixaria de aparecer
    // marcada sem que nada tivesse mudado de fato.
    expect(
      matchesView(
        view,
        { search: "  erro ", status: "review", categoryId: "all" },
        { column: "title", direction: "asc" }
      )
    ).toBe(true);
  });

  it("outra ordenação é outro recorte", () => {
    expect(
      matchesView(
        view,
        { search: "erro", status: "review", categoryId: "all" },
        { column: "title", direction: "desc" }
      )
    ).toBe(false);
  });
});
