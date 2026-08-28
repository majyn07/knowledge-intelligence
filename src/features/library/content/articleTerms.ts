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

export function articleVocabulary(article: KnowledgeArticle): Set<string> {
  return new Set(termsOf(articleCorpus(article)));
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
