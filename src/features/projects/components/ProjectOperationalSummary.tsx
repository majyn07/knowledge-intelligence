import { MetricCard } from "@/components/common/cards/MetricCard";
import { PageSection } from "@/components/common/page/PageSection";
import type { ProjectMetrics } from "@/features/metrics/projectMetrics";
import { concordar, contar } from "@/lib/plural";

interface ProjectOperationalSummaryProps {
  metrics: ProjectMetrics;
}

/** Todos os números derivam das entidades reais; nada é persistido no Project. */
export function ProjectOperationalSummary({ metrics }: ProjectOperationalSummaryProps) {
  return (
    <PageSection
      title="Resumo operacional"
      description="Calculado a partir dos atendimentos, análises, planos e conteúdos deste projeto."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Atendimentos"
          value={metrics.ticket.total}
          description={
            metrics.ticket.total === 0
              ? "Nenhum disponível"
              : `${metrics.ticket.analyzed} já ${concordar(metrics.ticket.analyzed, "analisado")}`
          }
        />

        <MetricCard
          label="Análises"
          value={metrics.analysis.total}
          description={
            metrics.analysis.total === 0
              ? "Nenhuma realizada"
              : `${contar(metrics.analysis.completed, "concluída")}`
          }
        />

        <MetricCard
          label="Oportunidades"
          value={metrics.opportunity.total}
          description={
            metrics.opportunity.total === 0
              ? "Nenhuma identificada"
              : `${contar(metrics.opportunity.approved, "aprovada")}`
          }
        />

        <MetricCard
          label="Planos"
          value={metrics.plan.total}
          description={
            metrics.plan.total === 0
              ? "Nenhum criado"
              : `${contar(metrics.plan.active, "ativo")}`
          }
        />

        <MetricCard
          label="Conteúdos"
          value={metrics.article.total}
          description={
            metrics.article.total === 0
              ? "Nenhum na Biblioteca"
              : `${contar(metrics.article.published, "publicado")}`
          }
        />
      </div>
    </PageSection>
  );
}
