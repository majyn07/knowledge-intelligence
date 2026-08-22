"use client";

import { useCallback, useMemo, useState } from "react";

import { usePersistedState } from "@/hooks/usePersistedState";
import { STORAGE_KEYS } from "@/lib/storage";
import { useAssigneeName } from "@/features/people/components/AssigneeName";
import { useTaxonomy } from "@/features/taxonomy/providers/TaxonomyProvider";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

import type { LibraryMode } from "../components/LibraryViewBar";
import {
  defaultColumns,
  paginate,
  sortArticles,
  type ArticleColumn,
  type Sort,
} from "../tableView";

const PAGE_SIZE = 25;

/**
 * O estado da tabela: forma, colunas, ordenação, seleção e página.
 *
 * A forma e as colunas ficam **no navegador**, e não no servidor: "prefiro
 * tabela" é sobre esta máquina e esta pessoa, como o tema e os vistos
 * recentemente. O que é da equipe são as visões salvas, que guardam o recorte
 * inteiro e podem ser aplicadas por qualquer um.
 */
export function useLibraryTable(articles: KnowledgeArticle[]) {
  const { taxonomy } = useTaxonomy();
  const nameOf = useAssigneeName();

  const [mode, setMode] = usePersistedState<LibraryMode>({
    key: STORAGE_KEYS.libraryMode,
    fallback: "cards",
  });

  const [columns, setColumns] = usePersistedState<ArticleColumn[]>({
    key: STORAGE_KEYS.libraryColumns,
    fallback: defaultColumns,
  });

  const [sort, setSort] = useState<Sort>({ column: "updatedAt", direction: "desc" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  /*
    O resolvedor de nomes é recriado a cada render do provider de pessoas.
    Guardá-lo aqui num `useMemo` sobre `taxonomy` bastaria para a ordenação,
    mas não para a exportação — e as duas precisam do mesmo contexto para não
    divergirem.
  */
  const context = useMemo(() => ({ taxonomy, nameOf }), [nameOf, taxonomy]);

  const sorted = useMemo(
    () => sortArticles(articles, sort, context),
    [articles, context, sort]
  );

  const current = paginate(sorted, page, PAGE_SIZE);

  /**
   * Clicar na coluna ordenada inverte; em outra, começa por ela.
   *
   * A ordenação nova começa ascendente porque é o que a pessoa espera ao pedir
   * "por título" — e a página volta para a primeira, senão a lista muda debaixo
   * de quem está na página 4 e ela vê outro pedaço sem ter pedido.
   */
  const toggleSort = useCallback((column: ArticleColumn) => {
    setSort((atual) =>
      atual.column === column
        ? { column, direction: atual.direction === "asc" ? "desc" : "asc" }
        : { column, direction: "asc" }
    );

    setPage(1);
  }, []);

  const toggle = useCallback((id: string) => {
    setSelected((atual) => {
      const próxima = new Set(atual);

      if (próxima.has(id)) próxima.delete(id);
      else próxima.add(id);

      return próxima;
    });
  }, []);

  /**
   * Marca ou desmarca a página inteira.
   *
   * A página, e não o recorte inteiro: selecionar 1.800 artigos com um clique
   * e depois mudar o estágio de todos é o tipo de ação que ninguém pretende.
   * Quem quiser mais paginar e marcar de novo — o atrito aqui é proposital.
   */
  const toggleAll = useCallback(() => {
    const idsDaPagina = current.items.map((article) => article.id);
    const todosMarcados = idsDaPagina.every((id) => selected.has(id));

    setSelected((atual) => {
      const próxima = new Set(atual);

      for (const id of idsDaPagina) {
        if (todosMarcados) próxima.delete(id);
        else próxima.add(id);
      }

      return próxima;
    });
  }, [current.items, selected]);

  const clear = useCallback(() => setSelected(new Set()), []);

  /** Só os que ainda existem no recorte: filtrar não deve deixar seleção órfã. */
  const selectedArticles = useMemo(
    () => sorted.filter((article) => selected.has(article.id)),
    [selected, sorted]
  );

  return {
    mode,
    setMode,
    columns,
    setColumns,
    sort,
    setSort,
    toggleSort,
    context,
    sorted,
    page: current,
    setPage,
    selected,
    selectedArticles,
    toggle,
    toggleAll,
    clear,
  };
}
