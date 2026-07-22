export interface KnowledgeArticle {
  id: string;

  title: string;

  summary: string;

  content: string;

  category?: string;

  module?: string;

  tags?: string[];

  keywords?: string[];

  url?: string;

  updatedAt?: string;
}