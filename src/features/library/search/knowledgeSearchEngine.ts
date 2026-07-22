import type { KnowledgeArticle } from "@/models/KnowledgeArticle";
import type { KnowledgeQuery } from "@/models/KnowledgeQuery";
import type { KnowledgeSearchResult } from "@/models/KnowledgeSearchResult";

const TITLE_WEIGHT = 10;
const KEYWORD_WEIGHT = 8;
const TAG_WEIGHT = 6;
const SUMMARY_WEIGHT = 4;
const CONTENT_WEIGHT = 2;

export function searchKnowledge(
  articles: KnowledgeArticle[],
  query: KnowledgeQuery
): KnowledgeSearchResult[] {
  const terms = query.text
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 2);

  const maxScore =
    terms.length *
    (TITLE_WEIGHT +
      KEYWORD_WEIGHT +
      TAG_WEIGHT +
      SUMMARY_WEIGHT +
      CONTENT_WEIGHT);

  return articles
    .map((article) => {
      let score = 0;

      const matchedTerms = new Set<string>();

      const title = article.title.toLowerCase();
      const summary = article.summary.toLowerCase();
      const content = article.content.toLowerCase();
      const keywords = (article.keywords ?? [])
        .join(" ")
        .toLowerCase();
      const tags = (article.tags ?? [])
        .join(" ")
        .toLowerCase();

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
        article,
        score: score / maxScore,
        matchedTerms: [...matchedTerms],
      };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, query.limit ?? 5);
}