import { ARTICLE_STATUSES, type ArticleStatus } from "@/models/KnowledgeArticle";
import type { Taxonomy } from "@/models/Taxonomy";
import { oneOf, pageNumber, type ParamValues } from "@/lib/urlState";

import { ARTICLE_COLUMNS, type ArticleColumn, type Sort } from "./tableView";
import type { LibraryFilters } from "./types/LibraryFilters";

/**
 * O recorte da Biblioteca, traduzido de e para a URL.
 *
 * Fica separado do hook porque é aqui que mora a parte que erra: **valor vindo
 * de fora**. O endereço é colado por outra pessoa e envelhece: a categoria
 * pode ter sido removida do cadastro, a coluna pode ter mudado de nome. Cada
 * campo é conferido contra o vocabulário de hoje, e o que não bate volta ao
 * padrão em vez de filtrar por algo que não existe.
 *
 * Os nomes dos parâmetros são em português porque a URL é lida por gente.
 */

export const LIBRARY_URL_DEFAULTS: ParamValues = {
  busca: "",
  estagio: "all",
  categoria: "all",
  ordem: "updatedAt",
  sentido: "desc",
  pagina: "1",
};

export const defaultLibraryFilters: LibraryFilters = {
  search: "",
  status: "all",
  categoryId: "all",
};

export const defaultLibrarySort: Sort = { column: "updatedAt", direction: "desc" };

export function toParams(filters: LibraryFilters, sort: Sort, page: number): ParamValues {
  return {
    busca: filters.search.trim(),
    estagio: filters.status,
    categoria: filters.categoryId,
    ordem: sort.column,
    sentido: sort.direction,
    pagina: String(page),
  };
}

export interface LibraryRecorte {
  filters: LibraryFilters;
  sort: Sort;
  page: number;
}

/**
 * Lê o recorte, conferindo tudo contra o cadastro de hoje.
 *
 * `totalPages` entra porque página fora do intervalo precisa voltar para a
 * primeira: devolver vazio deixaria a tela em branco com registros logo ali:
 * a mesma regra que já vale quando alguém filtra estando na página 7.
 */
export function fromParams(
  params: ParamValues,
  taxonomy: Taxonomy,
  totalPages: number
): LibraryRecorte {
  const categorias = taxonomy.categories.map((category) => category.id);

  const categoryId = params.categoria;
  const categoriaValida =
    categoryId === "all" || categoryId === "unset" || categorias.includes(categoryId);

  return {
    filters: {
      search: params.busca ?? "",
      status: oneOf<ArticleStatus | "all">(
        params.estagio,
        ["all", ...ARTICLE_STATUSES],
        "all"
      ),
      categoryId: categoriaValida ? categoryId : "all",
    },
    sort: {
      column: oneOf<ArticleColumn>(params.ordem, ARTICLE_COLUMNS, "updatedAt"),
      direction: oneOf(params.sentido, ["asc", "desc"] as const, "desc"),
    },
    page: pageNumber(params.pagina, totalPages),
  };
}

/** Dois recortes iguais não precisam reescrever a URL nem o estado. */
export function sameParams(a: ParamValues, b: ParamValues): boolean {
  return Object.keys(LIBRARY_URL_DEFAULTS).every((key) => (a[key] ?? "") === (b[key] ?? ""));
}
