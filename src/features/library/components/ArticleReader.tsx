"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Clock, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildArticleHtml } from "@/lib/articleHtml";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

import { articleText } from "../content/articleText";
import { MarkdownContent } from "@/components/common/MarkdownContent";

/**
 * O artigo, com o que se precisa para trabalhar dentro dele.
 *
 * Ler não é a única coisa que se faz com um artigo do portal: procura-se uma
 * frase, confere-se um trecho, salta-se para a seção citada. Num texto de vinte
 * mil caracteres, cada uma dessas coisas sem ferramenta vira rolagem, e quem
 * opera um acervo de mil e oitocentos faz isso o dia inteiro.
 */

/** Leitura em pé, sem pressa: é a média usada para texto técnico. */
const PALAVRAS_POR_MINUTO = 200;

interface ArticleReaderProps {
  article: KnowledgeArticle;
  /** Os outros artigos do acervo, para resolver as citações entre eles. */
  acervo: KnowledgeArticle[];
}

export function ArticleReader({ article, acervo }: ArticleReaderProps) {
  const [termo, setTermo] = useState("");
  const [ocorrencia, setOcorrencia] = useState(0);
  const corpoRef = useRef<HTMLDivElement>(null);

  /*
    Índice por identificador do portal, montado uma vez. Sem ele, cada link do
    corpo faria uma varredura no acervo inteiro, e um artigo com quarenta
    citações varreria mil e oitocentos registros quarenta vezes.
  */
  const porPortalId = useMemo(() => {
    const mapa = new Map<string, string>();

    for (const item of acervo) {
      if (item.portalArticleId) mapa.set(item.portalArticleId, item.id);
    }

    return mapa;
  }, [acervo]);

  const resolveInternalHref = useCallback(
    (portalArticleId: string) => {
      if (!portalArticleId) return null;

      const alvo = porPortalId.get(portalArticleId);

      // O próprio artigo não vira link para si mesmo.
      if (!alvo || alvo === article.id) return null;

      return `/library/${alvo}`;
    },
    [porPortalId, article.id]
  );

  const { html, matches } = useMemo(() => {
    if (article.contentFormat !== "html") return { html: "", matches: 0 };

    return buildArticleHtml(article.content, { resolveInternalHref, highlight: termo });
  }, [article.content, article.contentFormat, resolveInternalHref, termo]);

  const minutos = useMemo(() => {
    const palavras = articleText(article).split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(palavras / PALAVRAS_POR_MINUTO));
  }, [article]);

  // Termo novo recomeça a contagem: manter a posição antiga apontaria para nada.
  useEffect(() => setOcorrencia(0), [termo]);

  /*
    A ocorrência atual é destacada e trazida para a tela. O atributo é aplicado
    depois da montagem porque quem desenha o `<mark>` é o HTML injetado: o
    React não conhece esses nós.
  */
  useEffect(() => {
    const raiz = corpoRef.current;
    if (!raiz) return;

    const marcas = raiz.querySelectorAll<HTMLElement>("mark.article-hit");

    marcas.forEach((marca, indice) => {
      if (indice === ocorrencia) {
        marca.setAttribute("data-atual", "sim");
        marca.scrollIntoView({ block: "center", behavior: "smooth" });
      } else {
        marca.removeAttribute("data-atual");
      }
    });
  }, [ocorrencia, html]);

  function andar(passo: number) {
    if (matches === 0) return;
    setOcorrencia((atual) => (atual + passo + matches) % matches);
  }

  const buscando = termo.trim().length >= 2;

  return (
    <div className="min-w-0 rounded-xl border border-border/70 bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-2.5 sm:px-6">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={termo}
            onChange={(event) => setTermo(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              andar(event.shiftKey ? -1 : 1);
            }}
            placeholder="Procurar neste artigo"
            aria-label="Procurar neste artigo"
            className="h-8 pl-8 pr-8 text-sm"
          />

          {termo && (
            <button
              type="button"
              onClick={() => setTermo("")}
              aria-label="Limpar a busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {buscando && (
          <div className="flex items-center gap-1">
            <span className="tabular-nums text-xs text-muted-foreground">
              {matches === 0 ? "nada encontrado" : `${ocorrencia + 1} de ${matches}`}
            </span>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              disabled={matches === 0}
              onClick={() => andar(-1)}
              aria-label="Ocorrência anterior"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              disabled={matches === 0}
              onClick={() => andar(1)}
              aria-label="Próxima ocorrência"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        <span className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {minutos} min de leitura
        </span>
      </div>

      <div className="p-6 sm:p-8">
        {article.content.trim() ? (
          article.contentFormat === "html" ? (
            <div ref={corpoRef} className="article-html" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <MarkdownContent content={article.content} />
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            Este artigo ainda não tem conteúdo escrito. Edite para começar.
          </p>
        )}
      </div>
    </div>
  );
}
