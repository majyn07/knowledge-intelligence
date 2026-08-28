"use client";

import Link from "next/link";
import { useMemo } from "react";

import { PageSection } from "@/components/common/page/PageSection";
import { useActivity } from "@/features/activities/providers/ActivityProvider";
import { useLibrary } from "@/features/library/providers/LibraryProvider";
import { cycleTime } from "@/features/metrics/cycleTime";
import type { Ticket } from "@/models/Ticket";

/**
 * Do dia em que o cliente perguntou até o dia em que a resposta ficou no ar.
 *
 * É a pergunta de quem cobra resultado do ciclo, e a única do painel que
 * atravessa registros. O resto mede um artigo indo de rascunho a publicado, que
 * é o tempo da redação: o tempo do ciclo inclui tudo que fica parado antes de
 * alguém começar a escrever, que é justamente onde ele costuma travar.
 */
export function CycleTimeCard({ tickets }: { tickets: Ticket[] }) {
  const { items: articles, isHydrated } = useLibrary();
  const { events } = useActivity();

  const resultado = useMemo(
    () => cycleTime(articles, tickets, events),
    [articles, events, tickets]
  );

  const foraDaConta =
    resultado.ignored.semAtendimento +
    resultado.ignored.semDataUtil +
    resultado.ignored.ordemImpossivel;

  return (
    <PageSection
      title="Do atendimento ao artigo publicado"
      description="Quanto tempo passa entre o cliente perguntar e a resposta ficar publicada. Conta só o que fechou o ciclo: incluir o que ainda não fechou diria que ele é mais rápido do que é."
    >
      {!isHydrated ? (
        <div className="h-28 animate-pulse rounded-xl bg-muted/40" />
      ) : resultado.measured === 0 ? (
        <p className="rounded-xl border border-dashed px-5 py-8 text-center text-sm leading-6 text-muted-foreground">
          Nenhum atendimento virou artigo publicado ainda.
          {foraDaConta > 0 && <> {ressalva(resultado.ignored)}</>}
        </p>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Numero
              rotulo="Mediana"
              valor={resultado.medianDays}
              nota="O caso do meio. É a que resiste a um artigo antigo publicado hoje."
              destaque
            />

            <Numero
              rotulo="Média"
              valor={resultado.averageDays}
              nota="Puxada por qualquer caso extremo, e por isso vem ao lado da mediana."
            />

            <article className="rounded-xl border border-border/70 bg-muted/20 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Medidos
              </p>

              <p className="mt-2 text-2xl font-semibold tabular-nums">{resultado.measured}</p>

              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                Pares atendimento e artigo que fecharam o ciclo.
                {foraDaConta > 0 && <> {ressalva(resultado.ignored)}</>}
              </p>
            </article>
          </div>

          {/*
            Os mais demorados ficam à vista, e levam para o artigo. Indicador
            que não abre é indicador em que ninguém confia: "42 dias" sem poder
            ver quais é um número que a pessoa precisa aceitar em vez de
            conferir.
          */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Os que mais demoraram
            </p>

            <ul className="divide-y divide-border/60 rounded-xl border border-border/70">
              {resultado.slowest.map((span) => (
                <li key={span.articleId}>
                  <Link
                    href={`/library/${span.articleId}`}
                    className="flex items-center gap-4 px-4 py-2.5 text-sm transition-colors hover:bg-muted/40"
                  >
                    <span className="min-w-0 flex-1 truncate">{span.articleTitle}</span>

                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {span.days} dia{span.days === 1 ? "" : "s"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </PageSection>
  );
}

function Numero({
  rotulo,
  valor,
  nota,
  destaque = false,
}: {
  rotulo: string;
  valor: number | null;
  nota: string;
  destaque?: boolean;
}) {
  return (
    <article
      className={`rounded-xl border p-5 ${
        destaque ? "border-primary/30 bg-primary/5" : "border-border/70 bg-muted/20"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {rotulo}
      </p>

      {/* Média de nada é nada, e não zero: zero diria "publica no mesmo dia". */}
      <p className="mt-2 text-2xl font-semibold tabular-nums">
        {valor === null ? (
          <span className="text-base font-normal text-muted-foreground">Sem dado</span>
        ) : (
          <>
            {valor} <span className="text-base font-normal text-muted-foreground">dias</span>
          </>
        )}
      </p>

      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{nota}</p>
    </article>
  );
}

/** Número parcial apresentado como completo é pior que número com ressalva. */
function ressalva(ignorados: ReturnType<typeof cycleTime>["ignored"]): string {
  const partes: string[] = [];

  if (ignorados.semDataUtil > 0) {
    partes.push(`${ignorados.semDataUtil} sem data que dê para situar no tempo`);
  }

  if (ignorados.semAtendimento > 0) {
    partes.push(`${ignorados.semAtendimento} cujo atendimento não está mais aqui`);
  }

  if (ignorados.ordemImpossivel > 0) {
    partes.push(`${ignorados.ordemImpossivel} publicados antes da data do atendimento`);
  }

  return `Fora da conta: ${partes.join(", ")}.`;
}
