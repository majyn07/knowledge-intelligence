import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { STORAGE_KEYS } from "@/lib/storage";

import { guardarRascunho, normalizarRascunho, retirarRascunho } from "./draftHandoff";

/* O mesmo dublê mínimo de `lib/storage.test`: não há localStorage no Node. */
function instalarArmazenamento() {
  const dados = new Map<string, string>();

  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", {
    getItem: (chave: string) => dados.get(chave) ?? null,
    setItem: (chave: string, valor: string) => dados.set(chave, valor),
    removeItem: (chave: string) => dados.delete(chave),
  });

  return dados;
}

const rascunho = {
  title: "Modelo IFC abre deslocado",
  summary: "Como reposicionar antes de exportar",
  content: "## Passos\n1. Abra o menu Arquivo.",
  origem: "Fila de triagem",
};

describe("entrega de rascunho", () => {
  let guardado: Map<string, string>;

  beforeEach(() => {
    guardado = instalarArmazenamento();
  });

  afterEach(() => vi.unstubAllGlobals());

  it("o que foi guardado chega inteiro", () => {
    guardarRascunho(rascunho);

    expect(retirarRascunho()).toEqual(rascunho);
  });

  /*
    É entrega, não estado: se ficasse, abrir o formulário na semana seguinte
    traria de volta um rascunho que a pessoa já decidiu não usar.
  */
  it("a chave some na leitura", () => {
    guardarRascunho(rascunho);
    retirarRascunho();

    expect(retirarRascunho()).toBeNull();
    expect(guardado.has(STORAGE_KEYS.articleHandoff)).toBe(false);
  });

  it("sem nada guardado devolve nulo, e não quebra", () => {
    expect(retirarRascunho()).toBeNull();
  });
});

/*
  Todo dado lido do armazenamento passa por normalizador: ele foi gravado por
  alguma versão do produto, possivelmente anterior a esta.
*/
describe("normalizarRascunho", () => {
  it("campo ausente vira texto vazio, e não derruba o formulário", () => {
    expect(normalizarRascunho({ title: "Só o título" })).toEqual({
      title: "Só o título",
      summary: "",
      content: "",
      origem: "",
    });
  });

  it("o que não é rascunho vira nulo", () => {
    expect(normalizarRascunho(null)).toBeNull();
    expect(normalizarRascunho("texto solto")).toBeNull();
    expect(normalizarRascunho(42)).toBeNull();
  });

  /* Anunciar uma entrega vazia é pior que abrir o formulário em branco. */
  it("sem título e sem conteúdo não é entrega", () => {
    expect(normalizarRascunho({ title: "", content: "", summary: "algo" })).toBeNull();
  });

  it("tipo errado num campo não vira o valor errado", () => {
    expect(normalizarRascunho({ title: "Certo", content: 12, summary: null })).toEqual({
      title: "Certo",
      summary: "",
      content: "",
      origem: "",
    });
  });
});
