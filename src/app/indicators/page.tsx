"use client";

import { useMemo, useState } from "react";
import { BarChart3, Download } from "lucide-react";

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
import { CoverageMap } from "@/features/library/components/CoverageMap";
import { CycleFunnel } from "@/features/metrics/components/CycleFunnel";
import { CycleTimeCard } from "@/features/metrics/components/CycleTimeCard";
import { RecurringSubjects } from "@/features/metrics/components/RecurringSubjects";
import { PeriodMetricCard } from "@/features/metrics/components/PeriodMetricCard";
import { TeamFilter, TeamScopeNotice } from "@/features/metrics/components/TeamFilter";
import { scopeToTeam } from "@/features/metrics/teamScope";
import { PanelBoard } from "@/features/metrics/panels/components/PanelBoard";
import { selectPeriodMetrics, type MetricPeriod } from "@/features/metrics/periodMetrics";
import { cycleTime } from "@/features/metrics/cycleTime";
import { indicatorsFileName, indicatorsToCsv, type IndicatorRow } from "@/features/metrics/indicatorsCsv";
import { selectProjectMetrics } from "@/features/metrics/projectMetrics";
import { usePeople } from "@/features/people/providers/PeopleProvider";
import { usePlans } from "@/features/plans/providers/PlansProvider";
import { dayOf } from "@/lib/dates";
import { useProject } from "@/providers/ProjectProvider";

const periods: { value: MetricPeriod; label: string }[] = [
  { value: 7, label: "7 dias" },
  { value: 30, label: "30 dias" },
  { value: 90, label: "90 dias" },
  { value: null, label: "Tudo" },
];

