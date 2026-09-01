import type { PublishCheck } from "@/components/common/PublishConfirmDialog";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { PlanWorkspaceItem } from "./types/PlanWorkspace";
import { concordar, contar } from "@/lib/plural";

/** Mede o preparo do plano pelo próprio documento e pelo conteúdo que ele gerou. */
export function planPublishChecks(
  plan: PlanWorkspaceItem,
  article: KnowledgeArticle | undefined
): PublishCheck[] {
  const pendingTasks = plan.tasks.filter((task) => !task.completed).length;

  return [
    {
      label: "Conteúdo criado na Biblioteca",
      ok: Boolean(plan.source.articleId),
      hint: "Sem conteúdo, o plano não tem o que entregar ao ciclo.",
    },
    {
      label: "Conteúdo já publicado",
      ok: article?.status === "published",
      hint: article
        ? "O artigo vinculado ainda não está publicado, então não conta como cobertura."
        : "Ainda não há artigo vinculado a este plano.",
    },
    {
      label: "Atividades concluídas",
      ok: plan.tasks.length > 0 && pendingTasks === 0,
      hint:
        plan.tasks.length === 0
          ? "Nenhuma atividade foi definida neste plano."
          : `${contar(pendingTasks, "atividade")} ${concordar(pendingTasks, "continua", "continuam")} ${concordar(pendingTasks, "aberta")}.`,
    },
    {
      label: "Critérios de aceite definidos",
      ok: plan.document.acceptanceCriteria.length > 0,
      hint: "Sem critérios, não há como afirmar que o plano terminou.",
    },
    {
      label: "Tem responsável",
      ok: plan.owner.trim().length > 0 && plan.owner !== "A definir",
      hint: "Quem conduziu a execução fica registrado no histórico.",
    },
  ];
}
