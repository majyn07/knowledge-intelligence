import {
  Building2,
  Pencil,
  Trash2,
} from "lucide-react";

import type { Project } from "@/models/Project";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ProjectCardProps {
  project: Project;
  onClick?: (project: Project) => void;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

const statusMap = {
  active: {
    label: "Ativo",
    color: "bg-emerald-500",
  },
  inactive: {
    label: "Inativo",
    color: "bg-amber-500",
  },
  archived: {
    label: "Arquivado",
    color: "bg-slate-400",
  },
} as const;

export function ProjectCard({
  project,
  onClick,
  onEdit,
  onDelete,
}: ProjectCardProps) {
  const status = statusMap[project.status];

  const createdAt =
    project.createdAt.toLocaleDateString("pt-BR");

  return (
    <Card
      className="cursor-pointer rounded-xl border-border/70 bg-card shadow-none transition-colors hover:border-primary/30 hover:bg-muted/20"
      onClick={() => onClick?.(project)}
    >
      <CardContent className="space-y-5 p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              {project.name}
            </h2>

            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              {project.client}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${status.color}`}
            />

            <span className="text-xs font-medium text-muted-foreground">
              {status.label}
            </span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {project.description}
        </p>

        <div className="flex items-center justify-between border-t pt-4">
          <span className="text-xs text-muted-foreground">
            Criado em {createdAt}
          </span>

          <div className="flex gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                onEdit?.(project);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                onDelete?.(project);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
