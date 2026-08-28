import type { ContentFormat, KnowledgeArticle, ArticleStatus } from "@/models/KnowledgeArticle";
import type { Taxonomy } from "@/models/Taxonomy";

import type { ColumnMapping, ImportField } from "./mapping";
import type { DelimitedTable } from "@/lib/delimited";

/**
 * O que a importação vai fazer, calculado antes de fazer.
 *
 * Puro, e é o ponto: com mil e oitocentos registros, "gravar e ver no que dá"
 * não é opção. Quem confirma precisa saber quantos entram, quantos atualizam
 * e quantos vão ficar sem classificação **antes** do clique. É a mesma regra
 * do diálogo de exclusão, que diz o número antes.
 *
 * Nada aqui adivinha. Seção que não bate com o cadastro vira vazio e é
 * contada, em vez de ser encaixada na mais parecida: encaixar erraria em
 * silêncio, e ninguém revisa mil e oitocentos registros para descobrir.
 */

export interface ImportOptions {
  projectId: string;
  /** Declarado por quem importa, nunca farejado do conteúdo. */
  contentFormat: ContentFormat;
  /** Estágio de quem chega sem coluna de estágio. */
  defaultStatus: ArticleStatus;
  now: Date;
}

export interface ImportPlan {
  /** Registros novos, prontos para gravar. */
  create: KnowledgeArticle[];
  /** Registros que já existem e serão sobrescritos, casados pelo id do portal. */
  update: KnowledgeArticle[];
  /** Linhas sem título, não dá para criar registro sem sujeito. */
  skippedNoTitle: number;
  /** Linhas repetidas dentro do próprio arquivo, casadas pelo id do portal. */
  duplicatedInFile: number;
  /** Quantos vão entrar sem seção, para reclassificação manual. */
  withoutSection: number;
  /** Quantos tinham data ilegível e receberam a data da importação. */
  unreadableDate: number;
  /** Cabeçalhos do arquivo que nenhum campo está lendo. */
  unusedColumns: string[];
}

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?)?/;
const BR_DAY = /^(\d{2})\/(\d{2})\/(\d{4})/;

/**
 * Lê a data da linha, ou devolve `null`.
 *
 * `null` em vez de chutar: uma data inventada faz o artigo aparecer num mês em
 * que nada aconteceu, e o painel conta errado sem ninguém perceber.
 */
