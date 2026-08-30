"use client";

import { useRef, useState } from "react";
import { articleText } from "../content/articleText";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/status/StatusBadge";
import { useTaxonomy } from "@/features/taxonomy/providers/TaxonomyProvider";
import { sectionPath } from "@/models/Taxonomy";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

import { useLibrary } from "../providers/LibraryProvider";
import { LibraryDialog } from "./LibraryDialog";

/**
 * Quantos vão por pedido. O teto também está no schema do servidor.
 *
 * Era 25, e 25 fica **na borda do prazo**: varrendo os 56 sem seção do acervo
 * real, o primeiro lote de 25 voltou e o segundo estourou os 90 segundos. Na
 * borda a falha não é excepcional, é uma questão de qual lote calha de ser mais
 * pesado — e quem paga é a varredura inteira, que para no meio.
 *
 * Dez custa mais pedidos e dá margem: cada um gera menos texto, e o lote que
 * falha leva dez pela frente em vez de vinte e cinco.
 */
const LOTE = 10;

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
 * A importação por arquivo deixa muito artigo sem seção de propósito: o nome
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
  const { classifyMany } = useLibrary();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sugestoes, setSugestoes] = useState<Sugestao[] | null>(null);
  const [aceitas, setAceitas] = useState<Set<string>>(new Set());
  const [progresso, setProgresso] = useState({ feitos: 0, total: 0 });

  /*
    Parar no meio precisa ser possível: com seiscentos artigos são vinte e
    quatro pedidos, e quem começou pode mudar de ideia no terceiro. A `ref` é
    lida dentro do laço, onde o estado do render não chegaria.
  */
  const parar = useRef(false);

  const lotes = Math.ceil(articles.length / LOTE);

  function reset() {
    setSugestoes(null);
    setAceitas(new Set());
    setError("");
    setProgresso({ feitos: 0, total: 0 });
    parar.current = false;
  }

  /** Um lote pelo servidor. Erro sobe para quem chamou decidir se continua. */
  async function pedirLote(bloco: KnowledgeArticle[]): Promise<Sugestao[]> {
    const response = await fetch("/api/library/suggest-section", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        articles: bloco.map((article) => ({
          id: article.id,
          title: article.title,
          summary: article.summary.slice(0, 300),
          // O artigo inteiro não cabe no prompt, e não precisa: o assunto
          // aparece no começo.
          excerpt: articleText(article).slice(0, 500),
        })),
        sections: taxonomy.sections.map((section) => ({
          id: section.id,
          path: sectionPath(taxonomy, section.id),
        })),
      }),
    });

    const body: unknown = await response.json();

    if (!response.ok) {
      throw new Error(
        typeof body === "object" && body !== null && "message" in body
          ? String((body as { message: unknown }).message)
          : "Não foi possível sugerir."
      );
    }

    return typeof body === "object" && body !== null && "suggestions" in body
      ? ((body as { suggestions: Sugestao[] }).suggestions ?? [])
      : [];
  }

  /**
   * Varre o acervo inteiro, um lote por vez.
   *
   * Em série, e não em paralelo: vinte e quatro pedidos simultâneos são o
   * caminho mais curto para o limite de taxa do provedor, e o progresso
   * honesto vale mais que o ganho de tempo.
   *
   * **Lote que falha não derruba o que já veio.** Depois de vinte pedidos bem
   * sucedidos, perder tudo porque o vigésimo primeiro esbarrou na cota seria
   * jogar fora trabalho que já está pronto para revisão: a tela guarda o que
   * tem e diz onde parou.
   */
  async function pedir() {
    setLoading(true);
    setError("");
    parar.current = false;

    const acumuladas: Sugestao[] = [];
    setProgresso({ feitos: 0, total: lotes });

    for (let i = 0; i < lotes; i += 1) {
      if (parar.current) break;

      try {
        const bloco = articles.slice(i * LOTE, (i + 1) * LOTE);
        acumuladas.push(...(await pedirLote(bloco)));
      } catch (failure) {
        setError(
          `${failure instanceof Error ? failure.message : "Falha ao consultar"}, parou no lote ${
            i + 1
          } de ${lotes}. As ${acumuladas.length} sugestões já recebidas continuam abaixo.`
        );
        break;
      }

      setProgresso({ feitos: i + 1, total: lotes });
      setSugestoes([...acumuladas]);
      // Vêm marcadas: quem abriu a tela pediu sugestão, e desmarcar o que não
      // serve é menos trabalho que marcar o que serve.
      setAceitas(new Set(acumuladas.map((item) => item.articleId)));
    }

    setSugestoes([...acumuladas]);
    setAceitas(new Set(acumuladas.map((item) => item.articleId)));
    setLoading(false);
  }

  /*
    Uma escrita, um evento, um aviso. Aplicar uma a uma custaria um aviso e uma
    ida ao servidor por artigo, com seiscentos, seiscentos de cada.
  */
  function aplicar() {
    if (!sugestoes) return;

    classifyMany(
      sugestoes
        .filter((sugestao) => aceitas.has(sugestao.articleId))
        .map((sugestao) => ({ id: sugestao.articleId, sectionId: sugestao.sectionId }))
    );

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
          {/*
            Concorda em número, como o diálogo de exclusão: frase escrita para
            um caso e usada noutro faz quem lê rápido desconfiar da tela inteira.
          */}
          {articles.length} {articles.length === 1 ? "artigo" : "artigos"} sem seção no acervo
          {lotes > 1 && `, em ${lotes} lotes de até ${LOTE}`}.
        </p>

        {loading && progresso.total > 0 && (
          <div>
            <p className="text-sm">
              Consultando {progresso.feitos} de {progresso.total} lotes
              {sugestoes && sugestoes.length > 0 && ` · ${sugestoes.length} sugestões até agora`}
            </p>

            {/*
              Barra sem animação: ela mede pedidos concluídos, e um movimento
              contínuo insinuaria um progresso que ninguém está medindo.
            */}
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary"
                style={{ width: `${Math.round((progresso.feitos / progresso.total) * 100)}%` }}
              />
            </div>
          </div>
        )}

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
            Nenhuma sugestão. O modelo não encontrou seção clara para estes artigos: o que é uma
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

          {loading ? (
            <Button variant="outline" onClick={() => (parar.current = true)}>
              Parar após este lote
            </Button>
          ) : sugestoes === null ? (
            <Button onClick={() => void pedir()} disabled={articles.length === 0}>
              <Sparkles className="mr-1.5 h-4 w-4" />
              Sugerir para {articles.length}
            </Button>
          ) : (
            <Button onClick={aplicar} disabled={aceitas.size === 0}>
              Aplicar {aceitas.size} {aceitas.size === 1 ? "sugestão" : "sugestões"}
            </Button>
          )}
        </div>
      </div>
    </LibraryDialog>
  );
}
