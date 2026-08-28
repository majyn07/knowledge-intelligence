import { items, oneOf, record, text, textList } from "@/lib/shape";
import type { SavedViewRow } from "@/lib/supabase/types";
import { ARTICLE_STATUSES } from "@/models/KnowledgeArticle";

import {
  ARTICLE_COLUMNS,
  defaultColumns,
  REQUIRED_COLUMNS,
  type ArticleColumn,
  type Sort,
  type SortDirection,
} from "./tableView";
import type { LibraryFilters } from "./types/LibraryFilters";

/**
 * Um recorte guardado.
 *
 * Guarda a **pergunta**, como o painel: quais filtros, qual ordenação, quais
 * colunas. Não guarda quais artigos: a lista é refeita a cada abertura, sobre
 * o acervo de agora.
 */
export interface SavedView {
  id: string;
  name: string;
  filters: LibraryFilters;
  sort: Sort;
  columns: ArticleColumn[];
  order: number;
}

const DIRECTIONS: readonly SortDirection[] = ["asc", "desc"];

/**
 * Garante que as colunas fazem sentido.
 *
 * Uma visão gravada antes de uma coluna existir (ou depois de uma sair)
 * volta com a lista corrigida. E o título nunca some: sem ele a linha deixa de
 * identificar o registro.
 */
function safeColumns(raw: unknown): ArticleColumn[] {
  const escolhidas = textList(raw).filter((column) =>
    (ARTICLE_COLUMNS as readonly string[]).includes(column)
  ) as ArticleColumn[];

  if (escolhidas.length === 0) return defaultColumns;

  const faltando = REQUIRED_COLUMNS.filter((column) => !escolhidas.includes(column));

  // Na ordem do cadastro, para a tabela não trocar de forma a cada leitura.
  return ARTICLE_COLUMNS.filter(
    (column) => escolhidas.includes(column) || faltando.includes(column)
  );
}

export function normalizeSavedView(raw: unknown, order = 0): SavedView {
  const value = record(raw);
  const filters = record(value.filters);
  const sort = record(value.sort);

  return {
    id: text(value.id) || crypto.randomUUID(),
    name: text(value.name) || "Visão sem nome",
    filters: {
      search: text(filters.search),
      status: oneOf(filters.status, [...ARTICLE_STATUSES, "all"] as const, "all"),
      categoryId: text(filters.categoryId) || "all",
    },
    sort: {
      column: oneOf(sort.column, ARTICLE_COLUMNS, "updatedAt"),
      direction: oneOf(sort.direction, DIRECTIONS, "desc"),
    },
    columns: safeColumns(value.columns),
    order: typeof value.order === "number" ? value.order : order,
  };
}

export function parseSavedViews(raw: string): SavedView[] {
  return items(JSON.parse(raw))
    .map((entry, index) => normalizeSavedView(entry, index))
    .sort((a, b) => a.order - b.order);
}

export function toSavedView(row: unknown): SavedView {
  const value = record(row);

  return normalizeSavedView({
    id: value.id,
    name: value.name,
    filters: {
      search: value.search,
      status: value.status,
      categoryId: value.category_id,
    },
    sort: { column: value.sort_column, direction: value.sort_direction },
    columns: value.columns,
    order: value.position,
  });
}

export function fromSavedView(view: SavedView): SavedViewRow {
  return {
    id: view.id,
    name: view.name,
    screen: "library",
    search: view.filters.search,
    status: view.filters.status,
    category_id: view.filters.categoryId,
    sort_column: view.sort.column,
    sort_direction: view.sort.direction,
    columns: view.columns,
    position: view.order,
  };
}

/**
 * A visão corresponde ao que está na tela.
 *
 * Serve para a tela marcar qual visão está ativa. Compara só o que a visão
 * guarda: o que ela não guarda não pode desqualificá-la.
 */
export function matchesView(view: SavedView, filters: LibraryFilters, sort: Sort): boolean {
  return (
    view.filters.search.trim() === filters.search.trim() &&
    view.filters.status === filters.status &&
    view.filters.categoryId === filters.categoryId &&
    view.sort.column === sort.column &&
    view.sort.direction === sort.direction
  );
}
