import { impressao } from "@/lib/fingerprint";
import { items, record, text } from "@/lib/shape";
import {
  mergeResponseSchema,
  type MergeAdvice,
  type MergeRequest,
} from "@/services/ai/library/mergeAdvice";

/**
 * O veredito da IA sobre um par de artigos, guardado.
 *
 * A varredura das sobreposições lê dois artigos inteiros por par, com seis
 * segundos de pausa entre um e outro: vinte pares são onze minutos e vinte
 * pedidos de cota. O resultado vivia só no diálogo, e fechar a aba jogava fora
 * tudo — por isso a varredura dos 137 pares do acervo real nunca terminou: ela
 * não cabia numa sessão, e não havia como continuar na seguinte. E o colega
 * que abrisse o mesmo par pagava o mesmo pedido de novo.
 *
 * Guardado, ele continua sendo **proposta**: a regra do Levantamento não muda.
 * O que muda é que a proposta passa a ser da equipe, e não de uma aba.
 */

export const VERDICT_KINDS = ["sobreposicao"] as const;

export type VerdictKind = (typeof VERDICT_KINDS)[number];

export interface SavedVerdict {
  kind: VerdictKind;
  /** O par, com os identificadores em ordem: A×B e B×A são o mesmo par. */
  subject: string;
  /**
   * A impressão do que o modelo leu.
   *
   * É o que decide se o veredito ainda vale. Prazo fixo seria arbitrário: um
   * veredito de seis meses sobre dois artigos que ninguém tocou continua certo,
   * e um de ontem sobre um artigo reescrito hoje não. Qualquer mudança no texto
   * que foi ao pedido muda a impressão.
   */
  fingerprint: string;
  advice: MergeAdvice;
  /** Quem pediu. O rótulo sobra quando a conta some, como no histórico. */
  actorId: string;
  actorLabel: string;
  /** Instante ISO. */
  at: string;
}

/** A chave do par, independente da ordem em que ele chegou. */
export function chaveDoPar(aId: string, bId: string): string {
  return [aId, bId].sort().join("|");
}

/**
 * A impressão do pedido, independente da ordem dos dois artigos.
 *
 * Mede o que **foi ao modelo**, e não o artigo inteiro: o pedido corta o texto
 * num teto, e um acréscimo depois do corte não muda o que o modelo leria. Pedir
 * de novo por causa dele seria pagar pela mesma resposta.
 */
export function impressaoDoPedido(pedido: MergeRequest): string {
  const lados = [pedido.a, pedido.b].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));

  return impressao(JSON.stringify(lados));
}

/**
 * Vale enquanto o que foi lido não mudou.
 *
 * Vencido não é apagado: a tela mostra que existe e que é de antes, porque
 * "a IA já disse que eram complementares, mas o texto mudou desde então" é
 * informação, e esconder faria o próximo a abrir achar que nunca foi avaliado.
 */
export function vereditoValido(salvo: SavedVerdict, pedidoAtual: MergeRequest): boolean {
  return salvo.fingerprint === impressaoDoPedido(pedidoAtual);
}

/**
 * Lê o que veio do armazenamento ou do banco.
 *
 * O conteúdo passa pelo mesmo contrato da resposta do modelo: um veredito
 * gravado por outra versão do produto, com outra forma, vira ausência e não
 * tela quebrada. E ausência aqui custa só um pedido a mais.
 */
export function normalizarVeredito(entrada: unknown): SavedVerdict | null {
  const valor = record(entrada);

  const kind = text(valor.kind);
  if (!(VERDICT_KINDS as readonly string[]).includes(kind)) return null;

  const subject = text(valor.subject);
  const fingerprint = text(valor.fingerprint);
  if (!subject || !fingerprint) return null;

  const advice = mergeResponseSchema.safeParse(valor.advice);
  if (!advice.success) return null;

  return {
    kind: kind as VerdictKind,
    subject,
    fingerprint,
    advice: advice.data,
    actorId: text(valor.actorId),
    actorLabel: text(valor.actorLabel),
    at: text(valor.at),
  };
}

export function normalizarVereditos(valor: unknown): SavedVerdict[] {
  return items(valor)
    .map(normalizarVeredito).filter((v): v is SavedVerdict => v !== null);
}

/**
 * Acrescenta ou substitui, pela chave.
 *
 * Um par tem um veredito, o mais recente: dois guardados para o mesmo par
 * responderiam duas coisas, e a tela teria de escolher.
 */
export function comVeredito(lista: SavedVerdict[], novo: SavedVerdict): SavedVerdict[] {
  return [
    ...lista.filter((v) => !(v.kind === novo.kind && v.subject === novo.subject)),
    novo,
  ];
}
