import { date, flag, items, oneOf, record, text, textList } from "@/lib/shape";
import { CONTENT_FORMATS } from "@/models/KnowledgeArticle";
import type { ArticleStatus, KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { Taxonomy } from "@/models/Taxonomy";

import type { ArticleRow, TaxonomyCategoryRow, TaxonomyEntryRow, TaxonomySectionRow } from "./types";

/**
 * Tradução entre linha do banco e modelo do domínio.
 *
 * A entrada é `unknown` pelo mesmo motivo que valia no `localStorage`: o que
 * chega da rede não tem forma garantida em tempo de execução. O tipo da tabela
 * descreve o contrato; ele não impede o banco de estar numa versão anterior à
 * do código, nem a resposta de vir truncada.
 *
 * Coluna nula vira string vazia, que é como o modelo representa "não
 * definido": o `sectionId` de um artigo sem classificação é `""`, nunca
 * `null`, para que ninguém precise testar dois casos.
 */

const STATUSES: readonly ArticleStatus[] = ["draft", "review", "published", "archived"];

export function toArticle(raw: unknown): KnowledgeArticle {
  const row = record(raw);
  const source = record(row.source);

  return {
    id: text(row.id),
    title: text(row.title),
    summary: text(row.summary),
    content: text(row.content),
    projectId: text(row.project_id),
    genreId: text(row.genre_id),
    status: oneOf(row.status, STATUSES, "draft"),
    sectionId: text(row.section_id),
    tags: textList(row.tags),
    keywords: textList(row.keywords),
    author: text(row.author),
    // Da coluna, e não fixo: é o que permite HTML vindo do portal continuar HTML.
    contentFormat: oneOf(row.content_format, CONTENT_FORMATS, "markdown"),
    ...(text(row.portal_article_id)
      ? { portalArticleId: text(row.portal_article_id) }
      : {}),
    ...(text(row.url) ? { url: text(row.url) } : {}),
    ...(text(source.planId)
      ? {
          source: {
            projectId: text(source.projectId),
            ticketId: text(source.ticketId),
            analysisId: text(source.analysisId),
            opportunityId: text(source.opportunityId),
            planId: text(source.planId),
          },
        }
      : {}),
    createdAt: date(row.created_at),
    updatedAt: date(row.updated_at),
    ...(text(row.deleted_at) ? { deletedAt: text(row.deleted_at) } : {}),
    ...(row.draft ? { draft: row.draft as KnowledgeArticle["draft"] } : {}),
  };
}

/**
 * Modelo para linha.
 *
 * Vazio volta a ser `null` nas colunas que têm chave estrangeira: gravar `""`
 * violaria a referência, porque não existe seção de id vazio.
 */
export function fromArticle(article: KnowledgeArticle): ArticleRow {
  return {
    id: article.id,
    /*
      Vazio vira nulo, como já acontecia com seção e gênero duas linhas abaixo.

      O artigo do acervo não pertence a iniciativa nenhuma. É do hub. Texto
      vazio não é ausência para o Postgres, e a chave estrangeira recusava os
      1.822 artigos do portal no fim de uma varredura de quarenta e cinco
      minutos.
    */
    project_id: article.projectId || null,
    title: article.title,
    summary: article.summary,
    content: article.content,
    status: article.status,
    section_id: article.sectionId || null,
    genre_id: article.genreId || null,
    portal_article_id: article.portalArticleId ?? null,
    url: article.url ?? null,
    tags: article.tags,
    keywords: article.keywords,
    author: article.author,
    source: article.source ?? null,
    created_at: article.createdAt.toISOString(),
    updated_at: article.updatedAt.toISOString(),
    deleted_at: article.deletedAt || null,
    content_format: article.contentFormat,
    draft: article.draft ?? null,
  };
}

/**
 * Monta a taxonomia a partir das três tabelas.
 *
 * Seção órfã é descartada, como no normalizador do armazenamento local: ela
 * nunca apareceria em cascata nenhuma e ficaria acumulando em silêncio. Aqui a
 * chave estrangeira já impede que aconteça, mas a leitura não depende disso:
 * uma resposta parcial, com categorias faltando, produziria o mesmo efeito.
 */
export function toTaxonomy(
  categoryRows: unknown,
  sectionRows: unknown,
  entryRows: unknown
): Taxonomy {
  const categories = items(categoryRows)
    .map((entry) => {
      const row = record(entry);
      return {
        id: text(row.id),
        name: text(row.name),
        isProduct: flag(row.is_product),
        order: typeof row.position === "number" ? row.position : 0,
      };
    })
    .filter((category) => category.id !== "" && category.name !== "");

  const known = new Set(categories.map((category) => category.id));

  const sections = items(sectionRows)
    .map((entry) => {
      const row = record(entry);
      return {
        id: text(row.id),
        categoryId: text(row.category_id),
        name: text(row.name),
        order: typeof row.position === "number" ? row.position : 0,
      };
    })
    .filter(
      (section) =>
        section.id !== "" && section.name !== "" && known.has(section.categoryId)
    );

  const entries = items(entryRows).map((entry) => {
    const row = record(entry);
    return {
      list: text(row.list),
      id: text(row.id),
      name: text(row.name),
      order: typeof row.position === "number" ? row.position : 0,
    };
  });

  const pick = (list: string) =>
    entries
      .filter((entry) => entry.list === list && entry.id !== "" && entry.name !== "")
      .map(({ id, name, order }) => ({ id, name, order }));

  return {
    categories: categories.sort((a, b) => a.order - b.order),
    /*
      Sem ordenação global aqui: `order` de seção é relativo à categoria dela:
      o Builder vai de 0 a 49 e o Eberick recomeça em 0. Ordenar a lista
      inteira intercalaria seções de categorias diferentes. Quem exibe usa
      `sectionsOf`, que ordena dentro do escopo certo.
    */
    sections,
    genres: pick("genres"),
    opportunityTypes: pick("opportunity_types"),
  };
}

export function fromTaxonomy(taxonomy: Taxonomy): {
  categories: TaxonomyCategoryRow[];
  sections: TaxonomySectionRow[];
  entries: TaxonomyEntryRow[];
} {
  return {
    categories: taxonomy.categories.map((category) => ({
      id: category.id,
      name: category.name,
      is_product: category.isProduct,
      position: category.order,
    })),
    sections: taxonomy.sections.map((section) => ({
      id: section.id,
      category_id: section.categoryId,
      name: section.name,
      position: section.order,
    })),
    entries: [
      ...taxonomy.genres.map((entry) => ({
        id: entry.id,
        list: "genres" as const,
        name: entry.name,
        position: entry.order,
      })),
      ...taxonomy.opportunityTypes.map((entry) => ({
        id: entry.id,
        list: "opportunity_types" as const,
        name: entry.name,
        position: entry.order,
      })),
    ],
  };
}
