/**
 * O que visitar da caixa do suporte, e o que já está em dia.
 *
 * A listagem é barata, cem conversas por requisição, e devolve carimbo de última
 * mensagem. Ler a conversa é caro: uma requisição por conversa, e são dezenas de
 * milhares na caixa inteira.
 *
 * Então a listagem decide e a leitura obedece. É a mesma divisão da varredura
 * do portal, e pela mesma razão: sem ela, continuar uma varredura interrompida
 * custaria a varredura inteira de novo.
 */

export interface ConversaListada {
  id: string;
  criadoEm: string;
  /** Carimbo da última mensagem. É por ele que se sabe se a conversa andou. */
  ultimaMensagemEm?: string;
}

/** O que já existe aqui, por identificador da conversa. */
export interface AtendimentoConhecido {
  externalId: string;
  /** O carimbo que registramos na última varredura. */
  ultimaMensagemEm: string;
}

export interface PlanoDeVarredura {
  /** Conversas a visitar, dos mais recentes para os mais antigos. */
  visitar: ConversaListada[];
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
 * O carimbo que situa a conversa no tempo.
 *
 * A última mensagem vence a criação de propósito: atendimento aberto há cinco
 * meses e respondido ontem é trabalho de agora, e a data de criação o jogaria
 * para fora da janela justamente quando ele está vivo.
 */
export function instanteDo(conversa: ConversaListada): string {
  return conversa.ultimaMensagemEm || conversa.criadoEm;
}

/**
 * Monta o plano.
 *
 * `desde` é o começo da janela e `ate` o fim, em ISO. Conversa sem carimbo nenhum fica de fora:
 * não dá para saber se ele é de ontem ou de 2024, e visitar por via das
 * dúvidas custaria uma requisição por chute.
 */
export function planejarVarredura(
  conversas: ConversaListada[],
  conhecidos: AtendimentoConhecido[],
  desde: string,
  /*
    O fim da janela, quando há um. Vazio significa "até agora", que é o caso de
    todo atalho: eles são contados para trás a partir do instante da busca. Só o
    intervalo livre tem fim, e ele existe porque "só agosto de 2025" não é uma
    janela contada para trás — forçá-la num atalho traria dez meses para achar
    um.
  */
  ate = ""
): PlanoDeVarredura {
  const registrado = new Map(conhecidos.map((item) => [item.externalId, item.ultimaMensagemEm]));

  const visitar: ConversaListada[] = [];
  let emDia = 0;
  let mudaram = 0;
  let novos = 0;
  let foraDaJanela = 0;

  for (const conversa of conversas) {
    const instante = instanteDo(conversa);

    if (instante === "" || instante < desde || (ate !== "" && instante > ate)) {
      foraDaJanela += 1;
      continue;
    }

    if (!registrado.has(conversa.id)) {
      novos += 1;
      visitar.push(conversa);
      continue;
    }

    /*
      Já está aqui. Só volta a valer uma requisição se a conversa andou desde a
      última varredura: reler o que não mudou é o custo que faz alguém deixar
      de reexecutar, e uma varredura que ninguém reexecuta envelhece.
    */
    if (instante > (registrado.get(conversa.id) ?? "")) {
      mudaram += 1;
      visitar.push(conversa);
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
