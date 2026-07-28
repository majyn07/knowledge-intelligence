import {
  ArrowRight,
  Brain,
  FileText,
  HelpCircle,
  ShieldAlert,
} from "lucide-react";

import { EntityCard } from "@/components/common/cards/EntityCard";
import { StatusBadge } from "@/components/common/status/StatusBadge";
import { Button } from "@/components/ui/button";

import type { KnowledgeOpportunity } from "@/features/analysis/types/KnowledgeOpportunity";
import {
  OpportunityStatusLabel,
  OpportunityTypeLabel,
} from "@/features/analysis/types/KnowledgeOpportunity";

interface RecommendationCardProps {
  recommendation: KnowledgeOpportunity;
  onApprove: (
    recommendation: KnowledgeOpportunity
  ) => void;
  onDiscard: (
    recommendation: KnowledgeOpportunity
  ) => void;
}

function getIcon(type: KnowledgeOpportunity["type"]) {
  switch (type) {
    case "new_article":
    case "update_article":
      return <FileText className="h-5 w-5" />;

    case "faq":
      return <HelpCircle className="h-5 w-5" />;

    case "tip":
      return <Brain className="h-5 w-5" />;

    case "warning":
      return <ShieldAlert className="h-5 w-5" />;

    default:
      return <Brain className="h-5 w-5" />;
  }
}

export function RecommendationCard({
  recommendation,
  onApprove,
  onDiscard,
}: RecommendationCardProps) {
  return (
    <EntityCard
      title={recommendation.title}
      description={
        OpportunityTypeLabel[
          recommendation.type
        ]
      }
      actions={
        <StatusBadge variant="info">
          {
            OpportunityStatusLabel[
              recommendation.status
            ]
          }
        </StatusBadge>
      }
      footer={
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() =>
              onDiscard(recommendation)
            }
          >
            Descartar
          </Button>

          <Button
            onClick={() =>
              onApprove(recommendation)
            }
          >
            Aprovar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-4 rounded-xl bg-primary/5 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {getIcon(recommendation.type)}
          </div>

          <div>
            <p className="text-sm font-semibold">
              Recomendação gerada pela IA
            </p>

            <p className="text-sm text-muted-foreground">
              A análise identificou uma oportunidade de evolução da Base de
              Conhecimento.
            </p>
          </div>
        </div>

        <section>
          <h4 className="mb-2 text-sm font-semibold">
            Descrição
          </h4>

          <p className="text-sm leading-7 text-muted-foreground">
            {recommendation.description}
          </p>
        </section>

        <section className="border-l-2 border-primary/30 pl-4">
          <h4 className="mb-2 text-sm font-semibold">
            Justificativa da IA
          </h4>

          <p className="text-sm leading-7 text-muted-foreground">
            {recommendation.justification}
          </p>
        </section>
      </div>
    </EntityCard>
  );
}
