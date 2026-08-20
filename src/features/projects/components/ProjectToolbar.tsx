"use client";

import { Search } from "lucide-react";

import type { ProjectFilters } from "@/features/projects/types/ProjectFilters";
import { productNamesFrom } from "@/features/projects/constants/products";
import { useTaxonomy } from "@/features/taxonomy/providers/TaxonomyProvider";
import { projectStatusLabel, type ProjectStatus } from "@/models/Project";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageToolbar } from "@/components/common/page/PageToolbar";

interface ProjectToolbarProps {
  filters: ProjectFilters;
  onFiltersChange: (filters: ProjectFilters) => void;
  onNewProject: () => void;
}

const statusFilters: (ProjectStatus | "all")[] = ["all", "active", "inactive", "archived"];

function filterLabel(value: ProjectStatus | "all") {
  return value === "all" ? "Todos" : projectStatusLabel[value];
}

export function ProjectToolbar({
  filters,
  onFiltersChange,
  onNewProject,
}: ProjectToolbarProps) {
  const { taxonomy } = useTaxonomy();
  const productNames = productNamesFrom(taxonomy);

  return (
    <PageToolbar
      start={
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            className="pl-9"
            placeholder="Buscar por nome, cliente, módulo ou responsável..."
            value={filters.search}
            onChange={(event) =>
              onFiltersChange({ ...filters, search: event.target.value })
            }
          />
        </div>
      }
      end={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por status">
            {statusFilters.map((status) => (
              <Button
                key={status}
                size="sm"
                variant={filters.status === status ? "default" : "outline"}
                onClick={() => onFiltersChange({ ...filters, status })}
              >
                {filterLabel(status)}
              </Button>
            ))}
          </div>

          <span className="hidden h-5 w-px bg-border sm:block" />

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por produto">
            <Button
              size="sm"
              variant={filters.product === "all" ? "default" : "outline"}
              onClick={() => onFiltersChange({ ...filters, product: "all" })}
            >
              Todos os produtos
            </Button>

            {productNames.map((product) => (
              <Button
                key={product}
                size="sm"
                variant={filters.product === product ? "default" : "outline"}
                onClick={() => onFiltersChange({ ...filters, product })}
              >
                {product.replace("AltoQi ", "")}
              </Button>
            ))}
          </div>

          <Button onClick={onNewProject}>Novo Projeto</Button>
        </div>
      }
    />
  );
}
