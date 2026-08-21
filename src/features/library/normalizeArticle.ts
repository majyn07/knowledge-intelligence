import { date, items, oneOf, record, text, textList } from "@/lib/shape";
import type { ArticleStatus, KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { Taxonomy } from "@/models/Taxonomy";

const STATUSES: readonly ArticleStatus[] = ["draft", "review", "published", "archived"];

/** Rótulo do gênero que cada valor do antigo enum `ArticleType` representava. */
const legacyGenreName: Record<string, string> = {
  article: "Artigo",
  faq: "FAQ",
  workflow: "Workflow",
  document: "Documento",
  template: "Template",
};

function comparable(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

/**
 * Converte a classificação em texto livre dos registros antigos numa seção do
 * cadastro.
 *
 * Antes desta sprint o artigo guardava `product`, `module` e `category` como
 * strings soltas — três campos onde o portal tem dois, nenhum restrito. A
 * correspondência é por nome: o produto vira categoria, o módulo vira seção.
 *
 * Quando nada bate, devolve vazio **de propósito**. Encaixar o artigo na
 * primeira seção parecida seria classificação inventada, e ninguém saberia
 * que foi um palpite. Vazio aparece na tela de "Sem seção" e alguém decide.
 */
function migrateSection(value: Record<string, unknown>, taxonomy: Taxonomy): string {
  const stored = text(value.sectionId);
  if (stored !== "") return stored;

  const product = comparable(text(value.product));
  const legacyModule = comparable(text(value.module));
  const legacyCategory = comparable(text(value.category));

  if (product === "") return "";

  const category = taxonomy.categories.find(
    (item) => comparable(item.name) === product
  );
  if (!category) return "";

  const sections = taxonomy.sections.filter(
    (item) => item.categoryId === category.id
  );

  const match = sections.find(
    (item) =>
      comparable(item.name) === legacyModule ||
      comparable(item.name) === legacyCategory
  );

  return match ? match.id : "";
}

function migrateGenre(value: Record<string, unknown>, taxonomy: Taxonomy): string {
  const stored = text(value.genreId);
  if (stored !== "") return stored;

  const legacy = legacyGenreName[text(value.type)];
  if (!legacy) return "";

  const match = taxonomy.genres.find(
    (item) => comparable(item.name) === comparable(legacy)
  );

  return match ? match.id : "";
}

/**
 * Garante a forma do artigo vinda do armazenamento.
 *
 * A entrada é `unknown` de propósito: o registro foi gravado por alguma versão
 * do produto, possivelmente anterior à atual, e não conhece campos que vieram
 * depois. Sem normalizar, a primeira leitura de um campo ausente derruba a
 * tela — foi o que aconteceu com `author`.
 *
 * A taxonomia entra porque a classificação deixou de ser texto solto e passou
 * a ser vínculo com o cadastro: sem o vocabulário não há como migrar.
 */
export function normalizeArticle(raw: unknown, taxonomy: Taxonomy): KnowledgeArticle {
  const value = record(raw);
  const source = record(value.source);

  return {
    id: text(value.id) || crypto.randomUUID(),
    title: text(value.title),
    summary: text(value.summary),
    content: text(value.content),
    projectId: text(value.projectId),
    genreId: migrateGenre(value, taxonomy),
    status: oneOf(value.status, STATUSES, "draft"),
    sectionId: migrateSection(value, taxonomy),
    tags: textList(value.tags),
    keywords: textList(value.keywords),
    author: text(value.author),
    ...(text(value.portalArticleId)
      ? { portalArticleId: text(value.portalArticleId) }
      : {}),
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
    // Ausente é "em uso": registro gravado antes da lixeira existir.
    ...(text(value.deletedAt) ? { deletedAt: text(value.deletedAt) } : {}),
  };
}

export function parseArticles(raw: string, taxonomy: Taxonomy): KnowledgeArticle[] {
  return items(JSON.parse(raw)).map((entry) => normalizeArticle(entry, taxonomy));
}
