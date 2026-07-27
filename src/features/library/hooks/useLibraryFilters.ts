"use client";

import { useMemo, useState } from "react";

import type { Library } from "@/models/Library";
import type { LibraryFilters } from "../types/LibraryFilters";

const defaultFilters: LibraryFilters = {
  search: "",
  status: "all",
};

export function useLibraryFilters(
  items: Library[]
) {
  const [filters, setFilters] =
    useState<LibraryFilters>(defaultFilters);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const search =
        filters.search.trim().toLowerCase();

      const matchesSearch =
        search === "" ||
        item.title.toLowerCase().includes(search) ||
        item.category.toLowerCase().includes(search) ||
        item.tags.some((tag) =>
          tag.toLowerCase().includes(search)
        );

      const matchesStatus =
        filters.status === "all" ||
        item.status === filters.status;

      return matchesSearch && matchesStatus;
    });
  }, [items, filters]);

  return {
    filters,
    setFilters,
    filteredItems,
  };
}