"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeftRight, ExternalLink, Sparkles } from "lucide-react";

import { ArticleContent } from "@/components/common/ArticleContent";
import { PageHeader } from "@/components/common/page/PageHeader";
import { Badge } from "@/components/ui/badge";
import { useTaxonomy } from "@/features/taxonomy/providers/TaxonomyProvider";
import { useQueryParam } from "@/hooks/useQueryParam";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import { sectionPath } from "@/models/Taxonomy";

import { compareArticles, compareFields } from "./compare/articleCompare";
import { useLibrary } from "./providers/LibraryProvider";

/**
 * Dois artigos, lado a lado.
 *
 * O Levantamento aponta o par que se sobrepõe; apontar não resolve. A pergunta
 * de quem vai decidir é sempre **o que este tem que aquele não tem?**, e
 * respondê-la relendo dois textos de doze mil caracteres é o trabalho manual
 * que este produto existe para acabar.
 *
 * A tela **não funde nada**. Ela mostra o que difere e o que se repete; unir,
 * arquivar ou deixar como está é decisão de quem revisa — e a edição acontece
 * no artigo, onde ela sempre aconteceu.
 */

function Coluna({
  article,
  exclusivos,
  rotulo,
}: {
  article: KnowledgeArticle;
  exclusivos: string[];
  rotulo: string;
}) {
  const { taxonomy } = useTaxonomy();

  return (
    <div className="min-w-0 space-y-4">
      <div className="rounded-xl border border-border/70 bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {rotulo}
            </p>
            <h2 className="mt-1 text-base font-semibold leading-snug">{article.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {sectionPath(taxonomy, article.sectionId) || "Sem seção"}
            </p>
          </div>

          <div className="flex shrink-0 gap-1">
            <Link
              href={`/library/${article.id}`}
              className="inline-flex h-8 items-center rounded-md border border-input px-3 text-xs font-medium transition-colors hover:bg-accent"
            >
              Abrir
            </Link>

            {article.url && (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Abrir no portal"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>

        {/*
          O que só este artigo traz. É a resposta calculada para a pergunta que
          importa — e o que precisa ser preservado se os dois virarem um só.
        */}
        <div className="mt-4 border-t border-border/60 pt-4">
          <p className="text-xs font-medium text-muted-foreground">Só aparece aqui</p>

          {exclusivos.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Nada que apareça duas vezes ou mais e não esteja no outro. Este artigo pode estar
              inteiramente contido no outro.
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {exclusivos.map((termo) => (
                <Badge key={termo} variant="secondary" className="font-normal">
                  {termo}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-h-[38rem] overflow-y-auto rounded-xl border border-border/70 bg-card p-5">
        <ArticleContent content={article.content} format={article.contentFormat} />
      </div>
    </div>
  );
}

export function ArticleCompareWorkspace() {
  const { items, isHydrated } = useLibrary();
  const { taxonomy } = useTaxonomy();

  const idA = useQueryParam("a");
  const idB = useQueryParam("b");

  const a = items.find((item) => item.id === idA);
  const b = items.find((item) => item.id === idB);

  const comparacao = useMemo(() => (a && b ? compareArticles(a, b) : null), [a, b]);

  const campos = useMemo(
    () =>
      a && b
        ? compareFields(a, b, (sectionId) => sectionPath(taxonomy, sectionId) || "sem seção")
        : [],
    [a, b, taxonomy]
  );

  if (!isHydrated) {
    return <p className="text-sm text-muted-foreground">Carregando o acervo...</p>;
  }

  if (!a || !b) {
    return (
      <div className="w-full space-y-4">
        <PageHeader
          overline="Base de conhecimento"
          title="Comparar artigos"
          description="Dois artigos, lado a lado, para decidir se cobrem a mesma coisa."
          icon={<ArrowLeftRight className="h-6 w-6" />}
        />

        <p className="rounded-xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
          {idA || idB
            ? "Um dos artigos não está mais no acervo. Ele pode ter ido para a lixeira."
            : "Escolha o par pelo Levantamento, que é quem aponta os artigos que se sobrepõem."}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      <PageHeader
        overline="Base de conhecimento"
        title="Comparar artigos"
        description={`Os dois compartilham ${Math.round(
          (comparacao?.score ?? 0) * 100
        )}% do vocabulário. O que está abaixo é calculado; unir, arquivar ou deixar como está é decisão sua.`}
        icon={<ArrowLeftRight className="h-6 w-6" />}
      />

      <div className="rounded-xl border border-border/70 bg-card">
        <div className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_minmax(0,1fr)] gap-x-4 border-b border-border/70 px-5 py-2.5 text-xs font-medium text-muted-foreground">
          <span>Atributo</span>
          <span className="truncate">{a.title}</span>
          <span className="truncate">{b.title}</span>
        </div>

        {campos.map((campo) => (
          <div
            key={campo.label}
            className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_minmax(0,1fr)] gap-x-4 border-b border-border/40 px-5 py-2.5 text-sm last:border-b-0"
          >
            <span className="text-muted-foreground">{campo.label}</span>

            {/*
              Só o que difere ganha destaque. Marcar tudo faria o olho procurar a
              diferença do mesmo jeito, que é o trabalho que a tela devia poupar.
            */}
            <span className={campo.same ? "text-muted-foreground" : "font-medium"}>
              {campo.a}
            </span>
            <span className={campo.same ? "text-muted-foreground" : "font-medium"}>
              {campo.b}
            </span>
          </div>
        ))}
      </div>

      {comparacao && comparacao.shared.length > 0 && (
        <div className="rounded-xl border border-border/70 bg-muted/20 p-5">
          <p className="text-xs font-medium text-muted-foreground">
            Assunto que os dois cobrem
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {comparacao.shared.map((termo) => (
              <Badge key={termo} variant="outline" className="font-normal">
                {termo}
              </Badge>
            ))}
          </div>

          <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            Isto é contagem de palavras, não veredito. Para saber se dizem a mesma coisa, abra um
            deles e pergunte à IA — ela lê o texto e responde a partir dele.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Coluna article={a} exclusivos={comparacao?.onlyA ?? []} rotulo="Primeiro" />
        <Coluna article={b} exclusivos={comparacao?.onlyB ?? []} rotulo="Segundo" />
      </div>
    </div>
  );
}
