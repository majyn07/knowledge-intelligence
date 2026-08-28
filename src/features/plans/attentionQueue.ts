import type { ActivityEvent } from "@/models/ActivityEvent";

import {
  attentionRank,
  daysSince,
  deadlineLabel,
  deadlineState,
  isStalled,
  STALLED_AFTER_DAYS,
} from "./deadlines";
import type { PlanWorkspaceItem } from "./types/PlanWorkspace";

export interface AttentionEntry {
  plan: PlanWorkspaceItem;
  rank: number;
  /** Por que este item está na fila, em uma frase. */
  reason: string;
}

/** Plano publicado terminou o ciclo: não vence nem para. */
function isFinished(plan: PlanWorkspaceItem) {
  return plan.status === "published";
}

/**
 * Último instante em que algo aconteceu com o registro.
 *
 * Vem do histórico e não de `updatedAt`: o histórico registra o que aconteceu,
 * enquanto `updatedAt` muda também por gravação incidental, e uma delas faria
 * um plano parado há um mês parecer recém-tocado.
 *
 * O tipo do assunto é parâmetro e não constante. Ele estava fixo em "plan", e
 * o mesmo id de um artigo devolvia "sem histórico", parada nunca detectada,
 * silenciosamente.
 */
export function lastActivityOf(
  id: string,
  events: ActivityEvent[],
  kind: ActivityEvent["subject"]["kind"] = "plan"
): string | undefined {
  let latest: string | undefined;

  for (const event of events) {
    if (event.subject.kind !== kind || event.subject.id !== id) continue;
    if (latest === undefined || event.at > latest) latest = event.at;
  }

  return latest;
}

/**
 * A fila de atenção.
 *
 * Antes disto "precisa de atenção" mostrava contadores. "3 análises
 * aguardando", sem dizer quais nem qual olhar primeiro. Contador informa que
 * existe trabalho; fila diz por onde começar.
 *
 * Entra só o que tem motivo. Um plano no prazo e em movimento não precisa de
 * atenção, e listá-lo diluiria os que precisam.
 */
export function buildAttentionQueue(
  plans: PlanWorkspaceItem[],
  events: ActivityEvent[],
  now: Date
): AttentionEntry[] {
  const entries: AttentionEntry[] = [];

  for (const plan of plans) {
    if (isFinished(plan)) continue;

    const lastActivityAt = lastActivityOf(plan.id, events);
    const state = deadlineState(plan.dueDate, now);
    const stalled = isStalled(lastActivityAt, now, { finished: false });

    if (state === "sem-prazo" && !stalled) continue;
    if (state === "distante" && !stalled) continue;

    const rank = attentionRank({
      due: plan.dueDate,
      lastActivityAt,
      finished: false,
      now,
    });

    const parado = daysSince(lastActivityAt, now);

    const reason =
      state === "atrasado" || state === "hoje" || state === "proximo"
        ? deadlineLabel(plan.dueDate, now)
        : `sem movimento há ${parado} dias`;

    entries.push({ plan, rank, reason });
  }

  /*
    Empate resolvido pelo prazo mais próximo, e depois pelo título: a ordem
    precisa ser estável, senão a lista embaralha a cada render e quem estava
    lendo perde o lugar.
  */
  return entries.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;

    const dueA = a.plan.dueDate ?? "";
    const dueB = b.plan.dueDate ?? "";
    if (dueA !== dueB) return dueA === "" ? 1 : dueB === "" ? -1 : dueA.localeCompare(dueB);

    return a.plan.title.localeCompare(b.plan.title, "pt-BR");
  });
}

export { STALLED_AFTER_DAYS };
