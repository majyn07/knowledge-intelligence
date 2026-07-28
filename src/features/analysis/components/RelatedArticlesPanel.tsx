import {
  BookOpen,
  Search,
  Sparkles,
  Tag,
} from "lucide-react";

import { EntityCard } from "@/components/common/cards/EntityCard";
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
    <section className="space-y-5">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <BookOpen className="h-5 w-5" />
        </div>

        <div>
          <h3 className="text-lg font-semibold">
            Artigos relacionados
          </h3>

          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Conteúdo encontrado na Base de Conhecimento para
            apoiar a análise realizada pela IA.
          </p>
        </div>
      </div>

      {articles.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-14 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Search className="h-7 w-7" />
          </div>

          <h4 className="text-base font-semibold">
            Nenhum artigo relacionado encontrado
          </h4>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-muted-foreground">
            A Base de Conhecimento não possui conteúdo com
            relevância suficiente para este atendimento.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {articles.map(
            ({ article, score, matchedTerms }) => (
              <EntityCard
                key={article.id}
                icon={<BookOpen className="h-5 w-5" />}
                title={article.title}
                description={`Similaridade de ${(score * 100).toFixed(0)}% com o atendimento`}
                actions={
                  <StatusBadge variant="info">
                    <Sparkles className="mr-1 h-3 w-3" />
                    {(score * 100).toFixed(0)}%
                  </StatusBadge>
                }
              >
                <div className="space-y-5">
                  <p className="text-sm leading-7 text-muted-foreground">
                    {article.summary}
                  </p>

                  {matchedTerms.length > 0 && (
                    <section className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />

                        <span className="text-sm font-medium">
                          Termos encontrados
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {matchedTerms.map((term) => (
                          <StatusBadge
                            key={term}
                            variant="default"
                          >
                            {term}
                          </StatusBadge>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              </EntityCard>
            )
          )}
        </div>
      )}
    </section>
  );
}
