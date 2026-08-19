import type { AIContext } from "@/models/AIContext";

export function buildKnowledgeContext(
  context?: AIContext
): string {
  const articles = context?.relatedArticles ?? [];

  if (articles.length === 0) {
    return `
# BASE DE CONHECIMENTO

Nenhum artigo publicado da Base de Conhecimento tem relação com este atendimento.
`.trim();
  }

  const content = articles
    .map(
      (result, index) => `
## Artigo ${index + 1}

Título:
${result.article.title}

Resumo:
${result.article.summary}
`.trim()
    )
    .join("\n\n");

  return `
# BASE DE CONHECIMENTO

Artigos publicados relacionados a este atendimento.

${content}
`.trim();
}