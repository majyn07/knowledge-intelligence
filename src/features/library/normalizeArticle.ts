import { date, items, oneOf, record, text, textList } from "@/lib/shape";
import type { ArticleStatus, ArticleType, KnowledgeArticle } from "@/models/KnowledgeArticle";

const TYPES: readonly ArticleType[] = ["article", "faq", "workflow", "document", "template"];
const STATUSES: readonly ArticleStatus[] = ["draft", "review", "published", "archived"];

/**
 * Garante a forma do artigo vinda do armazenamento.
 *
 * A entrada é `unknown` de propósito: o registro foi gravado por alguma versão
 * do produto, possivelmente anterior à atual, e não conhece campos que vieram
 * depois — `author` e `category` são os casos concretos. Sem normalizar, a
 * primeira leitura de um campo ausente derruba a tela.
 */
export function normalizeArticle(raw: unknown): KnowledgeArticle {
  const value = record(raw);
  const source = record(value.source);

  return {
    id: text(value.id) || crypto.randomUUID(),
    title: text(value.title),
    summary: text(value.summary),
    content: text(value.content),
    projectId: text(value.projectId),
    type: oneOf(value.type, TYPES, "article"),
    status: oneOf(value.status, STATUSES, "draft"),
    product: text(value.product),
    module: text(value.module),
    category: text(value.category),
    tags: textList(value.tags),
    keywords: textList(value.keywords),
    author: text(value.author),
    ...(text(value.url) ? { url: text(value.url) } : {}),
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
    createdAt: date(value.createdAt),
    updatedAt: date(value.updatedAt),
  };
}

export function parseArticles(raw: string): KnowledgeArticle[] {
  return items(JSON.parse(raw)).map(normalizeArticle);
}
