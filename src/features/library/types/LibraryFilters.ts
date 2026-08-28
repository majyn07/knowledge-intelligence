import type { ArticleStatus } from "@/models/KnowledgeArticle";

export interface LibraryFilters {
  search: string;
  status: ArticleStatus | "all";
  /**
   * Categoria do cadastro, não texto de produto. `unset` isola os artigos sem
   * seção: os que a migração não conseguiu encaixar e os recém-criados.
   */
  categoryId: string | "all" | "unset";
}
