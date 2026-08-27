import { describe, expect, it } from "vitest";

import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

import { compareArticles, compareFields } from "./articleCompare";

const artigo = (extra: Partial<KnowledgeArticle> = {}): KnowledgeArticle => ({
  id: "art",
  title: "Artigo",
  summary: "",
  content: "",
  projectId: "",
  genreId: "",
  status: "published",
  sectionId: "sec-vigas",
  tags: [],
  keywords: [],
  author: "",
  contentFormat: "html",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  ...extra,
});

const secao = (id: string) => (id === "sec-vigas" ? "Eberick › Vigas" : "Eberick › Lajes");

describe("compareArticles", () => {
  const a = artigo({
    content: "<p>flecha flecha fissurada fissurada nervura nervura</p>",
  });
  const b = artigo({
    content: "<p>flecha flecha fissurada fissurada armadura armadura</p>",
  });

  it("separa o que é de cada um e o que é dos dois", () => {
    const r = compareArticles(a, b);

    expect(r.onlyA).toEqual(["nervura"]);
    expect(r.onlyB).toEqual(["armadura"]);
    expect(r.shared).toEqual(expect.arrayContaining(["flecha", "fissurada"]));
  });

  /*
    Termo citado uma vez de passagem não é assunto do artigo. Listá-lo como
    exclusivo mandaria alguém preservar uma menção solta achando que preserva
    conteúdo.
  */
  it("ignora o que aparece uma vez só", () => {
    const comMencao = artigo({ content: "<p>flecha flecha mencionado</p>" });
    const outro = artigo({ content: "<p>flecha flecha</p>" });

    expect(compareArticles(comMencao, outro).onlyA).toEqual([]);
  });

  it("ordena do mais frequente para o menos", () => {
    // Cinco letras é o mínimo para a palavra contar como assunto.
    const muitos = artigo({ content: "<p>alfabeto alfabeto alfabeto betume betume</p>" });
    const nenhum = artigo({ content: "<p>gamado gamado</p>" });

    expect(compareArticles(muitos, nenhum).onlyA).toEqual(["alfabeto", "betume"]);
  });

  it("mede o vocabulário em comum", () => {
    expect(compareArticles(a, a).score).toBe(1);
    expect(compareArticles(a, b).score).toBeGreaterThan(0);
    expect(compareArticles(a, b).score).toBeLessThan(1);
  });

  it("não divide por zero quando os dois estão vazios", () => {
    expect(compareArticles(artigo(), artigo()).score).toBe(0);
  });
});

describe("compareFields", () => {
  it("marca o que difere e o que é igual", () => {
    const campos = compareFields(
      artigo({ sectionId: "sec-vigas", author: "Equipe A" }),
      artigo({ sectionId: "sec-lajes", author: "Equipe A" }),
      secao
    );

    expect(campos.find((c) => c.label === "Seção")?.same).toBe(false);
    expect(campos.find((c) => c.label === "Responsável")?.same).toBe(true);
  });

  /* "published" é contrato; quem lê a tela lê "Publicado". */
  it("mostra o rótulo do estágio, não a chave", () => {
    const campos = compareFields(artigo(), artigo({ status: "draft" }), secao);
    const estagio = campos.find((c) => c.label === "Estágio")!;

    expect(estagio.a).toBe("Publicado");
    expect(estagio.b).toBe("Rascunho");
  });

  it("diz quando o campo está vazio, em vez de deixar em branco", () => {
    const campos = compareFields(artigo(), artigo(), secao);

    expect(campos.find((c) => c.label === "Responsável")?.a).toBe("não definido");
    expect(campos.find((c) => c.label === "Resumo")?.a).toBe("sem resumo");
  });

  it("mede o tamanho pelo texto, não pela marcação", () => {
    const campos = compareFields(
      artigo({ content: "<div><p>abc</p></div>" }),
      artigo({ content: "<p>abc</p>" }),
      secao
    );

    expect(campos.find((c) => c.label === "Tamanho")?.same).toBe(true);
  });
});
