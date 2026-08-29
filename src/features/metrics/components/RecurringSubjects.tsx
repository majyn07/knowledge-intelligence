"use client";

import Link from "next/link";
import { useMemo } from "react";

import { PageSection } from "@/components/common/page/PageSection";
import { useKnowledgeLifecycle } from "@/features/analysis/providers/KnowledgeLifecycleProvider";
import { triageTickets } from "@/features/analysis/triage";
import { useLibrary } from "@/features/library/providers/LibraryProvider";
import type { Ticket } from "@/models/Ticket";

import { SupportClassification } from "./SupportClassification";

/** Quantos assuntos a tela mostra. Leitura de relance, não relatório. */
const NA_LISTA = 5;

/**
 * O que muitos clientes perguntam e o acervo responde mal.
 *
 * É a mesma conta da fila de triagem, apresentada para outra pessoa. Lá ela diz
 * "leia este primeiro"; aqui ela diz "é isto que está chegando, e o acervo
 * cobre tanto por cento" — que é a frase que se leva para uma reunião.
 *
 * Fica marcada como **calculada** porque é: vocabulário em comum não é a mesma
 * dúvida. Concluir isso exige ler, e ler é o que a análise faz depois.
 */
export function RecurringSubjects({ tickets }: { tickets: Ticket[] }) {
  const { items: articles, isHydrated } = useLibrary();
  const { analyses } = useKnowledgeLifecycle();

  const triagem = useMemo(
    () =>
      triageTickets(
        tickets,
        articles,
        new Set(analyses.map((analysis) => analysis.ticketId))
      ),
    [analyses, articles, tickets]
  );

  /*
    Os que mais chegam, e não os de maior sinal. A fila de triagem ordena por
    `quantos × (1 - cobertura)`, que é a ordem de quem vai trabalhar. Aqui a
    pergunta é outra: "o que mais chega", e responder isso com uma ordem que
    mistura volume e cobertura faria o número da tela discordar da lista.
  */
  const assuntos = useMemo(
    () =>
      [...triagem.groups]
        .sort((a, b) => b.tickets.length - a.tickets.length || a.coverage - b.coverage)
        .slice(0, NA_LISTA),
    [triagem.groups]
  );

  return (
    <PageSection
      title="Assuntos que mais chegam"
      description="Duas leituras da mesma fila: a classificação que o suporte fez na HubSpot, e o agrupamento que o produto calcula para medir o que o acervo cobre."
    >
      {/*
        A classificação declarada vem primeiro, e é deliberado: ela foi decidida
        por alguém com o caso em mãos, enquanto o agrupamento abaixo é medida de
        semelhança. Quando as duas discordam, a de cima é a que se leva para uma
        reunião.
      */}
      <SupportClassification tickets={tickets} />

      <div className="mt-6">
        <h3 className="text-sm font-semibold">O que o acervo ainda não cobre</h3>
        <p className="mt-0.5 mb-3 text-xs leading-5 text-muted-foreground">
          Atendimentos resolvidos que ainda não viraram conhecimento, agrupados pelas palavras que
          dividem. Calculado dos dados: palavra em comum não é a mesma dúvida, e quem confirma é a
          análise.
        </p>

      {!isHydrated ? (
        <div className="h-28 animate-pulse rounded-xl bg-muted/40" />
      ) : triagem.excedeuTeto ? (
        <p className="rounded-xl border border-dashed px-5 py-8 text-center text-sm leading-6 text-muted-foreground">
          São atendimentos demais para comparar aos pares nesta carga. O número fica de fora, e isso
          está dito aqui em vez de sair pela metade com cara de completo.
        </p>
      ) : assuntos.length === 0 ? (
        <p className="rounded-xl border border-dashed px-5 py-8 text-center text-sm leading-6 text-muted-foreground">
          Nada esperando. Todo atendimento resolvido já foi lido ou virou artigo.
        </p>
      ) : (
        <ul className="divide-y divide-border/60 rounded-xl border border-border/70">
          {assuntos.map((grupo) => (
            <li key={grupo.id}>
              <Link
                href={`/analysis?ticket=${grupo.tickets[0].id}`}
                className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-3 transition-colors hover:bg-muted/40"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{grupo.subject}</span>

                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {grupo.terms.slice(0, 5).join(", ")}
                  </span>
                </span>

                <span className="shrink-0 text-right">
                  <span className="block text-sm font-semibold tabular-nums">
                    {grupo.tickets.length}
                  </span>
                  <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">
                    {grupo.tickets.length === 1 ? "atendimento" : "atendimentos"}
                  </span>
                </span>

                <span className="w-24 shrink-0 text-right">
                  <span
                    className={`block text-sm font-semibold tabular-nums ${
                      grupo.coverage < 0.5 ? "text-primary" : ""
                    }`}
                  >
                    {Math.round(grupo.coverage * 100)}%
                  </span>
                  <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">
                    coberto
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      </div>
    </PageSection>
  );
}
