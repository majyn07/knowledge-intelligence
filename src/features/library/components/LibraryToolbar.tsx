import { Search } from "lucide-react";

import type { LibraryFilters } from "@/features/library/types/LibraryFilters";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface LibraryToolbarProps {
  filters: LibraryFilters;
  onFiltersChange: (filters: LibraryFilters) => void;
  onNewItem: () => void;
}

export function LibraryToolbar({
  filters,
  onFiltersChange,
  onNewItem,
}: LibraryToolbarProps) {
  function changeStatus(
    status: LibraryFilters["status"]
  ) {
    onFiltersChange({
      ...filters,
      status,
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            className="pl-9"
            placeholder="Pesquisar conteúdo..."
            value={filters.search}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                search: event.target.value,
              })
            }
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={filters.status === "all" ? "default" : "outline"}
            onClick={() => changeStatus("all")}
          >
            Todos
          </Button>

          <Button
            variant={filters.status === "draft" ? "default" : "outline"}
            onClick={() => changeStatus("draft")}
          >
            Rascunhos
          </Button>

          <Button
            variant={filters.status === "review" ? "default" : "outline"}
            onClick={() => changeStatus("review")}
          >
            Revisão
          </Button>

          <Button
            variant={filters.status === "published" ? "default" : "outline"}
            onClick={() => changeStatus("published")}
          >
            Publicados
          </Button>

          <Button
            variant={filters.status === "archived" ? "default" : "outline"}
            onClick={() => changeStatus("archived")}
          >
            Arquivados
          </Button>

          <Button onClick={onNewItem}>
            Novo Conteúdo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}