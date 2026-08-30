import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import { TEXTO_NO_PEDIDO, type MergeRequest } from "@/services/ai/library/mergeAdvice";

import { articleText } from "../content/articleText";

/**
 * O que vai no pedido de comparação.
 *
 * Fora do componente porque é decisão, não desenho: quanto de cada artigo o
 * modelo lê muda o veredito, e isso precisa de teste.
 *
 * O corte é **pelo fim**, como no transcrito da conversa: o assunto do artigo é
 * declarado no começo, e cortar a cabeça deixaria o modelo sem saber do que o
 * texto trata. E ele é **anunciado** — veredito sobre meio artigo apresentado
 * como se fosse sobre o inteiro é erro que ninguém percebe.
 */
export function montarPedidoDeComparacao(
  a: KnowledgeArticle,
  b: KnowledgeArticle
): MergeRequest {
  return { a: paraOPedido(a), b: paraOPedido(b) };
}

function paraOPedido(artigo: KnowledgeArticle): MergeRequest["a"] {
  /* HTML do portal vira texto: o modelo não deve gastar contexto com marcação. */
  const inteiro = articleText(artigo);

  return {
    id: artigo.id,
    title: artigo.title,
    summary: artigo.summary,
    text: inteiro.slice(0, TEXTO_NO_PEDIDO),
    truncated: inteiro.length > TEXTO_NO_PEDIDO,
  };
}
