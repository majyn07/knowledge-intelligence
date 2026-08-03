import { MessageSquareText, SearchCheck, Wrench } from "lucide-react";

import { PageSection } from "@/components/common/page/PageSection";
import type { AnalysisRecord } from "@/models/KnowledgeLifecycle";

interface AnalysisEvidenceProps {
  analysis: AnalysisRecord;
}

export function AnalysisEvidence({ analysis }: AnalysisEvidenceProps) {
  const { customerProblem, rootCause, supportAction } = analysis.result.summary;
  const evidence = [
    { label: "Problema relatado", value: customerProblem, icon: MessageSquareText },
    { label: "Causa identificada", value: rootCause, icon: SearchCheck },
    { label: "Ação do suporte", value: supportAction, icon: Wrench },
  ];

  return (
    <PageSection title="Evidências para a revisão" description="Use os sinais extraídos do atendimento para validar — ou questionar — as recomendações da IA.">
      <div className="grid gap-4 lg:grid-cols-3">
        {evidence.map(({ label, value, icon: Icon }) => (
          <article key={label} className="rounded-xl border border-border/70 bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Icon className="h-3.5 w-3.5 text-primary" />{label}</div>
            <p className="mt-3 text-sm leading-6 text-foreground">{value}</p>
          </article>
        ))}
      </div>
    </PageSection>
  );
}
