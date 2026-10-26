import { items, record, text, textList } from "@/lib/shape";

/**
 * De quais atendimentos um artigo nasceu.
 *
 * É o pré-requisito do "o artigo resolveu?" (MVP 5). Medido em 19/10/2026:
 * nenhum dos 1.831 publicados tinha atendimento de origem, porque a fila e os
 * atendimentos marcados escreviam o rascunho e não diziam de onde ele vinha.
 * Sem o "antes" fixado na hora em que o artigo nasce, comparar o que chega
 * depois da publicação é impossível — ou pior, uma correlação inventada.
 *
 * Guarda os **termos do grupo** junto, e não só os atendimentos: a triagem
 * reagrupa quando o acervo muda, e "o mesmo assunto" medido depois precisa ser
 * o assunto de quando o artigo nasceu, e não o de hoje.
 */
export interface OrigemNosAtendimentos {
  ticketIds: string[];
  termos: string[];
  /** Instante ISO de quando foi registrada. */
  em: string;
}

export function normalizarOrigem(valor: unknown): OrigemNosAtendimentos | undefined {
  const r = record(valor);
  const ticketIds = [...new Set(items(r.ticketIds).filter((id): id is string => typeof id === "string" && id !== ""))];

  if (ticketIds.length === 0) return undefined;

  return { ticketIds, termos: [...new Set(textList(r.termos))], em: text(r.em) };
}

/**
 * Soma uma origem nova à que o artigo já tinha.
 *
 * Atualizar um artigo existente com o material de outros atendimentos não
 * apaga os de antes: o artigo passou a responder aos dois grupos. A data fica
 * a da **primeira** origem, porque é dali que o "antes" se mede.
 */
export function juntarOrigem(
  atual: OrigemNosAtendimentos | undefined,
  nova: OrigemNosAtendimentos | undefined
): OrigemNosAtendimentos | undefined {
  if (!nova) return atual;
  if (!atual) return nova;

  return {
    ticketIds: [...new Set([...atual.ticketIds, ...nova.ticketIds])],
    termos: [...new Set([...atual.termos, ...nova.termos])],
    em: atual.em || nova.em,
  };
}
