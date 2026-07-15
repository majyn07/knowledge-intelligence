import { plans } from "./mock/plans";

export function PlansWorkspace() {
  const plan = plans[0];

  return (
    <div className="space-y-6">

      <div>

        <h1 className="text-3xl font-semibold">
          Plano de Melhoria
        </h1>

        <p className="mt-2 text-muted-foreground">
          Consolidação das recomendações geradas durante as análises.
        </p>

      </div>

      <div className="rounded-xl border bg-card p-6">

        <div className="flex items-start justify-between">

          <div>

            <h2 className="text-xl font-semibold">
              {plan.title}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Projeto: {plan.projectId}
            </p>

          </div>

          <span className="rounded-md border px-3 py-1 text-xs">
            Gerado em {plan.generatedAt}
          </span>

        </div>

        <div className="mt-8 rounded-lg border border-dashed p-8 text-center">

          <p className="text-sm text-muted-foreground">
            Ainda não existem recomendações aprovadas para este projeto.
          </p>

          <p className="mt-2 text-sm text-muted-foreground">
            As recomendações geradas durante as análises serão consolidadas automaticamente neste plano.
          </p>

        </div>

      </div>

    </div>
  );
}