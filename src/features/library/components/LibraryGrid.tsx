import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import { BrandEmptyState } from "@/components/brand/BrandEmptyState";
import { LibraryCard } from "./LibraryCard";

interface LibraryGridProps {
  items: KnowledgeArticle[];
  projects: { id: string; name: string }[];
  onItemEdit?: (item: KnowledgeArticle) => void;
  onItemDelete?: (item: KnowledgeArticle) => void;
}

const UNGROUPED = "Sem produto definido";

/** Agrupa por produto › módulo, a mesma hierarquia do portal de suporte. */
function groupArticles(items: KnowledgeArticle[]) {
  const groups = new Map<string, KnowledgeArticle[]>();

  for (const item of items) {
    const key = [item.product || UNGROUPED, item.module].filter(Boolean).join(" › ");
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
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

  const groups = groupArticles(items);

  return (
    <div className="space-y-10">
      {groups.map(([group, groupItems]) => (
        <section key={group}>
          <div className="flex items-baseline justify-between gap-4 border-b border-border/70 pb-2">
            <h2 className="text-sm font-semibold tracking-tight">{group}</h2>
            <span className="text-xs text-muted-foreground">
              {groupItems.length} artigo(s)
            </span>
          </div>

          <div className="mt-5 grid gap-x-5 gap-y-6 lg:grid-cols-2 xl:grid-cols-3">
            {groupItems.map((item) => (
              <LibraryCard
                key={item.id}
                item={item}
                projectName={projects.find((project) => project.id === item.projectId)?.name ?? "Projeto não encontrado"}
                onEdit={onItemEdit}
                onDelete={onItemDelete}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
