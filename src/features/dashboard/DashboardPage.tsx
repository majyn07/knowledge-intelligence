"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

import { BrandEmptyState } from "@/components/brand/BrandEmptyState";
import { ProductGraphic } from "@/components/brand/ProductGraphic";
import { PageHeader } from "@/components/common/page/PageHeader";
import { MetricsSkeleton } from "@/components/common/page/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { useKnowledgeLifecycle } from "@/features/analysis/providers/KnowledgeLifecycleProvider";
import { useLibrary } from "@/features/library/providers/LibraryProvider";
import { selectProjectMetrics } from "@/features/metrics/projectMetrics";
import { usePlans } from "@/features/plans/providers/PlansProvider";
import { useBrandTheme } from "@/providers/BrandThemeProvider";
import { useProject } from "@/providers/ProjectProvider";

import { AnalysisReadings } from "./components/AnalysisReadings";
import { DashboardIndicators } from "./components/DashboardIndicators";
import { ImprovementBacklog } from "./components/ImprovementBacklog";
import { NextPriority } from "./components/NextPriority";
import { MyWork } from "@/features/plans/components/MyWork";
import { Watching } from "@/features/plans/components/Watching";

export function DashboardPage() {
  const { analyses, isHydrated: analysesReady } = useKnowledgeLifecycle();
  const { plans, isHydrated: plansReady } = usePlans();
  const { items: articles, isHydrated: articlesReady } = useLibrary();
  const { theme } = useBrandTheme();
  const { activeProject, activeProjectId } = useProject();
  const metrics = selectProjectMetrics({ projectId: activeProjectId, analyses, plans, articles });

  /*
    Os números somam três coleções, e uma só que ainda não chegou já torna o
    total mentira. Esperar as três é o único jeito de o primeiro número que
    aparece na tela ser o certo.
  */
  const isReady = analysesReady && plansReady && articlesReady;

  return (
    <div className="w-full space-y-12">
      <PageHeader
        overline="Centro de Inteligência"
        title="Transforme cada atendimento em conhecimento que move a equipe."
        description="Acompanhe o que foi descoberto, priorize o que precisa de revisão e mantenha a Base de Conhecimento em evolução contínua."
        icon={<ProductGraphic product={theme} className="h-10 w-12" />}
        actions={<Button size="lg" render={<Link href="/analysis" />} nativeButton={false}><Sparkles className="mr-2 h-4 w-4" />Nova análise</Button>}
      />

      {/*
        Fora do bloco de vazio: "meu trabalho" atravessa projetos, então ele
        tem o que mostrar mesmo quando o projeto ativo ainda não tem nada.
      */}
      <MyWork />

      {/*
        Depois de "meu trabalho" e separada dele: acompanhar não é assumir, e
        juntar as duas faria a fila de alguém crescer por interesse dos outros.
      */}
      <Watching />

      {!isReady ? (
        <MetricsSkeleton />
      ) : metrics.isEmpty ? (
        <BrandEmptyState title={`Sem dados para ${activeProject?.name ?? "o projeto ativo"}`} description="Este projeto ainda não possui análises, oportunidades, planos ou conteúdos de conhecimento." />
      ) : (
        <>
          <NextPriority analyses={metrics.analyses} />
          <AnalysisReadings metrics={metrics} />
          <ImprovementBacklog analyses={metrics.analyses} />
          <DashboardIndicators metrics={metrics} />
        </>
      )}
    </div>
  );
}
