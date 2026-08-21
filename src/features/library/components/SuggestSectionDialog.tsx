"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/status/StatusBadge";
import { useTaxonomy } from "@/features/taxonomy/providers/TaxonomyProvider";
import { sectionPath } from "@/models/Taxonomy";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

import { useLibrary } from "../providers/LibraryProvider";
import { LibraryDialog } from "./LibraryDialog";

/** Quantos vão por pedido. O teto também está no schema do servidor. */
const LOTE = 25;

interface Sugestao {
  articleId: string;
  sectionId: string;
  confidence: "alta" | "media" | "baixa";
  reason: string;
}

const confiancaLabel: Record<Sugestao["confidence"], string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

/**
 * A IA propõe a seção; a revisão humana aprova.
 *
 * A importação por arquivo deixa muito artigo sem seção de propósito — o nome
 * que vem no arquivo raramente bate com o cadastro, e encaixar no mais parecido
 * seria classificação inventada. Isso resolve a origem e cria o problema
 * seguinte: alguém teria de classificar centenas à mão.
 *
 * Aqui nada é aplicado sozinho. Cada sugestão vem marcada, com a confiança que
 * o modelo declarou e o motivo em uma frase, e só entra no acervo quem foi
 * deixado marcado. Aplicar tudo em silêncio seria o produto classificando o
 * acervo e chamando de revisão.
 */
export function SuggestSectionDialog({
  open,
  onOpenChange,
  articles,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Os que estão sem seção, já filtrados pela tela. */
  articles: KnowledgeArticle[];
}) {
  const { taxonomy } = useTaxonomy();
  const { updateItem } = useLibrary();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sugestoes, setSugestoes] = useState<Sugestao[] | null>(null);
  const [aceitas, setAceitas] = useState<Set<string>>(new Set());

  const lote = articles.slice(0, LOTE);

  function reset() {
    setSugestoes(null);
    setAceitas(new Set());
    setError("");
  }

  async function pedir() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/library/suggest-section", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          articles: lote.map((article) => ({
            id: article.id,
            title: article.title,
            summary: article.summary.slice(0, 300),
            // O artigo inteiro não cabe no prompt, e não precisa: o assunto
            // aparece no começo.
            excerpt: article.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 500),
          })),
          sections: taxonomy.sections.map((section) => ({
            id: section.id,
            path: sectionPath(taxonomy, section.id),
          })),
        }),
      });

      const body: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof body === "object" && body !== null && "message" in body
            ? String((body as { message: unknown }).message)
            : "Não foi possível sugerir.";

        setError(message);
        return;
      }

      const lista =
        typeof body === "object" && body !== null && "suggestions" in body
          ? ((body as { suggestions: Sugestao[] }).suggestions ?? [])
          : [];

      setSugestoes(lista);
      // Vêm marcadas: quem abriu a tela pediu sugestão, e desmarcar o que não
      // serve é menos trabalho que marcar o que serve.
      setAceitas(new Set(lista.map((item) => item.articleId)));
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Não foi possível falar com o servidor."
      );
    } finally {
      setLoading(false);
    }
  }

  function aplicar() {
    if (!sugestoes) return;

    for (const sugestao of sugestoes) {
      if (!aceitas.has(sugestao.articleId)) continue;

      const article = articles.find((item) => item.id === sugestao.articleId);
      if (!article) continue;

      updateItem(article.id, {
        title: article.title,
        summary: article.summary,
        content: article.content,
        projectId: article.projectId,
        genreId: article.genreId,
        status: article.status,
        sectionId: sugestao.sectionId,
        tags: article.tags,
        keywords: article.keywords,
        author: article.author,
        url: article.url ?? "",
      });
    }

    reset();
    onOpenChange(false);
  }

  const titulo = (id: string) => articles.find((item) => item.id === id)?.title ?? id;

  return (
    <LibraryDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title="Sugerir seção para artigos sem classificação"
      description="A IA propõe, você aprova. Nada entra no acervo sem passar por aqui."
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {articles.length} artigo(s) sem seção neste projeto.
          {articles.length > LOTE && ` Os ${LOTE} primeiros vão neste pedido.`}
        </p>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        {sugestoes === null ? (
          <p className="text-sm text-muted-foreground">
            O título, o resumo e um trecho de cada artigo são enviados ao provedor de IA junto com
            a lista de seções do cadastro. O conteúdo completo não vai.
          </p>
        ) : sugestoes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma sugestão. O modelo não encontrou seção clara para estes artigos — o que é uma
            resposta legítima, e melhor que um palpite.
          </p>
        ) : (
          <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {sugestoes.map((sugestao) => (
              <li
                key={sugestao.articleId}
                className="flex items-start gap-3 rounded-lg border border-border/60 p-3"
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[var(--primary)]"
                  checked={aceitas.has(sugestao.articleId)}
                  aria-label={`Aplicar sugestão para ${titulo(sugestao.articleId)}`}
                  onChange={(event) =>
                    setAceitas((previous) => {
                      const next = new Set(previous);
                      if (event.target.checked) next.add(sugestao.articleId);
                      else next.delete(sugestao.articleId);
                      return next;
                    })
                  }
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{titulo(sugestao.articleId)}</p>

                  <p className="mt-0.5 truncate text-xs text-primary">
                    → {sectionPath(taxonomy, sugestao.sectionId)}
                  </p>

                  {sugestao.reason && (
                    <p className="mt-1 text-xs text-muted-foreground">{sugestao.reason}</p>
                  )}
                </div>

                <StatusBadge
                  variant={sugestao.confidence === "alta" ? "success" : "default"}
                >
                  {confiancaLabel[sugestao.confidence]}
                </StatusBadge>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-border/60 pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>

          {sugestoes === null ? (
            <Button onClick={() => void pedir()} disabled={loading || lote.length === 0}>
              <Sparkles className="mr-1.5 h-4 w-4" />
              {loading ? "Consultando…" : `Sugerir para ${lote.length}`}
            </Button>
          ) : (
            <Button onClick={aplicar} disabled={aceitas.size === 0}>
              Aplicar {aceitas.size} sugestão(ões)
            </Button>
          )}
        </div>
      </div>
    </LibraryDialog>
  );
}
