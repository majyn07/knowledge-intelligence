import { termFrequency, termsOf } from "@/lib/vocabulary";
import type { KnowledgeArticle } from "@/models/KnowledgeArticle";

import { articleText } from "./articleText";

/**
 * O vocabulário de um artigo.
 *
 * O que é genérico, a lista de palavras comuns e a medida de semelhança, vive
 * em `lib/vocabulary`: a triagem do atendimento agrupa pelas mesmas regras, e
 * duas listas do mesmo vocabulário divergem. O que fica aqui é o que é do
 * artigo: de onde sai o texto dele.
 */

export { isMeaningfulTerm, jaccard, termsOf } from "@/lib/vocabulary";

/** O que um artigo diz, para efeito de comparação: título, resumo e corpo. */
function articleCorpus(article: KnowledgeArticle): string {
  return `${article.title} ${article.summary} ${articleText(article)}`;
}

/*
  O vocabulário de cada artigo, guardado por artigo.

  Ele é caro — limpa o HTML e tokeniza o corpo inteiro — e é pedido por mais de
  um caminho sobre o mesmo acervo: a sobreposição do Levantamento e a varredura
  que a avalia em lote. Sem isto, o segundo caminho re-tokeniza os 1.822.

  `WeakMap` e não `Map`, como no índice da busca: a chave é o próprio registro, e
  quando o acervo é substituído os vocabulários antigos saem com ele. O
  normalizador cria objetos novos a cada releitura, então um `Map` seria um vazamento
  que cresce com o tempo de aba aberta.
*/
const vocabularios = new WeakMap<KnowledgeArticle, Set<string>>();

export function articleVocabulary(article: KnowledgeArticle): Set<string> {
  const guardado = vocabularios.get(article);
  if (guardado) return guardado;

  const vocabulario = new Set(termsOf(articleCorpus(article)));
  vocabularios.set(article, vocabulario);

  return vocabulario;
}

/**
 * As palavras de um artigo, com quantas vezes cada uma aparece.
 *
 * A contagem importa: um termo citado uma vez de passagem não é o assunto do
 * artigo, e listá-lo como "exclusivo" mandaria alguém preservar uma menção
 * solta achando que preserva conteúdo.
 */
export function articleTermFrequency(article: KnowledgeArticle): Map<string, number> {
  return termFrequency(articleCorpus(article));
}
