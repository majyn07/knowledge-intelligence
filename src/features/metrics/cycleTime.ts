import { toIsoDate } from "@/lib/dates";
import type { ActivityEvent } from "@/models/ActivityEvent";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { Ticket } from "@/models/Ticket";

/**
 * Quanto tempo o cliente espera entre perguntar e a resposta ficar publicada.
 *
 * É a pergunta que uma gestora faz, e é a única do painel que **atravessa
 * registros**: o resto mede um artigo indo de rascunho a publicado, ou um plano
 * andando. Aqui a régua começa no dia em que o atendimento aconteceu e termina
 * no evento que publicou o artigo que nasceu dele.
 *
 * `averageDaysTo` não responde isso e não deveria: ela mede da primeira
 * aparição **do registro** no histórico, então para um artigo ela conta a partir
 * de quando alguém começou a escrevê-lo. Isso é o tempo da redação, não o do
 * ciclo, e a diferença entre os dois é justamente onde o trabalho fica parado.
 */

export interface CycleTimeResult {
  /** Média de dias, ou `null` quando nada fechou o ciclo. */
  averageDays: number | null;
  /** A mediana, que é a que resiste a um artigo que ficou dois anos parado. */
  medianDays: number | null;
  /** Quantos pares atendimento-artigo entraram na conta. */
  measured: number;
  /**
   * Artigos que nasceram de um atendimento, foram publicados, e mesmo assim
   * ficaram de fora. É ressalva, não silêncio: número parcial apresentado como
   * completo é pior que número com ressalva.
   */
  ignored: {
    /** O atendimento de origem não está mais aqui. */
    semAtendimento: number;
    /** A data do atendimento não dá para situar no tempo. */
    semDataUtil: number;
    /** Publicado antes da data do atendimento: alguém corrigiu uma das duas. */
    ordemImpossivel: number;
  };
  /** Os pares medidos, do mais demorado para o mais rápido. */
  slowest: CycleTimeSpan[];
}

export interface CycleTimeSpan {
  articleId: string;
  articleTitle: string;
  ticketId: string;
  days: number;
}

const DIA = 24 * 60 * 60 * 1000;

/** Quantos dos mais demorados a tela mostra. Fila para agir, não relatório. */
const NA_LISTA = 5;

/**
 * O instante em que cada artigo foi publicado pela primeira vez.
 *
 * A primeira, e não a última: um artigo recolhido para revisão e publicado de
 * novo fechou o ciclo na primeira vez. A segunda é manutenção, e contá-la
 * faria uma correção de vírgula parecer atraso de meses.
 */
function primeiraPublicacao(events: ActivityEvent[]): Map<string, number> {
  const quando = new Map<string, number>();

  for (const event of events) {
    if (event.subject.kind !== "article") continue;
    if (event.transition?.to !== "published") continue;

    const instante = new Date(event.at).getTime();
    if (Number.isNaN(instante)) continue;

    const conhecido = quando.get(event.subject.id);
    if (conhecido === undefined || instante < conhecido) {
      quando.set(event.subject.id, instante);
    }
  }

  return quando;
}

export function cycleTime(
  articles: KnowledgeArticle[],
  tickets: Ticket[],
  events: ActivityEvent[]
): CycleTimeResult {
  const publicadoEm = primeiraPublicacao(events);
  const porId = new Map(tickets.map((ticket) => [ticket.id, ticket]));

  const ignored = { semAtendimento: 0, semDataUtil: 0, ordemImpossivel: 0 };
  const spans: CycleTimeSpan[] = [];

  for (const article of articles) {
    const ticketId = article.source?.ticketId;
    if (!ticketId) continue;

    const publicado = publicadoEm.get(article.id);
    if (publicado === undefined) continue;

    const ticket = porId.get(ticketId);

    if (!ticket) {
      ignored.semAtendimento += 1;
      continue;
    }

    /*
      A data do atendimento é dia de calendário, e o `lib/dates` existe para
      não a tratar como instante: `new Date("2026-08-01")` é 31 de julho aqui.
      Meia-noite local do dia é o começo honesto da contagem.
    */
    const dia = toIsoDate(ticket.date);

    if (dia === "") {
      ignored.semDataUtil += 1;
      continue;
    }

    const [ano, mes, data] = dia.split("-").map(Number);
    const inicio = new Date(ano, mes - 1, data).getTime();

    if (publicado < inicio) {
      ignored.ordemImpossivel += 1;
      continue;
    }

    spans.push({
      articleId: article.id,
      articleTitle: article.title,
      ticketId,
      days: Math.round(((publicado - inicio) / DIA) * 10) / 10,
    });
  }

  if (spans.length === 0) {
    return { averageDays: null, medianDays: null, measured: 0, ignored, slowest: [] };
  }

  const dias = spans.map((span) => span.days).sort((a, b) => a - b);
  const meio = Math.floor(dias.length / 2);

  return {
    averageDays: Math.round((dias.reduce((soma, d) => soma + d, 0) / dias.length) * 10) / 10,
    /*
      A mediana vai junto porque a média mente aqui. Um artigo antigo publicado
      hoje a partir de um atendimento de dois anos atrás sozinho leva a média
      para centenas de dias, e quem lê conclui que o ciclo é lento quando o
      normal são duas semanas.
    */
    medianDays:
      dias.length % 2 === 0
        ? Math.round(((dias[meio - 1] + dias[meio]) / 2) * 10) / 10
        : dias[meio],
    measured: spans.length,
    ignored,
    slowest: [...spans].sort((a, b) => b.days - a.days).slice(0, NA_LISTA),
  };
}
