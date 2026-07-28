import { BookOpen, Search, Sparkles, Tag } from "lucide-react";

import { StatusBadge } from "@/components/common/status/StatusBadge";

import type { AIContext } from "@/models/AIContext";

interface RelatedArticlesPanelProps {
  context: AIContext;
}

export function RelatedArticlesPanel({
  context,
}: RelatedArticlesPanelProps) {
  const articles = context.relatedArticles ?? [];

  return (
    <section className="border-t border-border/70 pt-8">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BookOpen className="h-4 w-4" />
        </span>

        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">
            Artigos relacionados
          </h2>

          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Conteúdo encontrado na Base de Conhecimento para auxiliar a
            análise realizada pela IA.
          </p>
        </div>
      </div>

      {articles.length === 0 ? (
        <div className="py-12 text-center">
          <Search className="mx-auto h-5 w-5 text-muted-foreground" />
          <h3 className="mt-3 text-sm font-medium">
            Nenhum artigo relacionado encontrado
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            A Base de Conhecimento não possui conteúdo com relevância
            suficiente para este atendimento.
          </p>
        </div>
      ) : (
        <div className="mt-6 divide-y divide-border/70">
          {articles.map(({ article, score, matchedTerms }) => (
            <article key={article.id} className="py-5 first:pt-0 last:pb-0">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5" />
                    Base de Conhecimento
                  </div>

                  <h3 className="mt-2 font-medium tracking-tight">
                    {article.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {article.summary}
                  </p>
                </div>

                <StatusBadge variant="info">
                  <Sparkles className="mr-1 h-3 w-3" />
                  {(score * 100).toFixed(0)}%
                </StatusBadge>
              </div>

              {matchedTerms.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  {matchedTerms.map((term) => (
                    <StatusBadge key={term} variant="default">
                      {term}
                    </StatusBadge>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
