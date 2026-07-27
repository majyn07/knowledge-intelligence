import type { KnowledgeOpportunity } from "@/features/analysis/types/KnowledgeOpportunity";
import { OpportunityTypeLabel } from "@/features/analysis/types/KnowledgeOpportunity";

interface RecommendationCardProps {
  recommendation: KnowledgeOpportunity;
  onApprove: (
    recommendation: KnowledgeOpportunity
  ) => void;
  onDiscard: (
    recommendation: KnowledgeOpportunity
  ) => void;
}

export function RecommendationCard({
  recommendation,
  onApprove,
  onDiscard,
}: RecommendationCardProps) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="rounded-md bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {OpportunityTypeLabel[recommendation.type]}
        </span>

        <span className="text-xs text-muted-foreground">
          {recommendation.status}
        </span>
      </div>

      <div className="mt-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Oportunidade
        </p>

        <h3 className="mt-1 font-semibold">
          {recommendation.title}
        </h3>
      </div>

      <div className="mt-5 rounded-lg border bg-muted/30 p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Descrição
        </p>

        <p className="mt-2 text-sm leading-6">
          {recommendation.description}
        </p>
      </div>

      <div className="mt-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Justificativa
        </p>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {recommendation.justification}
        </p>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => onApprove(recommendation)}
          className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Aprovar
        </button>

        <button
          onClick={() => onDiscard(recommendation)}
          className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          Descartar
        </button>
      </div>
    </div>
  );
}