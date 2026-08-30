"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpenCheck, CircleAlert, CircleCheck, CirclePlus, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { articleText } from "@/features/library/content/articleText";
import { findSimilarArticles } from "@/features/library/search/findSimilarArticles";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import {
  CANDIDATOS_NO_PEDIDO,
  MODELOS_NO_PEDIDO,
  type CoverageResult,
  type NivelDeCobertura,
} from "@/services/ai/library/coverage";

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

/** Quanto do artigo vai como amostra. O inteiro não cabe, e não precisa. */
const TRECHO = 1_200;

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
  const [resultado, setResultado] = useState<CoverageResult | null>(null);
  const [avaliando, setAvaliando] = useState(false);
  const [erro, setErro] = useState("");

  const publicados = articles.filter((artigo) => artigo.status === "published");
  const podeAvaliar = material.trim().length >= 40;

  async function avaliar() {
    setAvaliando(true);
    setErro("");
    setResultado(null);

    /*
      Os candidatos saem da busca léxica que já roda aqui: ela é barata e
      estreita o acervo de 1.822 para os poucos que valem uma leitura. O modelo
      julga; a busca só escolhe o que ele lê.
    */
    const candidatos = findSimilarArticles({
      articles: publicados,
      text: material,
      excludeId,
      limit: CANDIDATOS_NO_PEDIDO,
    })
      /*
        A busca devolve uma referência leve, sem o conteúdo. O trecho tem de
        sair do artigo inteiro, então ele é reencontrado aqui — sem isto o
        modelo julgaria cobertura lendo só título e resumo, que é o mesmo que a
        busca léxica já fazia.
      */
      .map(({ article }) => publicados.find((artigo) => artigo.id === article.id))
      .filter((artigo): artigo is KnowledgeArticle => artigo !== undefined)
      .map((artigo) => ({
        id: artigo.id,
        title: artigo.title,
        summary: artigo.summary,
        excerpt: articleText(artigo).slice(0, TRECHO),
      }));

    /*
      Os modelos são os artigos publicados da mesma seção. Sem seção escolhida
      não há modelo, e o prompt diz isso em vez de fingir que há.
    */
    const modelos = publicados
      .filter((artigo) => artigo.sectionId === sectionId && artigo.id !== excludeId)
      .slice(0, MODELOS_NO_PEDIDO)
      .map((artigo) => ({
        title: artigo.title,
        summary: artigo.summary,
        excerpt: articleText(artigo).slice(0, TRECHO),
      }));

    try {
      const resposta = await fetch("/api/library/coverage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ material: material.slice(0, 60_000), candidatos, modelos }),
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
