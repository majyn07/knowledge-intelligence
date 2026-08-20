"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, CircleAlert, CircleCheck } from "lucide-react";

import { PageSection } from "@/components/common/page/PageSection";
import { StatusBadge } from "@/components/common/status/StatusBadge";
import { Button } from "@/components/ui/button";
import { useTaxonomy } from "@/features/taxonomy/providers/TaxonomyProvider";

import { useLibrary } from "../providers/LibraryProvider";
import { buildCoverage, coverageSummary, unclassifiedCount } from "../sectionCoverage";

/**
 * O mapa de lacunas.
 *
 * A Biblioteca lista o que existe; esta tela responde o que **não** existe. Com
 * 146 seções espelhadas do portal, a diferença entre as duas perguntas é a
 * diferença entre um acervo e uma estratégia de conteúdo.
 *
 * Ela mostra a lacuna, não a meta: quantas seções deveriam estar cobertas é
 * decisão de quem conduz o trabalho, e o produto não inventa esse número.
 */
export function CoverageMap() {
  const { taxonomy } = useTaxonomy();
  const { items: articles } = useLibrary();

  const [expanded, setExpanded] = useState<string | null>(null);
  const [onlyGaps, setOnlyGaps] = useState(true);

  const coverage = useMemo(() => buildCoverage(taxonomy, articles), [articles, taxonomy]);
  const summary = useMemo(() => coverageSummary(coverage), [coverage]);
  const orphans = useMemo(() => unclassifiedCount(articles), [articles]);

  return (
    <PageSection
      title="Cobertura do portal"
      description="Quais seções do suporte.altoqi.com.br já têm artigo publicado nosso, e quais não têm nenhum."
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm">
            <strong className="tabular-nums">{summary.covered}</strong> de{" "}
            <strong className="tabular-nums">{summary.sections}</strong> seções de produto
            têm ao menos um artigo publicado.
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            {summary.gaps === 0
              ? "Nenhuma seção sem cobertura."
              : `${summary.gaps} seções ainda não têm nenhum. Rascunho e revisão não contam — a análise não os enxerga.`}
          </p>

          {orphans > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              <Link href="/library" className="underline underline-offset-2">
                {orphans} artigo(s) sem seção
              </Link>{" "}
              não cobrem nada até serem classificados.
            </p>
          )}

          <Button
            size="sm"
            variant="outline"
            className="mt-4"
            onClick={() => setOnlyGaps((current) => !current)}
          >
            {onlyGaps ? "Mostrar todas as seções" : "Mostrar só as lacunas"}
          </Button>
        </div>

        <ul className="flex flex-col gap-1.5">
          {coverage.map(({ category, sections, publishedTotal, gaps }) => {
            const open = expanded === category.id;
            const visible = onlyGaps ? sections.filter((item) => item.published === 0) : sections;

            return (
              <li key={category.id} className="rounded-lg border border-border/60">
                <div className="flex items-center gap-2 px-3 py-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-expanded={open}
                    aria-label={open ? `Recolher ${category.name}` : `Expandir ${category.name}`}
                    onClick={() => setExpanded(open ? null : category.id)}
                  >
                    {open ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>

                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {category.name}
                  </span>

                  <span className="shrink-0 text-xs text-muted-foreground">
                    {publishedTotal} publicados
                  </span>

                  <StatusBadge variant={gaps === 0 ? "success" : "warning"}>
                    {gaps === 0 ? "sem lacuna" : `${gaps} sem artigo`}
                  </StatusBadge>
                </div>

                {open && (
                  <div className="border-t border-border/60 px-3 py-3">
                    {visible.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {onlyGaps
                          ? "Todas as seções desta categoria têm artigo publicado."
                          : "Nenhuma seção cadastrada nesta categoria."}
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {visible.map(({ section, published, inProgress }) => (
                          <li
                            key={section.id}
                            className="flex items-center justify-between gap-3 rounded px-2 py-1.5 text-sm"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              {published > 0 ? (
                                <CircleCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                              ) : (
                                <CircleAlert
                                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                                  aria-hidden
                                />
                              )}

                              <span className="truncate">{section.name}</span>
                            </span>

                            <span className="shrink-0 text-xs text-muted-foreground">
                              {published > 0 && `${published} publicado(s)`}
                              {published > 0 && inProgress > 0 && " · "}
                              {inProgress > 0 && `${inProgress} em andamento`}
                              {published === 0 && inProgress === 0 && "sem artigo"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </PageSection>
  );
}
