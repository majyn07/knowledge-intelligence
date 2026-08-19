import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import { BrandEmptyState } from "@/components/brand/BrandEmptyState";
import { LibraryCard } from "./LibraryCard";

interface LibraryGridProps {
  items: KnowledgeArticle[];
  projects: { id: string; name: string }[];
  onItemEdit?: (item: KnowledgeArticle) => void;
  onItemDelete?: (item: KnowledgeArticle) => void;
}

export function LibraryGrid({ items, projects, onItemEdit, onItemDelete }: LibraryGridProps) {
  if (items.length === 0) {
    return (
      <BrandEmptyState
        title="Nenhum artigo encontrado"
        description="Tente alterar os filtros ou registre um novo conteúdo para a Base de Conhecimento."
      />
    );
  }

  return (
    <div className="grid gap-x-5 gap-y-6 lg:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <LibraryCard
          key={item.id}
          item={item}
          projectName={projects.find((project) => project.id === item.projectId)?.name ?? "Projeto não encontrado"}
          onEdit={onItemEdit}
          onDelete={onItemDelete}
        />
      ))}
    </div>
  );
}
