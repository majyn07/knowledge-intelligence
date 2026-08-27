import { describe, expect, it } from "vitest";

import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

import { findOverlaps, MAXIMO_POR_SECAO, similarity } from "./overlap";

const artigo = (extra: Partial<KnowledgeArticle> = {}): KnowledgeArticle => ({
  id: crypto.randomUUID(),
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

/** Dois textos sobre o mesmo assunto, escritos por pessoas diferentes. */
const SOBRE_FLECHA_A =
  "<p>A verificação de flechas em vigas contínuas exige conferir o carregamento " +
  "acidental, o coeficiente de fluência e a inércia fissurada da seção resistente.</p>";

const SOBRE_FLECHA_B =
  "<p>Para conferir flechas em vigas contínuas, avalie carregamento acidental, " +
  "coeficiente de fluência e inércia fissurada da seção resistente do elemento.</p>";

const SOBRE_OUTRA_COISA =
  "<p>O detalhamento de armaduras negativas em lajes nervuradas depende do " +
  "espaçamento entre nervuras e da altura da capa de concreto adotada.</p>";

describe("similarity", () => {
  it("é 1 para conjuntos idênticos", () => {
    expect(similarity(new Set(["viga", "flecha"]), new Set(["viga", "flecha"]))).toBe(1);
  });

  it("é 0 quando não há nada em comum", () => {
    expect(similarity(new Set(["viga"]), new Set(["laje"]))).toBe(0);
  });

  it("é 0 quando um dos lados está vazio", () => {
    expect(similarity(new Set(), new Set(["viga"]))).toBe(0);
  });

  it("é simétrica", () => {
    const a = new Set(["viga", "flecha", "inercia"]);
    const b = new Set(["viga", "flecha"]);

    expect(similarity(a, b)).toBe(similarity(b, a));
  });
});

describe("findOverlaps", () => {
  it("encontra dois artigos que dizem a mesma coisa na mesma seção", () => {
    const { pairs } = findOverlaps([
      artigo({ title: "Verificação de flechas", content: SOBRE_FLECHA_A }),
      artigo({ title: "Como conferir flechas", content: SOBRE_FLECHA_B }),
    ]);

    expect(pairs).toHaveLength(1);
    expect(pairs[0].score).toBeGreaterThan(0.34);
    expect(pairs[0].shared.length).toBeGreaterThan(0);
  });

  it("não aponta artigos de assuntos diferentes", () => {
    const { pairs } = findOverlaps([
      artigo({ title: "Flechas em vigas", content: SOBRE_FLECHA_A }),
      artigo({ title: "Armaduras em lajes", content: SOBRE_OUTRA_COISA }),
    ]);

    expect(pairs).toHaveLength(0);
  });

  /*
    Dois artigos parecidos em seções diferentes costumam ser o mesmo assunto
    visto de ângulos diferentes — o desenho do portal, não defeito. Duplicata
    de verdade mora ao lado.
  */
  it("não compara entre seções diferentes", () => {
    const { pairs } = findOverlaps([
      artigo({ sectionId: "sec-vigas", content: SOBRE_FLECHA_A }),
      artigo({ sectionId: "sec-lajes", content: SOBRE_FLECHA_B }),
    ]);

    expect(pairs).toHaveLength(0);
  });

  /* Rascunho não cobre nada no portal, então não disputa com ninguém. */
  it("olha só o que está publicado", () => {
    const { pairs } = findOverlaps([
      artigo({ content: SOBRE_FLECHA_A }),
      artigo({ content: SOBRE_FLECHA_B, status: "draft" }),
    ]);

    expect(pairs).toHaveLength(0);
  });

  it("ignora artigo sem seção, que já é outro achado", () => {
    const { pairs } = findOverlaps([
      artigo({ sectionId: "", content: SOBRE_FLECHA_A }),
      artigo({ sectionId: "", content: SOBRE_FLECHA_B }),
    ]);

    expect(pairs).toHaveLength(0);
  });

  it("devolve o par mais próximo primeiro", () => {
    const { pairs } = findOverlaps(
      [
        artigo({ title: "um", content: SOBRE_FLECHA_A }),
        artigo({ title: "dois", content: SOBRE_FLECHA_B }),
        artigo({ title: "tres", content: SOBRE_FLECHA_A + SOBRE_OUTRA_COISA }),
      ],
      0.1
    );

    expect(pairs.length).toBeGreaterThan(1);
    expect(pairs[0].score).toBeGreaterThanOrEqual(pairs[1].score);
  });

  /*
    Número parcial apresentado como completo é pior que número com ressalva: a
    seção grande demais é anunciada, não pulada em silêncio.
  */
  it("anuncia a seção grande demais em vez de pulá-la calado", () => {
    const muitos = Array.from({ length: MAXIMO_POR_SECAO + 1 }, () =>
      artigo({ sectionId: "sec-gigante", content: SOBRE_FLECHA_A })
    );

    const { pairs, skippedSections } = findOverlaps(muitos);

    expect(pairs).toHaveLength(0);
    expect(skippedSections).toEqual(["sec-gigante"]);
  });

  it("não acusa nada quando a seção tem um artigo só", () => {
    expect(findOverlaps([artigo({ content: SOBRE_FLECHA_A })]).pairs).toHaveLength(0);
  });
});
