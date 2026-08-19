import { BrainCircuit, GitMerge } from "lucide-react";

import { BrandEmptyState } from "@/components/brand/BrandEmptyState";
import { PageSection } from "@/components/common/page/PageSection";
import { Card, CardContent } from "@/components/ui/card";
import type { ProjectMetrics } from "@/features/metrics/projectMetrics";

interface AnalysisReadingsProps {
  metrics: ProjectMetrics;
}

/**
 * Exibe apenas texto efetivamente produzido pela IA nas análises registradas,
 * sempre atribuído à sua origem. Contagens pertencem a "Indicadores do ciclo".
 */
export function AnalysisReadings({ metrics }: AnalysisReadingsProps) {
  const referenceAnalysis = metrics.analyses[0];
  const referenceOpportunity = metrics.opportunities.find(
    (opportunity) => opportunity.status !== "discarded"
  );

  if (!referenceAnalysis) {
    return (
      <PageSection title="Leitura das análises" description="Trechos gerados pela IA nas análises registradas neste projeto.">
        <BrandEmptyState title="Ainda não há leituras de análise" description="Quando um atendimento for analisado, a causa identificada e a justificativa das oportunidades aparecerão aqui." />
      </PageSection>
    );
  }

  const readings = [
    {
      icon: BrainCircuit,
      source: `Análise do atendimento #${referenceAnalysis.ticketId}`,
      title: referenceAnalysis.result.identification.title,
      description: referenceAnalysis.result.summary.rootCause,
    },
    referenceOpportunity && {
      icon: GitMerge,
      source: `Oportunidade em revisão · atendimento #${referenceOpportunity.ticketId}`,
      title: referenceOpportunity.title,
      description: referenceOpportunity.justification,
    },
  ].filter((reading) => Boolean(reading)) as {
    icon: typeof BrainCircuit;
    source: string;
    title: string;
    description: string;
  }[];

  return (
    <PageSection title="Leitura das análises" description="Trechos gerados pela IA nas análises registradas neste projeto, atribuídos à sua origem.">
      <div className="grid gap-4 lg:grid-cols-2">
        {readings.map(({ icon: Icon, source, title, description }) => (
          <Card key={source} className="border-border/70 bg-card shadow-none">
            <CardContent className="p-5">
              <Icon className="h-5 w-5 text-primary" />
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">{source}</p>
              <h3 className="mt-2 font-semibold leading-6 text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageSection>
  );
}
