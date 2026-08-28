import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { Taxonomy, TaxonomyCategory, TaxonomySection } from "@/models/Taxonomy";

/**
 * Cobertura documental por seção do portal.
 *
 * A Biblioteca sabe listar o que existe. Esta é a pergunta inversa, e a mais
 * difícil de responder olhando uma lista: **o que não existe**. Com 146 seções
 * espelhadas do portal, as lacunas não aparecem sozinhas.
 */

export interface SectionCoverage {
  section: TaxonomySection;
  /** Só publicado conta: a análise não enxerga rascunho nem revisão. */
  published: number;
  /** Em rascunho ou revisão, trabalho começado, cobertura ainda não. */
  inProgress: number;
}

export interface CategoryCoverage {
  category: TaxonomyCategory;
  sections: SectionCoverage[];
  publishedTotal: number;
  /** Quantas seções não têm nenhum artigo publicado. */
  gaps: number;
}

/**
 * Conta por seção, e só entre as categorias de linha de produto.
 *
 * As áreas de apoio (QiOnboarding, Education, Novidades de Release)
 * publicam artigo, mas não são alvo do ciclo de conhecimento: medir lacuna
 * nelas produziria um número grande e sem ação por trás.
 */
export function buildCoverage(
  taxonomy: Taxonomy,
  articles: KnowledgeArticle[]
): CategoryCoverage[] {
  const published = new Map<string, number>();
  const inProgress = new Map<string, number>();

  for (const article of articles) {
    if (article.sectionId === "") continue;

    const target = article.status === "published" ? published : inProgress;

    // Arquivado não conta em nenhum dos dois: foi retirado de circulação.
    if (article.status === "archived") continue;

    target.set(article.sectionId, (target.get(article.sectionId) ?? 0) + 1);
  }

  return taxonomy.categories
    .filter((category) => category.isProduct)
    .map((category) => {
      const sections = taxonomy.sections
        .filter((section) => section.categoryId === category.id)
        .sort((a, b) => a.order - b.order)
        .map((section) => ({
          section,
          published: published.get(section.id) ?? 0,
          inProgress: inProgress.get(section.id) ?? 0,
        }));

      return {
        category,
        sections,
        publishedTotal: sections.reduce((sum, item) => sum + item.published, 0),
        gaps: sections.filter((item) => item.published === 0).length,
      };
    });
}

/** Quantos artigos ficaram sem seção. Eles não contam para cobertura nenhuma. */
export function unclassifiedCount(articles: KnowledgeArticle[]): number {
  return articles.filter(
    (article) => article.sectionId === "" && article.status !== "archived"
  ).length;
}

/**
 * Resumo de uma frase, para o topo da tela.
 *
 * Devolve os números crus e não o texto: quem exibe decide como dizer, e o
 * cálculo continua testável sem depender de redação.
 */
export function coverageSummary(coverage: CategoryCoverage[]) {
  const sections = coverage.reduce((sum, item) => sum + item.sections.length, 0);
  const gaps = coverage.reduce((sum, item) => sum + item.gaps, 0);

  return {
    sections,
    gaps,
    covered: sections - gaps,
    /** Fração coberta, ou `null` quando não há seção, evita dividir por zero. */
    ratio: sections === 0 ? null : (sections - gaps) / sections,
  };
}
