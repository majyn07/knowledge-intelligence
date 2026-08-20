"use client";

import { useMemo, useState } from "react";

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

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const search = filters.search.trim().toLowerCase();

      const matchesSearch =
        search === "" ||
        item.title.toLowerCase().includes(search) ||
        item.summary.toLowerCase().includes(search) ||
        sectionPath(taxonomy, item.sectionId).toLowerCase().includes(search) ||
        item.tags.some((tag) => tag.toLowerCase().includes(search)) ||
        item.keywords.some((keyword) => keyword.toLowerCase().includes(search));

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
  }, [items, filters, taxonomy]);

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
