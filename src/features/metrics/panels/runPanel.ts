import type { ActivityEvent } from "@/models/ActivityEvent";
import type { AnalysisRecord } from "@/models/KnowledgeLifecycle";
import { analysisStatusLabel } from "@/models/KnowledgeLifecycle";
import { articleStatusLabel, type KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { Project } from "@/models/Project";
import type { Ticket } from "@/models/Ticket";
import { migrateAssignment, type Person, type Team } from "@/models/Assignment";
import { findCategory, findSection, type Taxonomy } from "@/models/Taxonomy";
import { planStatusLabel, type PlanWorkspaceItem } from "@/features/plans/types/PlanWorkspace";
import { OpportunityStatusLabel } from "@/features/analysis/types/KnowledgeOpportunity";

import type { PanelSpec } from "./panelSpec";

/**
 * Tudo que um painel pode contar.
 *
 * Chega pronto de quem já tem os providers na mão. O motor não busca nada: é
 * função pura, e é isso que permite testá-lo sem montar a árvore de React.
 */
export interface PanelData {
  projects: Project[];
  tickets: Ticket[];
  analyses: AnalysisRecord[];
  plans: PlanWorkspaceItem[];
  articles: KnowledgeArticle[];
  events: ActivityEvent[];
  taxonomy: Taxonomy;
  people: Person[];
  teams: Team[];
  activeProjectId: string | null;
}

export interface PanelRow {
  key: string;
  label: string;
  value: number;
}

export interface PanelResult {
  total: number;
  rows: PanelRow[];
  /**
   * Ressalva sobre o que o número não alcança.
   *
   * Presente quando parte dos dados não pode ser contada — e aí a tela mostra
   * o aviso junto do número, em vez de apresentar um total parcial como se
   * fosse completo.
   */
  caveat?: string;
}

const DAY = 24 * 60 * 60 * 1000;

const SEM_VALOR = "__sem__";

/** Chave e rótulo de um registro dentro da quebra escolhida. */
interface Bucket {
  key: string;
  label: string;
}

const VAZIO: Bucket = { key: "", label: "" };

/** `dd/mm/aaaa`, com hora opcional. */
const BR_DATE = /^(\d{2})\/(\d{2})\/(\d{4})(?:[ ,]+(\d{2}):(\d{2}))?$/;

/**
 * O instante por trás de um campo de data.
 *
 * Aceita `Date`, ISO e o formato brasileiro, porque os dois convivem no
 * acervo: o atendimento guarda `"15/07/2026"` desde a primeira versão, e
 * `new Date` devolve inválido para ele. Sem isto o painel de atendimentos
 * mostrava zero com três atendimentos na tela.
 *
 * Deliberadamente separado do `parseDate` dos prazos, que é ISO estrito: lá o
 * valor vem de um campo de data e formato solto seria erro; aqui o valor já
 * está gravado e a tarefa é ler o que existe.
 *
 * Devolve `null` para o que não dá para ler — `"Ontem, 16:20"` dos planos
 * migrados. Chutar um instante seria inventar quando o trabalho aconteceu.
 */
function timeOf(at: string | Date | undefined): number | null {
  if (!at) return null;

  if (at instanceof Date) return Number.isNaN(at.getTime()) ? null : at.getTime();

  const br = BR_DATE.exec(at.trim());

  if (br) {
    const [, dia, mês, ano, hora, minuto] = br;

    const date = new Date(
      Number(ano),
      Number(mês) - 1,
      Number(dia),
      Number(hora ?? 0),
      Number(minuto ?? 0)
    );

    // `31/02` viraria 3 de março em silêncio. Data que não existe não é data.
    return date.getDate() === Number(dia) && date.getMonth() === Number(mês) - 1
      ? date.getTime()
      : null;
  }

  const time = new Date(at).getTime();
  return Number.isNaN(time) ? null : time;
}

/**
 * O registro cai na janela.
 *
 * Data ilegível fica de fora da janela mas dentro do "desde o início": os
 * planos migrados guardam `"Ontem, 16:20"`, e chutar um instante para eles
 * seria inventar quando o trabalho aconteceu.
 */
function withinWindow(at: string | Date | undefined, from: number | null, to: number): boolean {
  if (from === null) return true;

  const time = timeOf(at);
  return time !== null && time >= from && time <= to;
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function monthBucket(at: string | Date | undefined): Bucket {
  const time = timeOf(at);
  if (time === null) return VAZIO;

  const date = new Date(time);
  const month = date.getMonth();

  return {
    key: `${date.getFullYear()}-${String(month + 1).padStart(2, "0")}`,
    label: `${MESES[month]}/${String(date.getFullYear()).slice(2)}`,
  };
}

/**
 * Agrupa e conta.
 *
 * Chave vazia vira "Não definido" e continua aparecendo: artigo sem seção é
 * informação, e escondê-lo faria a soma das linhas não bater com o total.
 */
function group(items: Bucket[], breakdown: string): PanelResult {
  const total = items.length;

  if (breakdown === "none") {
    return { total, rows: [{ key: "total", label: "Total", value: total }] };
  }

  const counts = new Map<string, { label: string; value: number }>();

  for (const item of items) {
    const key = item.key || SEM_VALOR;
    const label = item.key ? item.label : "Não definido";

    counts.set(key, { label, value: (counts.get(key)?.value ?? 0) + 1 });
  }

  const rows = [...counts.entries()].map(([key, item]) => ({ key, ...item }));

  /*
    Mês ordena cronologicamente; o resto por tamanho. Ordenar mês por volume
    esconderia a tendência, que é a única coisa que uma série temporal tem a
    dizer.
  */
  if (breakdown === "month") {
    rows.sort((a, b) => a.key.localeCompare(b.key));
  } else {
    rows.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "pt-BR"));
  }

  return { total, rows };
}

