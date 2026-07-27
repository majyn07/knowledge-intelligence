import type { Library } from "@/models/Library";

import { LibraryCard } from "./LibraryCard";

interface LibraryGridProps {
  items: Library[];

  projects: {
    id: string;
    name: string;
  }[];

  onItemClick?: (item: Library) => void;
  onItemEdit?: (item: Library) => void;
  onItemDelete?: (item: Library) => void;
}

export function LibraryGrid({
  items,
  projects,
  onItemClick,
  onItemEdit,
  onItemDelete,
}: LibraryGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed bg-card">
        <div className="text-center">
          <h2 className="text-lg font-semibold">
            Nenhum item encontrado
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Tente alterar os filtros ou adicione um novo conteúdo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const projectName =
          projects.find(
            (project) => project.id === item.projectId
          )?.name ?? "Projeto não encontrado";

        return (
          <LibraryCard
            key={item.id}
            item={item}
            projectName={projectName}
            onClick={onItemClick}
            onEdit={onItemEdit}
            onDelete={onItemDelete}
          />
        );
      })}
    </div>
  );
}