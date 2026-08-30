import type { Ticket } from "@/models/Ticket";
import type { TicketClassificationField } from "@/models/TicketClassification";

/**
 * O que mais chega, pelo vocabulário de quem atendeu.
 *
 * "Assuntos que mais chegam" agrupava por palavra em comum, e a tela dizia que
 * era cálculo: vocabulário compartilhado não é a mesma dúvida. O suporte, no
 * entanto, já classifica cada chamado na HubSpot, com o caso em mãos. Contar a
 * classificação declarada é mais forte que deduzir a nossa, e é a diferença
 * entre levar para uma reunião um número que alguém decidiu e um que saiu de
 * uma medida de semelhança.
 *
 * Cada campo tem a sua lista, e os campos não se fundem: são dois pipelines
 * com vocabulários próprios, e um chamado passa por um dos dois. Somar Sintoma
 * (Setup) com Categoria (Suporte) num ranking só misturaria dois vocabulários
 * sem que quem lê tivesse como saber. Quais campos existem é assunto de
 * `TicketClassification`, num lugar só.
 */

export interface ClassificationCount {
  label: string;
  quantos: number;
  /**
   * A fatia sobre os **classificados**, não sobre o total.
   *
   * Dividir pelo total misturaria "isto é raro" com "isto não foi classificado",
   * e as duas frases pedem providências diferentes. Quantos ficaram de fora vai
   * ao lado, escrito.
   */
  fatia: number;
}

export interface ClassificationTally {
  itens: ClassificationCount[];
  total: number;
  classificados: number;
  semClassificacao: number;
  /** Quantos valores distintos existem, mesmo os que não couberam na lista. */
  distintos: number;
}

/**
 * Agrupa por valor, sem caixa e sem espaço em volta.
 *
 * O rótulo exibido é a primeira grafia encontrada: a exportação costuma ser
 * consistente, mas "Erro de instalação" e "Erro de Instalação" viriam como duas
 * linhas do mesmo assunto, e duas linhas do mesmo assunto é justamente o que um
 * ranking não pode ter.
 */
export function tallyClassification(
  tickets: readonly Ticket[],
  /*
    De onde sai o valor, e não o nome do campo.

    A classificação chega por duas portas: propriedade do ticket, que espera o
    escopo da HubSpot, e a escolha que o cliente fez no bot, que já está na
    conversa. As duas se contam igual, e escrever duas contagens faria as duas
    divergirem na primeira mudança.
  */
  valorDe: (ticket: Ticket) => string,
  limite = 5
): ClassificationTally {
  const contagem = new Map<
    string,
    { label: string; quantos: number; grafias: Map<string, number> }
  >();
  let semClassificacao = 0;

  for (const ticket of tickets) {
    const valor = (valorDe(ticket) ?? "").trim();

    if (valor === "") {
      semClassificacao += 1;
      continue;
    }

    const chave = valor.toLocaleLowerCase("pt-BR");
    const atual = contagem.get(chave);

    if (atual) {
      atual.quantos += 1;

      /*
        A grafia mais frequente vence, e não a primeira encontrada: entre
        "Erro de instalação" e "ERRO DE INSTALAÇÃO" a lista deve mostrar a que
        a equipe realmente usa, não a que o acaso da ordenação trouxe antes.
      */
      const contadas = atual.grafias.get(valor) ?? 0;
      atual.grafias.set(valor, contadas + 1);

      if (contadas + 1 > (atual.grafias.get(atual.label) ?? 0)) atual.label = valor;
    } else {
      contagem.set(chave, { label: valor, quantos: 1, grafias: new Map([[valor, 1]]) });
    }
  }

  const classificados = tickets.length - semClassificacao;

  const itens = [...contagem.values()]
    .sort((a, b) => b.quantos - a.quantos || a.label.localeCompare(b.label, "pt-BR"))
    .slice(0, limite)
    .map((item) => ({
      label: item.label,
      quantos: item.quantos,
      fatia: classificados === 0 ? 0 : item.quantos / classificados,
    }));

  return {
    itens,
    total: tickets.length,
    classificados,
    semClassificacao,
    distintos: contagem.size,
  };
}

/** Atalho para o caso comum: a classificação guardada no próprio atendimento. */
export function tallyField(
  tickets: readonly Ticket[],
  campo: TicketClassificationField,
  limite = 5
): ClassificationTally {
  return tallyClassification(tickets, (ticket) => ticket[campo], limite);
}
