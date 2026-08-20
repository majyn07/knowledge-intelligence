"use client";

import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { BrandEmptyState } from "@/components/brand/BrandEmptyState";
import { MetricCard } from "@/components/common/cards/MetricCard";
import { PageHeader } from "@/components/common/page/PageHeader";
import { PageSection } from "@/components/common/page/PageSection";
import { Button } from "@/components/ui/button";
import { useActivity } from "@/features/activities/providers/ActivityProvider";
import { useKnowledgeLifecycle } from "@/features/analysis/providers/KnowledgeLifecycleProvider";
import { useTickets } from "@/features/analysis/providers/TicketsProvider";
import { useLibrary } from "@/features/library/providers/LibraryProvider";
import { PeriodMetricCard } from "@/features/metrics/components/PeriodMetricCard";
import { selectPeriodMetrics, type MetricPeriod } from "@/features/metrics/periodMetrics";
import { selectProjectMetrics } from "@/features/metrics/projectMetrics";
import { usePlans } from "@/features/plans/providers/PlansProvider";
import { useProject } from "@/providers/ProjectProvider";

const periods: { value: MetricPeriod; label: string }[] = [
  { value: 7, label: "7 dias" },
  { value: 30, label: "30 dias" },
  { value: 90, label: "90 dias" },
  { value: null, label: "Tudo" },
];

function coverageLabel(percentage: number | null, completed: number) {
  if (percentage === null) return "Nenhuma análise concluída no período";
  return `${completed} análise(s) concluída(s)`;
}

export default function IndicatorsPage() {
  const { analyses } = useKnowledgeLifecycle();
  const { events } = useActivity();
  const { plans } = usePlans();
  const { items: articles } = useLibrary();
  const { ticketsOf } = useTickets();
  const { activeProject, activeProjectId } = useProject();
  const [days, setDays] = useState<MetricPeriod>(30);

  const metrics = selectProjectMetrics({
    projectId: activeProjectId,
    analyses,
    plans,
    articles,
    tickets: ticketsOf(activeProjectId),
  });

  // O instante entra como valor para o seletor permanecer uma função pura.
  const period = useMemo(
    () => selectPeriodMetrics({ projectId: activeProjectId, events, analyses, days, now: new Date() }),
    [activeProjectId, analyses, days, events]
  );

  const comparable = days !== null;
  const coverageNow = period.coverage.current;
  const coverageBefore = period.coverage.previous;

  return (
    <AppShell>
      <div className="w-full space-y-8">
        <PageHeader
          overline="Gestão"
          title="Indicadores"
          description={`Como o ciclo de conhecimento de ${activeProject?.name ?? "este projeto"} se moveu, e onde ele está agora.`}
          icon={<BarChart3 className="h-6 w-6" />}
        />

        <PageSection
          title="Movimento do ciclo"
          description={
            comparable
              ? "Contado a partir do histórico de atividades, comparando com o período anterior de mesmo tamanho."
              : "Contado a partir de todo o histórico de atividades guardado. Sem período anterior para comparar."
          }
          actions={
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Período">
              {periods.map((option) => (
                <Button
                  key={option.label}
                  size="sm"
                  variant={days === option.value ? "default" : "outline"}
                  onClick={() => setDays(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          }
        >
          {!period.hasMovement ? (
            <BrandEmptyState
              title="Nada aconteceu neste período"
              description="Registre um atendimento, conclua uma análise ou publique um conteúdo para o ciclo aparecer aqui."
            />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <PeriodMetricCard label="Atendimentos registrados" value={period.ticketsRegistered} comparable={comparable} />
                <PeriodMetricCard label="Análises realizadas" value={period.analysesStarted} comparable={comparable} />
                <PeriodMetricCard label="Análises concluídas" value={period.analysesCompleted} comparable={comparable} />
                <PeriodMetricCard label="Oportunidades aprovadas" value={period.opportunitiesApproved} comparable={comparable} />
                <PeriodMetricCard
                  label="Oportunidades descartadas"
                  value={period.opportunitiesDiscarded}
                  higherIsBetter={false}
                  comparable={comparable}
                />
                <PeriodMetricCard label="Planos criados" value={period.plansCreated} comparable={comparable} />
                <PeriodMetricCard label="Artigos criados" value={period.articlesCreated} comparable={comparable} />
                <PeriodMetricCard label="Mudanças de estágio" value={period.stageMoves} comparable={comparable} />
              </div>

              <article className="rounded-xl border border-border/70 bg-muted/20 p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Cobertura das análises concluídas no período
                </p>

                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {coverageNow.percentage === null ? "—" : `${coverageNow.percentage}%`}
                </p>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {coverageLabel(coverageNow.percentage, coverageNow.completed)}
                  {comparable && coverageBefore.percentage !== null && coverageNow.percentage !== null && (
                    <> · período anterior: {coverageBefore.percentage}%</>
                  )}
                </p>
              </article>
            </div>
          )}
        </PageSection>

        <PageSection
          title="Estado atual"
          description="O retrato de agora, com as mesmas regras do Centro de Inteligência."
        >
          {metrics.isEmpty ? (
            <BrandEmptyState
              title={`Sem dados para ${activeProject?.name ?? "o projeto ativo"}`}
              description="Registre análises, planos ou conteúdos neste projeto para acompanhar o ciclo de conhecimento."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Atendimentos" value={metrics.ticket.total} description={`${metrics.ticket.analyzed} já analisado(s)`} />
              <MetricCard label="Análises pendentes" value={metrics.analysis.open + metrics.analysis.inReview} description="Abertas ou em revisão" />
              <MetricCard label="Cobertura acumulada" value={`${metrics.analysis.coverage}%`} description="Sobre todas as análises concluídas" />
              <MetricCard label="Aprovadas sem plano" value={metrics.opportunity.approvedWithoutPlan} description="Decisões que ainda não viraram execução" />
              <MetricCard label="Planos ativos" value={metrics.plan.active} description={`${metrics.plan.published} publicado(s)`} />
              <MetricCard label="Artigos em rascunho" value={metrics.article.draft} description="Aguardando envio para revisão" />
              <MetricCard label="Artigos em revisão" value={metrics.article.review} description="Aguardando publicação" />
              <MetricCard label="Artigos publicados" value={metrics.article.published} description={`${metrics.article.archived} arquivado(s)`} />
            </div>
          )}
        </PageSection>
      </div>
    </AppShell>
  );
}
