import type { Project } from "@/models/Project";
import { BrandEmptyState } from "@/components/brand/BrandEmptyState";
import { ProjectCard } from "./ProjectCard";

interface ProjectGridProps {
  projects: Project[];
  onProjectClick?: (project: Project) => void;
  onProjectEdit?: (project: Project) => void;
  onProjectDelete?: (project: Project) => void;
}

export function ProjectGrid({ projects, onProjectClick, onProjectEdit, onProjectDelete }: ProjectGridProps) {
  if (projects.length === 0) return <BrandEmptyState title="Nenhum projeto encontrado" description="Tente alterar os filtros ou crie um novo projeto." />;
  return <div className="grid gap-x-5 gap-y-6 lg:grid-cols-2 xl:grid-cols-3">{projects.map((project) => <ProjectCard key={project.id} project={project} onClick={onProjectClick} onEdit={onProjectEdit} onDelete={onProjectDelete} />)}</div>;
}