/** O que o tempo de ciclo não conta, na mesma frase que a tela usa. */
function ressalvaDoCiclo(ciclo: ReturnType<typeof cycleTime>): string {
  const partes: string[] = [];

  if (ciclo.ignored.semDataUtil > 0) {
    partes.push(`${ciclo.ignored.semDataUtil} sem data que dê para situar no tempo`);
  }

  if (ciclo.ignored.semAtendimento > 0) {
    partes.push(`${ciclo.ignored.semAtendimento} cujo atendimento não está mais aqui`);
  }

  if (ciclo.ignored.ordemImpossivel > 0) {
    partes.push(`${ciclo.ignored.ordemImpossivel} publicados antes da data do atendimento`);
  }

  return partes.length === 0 ? "" : `Fora da conta: ${partes.join(", ")}.`;
}

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
  const { people, teams } = usePeople();
  const { activeProject, activeProjectId } = useProject();
  const [days, setDays] = useState<MetricPeriod>(30);
  const [teamId, setTeamId] = useState<string | null>(null);

  /*
    O recorte entra antes do seletor, e não depois: os números derivam de
    plano e artigo, e filtrar o resultado pronto exigiria refazer a conta.
  */
  const scope = useMemo(
    () => scopeToTeam({ teamId, plans, articles, people, teams }),
    [articles, people, plans, teamId, teams]
  );

  const projectTickets = ticketsOf(activeProjectId);

  const metrics = selectProjectMetrics({
    projectId: activeProjectId,
    analyses,
    plans: scope.plans,
    articles: scope.articles,
    tickets: projectTickets,
  });

  // O instante entra como valor para o seletor permanecer uma função pura.
  const period = useMemo(
    () => selectPeriodMetrics({ projectId: activeProjectId, events, analyses, days, now: new Date() }),
    [activeProjectId, analyses, days, events]
  );

  const comparable = days !== null;

  /*
    A página inteira numa planilha.

    Os painéis já saíam um a um, e um a um é o que não serve para quem leva o
    resultado a uma reunião: são doze arquivos para montar um slide. Aqui sai o
    que está na tela, com o recorte que gerou os números escrito em cima, e a
    ressalva ao lado de cada um que tem uma.

    Sai do mesmo lugar que a tela lê. Escritos em separado, os dois divergem, e
    a planilha deixaria de ser o que estava na tela.
  */
  function exportarIndicadores() {
    const ciclo = cycleTime(articles, projectTickets, events);
    const periodo = periods.find((option) => option.value === days)?.label ?? "";

    const linhas: IndicatorRow[] = [
      { group: "Movimento do ciclo", label: "Atendimentos registrados", value: period.ticketsRegistered.current, note: comparable ? `Período anterior: ${period.ticketsRegistered.previous}` : "" },
      { group: "Movimento do ciclo", label: "Análises realizadas", value: period.analysesStarted.current, note: comparable ? `Período anterior: ${period.analysesStarted.previous}` : "" },
      { group: "Movimento do ciclo", label: "Análises concluídas", value: period.analysesCompleted.current, note: comparable ? `Período anterior: ${period.analysesCompleted.previous}` : "" },
      { group: "Movimento do ciclo", label: "Oportunidades aprovadas", value: period.opportunitiesApproved.current, note: comparable ? `Período anterior: ${period.opportunitiesApproved.previous}` : "" },
      { group: "Movimento do ciclo", label: "Oportunidades descartadas", value: period.opportunitiesDiscarded.current, note: comparable ? `Período anterior: ${period.opportunitiesDiscarded.previous}` : "" },
      { group: "Movimento do ciclo", label: "Planos criados", value: period.plansCreated.current, note: comparable ? `Período anterior: ${period.plansCreated.previous}` : "" },
      { group: "Movimento do ciclo", label: "Artigos criados", value: period.articlesCreated.current, note: comparable ? `Período anterior: ${period.articlesCreated.previous}` : "" },
      { group: "Movimento do ciclo", label: "Mudanças de estágio", value: period.stageMoves.current, note: comparable ? `Período anterior: ${period.stageMoves.previous}` : "" },
      {
        group: "Movimento do ciclo",
        label: "Cobertura das análises concluídas",
        value: coverageNow.percentage === null ? "" : `${coverageNow.percentage}%`,
        note: coverageLabel(coverageNow.percentage, coverageNow.completed),
      },

      { group: "Estado atual", label: "Atendimentos", value: metrics.ticket.total, note: `${metrics.ticket.analyzed} já analisado(s)` },
      { group: "Estado atual", label: "Análises pendentes", value: metrics.analysis.open + metrics.analysis.inReview },
      { group: "Estado atual", label: "Cobertura acumulada", value: `${metrics.analysis.coverage}%` },
      { group: "Estado atual", label: "Aprovadas sem plano", value: metrics.opportunity.approvedWithoutPlan },
      { group: "Estado atual", label: "Planos ativos", value: metrics.plan.active, note: `${metrics.plan.published} publicado(s)` },
      { group: "Estado atual", label: "Artigos em rascunho", value: metrics.article.draft },
      { group: "Estado atual", label: "Artigos em revisão", value: metrics.article.review },
      { group: "Estado atual", label: "Artigos publicados", value: metrics.article.published, note: `${metrics.article.archived} arquivado(s)` },

      {
        group: "Do atendimento ao artigo publicado",
        label: "Mediana de dias",
        value: ciclo.medianDays ?? "",
        note: ressalvaDoCiclo(ciclo),
      },
      {
        group: "Do atendimento ao artigo publicado",
        label: "Média de dias",
        value: ciclo.averageDays ?? "",
      },
      {
        group: "Do atendimento ao artigo publicado",
        label: "Pares medidos",
        value: ciclo.measured,
      },
    ];

    for (const span of ciclo.slowest) {
      linhas.push({
        group: "Os que mais demoraram",
        label: span.articleTitle,
        value: span.days,
      });
    }

    const csv = indicatorsToCsv(
      [
        `Indicadores · ${activeProject?.name ?? "sem projeto"}`,
        `Movimento do ciclo: ${periodo}`,
        scope.isScoped ? "Estado atual recortado por equipe" : "Estado atual: todas as equipes",
      ],
      linhas
    );

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = indicatorsFileName(dayOf(new Date()));
    link.click();
    URL.revokeObjectURL(url);
  }
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
          actions={
            <Button variant="outline" onClick={exportarIndicadores}>
              <Download className="mr-2 h-4 w-4" />
              Exportar a página
            </Button>
          }
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
                  {coverageNow.percentage === null ? "Sem dado" : `${coverageNow.percentage}%`}
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
          actions={<TeamFilter teams={teams} value={teamId} onChange={setTeamId} />}
        >
          <TeamScopeNotice scope={scope} />

          <div className={scope.isScoped ? "mt-4" : undefined}>
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
          </div>
        </PageSection>

        {/*
          O tempo do ciclo e os assuntos que chegam vêm antes dos painéis: são
          as duas perguntas que alguém leva para uma reunião, e as duas que
          nenhum cartão acima respondia. Os de cima contam o que aconteceu; estes
          dizem quanto tempo levou e sobre o quê.
        */}
        <CycleTimeCard tickets={projectTickets} />

        <RecurringSubjects tickets={projectTickets} />

        {/*
          O funil responde onde o fluxo trava; o mapa, o que falta cobrir. Os
          cartões acima contam o que existe: as três perguntas são diferentes.
        */}
        <PanelBoard />

        <CycleFunnel />

        <CoverageMap />
      </div>
    </AppShell>
  );
}
