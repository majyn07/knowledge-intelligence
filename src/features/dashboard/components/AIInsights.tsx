import { BrainCircuit, GitMerge, LibraryBig } from "lucide-react";

import { BrandEmptyState } from "@/components/brand/BrandEmptyState";
import { PageSection } from "@/components/common/page/PageSection";
import { Card, CardContent } from "@/components/ui/card";
import type { ProjectMetrics } from "@/features/metrics/projectMetrics";

interface AIInsightsProps {
  metrics: ProjectMetrics;
}

export function AIInsights({ metrics }: AIInsightsProps) {
  const referenceAnalysis = metrics.analyses[0];

  if (!referenceAnalysis) {
    return (
      <PageSection title="Insights da IA" description="Leituras derivadas das análises registradas neste projeto.">
        <BrandEmptyState title="Ainda não há insights derivados de análises" description="Quando um atendimento for analisado, os principais sinais e oportunidades aparecerão aqui." />
      </PageSection>
    );
  }

  const visibleOpportunities = metrics.opportunities.filter((opportunity) => opportunity.status !== "discarded");
  const insights = [
    {
      icon: BrainCircuit,
      title: `Cobertura identificada em “${referenceAnalysis.result.identification.title}”.`,
      description: referenceAnalysis.result.summary.rootCause,
    },
    {
      icon: GitMerge,
      title: `${metrics.opportunity.approved} oportunidade(s) aprovada(s) para evolução.`,
      description: visibleOpportunities[0]?.justification ?? "As oportunidades desta análise ainda aguardam uma decisão humana.",
    },
    {
      icon: LibraryBig,
      title: `${metrics.article.published} conteúdo(s) publicado(s) neste projeto.`,
      description: metrics.analysis.inReview > 0 ? `${metrics.analysis.inReview} análise(s) ainda aguardam revisão humana.` : "As análises concluídas podem originar novos planos e conteúdos.",
    },
  ];

  return (
    <PageSection title="Insights da IA" description="Leituras derivadas exclusivamente das análises registradas neste projeto.">
      <div className="grid gap-4 lg:grid-cols-3">
        {insights.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="border-border/70 bg-card shadow-none">
            <CardContent className="p-5">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-5 font-semibold leading-6 text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageSection>
  );
}
