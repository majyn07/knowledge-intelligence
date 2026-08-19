"use client";

import { useMemo, useState } from "react";

import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { LibraryFilters } from "../types/LibraryFilters";

const defaultFilters: LibraryFilters = {
  search: "",
  status: "all",
  product: "all",
};

export function useLibraryFilters(items: KnowledgeArticle[]) {
  const [filters, setFilters] = useState<LibraryFilters>(defaultFilters);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const search = filters.search.trim().toLowerCase();

      const matchesSearch =
        search === "" ||
        item.title.toLowerCase().includes(search) ||
        item.summary.toLowerCase().includes(search) ||
        item.category.toLowerCase().includes(search) ||
        item.module.toLowerCase().includes(search) ||
        item.tags.some((tag) => tag.toLowerCase().includes(search)) ||
        item.keywords.some((keyword) => keyword.toLowerCase().includes(search));

      const matchesStatus =
        filters.status === "all" || item.status === filters.status;

      const matchesProduct =
        filters.product === "all" || item.product === filters.product;

      return matchesSearch && matchesStatus && matchesProduct;
    });
  }, [items, filters]);

  return {
    filters,
    setFilters,
    filteredItems,
  };
}
