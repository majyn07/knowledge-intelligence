import type { ActivityEvent } from "@/models/ActivityEvent";

/**
 * O que o evento estruturado passou a permitir.
 *
 * Antes dele o histórico sabia que **houve** mudança de estágio, mas não para
 * onde: a transição vivia só no texto do `detail`. "Quantos artigos foram
 * publicados neste mês", que é a pergunta da VISION sobre reduzir recorrência,
 * não tinha resposta possível sem interpretar frase.
 */

const STATUS_EVENTS = new Set(["article_status_changed", "plan_status_changed"]);

function inWindow(at: string, from: number, to: number) {
  const time = new Date(at).getTime();
  return !Number.isNaN(time) && time >= from && time <= to;
}

/**
 * Quanto do histórico consegue responder por destino.
 *
 * Existe para a tela poder dizer que o número é parcial. Eventos gravados
 * antes do campo existir não têm transição, e preenchê-los agora exigiria
 * interpretar o texto, que é o problema que o campo resolve. Número
 * incompleto apresentado como completo é pior que número com ressalva.
 */
export function transitionCoverage(events: ActivityEvent[]) {
  const stageEvents = events.filter((event) => STATUS_EVENTS.has(event.type));
  const structured = stageEvents.filter((event) => event.transition !== undefined);

  return {
    total: stageEvents.length,
    structured: structured.length,
    legacy: stageEvents.length - structured.length,
    isComplete: stageEvents.length === structured.length,
  };
}

/** Quantas vezes algo chegou a um estágio, na janela. */
export function countArrivals(
  events: ActivityEvent[],
  stage: string,
  window: { from: number; to: number },
  kind?: ActivityEvent["subject"]["kind"]
): number {
  return events.filter(
    (event) =>
      STATUS_EVENTS.has(event.type) &&
      event.transition?.to === stage &&
      (kind === undefined || event.subject.kind === kind) &&
      inWindow(event.at, window.from, window.to)
  ).length;
}

export interface FunnelStep {
  stage: string;
  label: string;
  arrivals: number;
}

/**
 * O funil do ciclo.
 *
 * Conta **chegadas** e não registros parados no estágio: um artigo que passou
 * por revisão e foi publicado passou pelos dois, e contar só onde ele está
 * agora esconderia metade do caminho.
 *
 * Por isso os números não decrescem necessariamente, e é essa a informação:
 * onde as chegadas caem é onde o fluxo trava.
 */
export function buildFunnel(
  events: ActivityEvent[],
  steps: { stage: string; label: string }[],
  window: { from: number; to: number },
  kind?: ActivityEvent["subject"]["kind"]
): FunnelStep[] {
  return steps.map((step) => ({
    ...step,
    arrivals: countArrivals(events, step.stage, window, kind),
  }));
}

/**
 * Tempo médio até chegar a um estágio, em dias.
 *
 * Mede da primeira aparição do registro no histórico até a chegada, e só para
 * quem de fato chegou. Incluir quem ainda não chegou puxaria a média para
 * baixo, dizendo que o ciclo é mais rápido do que é.
 *
 * Devolve `null` quando ninguém chegou: média de nada é nada, não zero.
 */
export function averageDaysTo(
  events: ActivityEvent[],
  stage: string,
  window: { from: number; to: number }
): number | null {
  const first = new Map<string, number>();

  // O histórico é append-only, mas a ordem de leitura não é garantida.
  for (const event of events) {
    const key = `${event.subject.kind}:${event.subject.id}`;
    const time = new Date(event.at).getTime();
    if (Number.isNaN(time)) continue;

    const known = first.get(key);
    if (known === undefined || time < known) first.set(key, time);
  }

  const spans: number[] = [];

  for (const event of events) {
    if (!STATUS_EVENTS.has(event.type)) continue;
    if (event.transition?.to !== stage) continue;
    if (!inWindow(event.at, window.from, window.to)) continue;

    const key = `${event.subject.kind}:${event.subject.id}`;
    const start = first.get(key);
    const arrival = new Date(event.at).getTime();

    if (start === undefined || Number.isNaN(arrival)) continue;

    spans.push(Math.max(0, arrival - start));
  }

  if (spans.length === 0) return null;

  const média = spans.reduce((sum, span) => sum + span, 0) / spans.length;
  return Math.round((média / (24 * 60 * 60 * 1000)) * 10) / 10;
}

/**
 * Identificadores dos registros que chegaram a um estágio.
 *
 * É o que torna o número clicável: indicador que não abre é indicador em que
 * ninguém confia, e "12 publicados" sem poder ver quais é um número que a
 * pessoa precisa aceitar em vez de conferir.
 */
export function arrivalsAt(
  events: ActivityEvent[],
  stage: string,
  window: { from: number; to: number },
  kind?: ActivityEvent["subject"]["kind"]
): { id: string; label: string; at: string }[] {
  const seen = new Set<string>();
  const result: { id: string; label: string; at: string }[] = [];

  for (const event of events) {
    if (!STATUS_EVENTS.has(event.type)) continue;
    if (event.transition?.to !== stage) continue;
    if (kind !== undefined && event.subject.kind !== kind) continue;
    if (!inWindow(event.at, window.from, window.to)) continue;

    // O mesmo registro pode chegar duas vezes ao estágio, recolhido e
    // publicado de novo. Para a lista, ele é um.
    if (seen.has(event.subject.id)) continue;
    seen.add(event.subject.id);

    result.push({ id: event.subject.id, label: event.subject.label, at: event.at });
  }

  return result.sort((a, b) => b.at.localeCompare(a.at));
}
