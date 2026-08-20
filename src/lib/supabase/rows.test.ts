import { describe, expect, it } from "vitest";

import { buildPortalTaxonomy } from "@/features/taxonomy/mock/portalTaxonomy";

import { fromArticle, fromTaxonomy, toArticle, toTaxonomy } from "./rows";

const linha = {
  id: "a1",
  project_id: "p1",
  title: "Erro ao autenticar",
  summary: "Resumo",
  content: "Corpo",
  status: "published",
  section_id: "sec-altoqi-visus-workflow",
  genre_id: "gen-artigo",
  portal_article_id: null,
  url: null,
  tags: ["acesso"],
  keywords: ["login"],
  author: "Raoni Milioli da Silva",
  source: null,
  created_at: "2026-05-01T00:00:00.000Z",
  updated_at: "2026-05-02T00:00:00.000Z",
};

describe("toArticle", () => {
  it("converte a linha completa", () => {
    const article = toArticle(linha);

    expect(article.id).toBe("a1");
    expect(article.sectionId).toBe("sec-altoqi-visus-workflow");
    expect(article.status).toBe("published");
    expect(article.createdAt).toBeInstanceOf(Date);
  });

  it("nulo de coluna vira string vazia, não `null`", () => {
    const article = toArticle({ ...linha, section_id: null, genre_id: null, author: null });

    expect(article.sectionId).toBe("");
    expect(article.genreId).toBe("");
    expect(article.author).toBe("");
  });

  it("o registro sobrevive a .trim() mesmo com colunas nulas", () => {
    const article = toArticle({ id: "a1" });

    expect(() =>
      [article.title, article.summary, article.author, article.sectionId].map((f) => f.trim())
    ).not.toThrow();
  });

  it("recusa estágio que o banco não deveria ter deixado entrar", () => {
    expect(toArticle({ ...linha, status: "inventado" }).status).toBe("draft");
  });

  it("não inventa url, origem nem id do portal quando são nulos", () => {
    const article = toArticle(linha);

    expect(article.url).toBeUndefined();
    expect(article.source).toBeUndefined();
    expect(article.portalArticleId).toBeUndefined();
  });

  it("preserva a origem quando o plano existe", () => {
    const article = toArticle({
      ...linha,
      source: { projectId: "p1", ticketId: "45812", analysisId: "an1", opportunityId: "op1", planId: "pl1" },
    });

    expect(article.source?.planId).toBe("pl1");
  });

  it("descarta itens não textuais nas listas", () => {
    expect(toArticle({ ...linha, tags: ["ok", 3, null] }).tags).toEqual(["ok"]);
  });

  it("sobrevive a resposta que não é objeto", () => {
    expect(() => toArticle(null)).not.toThrow();
    expect(toArticle("texto solto").id).toBe("");
  });
});

describe("fromArticle", () => {
  it("vazio volta a ser nulo nas colunas com chave estrangeira", () => {
    const row = fromArticle({ ...toArticle(linha), sectionId: "", genreId: "" });

    // Gravar "" violaria a referência: não existe seção de id vazio.
    expect(row.section_id).toBeNull();
    expect(row.genre_id).toBeNull();
  });

  it("ida e volta preserva o artigo", () => {
    const original = toArticle(linha);
    const voltou = toArticle(fromArticle(original));

    expect(voltou).toEqual(original);
  });
});

describe("toTaxonomy", () => {
  const { categories, sections, entries } = fromTaxonomy(buildPortalTaxonomy());

  it("remonta a taxonomia inteira a partir das três tabelas", () => {
    const taxonomy = toTaxonomy(categories, sections, entries);

    expect(taxonomy.categories).toHaveLength(13);
    expect(taxonomy.sections).toHaveLength(146);
    expect(taxonomy.genres.map((genre) => genre.name)).toEqual([
      "Artigo",
      "FAQ",
      "Workflow",
      "Documento",
      "Template",
    ]);
  });

  it("separa as duas listas simples pela coluna `list`", () => {
    const taxonomy = toTaxonomy(categories, sections, entries);

    expect(taxonomy.opportunityTypes).toHaveLength(5);
    expect(taxonomy.opportunityTypes.map((entry) => entry.name)).toContain("Novo artigo");
  });

  it("descarta seção cuja categoria não veio na resposta", () => {
    const taxonomy = toTaxonomy(
      [{ id: "cat-a", name: "A", is_product: true, position: 0 }],
      [
        { id: "sec-a-1", category_id: "cat-a", name: "Fica", position: 0 },
        { id: "sec-b-1", category_id: "cat-b", name: "Sai", position: 0 },
      ],
      []
    );

    expect(taxonomy.sections.map((section) => section.name)).toEqual(["Fica"]);
  });

  it("descarta registro sem id em vez de inventar um", () => {
    const taxonomy = toTaxonomy([{ name: "Sem id", is_product: true, position: 0 }], [], []);

    expect(taxonomy.categories).toEqual([]);
  });

  it("sobrevive a resposta vazia ou irreconhecível", () => {
    expect(toTaxonomy(null, undefined, "nada").categories).toEqual([]);
  });

  it("ida e volta preserva a estrutura", () => {
    const original = buildPortalTaxonomy();
    const { categories: c, sections: s, entries: e } = fromTaxonomy(original);
    const voltou = toTaxonomy(c, s, e);

    expect(voltou.categories).toEqual(original.categories);
    expect(voltou.sections).toEqual(original.sections);
  });
});
