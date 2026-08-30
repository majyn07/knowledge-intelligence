"use client";

import { ArrowRight, ListChecks } from "lucide-react";

import { PageSection } from "@/components/common/page/PageSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/lib/dates";

import type { TriageResult } from "../triage";
import { concordar, contar } from "@/lib/plural";

/**
 * Por onde começar, quando há mais atendimento do que dia.
 *
 * A lista responde "onde está este atendimento". Esta tela responde outra
 * pergunta, e é a que o produto nasceu para responder: **o que muitos clientes
 * perguntam e o acervo não responde**. Com três atendimentos ela não faz falta;
 * com mil, analisar na ordem da lista é analisar por acaso.
 *
 * Ela já existia dentro do Levantamento, misturada aos achados do acervo. Só
 * que quem trabalha os atendimentos está aqui, e mandar essa pessoa para outra
 * tela para descobrir por onde começar é o que faz ninguém descobrir.
 *
 * Tudo aqui é **calculado**, e a tela diz isso: vocabulário em comum não é a
 * mesma dúvida, é as mesmas palavras incomuns. Concluir que são a mesma dúvida
 * exige ler, e ler é o que a análise faz depois, sobre esta fila.
 */
export function TriageQueue({
  triagem,
  acervoPronto,
  onSelectTicket,
}: {
  triagem: TriageResult;
  /** O acervo chegou. Sem ele a cobertura de todo grupo dá zero. */
  acervoPronto: boolean;
  onSelectTicket: (ticketId: string) => void;
}) {
  const { groups, ignorados, excedeuTeto } = triagem;

  /*
    Enquanto a Biblioteca não chegou, a cobertura de todo grupo é zero, e zero
    aqui é a leitura mais alarmante possível: "o acervo não responde nada disto".
    Foi o que a tela mostrou por uns segundos na primeira vez que rodou contra o
    banco, com os 1.822 artigos a caminho. Número calculado sobre dado que ainda
    não veio não é número, e a ordem da fila sai dele.
  */
  if (!acervoPronto) {
    return (
      <PageSection
        title="Fila de triagem"
        description="A ordem depende do que já está publicado, e o acervo ainda está chegando."
      >
        <div className="space-y-3">
          {[0, 1, 2].map((linha) => (
            <div key={linha} className="h-28 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      </PageSection>
    );
  }

  const foraDaFila =
    ignorados.jaVirouArtigo +
    ignorados.jaAnalisado +
    ignorados.semSolucao +
    ignorados.semTextoSuficiente;

  if (excedeuTeto) {
    return (
      <PageSection title="Fila de triagem" description="A comparação não foi feita nesta carga.">
        <p className="rounded-xl border border-dashed px-5 py-8 text-center text-sm leading-6 text-muted-foreground">
          São atendimentos demais para comparar aos pares. A fila fica de fora desta vez, e isso
          está dito aqui em vez de sair um número pela metade com cara de completo. Recorte o
          projeto ou trabalhe pela lista.
        </p>
      </PageSection>
    );
  }

  return (
    <PageSection
      title="Fila de triagem"
      description="Atendimentos resolvidos que ninguém leu ainda, agrupados por vocabulário em comum. Os de cima são os que mais gente perguntou e o acervo publicado menos responde."
    >
      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed px-5 py-10 text-center text-sm leading-6 text-muted-foreground">
          Nada esperando leitura.
          {foraDaFila > 0 && (
            <>
              {" "}
              {contar(foraDaFila, "atendimento")} {concordar(foraDaFila, "ficou", "ficaram")} fora da fila: {resumoDosIgnorados(ignorados)}.
            </>
          )}
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {groups.map((grupo, posicao) => (
              <li
                key={grupo.id}
                className="rounded-xl border border-border/70 bg-card p-5 transition-colors hover:border-primary/25"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      <span className="text-primary">{posicao + 1}º</span>

                      <Badge variant={grupo.tickets.length > 1 ? "default" : "outline"}>
                        {grupo.tickets.length === 1
                          ? "1 atendimento"
                          : `${grupo.tickets.length} atendimentos`}
                      </Badge>

                      <span className="tracking-normal normal-case">
                        o acervo publicado cobre {Math.round(grupo.coverage * 100)}% do vocabulário
                      </span>
                    </p>

                    <h3 className="mt-1.5 break-words text-base font-semibold leading-6">
                      {grupo.subject}
                    </h3>

                    {grupo.terms.length > 0 && (
                      <p className="mt-2 flex flex-wrap gap-1.5">
                        {grupo.terms.slice(0, 6).map((termo) => (
                          <span
                            key={termo}
                            className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {termo}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => onSelectTicket(grupo.tickets[0].id)}
                  >
                    Ler o primeiro
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>

                {/*
                  Os outros do grupo ficam à vista, e não escondidos atrás do
                  primeiro: "cinco perguntaram a mesma coisa" só convence quem
                  pode conferir os cinco.
                */}
                {grupo.tickets.length > 1 && (
                  <ul className="mt-4 space-y-1 border-t border-border/60 pt-3">
                    {grupo.tickets.slice(1).map((ticket) => (
                      <li key={ticket.id}>
                        <button
                          type="button"
                          onClick={() => onSelectTicket(ticket.id)}
                          className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/50"
                        >
                          <ListChecks className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />

                          <span className="min-w-0 flex-1 truncate">{ticket.title}</span>

                          {ticket.date && (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatDay(ticket.date)}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          {foraDaFila > 0 && (
            <p className="mt-5 text-xs leading-6 text-muted-foreground">
              Fora da fila: {resumoDosIgnorados(ignorados)}.
            </p>
          )}
        </>
      )}
    </PageSection>
  );
}

/** Por que cada um ficou de fora. Número sem motivo vira desconfiança da tela. */
function resumoDosIgnorados(ignorados: TriageResult["ignorados"]): string {
  const partes: string[] = [];

  if (ignorados.jaVirouArtigo > 0) partes.push(`${ignorados.jaVirouArtigo} já viraram artigo`);
  if (ignorados.jaAnalisado > 0) partes.push(`${ignorados.jaAnalisado} já foram analisados`);
  if (ignorados.semSolucao > 0) partes.push(`${ignorados.semSolucao} ainda não têm solução`);
  if (ignorados.semTextoSuficiente > 0) {
    partes.push(`${ignorados.semTextoSuficiente} têm texto curto demais para agrupar`);
  }

  return partes.join(", ");
}
