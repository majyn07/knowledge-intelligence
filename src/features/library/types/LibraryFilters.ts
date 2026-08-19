import type { ArticleStatus } from "@/models/KnowledgeArticle";

export interface LibraryFilters {
  search: string;
  status: ArticleStatus | "all";
  product: string | "all";
}
