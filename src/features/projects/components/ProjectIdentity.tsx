import { Boxes, Building2, Layers, Target, UserRound } from "lucide-react";

import { PropertyGrid } from "@/components/common/data/PropertyGrid";
import { StatusBadge } from "@/components/common/status/StatusBadge";
import type { Project } from "@/models/Project";
import { projectStatusLabel } from "@/models/Project";

interface ProjectIdentityProps {
  project: Project;
  isActive: boolean;
}

const statusVariant: Record<Project["status"], "success" | "warning" | "default"> = {
  active: "success",
  inactive: "warning",
  archived: "default",
};

function value(content: string, fallback: string) {
  return content || fallback;
}

export function ProjectIdentity({ project, isActive }: ProjectIdentityProps) {
  return (
    <section className="rounded-xl border border-border/70 bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge variant={statusVariant[project.status]}>
          {projectStatusLabel[project.status]}
        </StatusBadge>

        {isActive && <StatusBadge variant="info">Projeto ativo</StatusBadge>}

        {project.status === "archived" && isActive && (
          <span className="text-xs text-muted-foreground">
            Este projeto está arquivado e continua sendo o contexto ativo.
          </span>
        )}
      </div>

      <PropertyGrid
        className="mt-6"
        columns={4}
        items={[
          {
            label: "Cliente",
            value: (
              <span className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                {value(project.client, "Não informado")}
              </span>
            ),
          },
          {
            label: "Produto",
            value: (
              <span className="flex items-center gap-2">
                <Boxes className="h-4 w-4 text-primary" />
                {value(project.product, "Não definido")}
              </span>
            ),
          },
          {
            label: "Módulo",
            value: (
              <span className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                {value(project.module, "Não definido")}
              </span>
            ),
          },
          {
            label: "Responsável",
            value: (
              <span className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-primary" />
                {value(project.owner, "Não definido")}
              </span>
            ),
          },
        ]}
      />

      <div className="mt-6 rounded-xl border-l-2 border-primary/40 bg-muted/25 p-5">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <Target className="h-3.5 w-3.5 text-primary" />
          Objetivo do projeto
        </p>

        <p className="mt-2 max-w-3xl text-sm leading-7">
          {project.goal || "Nenhum objetivo definido. Edite o projeto para registrar qual resultado documental ele persegue."}
        </p>

        {project.description && (
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
            {project.description}
          </p>
        )}
      </div>
    </section>
  );
}
