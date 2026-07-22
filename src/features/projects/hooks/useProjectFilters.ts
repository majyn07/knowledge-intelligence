"use client";

import { useMemo, useState } from "react";

import type { Project } from "@/models/Project";
import type { ProjectFilters } from "../types/ProjectFilters";

const defaultFilters: ProjectFilters = {
  search: "",
  status: "all",
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
        project.client.toLowerCase().includes(search);

      const matchesStatus =
        filters.status === "all" ||
        project.status === filters.status;

      return matchesSearch && matchesStatus;
    });
  }, [projects, filters]);

  return {
    filters,
    setFilters,
    filteredProjects,
  };
}