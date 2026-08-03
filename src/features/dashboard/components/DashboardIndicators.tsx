import { MetricCard } from "@/components/common/cards/MetricCard";
import { PageSection } from "@/components/common/page/PageSection";
import type { AnalysisRecord } from "@/models/KnowledgeLifecycle";

interface DashboardIndicatorsProps {
  analyses: AnalysisRecord[];
}

export function DashboardIndicators({ analyses }: DashboardIndicatorsProps) {
  const completedAnalyses = analyses.filter((analysis) => analysis.status === "completed");
  const openAnalyses = analyses.filter((analysis) => analysis.status !== "completed");
  const opportunities = analyses.flatMap((analysis) => analysis.result.opportunities).filter((opportunity) => opportunity.status !== "discarded");
  const coverage = completedAnalyses.length
    ? Math.round((completedAnalyses.filter((analysis) => analysis.result.classification.documentationStatus === "adequate").length / completedAnalyses.length) * 100)
    : 0;

  return (
    <PageSection
      title="Indicadores do ciclo"
      description="Uma leitura rápida do volume e da cobertura — útil para acompanhar, não para substituir a priorização."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Análises abertas" value={openAnalyses.length} description="Aguardando decisão humana" />
        <MetricCard label="Oportunidades" value={opportunities.length} description="Na fila de evolução" />
        <MetricCard label="Rascunhos" value={opportunities.filter((opportunity) => opportunity.status === "draft").length} description="Prontos para publicação" />
        <MetricCard label="Cobertura" value={`${coverage}%`} description="Análises concluídas com cobertura adequada" />
      </div>
    </PageSection>
  );
}
