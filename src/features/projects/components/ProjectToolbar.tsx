import { Search } from "lucide-react";

import type { ProjectFilters } from "@/features/projects/types/ProjectFilters";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageToolbar } from "@/components/common/page/PageToolbar";

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
    <PageToolbar
      start={
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
      }
      end={

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
      }
    />
  );
}
