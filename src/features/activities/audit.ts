import { dayOf } from "@/lib/dates";
import { activityTypeLabel, type ActivityEvent, type ActivityType } from "@/models/ActivityEvent";

/**
 * O histórico lido como auditoria.
 *
 * A linha do tempo já existia e responde "o que aconteceu neste projeto". Quem
 * administra pergunta outra coisa: "o que **esta pessoa** fez", "o que
 * aconteceu na semana passada", "quem mexeu nos artigos". A mesma coleção, três
 * cortes que a tela não oferecia.
 *
 * E atravessa iniciativas. A linha do tempo é do projeto ativo, de propósito;
 * auditoria recortada por iniciativa deixaria de fora justamente o que se quer
 * enxergar — a pessoa que trabalhou noutra.
 *
 * Nada aqui é novo dado: eventos são acrescentados e nunca editados, e é isso
 * que faz o histórico servir de auditoria em vez de precisar de um registro
 * paralelo. Um segundo registro divergiria do primeiro, e o segundo é o que
 * ninguém confere.
 */

export interface AuditFilters {
  /** Rótulo de quem realizou, ou `all`. */
  actor: string;
  type: ActivityType | "all";
  /** Dia de calendário, `aaaa-mm-dd`, ou vazio. */
  desde: string;
  ate: string;
  /** Casa em assunto, detalhe e autor. */
  busca: string;
}

export const defaultAuditFilters: AuditFilters = {
  actor: "all",
  type: "all",
  desde: "",
  ate: "",
  busca: "",
};

/**
 * O dia em que o evento aconteceu, no fuso de quem lê.
 *
 * Nunca os dez primeiros caracteres do ISO: aquilo é o dia em Greenwich, e um
 * evento das 21h de 27 de agosto no Brasil cairia em 28. Numa auditoria isso é
 * pior que impreciso — quem procura "o que aconteceu no dia 27" não encontraria
 * o que fez às nove da noite.
 */
export function auditDay(event: ActivityEvent): string {
  const data = new Date(event.at);

  return Number.isNaN(data.getTime()) ? "" : dayOf(data);
}

/** Quem aparece no histórico, para o filtro sair do dado e não de um cadastro. */
export function auditActors(events: readonly ActivityEvent[]): string[] {
  const nomes = new Set<string>();

  for (const event of events) {
    const nome = event.actor.trim();

    if (nome !== "") nomes.add(nome);
  }

  return [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function filterAudit(
  events: readonly ActivityEvent[],
  filters: AuditFilters
): ActivityEvent[] {
  const busca = normalizar(filters.busca.trim());

  const passou = events.filter((event) => {
    if (filters.actor !== "all" && event.actor.trim() !== filters.actor) return false;
    if (filters.type !== "all" && event.type !== filters.type) return false;

    const dia = auditDay(event);

    /*
      Evento com data ilegível fica de fora de janela, e não no meio dela. É a
      mesma regra do painel: o que não dá para situar no tempo não é contado
      como se estivesse dentro. Sem filtro de data ele continua aparecendo.
    */
    if (filters.desde !== "" && (dia === "" || dia < filters.desde)) return false;
    if (filters.ate !== "" && (dia === "" || dia > filters.ate)) return false;

    if (busca === "") return true;

    return normalizar(
      `${event.actor} ${event.subject.label} ${event.detail} ${activityTypeLabel[event.type]}`
    ).includes(busca);
  });

  /* Do mais recente para o mais antigo: auditoria começa pelo que acabou de acontecer. */
  return [...passou].sort((a, b) => b.at.localeCompare(a.at));
}

const COLUNAS = ["Quando", "Quem", "O que", "Assunto", "Tipo do assunto", "Detalhe", "De", "Para"];

/**
 * A auditoria fora da tela.
 *
 * Quem audita precisa levar o resultado para outro lugar — uma planilha, um
 * anexo, uma reunião. Auditoria que só existe dentro do produto obriga a
 * transcrever, e transcrição à mão é onde o registro deixa de bater.
 *
 * Sai o **recorte que está na tela**, e não a coleção inteira: quem exporta
 * acabou de montá-lo.
 */
export function auditToCsv(events: readonly ActivityEvent[]): string {
  const linhas = events.map((event) => [
    event.at,
    event.actor,
    activityTypeLabel[event.type],
    event.subject.label,
    event.subject.kind,
    event.detail,
    event.transition?.from ?? "",
    event.transition?.to ?? "",
  ]);

  return [COLUNAS, ...linhas].map((linha) => linha.map(campo).join(",")).join("\r\n");
}

/**
 * Aspas dobradas e campo entre aspas.
 *
 * Detalhe de evento tem vírgula e quebra de linha dentro; sem isto uma linha
 * vira duas na planilha e a auditoria passa a ter registros que não existem.
 */
function campo(valor: string): string {
  return `"${valor.replace(/"/g, '""')}"`;
}
