import type { Library } from "@/models/Library";
import { BrandEmptyState } from "@/components/brand/BrandEmptyState";
import { LibraryCard } from "./LibraryCard";

interface LibraryGridProps {
  items: Library[];
  projects: { id: string; name: string }[];
  onItemClick?: (item: Library) => void;
  onItemEdit?: (item: Library) => void;
  onItemDelete?: (item: Library) => void;
}

export function LibraryGrid({ items, projects, onItemClick, onItemEdit, onItemDelete }: LibraryGridProps) {
  if (items.length === 0) return <BrandEmptyState title="Nenhum item encontrado" description="Tente alterar os filtros ou adicione um novo conteúdo." />;
  return <div className="grid gap-x-5 gap-y-6 lg:grid-cols-2 xl:grid-cols-3">{items.map((item) => <LibraryCard key={item.id} item={item} projectName={projects.find((project) => project.id === item.projectId)?.name ?? "Projeto não encontrado"} onClick={onItemClick} onEdit={onItemEdit} onDelete={onItemDelete} />)}</div>;
}
