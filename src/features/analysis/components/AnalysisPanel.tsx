type AnalysisResult = {
  classification: "strong" | "partial" | "none";
  relatedArticles: number;
  updates: number;
};

interface AnalysisPanelProps {
  analysisResult: AnalysisResult | null;
}

export function AnalysisPanel({
  analysisResult,
}: AnalysisPanelProps) {
  return (
    <aside className="w-96 rounded-xl border bg-card p-5">

      <h2 className="text-lg font-semibold">
        Resultado da Análise
      </h2>

      {!analysisResult && (

        <div className="mt-6 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">

          Nenhuma análise disponível para este atendimento.

          <br />
          <br />

          Selecione <strong>"Analisar Atendimento"</strong> para iniciar uma nova análise.

        </div>

      )}

      {analysisResult && (

        <div className="mt-6 space-y-5 rounded-lg border p-5">

          <div>

            <p className="text-sm font-medium">
              Status
            </p>

            <p className="text-sm text-green-600">
              ✔ Concluída
            </p>

          </div>

          <div>

            <p className="text-sm font-medium">
              Classificação
            </p>

            <p className="text-sm">
              🟡 Atende parcialmente
            </p>

          </div>

          <div>

            <p className="text-sm font-medium">
              Artigos relacionados
            </p>

            <p className="text-sm">
              {analysisResult.relatedArticles}
            </p>

          </div>

          <div>

            <p className="text-sm font-medium">
              Recomendações
            </p>

            <p className="text-sm">
              {analysisResult.updates} atualização sugerida
            </p>

          </div>

        </div>

      )}

    </aside>
  );
}