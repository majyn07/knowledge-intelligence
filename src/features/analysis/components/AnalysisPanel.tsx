import type { Dispatch, SetStateAction } from "react";

import type { AIContext } from "@/models/AIContext";
import type { AnalysisResult } from "@/models/AnalysisResult";
import type { AnalysisMessage } from "@/models/AnalysisMessage";
import type { KnowledgeOpportunity } from "@/features/analysis/types/KnowledgeOpportunity";

import {
  ConfidenceLevelLabel,
  DocumentationStatusLabel,
} from "@/features/analysis/types/KnowledgeClassification";

import { MetricCard } from "@/components/common/cards/MetricCard";
import { PageSection } from "@/components/common/page/PageSection";

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
        <div className="flex min-h-96 items-center justify-center py-10">
          <div className="max-w-lg text-center">
            <h3 className="text-lg font-semibold tracking-tight">
              Nenhuma análise executada
            </h3>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Execute a análise para que a IA classifique o atendimento,
              encontre artigos relacionados, identifique oportunidades de
              melhoria e inicie uma conversa contextualizada.
            </p>
          </div>
        </div>
      </PageSection>
    );
  }

  return (
    <PageSection
      title="Resultado da análise"
      description="Revise o diagnóstico da IA antes de aprovar alterações na Base de Conhecimento."
    >
      <div className="space-y-10">
        <div className="grid gap-px overflow-hidden rounded-xl border border-border/70 bg-border/70 lg:grid-cols-3">
          <MetricCard
            label="Cobertura"
            value={
              DocumentationStatusLabel[
                analysisResult.classification.documentationStatus
              ]
            }
          />

          <MetricCard
            label="Confiança"
            value={`${analysisResult.confidence.toFixed(0)}%`}
            description={
              ConfidenceLevelLabel[
                analysisResult.classification.confidenceLevel
              ]
            }
          />

          <MetricCard
            label="Artigos relacionados"
            value={analysisResult.relatedArticles}
          />
        </div>

        <RelatedArticlesPanel context={context} />

        <section className="border-t border-border/70 pt-8">
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold tracking-tight">
              Oportunidades identificadas
            </h2>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Aprove apenas as recomendações que realmente agregam valor à
              Base de Conhecimento.
            </p>
          </div>

          {analysisResult.opportunities.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma oportunidade encontrada.
            </div>
          ) : (
            <div className="mt-6 divide-y divide-border/70">
              {analysisResult.opportunities.map((recommendation) => (
                <RecommendationCard
                  key={recommendation.id}
                  recommendation={recommendation}
                  onApprove={onApproveRecommendation}
                  onDiscard={onDiscardRecommendation}
                />
              ))}
            </div>
          )}
        </section>

        <AnalysisConversation
          context={context}
          messages={messages}
          setMessages={setMessages}
        />
      </div>
    </PageSection>
  );
}
