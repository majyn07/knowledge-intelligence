/**
 * Data de calendário — o dia, sem hora e sem fuso.
 *
 * O produto guarda instante em ISO completo quando o que importa é o momento
 * (histórico, criação, atualização). Aqui é outra coisa: a data do atendimento
 * é o **dia em que ele aconteceu**, e dia não tem fuso. Tratá-lo como instante
 * é como o mesmo registro passa a aparecer em 19/08 para quem está a oeste e
 * 20/08 para quem está a leste.
 *
 * Por isso tudo aqui trabalha sobre os componentes do texto, e nunca sobre um
 * `Date`: `new Date("2026-08-20")` é meia-noite UTC, que no Brasil é o dia 19.
 */

/** `aaaa-mm-dd` — o formato guardado. */
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `dd/mm/aaaa` — o formato que os registros anteriores guardavam. */
const BR_DAY = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/**
 * O dia existe no calendário.
 *
 * `31/02` não existe, e `new Date` o converteria em 3 de março sem avisar —
 * o atendimento apareceria num mês em que nada aconteceu.
 */
function isRealDay(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Converte para `aaaa-mm-dd`, ou devolve vazio.
 *
 * Reconhece o formato brasileiro porque é o que está gravado nos atendimentos
 * desde a primeira versão — converter não é adivinhar, é ler o que existe. O
 * que não é nenhum dos dois vira vazio: um campo de texto livre aceitava
 * "ontem", e "ontem" não é uma data.
 */
export function toIsoDate(value: string): string {
  const text = value.trim();

  const iso = ISO_DAY.exec(text);

  if (iso) {
    const [, year, month, day] = iso;
    return isRealDay(Number(year), Number(month), Number(day)) ? text : "";
  }

  const br = BR_DAY.exec(text);

  if (br) {
    const [, day, month, year] = br;
    return isRealDay(Number(year), Number(month), Number(day)) ? `${year}-${month}-${day}` : "";
  }

  return "";
}

/**
 * `aaaa-mm-dd` para `dd/mm/aaaa`, para exibir.
 *
 * Sem passar por `Date`, e por isso sem fuso: a leitura é a mesma em qualquer
 * máquina, e não há divergência de hidratação a suprimir.
 *
 * O que não é data reconhecível é devolvido **como veio**. É o mesmo critério
 * da atribuição que não resolve: o texto que alguém digitou é informação, e
 * apagá-lo seria pior que mostrá-lo.
 */
export function formatDay(value: string): string {
  const iso = ISO_DAY.exec(value.trim());
  if (!iso) return value;

  const [, year, month, day] = iso;
  return `${day}/${month}/${year}`;
}

/**
 * O dia de calendário de um instante, em `aaaa-mm-dd`, no fuso de quem lê.
 *
 * Nunca `toISOString().slice(0, 10)`: aquilo é o dia em Greenwich, e um
 * artigo salvo às 21h de 27 de agosto no Brasil apareceria como 28. Duas
 * gravações a segundos de distância cairiam em dias diferentes, e a
 * comparação marcaria como divergente um campo que não mudou.
 */
export function dayOf(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
