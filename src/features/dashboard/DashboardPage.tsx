"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

import { ProductGraphic } from "@/components/brand/ProductGraphic";
import { PageHeader } from "@/components/common/page/PageHeader";
import { Button } from "@/components/ui/button";
import { useKnowledgeLifecycle } from "@/features/analysis/providers/KnowledgeLifecycleProvider";
import { useBrandTheme } from "@/providers/BrandThemeProvider";

import { AIInsights } from "./components/AIInsights";
import { DashboardIndicators } from "./components/DashboardIndicators";
import { ImprovementBacklog } from "./components/ImprovementBacklog";
import { NextPriority } from "./components/NextPriority";

export function DashboardPage() {
  const { analyses } = useKnowledgeLifecycle();
  const { theme } = useBrandTheme();

  return (
    <div className="w-full space-y-12">
      <PageHeader
        overline="Centro de Inteligência"
        title="Transforme cada atendimento em conhecimento que move a equipe."
        description="Acompanhe o que foi descoberto, priorize o que precisa de revisão e mantenha a Base de Conhecimento em evolução contínua."
        icon={<ProductGraphic product={theme} className="h-10 w-12" />}
        actions={
          <Button size="lg" render={<Link href="/analysis" />}>
            <Sparkles className="mr-2 h-4 w-4" />
            Nova análise
          </Button>
        }
      />

      <NextPriority analyses={analyses} />

      <AIInsights analyses={analyses} />

      <ImprovementBacklog analyses={analyses} />

      <DashboardIndicators analyses={analyses} />
    </div>
  );
}
