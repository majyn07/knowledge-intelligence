import { Search } from "lucide-react";

import type { ProjectFilters } from "@/features/projects/types/ProjectFilters";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface ProjectToolbarProps {
  filters: ProjectFilters;
  onFiltersChange: (
    filters: ProjectFilters
  ) => void;
  onNewProject: () => void;
}

export function ProjectToolbar({
  filters,
  onFiltersChange,
  onNewProject,
}: ProjectToolbarProps) {
  function changeStatus(
    status: ProjectFilters["status"]
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
            placeholder="Pesquisar projeto..."
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
            variant={
              filters.status === "all"
                ? "default"
                : "outline"
            }
            onClick={() => changeStatus("all")}
          >
            Todos
          </Button>

          <Button
            variant={
              filters.status === "active"
                ? "default"
                : "outline"
            }
            onClick={() => changeStatus("active")}
          >
            Ativos
          </Button>

          <Button
            variant={
              filters.status === "inactive"
                ? "default"
                : "outline"
            }
            onClick={() => changeStatus("inactive")}
          >
            Inativos
          </Button>

          <Button
            variant={
              filters.status === "archived"
                ? "default"
                : "outline"
            }
            onClick={() => changeStatus("archived")}
          >
            Arquivados
          </Button>

          <Button onClick={onNewProject}>
            Novo Projeto
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}