import type { AIContext } from "@/models/AIContext";

interface RelatedArticlesPanelProps {
  context: AIContext;
}

export function RelatedArticlesPanel({
  context,
}: RelatedArticlesPanelProps) {
  const articles = context.relatedArticles ?? [];

  return (
    <section>
      <div className="mb-4">
        <h3 className="font-semibold">
          Artigos relacionados
        </h3>

        <p className="mt-1 text-sm text-muted-foreground">
          Conteúdo encontrado na Base de Conhecimento para auxiliar a análise.
        </p>
      </div>

      {articles.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhum artigo relacionado encontrado.
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map(
            ({ article, score, matchedTerms }) => (
              <article
                key={article.id}
                className="rounded-lg border p-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">
                    {article.title}
                  </h4>

                  <span className="text-xs font-semibold text-primary">
                    {(score * 100).toFixed(0)}%
                  </span>
                </div>

                <p className="mt-2 text-sm text-muted-foreground">
                  {article.summary}
                </p>

                {matchedTerms.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {matchedTerms.map((term) => (
                      <span
                        key={term}
                        className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            )
          )}
        </div>
      )}
    </section>
  );
}