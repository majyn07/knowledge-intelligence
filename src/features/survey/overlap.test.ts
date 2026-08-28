import { describe, expect, it } from "vitest";

import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

import { findDuplicates, findOverlaps, MAXIMO_POR_SECAO } from "./overlap";

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
    visto de ângulos diferentes: o desenho do portal, não defeito. Duplicata
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

describe("findDuplicates", () => {
  /*
    Achado no acervo real: seis títulos repetidos somando treze artigos, um
    deles publicado três vezes com o corpo idêntico.
  */
  it("agrupa o mesmo título na mesma seção", () => {
    const grupos = findDuplicates([
      artigo({ title: "Como funciona o suporte", content: SOBRE_FLECHA_A }),
      artigo({ title: "Como funciona o suporte", content: SOBRE_FLECHA_A }),
    ]);

    expect(grupos).toHaveLength(1);
    expect(grupos[0].articles).toHaveLength(2);
    expect(grupos[0].identical).toBe(true);
  });

  /* O caso pior: duas versões do mesmo artigo no ar, dizendo coisas diferentes. */
  it("marca quando o conteúdo diverge entre as cópias", () => {
    const grupos = findDuplicates([
      artigo({ title: "Mesmo título", content: SOBRE_FLECHA_A }),
      artigo({ title: "Mesmo título", content: SOBRE_OUTRA_COISA }),
    ]);

    expect(grupos[0].identical).toBe(false);
  });

  /*
    O portal repete título genérico de propósito entre seções: "Interface" do
    Builder e "Interface" do Eberick são artigos distintos.
  */
  it("não acusa título repetido em seções diferentes", () => {
    expect(
      findDuplicates([
        artigo({ title: "Interface", sectionId: "sec-builder" }),
        artigo({ title: "Interface", sectionId: "sec-eberick" }),
      ])
    ).toHaveLength(0);
  });

  it("ignora diferença de caixa e espaço no título", () => {
    expect(
      findDuplicates([
        artigo({ title: "  Requisitos Mínimos " }),
        artigo({ title: "requisitos mínimos" }),
      ])
    ).toHaveLength(1);
  });

  it("olha só o que está publicado", () => {
    expect(
      findDuplicates([artigo({ title: "Igual" }), artigo({ title: "Igual", status: "draft" })])
    ).toHaveLength(0);
  });

  it("põe o grupo de mais cópias primeiro", () => {
    const grupos = findDuplicates([
      artigo({ title: "Duas" }),
      artigo({ title: "Duas" }),
      artigo({ title: "Tres" }),
      artigo({ title: "Tres" }),
      artigo({ title: "Tres" }),
    ]);

    expect(grupos[0].articles).toHaveLength(3);
  });

  it("não acusa título vazio", () => {
    expect(findDuplicates([artigo({ title: "  " }), artigo({ title: "" })])).toHaveLength(0);
  });
});
