import { describe, expect, it } from "vitest";

import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

import { termosOnipresentes } from "./ubiquitousTerms";

let sequencia = 0;

const artigo = (content: string, extra: Partial<KnowledgeArticle> = {}): KnowledgeArticle => ({
  id: `art-${(sequencia += 1)}`,
  title: "Artigo",
  summary: "",
  content,
  projectId: "",
  genreId: "",
  status: "published",
  sectionId: "sec-1",
  tags: [],
  keywords: [],
  author: "",
  contentFormat: "markdown",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  ...extra,
});

/** Um acervo grande o bastante para a medição valer. */
function acervo(quantos: number, montar: (indice: number) => string): KnowledgeArticle[] {
  return Array.from({ length: quantos }, (_, indice) => artigo(montar(indice)));
}

describe("termosOnipresentes", () => {
  /*
    O caso real: a busca por relacionados apresentava "selecione", "conferir" e
    "importante" como o motivo de um artigo ser relacionado. Elas passam por
    qualquer lista escrita à mão, e o acervo diz sozinho que não distinguem.
  */
  it("reconhece o termo que está em quase todo artigo", () => {
    const artigos = acervo(100, (i) => `selecione a opção e confirme. Assunto ${i} exclusivo${i}`);

    const onipresentes = termosOnipresentes(artigos);

    expect(onipresentes.has("selecione")).toBe(true);
    expect(onipresentes.has("confirme")).toBe(true);
  });

  it("deixa passar o termo que distingue", () => {
    const artigos = acervo(100, (i) =>
      i < 5 ? "fissuracao na viga continua" : `assunto comum numero ${i}`
    );

    const onipresentes = termosOnipresentes(artigos);

    expect(onipresentes.has("fissuracao")).toBe(false);
    expect(onipresentes.has("viga")).toBe(false);
  });

  /*
    É justamente o curto que precisa ser medido: "você", "mas", "qual" e "tipo"
    têm menos de cinco letras e são o grosso do ruído.
  */
  it("mede o termo curto também", () => {
    const artigos = acervo(100, (i) => `voce pode usar o tipo ${i} aqui`);

    const onipresentes = termosOnipresentes(artigos);

    expect(onipresentes.has("voce")).toBe(true);
    expect(onipresentes.has("tipo")).toBe(true);
  });

  /*
    Com dez artigos qualquer palavra que apareça em três passa do limiar, e a
    busca ficaria sem vocabulário nenhum. Melhor casar de mais que emudecer.
  */
  it("não mede acervo pequeno demais", () => {
    const artigos = acervo(10, () => "selecione a opção e confirme");

    expect(termosOnipresentes(artigos).size).toBe(0);
  });

  /* Rascunho não é cobertura, e também não é vocabulário do acervo. */
  it("mede só o que está publicado", () => {
    const artigos = [
      ...acervo(60, (i) => `assunto exclusivo${i}`),
      ...acervo(60, () => "rascunho repetido repetido").map((item) => ({
        ...item,
        status: "draft" as const,
      })),
    ];

    expect(termosOnipresentes(artigos).has("repetido")).toBe(false);
  });

  it("respeita o limiar que recebe", () => {
    const artigos = acervo(100, (i) => (i < 30 ? "termo divisor" : `outro ${i}`));

    expect(termosOnipresentes(artigos, 0.5).has("divisor")).toBe(false);
    expect(termosOnipresentes([...artigos], 0.2).has("divisor")).toBe(true);
  });

  /* A busca roda a cada atendimento aberto; a medição é uma passada no acervo. */
  it("mede uma vez por acervo", () => {
    const artigos = acervo(100, () => "selecione a opção");

    expect(termosOnipresentes(artigos)).toBe(termosOnipresentes(artigos));
  });

  it("acervo vazio não quebra", () => {
    expect(termosOnipresentes([]).size).toBe(0);
  });
});
