"use client";

import { useRef, useState } from "react";
import { AlertTriangle, CirclePlus, Loader2, RefreshCw, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { articleText } from "@/features/library/content/articleText";
import { guardarRascunho } from "@/features/library/draftHandoff";
import { useLibrary } from "@/features/library/providers/LibraryProvider";
import { montarPedidoDeCobertura } from "@/features/library/search/coverageRequest";
import { contar } from "@/lib/plural";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { SupportConversation } from "@/models/SupportConversation";
import type { Ticket } from "@/models/Ticket";
import type { CoverageResult, NivelDeCobertura } from "@/services/ai/library/coverage";
import {
  ARTIGO_NO_PEDIDO,
  MATERIAL_NO_PEDIDO,
  type UpdatedArticle,
} from "@/services/ai/library/updateArticle";

import { materialDoGrupo } from "../groupMaterial";

/**
 * Avaliar atendimentos escolhidos à mão contra o acervo, um a um.
 *
 * O caso que pediu isto: alguém do suporte tem cinco casos recentes e precisa
 * criar artigo a partir deles. A fila de triagem agrupa sozinha e não deixa
 * escolher; o formulário avalia um texto que a pessoa cola. Faltava o meio:
 * "estes cinco aqui — o acervo já cobre? crio ou atualizo?".
 *
 * **Um pedido por atendimento, e não os cinco juntos.** Cinco casos são cinco
 * assuntos; num pedido só o modelo os avaliaria como um tema, e a resposta
 * seria sobre nenhum deles. Em série, com pausa, como a varredura de
 * sobreposição — e pelo mesmo motivo: pedidos grandes em sequência estouram o
 * limite do provedor.
 *
 * O resultado é uma lista, e cada linha tem o botão certo: criar (quando não
 * existe) ou atualizar aquele artigo (quando existe em parte). O artigo abre
 * numa **aba nova**, para a lista continuar aqui enquanto a pessoa trabalha o
 * primeiro; com cinco, fechar a lista a cada um seria refazer a seleção cinco
 * vezes.
 */

const APARENCIA: Record<NivelDeCobertura, { rotulo: string; classe: string }> = {
  coberta: { rotulo: "Já coberto", classe: "border-emerald-500/40 bg-emerald-500/10" },
  parcial: { rotulo: "Coberto em parte", classe: "border-amber-500/40 bg-amber-500/10" },
  ausente: { rotulo: "Não existe", classe: "border-primary/40 bg-primary/5" },
};

/** Pausa entre um atendimento e o seguinte. Necessidade, não educação: ver a varredura de sobreposição. */
const PAUSA_MS = 4_000;

const esperar = (ms: number) => new Promise((resolva) => setTimeout(resolva, ms));

interface Avaliado {
  ticket: Ticket;
  material: string;
  resultado: CoverageResult;
}

export function BatchCoverageDialog({
  tickets,
  conversas,
  aberto,
  aoFechar,
}: {
  tickets: Ticket[];
  conversas: readonly SupportConversation[];
  aberto: boolean;
  aoFechar: () => void;
}) {
  const { items: articles } = useLibrary();

  const [avaliados, setAvaliados] = useState<Avaliado[]>([]);
  const [progresso, setProgresso] = useState<{ feitos: number; total: number } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState<string | null>(null);
  const parar = useRef(false);

  function fechar() {
    parar.current = true;
    aoFechar();
  }

  /** O material de um atendimento só: um grupo de um, para reusar a montagem da fila. */
  function materialDe(ticket: Ticket): string {
    return materialDoGrupo(
      { id: ticket.id, subject: ticket.title, tickets: [ticket], terms: [], coverage: 0, score: 0 },
      conversas
    ).material;
  }

  async function avaliarUm(ticket: Ticket): Promise<Avaliado> {
    const material = materialDe(ticket);
    const pedido = montarPedidoDeCobertura({ articles, material, sectionId: "" });

    const resposta = await fetch("/api/library/coverage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pedido),
    });

    const dados: { resultado?: CoverageResult | null; message?: string } = await resposta.json();

    if (!resposta.ok || !dados.resultado) {
      throw new Error(dados.message ?? "Não foi possível avaliar o atendimento.");
    }

    return { ticket, material, resultado: dados.resultado };
  }

  async function avaliar() {
    parar.current = false;
    setErro(null);
    setAvaliados([]);
    setProgresso({ feitos: 0, total: tickets.length });

    const acumulados: Avaliado[] = [];

    for (let i = 0; i < tickets.length; i += 1) {
      if (parar.current) break;
      if (i > 0) await esperar(PAUSA_MS);
      if (parar.current) break;

      try {
        acumulados.push(await avaliarUm(tickets[i]));
      } catch (falha) {
        /* O que já veio não se perde: a tela guarda e diz onde parou. */
        setErro(
          `${falha instanceof Error ? falha.message : "Falha ao avaliar"}, parou no atendimento ${
            i + 1
          } de ${tickets.length}.`
        );
        break;
      }

      setAvaliados([...acumulados]);
      setProgresso({ feitos: i + 1, total: tickets.length });
    }

    setProgresso(null);
  }

  /** Criar artigo novo com o rascunho que a avaliação já escreveu. */
  function criar(item: Avaliado) {
    if (!item.resultado.rascunho) return;

    guardarRascunho({
      ...item.resultado.rascunho,
      origem: `atendimento "${item.ticket.title}"`,
    });

    window.open("/library", "_blank");
  }

  /** Atualizar o artigo existente com o material deste atendimento. */
  async function atualizar(item: Avaliado, alvo: KnowledgeArticle) {
    setAtualizando(`${item.ticket.id}:${alvo.id}`);
    setErro(null);

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
          material: item.material.slice(0, MATERIAL_NO_PEDIDO),
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
        origem: `atendimento "${item.ticket.title}"`,
        articleId: alvo.id,
        contentFormat: alvo.contentFormat,
        mudancas: dados.updated.mudancas,
      });

      window.open("/library", "_blank");
    } catch {
      setErro("Não foi possível falar com o servidor.");
    } finally {
      setAtualizando(null);
    }
  }

  const rodando = progresso !== null;

  return (
    <Dialog open={aberto} onOpenChange={(estado) => !estado && fechar()}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>O acervo já cobre estes atendimentos?</DialogTitle>
          <DialogDescription>
            A IA lê cada atendimento — o que o cliente relatou e como o suporte resolveu — e
            diz se já existe artigo, se existe em parte, ou se falta. Depois você cria ou
            atualiza, um a um. Nada é publicado sem passar por você.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!rodando && avaliados.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {contar(tickets.length, "atendimento")} — um pedido por atendimento, em série.
              Leva cerca de {contar(Math.max(1, Math.round((tickets.length * 34) / 60)), "minuto")}.
            </p>
          )}

          {rodando && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Lendo o atendimento {progresso.feitos + 1} de {progresso.total}
            </p>
          )}

          {erro && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              {erro}
            </p>
          )}

          <div className="space-y-3">
            {avaliados.map((item) => {
              const aparencia = APARENCIA[item.resultado.cobertura];

              return (
                <div
                  key={item.ticket.id}
                  className={`rounded-lg border p-4 ${aparencia.classe}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="font-medium">
                      {aparencia.rotulo}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Proposta da IA</span>
                  </div>

                  <p className="mt-2 text-sm font-medium">{item.ticket.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {item.resultado.motivo}
                  </p>

                  {item.resultado.artigos.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {item.resultado.artigos.map((artigo) => {
                        const encontrado = articles.find((a) => a.id === artigo.id);
                        if (!encontrado) return null;
                        const chave = `${item.ticket.id}:${encontrado.id}`;

                        return (
                          <li key={artigo.id} className="text-sm">
                            <span className="font-medium">{encontrado.title}</span>
                            {artigo.falta && (
                              <p className="text-xs leading-5 text-muted-foreground">
                                Falta: {artigo.falta}
                              </p>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="mt-1.5 h-7 text-xs"
                              disabled={atualizando !== null}
                              onClick={() => atualizar(item, encontrado)}
                            >
                              {atualizando === chave ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                              )}
                              Atualizar este artigo
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {item.resultado.rascunho && (
                    <Button
                      type="button"
                      size="sm"
                      className="mt-3"
                      onClick={() => criar(item)}
                    >
                      <CirclePlus className="mr-1.5 h-4 w-4" />
                      Criar artigo novo com o rascunho
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          {rodando ? (
            <Button variant="outline" onClick={() => (parar.current = true)}>
              Parar após este
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={fechar}>
                Fechar
              </Button>
              {avaliados.length === 0 && (
                <Button onClick={avaliar} disabled={tickets.length === 0}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Avaliar {contar(tickets.length, "atendimento")}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
