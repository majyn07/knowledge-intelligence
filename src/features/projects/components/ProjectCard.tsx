"use client";

import Link from "next/link";
import { Boxes, Pencil, Target, Trash2, UserRound } from "lucide-react";

import type { Project } from "@/models/Project";
import { projectStatusLabel } from "@/models/Project";

import { StatusBadge } from "@/components/common/status/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { AssigneeName } from "@/features/people/components/AssigneeName";
import { Button } from "@/components/ui/button";
import { RelativeDate } from "@/components/common/RelativeDate";

interface ProjectCardProps {
  project: Project;
  isActive?: boolean;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

const statusVariant: Record<Project["status"], "success" | "warning" | "default"> = {
  active: "success",
  inactive: "warning",
  archived: "default",
};

export function ProjectCard({ project, isActive = false, onEdit, onDelete }: ProjectCardProps) {
  const context = [project.product, project.module].filter(Boolean).join(" · ");

  return (
    <Card
      className={`relative rounded-xl bg-card shadow-none transition-colors ${
        isActive ? "border-primary/45 bg-primary/[0.03]" : "border-border/70 hover:border-primary/30"
      }`}
    >
      <CardContent className="flex h-full flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge variant={statusVariant[project.status]}>
                {projectStatusLabel[project.status]}
              </StatusBadge>

              {isActive && <StatusBadge variant="info">Projeto ativo</StatusBadge>}
            </div>

            <h2 className="mt-3 text-base font-semibold tracking-tight">
              {/* O card inteiro é navegável pelo título, sem capturar os botões de ação. */}
              <Link href={`/projects/${project.id}`} className="after:absolute after:inset-0 hover:underline">
                {project.name}
              </Link>
            </h2>

          </div>
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <dt className="sr-only">Contexto AltoQi</dt>
            <Boxes className="h-3.5 w-3.5 shrink-0 text-primary" />
            <dd className="truncate">{context || "Produto não definido"}</dd>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <dt className="sr-only">Responsável</dt>
            <UserRound className="h-3.5 w-3.5 shrink-0 text-primary" />
            <dd className="truncate">
              <AssigneeName value={project.owner} fallback="Responsável não definido" />
            </dd>
          </div>
        </dl>

        {project.goal ? (
          <p className="flex gap-2 rounded-lg border-l-2 border-primary/30 bg-muted/25 px-3 py-2.5 text-sm leading-6">
            <Target className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="line-clamp-2">{project.goal}</span>
          </p>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground line-clamp-2">
            {project.description || "Sem objetivo definido."}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between border-t pt-4">
          <span className="text-xs text-muted-foreground">
            Atualizado <RelativeDate value={project.updatedAt} />
          </span>

          <div className="relative flex gap-2">
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Editar ${project.name}`}
              onClick={() => onEdit?.(project)}
            >
              <Pencil className="h-4 w-4" />
            </Button>

            <Button
              size="icon"
              variant="ghost"
              aria-label={`Excluir ${project.name}`}
              onClick={() => onDelete?.(project)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
