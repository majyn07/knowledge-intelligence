import { MetricCard } from "@/components/common/cards/MetricCard";
import { PageSection } from "@/components/common/page/PageSection";
import type { ProjectMetrics } from "@/features/metrics/projectMetrics";

interface DashboardIndicatorsProps {
  metrics: ProjectMetrics;
}

export function DashboardIndicators({ metrics }: DashboardIndicatorsProps) {
  return (
    <PageSection
      title="Indicadores do ciclo"
      description="Valores atuais do projeto ativo, calculados a partir de análises, planos e conteúdos registrados."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Análises pendentes" value={metrics.analysis.open + metrics.analysis.inReview} description="Abertas ou em revisão humana" />
        <MetricCard label="Oportunidades aprovadas" value={metrics.opportunity.approved} description="Decisões prontas para execução" />
        <MetricCard label="Planos ativos" value={metrics.plan.active} description="Ainda não publicados" />
        <MetricCard label="Conteúdos publicados" value={metrics.article.published} description="Disponíveis na Biblioteca" />
      </div>
    </PageSection>
  );
}
