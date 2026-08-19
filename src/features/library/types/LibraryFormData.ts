import type {
  ArticleStatus,
  ArticleType,
} from "@/models/KnowledgeArticle";

export interface LibraryFormData {
  title: string;
  summary: string;
  content: string;

  projectId: string;

  type: ArticleType;
  status: ArticleStatus;

  product: string;
  module: string;
  category: string;

  tags: string[];
  keywords: string[];
  author: string;
  url: string;
}
