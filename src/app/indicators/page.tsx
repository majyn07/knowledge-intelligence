"use client";

import { AppShell } from "@/components/layout/AppShell";
import { BrandEmptyState } from "@/components/brand/BrandEmptyState";
import { MetricCard } from "@/components/common/cards/MetricCard";
import { PageHeader } from "@/components/common/page/PageHeader";
import { useKnowledgeLifecycle } from "@/features/analysis/providers/KnowledgeLifecycleProvider";
import { useLibrary } from "@/features/library/providers/LibraryProvider";
import { selectProjectMetrics } from "@/features/metrics/projectMetrics";
import { usePlans } from "@/features/plans/providers/PlansProvider";
import { useProject } from "@/providers/ProjectProvider";

export default function IndicatorsPage() {
  const { analyses } = useKnowledgeLifecycle();
  const { plans } = usePlans();
  const { items: articles } = useLibrary();
  const { activeProject, activeProjectId } = useProject();
  const metrics = selectProjectMetrics({ projectId: activeProjectId, analyses, plans, articles });

  return (
    <AppShell>
      <div className="space-y-8">
        <PageHeader overline="Gestão" title="Indicadores" description="Valores atuais calculados com as mesmas regras do Centro de Inteligência." />
        {metrics.isEmpty ? (
          <BrandEmptyState title={`Sem indicadores para ${activeProject?.name ?? "o projeto ativo"}`} description="Registre análises, planos ou conteúdos neste projeto para acompanhar o ciclo de conhecimento." />
        ) : (
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Análises realizadas" value={metrics.analysis.total} description={`${metrics.analysis.completed} concluída(s)`} />
            <MetricCard label="Análises pendentes" value={metrics.analysis.open + metrics.analysis.inReview} description="Abertas ou em revisão" />
            <MetricCard label="Cobertura da Base" value={`${metrics.analysis.coverage}%`} description="Concluídas com cobertura adequada" />
            <MetricCard label="Oportunidades aprovadas" value={metrics.opportunity.approved} description={`${metrics.opportunity.discarded} descartada(s)`} />
            <MetricCard label="Planos ativos" value={metrics.plan.active} description={`${metrics.plan.published} publicado(s)`} />
            <MetricCard label="Artigos em rascunho" value={metrics.article.draft} description="Aguardando envio para revisão" />
            <MetricCard label="Artigos em revisão" value={metrics.article.review} description="Aguardando publicação" />
            <MetricCard label="Artigos publicados" value={metrics.article.published} description={`${metrics.article.archived} arquivado(s)`} />
          </section>
        )}
      </div>
    </AppShell>
  );
}
