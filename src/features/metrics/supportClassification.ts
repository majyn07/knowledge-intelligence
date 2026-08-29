import type { Ticket } from "@/models/Ticket";

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
 * São **duas** perguntas e ficam separadas, que foi o pedido: causa é "por que
 * aconteceu", motivo de contato é "por que ele nos procurou". Um defeito de
 * instalação chega como dúvida de uso, e somar as duas numa lista só produziria
 * um ranking em que ninguém confia, porque metade das linhas responde outra
 * coisa.
 */

export type ClassificationField = "causa" | "motivoDeContato";

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
  campo: ClassificationField,
  limite = 5
): ClassificationTally {
  const contagem = new Map<string, { label: string; quantos: number }>();
  let semClassificacao = 0;

  for (const ticket of tickets) {
    const valor = (ticket[campo] ?? "").trim();

    if (valor === "") {
      semClassificacao += 1;
      continue;
    }

    const chave = valor.toLocaleLowerCase("pt-BR");
    const atual = contagem.get(chave);

    if (atual) atual.quantos += 1;
    else contagem.set(chave, { label: valor, quantos: 1 });
  }

  const classificados = tickets.length - semClassificacao;

  const itens = [...contagem.values()]
    .sort((a, b) => b.quantos - a.quantos || a.label.localeCompare(b.label, "pt-BR"))
    .slice(0, limite)
    .map((item) => ({
      ...item,
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
