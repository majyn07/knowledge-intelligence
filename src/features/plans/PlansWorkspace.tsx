"use client";

import { plansService } from "./services/plansService";
import { usePlans } from "./providers/PlansProvider";

export function PlansWorkspace() {
  const {
    improvementPlan,
    setImprovementPlan,
  } = usePlans();

  function handleRemoveRecommendation(
    recommendationId: string
  ) {
    setImprovementPlan((current) =>
      plansService.removeRecommendation(
        current,
        recommendationId
      )
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">
          Plano de Melhoria
        </h1>

        <p className="mt-2 text-muted-foreground">
          Consolidação das recomendações aprovadas durante as análises.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              {improvementPlan.title}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Projeto: {improvementPlan.projectId}
            </p>
          </div>

          <div className="text-right">
            <span className="rounded-md border px-3 py-1 text-xs">
              Gerado em {improvementPlan.generatedAt}
            </span>

            <p className="mt-3 text-sm text-muted-foreground">
              {improvementPlan.recommendations.length} recomendação
              {improvementPlan.recommendations.length !== 1
                ? "ões"
                : ""}
            </p>
          </div>
        </div>

        {improvementPlan.recommendations.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Ainda não existem recomendações aprovadas para este projeto.
            </p>

            <p className="mt-2 text-sm text-muted-foreground">
              As recomendações aprovadas durante as análises serão
              consolidadas automaticamente neste plano.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {improvementPlan.recommendations.map(
              (recommendation) => (
                <div
                  key={recommendation.id}
                  className="rounded-lg border p-5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">
                        {recommendation.title}
                      </h3>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Tipo: {recommendation.type}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
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

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() =>
                        handleRemoveRecommendation(
                          recommendation.id
                        )
                      }
                      className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      Remover do plano
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}