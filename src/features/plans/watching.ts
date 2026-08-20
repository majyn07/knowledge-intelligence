import type { Follow } from "@/features/people/follows";
import { migrateAssignment, type Person, type Team } from "@/models/Assignment";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

import { parseMentions } from "./mentions";
import type { PlanWorkspaceItem } from "./types/PlanWorkspace";

/**
 * O que chega até você sem ser seu.
 *
 * "Meu trabalho" responde pelo que está atribuído. Estes dois caminhos são o
 * que faltava: o registro que você escolheu acompanhar, e aquele em que alguém
 * escreveu o seu nome. Nenhum dos dois transfere responsabilidade — e é por
 * isso que ficam numa lista separada em vez de engrossar a fila de trabalho.
 */

export type WatchReason = "acompanhando" | "mencionado";

export interface WatchItem {
  kind: "plan" | "article";
  id: string;
  title: string;
  projectId: string;
  href: string;
  reason: WatchReason;
  /** Encerrado — publicado, arquivado — continua na lista, mas dizendo isso. */
  isClosed: boolean;
}

function planHref(id: string) {
  return `/improvement-plan?plan=${id}`;
}

/**
 * A menção é minha quando aponta para mim ou para a minha equipe.
 *
 * Mesma regra de `isMine`: enquanto a maior parte do time não entrou no
 * produto, mencionar a equipe é o caminho que de fato existe, e ignorá-lo
 * deixaria a lista vazia justamente para quem mais precisa dela.
 */
function mentionsMe(
  text: string,
  me: Person | null,
  people: Person[],
  teams: Team[]
): boolean {
  if (!me) return false;

  return parseMentions(text).some((mention) => {
    const resolved = migrateAssignment(mention.ref, people, teams);
    return resolved === me.id || (me.teamId !== "" && resolved === me.teamId);
  });
}

export function buildWatching(input: {
  plans: PlanWorkspaceItem[];
  articles: KnowledgeArticle[];
  follows: Follow[];
  me: Person | null;
  people: Person[];
  teams: Team[];
}): WatchItem[] {
  const { plans, articles, follows, me, people, teams } = input;

  const items = new Map<string, WatchItem>();

  const add = (item: WatchItem) => {
    /*
      Acompanhar e ser mencionado no mesmo registro é um item só. O
      acompanhamento vence porque foi uma escolha explícita — a menção pode ter
      sido de passagem.
    */
    const key = `${item.kind}:${item.id}`;
    const atual = items.get(key);

    if (!atual || (atual.reason === "mencionado" && item.reason === "acompanhando")) {
      items.set(key, item);
    }
  };

  for (const plan of plans) {
    if (mentionsMe(plan.document.notes, me, people, teams)) {
      add({
        kind: "plan",
        id: plan.id,
        title: plan.title,
        projectId: plan.projectId,
        href: planHref(plan.id),
        reason: "mencionado",
        isClosed: plan.status === "published",
      });
    }

    for (const comment of plan.comments) {
      if (!mentionsMe(comment.message, me, people, teams)) continue;

      add({
        kind: "plan",
        id: plan.id,
        title: plan.title,
        projectId: plan.projectId,
        href: planHref(plan.id),
        reason: "mencionado",
        isClosed: plan.status === "published",
      });
    }
  }

  for (const follow of follows) {
    if (follow.kind === "plan") {
      const plan = plans.find((item) => item.id === follow.subjectId);

      add({
        kind: "plan",
        id: follow.subjectId,
        /*
          O registro pode ter sido excluído. O rótulo guardado no
          acompanhamento é o que mantém a linha legível — some o registro, não
          o fato de alguém ter escolhido acompanhá-lo.
        */
        title: plan?.title || follow.subjectLabel || "Registro removido",
        projectId: plan?.projectId ?? follow.projectId,
        href: planHref(follow.subjectId),
        reason: "acompanhando",
        isClosed: plan ? plan.status === "published" : true,
      });

      continue;
    }

    const article = articles.find((item) => item.id === follow.subjectId);

    add({
      kind: "article",
      id: follow.subjectId,
      title: article?.title || follow.subjectLabel || "Registro removido",
      projectId: article?.projectId ?? follow.projectId,
      href: `/library/${follow.subjectId}`,
      reason: "acompanhando",
      isClosed: article ? article.status === "published" || article.status === "archived" : true,
    });
  }

  return [...items.values()].sort((a, b) => {
    // O que ainda se move vem antes do que já terminou.
    if (a.isClosed !== b.isClosed) return a.isClosed ? 1 : -1;
    return a.title.localeCompare(b.title, "pt-BR");
  });
}
