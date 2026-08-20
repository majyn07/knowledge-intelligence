"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

import { BrandEmptyState } from "@/components/brand/BrandEmptyState";
import { ProductGraphic } from "@/components/brand/ProductGraphic";
import { PageHeader } from "@/components/common/page/PageHeader";
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

export function DashboardPage() {
  const { analyses } = useKnowledgeLifecycle();
  const { plans } = usePlans();
  const { items: articles } = useLibrary();
  const { theme } = useBrandTheme();
  const { activeProject, activeProjectId } = useProject();
  const metrics = selectProjectMetrics({ projectId: activeProjectId, analyses, plans, articles });

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

      {metrics.isEmpty ? (
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
