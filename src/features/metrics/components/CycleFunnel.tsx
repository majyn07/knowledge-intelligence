"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Info } from "lucide-react";

import { ListSkeleton } from "@/components/common/page/LoadingSkeleton";
import { PageSection } from "@/components/common/page/PageSection";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/status/StatusBadge";
import { RelativeDate } from "@/components/common/RelativeDate";
import { useActivity } from "@/features/activities/providers/ActivityProvider";
import { useNow } from "@/hooks/useNow";
import { useProject } from "@/providers/ProjectProvider";

import {
  arrivalsAt,
  averageDaysTo,
  buildFunnel,
  transitionCoverage,
} from "../cycleMetrics";

/**
 * O funil do artigo, do rascunho ao publicado.
 *
 * As etapas são as do próprio ciclo editorial, e não uma invenção da tela:
 * mudar a máquina de estados muda esta lista, e é assim que deve ser.
 */
const steps = [
  { stage: "draft", label: "Rascunho" },
  { stage: "review", label: "Em revisão" },
  { stage: "published", label: "Publicado" },
];

const janelas = [7, 30, 90, 365];

function janelaLabel(days: number) {
  return days === 365 ? "último ano" : `últimos ${days} dias`;
}

/**
 * Onde o ciclo trava, e quantos chegaram ao fim.
 *
 * Conta **chegadas** e não registros parados em cada estágio: um artigo que
 * passou por revisão e foi publicado passou pelos dois, e contar só onde ele
 * está agora esconderia metade do caminho.
 *
 * Cada número abre a lista que o originou — indicador que não se abre é
 * indicador em que ninguém confia.
 */
export function CycleFunnel({ days: inicial = 30 }: { days?: number }) {
  const { events, isHydrated } = useActivity();
  const { activeProjectId } = useProject();

  const [open, setOpen] = useState<string | null>(null);
  /*
    A janela era fixa em 30 dias, o que impedia a única leitura que um funil
    tem a dar: se ele está melhorando. Comparar 30 com 90 e com o ano é a
    tendência ao longo do tempo, e ela precisa ser escolhida por quem olha.
  */
  const [days, setDays] = useState(inicial);

  const scoped = useMemo(
    () => (activeProjectId ? events.filter((e) => e.projectId === activeProjectId) : events),
    [activeProjectId, events]
  );

  const now = useNow();

  const window = useMemo(() => {
    if (!now) return null;

    const to = now.getTime();
    return { from: to - days * 24 * 60 * 60 * 1000, to };
  }, [days, now]);

  const funnel = useMemo(
    () => (window ? buildFunnel(scoped, steps, window, "article") : []),
    [scoped, window]
  );

  const coverage = useMemo(() => transitionCoverage(scoped), [scoped]);
  const untilPublished = useMemo(
    () => (window ? averageDaysTo(scoped, "published", window) : null),
    [scoped, window]
  );

  const peak = Math.max(1, ...funnel.map((step) => step.arrivals));

  /*
    Sem o relógio não dá para dizer nada sobre janela de tempo, e sem o
    histórico lido não dá para contar. Antes disto a seção simplesmente não
    existia no primeiro render e aparecia do nada — o esqueleto reserva o
    espaço e diz que algo vem ali.
  */
  if (!window || !isHydrated) {
    return (
      <PageSection
        title="Onde o ciclo trava"
        description="Quantos artigos chegaram a cada estágio."
      >
        <ListSkeleton count={3} />
      </PageSection>
    );
  }

  return (
    <PageSection
      title="Onde o ciclo trava"
      description={`Quantos artigos chegaram a cada estágio nos ${janelaLabel(days)}.`}
      actions={
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Janela do funil">
          {janelas.map((janela) => (
            <Button
              key={janela}
              size="sm"
              variant={days === janela ? "default" : "outline"}
              onClick={() => setDays(janela)}
            >
              {janela === 365 ? "1 ano" : `${janela} dias`}
            </Button>
          ))}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border bg-card p-5">
          <ul className="flex flex-col gap-3">
            {funnel.map((step) => {
              const list = arrivalsAt(scoped, step.stage, window, "article");
              const expanded = open === step.stage;

              return (
                <li key={step.stage}>
                  <button
                    type="button"
                    className="w-full text-left"
                    aria-expanded={expanded}
                    disabled={list.length === 0}
                    onClick={() => setOpen(expanded ? null : step.stage)}
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-sm">{step.label}</span>

                      <span className="text-sm font-semibold tabular-nums">
                        {step.arrivals}
                      </span>
                    </span>

                    <span
                      className="mt-1.5 block h-2 rounded-full bg-muted"
                      role="presentation"
                    >
                      <span
                        className="block h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${(step.arrivals / peak) * 100}%` }}
                      />
                    </span>
                  </button>

                  {expanded && (
                    <ul className="mt-2 flex flex-col gap-1 border-l-2 border-border pl-3">
                      {list.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-baseline justify-between gap-3 text-xs"
                        >
                          <Link
                            href={`/library/${item.id}`}
                            className="min-w-0 truncate underline underline-offset-2"
                          >
                            {item.label || "Sem título"}
                          </Link>

                          <span className="shrink-0 text-muted-foreground">
                            <RelativeDate value={item.at} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>

          {untilPublished !== null && (
            <p className="mt-4 border-t pt-4 text-sm">
              Do primeiro registro à publicação:{" "}
              <strong className="tabular-nums">{untilPublished}</strong> dias em média.
            </p>
          )}
        </div>

        {/*
          A ressalva não é rodapé: número parcial apresentado como completo é
          pior que número com ressalva, e quem lê precisa saber antes de usar.
        */}
        {!coverage.isComplete && (
          <p className="flex items-start gap-2 rounded-lg border border-[var(--ring)] bg-accent p-3 text-xs">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />

            <span>
              <strong>{coverage.legacy}</strong> de {coverage.total} mudanças de
              estágio foram registradas antes de o histórico guardar o destino, e
              ficam de fora destas contagens. Elas continuam no histórico —
              apenas não dizem para onde o registro foi.
            </span>
          </p>
        )}

        {coverage.total === 0 && (
          <StatusBadge variant="default">
            Ainda não houve mudança de estágio neste recorte
          </StatusBadge>
        )}
      </div>
    </PageSection>
  );
}
