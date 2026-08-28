/**
 * Taxonomia do conteúdo, espelho da estrutura do portal publicado.
 *
 * O suporte.altoqi.com.br organiza tudo em categoria → seção → artigo, e não
 * tem campo de tipo. Este modelo reproduz isso: as duas primeiras entidades
 * são a estrutura, e o artigo aponta para uma seção.
 *
 * Nada aqui é fixo no código. A semente traz o portal como estava quando foi
 * levantado, mas o portal muda e quem usa precisa acompanhar sem pedir deploy.
 */

/** Categoria do portal, linha de produto ou área de apoio. */
export interface TaxonomyCategory {
  id: string;
  name: string;
  /**
   * Distingue linha de produto de área de apoio (QiOnboarding, Education,
   * Novidades de Release). As duas publicam artigo, mas só a primeira é
   * alvo do ciclo de conhecimento.
   */
  isProduct: boolean;
  order: number;
}

/** Seção dentro de uma categoria. É onde o artigo efetivamente mora. */
export interface TaxonomySection {
  id: string;
  categoryId: string;
  name: string;
  order: number;
}

/**
 * Lista simples de preenchimento, gênero do artigo, tipo de oportunidade.
 * Mesma forma para todas, porque o comportamento é o mesmo: criar, renomear,
 * remover, ordenar.
 */
export interface TaxonomyEntry {
  id: string;
  name: string;
  order: number;
}

/** Tudo que a taxonomia guarda, num único registro persistido. */
export interface Taxonomy {
  categories: TaxonomyCategory[];
  sections: TaxonomySection[];
  /** Gênero editorial do artigo. Substitui o antigo enum `ArticleType`. */
  genres: TaxonomyEntry[];
  /** O que uma oportunidade pode ser. Substitui o antigo `OpportunityType`. */
  opportunityTypes: TaxonomyEntry[];
}

/**
 * Identificador estável a partir do nome.
 *
 * Precisa ser determinístico para que a semente produza sempre os mesmos ids
 * e a migração de artigos antigos possa apontar para eles. Renomear depois não
 * muda o id: o vínculo é o id, não o texto.
 */
export function taxonomyId(prefix: string, name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);

  return `${prefix}-${slug}`;
}

export function findCategory(taxonomy: Taxonomy, id: string) {
  return taxonomy.categories.find((item) => item.id === id);
}

export function findSection(taxonomy: Taxonomy, id: string) {
  return taxonomy.sections.find((item) => item.id === id);
}

/** Seções de uma categoria, na ordem em que foram cadastradas. */
export function sectionsOf(taxonomy: Taxonomy, categoryId: string) {
  return taxonomy.sections
    .filter((section) => section.categoryId === categoryId)
    .sort((a, b) => a.order - b.order);
}

/**
 * Rótulo completo de uma seção, para listagens e busca.
 * Devolve string vazia quando a seção não existe mais. Categoria removida,
 * artigo migrado sem correspondência, em vez de inventar um nome.
 */
export function sectionPath(taxonomy: Taxonomy, sectionId: string): string {
  const section = findSection(taxonomy, sectionId);
  if (!section) return "";

  const category = findCategory(taxonomy, section.categoryId);
  return category ? `${category.name} · ${section.name}` : section.name;
}
