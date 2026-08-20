"use client";

import { Search } from "lucide-react";

import type { LibraryFilters } from "@/features/library/types/LibraryFilters";
import { useTaxonomy } from "@/features/taxonomy/providers/TaxonomyProvider";
import { articleStatusLabel, type ArticleStatus } from "@/models/KnowledgeArticle";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageToolbar } from "@/components/common/page/PageToolbar";

interface LibraryToolbarProps {
  filters: LibraryFilters;
  onFiltersChange: (filters: LibraryFilters) => void;
  onNewItem: () => void;
  /** Quantos artigos estão sem seção. Zero esconde o filtro. */
  unclassifiedCount: number;
}

const statusFilters: (ArticleStatus | "all")[] = ["all", "draft", "review", "published", "archived"];

function filterLabel(value: ArticleStatus | "all") {
  return value === "all" ? "Todos" : articleStatusLabel[value];
}

export function LibraryToolbar({
  filters,
  onFiltersChange,
  onNewItem,
  unclassifiedCount,
}: LibraryToolbarProps) {
  const { taxonomy } = useTaxonomy();

  return (
    <PageToolbar
      start={
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            className="pl-9"
            placeholder="Buscar por título, resumo, módulo, tag ou palavra-chave..."
            value={filters.search}
            onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
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

{/*
            As opções vêm do cadastro, não de constante no código: categoria
            criada aparece aqui sozinha, categoria removida some. Só as linhas
            de produto entram — as áreas de apoio publicam artigo mas não são
            alvo do ciclo, e ocupariam a barra sem servir ao filtro.
          */}
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por categoria">
            <Button
              size="sm"
              variant={filters.categoryId === "all" ? "default" : "outline"}
              onClick={() => onFiltersChange({ ...filters, categoryId: "all" })}
            >
              Todas as categorias
            </Button>

            {taxonomy.categories
              .filter((category) => category.isProduct)
              .map((category) => (
                <Button
                  key={category.id}
                  size="sm"
                  variant={filters.categoryId === category.id ? "default" : "outline"}
                  onClick={() => onFiltersChange({ ...filters, categoryId: category.id })}
                >
                  {category.name.replace("AltoQi ", "")}
                </Button>
              ))}

            {unclassifiedCount > 0 && (
              <Button
                size="sm"
                variant={filters.categoryId === "unset" ? "default" : "outline"}
                onClick={() => onFiltersChange({ ...filters, categoryId: "unset" })}
              >
                Sem seção ({unclassifiedCount})
              </Button>
            )}
          </div>

          <Button onClick={onNewItem}>Novo artigo</Button>
        </div>
      }
    />
  );
}
