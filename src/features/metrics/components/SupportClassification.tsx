"use client";

import Link from "next/link";
import { useMemo } from "react";

import { ListSkeleton } from "@/components/common/page/LoadingSkeleton";
import { useTickets } from "@/features/analysis/providers/TicketsProvider";
import type { Ticket } from "@/models/Ticket";
import {
  TICKET_CLASSIFICATIONS,
  type TicketClassificationSpec,
} from "@/models/TicketClassification";

import { tallyClassification, type ClassificationTally } from "../supportClassification";

/** Quantas linhas por lista. Leitura de relance, não relatório. */
const NA_LISTA = 5;

const PIPELINE_LABEL: Record<TicketClassificationSpec["pipeline"], string> = {
  suporte: "Pipeline de Suporte",
  setup: "Pipeline de Setup",
};

/**
 * O que mais chega, pelo vocabulário de quem atendeu.
 *
 * Uma lista por campo, agrupadas por pipeline, e elas não se somam: o de Setup
 * pergunta a causa raiz e chama o motivo de "sintoma", o de Suporte tem só a
 * categoria. Um chamado passa por um dos dois, então cada lista cobre uma parte
 * do acervo — somá-las misturaria dois vocabulários sem que quem lê tivesse
 * como saber.
 *
 * Ao lado do agrupamento calculado, e não no lugar dele: este conta o que
 * **alguém decidiu** com o caso em mãos, aquele mede o que o acervo cobre.
 */
export function SupportClassification({ tickets }: { tickets: Ticket[] }) {
  const { isHydrated } = useTickets();

  const listas = useMemo(
    () =>
      TICKET_CLASSIFICATIONS.map((spec) => ({
        spec,
        tally: tallyClassification(tickets, spec.key, NA_LISTA),
      })),
    [tickets]
  );

  const comDado = listas.filter((item) => item.tally.classificados > 0);

  /*
    Esqueleto enquanto o dado não chegou. Sem isto a tela abre dizendo "nenhum
    dos 0 atendimentos traz a classificação", que é uma frase verdadeira sobre
    uma coleção vazia apresentada como se fosse o acervo — e some um segundo
    depois. Piscar conteúdo falso é pior que dizer "ainda não sei".
  */
  if (!isHydrated) return <ListSkeleton count={2} />;

  /*
    Nenhuma preenchida é o estado de hoje, e sete caixas idênticas dizendo o
    mesmo seriam sete vezes a mesma frase. Uma só, com o caminho junto: quem lê
    precisa saber o que fazer a respeito, não só que está vazio.
  */
  if (comDado.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-5 py-8 text-center text-sm leading-6 text-muted-foreground">
        Nenhum dos {tickets.length} atendimentos traz a classificação do suporte. Ela é preenchida
        na HubSpot, nos pipelines de Suporte e de Setup, e entra por{" "}
        <Link href="/analysis" className="underline underline-offset-2">
          importação do relatório
        </Link>
        .
      </p>
    );
  }

  const porPipeline = (["suporte", "setup"] as const)
    .map((pipeline) => ({
      pipeline,
      itens: comDado.filter((item) => item.spec.pipeline === pipeline),
    }))
    .filter((grupo) => grupo.itens.length > 0);

  return (
    <div className="space-y-5">
      {porPipeline.map((grupo) => (
        <section key={grupo.pipeline}>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {PIPELINE_LABEL[grupo.pipeline]}
          </h4>

          <div className="grid gap-4 md:grid-cols-2">
            {grupo.itens.map((item) => (
              <Lista key={item.spec.key} spec={item.spec} tally={item.tally} />
            ))}
          </div>
        </section>
      ))}

      {/*
        O que ainda não veio fica dito, e não some da tela: uma lista ausente é
        indistinguível de uma lista que ninguém preencheu, e as duas pedem
        providências diferentes.
      */}
      {comDado.length < listas.length ? (
        <p className="text-xs leading-5 text-muted-foreground">
          Sem dado ainda:{" "}
          {listas
            .filter((item) => item.tally.classificados === 0)
            .map((item) => item.spec.label)
            .join(", ")}
          .
        </p>
      ) : null}
    </div>
  );
}

function Lista({
  spec,
  tally,
}: {
  spec: TicketClassificationSpec;
  tally: ClassificationTally;
}) {
  return (
    <section className="rounded-xl border border-border/70">
      <header className="border-b border-border/60 px-4 py-3">
        <h3 className="text-sm font-semibold">{spec.label}</h3>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{spec.pergunta}</p>
      </header>

      <ul className="divide-y divide-border/60">
        {tally.itens.map((item) => (
          <li key={item.label} className="flex items-center gap-x-4 px-4 py-2.5">
            <span className="min-w-0 flex-1 truncate text-sm" title={item.label}>
              {item.label}
            </span>

            <span className="shrink-0 text-sm font-semibold tabular-nums">{item.quantos}</span>

            <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {Math.round(item.fatia * 100)}%
            </span>
          </li>
        ))}
      </ul>

      {/*
        A ressalva vai junto do número, como no painel: fatia calculada sobre os
        classificados, com parte do acervo fora da conta, é número parcial
        apresentado como completo se ninguém disser.
      */}
      <p className="border-t border-border/60 px-4 py-2 text-[11px] leading-4 text-muted-foreground">
        {tally.distintos > tally.itens.length ? `${tally.distintos} valores ao todo. ` : ""}
        Fatia sobre os {tally.classificados} classificados
        {tally.semClassificacao > 0
          ? `; ${tally.semClassificacao} sem esta classificação ficam de fora.`
          : "."}
      </p>
    </section>
  );
}
