"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpenCheck,
  CircleAlert,
  CircleCheck,
  CirclePlus,
  Loader2,
  RefreshCw,
  Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { articleText } from "@/features/library/content/articleText";
import { guardarRascunho } from "@/features/library/draftHandoff";
import {
  MATERIAL_MINIMO,
  montarPedidoDeCobertura,
} from "@/features/library/search/coverageRequest";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { CoverageResult, NivelDeCobertura } from "@/services/ai/library/coverage";
import {
  ARTIGO_NO_PEDIDO,
  MATERIAL_NO_PEDIDO,
  type UpdatedArticle,
} from "@/services/ai/library/updateArticle";

/**
 * "O acervo já responde isto?", antes de escrever.
 *
 * O aviso de duplicata que já existia é **léxico**: ele diz que cinco artigos
 * têm palavras parecidas e o quanto. Palavra em comum não é a mesma dúvida — o
 * produto repete isso em todo lugar onde calcula semelhança, e aqui a
 * consequência é alguém escrever de novo o que já está escrito, ou desistir de
 * escrever por causa de um artigo que trata de outra coisa.
 *
 * Esta avaliação lê os candidatos e responde a pergunta de verdade, e quando o
 * assunto não está coberto ela já devolve o rascunho **na forma dos artigos da
 * seção**. Escrever do zero produz um artigo que não se parece com os outros
 * 1.822, e quem revisa gasta o tempo reformatando em vez de conferindo.
 *
 * Nada é aplicado sozinho: aplicar é um clique separado, e a comparação com o
 * que já está no formulário fica visível antes.
 */

const APARENCIA: Record<
  NivelDeCobertura,
  { rotulo: string; classe: string; Icone: typeof CircleCheck }
> = {
  coberta: {
    rotulo: "O acervo já responde",
    classe: "border-emerald-500 bg-emerald-500/5",
    Icone: CircleCheck,
  },
  parcial: {
    rotulo: "Responde em parte",
    classe: "border-amber-500 bg-amber-500/5",
    Icone: CircleAlert,
  },
  ausente: {
    rotulo: "O acervo não cobre isto",
    classe: "border-primary bg-primary/5",
    Icone: CirclePlus,
  },
};

interface CoveragePanelProps {
  articles: KnowledgeArticle[];
  /** O que a pessoa já escreveu ou colou. É o material a avaliar. */
  material: string;
  /** Onde o artigo vai morar. Define os modelos de forma. */
  sectionId: string;
  /** Não se compara um artigo consigo mesmo. */
  excludeId?: string;
  onApply: (rascunho: { title: string; summary: string; content: string }) => void;
}

