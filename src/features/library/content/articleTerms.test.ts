import { describe, expect, it } from "vitest";

import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

import { articleTermFrequency, isMeaningfulTerm, jaccard, termsOf } from "./articleTerms";

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

describe("isMeaningfulTerm", () => {
  it("aceita palavra técnica de cinco letras ou mais", () => {
    expect(isMeaningfulTerm("flecha")).toBe(true);
  });

  it("recusa palavra curta e palavra que está em todo artigo", () => {
    expect(isMeaningfulTerm("viga")).toBe(false);
    expect(isMeaningfulTerm("janela")).toBe(false);
  });

  /*
    Medido contra o acervo: com o corte por tamanho, "Erro D15" e "Erro D16"
    apareciam como artigos **idênticos**, porque o único termo que os distinguia
    era o descartado. O mesmo valia para "Eberick V9" e "V10".
  */
  it("aceita código curto, que é o que distingue artigos vizinhos", () => {
    expect(isMeaningfulTerm("d15")).toBe(true);
    expect(isMeaningfulTerm("v10")).toBe(true);
    expect(isMeaningfulTerm("nbr6118")).toBe(true);
  });

  it("não confunde número puro com código", () => {
    expect(isMeaningfulTerm("2026")).toBe(false);
  });
});

describe("termsOf", () => {
  it("tira acento e caixa", () => {
    expect(termsOf("Instalação")).toEqual(["instalacao"]);
  });

  it("separa por qualquer coisa que não seja letra ou dígito", () => {
    expect(termsOf("flecha, fissurada; nervura")).toEqual(["flecha", "fissurada", "nervura"]);
  });
});

describe("termFrequency", () => {
  it("conta as palavras do título, do resumo e do corpo", () => {
    const contagem = articleTermFrequency(
      artigo({ title: "Flecha", summary: "flecha", content: "<p>flecha excessiva</p>" })
    );

    expect(contagem.get("flecha")).toBe(3);
    expect(contagem.get("excessiva")).toBe(1);
  });

  /* Sem isso, "o que é único aqui" devolveria "janela, clique, botão". */
  it("descarta as palavras que aparecem em todo artigo do portal", () => {
    const contagem = articleTermFrequency(artigo({ content: "<p>clique na janela do projeto</p>" }));
    expect(contagem.size).toBe(0);
  });

  it("descarta palavra curta demais para distinguir assunto", () => {
    expect(articleTermFrequency(artigo({ content: "<p>viga laje</p>" })).size).toBe(0);
  });

  it("não conta a marcação", () => {
    const contagem = articleTermFrequency(artigo({ content: '<div class="fluida"><p>flecha</p></div>' }));

    expect(contagem.has("fluida")).toBe(false);
    expect(contagem.get("flecha")).toBe(1);
  });
});

describe("similarity", () => {
  it("é 1 para conjuntos idênticos", () => {
    expect(jaccard(new Set(["viga", "flecha"]), new Set(["viga", "flecha"]))).toBe(1);
  });

  it("é 0 quando não há nada em comum", () => {
    expect(jaccard(new Set(["viga"]), new Set(["laje"]))).toBe(0);
  });

  it("é 0 quando um dos lados está vazio", () => {
    expect(jaccard(new Set(), new Set(["viga"]))).toBe(0);
  });

  it("é simétrica", () => {
    const a = new Set(["viga", "flecha", "inercia"]);
    const b = new Set(["viga", "flecha"]);

    expect(jaccard(a, b)).toBe(jaccard(b, a));
  });
});

