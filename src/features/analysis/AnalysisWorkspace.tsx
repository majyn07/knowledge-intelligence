export function AnalysisWorkspace() {
  return (
    <div className="flex h-full gap-6">

      {/* Coluna esquerda */}

      <aside className="w-80 rounded-xl border bg-card p-5">

        <h2 className="text-lg font-semibold">
          Análises
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Pesquisa, filtros e lista de atendimentos.
        </p>

      </aside>

      {/* Área central */}

      <main className="flex-1 rounded-xl border bg-card p-6">

        <h2 className="text-xl font-semibold">
          Atendimento
        </h2>

        <p className="mt-2 text-muted-foreground">
          A conversa selecionada será exibida aqui.
        </p>

      </main>

      {/* Painel direito */}

      <aside className="w-96 rounded-xl border bg-card p-5">

        <h2 className="text-lg font-semibold">
          Contexto
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Informações auxiliares da análise.
        </p>

      </aside>

    </div>
  );
}