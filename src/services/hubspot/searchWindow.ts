/**
 * Que pedaço do tempo a busca alcança.
 *
 * Era uma lista de meses, de 1 a 12, e o mês é grande demais para a pergunta
 * mais comum: quem acabou de atender quer o dia, e quem volta de segunda quer a
 * semana. Puxar um mês para achar o que caiu ontem custa cento e dez páginas de
 * listagem contra o servidor do suporte.
 *
 * Os atalhos vão do dia ao ano, e o intervalo livre existe para o que os
 * atalhos não alcançam: "só agosto de 2025" não é uma janela contada para trás
 * a partir de hoje, e forçá-la num atalho traria dez meses para achar um.
 */

import { toIsoDate } from "@/lib/dates";

export interface AtalhoDeJanela {
  id: string;
  label: string;
  /** Quantos dias para trás a partir de agora. */
  dias: number;
}

/**
 * Os atalhos, do mais curto ao mais longo.
 *
 * Em dias, e não em meses, porque mês não tem tamanho fixo: "3 meses" contado
 * com `setMonth` cai em dias diferentes conforme o mês de partida, e a janela
 * de uma execução não bateria com a da seguinte.
 */
export const ATALHOS: AtalhoDeJanela[] = [
  { id: "1d", label: "1 dia", dias: 1 },
  { id: "3d", label: "3 dias", dias: 3 },
  { id: "7d", label: "1 semana", dias: 7 },
  { id: "14d", label: "2 semanas", dias: 14 },
  { id: "30d", label: "1 mês", dias: 30 },
  { id: "90d", label: "3 meses", dias: 90 },
  { id: "180d", label: "6 meses", dias: 180 },
  { id: "365d", label: "12 meses", dias: 365 },
];

/** O atalho de partida. Curto de propósito: a busca custa contra o suporte. */
export const ATALHO_PADRAO = "7d";

export type Janela =
  | { tipo: "atalho"; id: string }
  | { tipo: "intervalo"; de: string; ate: string };

export interface Periodo {
  /** Começo da janela, em ISO completo. */
  desde: string;
  /**
   * Fim da janela, em ISO completo, ou vazio quando a janela vai até agora.
   *
   * Só o intervalo livre tem fim: um atalho é sempre "de N dias atrás até
   * agora", e dar-lhe um fim seria inventar um limite que ninguém pediu.
   */
  ate: string;
}

export interface JanelaInvalida {
  erro: string;
}

const DIA = 24 * 60 * 60 * 1000;

/**
 * Traduz a escolha em instantes, ou diz por que não dá.
 *
 * `agora` entra como valor para a função continuar pura: ela é testada, e ler
 * o relógio aqui dentro tornaria o teste dependente do dia em que roda.
 */
export function resolverJanela(janela: Janela, agora: Date): Periodo | JanelaInvalida {
  if (janela.tipo === "atalho") {
    const atalho = ATALHOS.find((item) => item.id === janela.id);

    if (!atalho) return { erro: "Período desconhecido." };

    return { desde: new Date(agora.getTime() - atalho.dias * DIA).toISOString(), ate: "" };
  }

  /*
    Dia de calendário, e não instante: `lib/dates` recusa o que não dá para
    situar no tempo em vez de deixar `new Date` inventar uma data. O fim do
    intervalo é o **fim** do dia escolhido, senão escolher hoje e hoje devolve
    uma janela de duração zero e a busca não traz nada.
  */
  const de = toIsoDate(janela.de);
  const ate = toIsoDate(janela.ate);

  if (de === "" || ate === "") return { erro: "Informe as duas datas." };
  if (de > ate) return { erro: "A data inicial vem depois da final." };

  const [ai, mi, di] = de.split("-").map(Number);
  const [af, mf, df] = ate.split("-").map(Number);

  return {
    desde: new Date(ai, mi - 1, di, 0, 0, 0, 0).toISOString(),
    ate: new Date(af, mf - 1, df, 23, 59, 59, 999).toISOString(),
  };
}

export function janelaInvalida(valor: Periodo | JanelaInvalida): valor is JanelaInvalida {
  return "erro" in valor;
}

/** Como a janela é dita no histórico e na tela. */
export function rotuloDaJanela(janela: Janela): string {
  if (janela.tipo === "atalho") {
    return ATALHOS.find((item) => item.id === janela.id)?.label ?? janela.id;
  }

  return `${janela.de} a ${janela.ate}`;
}
