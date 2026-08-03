import { BrainCircuit, GitMerge, LibraryBig } from "lucide-react";

import { PageSection } from "@/components/common/page/PageSection";
import { Card, CardContent } from "@/components/ui/card";
import { mockAnalysisResult } from "@/features/analysis/mock/analysisResult";
import type { AnalysisRecord } from "@/models/KnowledgeLifecycle";

interface AIInsightsProps {
  analyses: AnalysisRecord[];
}

export function AIInsights({ analyses }: AIInsightsProps) {
  const pendingCount = analyses.filter((analysis) => analysis.status !== "completed").length;
  const opportunityCount = analyses.reduce(
    (total, analysis) => total + analysis.result.opportunities.filter((opportunity) => opportunity.status !== "discarded").length,
    0
  );
  const referenceAnalysis = analyses[0]?.result ?? mockAnalysisResult;
  const referenceOpportunities = referenceAnalysis.opportunities.filter(
    (opportunity) => opportunity.status !== "discarded"
  );

  const insights = [
    {
      icon: BrainCircuit,
      title: `A IA identificou cobertura parcial em “${referenceAnalysis.identification.title}”.`,
      description: referenceAnalysis.summary.rootCause,
    },
    {
      icon: GitMerge,
      title: opportunityCount > 1 ? `${opportunityCount} oportunidades podem ser tratadas em conjunto.` : `${referenceOpportunities.length} oportunidades pedem uma decisão de priorização.`,
      description: referenceOpportunities[0]?.justification ?? "Priorize a atualização de conteúdos existentes quando a solução já estiver parcialmente documentada.",
    },
    {
      icon: LibraryBig,
      title: pendingCount > 0 ? `${pendingCount} análise${pendingCount > 1 ? "s aguardam" : " aguarda"} decisão humana.` : "A próxima análise pode revelar novos padrões de recorrência.",
      description: pendingCount > 0 ? "A revisão humana transforma o diagnóstico da IA em uma melhoria concreta para a Base de Conhecimento." : "Selecione um atendimento recente para transformar conhecimento tácito do suporte em orientação reutilizável.",
    },
  ];

  return (
    <PageSection
      title="Insights da IA"
      description="Recomendações que ajudam a equipe a decidir onde concentrar o próximo esforço."
    >
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
