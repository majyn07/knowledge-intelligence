import Link from "next/link";
import { ArrowRight, CalendarDays, FileSearch } from "lucide-react";

import { BrandEmptyState } from "@/components/brand/BrandEmptyState";
import { PageSection } from "@/components/common/page/PageSection";
import { StatusBadge } from "@/components/common/status/StatusBadge";
import { Button } from "@/components/ui/button";
import type { OpportunityStatus } from "@/features/analysis/types/KnowledgeOpportunity";
import { OpportunityStatusLabel } from "@/features/analysis/types/KnowledgeOpportunity";
import type { AnalysisRecord } from "@/models/KnowledgeLifecycle";

interface ImprovementBacklogProps {
  analyses: AnalysisRecord[];
}

const statusVariant: Record<OpportunityStatus, "warning" | "success" | "info" | "default"> = {
  proposed: "warning",
  approved: "success",
  discarded: "default",
  draft: "info",
  deferred: "default",
};

function getPriority(type: string) {
  if (type === "warning" || type === "update_article") {
    return { label: "Alta", variant: "danger" as const };
  }

  if (type === "new_article") {
    return { label: "Média", variant: "warning" as const };
  }

  return { label: "Normal", variant: "info" as const };
}

function formatDate(date: string) {
  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "Data não informada";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

export function ImprovementBacklog({ analyses }: ImprovementBacklogProps) {
  const opportunities = analyses
    .flatMap((analysis) =>
      analysis.result.opportunities.map((opportunity) => ({ analysis, opportunity }))
    )
    .filter(({ opportunity }) => opportunity.status !== "discarded");

  return (
    <PageSection
      title="Fila de trabalho"
      description="Oportunidades já identificadas, prontas para revisão e evolução da Base de Conhecimento."
      actions={
        <Button variant="ghost" size="sm" render={<Link href="/improvement-plan" />}>
          Ver fila completa
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      }
    >
      {opportunities.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
          <div className="divide-y divide-border/70">
            {opportunities.slice(0, 5).map(({ analysis, opportunity }) => {
              const priority = getPriority(opportunity.type);

              return (
                <article key={`${analysis.id}-${opportunity.id}`} className="p-5 sm:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileSearch className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground">{opportunity.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{opportunity.description}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                          <span>Origem: atendimento #{analysis.ticketId}</span>
                          <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{formatDate(analysis.startedAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                      <StatusBadge variant={priority.variant}>Prioridade {priority.label}</StatusBadge>
                      <StatusBadge variant={statusVariant[opportunity.status]}>{OpportunityStatusLabel[opportunity.status]}</StatusBadge>
                      <Button size="sm" variant="outline" render={<Link href="/improvement-plan" />}>Ver ação</Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-5 py-8 text-center sm:px-8">
          <BrandEmptyState
            title="A fila de trabalho está vazia"
            description="Ainda não há oportunidades aprovadas para evolução. Conclua uma análise e revise suas recomendações para formar o próximo backlog."
          />
          <Button className="mt-6" variant="outline" render={<Link href="/analysis" />}>Abrir Workspace</Button>
        </div>
      )}
    </PageSection>
  );
}
