import { describe, expect, it } from "vitest";

import { buildPortalTaxonomy } from "@/features/taxonomy/mock/portalTaxonomy";
import type { ArticleStatus, KnowledgeArticle } from "@/models/KnowledgeArticle";

import { buildCoverage, coverageSummary, unclassifiedCount } from "./sectionCoverage";

const taxonomy = buildPortalTaxonomy();

function artigo(sectionId: string, status: ArticleStatus = "published"): KnowledgeArticle {
  return {
    id: `${sectionId}-${status}-${Math.random()}`,
    title: "Artigo",
    summary: "",
    content: "",
    projectId: "p1",
    genreId: "gen-artigo",
    status,
    sectionId,
    tags: [],
    keywords: [],
    author: "",
    contentFormat: "markdown" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("buildCoverage", () => {
  it("cobre só as linhas de produto", () => {
    // Áreas de apoio publicam artigo, mas não são alvo do ciclo: medir lacuna
    // nelas daria um número grande sem ação por trás.
    const nomes = buildCoverage(taxonomy, []).map((item) => item.category.name);

    expect(nomes).toContain("AltoQi Builder");
    expect(nomes).not.toContain("QiOnboarding");
    expect(nomes).not.toContain("Novidades de Release");
  });

  it("acervo vazio é lacuna em toda seção", () => {
    const builder = buildCoverage(taxonomy, []).find((c) => c.category.name === "AltoQi Builder")!;

    expect(builder.gaps).toBe(50);
    expect(builder.publishedTotal).toBe(0);
  });

  it("só publicado conta como cobertura", () => {
    // A análise não enxerga rascunho nem revisão — a regra é a mesma aqui.
    const coverage = buildCoverage(taxonomy, [
      artigo("sec-altoqi-visus-workflow", "draft"),
      artigo("sec-altoqi-visus-collab", "review"),
      artigo("sec-altoqi-visus-planning", "published"),
    ]);

    const visus = coverage.find((c) => c.category.name === "AltoQi Visus")!;

    expect(visus.publishedTotal).toBe(1);
    expect(visus.gaps).toBe(7);

    const workflow = visus.sections.find((s) => s.section.name === "Workflow")!;
    expect(workflow.published).toBe(0);
    expect(workflow.inProgress).toBe(1);
  });

  it("arquivado não conta em nenhum dos dois — saiu de circulação", () => {
    const coverage = buildCoverage(taxonomy, [
      artigo("sec-altoqi-visus-bid", "archived"),
    ]);

    const bid = coverage
      .find((c) => c.category.name === "AltoQi Visus")!
      .sections.find((s) => s.section.name === "Bid")!;

    expect(bid.published).toBe(0);
    expect(bid.inProgress).toBe(0);
  });

  it("artigo sem seção não cobre nada", () => {
    const coverage = buildCoverage(taxonomy, [artigo("")]);
    const total = coverage.reduce((sum, item) => sum + item.publishedTotal, 0);

    expect(total).toBe(0);
  });

  it("vários artigos na mesma seção contam todos", () => {
    const coverage = buildCoverage(taxonomy, [
      artigo("sec-altoqi-visus-workflow"),
      artigo("sec-altoqi-visus-workflow"),
    ]);

    const workflow = coverage
      .find((c) => c.category.name === "AltoQi Visus")!
      .sections.find((s) => s.section.name === "Workflow")!;

    expect(workflow.published).toBe(2);
  });
});

describe("unclassifiedCount", () => {
  it("conta o que ficou sem seção, ignorando arquivado", () => {
    const articles = [artigo(""), artigo("", "draft"), artigo("", "archived"), artigo("sec-altoqi-visus-bid")];

    expect(unclassifiedCount(articles)).toBe(2);
  });
});

describe("coverageSummary", () => {
  it("resume seções, lacunas e proporção", () => {
    const coverage = buildCoverage(taxonomy, [artigo("sec-altoqi-visus-workflow")]);
    const resumo = coverageSummary(coverage);

    // 50 + 38 + 18 + 8 + 4 + 2 + 0 nas categorias de produto.
    expect(resumo.sections).toBe(120);
    expect(resumo.covered).toBe(1);
    expect(resumo.gaps).toBe(119);
    expect(resumo.ratio).toBeCloseTo(1 / 120);
  });

  it("sem seção nenhuma devolve proporção nula, e não divisão por zero", () => {
    expect(coverageSummary([]).ratio).toBeNull();
  });
});
