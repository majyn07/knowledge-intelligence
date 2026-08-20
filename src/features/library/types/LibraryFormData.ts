import type { ArticleStatus } from "@/models/KnowledgeArticle";

export interface LibraryFormData {
  title: string;
  summary: string;
  content: string;

  projectId: string;

  /**
   * Identificadores do cadastro, não texto livre. Vazio é estado válido:
   * artigo novo antes de alguém classificar, ou migrado sem correspondência.
   */
  genreId: string;
  sectionId: string;

  status: ArticleStatus;

  tags: string[];
  keywords: string[];
  author: string;
  url: string;
}
