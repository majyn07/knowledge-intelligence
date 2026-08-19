/** Identificação mínima de um artigo, suficiente para exibir e navegar. */
export interface KnowledgeArticleRef {
  id: string;
  title: string;
  summary: string;
}

export interface KnowledgeSearchResult {
  article: KnowledgeArticleRef;

  score: number;

  matchedTerms: string[];
}
