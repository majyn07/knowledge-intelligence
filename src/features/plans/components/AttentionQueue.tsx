"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AlarmClock, PauseCircle } from "lucide-react";

import { PageSection } from "@/components/common/page/PageSection";
import { StatusBadge } from "@/components/common/status/StatusBadge";
import { AssigneeName } from "@/features/people/components/AssigneeName";
import { useActivity } from "@/features/activities/providers/ActivityProvider";
import { usePlans } from "@/features/plans/providers/PlansProvider";
import { useNow } from "@/hooks/useNow";

import { buildAttentionQueue } from "../attentionQueue";
import { deadlineState } from "../deadlines";
import { planStatusLabel } from "../types/PlanWorkspace";

/**
 * A fila, e não o contador.
 *
 * "3 análises aguardando" diz que existe trabalho; não diz qual olhar
 * primeiro. Aqui cada linha é um registro, na ordem em que merece atenção, com
 * o motivo escrito ao lado — atrasado, vence hoje, ou parado há tanto tempo.
 *
 * A lista vazia é boa notícia e diz isso, em vez de sumir da tela: seção que
 * desaparece deixa a dúvida de se foi verificada.
 */
export function AttentionQueue({ projectId }: { projectId?: string }) {
  const { plans } = usePlans();
  const { events } = useActivity();

  const now = useNow();

  const queue = useMemo(() => {
    if (!now) return [];

    const scoped = projectId ? plans.filter((plan) => plan.projectId === projectId) : plans;

    // `now` entra como argumento: a ordenação é pura e testável sem congelar
    // o relógio, e é o mesmo critério dos indicadores por período.
    return buildAttentionQueue(scoped, events, now);
  }, [events, now, plans, projectId]);

  return (
    <PageSection
      title="Atrasado ou parado"
      description="Planos que passaram do prazo, vencem agora, ou não se movem há uma semana."
    >
      {queue.length === 0 ? (
        <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
          Nenhum plano atrasado nem parado. O que está em andamento tem prazo à
          frente e teve movimento recente.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {queue.map(({ plan, reason }) => {
            const late = deadlineState(plan.dueDate, now ?? new Date(0));
            const overdue = late === "atrasado" || late === "hoje";

            return (
              <li key={plan.id}>
                <Link
                  href={`/improvement-plan?plan=${plan.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-muted/40"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    {overdue ? (
                      <AlarmClock className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
                    ) : (
                      <PauseCircle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    )}

                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{plan.title}</span>

                      <span className="block truncate text-xs text-muted-foreground">
                        {planStatusLabel[plan.status]} ·{" "}
                        <AssigneeName value={plan.owner} />
                      </span>
                    </span>
                  </span>

                  <StatusBadge variant={overdue ? "danger" : "warning"}>{reason}</StatusBadge>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PageSection>
  );
}
