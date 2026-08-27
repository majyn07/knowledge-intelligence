"use client";

import { useMemo, useState } from "react";
import { articleText } from "../content/articleText";
import { foldText } from "../content/articleExcerpt";

import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import { findSection, sectionPath } from "@/models/Taxonomy";
import { useTaxonomy } from "@/features/taxonomy/providers/TaxonomyProvider";

import type { LibraryFilters } from "../types/LibraryFilters";

const defaultFilters: LibraryFilters = {
  search: "",
  status: "all",
  categoryId: "all",
};

/**
 * Filtros da Biblioteca.
 *
 * As opções vêm do cadastro, não de constante no código: categoria criada
 * aparece aqui sozinha, categoria removida some. Antes desta sprint a lista de
 * produtos era fixa, então o filtro e o formulário podiam discordar.
 */
export function useLibraryFilters(items: KnowledgeArticle[]) {
  const [filters, setFilters] = useState<LibraryFilters>(defaultFilters);
  const { taxonomy } = useTaxonomy();

  /*
    O texto de cada artigo, sem marcação, calculado uma vez por acervo.

    Sem este índice, buscar no corpo limparia o HTML de mil e oitocentos artigos
    a cada tecla — doze mil caracteres vezes mil e oitocentos, por letra
    digitada. A medição do acervo real já dizia que varrer o texto custa 9 ms;
    o que não cabe é refazer a limpeza junto.
  */
  const searchIndex = useMemo(() => {
    const indice = new Map<string, string>();

    for (const item of items) {
      indice.set(item.id, foldText(articleText(item)));
    }

    return indice;
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const search = foldText(filters.search.trim());

      /*
        O corpo entra na busca, e é o que faltava: com o portal importado, o que
        alguém procura quase nunca está no título — está no meio do artigo.
      */
      const matchesSearch =
        search === "" ||
        foldText(item.title).includes(search) ||
        foldText(item.summary).includes(search) ||
        foldText(sectionPath(taxonomy, item.sectionId)).includes(search) ||
        item.tags.some((tag) => foldText(tag).includes(search)) ||
        item.keywords.some((keyword) => foldText(keyword).includes(search)) ||
        (searchIndex.get(item.id) ?? "").includes(search);

      const matchesStatus =
        filters.status === "all" || item.status === filters.status;

      const section = findSection(taxonomy, item.sectionId);

      const matchesCategory =
        filters.categoryId === "all" ||
        (filters.categoryId === "unset"
          ? section === undefined
          : section?.categoryId === filters.categoryId);

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [items, filters, taxonomy, searchIndex]);

  /** Quantos artigos ficaram sem seção — o filtro só aparece se houver algum. */
  const unclassifiedCount = useMemo(
    () => items.filter((item) => findSection(taxonomy, item.sectionId) === undefined).length,
    [items, taxonomy]
  );

  return {
    filters,
    setFilters,
    filteredItems,
    unclassifiedCount,
  };
}
