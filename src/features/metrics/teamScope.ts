import { migrateAssignment, type Person, type Team } from "@/models/Assignment";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { PlanWorkspaceItem } from "@/features/plans/types/PlanWorkspace";

/**
 * O recorte por equipe.
 *
 * Nem tudo no ciclo tem dono. O plano tem responsável e o artigo tem autor;
 * o atendimento e a análise não têm. Ninguém é atribuído a eles, e inventar
 * um vínculo por proximidade seria classificação inventada.
 *
 * Por isso a função devolve, junto com o que filtrou, **o que o filtro não
 * alcança**. A tela usa isso para dizer que aqueles números continuam sendo
 * do projeto inteiro, em vez de deixar quem lê supor que tudo foi recortado.
 */

export interface TeamScopeInput {
  teamId: string | null;
  plans: PlanWorkspaceItem[];
  articles: KnowledgeArticle[];
  people: Person[];
  teams: Team[];
}

export interface TeamScope {
  plans: PlanWorkspaceItem[];
  articles: KnowledgeArticle[];
  /** Quantos registros com atribuição ficaram de fora do recorte. */
  excluded: number;
  /**
   * Registros sem atribuição nenhuma.
   *
   * Ficam de fora de qualquer equipe, não porque são de outra, mas porque não
   * são de ninguém. É outra informação, e a tela oferece vê-los.
   */
  unassigned: number;
  isScoped: boolean;
}

/**
 * A equipe por trás de uma atribuição, ou vazio quando não há.
 *
 * A referência guardada pode ser equipe, pessoa ou (nos registros antigos)
 * um nome solto. Uma pessoa responde pela equipe dela: medir por equipe é o
 * recorte desta fase, e o individual vem depois.
 */
export function teamOfAssignment(
  ref: string | undefined,
  people: Person[],
  teams: Team[]
): string {
  const resolved = migrateAssignment(ref ?? "", people, teams);

  if (teams.some((team) => team.id === resolved)) return resolved;

  const person = people.find((item) => item.id === resolved);
  const team = person && teams.find((item) => item.id === person.teamId);

  return team ? team.id : "";
}

export function scopeToTeam({
  teamId,
  plans,
  articles,
  people,
  teams,
}: TeamScopeInput): TeamScope {
  if (!teamId) {
    return {
      plans,
      articles,
      excluded: 0,
      unassigned: 0,
      isScoped: false,
    };
  }

  const belongs = (ref: string | undefined) => teamOfAssignment(ref, people, teams) === teamId;
  const hasTeam = (ref: string | undefined) => teamOfAssignment(ref, people, teams) !== "";

  const scopedPlans = plans.filter((plan) => belongs(plan.owner));
  const scopedArticles = articles.filter((article) => belongs(article.author));

  const todos = [
    ...plans.map((plan) => plan.owner),
    ...articles.map((article) => article.author),
  ];

  return {
    plans: scopedPlans,
    articles: scopedArticles,
    excluded: todos.filter((ref) => hasTeam(ref) && !belongs(ref)).length,
    unassigned: todos.filter((ref) => !hasTeam(ref)).length,
    isScoped: true,
  };
}
