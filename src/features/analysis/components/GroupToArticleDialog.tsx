"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CoveragePanel } from "@/features/library/components/CoveragePanel";
import { guardarRascunho } from "@/features/library/draftHandoff";
import { useLibrary } from "@/features/library/providers/LibraryProvider";
import { contar } from "@/lib/plural";
import type { SupportConversation } from "@/models/SupportConversation";

import { materialDoGrupo } from "../groupMaterial";
import type { TriageGroup } from "../triage";

/**
 * Um grupo da fila virando artigo.
 *
 * Era a última perna manual do ciclo: a triagem agrupava, a IA priorizava, e
 * entre "estes 24 atendimentos" e um artigo escrito havia alguém relendo 24
 * conversas. O que faltava não era inteligência, era a ligação — a avaliação de
 * cobertura já sabia responder "o acervo já cobre isto?" e escrever o rascunho
 * na forma do acervo, só nunca tinha sido apontada para a fila.
 *
 * **A primeira pergunta continua sendo se já existe.** Ela é a mesma que
 * originou o produto, e aqui ela importa mais que no formulário: um assunto que
 * chegou 24 vezes parece novo justamente porque ninguém achou o artigo. "O
 * acervo já responde" é uma resposta valiosa — significa que o problema é de
 * busca, e não de conteúdo.
 */
export function GroupToArticleDialog({
  grupo,
  conversas,
  aberto,
  aoFechar,
}: {
  grupo: TriageGroup | null;
  conversas: readonly SupportConversation[];
  aberto: boolean;
  aoFechar: () => void;
}) {
  const router = useRouter();
  const { items: articles } = useLibrary();
  const [entregando, setEntregando] = useState(false);

  const preparado = useMemo(
    () => (grupo ? materialDoGrupo(grupo, conversas) : null),
    [grupo, conversas]
  );

  if (!grupo || !preparado) return null;

  return (
    <Dialog open={aberto} onOpenChange={(estado) => !estado && aoFechar()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Este assunto já está no acervo?</DialogTitle>
          <DialogDescription>
            {contar(grupo.tickets.length, "atendimento")} sobre &ldquo;{grupo.subject}&rdquo;. A
            IA lê o que os clientes relataram e o que o suporte respondeu, e diz se o acervo já
            cobre. Quando não cobre, ela escreve o rascunho na forma dos artigos da seção.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/*
            O que vai ao modelo fica visível antes do clique. É a mesma regra do
            plano de importação: quem manda um texto ao provedor precisa poder
            ver qual texto é, e aqui ele foi montado pelo produto, não digitado.
          */}
          <details className="rounded-lg border border-border/70">
            <summary className="cursor-pointer px-4 py-2.5 text-sm text-muted-foreground">
              O material que vai à IA
              {preparado.usados < preparado.total &&
                ` — ${contar(preparado.usados, "atendimento")} mais recentes, de ${preparado.total}`}
            </summary>

            <pre className="max-h-64 overflow-auto whitespace-pre-wrap border-t border-border/70 px-4 py-3 text-xs leading-5 text-muted-foreground">
              {preparado.material}
            </pre>
          </details>

          <CoveragePanel
            articles={articles}
            material={preparado.material}
            /*
              Sem seção: o assunto vem da fila, e ninguém escolheu onde ele mora
              ainda. Chutar uma aqui seria a classificação inventada que o
              produto evita — quem escreve decide no formulário.
            */
            sectionId=""
            onApply={(rascunho) => {
              setEntregando(true);

              guardarRascunho({
                ...rascunho,
                origem: `${contar(grupo.tickets.length, "atendimento")} sobre "${grupo.subject}"`,
              });

              router.push("/library");
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar} disabled={entregando}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
