"use client";

import { useMemo, useState } from "react";

import type { Project } from "@/models/Project";
import type { ProjectFilters } from "../types/ProjectFilters";

const defaultFilters: ProjectFilters = {
  search: "",
  status: "all",
  product: "all",
};

export function useProjectFilters(
  projects: Project[]
) {
  const [filters, setFilters] =
    useState<ProjectFilters>(defaultFilters);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const search =
        filters.search.trim().toLowerCase();

      const matchesSearch =
        search === "" ||
        project.name.toLowerCase().includes(search) ||
        project.module.toLowerCase().includes(search) ||
        project.owner.toLowerCase().includes(search);

      const matchesStatus =
        filters.status === "all" ||
        project.status === filters.status;

      const matchesProduct =
        filters.product === "all" ||
        project.product === filters.product;

      return matchesSearch && matchesStatus && matchesProduct;
    });
  }, [projects, filters]);

  return {
    filters,
    setFilters,
    filteredProjects,
  };
}
