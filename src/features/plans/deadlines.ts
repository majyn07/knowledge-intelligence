/**
 * Prazo, atraso e parada.
 *
 * Tudo aqui é função pura recebendo `now`, e não lendo o relógio: é o que
 * permite testar "vence amanhã" sem congelar o tempo, e o mesmo critério que
 * os indicadores por período já seguiam.
 */

const DAY = 24 * 60 * 60 * 1000;

/**
 * Quantos dias sem movimento contam como parado.
 *
 * Um número só, e não um por estágio. Um plano em análise e um em revisão têm
 * ritmos diferentes, mas o produto ainda não sabe qual é o ritmo normal de
 * cada um — inventar cinco limiares seria fingir uma medição que não houve.
 * Quando o histórico tiver volume, os números saem dele.
 */
export const STALLED_AFTER_DAYS = 7;

/**
 * Data só é data em ISO 8601.
 *
 * `new Date("15 jul. 2026")` **funciona** em alguns motores e falha em outros —
 * o Node aqui devolve 15 de julho, e outro navegador pode devolver `Invalid
 * Date` ou outro dia. Aceitar isso significaria que o mesmo registro mostraria
 * prazos diferentes em máquinas diferentes, sem nada indicando o problema.
 *
 * Ser estrito não custa informação: prazo é campo novo e sempre nasce ISO. O
 * que é recusado aqui são as datas de exibição dos planos antigos, que nunca
 * foram instantes — e a tela continua mostrando o texto original delas.
 */
const ISO = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}|$)/;

export function parseDate(value: string | Date | undefined): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const text = value.trim();
  if (!ISO.test(text)) return null;

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;

  /*
    `new Date("2026-02-30")` não falha: transborda para 2 de março, em
    silêncio. Um prazo digitado errado viraria outra data sem nada indicando —
    e "atrasado" calculado sobre ela seria mentira com aparência de número.

    A conferência vale só para a forma `YYYY-MM-DD`, que o JavaScript lê como
    UTC. Com hora e sem fuso — `2026-08-20T22:00` — a leitura é no horário
    local, e comparar componentes UTC recusaria datas legítimas do fim do dia
    em qualquer fuso a oeste de Greenwich. É também a forma que o campo de
    data do formulário produz, que é onde o erro de digitação acontece.
  */
  if (text.length === 10) {
    const [ano, mes, dia] = text.split("-").map(Number);

    const rollover =
      date.getUTCFullYear() !== ano ||
      date.getUTCMonth() + 1 !== mes ||
      date.getUTCDate() !== dia;

    if (rollover) return null;
  }

  return date;
}

/**
 * Dias inteiros até o prazo. Negativo é atraso.
 *
 * Compara dias e não instantes: um prazo para hoje não vence às 00:01, e
 * quem olha a tela às 18h não deveria ver "atrasado 1 dia" por causa do
 * horário em que o registro foi criado.
 */
export function daysUntil(due: string | Date | undefined, now: Date): number | null {
  const date = parseDate(due);
  if (!date) return null;

  const startOfDay = (value: Date) =>
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());

  return Math.round((startOfDay(date) - startOfDay(now)) / DAY);
}

export type DeadlineState = "sem-prazo" | "atrasado" | "hoje" | "proximo" | "distante";

/**
 * Como o prazo deve ser lido na tela.
 *
 * "Próximo" começa três dias antes porque é o horizonte em que ainda dá para
 * agir. Antes disso, destacar seria ruído; depois, é tarde.
 */
export function deadlineState(due: string | Date | undefined, now: Date): DeadlineState {
  const days = daysUntil(due, now);

  if (days === null) return "sem-prazo";
  if (days < 0) return "atrasado";
  if (days === 0) return "hoje";
  if (days <= 3) return "proximo";

  return "distante";
}

export function deadlineLabel(due: string | Date | undefined, now: Date): string {
  const days = daysUntil(due, now);
  if (days === null) return "";

  if (days === 0) return "vence hoje";
  if (days === 1) return "vence amanhã";
  if (days === -1) return "atrasado 1 dia";
  if (days < 0) return `atrasado ${Math.abs(days)} dias`;

  return `vence em ${days} dias`;
}

/**
 * Há quantos dias o registro não se move.
 *
 * A data vem do último evento do histórico, e não de `updatedAt`: o histórico
 * registra o que **aconteceu**, e é o único campo que não muda por uma
 * gravação incidental.
 */
export function daysSince(last: string | Date | undefined, now: Date): number | null {
  const date = parseDate(last);
  if (!date) return null;

  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY));
}

/**
 * Parado é diferente de atrasado.
 *
 * Um plano sem prazo nenhum pode estar parado; um plano com prazo distante
 * também. São perguntas separadas, e juntá-las esconderia metade do problema.
 *
 * Registro já concluído não está parado — ele terminou.
 */
export function isStalled(
  last: string | Date | undefined,
  now: Date,
  { finished = false }: { finished?: boolean } = {}
): boolean {
  if (finished) return false;

  const days = daysSince(last, now);
  return days !== null && days >= STALLED_AFTER_DAYS;
}

/**
 * Ordem da fila de atenção.
 *
 * Atrasado primeiro, depois o que vence hoje, depois o parado, depois o resto.
 * Sem isso "precisa de atenção" continua sendo lista: tudo junto, e a pessoa
 * decidindo por conta própria o que olhar antes.
 */
export function attentionRank(input: {
  due?: string | Date;
  lastActivityAt?: string | Date;
  finished?: boolean;
  now: Date;
}): number {
  const { due, lastActivityAt, finished, now } = input;

  const state = deadlineState(due, now);

  if (state === "atrasado") return 0;
  if (state === "hoje") return 1;
  if (isStalled(lastActivityAt, now, { finished })) return 2;
  if (state === "proximo") return 3;

  return 4;
}
