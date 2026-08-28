import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { Taxonomy } from "@/models/Taxonomy";

import { resolveSection } from "../importPlan";
import type { PortalArticle } from "./portalArticlePage";

/**
 * O plano de importação do portal, calculado antes de gravar.
 *
 * Mesma regra do diálogo de exclusão e da importação por arquivo: o número vem
 * antes do clique. Mil e oitocentos artigos entrando errado não são revisados
 * um por um depois.
 */

export interface PortalImportPlan {
  /** Registros novos, prontos para gravar. */
  create: KnowledgeArticle[];
  /** Já existiam, casados pelo id do portal, e serão atualizados. */
  update: KnowledgeArticle[];
  /** Páginas que não entregaram título ou corpo. */
  skippedNoContent: number;
  /** URLs em outra língua, que a taxonomia do cadastro não classifica. */
  skippedForeignLocale: number;
  /** Quantos entram sem seção, para classificação manual. */
  withoutSection: number;
  /** Quantos tiveram a seção preservada porque o portal não trouxe nenhuma. */
  keptExistingSection: number;
  /** Repetidos dentro do próprio lote, casados pelo id do portal. */
  duplicated: number;
}

export interface PortalImportOptions {
  now: Date;
  /** `lastmod` do sitemap por URL, quando o portal informou. */
  lastmodByUrl?: Map<string, string>;
}

function emptyPlan(): PortalImportPlan {
  return {
    create: [],
    update: [],
    skippedNoContent: 0,
    skippedForeignLocale: 0,
    withoutSection: 0,
    keptExistingSection: 0,
    duplicated: 0,
  };
}

function readInstant(value: string, fallback: Date): Date {
  if (!value) return fallback;
  const data = new Date(value);
  return Number.isNaN(data.getTime()) ? fallback : data;
}

export function buildPortalImportPlan(
  paginas: (PortalArticle | null)[],
  taxonomy: Taxonomy,
  existing: KnowledgeArticle[],
  options: PortalImportOptions
): PortalImportPlan {
  const plan = emptyPlan();

  const porPortalId = new Map<string, KnowledgeArticle>();
  for (const article of existing) {
    if (article.portalArticleId) porPortalId.set(article.portalArticleId, article);
  }

  const noPlano = new Map<string, KnowledgeArticle>();

  for (const pagina of paginas) {
    if (!pagina) {
      plan.skippedNoContent += 1;
      continue;
    }

    const existente = porPortalId.get(pagina.portalArticleId);
    const jaNoPlano = noPlano.get(pagina.portalArticleId);

    /*
      A seção vem da trilha do portal, que é a verdade sobre onde o artigo
      mora. Mas quando o portal não traz nenhuma. Artigo com trilha de dois
      degraus., a classificação que alguém fez aqui dentro é preservada:
      apagá-la seria a importação desfazendo revisão humana.
    */
    const doPortal = resolveSection(taxonomy, pagina.sectionName, pagina.categoryName);
    let sectionId = doPortal;

    if (doPortal === "" && existente?.sectionId) {
      sectionId = existente.sectionId;
      plan.keptExistingSection += 1;
    }

    if (sectionId === "") plan.withoutSection += 1;

    const lastmod = options.lastmodByUrl?.get(pagina.url) ?? "";
    const atualizado = readInstant(lastmod, options.now);

    const article: KnowledgeArticle = {
      id: existente?.id ?? jaNoPlano?.id ?? crypto.randomUUID(),
      title: pagina.title,
      summary: pagina.summary,
      content: pagina.contentHtml,
      /*
        Vazio de propósito: o acervo é do hub e não de uma iniciativa. O artigo
        do portal já existia antes de qualquer projeto nosso, e carimbá-lo com
        o projeto ativo esconderia o acervo de quem trocasse de projeto.
      */
      projectId: "",
      // Gênero e responsável são nossos, não do portal: reimportar não os apaga.
      genreId: existente?.genreId ?? "",
      /*
        O que está no portal público está publicado, não é suposição, é o que
        a página ser pública significa. E só publicado conta como cobertura
        documental na análise.
      */
      status: "published",
      sectionId,
      portalArticleId: pagina.portalArticleId,
      tags: existente?.tags ?? [],
      keywords: existente?.keywords ?? [],
      author: existente?.author ?? "",
      // Declarado, nunca adivinhado: o que vem do portal é HTML.
      contentFormat: "html",
      url: pagina.url,
      createdAt: existente?.createdAt ?? atualizado,
      updatedAt: atualizado,
    };

    if (jaNoPlano) {
      plan.duplicated += 1;

      const lista = existente ? plan.update : plan.create;
      const posicao = lista.findIndex((item) => item.id === jaNoPlano.id);
      if (posicao >= 0) lista[posicao] = article;

      noPlano.set(pagina.portalArticleId, article);
      continue;
    }

    if (existente) plan.update.push(article);
    else plan.create.push(article);

    noPlano.set(pagina.portalArticleId, article);
  }

  return plan;
}
