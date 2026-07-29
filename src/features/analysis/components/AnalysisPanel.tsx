import type { AnalysisMessage } from "@/models/AnalysisMessage";
import type { AIContext } from "@/models/AIContext";
import type { AnalysisRecord, OpportunityWorkflowStatus } from "@/models/KnowledgeLifecycle";
import { ConfidenceLevelLabel, DocumentationStatusLabel } from "@/features/analysis/types/KnowledgeClassification";
import { MetricCard } from "@/components/common/cards/MetricCard";
import { PageSection } from "@/components/common/page/PageSection";
import { RecommendationCard } from "./RecommendationCard";
import { RelatedArticlesPanel } from "./RelatedArticlesPanel";
import { AnalysisConversation } from "./chat/AnalysisConversation";

interface AnalysisPanelProps {
  analysisRecord?: AnalysisRecord;
  context: AIContext;
  onMessagesChange: (messages: AnalysisMessage[]) => void;
  onOpportunityStatusChange: (opportunityId: string, status: OpportunityWorkflowStatus) => void;
}

export function AnalysisPanel({ analysisRecord, context, onMessagesChange, onOpportunityStatusChange }: AnalysisPanelProps) {
  if (!analysisRecord) return <PageSection title="Análise da IA" description="Execute a análise para identificar oportunidades de melhoria na Base de Conhecimento."><div className="flex min-h-96 items-center justify-center py-10 text-center text-sm text-muted-foreground">Nenhuma análise em revisão para este atendimento.</div></PageSection>;
  const { result } = analysisRecord;
  return <PageSection title="Resultado da análise" description={analysisRecord.status === "completed" ? "Análise finalizada e incluída nos indicadores." : "Revise e decida sobre cada oportunidade antes de finalizar."}>
    <div className="space-y-8">
      <div className="grid gap-px overflow-hidden rounded-xl border border-border/70 bg-border/70 lg:grid-cols-3">
        <MetricCard label="Cobertura" value={DocumentationStatusLabel[result.classification.documentationStatus]} />
        <MetricCard label="Confiança" value={`${result.confidence.toFixed(0)}%`} description={ConfidenceLevelLabel[result.classification.confidenceLevel]} />
        <MetricCard label="Artigos relacionados" value={result.relatedArticles} />
      </div>
      <RelatedArticlesPanel context={context} />
      <section className="border-t border-border/70 pt-8"><h2 className="text-lg font-semibold tracking-tight">Oportunidades identificadas</h2><div className="mt-6 divide-y divide-border/70">{result.opportunities.map((recommendation) => <RecommendationCard key={recommendation.id} recommendation={recommendation} readOnly={analysisRecord.status === "completed"} onApprove={() => onOpportunityStatusChange(recommendation.id, "approved")} onDiscard={() => onOpportunityStatusChange(recommendation.id, "discarded")} />)}</div></section>
      <AnalysisConversation context={context} messages={analysisRecord.messages} setMessages={onMessagesChange} />
    </div>
  </PageSection>;
}
