import type { Recommendation } from "@/models/Recommendation";

interface RecommendationCardProps {
  recommendation: Recommendation;
  onApprove: (recommendation: Recommendation) => void;
  onDiscard: (recommendation: Recommendation) => void;
}

const actionLabels: Record<Recommendation["type"], string> = {
  create: "Criar artigo",
  update: "Atualizar artigo",
  review: "Revisar artigo",
  merge: "Mesclar artigos",
};

export function RecommendationCard({
  recommendation,
  onApprove,
  onDiscard,
}: RecommendationCardProps) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="rounded-md bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {actionLabels[recommendation.type]}
        </span>

        <span className="text-xs text-muted-foreground">
          {recommendation.solution}
        </span>
      </div>

      <div className="mt-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Artigo
        </p>

        <h3 className="mt-1 font-semibold">
          {recommendation.article}
        </h3>
      </div>

      {recommendation.section && (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Seção
          </p>

          <p className="mt-1 text-sm">
            {recommendation.section}
          </p>
        </div>
      )}

      <div className="mt-5 rounded-lg border bg-muted/30 p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Conteúdo sugerido
        </p>

        <p className="mt-2 text-sm leading-6">
          {recommendation.suggestedContent}
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