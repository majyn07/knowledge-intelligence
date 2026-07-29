import {
  ArrowRight,
  Brain,
  FileText,
  HelpCircle,
  ShieldAlert,
} from "lucide-react";

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
  readOnly?: boolean;
}

function getIcon(type: KnowledgeOpportunity["type"]) {
  switch (type) {
    case "new_article":
    case "update_article":
      return <FileText className="h-4 w-4" />;

    case "faq":
      return <HelpCircle className="h-4 w-4" />;

    case "tip":
      return <Brain className="h-4 w-4" />;

    case "warning":
      return <ShieldAlert className="h-4 w-4" />;

    default:
      return <Brain className="h-4 w-4" />;
  }
}

export function RecommendationCard({
  recommendation,
  onApprove,
  onDiscard,
  readOnly = false,
}: RecommendationCardProps) {
  return (
    <article className="py-6 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {getIcon(recommendation.type)}
            </span>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {OpportunityTypeLabel[recommendation.type]}
                </p>
                <StatusBadge variant="info">
                  {OpportunityStatusLabel[recommendation.status]}
                </StatusBadge>
              </div>

              <h3 className="mt-2 text-base font-semibold tracking-tight">
                {recommendation.title}
              </h3>
            </div>
          </div>

          <div className="mt-5 space-y-5 text-sm leading-6">
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Descrição
              </p>
              <p>{recommendation.description}</p>
            </div>

            <div className="border-l border-primary/30 pl-4">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Justificativa da IA
              </p>
              <p className="text-muted-foreground">
                {recommendation.justification}
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 lg:pt-1">
          {!readOnly && <Button
            variant="ghost"
            onClick={() => onDiscard(recommendation)}
          >
            Descartar
          </Button>}

          {!readOnly && <Button onClick={() => onApprove(recommendation)}>
            Aprovar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>}
        </div>
      </div>
    </article>
  );
}