export function CoveragePanel({
  articles,
  material,
  sectionId,
  excludeId,
  onApply,
}: CoveragePanelProps) {
  const router = useRouter();
  const [resultado, setResultado] = useState<CoverageResult | null>(null);
  const [avaliando, setAvaliando] = useState(false);
  const [erro, setErro] = useState("");
  /* Qual artigo está sendo atualizado agora. Um por vez: cada um é um pedido. */
  const [atualizando, setAtualizando] = useState<string | null>(null);

  /**
   * Atualizar um artigo existente com o material.
   *
   * É a outra metade da avaliação. "Parcial" dizia o que falta no artigo e
   * parava: o rascunho era de um artigo novo, e quem queria atualizar o
   * existente ia lá e inseria à mão. Aqui o modelo devolve o artigo inteiro já
   * atualizado, e ele abre no editor daquele artigo — a pessoa revisa a lista
   * do que mudou e decide se salva. O publicado continua no ar até lá.
   */
  async function atualizar(alvo: KnowledgeArticle) {
    setAtualizando(alvo.id);
    setErro("");

    const inteiro = alvo.contentFormat === "html" ? alvo.content : articleText(alvo);

    try {
      const resposta = await fetch("/api/library/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article: {
            id: alvo.id,
            title: alvo.title,
            summary: alvo.summary,
            content: inteiro.slice(0, ARTIGO_NO_PEDIDO),
            contentFormat: alvo.contentFormat,
            truncated: inteiro.length > ARTIGO_NO_PEDIDO,
          },
          material: material.slice(0, MATERIAL_NO_PEDIDO),
        }),
      });

      const dados: { updated?: UpdatedArticle; message?: string } = await resposta.json();

      if (!resposta.ok || !dados.updated) {
        setErro(dados.message ?? "Não foi possível atualizar o artigo.");
        return;
      }

      guardarRascunho({
        title: dados.updated.title,
        summary: dados.updated.summary,
        content: dados.updated.content,
        origem: `atualização de "${alvo.title}"`,
        articleId: alvo.id,
        contentFormat: alvo.contentFormat,
        mudancas: dados.updated.mudancas,
      });

      router.push("/library");
    } catch {
      setErro("Não foi possível falar com o servidor.");
    } finally {
      setAtualizando(null);
    }
  }

  const podeAvaliar = material.trim().length >= MATERIAL_MINIMO;

  async function avaliar() {
    setAvaliando(true);
    setErro("");
    setResultado(null);

    const pedido = montarPedidoDeCobertura({ articles, material, sectionId, excludeId });

    try {
      const resposta = await fetch("/api/library/coverage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pedido),
      });

      const corpo: unknown = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        setErro((corpo as { message?: string })?.message ?? "Não foi possível avaliar.");

        return;
      }

      setResultado((corpo as { resultado: CoverageResult }).resultado);
    } catch {
      setErro("Sem conexão com o servidor.");
    } finally {
      setAvaliando(false);
    }
  }

  const aparencia = resultado ? APARENCIA[resultado.cobertura] : null;

  return (
    <section className="rounded-xl border border-border/70 bg-card/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpenCheck className="h-4 w-4 text-muted-foreground" aria-hidden />

          <div>
            <h3 className="text-sm font-semibold">O acervo já responde isto?</h3>

            <p className="text-xs leading-5 text-muted-foreground">
              A IA lê os artigos publicados mais próximos e diz se vale escrever. Quando não
              houver cobertura, ela propõe o rascunho na forma dos artigos da seção.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!podeAvaliar || avaliando}
          /* Um botão que não pode ser clicado diz por quê, e não fica mudo. */
          title={podeAvaliar ? undefined : "Escreva ou cole o material primeiro."}
          onClick={() => void avaliar()}
        >
          <Wand2 className="h-4 w-4" aria-hidden />
          {avaliando ? "Avaliando…" : "Avaliar no acervo"}
        </Button>
      </div>

      {erro !== "" && (
        <p className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {erro}
        </p>
      )}

      {resultado && aparencia && (
        <div className={`mt-3 rounded-lg border-l-2 p-4 ${aparencia.classe}`}>
          <p className="flex items-center gap-2 text-sm font-medium">
            <aparencia.Icone className="h-4 w-4" aria-hidden />
            {aparencia.rotulo}
          </p>

          <p className="mt-1 text-xs leading-5 text-muted-foreground">{resultado.motivo}</p>

          {resultado.artigos.length > 0 && (
            <ul className="mt-3 space-y-2">
              {resultado.artigos.map((artigo) => {
                const encontrado = articles.find((item) => item.id === artigo.id);

                return (
                  <li key={artigo.id} className="text-sm">
                    <Link
                      href={`/library/${artigo.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {encontrado?.title ?? artigo.id}
                    </Link>

                    {artigo.jaCobre && (
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                        Já cobre: {artigo.jaCobre}
                      </p>
                    )}

                    {/*
                      O que falta é a decisão de verdade: atualizar aquele
                      artigo costuma valer mais que escrever outro, e o produto
                      inteiro prefere atualizar.
                    */}
                    {artigo.falta && (
                      <p className="mt-0.5 text-xs leading-5">
                        <span className="font-medium">Falta:</span> {artigo.falta}
                      </p>
                    )}

                    {/*
                      Só para artigo que existe aqui e não é o que está sendo
                      editado: atualizar um artigo consigo mesmo não faz sentido.
                    */}
                    {encontrado && encontrado.id !== excludeId && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-1.5 h-7 text-xs"
                        disabled={atualizando !== null}
                        onClick={() => atualizar(encontrado)}
                      >
                        {atualizando === encontrado.id ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Atualizar este artigo com o material
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {resultado.rascunho && (
            <div className="mt-4 rounded-lg border border-border/70 bg-background/60 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Rascunho proposto
              </p>

              <p className="mt-1.5 text-sm font-medium">{resultado.rascunho.title}</p>

              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {resultado.rascunho.summary}
              </p>

              <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap rounded bg-muted/40 p-2 text-[11px] leading-5">
                {resultado.rascunho.content}
              </pre>

              {/*
                Aplicar é um clique separado, e cobre o que já estiver escrito:
                a tela diz isso antes, porque preencher campo vazio é ganho e
                cobrir texto de alguém é decisão.
              */}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => resultado.rascunho && onApply(resultado.rascunho)}
                >
                  Usar este rascunho
                </Button>

                <span className="text-[11px] text-muted-foreground">
                  Substitui título, resumo e conteúdo do formulário.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
