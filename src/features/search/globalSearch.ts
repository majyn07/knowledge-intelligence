import type { ActivityEvent } from "@/models/ActivityEvent";
import type { AnalysisRecord } from "@/models/KnowledgeLifecycle";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { PlanWorkspaceItem } from "@/features/plans/types/PlanWorkspace";
import type { Project } from "@/models/Project";
import { sectionPath, type Taxonomy } from "@/models/Taxonomy";
import type { Ticket } from "@/models/Ticket";

export type SearchResultKind =
  | "command"
  | "project"
  | "ticket"
  | "analysis"
  | "opportunity"
  | "plan"
  | "article"
  | "event";

export interface SearchResult {
  kind: SearchResultKind;
  id: string;
  title: string;
  subtitle: string;
  projectId: string;
  href: string;
  score: number;
}

export interface SearchGroup {
  kind: SearchResultKind;
  results: SearchResult[];
}

export interface GlobalSearchInput {
  projects: Project[];
  tickets: Ticket[];
  analyses: AnalysisRecord[];
  plans: PlanWorkspaceItem[];
  articles: KnowledgeArticle[];
  events: ActivityEvent[];
  /** Vocabulário da classificação: sem ele a seção do artigo não tem nome. */
  taxonomy: Taxonomy;
}

/** Ordem de exibição: do que o analista mais procura para o que menos procura. */
export const SEARCH_KIND_ORDER: SearchResultKind[] = [
  // Comandos primeiro: com o campo vazio, é o único grupo que tem o que mostrar.
  "command",
  "article",
  "ticket",
  "analysis",
  "opportunity",
  "plan",
  "project",
  "event",
];

export const searchKindLabel: Record<SearchResultKind, string> = {
  command: "Ir para",
  project: "Projetos",
  ticket: "Atendimentos",
  analysis: "Análises",
  opportunity: "Oportunidades",
  plan: "Planos de melhoria",
  article: "Artigos",
  event: "Histórico",
};

const DIACRITICS = /[̀-ͯ]/g;
const MAX_PER_GROUP = 5;

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS, "");
}

/**
 * Pontua a ocorrência dos termos nos campos do registro. O primeiro campo pesa
 * mais que os seguintes: casar no título vale mais que casar no corpo.
 */
function score(query: string, fields: string[]): number {
  const terms = normalize(query).split(/\s+/).filter((term) => term.length > 1);
  if (terms.length === 0) return 0;

  const normalized = fields.map(normalize);
  let total = 0;

  for (const term of terms) {
    let matched = false;

    normalized.forEach((field, index) => {
      if (!field.includes(term)) return;
      matched = true;
      total += Math.max(1, fields.length - index);
    });

    // Um termo sem correspondência descarta o registro: a busca é conjuntiva.
    if (!matched) return 0;
  }

  return total;
}

function push(
  results: SearchResult[],
  value: number,
  result: Omit<SearchResult, "score">
) {
  if (value > 0) results.push({ ...result, score: value });
}

export function searchEverything(
  { projects, tickets, analyses, plans, articles, events, taxonomy }: GlobalSearchInput,
  query: string
): SearchGroup[] {
  if (query.trim().length < 2) return [];

  const projectName = (id: string) =>
    projects.find((project) => project.id === id)?.name ?? "Projeto não encontrado";

  const results: SearchResult[] = [];

  for (const project of projects) {
    push(results, score(query, [project.name, project.client, project.product, project.module, project.goal, project.description]), {
      kind: "project",
      id: project.id,
      title: project.name,
      subtitle: [project.client, project.product].filter(Boolean).join(" · ") || "Sem contexto definido",
      projectId: project.id,
      href: `/projects/${project.id}`,
    });
  }

  for (const ticket of tickets) {
    push(results, score(query, [ticket.title, ticket.company, ticket.solution, ticket.id]), {
      kind: "ticket",
      id: ticket.id,
      title: ticket.title,
      subtitle: `#${ticket.id} · ${ticket.company || "Sem empresa"} · ${projectName(ticket.projectId)}`,
      projectId: ticket.projectId,
      href: `/analysis?ticket=${ticket.id}`,
    });
  }

  for (const analysis of analyses) {
    const { identification, summary } = analysis.result;

    push(results, score(query, [identification.title, summary.rootCause, summary.customerProblem, analysis.ticketId]), {
      kind: "analysis",
      id: analysis.id,
      title: identification.title,
      subtitle: `Atendimento #${analysis.ticketId} · ${projectName(analysis.projectId)}`,
      projectId: analysis.projectId,
      href: `/analysis?ticket=${analysis.ticketId}`,
    });

    for (const opportunity of analysis.result.opportunities) {
      push(results, score(query, [opportunity.title, opportunity.description, opportunity.justification]), {
        kind: "opportunity",
        id: opportunity.id,
        title: opportunity.title,
        subtitle: `Atendimento #${analysis.ticketId} · ${projectName(analysis.projectId)}`,
        projectId: analysis.projectId,
        href: `/analysis?ticket=${analysis.ticketId}`,
      });
    }
  }

  for (const plan of plans) {
    push(results, score(query, [plan.title, plan.owner, plan.document.executiveSummary, plan.document.proposal]), {
      kind: "plan",
      id: plan.id,
      title: plan.title,
      subtitle: `${plan.owner || "Sem responsável"} · ${projectName(plan.projectId)}`,
      projectId: plan.projectId,
      href: `/improvement-plan?plan=${plan.id}`,
    });
  }

  for (const article of articles) {
    push(results, score(query, [article.title, article.summary, article.keywords.join(" "), article.tags.join(" "), sectionPath(taxonomy, article.sectionId), article.content]), {
      kind: "article",
      id: article.id,
      title: article.title,
      subtitle: [sectionPath(taxonomy, article.sectionId), projectName(article.projectId)].filter(Boolean).join(" · "),
      projectId: article.projectId,
      href: `/library/${article.id}`,
    });
  }

  for (const event of events) {
    push(results, score(query, [event.subject.label, event.detail, event.actor]), {
      kind: "event",
      id: event.id,
      title: event.subject.label,
      subtitle: `${event.detail} · ${projectName(event.projectId)}`,
      projectId: event.projectId,
      href: "/activities",
    });
  }

  return SEARCH_KIND_ORDER.map((kind) => ({
    kind,
    results: results
      .filter((result) => result.kind === kind)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_PER_GROUP),
  })).filter((group) => group.results.length > 0);
}

/** Achata os grupos na ordem exibida, para navegação por teclado. */
export function flattenGroups(groups: SearchGroup[]): SearchResult[] {
  return groups.flatMap((group) => group.results);
}
