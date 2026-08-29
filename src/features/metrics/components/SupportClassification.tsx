"use client";

import Link from "next/link";
import { useMemo } from "react";

import type { Ticket } from "@/models/Ticket";

import { tallyClassification, type ClassificationTally } from "../supportClassification";

/** Quantas linhas por lista. Leitura de relance, não relatório. */
const NA_LISTA = 5;

/**
 * O que mais chega, pelo vocabulário de quem atendeu.
 *
 * Duas listas e não uma, que foi o pedido: causa responde "por que aconteceu",
 * motivo de contato responde "por que ele nos procurou". Um defeito de
 * instalação chega como dúvida de uso, e um ranking que soma as duas tem
 * metade das linhas respondendo outra pergunta.
 *
 * Ao lado do agrupamento calculado, e não no lugar dele: este conta o que
 * **alguém decidiu** com o caso em mãos, aquele mede o que o acervo cobre.
 */
export function SupportClassification({ tickets }: { tickets: Ticket[] }) {
  const causa = useMemo(() => tallyClassification(tickets, "causa", NA_LISTA), [tickets]);

  const motivo = useMemo(
    () => tallyClassification(tickets, "motivoDeContato", NA_LISTA),
    [tickets]
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Lista
        titulo="Motivo de contato"
        descricao="Por que o cliente procurou o suporte."
        tally={motivo}
      />

      <Lista
        titulo="Causa"
        descricao="Por que o problema aconteceu."
        tally={causa}
      />
    </div>
  );
}

function Lista({
  titulo,
  descricao,
  tally,
}: {
  titulo: string;
  descricao: string;
  tally: ClassificationTally;
}) {
  return (
    <section className="rounded-xl border border-border/70">
      <header className="border-b border-border/60 px-4 py-3">
        <h3 className="text-sm font-semibold">{titulo}</h3>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{descricao}</p>
      </header>

      {tally.classificados === 0 ? (
        /*
          Estado vazio honesto, e ele explica a causa em vez de dizer só "nada
          aqui": a classificação vive em propriedade do ticket na HubSpot, o
          escopo `tickets` não está na credencial, e a porta é o relatório
          exportado. Quem lê precisa saber o que fazer a respeito.
        */
        <p className="px-4 py-6 text-center text-sm leading-6 text-muted-foreground">
          Nenhum dos {tally.total} atendimentos traz esta classificação. Ela é preenchida na
          HubSpot e entra por{" "}
          <Link href="/analysis" className="underline underline-offset-2">
            importação do relatório
          </Link>
          .
        </p>
      ) : (
        <>
          <ul className="divide-y divide-border/60">
            {tally.itens.map((item) => (
              <li
                key={item.label}
                className="flex items-center gap-x-4 px-4 py-2.5"
              >
                <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>

                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {item.quantos}
                </span>

                <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {Math.round(item.fatia * 100)}%
                </span>
              </li>
            ))}
          </ul>

          {/*
            A ressalva vai junto do número, como no painel: fatia calculada
            sobre os classificados, com uma parte do acervo fora da conta, é
            número parcial apresentado como completo se ninguém disser.
          */}
          <p className="border-t border-border/60 px-4 py-2 text-[11px] leading-4 text-muted-foreground">
            {tally.distintos > tally.itens.length
              ? `${tally.distintos} valores ao todo. `
              : ""}
            Fatia sobre os {tally.classificados} classificados
            {tally.semClassificacao > 0
              ? `; ${tally.semClassificacao} sem esta classificação ficam de fora.`
              : "."}
          </p>
        </>
      )}
    </section>
  );
}