const STATUS_EVENTS = new Set(["article_status_changed", "plan_status_changed"]);

const SUBJECT_KIND_LABEL: Record<string, string> = {
  article: "Artigo",
  plan: "Plano",
};

/**
 * Executa a especificação sobre os dados.
 *
 * Pura e recebendo `now`, como todo cálculo temporal do produto: é o que
 * permite testar "últimos 30 dias" sem congelar o relógio.
 */
export function runPanel(spec: PanelSpec, data: PanelData, now: Date): PanelResult {
  const to = now.getTime();
  const from = spec.window === null ? null : to - spec.window * DAY;

  const inScope = (projectId: string) =>
    !spec.scopedToProject || !data.activeProjectId || projectId === data.activeProjectId;

  /**
   * A equipe por trás de uma atribuição.
   *
   * A referência guardada pode ser equipe, pessoa ou — nos registros antigos —
   * um nome solto. `migrateAssignment` resolve os três, e uma pessoa responde
   * pela equipe dela: medir por equipe é o recorte desta fase.
   */
  const teamOf = (ref: string | undefined): Bucket => {
    const resolved = migrateAssignment(ref ?? "", data.people, data.teams);

    const team = data.teams.find((item) => item.id === resolved);
    if (team) return { key: team.id, label: team.name };

    const person = data.people.find((item) => item.id === resolved);
    const own = person && data.teams.find((item) => item.id === person.teamId);

    return own ? { key: own.id, label: own.name } : VAZIO;
  };

  const sectionOf = (sectionId: string): Bucket => {
    const section = findSection(data.taxonomy, sectionId);
    return section ? { key: section.id, label: section.name } : VAZIO;
  };

  const categoryOf = (sectionId: string): Bucket => {
    const section = findSection(data.taxonomy, sectionId);
    const category = section ? findCategory(data.taxonomy, section.categoryId) : undefined;

    return category ? { key: category.id, label: category.name } : VAZIO;
  };

  const projectOf = (projectId: string): Bucket => {
    const project = data.projects.find((item) => item.id === projectId);
    return project ? { key: project.id, label: project.name } : VAZIO;
  };

  const entryOf = (entries: { id: string; name: string }[], id: string): Bucket => {
    const entry = entries.find((item) => item.id === id);
    return entry ? { key: entry.id, label: entry.name } : VAZIO;
  };

  const articleBucket = (article: KnowledgeArticle): Bucket => {
    switch (spec.breakdown) {
      case "status":
        return { key: article.status, label: articleStatusLabel[article.status] };
      case "category":
        return categoryOf(article.sectionId);
      case "section":
        return sectionOf(article.sectionId);
      case "genre":
        return entryOf(data.taxonomy.genres, article.genreId);
      case "team":
        return teamOf(article.author);
      case "project":
        return projectOf(article.projectId);
      case "month":
        return monthBucket(article.createdAt);
      default:
        return VAZIO;
    }
  };

  const planBucket = (plan: PlanWorkspaceItem): Bucket => {
    switch (spec.breakdown) {
      case "status":
        return { key: plan.status, label: planStatusLabel[plan.status] };
      case "team":
        return teamOf(plan.owner);
      case "project":
        return projectOf(plan.projectId);
      case "month":
        return monthBucket(plan.createdAt);
      default:
        return VAZIO;
    }
  };

  const analysisBucket = (analysis: AnalysisRecord): Bucket => {
    switch (spec.breakdown) {
      case "status":
        return { key: analysis.status, label: analysisStatusLabel[analysis.status] };
      case "project":
        return projectOf(analysis.projectId);
      case "month":
        return monthBucket(analysis.startedAt);
      default:
        return VAZIO;
    }
  };

  /*
    Cada registro entra com a data que o situa no tempo. A janela é aplicada
    depois, num lugar só: é o que permite contar quantos ficaram de fora por
    data ilegível e dizer isso na tela, em vez de devolver um total menor sem
    explicação nenhuma.
  */
  interface Entry {
    at: string | Date | undefined;
    bucket: Bucket;
  }

  let entries: Entry[] = [];

  switch (spec.source) {
    case "articles": {
      entries = data.articles
        .filter((article) => inScope(article.projectId))
        .map((article) => ({ at: article.createdAt, bucket: articleBucket(article) }));
      break;
    }

    case "plans": {
      entries = data.plans
        .filter((plan) => inScope(plan.projectId))
        .map((plan) => ({ at: plan.createdAt, bucket: planBucket(plan) }));
      break;
    }

    case "tickets": {
      entries = data.tickets
        .filter((ticket) => inScope(ticket.projectId))
        .map((ticket) => ({
          at: ticket.date,
          bucket:
            spec.breakdown === "project"
              ? projectOf(ticket.projectId)
              : spec.breakdown === "month"
                ? monthBucket(ticket.date)
                : VAZIO,
        }));
      break;
    }

    case "analyses": {
      entries = data.analyses
        .filter((analysis) => inScope(analysis.projectId))
        .map((analysis) => ({ at: analysis.startedAt, bucket: analysisBucket(analysis) }));
      break;
    }

    case "opportunities": {
      /*
        A oportunidade não tem data própria: ela nasce e vive dentro da análise.
        A janela é a da análise — o mais próximo da verdade que existe sem
        inventar um instante para ela.
      */
      entries = data.analyses
        .filter((analysis) => inScope(analysis.projectId))
        .flatMap((analysis) =>
          analysis.result.opportunities.map((opportunity) => ({
            at: analysis.startedAt,
            bucket:
              spec.breakdown === "status"
                ? {
                    key: opportunity.status,
                    label: OpportunityStatusLabel[opportunity.status],
                  }
                : spec.breakdown === "type"
                  ? entryOf(data.taxonomy.opportunityTypes, opportunity.type)
                  : spec.breakdown === "project"
                    ? projectOf(analysis.projectId)
                    : VAZIO,
          }))
        );
      break;
    }

    case "arrivals": {
      const stage = spec.stage || "published";

      entries = data.events
        .filter(
          (event) =>
            STATUS_EVENTS.has(event.type) &&
            event.transition?.to === stage &&
            inScope(event.projectId)
        )
        .map((event) => ({
          at: event.at,
          bucket:
            spec.breakdown === "kind"
              ? {
                  key: event.subject.kind,
                  label: SUBJECT_KIND_LABEL[event.subject.kind] ?? event.subject.kind,
                }
              : spec.breakdown === "project"
                ? projectOf(event.projectId)
                : spec.breakdown === "month"
                  ? monthBucket(event.at)
                  : VAZIO,
        }));
      break;
    }
  }

  const dentro = entries.filter((entry) => withinWindow(entry.at, from, to));

  const result = group(
    dentro.map((entry) => entry.bucket),
    spec.breakdown
  );

  /*
    Registro cuja data não dá para ler.
    O atendimento guarda `"15/07/2026"` e o plano migrado guarda
    `"Ontem, 16:20"`. O primeiro passou a ser lido; o segundo não tem como.
    Ficar de fora é correto — sumir sem aviso não é, porque quem lê veria zero
    com registros na tela e não teria como saber por quê.
  */
  const ressalvas: string[] = [];

  const ilegíveis =
    from === null ? 0 : entries.filter((entry) => timeOf(entry.at) === null).length;

  if (ilegíveis > 0) {
    const plural = ilegíveis > 1;

    ressalvas.push(
      `${ilegíveis} registro${plural ? "s" : ""} ${plural ? "ficaram" : "ficou"} de fora: a data ${
        plural ? "deles" : "dele"
      } foi gravada num formato que não dá para situar no tempo, e ${
        plural ? "eles só aparecem" : "ele só aparece"
      } na janela "Desde o início".`
    );
  }

  /*
    Chegadas leem o destino da transição, campo que só existe nos eventos
    gravados a partir da sprint de indicadores. Um evento antigo não deixa de
    ter acontecido por não saber dizer para onde foi — e somar os dois como se
    fossem a mesma coisa produziria um número que ninguém consegue conferir.
  */
  if (spec.source === "arrivals") {
    const legacy = data.events.filter(
      (event) => STATUS_EVENTS.has(event.type) && event.transition === undefined
    ).length;

    if (legacy > 0) {
      const plural = legacy > 1;

      ressalvas.push(
        `${legacy} mudança${plural ? "s" : ""} de estágio ${
          plural ? "foram registradas" : "foi registrada"
        } antes de o histórico guardar o destino e não ${
          plural ? "entram" : "entra"
        } nesta contagem.`
      );
    }
  }

  // As duas ressalvas podem valer ao mesmo tempo, e a segunda não apaga a
  // primeira: cada uma explica uma parte diferente do que falta no número.
  if (ressalvas.length > 0) result.caveat = ressalvas.join(" ");

  return result;
}
