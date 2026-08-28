import type { ActivityEvent } from "@/models/ActivityEvent";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import { migrateAssignment, type Person, type Team } from "@/models/Assignment";

import { lastActivityOf } from "./attentionQueue";
import { attentionRank, daysSince, deadlineLabel, deadlineState, isStalled } from "./deadlines";
import type { PlanWorkspaceItem } from "./types/PlanWorkspace";

export type WorkKind = "plan" | "article";

export interface WorkItem {
  kind: WorkKind;
  id: string;
  title: string;
  projectId: string;
  href: string;
  /** Estágio, em texto, para a linha dizer onde o trabalho está. */
  stage: string;
  rank: number;
  reason: string;
}

/**
 * O que é meu.
 *
 * Inclui o que está atribuído à minha equipe, e não só a mim: enquanto a maior
 * parte do time não entrou no produto, a equipe é onde a atribuição de fato
 * mora. Ignorá-la deixaria a tela vazia justamente para quem mais precisa
 * dela.
 */
function isMine(
  ref: string,
  me: Person | null,
  people: Person[],
  teams: Team[]
): boolean {
  if (!me) return false;

  const resolved = migrateAssignment(ref, people, teams);

  return resolved === me.id || (me.teamId !== "" && resolved === me.teamId);
}

/**
 * O trabalho de uma pessoa, atravessando projetos.
 *
 * A fila de atenção da tela de projeto responde "o que trava este projeto".
 * Esta responde "o que trava **você**", e ninguém trabalha em um projeto de
 * cada vez, o que era o limite da anterior.
 *
 * Artigo entra sem prazo, porque não tem: o sinal dele é ter começado e não
 * ter terminado. Publicado e arquivado saem, porque acabaram.
 */
export function buildMyWork(
  input: {
    plans: PlanWorkspaceItem[];
    articles: KnowledgeArticle[];
    events: ActivityEvent[];
    me: Person | null;
    people: Person[];
    teams: Team[];
  },
  now: Date
): WorkItem[] {
  const { plans, articles, events, me, people, teams } = input;
  if (!me) return [];

  const items: WorkItem[] = [];

  for (const plan of plans) {
    if (plan.status === "published") continue;
    if (!isMine(plan.owner, me, people, teams)) continue;

    const lastActivityAt = lastActivityOf(plan.id, events);
    const state = deadlineState(plan.dueDate, now);
    const stalled = isStalled(lastActivityAt, now);
    const parado = daysSince(lastActivityAt, now);

    items.push({
      kind: "plan",
      id: plan.id,
      title: plan.title,
      projectId: plan.projectId,
      href: `/improvement-plan?plan=${plan.id}`,
      stage: plan.status,
      rank: attentionRank({ due: plan.dueDate, lastActivityAt, now }),
      reason:
        state !== "sem-prazo"
          ? deadlineLabel(plan.dueDate, now)
          : stalled
            ? `sem movimento há ${parado} dias`
            : "em andamento",
    });
  }

  for (const article of articles) {
    if (article.status === "published" || article.status === "archived") continue;
    if (!isMine(article.author, me, people, teams)) continue;

    const lastActivityAt = lastActivityOf(article.id, events, "article");
    const stalled = isStalled(lastActivityAt, now);
    const parado = daysSince(lastActivityAt, now);

    items.push({
      kind: "article",
      id: article.id,
      title: article.title,
      projectId: article.projectId,
      href: `/library/${article.id}`,
      stage: article.status,
      // Sem prazo, o artigo nunca chega ao topo da fila, só a parada o move.
      rank: stalled ? 2 : 4,
      reason: stalled ? `sem movimento há ${parado} dias` : "em andamento",
    });
  }

  return items.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.title.localeCompare(b.title, "pt-BR");
  });
}
