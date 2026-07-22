import type { Project } from "@/models/Project";

import { ProjectCard } from "./ProjectCard";

interface ProjectGridProps {
  projects: Project[];
  onProjectClick?: (project: Project) => void;
  onProjectEdit?: (project: Project) => void;
  onProjectDelete?: (project: Project) => void;
}

export function ProjectGrid({
  projects,
  onProjectClick,
  onProjectEdit,
  onProjectDelete,
}: ProjectGridProps) {
  if (projects.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed bg-card">
        <div className="text-center">
          <h2 className="text-lg font-semibold">
            Nenhum projeto encontrado
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Tente alterar os filtros ou crie um novo projeto.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onClick={onProjectClick}
          onEdit={onProjectEdit}
          onDelete={onProjectDelete}
        />
      ))}
    </div>
  );
}