export function readInstant(value: string): Date | null {
  const texto = value.trim();
  if (texto === "") return null;

  if (ISO_INSTANT.test(texto)) {
    const date = new Date(texto);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const br = BR_DAY.exec(texto);
  if (br) {
    const date = new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
    // Transbordo: "31/02" viraria 3 de março em silêncio.
    if (date.getMonth() !== Number(br[2]) - 1) return null;
    return date;
  }

  return null;
}

/** Minúsculas, sem acento, só para casar nome de seção e de categoria. */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Encontra a seção pelo nome, dentro da categoria quando ela foi informada.
 *
 * A categoria desempata: o portal tem "Instalação" em mais de um produto, e
 * sem ela duas seções de nome igual dariam empate. Empate devolve vazio, pela
 * mesma razão de duas equipes na mesma categoria desligarem a sugestão.
 */
export function resolveSection(
  taxonomy: Taxonomy,
  sectionName: string,
  categoryName: string
): string {
  const alvo = fold(sectionName);
  if (alvo === "") return "";

  let candidatas = taxonomy.sections.filter((section) => fold(section.name) === alvo);

  if (candidatas.length > 1 && categoryName.trim() !== "") {
    const categoria = taxonomy.categories.find(
      (item) => fold(item.name) === fold(categoryName)
    );

    if (categoria) {
      candidatas = candidatas.filter((section) => section.categoryId === categoria.id);
    }
  }

  return candidatas.length === 1 ? candidatas[0].id : "";
}

function cell(row: string[], mapping: ColumnMapping, field: ImportField): string {
  const index = mapping[field];
  if (index === null) return "";

  return (row[index] ?? "").trim();
}

/** Palavras-chave saem separadas por vírgula ou ponto e vírgula, conforme a origem. */
export function splitKeywords(value: string): string[] {
  return value
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

const STATUS_ALIASES: Record<string, ArticleStatus> = {
  publicado: "published",
  published: "published",
  rascunho: "draft",
  draft: "draft",
  "em revisao": "review",
  revisao: "review",
  review: "review",
  arquivado: "archived",
  archived: "archived",
};

export function buildImportPlan(
  table: DelimitedTable,
  mapping: ColumnMapping,
  taxonomy: Taxonomy,
  existing: KnowledgeArticle[],
  options: ImportOptions
): ImportPlan {
  const porPortalId = new Map<string, KnowledgeArticle>();

  for (const article of existing) {
    if (article.portalArticleId) porPortalId.set(article.portalArticleId, article);
  }

  const create: KnowledgeArticle[] = [];
  const update: KnowledgeArticle[] = [];

  const plan: ImportPlan = {
    create,
    update,
    skippedNoTitle: 0,
    duplicatedInFile: 0,
    withoutSection: 0,
    unreadableDate: 0,
    unusedColumns: [],
  };

  const usadas = new Set(
    Object.values(mapping).filter((index): index is number => index !== null)
  );

  plan.unusedColumns = table.headers.filter((_, index) => !usadas.has(index));

  /*
    Casa a linha com o que já está no plano, para o arquivo com o mesmo artigo
    duas vezes não criar dois registros. Fica com a última ocorrência: numa
    exportação em duas passagens, a segunda é a mais recente.
  */
  const noPlano = new Map<string, KnowledgeArticle>();

  for (const row of table.rows) {
    const title = cell(row, mapping, "title");

    if (title === "") {
      plan.skippedNoTitle += 1;
      continue;
    }

    const portalArticleId = cell(row, mapping, "portalArticleId");
    const sectionId = resolveSection(
      taxonomy,
      cell(row, mapping, "sectionName"),
      cell(row, mapping, "categoryName")
    );

    if (sectionId === "") plan.withoutSection += 1;

    const statusCell = fold(cell(row, mapping, "status"));
    const status = STATUS_ALIASES[statusCell] ?? options.defaultStatus;

    const dataCell = cell(row, mapping, "updatedAt");
    const instante = readInstant(dataCell);

    if (dataCell !== "" && instante === null) plan.unreadableDate += 1;

    const existente = portalArticleId ? porPortalId.get(portalArticleId) : undefined;
    const jaNoPlano = portalArticleId ? noPlano.get(portalArticleId) : undefined;

    const article: KnowledgeArticle = {
      id: existente?.id ?? jaNoPlano?.id ?? crypto.randomUUID(),
      title,
      summary: cell(row, mapping, "summary"),
      content: cell(row, mapping, "content"),
      projectId: options.projectId,
      genreId: existente?.genreId ?? "",
      status,
      sectionId,
      ...(portalArticleId ? { portalArticleId } : {}),
      tags: [],
      keywords: splitKeywords(cell(row, mapping, "keywords")),
      author: cell(row, mapping, "author") || existente?.author || "",
      contentFormat: options.contentFormat,
      ...(cell(row, mapping, "url") ? { url: cell(row, mapping, "url") } : {}),
      createdAt: existente?.createdAt ?? instante ?? options.now,
      updatedAt: instante ?? options.now,
    };

    if (jaNoPlano) {
      plan.duplicatedInFile += 1;

      const lista = existente ? update : create;
      const posicao = lista.findIndex((item) => item.id === jaNoPlano.id);
      if (posicao >= 0) lista[posicao] = article;

      noPlano.set(portalArticleId, article);
      continue;
    }

    if (existente) update.push(article);
    else create.push(article);

    if (portalArticleId) noPlano.set(portalArticleId, article);
  }

  return plan;
}
