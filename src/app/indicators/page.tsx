"use client";

import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/common/cards/MetricCard";
import { PageHeader } from "@/components/common/page/PageHeader";
import { useKnowledgeLifecycle } from "@/features/analysis/providers/KnowledgeLifecycleProvider";

export default function IndicatorsPage() {
  const { analyses } = useKnowledgeLifecycle();
  const completed = analyses.filter((analysis) => analysis.status === "completed");
  const opportunities = completed.flatMap((analysis) => analysis.result.opportunities);
  const covered = completed.filter((analysis) => analysis.result.classification.documentationStatus === "adequate").length;
  const coverage = completed.length ? Math.round((covered / completed.length) * 100) : 0;
  return <AppShell><div className="space-y-8"><PageHeader overline="Gestão" title="Indicadores" description="Métricas calculadas somente a partir das análises finalizadas." /><section className="grid gap-px overflow-hidden rounded-xl border border-border/70 bg-border/70 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Cobertura da Base" value={`${coverage}%`} description="Atendimentos com cobertura adequada" /><MetricCard label="Análises concluídas" value={completed.length} description="Consideradas neste painel" /><MetricCard label="Em revisão" value={analyses.filter((analysis) => analysis.status === "in_review").length} description="Ainda não afetam os indicadores" /><MetricCard label="Rascunhos em preparação" value={opportunities.filter((item) => item.status === "draft").length} description="Prontos para a Biblioteca" /></section></div></AppShell>;
}
