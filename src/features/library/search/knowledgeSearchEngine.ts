import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { KnowledgeQuery } from "@/models/KnowledgeQuery";
import type { KnowledgeSearchResult } from "@/models/KnowledgeSearchResult";

import { articleText } from "../content/articleText";

/**
 * Palavras muito frequentes em português não indicam proximidade de assunto:
 * sem esta lista, dois artigos passam a se relacionar por "para" ou "como".
 */
const STOPWORDS = new Set([
  "para", "com", "que", "dos", "das", "por", "uma", "nao", "não", "como",
  "mais", "sem", "sobre", "pode", "ser", "est", "esta", "este", "isso",
  "quando", "onde", "apos", "após", "seu", "sua", "aos", "nas", "nos",
  "foi", "são", "sao", "tem", "caso", "deve", "todos", "toda", "cada",
]);

const TITLE_WEIGHT = 10;
const KEYWORD_WEIGHT = 8;
const TAG_WEIGHT = 6;
const SUMMARY_WEIGHT = 4;
const CONTENT_WEIGHT = 2;

/**
 * Busca somente conteúdo publicado: a pergunta que a análise faz é se a Base
 * de Conhecimento já cobre o caso, e rascunhos ainda não cobrem nada.
 */
export function searchKnowledge(
  articles: KnowledgeArticle[],
  query: KnowledgeQuery
): KnowledgeSearchResult[] {
  const terms = query.text
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 2 && !STOPWORDS.has(term));

  const maxScore =
    terms.length *
    (TITLE_WEIGHT +
      KEYWORD_WEIGHT +
      TAG_WEIGHT +
      SUMMARY_WEIGHT +
      CONTENT_WEIGHT);

  if (maxScore === 0) {
    return [];
  }

  return articles
    .filter((article) => article.status === "published")
    .filter((article) => !query.projectId || article.projectId === query.projectId)
    .map((article) => {
      let score = 0;

      const matchedTerms = new Set<string>();

      const title = article.title.toLowerCase();
      const summary = article.summary.toLowerCase();
      // Sem a marcação: senão "div" e "class" casariam com o portal inteiro.
      const content = articleText(article).toLowerCase();
      const keywords = article.keywords.join(" ").toLowerCase();
      const tags = article.tags.join(" ").toLowerCase();

      for (const term of terms) {
        if (title.includes(term)) {
          score += TITLE_WEIGHT;
          matchedTerms.add(term);
        }

        if (keywords.includes(term)) {
          score += KEYWORD_WEIGHT;
          matchedTerms.add(term);
        }

        if (tags.includes(term)) {
          score += TAG_WEIGHT;
          matchedTerms.add(term);
        }

        if (summary.includes(term)) {
          score += SUMMARY_WEIGHT;
          matchedTerms.add(term);
        }

        if (content.includes(term)) {
          score += CONTENT_WEIGHT;
          matchedTerms.add(term);
        }
      }

      return {
        article: { id: article.id, title: article.title, summary: article.summary },
        score: score / maxScore,
        matchedTerms: [...matchedTerms],
      };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, query.limit ?? 5);
}
