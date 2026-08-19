import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

import { PageSection } from "@/components/common/page/PageSection";
import { StatusBadge } from "@/components/common/status/StatusBadge";
import type { KnowledgeSearchResult } from "@/models/KnowledgeSearchResult";

interface RelatedArticlesProps {
  results: KnowledgeSearchResult[];
}

export function RelatedArticles({ results }: RelatedArticlesProps) {
  if (results.length === 0) {
    return null;
  }

  return (
    <PageSection
      title="Artigos relacionados"
      description="Conteúdo publicado que trata de temas próximos a este."
    >
      <ul className="divide-y divide-border/70 rounded-xl border border-border/70 bg-card">
        {results.map(({ article, score, matchedTerms }) => (
          <li key={article.id}>
            <Link
              href={`/library/${article.id}`}
              className="group flex items-start justify-between gap-4 p-4 transition-colors hover:bg-muted/25"
            >
              <span className="flex min-w-0 gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BookOpen className="h-3.5 w-3.5" />
                </span>

                <span className="min-w-0">
                  <span className="block text-sm font-medium group-hover:underline">
                    {article.title}
                  </span>

                  <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                    {article.summary}
                  </span>

                  {matchedTerms.length > 0 && (
                    <span className="mt-2 block text-xs text-muted-foreground">
                      Em comum: {matchedTerms.join(", ")}
                    </span>
                  )}
                </span>
              </span>

              <span className="flex shrink-0 items-center gap-2">
                <StatusBadge variant="info">{(score * 100).toFixed(0)}%</StatusBadge>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </PageSection>
  );
}
