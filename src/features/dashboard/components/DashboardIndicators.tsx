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
      /*
        O recorte é dito por cartão, e não no cabeçalho, porque os quatro não
        têm o mesmo: os três primeiros são trabalho da iniciativa, e o acervo é
        do hub. Dizer "do projeto ativo" em cima de um número que conta o
        portal inteiro é pior que não dizer nada.
      */
      description="O trabalho da iniciativa aberta e o acervo do hub, calculados a partir do que está registrado."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Análises pendentes" value={metrics.analysis.open + metrics.analysis.inReview} description="Abertas ou em revisão humana" />
        <MetricCard label="Oportunidades aprovadas" value={metrics.opportunity.approved} description="Decisões prontas para execução" />
        <MetricCard label="Planos ativos" value={metrics.plan.active} description="Ainda não publicados" />
        <MetricCard label="Conteúdos publicados" value={metrics.article.published} description="Na Biblioteca, o acervo inteiro" />
      </div>
    </PageSection>
  );
}
