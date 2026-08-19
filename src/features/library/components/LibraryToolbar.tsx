import { Search } from "lucide-react";

import type { LibraryFilters } from "@/features/library/types/LibraryFilters";
import { PROJECT_PRODUCTS } from "@/features/projects/constants/products";
import { articleStatusLabel, type ArticleStatus } from "@/models/KnowledgeArticle";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageToolbar } from "@/components/common/page/PageToolbar";

interface LibraryToolbarProps {
  filters: LibraryFilters;
  onFiltersChange: (filters: LibraryFilters) => void;
  onNewItem: () => void;
}

const statusFilters: (ArticleStatus | "all")[] = ["all", "draft", "review", "published", "archived"];

function filterLabel(value: ArticleStatus | "all") {
  return value === "all" ? "Todos" : articleStatusLabel[value];
}

export function LibraryToolbar({ filters, onFiltersChange, onNewItem }: LibraryToolbarProps) {
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

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por produto">
            <Button
              size="sm"
              variant={filters.product === "all" ? "default" : "outline"}
              onClick={() => onFiltersChange({ ...filters, product: "all" })}
            >
              Todos os produtos
            </Button>

            {PROJECT_PRODUCTS.map((product) => (
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

          <Button onClick={onNewItem}>Novo artigo</Button>
        </div>
      }
    />
  );
}
