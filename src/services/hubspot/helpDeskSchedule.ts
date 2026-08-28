/**
 * O que visitar da caixa do suporte, e o que já está em dia.
 *
 * A listagem é barata, cem fios por requisição, e devolve carimbo de última
 * mensagem. Ler o fio é caro: uma requisição por fio, e são dezenas de
 * milhares na caixa inteira.
 *
 * Então a listagem decide e a leitura obedece. É a mesma divisão da varredura
 * do portal, e pela mesma razão: sem ela, continuar uma varredura interrompida
 * custaria a varredura inteira de novo.
 */

export interface FioListado {
  id: string;
  criadoEm: string;
  /** Carimbo da última mensagem. É por ele que se sabe se o fio andou. */
  ultimaMensagemEm?: string;
}

/** O que já existe aqui, por identificador do fio. */
export interface AtendimentoConhecido {
  externalId: string;
  /** O carimbo que registramos na última varredura. */
  ultimaMensagemEm: string;
}

export interface PlanoDeVarredura {
  /** Fios a visitar, dos mais recentes para os mais antigos. */
  visitar: FioListado[];
  /** Já estão aqui e não mudaram desde a última vez. */
  emDia: number;
  /** Estão aqui e ganharam mensagem nova. */
  mudaram: number;
  /** Ainda não existem aqui. */
  novos: number;
  /** Ficaram fora da janela escolhida. */
  foraDaJanela: number;
}

/**
 * O carimbo que situa o fio no tempo.
 *
 * A última mensagem vence a criação de propósito: atendimento aberto há cinco
 * meses e respondido ontem é trabalho de agora, e a data de criação o jogaria
 * para fora da janela justamente quando ele está vivo.
 */
export function instanteDo(fio: FioListado): string {
  return fio.ultimaMensagemEm || fio.criadoEm;
}

/**
 * Monta o plano.
 *
 * `desde` é o começo da janela, em ISO. Fio sem carimbo nenhum fica de fora:
 * não dá para saber se ele é de ontem ou de 2024, e visitar por via das
 * dúvidas custaria uma requisição por chute.
 */
export function planejarVarredura(
  fios: FioListado[],
  conhecidos: AtendimentoConhecido[],
  desde: string
): PlanoDeVarredura {
  const registrado = new Map(conhecidos.map((item) => [item.externalId, item.ultimaMensagemEm]));

  const visitar: FioListado[] = [];
  let emDia = 0;
  let mudaram = 0;
  let novos = 0;
  let foraDaJanela = 0;

  for (const fio of fios) {
    const instante = instanteDo(fio);

    if (instante === "" || instante < desde) {
      foraDaJanela += 1;
      continue;
    }

    if (!registrado.has(fio.id)) {
      novos += 1;
      visitar.push(fio);
      continue;
    }

    /*
      Já está aqui. Só volta a valer uma requisição se o fio andou desde a
      última varredura: reler o que não mudou é o custo que faz alguém deixar
      de reexecutar, e uma varredura que ninguém reexecuta envelhece.
    */
    if (instante > (registrado.get(fio.id) ?? "")) {
      mudaram += 1;
      visitar.push(fio);
    } else {
      emDia += 1;
    }
  }

  /*
    Do mais recente para o mais antigo. A listagem chega ao contrário, e quem
    para a varredura no meio fica com os últimos meses, que é o que interessa,
    em vez de ficar com o começo da janela.
  */
  visitar.sort((a, b) => instanteDo(b).localeCompare(instanteDo(a)));

  return { visitar, emDia, mudaram, novos, foraDaJanela };
}

/** O começo da janela, contado para trás a partir de agora. */
export function janelaDeMeses(agora: Date, meses: number): string {
  const inicio = new Date(agora);
  inicio.setMonth(inicio.getMonth() - meses);

  return inicio.toISOString();
}

/** Quantos meses a varredura traz por padrão. */
export const MESES_PADRAO = 3;
