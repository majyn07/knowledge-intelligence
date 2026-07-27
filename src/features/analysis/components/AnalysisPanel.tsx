import type { Dispatch, SetStateAction } from "react";

import type { AIContext } from "@/models/AIContext";
import type { AnalysisResult } from "@/models/AnalysisResult";
import type { AnalysisMessage } from "@/models/AnalysisMessage";
import type { KnowledgeOpportunity } from "@/features/analysis/types/KnowledgeOpportunity";
import {
  ConfidenceLevelLabel,
  DocumentationStatusLabel,
} from "@/features/analysis/types/KnowledgeClassification";

import { RecommendationCard } from "./RecommendationCard";
import { RelatedArticlesPanel } from "./RelatedArticlesPanel";
import { AnalysisConversation } from "./chat/AnalysisConversation";

interface AnalysisPanelProps {
  analysisResult: AnalysisResult | null;
  messages: AnalysisMessage[];
  setMessages: Dispatch<SetStateAction<AnalysisMessage[]>>;
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
      <aside className="w-[520px] rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold">
          Análise do Atendimento
        </h2>

        <div className="mt-6 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Execute a análise para receber uma avaliação do atendimento,
          sugestões de melhoria para a Base de Conhecimento e iniciar uma
          conversa com a IA.
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-[520px] rounded-xl border bg-card">
      <div className="border-b p-6">
        <h2 className="text-lg font-semibold">
          Análise do Atendimento
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Revise o resultado da análise, avalie as sugestões geradas e
          continue a conversa com a IA sempre que necessário.
        </p>
      </div>

      <div className="space-y-6 p-6">
        <section className="rounded-lg border bg-muted/20 p-5">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Cobertura da documentação
              </p>

              <p className="mt-2 font-medium">
                {
                  DocumentationStatusLabel[
                    analysisResult.classification
                      .documentationStatus
                  ]
                }
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Confiança
              </p>

              <p className="mt-2 font-medium">
                {analysisResult.confidence.toFixed(0)}%
                {" • "}
                {
                  ConfidenceLevelLabel[
                    analysisResult.classification
                      .confidenceLevel
                  ]
                }
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Artigos encontrados
              </p>

              <p className="mt-2 font-medium">
                {analysisResult.relatedArticles}
              </p>
            </div>
          </div>
        </section>

        <RelatedArticlesPanel context={context} />

        <section>
          <div className="mb-4">
            <h3 className="font-semibold">
              Oportunidades identificadas
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              Revise cada oportunidade antes de decidir quais alterações
              serão incorporadas ao plano de melhoria.
            </p>
          </div>

          {analysisResult.opportunities.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nenhuma oportunidade foi identificada para este
              atendimento.
            </div>
          ) : (
            <div className="space-y-4">
              {analysisResult.opportunities.map(
                (recommendation) => (
                  <RecommendationCard
                    key={recommendation.id}
                    recommendation={recommendation}
                    onApprove={onApproveRecommendation}
                    onDiscard={onDiscardRecommendation}
                  />
                )
              )}
            </div>
          )}
        </section>

        <AnalysisConversation
          context={context}
          messages={messages}
          setMessages={setMessages}
        />
      </div>
    </aside>
  );
}