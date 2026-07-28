import type { Dispatch, SetStateAction } from "react";

import type { AIContext } from "@/models/AIContext";
import type { AnalysisResult } from "@/models/AnalysisResult";
import type { AnalysisMessage } from "@/models/AnalysisMessage";
import type { KnowledgeOpportunity } from "@/features/analysis/types/KnowledgeOpportunity";

import {
  ConfidenceLevelLabel,
  DocumentationStatusLabel,
} from "@/features/analysis/types/KnowledgeClassification";

import { PageSection } from "@/components/common/page/PageSection";
import { MetricCard } from "@/components/common/cards/MetricCard";

import { RecommendationCard } from "./RecommendationCard";
import { RelatedArticlesPanel } from "./RelatedArticlesPanel";
import { AnalysisConversation } from "./chat/AnalysisConversation";

interface AnalysisPanelProps {
  analysisResult: AnalysisResult | null;
  messages: AnalysisMessage[];
  setMessages: Dispatch<
    SetStateAction<AnalysisMessage[]>
  >;
  context: AIContext;
  onApproveRecommendation: (
    recommendation: KnowledgeOpportunity
  ) => void;
  onDiscardRecommendation: (
    recommendation: KnowledgeOpportunity
  ) => void;
}

export function AnalysisPanel({
  analysisResult,
  messages,
  setMessages,
  context,
  onApproveRecommendation,
  onDiscardRecommendation,
}: AnalysisPanelProps) {
  if (!analysisResult) {
    return (
      <PageSection
        title="Análise da IA"
        description="Execute a análise para identificar oportunidades de melhoria na Base de Conhecimento."
      >
        <div className="flex items-center justify-center py-20">
          <div className="max-w-xl text-center">
            <h3 className="text-lg font-medium">
              Nenhuma análise executada
            </h3>

            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Quando a análise for executada, a IA exibirá a
              classificação do atendimento, artigos relacionados,
              oportunidades de melhoria e abrirá uma conversa
              contextualizada.
            </p>
          </div>
        </div>
      </PageSection>
    );
  }

  return (
    <PageSection
      title="Resultado da análise"
      description="Revise o diagnóstico antes de aprovar alterações na Base de Conhecimento."
    >
      <div className="space-y-10">
        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard
            label="Cobertura"
            value={
              DocumentationStatusLabel[
                analysisResult.classification
                  .documentationStatus
              ]
            }
          />

          <MetricCard
            label="Confiança"
            value={`${analysisResult.confidence.toFixed(
              0
            )}%`}
            description={
              ConfidenceLevelLabel[
                analysisResult.classification
                  .confidenceLevel
              ]
            }
          />

          <MetricCard
            label="Artigos relacionados"
            value={analysisResult.relatedArticles}
          />
        </div>

        <RelatedArticlesPanel context={context} />

        <PageSection
          title="Oportunidades identificadas"
          description="Aprove somente as recomendações que fazem sentido para a evolução da Base de Conhecimento."
        >
          {analysisResult.opportunities.length === 0 ? (
            <div className="rounded-xl border border-dashed py-10 text-center text-muted-foreground">
              Nenhuma oportunidade encontrada.
            </div>
          ) : (
            <div className="space-y-5">
              {analysisResult.opportunities.map(
                (recommendation) => (
                  <RecommendationCard
                    key={recommendation.id}
                    recommendation={recommendation}
                    onApprove={
                      onApproveRecommendation
                    }
                    onDiscard={
                      onDiscardRecommendation
                    }
                  />
                )
              )}
            </div>
          )}
        </PageSection>

        <AnalysisConversation
          context={context}
          messages={messages}
          setMessages={setMessages}
        />
      </div>
    </PageSection>
  );
}
